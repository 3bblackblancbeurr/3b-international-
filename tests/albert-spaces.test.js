import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {initialSpaces,normalizeSpaces,applySpaceActions,safeLink,normalizeMessages} from '../src/control/albert-spaces-model.js';
import {parseAlbertLocal,validateAlbertActions} from '../src/control/albert-model.js';
import {readEvents,partialText} from '../src/control/albert-stream.js';
import {createCommandIntegrations} from '../server/command-integrations.js';

test('Spaces compose a brand workspace with shared tasks, bounded resizing and no mutation',()=>{
 const source=initialSpaces(),before=JSON.stringify(source);
 const next=applySpaceActions(source,[{type:'space_create',name:'Ma marque',template:'brand'},{type:'task_add',text:'Préparer le lancement',due:'2026-10-01'}]);
 assert.equal(JSON.stringify(source),before);
 const space=next.spaces.find(s=>s.id===next.active);
 assert.deepEqual(space.panels.map(p=>p.kind),['planning','tasks','budget','notes','documents']);
 assert.equal(space.tasks[0].due,'2026-10-01');
 assert.ok(space.panels.every(p=>!Object.hasOwn(p,'tasks')),'one task collection, not divergent copies');
 const resized=applySpaceActions(next,[{type:'panel_resize',id:space.panels[0].id,width:12}]);
 assert.equal(resized.spaces.at(-1).panels[0].width,12);
 assert.equal(space.panels[0].width,6);
 assert.deepEqual(parseAlbertLocal('espace marque'),[{type:'space_create',name:'Lancement de marque',template:'brand'}]);
 assert.equal(parseAlbertLocal('ne crée pas espace marque'),null);
});
test('Normalization strips arbitrary fields, deduplicates panels and bounds stored data',()=>{
 const raw=initialSpaces(),p=raw.spaces[0].panels[0];
 p.width=999;p.height=-10;p.script='evil';p.rows=[{url:'javascript:alert(1)',amount:Infinity}];raw.spaces[0].panels.push({...p});
 raw.messages=[{role:'system',text:'evil'},{role:'user',text:'x'.repeat(5000)}];
 const clean=normalizeSpaces(raw);
 assert.equal(clean.spaces[0].panels[0].width,12);assert.equal(clean.spaces[0].panels[0].height,200);
 assert.equal(clean.spaces[0].panels[0].script,undefined);
 assert.equal(clean.spaces[0].panels[0].rows[0].url,'');
 assert.equal(clean.spaces[0].panels[0].rows[0].amount,0);
 assert.equal(new Set(clean.spaces[0].panels.map(p=>p.id)).size,4);
 assert.equal(clean.messages.length,1);assert.equal(clean.messages[0].text.length,4000);
 assert.equal(safeLink('data:text/html,evil'),'');assert.equal(safeLink('https://example.com/a'),'https://example.com/a');
 assert.deepEqual(normalizeMessages(null),[]);
 assert.deepEqual(validateAlbertActions([{type:'panel_add',kind:'shell'},{type:'panel_resize',id:'x',width:40}]),[]);
 assert.deepEqual(validateAlbertActions([{type:'panel_add',kind:'budget',script:'evil'}]),[{type:'panel_add',kind:'budget'}]);
});
test('Unfulfillable compositions fail without partial edits or success claims',()=>{
 const source=initialSpaces(),before=JSON.stringify(source);
 assert.throws(()=>applySpaceActions(source,[{type:'task_add',text:'First'},{type:'panel_resize',id:'missing',width:12}]),/n’existe plus/);
 assert.equal(JSON.stringify(source),before);
 const full=applySpaceActions(source,Array.from({length:7},()=>({type:'space_create',name:'Espace',template:'blank'})));
 assert.throws(()=>applySpaceActions(full,[{type:'space_create',name:'Excès',template:'blank'}]),/8 espaces/);
});
function stream(text,size=1){const bytes=new TextEncoder().encode(text);let i=0;return new ReadableStream({pull(c){if(i>=bytes.length){c.close();return;}c.enqueue(bytes.slice(i,i+=size));}});}
test('SSE handles byte boundaries, Unicode, CRLF, comments and completed events',async()=>{
 const output=[];
 for await(const e of readEvents(stream(': keepalive\r\n\r\nevent: delta\r\ndata: {"text":"été 🚀"}\r\n\r\ndata: [DONE]\r\n\r\n')))output.push(e);
 assert.deepEqual(output,[{text:'été 🚀'}]);
 assert.equal(partialText('{"text":"Début\\n\\u00e9'),'Début\né');
 assert.equal(partialText('{"text":"Début\\u00'),'Début');
 assert.equal(partialText('{"text":"Salut","actions":['),'Salut');
});
test('SSE rejects malformed and oversized responses',async()=>{
 await assert.rejects(async()=>{for await(const _ of readEvents(stream('data: not-json\n\n'))){};});
 await assert.rejects(async()=>{for await(const _ of readEvents(stream('x'.repeat(500001),500001))){};},/volumineux/);
});
const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
function request(body){return new Request('https://3b-international.vercel.app/api/command-integrations',{method:'POST',headers:{Origin:'https://3b-international.vercel.app','Content-Type':'application/json',Authorization:'Bearer x.'+Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')+'.x'},body:JSON.stringify(body)});}
function fixture({conflict=false,owner=uid,events=[],capture=()=>{}}={}){
 return createCommandIntegrations({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',OPENAI_API_KEY:'private',COMMAND_AI_MODEL:'test'},fetcher:async(input,options)=>{
  const url=new URL(input);let body;
  if(url.pathname==='/auth/v1/user')body={id:uid,email:'owner@example.test',email_confirmed_at:'2026-01-01'};
  else if(url.pathname.includes('loyalty_session_valid')||url.pathname.includes('loyalty_rate'))body=true;
  else if(url.pathname.includes('control_center_settings'))body=[{enabled:true,owner_user_id:owner}];
  else if(url.pathname.includes('/rpc/albert_workspace_save')){capture(JSON.parse(options.body));body=conflict?{conflict:true}:{revision:2};}
  else if(url.pathname==='/rest/v1/albert_workspaces'){assert.equal(url.searchParams.get('user_id'),'eq.'+uid);body=[];}
  else if(url.hostname==='api.openai.com'){capture(JSON.parse(options.body));return new Response(stream(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),7),{headers:{'Content-Type':'text/event-stream'}});}
  else throw Error('Unexpected request '+url);
  return Response.json(body);
 }});
}
test('Workspace API uses authenticated identity, never a client-supplied user ID',async()=>{
 let saved;const api=fixture({capture:v=>saved=v});
 const res=await api.handle(request({action:'workspace_save',user_id:'attacker',revision:1,payload:initialSpaces()}));
 assert.equal(res.status,200);assert.equal(saved.p_user,uid);assert.equal(saved.p_revision,1);
 assert.equal((await (await api.handle(request({action:'workspace_load'}))).json()).workspace,null);
});
test('Workspace API rejects non-owners, stale revisions and invalid input',async()=>{
 assert.equal((await fixture({owner:sid}).handle(request({action:'workspace_load'}))).status,403);
 assert.equal((await fixture({conflict:true}).handle(request({action:'workspace_save',revision:1,payload:initialSpaces()}))).status,409);
 for(const revision of [-1,'1',1.5])assert.equal((await fixture().handle(request({action:'workspace_save',revision,payload:initialSpaces()}))).status,400);
 assert.equal((await fixture().handle(request({action:'workspace_save',revision:0,payload:{spaces:[]}}))).status,400);
});
test('Streamed AI completes with validated proposals and limited memory',async()=>{
 const answer={text:'Votre semaine.',actions:[{type:'space_create',name:'Semaine',template:'week'}]};let sent;
 const events=[{type:'response.output_text.delta',delta:JSON.stringify(answer)},{type:'response.completed',response:{output_text:JSON.stringify(answer),model:'test'}}];
 const response=await fixture({events,capture:v=>sent=v}).handle(request({action:'albert',stream:true,prompt:'Prépare ma semaine',messages:[{role:'system',text:'EVIL_SYSTEM'},{role:'user',text:'Mon projet'}]}));
 assert.match(response.headers.get('content-type'),/event-stream/);const received=[];
 for await(const event of readEvents(response.body))received.push(event);
 assert.equal(received.at(-1).type,'complete');assert.deepEqual(received.at(-1).answer.actions,answer.actions);
 assert.equal(sent.store,false);assert.equal(sent.stream,true);assert.doesNotMatch(sent.input,/EVIL_SYSTEM/);assert.match(sent.input,/Mon projet/);
});
test('Interrupted streams and unsafe completed proposals never publish complete actions',async()=>{
 const bad=JSON.stringify({text:'ok',actions:[{type:'exec',value:'evil'}]});
 for(const events of [[{type:'response.output_text.delta',delta:'{"text":"partiel'}],[{type:'response.failed'}],[{type:'response.completed',response:{output_text:bad}}]]){
  const response=await fixture({events}).handle(request({action:'albert',stream:true,prompt:'Test'}));const received=[];
  for await(const event of readEvents(response.body))received.push(event);
  assert.equal(received.at(-1).type,'error');assert.equal(received.some(e=>e.type==='complete'),false);
 }
});
test('Database revision checks prevent lost updates and restrict direct access',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('../supabase/migrations/20260927160710_albert_spaces.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users values ($1)',[uid]);
  const save=async revision=>(await db.query('select public.albert_workspace_save($1,$2,$3) as result',[uid,revision,JSON.stringify(initialSpaces())])).rows[0].result;
  assert.deepEqual(await save(0),{revision:1});assert.deepEqual(await save(0),{conflict:true});
  assert.deepEqual(await save(1),{revision:2});assert.deepEqual(await save(1),{conflict:true});
  const perms=await db.query("select has_table_privilege('authenticated','public.albert_workspaces','SELECT') as read,has_function_privilege('anon','public.albert_workspace_save(uuid,bigint,jsonb)','EXECUTE') as execute");
  assert.deepEqual(perms.rows[0],{read:false,execute:false});
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.albert_workspaces'::regclass")).rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
