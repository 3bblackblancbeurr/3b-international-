import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';

const source=readFileSync(new URL('../supabase/functions/ecosystem/index.ts',import.meta.url),'utf8');
const compiled=transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code;

// Run the real legacy handler with a denied-auth fixture. OPTIONS never touches a service.
function fixture(){
  let handler,authCalls=0;
  runInNewContext(compiled,{
    exports:{},
    require(name){
      if(name.includes('@supabase/supabase-js'))return{createClient:()=>({auth:{async getUser(){authCalls++;return{data:{user:null},error:new Error('Invalid fixture token')};}}})};
      return {};
    },
    Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://db.example.test':'fixture'},serve:callback=>{handler=callback;}},
    Request,Response,URL,TextDecoder,
  });
  return{handler,get authCalls(){return authCalls;}};
}

test('legacy ecosystem preflight permits exact native and existing web origins',async()=>{
  const f=fixture();
  for(const origin of ['https://localhost','capacitor://localhost','https://3b-international.vercel.app','http://localhost:5174','http://127.0.0.1:5174']){
    const result=await f.handler(new Request('https://db.example.test/functions/v1/ecosystem',{
      method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type,x-client-info'},
    }));
    assert.equal(result.status,204);
    assert.equal(result.headers.get('access-control-allow-origin'),origin);
    assert.ok(result.headers.get('access-control-allow-methods').split(',').includes('POST'));
    assert.equal(result.headers.get('vary'),'Origin');
  }
  assert.equal(f.authCalls,0);
});

test('legacy ecosystem still denies foreign and lookalike origins without a wildcard',async()=>{
  const f=fixture();
  for(const origin of ['https://example.invalid','https://localhost.evil.invalid','capacitor://localhost.evil.invalid','http://localhost']){
    const preflight=await f.handler(new Request('https://db.example.test/functions/v1/ecosystem',{method:'OPTIONS',headers:{Origin:origin}}));
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('access-control-allow-origin'),null);
    const request=await f.handler(new Request('https://db.example.test/functions/v1/ecosystem',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"action":"snapshot"}'}));
    assert.equal(request.status,403);
    assert.equal(request.headers.get('access-control-allow-origin'),null);
  }
  assert.equal(f.authCalls,0);
});

test('native CORS does not authorize private actions without a valid account',async()=>{
  const f=fixture();
  for(const token of ['', 'Bearer fixture-invalid']){
    const result=await f.handler(new Request('https://db.example.test/functions/v1/ecosystem',{
      method:'POST',headers:{Origin:'https://localhost','Content-Type':'application/json',...(token?{Authorization:token}:{})},body:'{"action":"snapshot"}',
    }));
    assert.equal(result.status,401);
    assert.equal(result.headers.get('access-control-allow-origin'),'https://localhost');
  }
  assert.equal(f.authCalls,1);
});

test('live CORS workflow keeps legacy coverage and adds the current public/private endpoints',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/verify-native-cors.yml',import.meta.url),'utf8');
  assert.match(workflow,/functions=\(member-hub ecosystem ecosystem-public ecosystem-private world-engine\)/);
  assert.match(workflow,/if \[\[ "\$fn" == 'ecosystem-public' \]\]; then\s+method='GET'/);
  assert.match(workflow,/Origin: https:\/\/example\.invalid/);
  assert.match(workflow,/Foreign origin was unexpectedly allowed/);
});
