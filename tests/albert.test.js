import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAlbertLocal,validateAlbertActions} from '../src/control/albert-model.js';
import {createCommandIntegrations} from '../server/command-integrations.js';
test('Albert local commands respect negation and require an exact intention',()=>{
 assert.equal(parseAlbertLocal('ne masque pas les projets'),null);
 assert.equal(parseAlbertLocal('comment activer le mode focus ?'),null);
 assert.deepEqual(parseAlbertLocal('ambiance violet'),[{type:'theme',value:'violet'}]);
 assert.deepEqual(parseAlbertLocal('masque les projets'),[{type:'module',id:'projects',visible:false}]);
 assert.equal(parseAlbertLocal('efface tous mes fichiers'),null);
});
test('Albert actions cannot execute code, PC commands or change permissions',()=>{
 assert.deepEqual(validateAlbertActions([{type:'exec',value:'rm'},{type:'module',id:'owner',visible:false},{type:'theme',value:'javascript:'}]),[]);
 assert.deepEqual(validateAlbertActions(Array(13).fill({type:'focus',value:true})),[]);
 assert.deepEqual(validateAlbertActions([{type:'module',id:'projects',visible:true,script:'evil'}]),[{type:'module',id:'projects',visible:true}]);
});
const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
function fixture(output,owner=uid){
 return createCommandIntegrations({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',OPENAI_API_KEY:'private',COMMAND_AI_MODEL:'test'},fetcher:async(input,options)=>{
  const url=new URL(input);let body;
  if(url.pathname==='/auth/v1/user')body={id:uid,email:'owner@example.test',email_confirmed_at:'2026-01-01'};
  else if(url.pathname.includes('loyalty_session_valid')||url.pathname.includes('loyalty_rate'))body=true;
  else if(url.pathname.includes('control_center_settings'))body=[{enabled:true,owner_user_id:owner}];
  else if(url.hostname==='api.openai.com'){assert.equal(JSON.parse(options.body).store,false);body={output_text:output,model:'test'};}
  else throw Error('Unexpected request '+url);
  return Response.json(body);
 }});
}
const request=()=>new Request('https://3b-international.vercel.app/api/command-integrations',{method:'POST',headers:{Origin:'https://3b-international.vercel.app','Content-Type':'application/json',Authorization:'Bearer x.'+Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')+'.x'},body:JSON.stringify({action:'albert',prompt:'Affiche les projets'})});
test('Albert applies only validated structured UI proposals',async()=>{
 const res=await fixture(JSON.stringify({text:'Projets affichés.',actions:[{type:'module',id:'projects',visible:true}]})).handle(request());
 assert.equal(res.status,200);const data=await res.json();assert.equal(data.answer.actions[0].id,'projects');assert.doesNotMatch(JSON.stringify(data),/private|secret/);
});
test('Malformed AI output and unsafe mixed proposals fail closed',async()=>{
 for(const output of ['not JSON',JSON.stringify({text:'ok',actions:[{type:'focus',value:true},{type:'exec',value:'evil'}]}),JSON.stringify({text:'ok'})]){
  const res=await fixture(output).handle(request());assert.equal(res.status,502);assert.equal((await res.json()).answer,undefined);
 }
});
test('Albert retains server-side owner authentication',async()=>{
 const res=await fixture('{}','33333333-3333-4333-8333-333333333333').handle(request());assert.equal(res.status,403);
});
