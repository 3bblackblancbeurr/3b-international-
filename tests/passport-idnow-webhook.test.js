import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createContext,runInContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=readFileSync(new URL('../supabase/functions/passport-idv/index.ts',import.meta.url),'utf8')
  .replace("import { createRemoteJWKSet, jwtVerify } from 'jose';",'');
const EVENT_ID='11111111-1111-4111-8111-111111111111';
const SESSION_ID='test-session';
const USER_ID='test-user';
const FLOW_ID='test-flow-id';
const REF_SECRET='test-reference-secret-with-32-characters';
const env={
  SUPABASE_URL:'https://supabase.test',
  SUPABASE_SERVICE_ROLE_KEY:'test-service-role',
  PASSPORT_IDENTITY_PROVIDER:'idnow',
  PASSPORT_IDENTITY_VERIFICATION_ENABLED:'true',
  IDNOW_PVID_FLOW_APPROVED:'true',
  IDNOW_CLIENT_ID:'test-client',
  IDNOW_CLIENT_SECRET:'test-client-secret-only',
  IDNOW_FLOW_ID:FLOW_ID,
  IDNOW_WEBHOOK_AUDIENCE:'https://supabase.test/functions/v1/passport-idv',
  PASSPORT_IDENTITY_REFERENCE_SECRET:REF_SECRET
};
const json=(body,status=200)=>Response.json(body,{status});

async function harness(options={}){
  const event={provider:'idnow',event_id:EVENT_ID,event_name:'session.completed',event_version:'1',processed_at:null};
  const state={
    event:options.existing?{...event,...options.existing}:null,
    providerCalls:0,attemptReads:0,attemptWrites:0,profileWrites:0,
    failProvider:!!options.failProvider,failProfile:!!options.failProfile
  };
  const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(REF_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=Buffer.from(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode('subject:'+USER_ID))).toString('hex');
  let handler;
  const fetch=async(url,init={})=>{
    const path=new URL(url).pathname;
    const method=init.method||'GET';
    if(path.endsWith('/openid-configuration'))return json({issuer:'https://idnow.test'});
    if(path==='/oidc/token')return json({access_token:'test-provider-token'});
    if(path==='/api/v1/staging/sessions/'+SESSION_ID){
      state.providerCalls++;
      if(state.failProvider){state.failProvider=false;return json({},503);}
      return json({metadata:{subjectId:'3b_'+hash.slice(0,40)},flowId:FLOW_ID,outcome:'accepted'});
    }
    if(path==='/rest/v1/passport_identity_provider_events'){
      if(method==='POST'){
        if(options.insertError)return json({code:options.insertError},400);
        if(state.event)return json({code:'23505'},409);
        state.event={...JSON.parse(init.body),processed_at:null};
        return json([state.event],201);
      }
      if(method==='GET'){
        if(options.readError)return json({},503);
        return json(options.missingEvent?[]:[state.event]);
      }
      if(method==='PATCH'){
        Object.assign(state.event,JSON.parse(init.body));
        return json([state.event]);
      }
    }
    if(path==='/rest/v1/passport_identity_verification_attempts'){
      if(method==='GET'){
        state.attemptReads++;
        return json([{id:'test-attempt',user_id:USER_ID,state:'processing'}]);
      }
      state.attemptWrites++;
      return json([{id:'test-attempt'}]);
    }
    if(path==='/rest/v1/member_profiles'&&method==='PATCH'){
      if(state.failProfile){state.failProfile=false;return json({},503);}
      state.profileWrites++;
      return json([{user_id:USER_ID}]);
    }
    throw new Error('Unexpected HTTP request: '+method+' '+url);
  };
  const context=createContext({
    Deno:{env:{get:name=>env[name]},serve:callback=>{handler=callback;}},
    fetch,crypto:webcrypto,TextEncoder,URL,AbortSignal,Response,Request,btoa,atob,
    createRemoteJWKSet:()=>({}),
    jwtVerify:async()=>({payload:{data:{
      eventId:EVENT_ID,eventName:'session.completed',eventVersion:'1',payload:{sessionId:SESSION_ID}
    }}})
  });
  runInContext(stripTypeScriptTypes(source,{mode:'transform',sourceMap:false}),context);
  const deliver=async()=>{
    const response=await handler(new Request(env.IDNOW_WEBHOOK_AUDIENCE,{
      method:'POST',headers:{'Content-Type':'application/jwt'},body:'test-signed-jwt-'.repeat(10)
    }));
    return{status:response.status,body:await response.json()};
  };
  return{state,deliver};
}

test('failed provider request resumes the unprocessed event on retry and deduplicates after success',async()=>{
  const {state,deliver}=await harness({failProvider:true});
  assert.equal((await deliver()).status,503);
  assert.equal(state.event.processed_at,null);
  assert.equal(state.profileWrites,0);
  const retry=await deliver();
  assert.deepEqual(retry,{status:200,body:{ok:true,state:'verified'}});
  assert.ok(state.event.processed_at);
  assert.equal(state.profileWrites,1);
  assert.equal(state.providerCalls,2);
  assert.deepEqual(await deliver(),{status:200,body:{ok:true,duplicate:true}});
  assert.equal(state.providerCalls,2);
  assert.equal(state.profileWrites,1);
});

test('retry finishes a delivery interrupted after the attempt update',async()=>{
  const {state,deliver}=await harness({failProfile:true});
  assert.equal((await deliver()).status,503);
  assert.equal(state.attemptWrites,1);
  assert.equal(state.event.processed_at,null);
  assert.equal((await deliver()).status,200);
  assert.equal(state.attemptWrites,2);
  assert.equal(state.profileWrites,1);
  assert.ok(state.event.processed_at);
});

test('an already processed delivery performs no provider or identity update',async()=>{
  const {state,deliver}=await harness({existing:{processed_at:'2026-09-28T12:00:00Z'}});
  assert.deepEqual(await deliver(),{status:200,body:{ok:true,duplicate:true}});
  assert.equal(state.attemptReads,0);
  assert.equal(state.providerCalls,0);
  assert.equal(state.profileWrites,0);
});

test('an unrelated insert error is not acknowledged as a duplicate',async()=>{
  const {state,deliver}=await harness({insertError:'42501'});
  assert.equal((await deliver()).status,400);
  assert.equal(state.attemptReads,0);
  assert.equal(state.profileWrites,0);
});

test('a failed ledger lookup stays retryable',async()=>{
  const {state,deliver}=await harness({existing:{},readError:true});
  assert.equal((await deliver()).status,503);
  assert.equal(state.attemptReads,0);
  assert.equal(state.profileWrites,0);
});

test('a conflict without a readable ledger row stays retryable',async()=>{
  const {state,deliver}=await harness({existing:{},missingEvent:true});
  assert.equal((await deliver()).status,503);
  assert.equal(state.attemptReads,0);
  assert.equal(state.profileWrites,0);
});

test('a reused event ID with different metadata is rejected without identity writes',async()=>{
  const {state,deliver}=await harness({existing:{event_name:'session.expired'}});
  assert.equal((await deliver()).status,409);
  assert.equal(state.attemptReads,0);
  assert.equal(state.profileWrites,0);
});
