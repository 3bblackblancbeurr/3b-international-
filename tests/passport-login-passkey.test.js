import test from 'node:test';
import assert from 'node:assert/strict';
import {createPasskeyLogin} from '../src/passport/login-passkey-core.js';
import {revokeAuthPasskeys} from '../supabase/functions/_shared/passport-auth-recovery.js';
const user='123e4567-e89b-12d3-a456-426614174000',key='123e4567-e89b-12d3-a456-426614174002';
const session={access_token:'issued-only-by-auth',user:{id:user}},status={enabled:true,mode:'supabase_auth_passkey'};
function fixture({enabled=true,server=status,support=true}={}) {
 let current=null,calls=[],error=null;
 const auth={getSession:async()=>({data:{session:current},error:null}),
   signInWithPasskey:async params=>{calls.push(['signInWithPasskey',params]);if(error)return {data:null,error};current=session;return {data:{session,user:session.user},error:null};},
   registerPasskey:async params=>{calls.push(['registerPasskey',params]);return {data:{id:key},error};},
   passkey:{list:async()=>({data:[],error}),delete:async params=>{calls.push(['delete',params]);return {data:null,error};}}};
 const api=createPasskeyLogin({auth,readiness:async()=>server,supported:()=>support,enabled});
 return {api,auth,calls,setSession:value=>{current=value;},setError:value=>{error=value;}};
}
test('disabled client, unsupported browser, disabled hosted service and wrong server mode never invoke a ceremony',async()=>{
 for(const settings of [{enabled:false},{support:false},{server:{enabled:false,mode:'supabase_auth_passkey'}},{server:{enabled:true,mode:'session_stepup'}}]){
  const f=fixture(settings);await assert.rejects(f.api.signIn());assert.equal(f.calls.length,0);
 }
});
test('initial login invokes only the official SDK and forwards CAPTCHA/abort; the SDK-issued session is returned',async()=>{
 const f=fixture(),signal=new AbortController().signal,result=await f.api.signIn({captchaToken:'synthetic-captcha',signal});
 assert.deepEqual(f.calls,[['signInWithPasskey',{options:{captchaToken:'synthetic-captcha',signal}}]]);assert.equal(result.session,session);
 assert.equal('setSession' in f.auth,false); // There is no synthesized session installation path.
});
test('a current account is never silently replaced; cancellation and provider errors never report successful login',async()=>{
 const open=fixture();open.setSession(session);await assert.rejects(open.api.signIn(),/Déconnecte/);assert.equal(open.calls.length,0);
 const aborted=fixture(),controller=new AbortController();controller.abort();await assert.rejects(aborted.api.signIn({signal:controller.signal}),/annulée/);assert.equal(aborted.calls.length,0);
 for(const error of [{code:'passkey_disabled',message:'disabled'},{name:'NotAllowedError',message:'cancelled'},{code:'webauthn_verification_failed',message:'rejected'}]){
  const f=fixture();f.setError(error);await assert.rejects(f.api.signIn());
 }
});
test('missing or mismatched Auth-issued session is rejected, without a token fallback',async()=>{
 for(const data of [{user:{id:user},session:null},{user:{id:user},session:{access_token:'x',user:{id:'other'}}}]){
  const f=fixture();f.auth.signInWithPasskey=async()=>({data,error:null});await assert.rejects(f.api.signIn(),/n’a pas abouti/);
 }
});
test('account changes during management do not publish keys or success from the previous account',async()=>{
 const f=fixture();f.setSession(session);
 f.auth.registerPasskey=async()=>{f.setSession({user:{id:'other'}});return {data:{id:key},error:null};};
 await assert.rejects(f.api.register(user),/session a changé/);
 f.setSession(session);f.auth.passkey.list=async()=>{f.setSession(null);return {data:[{id:key}],error:null};};await assert.rejects(f.api.list(user),/session a changé/);
});
test('key deletion propagates Auth errors and confirms removal instead of trusting a successful HTTP response alone',async()=>{
 const f=fixture();f.setSession(session);f.setError({message:'provider unavailable'});await assert.rejects(f.api.revoke(user,key),/provider unavailable/);
 f.setError(null);f.auth.passkey.list=async()=>({data:[{id:key}],error:null});await assert.rejects(f.api.revoke(user,key),/pas été confirmée/);
 f.auth.passkey.list=async()=>({data:[],error:null});assert.equal(await f.api.revoke(user,key),true);
});
test('closing login/enrollment gates never hides or prevents authenticated management of existing keys',async()=>{
 const f=fixture({enabled:false,support:false,server:{enabled:false,mode:'supabase_auth_passkey'}});f.setSession(session);
 f.auth.passkey.list=async()=>({data:[{id:key}],error:null});assert.equal((await f.api.list(user))[0].id,key);
 f.auth.passkey.delete=async()=>{f.auth.passkey.list=async()=>({data:[],error:null});return {data:null,error:null};};assert.equal(await f.api.revoke(user,key),true);
 await assert.rejects(f.api.register(user));
});
test('recovery deletes official Auth login keys, checks remaining keys and never masks failures after historical activation',async()=>{
 let rows=[{id:key}],calls=[];
 const request=async(path,method)=>{calls.push([path,method]);if(method==='DELETE'){rows=[];return {ok:true,status:204};}return {ok:true,status:200,data:rows};};
 const result=await revokeAuthPasskeys({request,userId:user,required:true});assert.equal(result.revoked,1);
 assert.equal(calls[1][0],'/auth/v1/admin/users/'+user+'/passkeys/'+key);assert.equal(calls[1][1],'DELETE');assert.equal(calls.length,3);
 for(const response of [{ok:false,status:404},{ok:false,status:503},{ok:true,status:200,data:{unexpected:'shape'}}])await assert.rejects(revokeAuthPasskeys({userId:user,required:true,request:async()=>response}));
 const unsupported=await revokeAuthPasskeys({userId:user,required:false,request:async()=>({ok:false,status:404})});assert.equal(unsupported.supported,false);
 await assert.rejects(revokeAuthPasskeys({userId:user,required:false,request:async()=>({ok:false,status:503})}));
 await assert.rejects(revokeAuthPasskeys({userId:user,required:false,request:async()=>({ok:false,status:422,data:{code:'passkey_disabled'}})}));
});
test('recovery refuses a failed delete or a key issued concurrently before the final verification',async()=>{
 let n=0;await assert.rejects(revokeAuthPasskeys({userId:user,required:true,request:async(_path,method)=>method==='DELETE'?{ok:false,status:503}:{ok:true,data:[{id:key}]}}));
 await assert.rejects(revokeAuthPasskeys({userId:user,required:true,request:async(_path,method)=>{n++;return method==='DELETE'?{ok:true,status:204}:{ok:true,data:[{id:key}]};}}));assert.equal(n,3);
});
