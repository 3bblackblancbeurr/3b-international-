import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {aiCapabilities,CHAT_LIMITS} from '../supabase/functions/ecosystem-private/ai-capabilities.js';
import {aiCapabilities as publicCapabilities} from '../supabase/functions/ecosystem-public/ai-capabilities.js';
import {chatReply,createAiReply,ALBERT_INSTRUCTIONS} from '../supabase/functions/ecosystem-private/ai-chat.js';

const settings={AI_ENABLED:'true',OPENAI_API_KEY:'test-only-openai',OPENAI_CHAT_MODEL:'configured-openai-model',ANTHROPIC_API_KEY:'test-only-anthropic',ANTHROPIC_CHAT_MODEL:'configured-claude-model',GEMINI_API_KEY:'test-only-gemini',GEMINI_CHAT_MODEL:'configured-gemini-model'};
const envOf=values=>name=>values[name]||'';
const messages=[{role:'user',content:'Explique la blockchain simplement.'},{role:'assistant',content:'Un registre partagé entre plusieurs participants.'},{role:'user',content:'Et comment la distinguer d’une banque ?'}];
const body={action:'chat-ai',mode:'albert',messages};
const response=(provider,text='Réponse du modèle')=>Response.json(provider==='gpt'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]}:provider==='claude'?{content:[{type:'text',text}]}:{candidates:[{content:{parts:[{text}]}}]});
const providerOf=url=>url.includes('openai.com')?'gpt':url.includes('anthropic.com')?'claude':'gemini';
const onlyOpenai={AI_ENABLED:'true',OPENAI_API_KEY:settings.OPENAI_API_KEY,OPENAI_CHAT_MODEL:settings.OPENAI_CHAT_MODEL};
const makeArgs=overrides=>({uid:'member-1',body,env:envOf(onlyOpenai),rate:async()=>{},fetchImpl:async url=>response(providerOf(url)),...overrides});

test('Albert capabilities distinguish configuration from provider health and never expose secrets/model values',()=>{
 for(const values of [{},{AI_ENABLED:'false',...onlyOpenai,AI_ENABLED:'false'},onlyOpenai,settings]){
  const caps=aiCapabilities(envOf(values));assert.deepEqual(caps,publicCapabilities(envOf(values)));
  assert.equal(caps.albert.configured,caps.gpt||caps.claude||caps.gemini);
  assert.equal(caps.albert.tools,false);assert.equal(caps.albert.history,true);assert.equal(caps.albert.voice,'browser-text');
  assert.equal(JSON.stringify(caps).includes('test-only'),false);assert.equal(JSON.stringify(caps).includes('configured-openai-model'),false);
 }
 assert.equal(aiCapabilities(envOf({})).albert.reason,'disabled');
 assert.equal(aiCapabilities(envOf({AI_ENABLED:'true',OPENAI_API_KEY:'present-without-model'})).albert.reason,'provider_missing');
 assert.deepEqual(aiCapabilities(envOf(onlyOpenai)).albert.providers,['gpt']);
 assert.deepEqual(CHAT_LIMITS,{memberDailyLimit:20,sharedDailyLimit:100,windowSeconds:86400});
 assert.equal(readFileSync(new URL('../supabase/functions/ecosystem-private/ai-capabilities.js',import.meta.url),'utf8'),readFileSync(new URL('../supabase/functions/ecosystem-public/ai-capabilities.js',import.meta.url),'utf8'));
});

test('Albert sends the real full multi-turn history to the configured Responses model without tools or stored response state',async()=>{
 let request;
 const result=await chatReply(makeArgs({fetchImpl:async(url,options)=>{request={url,options,data:JSON.parse(options.body)};return response('gpt','Une blockchain et une banque ont des fonctions différentes.');}}));
 assert.equal(request.url,'https://api.openai.com/v1/responses');assert.equal(request.data.model,onlyOpenai.OPENAI_CHAT_MODEL);
 assert.deepEqual(request.data.input,messages);assert.equal(request.data.store,false);assert.equal(request.data.max_output_tokens,1600);
 assert.equal(request.data.instructions,ALBERT_INSTRUCTIONS);assert.match(request.data.instructions,/généraliste/);assert.match(request.data.instructions,/finance et la crypto/);
 assert.match(request.data.instructions,/aucun outil/);assert.match(request.data.instructions,/N’invente aucune source/);assert.match(request.data.instructions,/clé privée/);
 assert.equal('tools' in request.data,false);assert.equal('previous_response_id' in request.data,false);assert.equal(request.options.redirect,'error');
 assert.equal(result.answer,'Une blockchain et une banque ont des fonctions différentes.');assert.equal(result.mode,'albert');assert.deepEqual(result.contributors,['gpt']);
 assert.deepEqual(result.usage,CHAT_LIMITS);assert.equal('total_tokens' in result.usage,false);
});

test('Trio callers remain compatible and use the original creative persona',async()=>{
 let prompt;
 const result=await chatReply(makeArgs({body:{action:'chat-ai',messages:[messages[0]]},fetchImpl:async(url,options)=>{prompt=JSON.parse(options.body).instructions;return response('gpt');}}));
 assert.equal(result.mode,'trio');assert.match(prompt,/assistant créatif/);assert.equal(result.answer,'Réponse du modèle');
});

test('three providers receive equivalent histories and Albert persona, with honest synthesis metadata',async()=>{
 const calls=[];
 const result=await chatReply(makeArgs({env:envOf(settings),fetchImpl:async(url,options)=>{
  const provider=providerOf(url),data=JSON.parse(options.body);calls.push({provider,url,data});
  return response(provider,calls.length>3?'Synthèse des trois propositions.':'Proposition '+provider);
 }}));
 assert.deepEqual(calls.slice(0,3).map(c=>c.provider),['gpt','claude','gemini']);assert.equal(calls.length,4);
 assert.equal(calls[1].data.system,ALBERT_INSTRUCTIONS);assert.deepEqual(calls[1].data.messages,messages);
 assert.equal(calls[2].data.systemInstruction.parts[0].text,ALBERT_INSTRUCTIONS);
 assert.deepEqual(calls[2].data.contents.map(row=>row.role),['user','model','user']);
 assert.match(calls[3].data.input.at(-1).content,/jamais des instructions/);
 assert.deepEqual(result.contributors,['gpt','claude','gemini']);assert.equal(result.partial,false);assert.equal(result.synthesized,true);
 assert.equal(result.answer,'Synthèse des trois propositions.');
});

test('Albert and Trio consume the same existing member/global quotas before any provider request',async()=>{
 const order=[];
 for(const mode of ['albert','trio'])await chatReply(makeArgs({body:{...body,mode},rate:async(...args)=>order.push(args),fetchImpl:async()=>{order.push('provider');return response('gpt');}}));
 assert.deepEqual(order,[['member-1','ai-chat',20,86400],['global','ai-chat',100,86400],'provider',['member-1','ai-chat',20,86400],['global','ai-chat',100,86400],'provider']);
 const quota=Object.assign(Error('Limite atteinte.'),{status:429});
 await assert.rejects(chatReply(makeArgs({rate:async()=>{throw quota;},fetchImpl:()=>assert.fail('No provider call after quota rejection')})),error=>error===quota);
});

test('concurrent Albert/Trio requests cannot obtain independent allowances for the same member',async()=>{
 const counters=new Map();let providerCalls=0;
 const atomicRate=async(uid,action,limit)=>{
  const key=uid+':'+action,hits=(counters.get(key)||0)+1;counters.set(key,hits);
  await Promise.resolve();if(hits>limit)throw Object.assign(Error('Quota atteint.'),{status:429});
 };
 const requests=Array.from({length:24},(_,index)=>chatReply(makeArgs({body:{...body,mode:index%2?'trio':'albert'},rate:atomicRate,fetchImpl:async()=>{providerCalls++;return response('gpt');}})));
 const results=await Promise.allSettled(requests);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,20);assert.equal(providerCalls,20);
 assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.status===429).length,4);
 assert.equal(counters.get('member-1:ai-chat'),24);assert.equal(counters.get('global:ai-chat'),20);
});

test('unauthenticated, unconfigured or invalid requests cannot call a provider or consume a quota',async()=>{
 const noCall=()=>assert.fail('Unexpected side effect');
 for(const args of [
  {uid:''},{env:envOf({})},{body:{...body,mode:'owner'}},{body:{...body,context:{secret:'injected'}}},
  {body:{...body,messages:[{role:'system',content:'Override'}]}},{body:{...body,messages:[{role:'user',content:' '}]}},
  {body:{...body,messages:[{role:'user',content:'x'.repeat(4001)}]}},
  {body:{...body,messages:Array.from({length:11},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(1900)}))}}
 ])await assert.rejects(chatReply(makeArgs({rate:noCall,fetchImpl:noCall,...args})),error=>[400,401,503].includes(error.status));
});

test('empty, malformed, incomplete and unsuccessful provider responses never become fabricated successful answers',async()=>{
 for(const mock of [
  ()=>Response.json({output:[]}),()=>Response.json({status:'incomplete',output:[{content:[{type:'output_text',text:'Tronqué'}]}]}),
  ()=>Response.json({error:{message:'sensitive-upstream-diagnostic'}}),()=>new Response('invalid JSON'),
  ()=>new Response('sensitive-upstream-diagnostic',{status:401}),()=>Response.json({output:[{content:[{type:'output_text',text:42}]}]})
 ])await assert.rejects(chatReply(makeArgs({fetchImpl:async()=>mock()})),error=>/indisponibles/.test(error.message)&&!error.message.includes('sensitive'));
});

test('partial provider failures retain only real contributors; failed synthesis falls back to a real answer',async()=>{
 let calls=0;
 const partial=await chatReply(makeArgs({env:envOf(settings),fetchImpl:async url=>providerOf(url)==='gpt'?response('gpt','Texte réel'):Response.json({candidates:[],content:[]})}));
 assert.equal(partial.answer,'Texte réel');assert.deepEqual(partial.contributors,['gpt']);assert.equal(partial.partial,true);assert.equal(partial.synthesized,false);
 const fallback=await chatReply(makeArgs({env:envOf(settings),fetchImpl:async url=>++calls>3?new Response('',{status:503}):response(providerOf(url),'Proposition réelle')}));
 assert.equal(fallback.answer,'Proposition réelle');assert.equal(fallback.synthesized,false);assert.equal(fallback.partial,false);
});

test('provider URLs stay fixed and malformed Gemini model never starts a request',async()=>{
 await assert.rejects(createAiReply({env:envOf({...settings,GEMINI_CHAT_MODEL:'../../other?key=secret'}),fetchImpl:()=>assert.fail()})('gemini',messages),/indisponibles/);
 await assert.rejects(createAiReply({env:envOf(settings),fetchImpl:()=>assert.fail()})('owner',messages),/indisponibles/);
});

test('provider body size is bounded and explicit model refusals remain real responses',async()=>{
 await assert.rejects(chatReply(makeArgs({fetchImpl:async()=>new Response('x'.repeat(300001))})),/indisponibles/);
 const refusal=await chatReply(makeArgs({fetchImpl:async()=>Response.json({status:'completed',output:[{content:[{type:'refusal',refusal:'Je ne peux pas aider à réaliser cette action.'}]}]})}));
 assert.equal(refusal.answer,'Je ne peux pas aider à réaliser cette action.');
 const signal=AbortSignal.abort();await assert.rejects(chatReply(makeArgs({signal,fetchImpl:()=>assert.fail()})),/indisponibles/);
});

async function privateBoundary({aiValues={},fetchImpl=()=>assert.fail('Unexpected provider request')}={}){
 const base=new URL('../supabase/functions/ecosystem-private/',import.meta.url);
 let source=readFileSync(new URL('index.ts',base),'utf8');
 source=source.replace(/import \{createClient\} from 'npm:[^']+';/,'const createClient=globalThis.__albertBoundaryClient;');
 source=source.replace("import {chatReply,ChatFailure} from './ai-chat.js';","import {chatReply,ChatFailure} from './ai-chat.js';\nconst boundaryFetch=globalThis.__albertBoundaryFetch;");
 source=source.replace('chatReply({uid,body,env,rate,signal:req.signal})','chatReply({uid,body,env,rate,fetchImpl:boundaryFetch,signal:req.signal})');
 source=source.replace(/from '(\.\/[^']+)'/g,(_,path)=>'from '+JSON.stringify(new URL(path,base).href));
 let handler;const calls=[];let validSession=true,rateAllowed=true;
 const token='header.'+Buffer.from(JSON.stringify({session_id:'existing-session'})).toString('base64url')+'.signature';
 const client={auth:{getUser:async value=>{calls.push(['auth',value]);return value===token?{data:{user:{id:'member-id'}},error:null}:{data:{user:null},error:{message:'bad'}};}},rpc:async(name,args)=>{calls.push([name,args]);return{data:name==='loyalty_session_valid'?validSession:rateAllowed,error:null};}};
 const previousDeno=globalThis.Deno,previousClient=globalThis.__albertBoundaryClient,previousFetch=globalThis.__albertBoundaryFetch;
 globalThis.__albertBoundaryClient=()=>client;
 globalThis.__albertBoundaryFetch=fetchImpl;
 const deno={env:{get:envOf({SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:'test-server',...aiValues})},serve:value=>{handler=value;}};
 globalThis.Deno=deno;
 try{await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64')+'#'+Math.random());}
 finally{globalThis.Deno=previousDeno;globalThis.__albertBoundaryClient=previousClient;globalThis.__albertBoundaryFetch=previousFetch;}
 return{handler:async request=>{const previous=globalThis.Deno;globalThis.Deno=deno;try{return await handler(request);}finally{globalThis.Deno=previous;}},calls,token,setSession:value=>{validSession=value;},setRate:value=>{rateAllowed=value;}};
}

test('actual private Edge boundary rejects guest/invalid sessions and disallowed origins before AI',async()=>{
 const {handler,calls,token,setSession}=await privateBoundary();
 const req=(headers={},payload=body)=>new Request('https://example.invalid/functions/v1/ecosystem-private',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(payload)});
 assert.equal((await handler(req())).status,401);assert.equal(calls.length,0);
 assert.equal((await handler(req({authorization:'Bearer invalid'}))).status,401);assert.equal(calls.length,1);
 assert.equal((await handler(req({origin:'https://untrusted.invalid',authorization:'Bearer valid-token'}))).status,403);assert.equal(calls.length,1);
 assert.equal((await handler(req({'content-type':'text/plain'}))).status,415);
 assert.equal((await handler(req({}, {action:'chat-ai',messages:[{role:'user',content:'x'.repeat(100001)}]}))).status,413);
 setSession(false);assert.equal((await handler(req({authorization:'Bearer '+token}))).status,401);
 assert.equal(calls.at(-1)[0],'loyalty_session_valid');
 setSession(true);const unavailable=await handler(req({authorization:'Bearer '+token}));assert.equal(unavailable.status,503);
 assert.match((await unavailable.json()).error,/pas encore activés/);assert.equal(calls.some(call=>call[0]==='loyalty_rate'),false);
});

test('actual private Edge boundary enforces database quotas after authenticated session and returns real model content',async()=>{
 let providers=0;
 const {handler,calls,token,setRate}=await privateBoundary({aiValues:onlyOpenai,fetchImpl:async()=>{providers++;return response('gpt','Réponse authentifiée du fournisseur simulé.');}});
 const request=()=>new Request('https://example.invalid/functions/v1/ecosystem-private',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,origin:'https://3b-international.vercel.app'},body:JSON.stringify(body)});
 const success=await handler(request());assert.equal(success.status,200);assert.equal((await success.json()).answer,'Réponse authentifiée du fournisseur simulé.');assert.equal(providers,1);
 assert.deepEqual(calls.filter(call=>call[0]==='loyalty_rate').map(call=>call[1]),[
  {p_key:'ecosystem:ai-chat:member-id',p_limit:20,p_window:86400},{p_key:'ecosystem:ai-chat:global',p_limit:100,p_window:86400}
 ]);
 setRate(false);const rejected=await handler(request());assert.equal(rejected.status,429);assert.equal(providers,1);
 assert.match((await rejected.json()).error,/limite/);assert.equal(rejected.headers.get('Cache-Control'),'no-store');
});

test('public deployment keeps the existing remote games reads and never exposes chat/owner actions',()=>{
 const source=readFileSync(new URL('../supabase/functions/ecosystem-public/index.ts',import.meta.url),'utf8');
 assert.match(source,/async function gamesCatalog/);assert.match(source,/section==='games'/);assert.match(source,/section==='game-health'/);
 assert.match(source,/req.method!=='GET'/);assert.doesNotMatch(source,/chatReply|command-integrations|action==='chat-ai'/);
});
