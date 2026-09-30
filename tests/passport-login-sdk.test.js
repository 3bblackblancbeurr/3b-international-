import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createPasskeyLogin} from '../src/passport/login-passkey-core.js';
const user='123e4567-e89b-12d3-a456-426614174000';
const key='123e4567-e89b-12d3-a456-426614174002';
test('installed official Supabase SDK performs options/ceremony/verify and persists only an Auth-issued session',async t=>{
 const previous=Object.fromEntries(['window','document','navigator','PublicKeyCredential'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 let cancelled=false;
 class SyntheticCredential{toJSON(){return {id:'synthetic-credential',rawId:'synthetic-credential',type:'public-key',response:{clientDataJSON:'c3ludGhldGlj',authenticatorData:'c3ludGhldGlj',signature:'c3ludGhldGlj'}};}}
 Object.defineProperty(globalThis,'PublicKeyCredential',{configurable:true,value:SyntheticCredential});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{PublicKeyCredential:SyntheticCredential}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{credentials:{create:async()=>null,get:async()=>{
  if(cancelled){const error=Error('cancelled');error.name='NotAllowedError';throw error;}
  return new SyntheticCredential();
 }}}});
 try {
  for(const scenario of ['success','disabled','cancel','rejected'])await t.test(scenario,async()=>{
   cancelled=scenario==='cancel';const calls=[],events=[];
   let storedKeys=[{id:key,friendly_name:'Synthetic existing key',created_at:'2026-09-30T00:00:00Z'}];
   const client=createClient('https://synthetic.invalid','synthetic-publishable-key',{auth:{storageKey:'synthetic-passkey-'+scenario,experimental:{passkey:true},autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{
    const path=new URL(input).pathname;calls.push({path,method:init.method,body:init.body?JSON.parse(init.body):null});
    if(path==='/auth/v1/passkeys')return Response.json(storedKeys);
    if(path==='/auth/v1/passkeys/'+key&&init.method==='DELETE'){storedKeys=[];return new Response(null,{status:204});}
    if(path.endsWith('/authentication/options'))return scenario==='disabled'?Response.json({code:'passkey_disabled',msg:'disabled'},{status:422}):Response.json({challenge_id:'synthetic-challenge',expires_at:Date.now()+180000,options:{challenge:'c3ludGhldGlj',rpId:'synthetic.invalid',userVerification:'required',allowCredentials:[]}});
    if(path.endsWith('/authentication/verify'))return scenario==='rejected'?Response.json({code:'webauthn_verification_failed',msg:'rejected'},{status:400}):Response.json({access_token:'synthetic-auth-issued-token',refresh_token:'synthetic-auth-issued-refresh',expires_in:3600,token_type:'bearer',user:{id:user,email_confirmed_at:'2026-09-30T00:00:00Z'}});
    throw Error('Unexpected network route: '+path);
   }}});
   const {data:{subscription}}=client.auth.onAuthStateChange(event=>{events.push(event);});
   const result=await client.auth.signInWithPasskey({options:{captchaToken:'synthetic-captcha'}});
   const current=(await client.auth.getSession()).data.session;
   assert.equal(calls[0].path,'/auth/v1/passkeys/authentication/options');assert.equal(calls[0].body.gotrue_meta_security.captcha_token,'synthetic-captcha');
   if(scenario==='success'){
    assert.equal(result.error,null);assert.equal(current.access_token,'synthetic-auth-issued-token');assert.equal(current.user.id,user);assert.ok(events.includes('SIGNED_IN'));
    assert.equal(calls[1].body.challenge_id,'synthetic-challenge');assert.equal(calls[1].body.credential.id,'synthetic-credential');
   }else{assert.ok(result.error);assert.equal(current,null);assert.equal(events.includes('SIGNED_IN'),false);}
   assert.equal(calls.length,['success','rejected'].includes(scenario)?2:1);
   if(scenario==='success'){
    const closed=createPasskeyLogin({auth:client.auth,enabled:false,supported:()=>false,readiness:async()=>{throw Error('readiness must not guard revocation');}});
    assert.equal((await closed.list(user))[0].id,key);assert.equal(await closed.revoke(user,key),true);
    assert.deepEqual(calls.slice(2).map(call=>[call.path,call.method]),[['/auth/v1/passkeys','GET'],['/auth/v1/passkeys/'+key,'DELETE'],['/auth/v1/passkeys','GET']]);
   }
   subscription.unsubscribe();await client.auth.stopAutoRefresh();
  });
 }finally{for(const name of Object.keys(previous)){if(previous[name])Object.defineProperty(globalThis,name,previous[name]);else delete globalThis[name];}}
});
