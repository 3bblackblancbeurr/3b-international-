import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';

test('member API authenticates save ownership, validates requests and retains bounded non-save bodies',async()=>{
 const base=new URL('../supabase/functions/member-api/',import.meta.url);
 const source=readFileSync(new URL('index.ts',base),'utf8').replaceAll("'./loyalty.js'",JSON.stringify(new URL('loyalty.js',base).href)).replaceAll("'./optional-resource.js'",JSON.stringify(new URL('optional-resource.js',base).href));
 const compiled=transformSync(source,{loader:'ts',format:'esm',target:'es2022'}).code;
 const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
 const uid='00000000-0000-4000-8000-000000000001',operation='10000000-0000-4000-8000-000000000001';
 const token='header.'+Buffer.from(JSON.stringify({session_id:operation})).toString('base64url')+'.signature';
 const data={version:1,records:{arena:{plays:1}}},calls=[];
 let handler;
 globalThis.Deno={env:{get:name=>({SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-server-key',SUPABASE_ANON_KEY:'test-public-key'})[name]},serve:callback=>{handler=callback;}};
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;
  calls.push({path,body,headers:options.headers});
  if(path==='/auth/v1/user')return Response.json({id:uid});
  if(path.endsWith('/loyalty_session_valid')||path.endsWith('/loyalty_rate'))return Response.json(true);
  if(path==='/rest/v1/member_game_saves')return Response.json([{data,revision:2,updated_at:'2026-10-03T00:00:00Z'}]);
  if(path.endsWith('/member_game_save_sync_server'))return Response.json({ok:true,conflict:false,revision:3,data:body.p_data});
  throw Error('Unexpected test request: '+path);
 };
 try{
  await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
  const request=(body,authorized=true)=>handler(new Request('https://test.invalid/member-api',{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));
  const sync={action:'game-save-sync',baseRevision:2,operationId:operation,data,user_id:'forged-other-account'};
  assert.equal((await request(sync,false)).status,401);
  assert.equal((await request({...sync,operationId:'not-a-uuid'})).status,400);
  assert.equal((await request({...sync,data:{...data,coins:1000000}})).status,400);
  assert.equal((await request({...sync,baseRevision:-1})).status,400);
  assert.equal((await request({action:'snapshot',padding:'x'.repeat(9000)})).status,413);
  assert.equal((await request({...sync,data:{...data,records:{large:'x'.repeat(180000)}}})).status,413);
  const loaded=await request({action:'game-save-load'});
  assert.equal(loaded.status,200);assert.equal((await loaded.json()).save.revision,2);
  const saved=await request(sync);assert.equal(saved.status,200);
  const writes=calls.filter(call=>call.path.endsWith('/member_game_save_sync_server'));
  assert.equal(writes.length,1);assert.equal(writes[0].body.p_user,uid);
  assert.equal(writes[0].headers.Authorization,'Bearer test-server-key');
  assert.deepEqual(writes[0].body.p_data,data);
 }finally{globalThis.fetch=originalFetch;if(originalDeno===undefined)delete globalThis.Deno;else globalThis.Deno=originalDeno;}
});
