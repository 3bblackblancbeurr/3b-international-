import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {createNewsService,NewsFailure} from '../supabase/functions/ecosystem-public/news.js';

function handlerFor(kind,{newsService}={}){
 const source=readFileSync(new URL(`../supabase/functions/ecosystem-${kind}/index.ts`,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 const code=stripTypeScriptTypes(source,{mode:'transform',sourceMap:false});
 let handler;
 const admin={rpc:async()=>({data:true,error:null}),from:()=>({select(){return this;},eq(){return this;},order:async()=>({data:[],error:null})})};
 const context={Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://synthetic-project.supabase.co':'synthetic-value'},serve:callback=>{handler=callback;}},createClient:()=>admin,aiCapabilities:()=>({albert:{configured:false}}),createNewsService:()=>newsService,NewsFailure,Request,Response,URL,AbortSignal,TextEncoder,TextDecoder,crypto,console};
 vm.runInNewContext(code,context);return handler;
}
const request=(method,origin,query='section=capabilities')=>new Request('https://synthetic-project.supabase.co/functions/v1/ecosystem-public?'+query,{method,headers:{Origin:origin,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:'{}'}:{})});

test('both effective functions explicitly permit only the two added local preview origins',async()=>{
 for(const kind of ['public','private']){
  const handler=handlerFor(kind);
  for(const origin of ['http://127.0.0.1:5183','http://localhost:5183']){
   const preflight=await handler(request('OPTIONS',origin));assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  }
  for(const origin of ['http://127.0.0.1:5184','http://localhost:5183.evil.test','https://hostile.test']){
   const denied=await handler(request('GET',origin));assert.equal(denied.status,403);assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
  }
 }
});

test('the actual public handler propagates a typed NewsFailure status, including bad countries',async()=>{
 const handler=handlerFor('public',{newsService:createNewsService({fetcher:async()=>{throw Error('No upstream request expected');}})});
 const response=await handler(request('GET','http://127.0.0.1:5183','section=news&country=ZZ'));
 assert.equal(response.status,400);assert.match((await response.json()).error,/Pays inconnu/);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:5183');
});

test('the public handler preserves GET only, capabilities and the existing games contract',async()=>{
 const handler=handlerFor('public');
 assert.equal((await handler(request('POST','https://3b-international.vercel.app'))).status,405);
 const caps=await handler(request('GET','http://localhost:5183'));assert.equal(caps.status,200);assert.deepEqual(await caps.json(),{albert:{configured:false}});
 const games=await handler(request('GET','http://localhost:5183','section=games'));assert.equal(games.status,200);assert.deepEqual((await games.json()).games,[]);
});

test('adding preview origins does not bypass private authentication',async()=>{
 const handler=handlerFor('private');
 const response=await handler(request('POST','http://127.0.0.1:5183'));assert.equal(response.status,401);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:5183');
});
