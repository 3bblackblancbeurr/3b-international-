import test from 'node:test';
import assert from 'node:assert/strict';
import {normalisePassportAccess,getDestinPassportAccess,DESTIN_IDENTITY_ACTIONS} from '../src/destin/passportIdentity.js';

const ready={allowed:true,code:'ready',emailConfirmed:true,passportActive:true,identityVerified:true,personBound:true};

test('confirmed email and active Passeport grant cinema access',()=>{
  assert.equal(normalisePassportAccess(ready).allowed,true);
  assert.equal(normalisePassportAccess({...ready,allowed:false,code:'identity_required',identityVerified:false,personBound:false}).allowed,true);
});
for(const field of ['emailConfirmed','passportActive']){
  test(`missing ${field} fails closed`,()=>{
    for(const value of [undefined,null,false,1,'true'])assert.equal(normalisePassportAccess({...ready,[field]:value}).allowed,false);
  });
}
test('civil identity remains informational and does not block cinema',()=>{
  const result=normalisePassportAccess({...ready,allowed:false,identityVerified:false,personBound:false,code:'person_binding_required'});
  assert.equal(result.identityVerified,false);
  assert.equal(result.personBound,false);
  assert.equal(result.allowed,true);
  assert.equal(result.code,'ready');
  assert.equal(result.next,null);
});
test('malformed account or Passeport status never grants access',()=>{
  for(const value of [null,[],true,'ready',{}, {...ready,emailConfirmed:'true'},{...ready,passportActive:'true'}])assert.equal(normalisePassportAccess(value).allowed,false);
});
test('private identity fields never escape the status boundary',()=>{
  const result=normalisePassportAccess({...ready,subjectId:'private',email:'private',portrait:'private',documentNumber:'private',subject_key_hash:'private'});
  for(const field of ['subjectId','email','portrait','documentNumber','subject_key_hash'])assert.equal(Object.hasOwn(result,field),false);
});
test('consequential viewer actions still use the server Passport gate',()=>{
  assert.deepEqual([...DESTIN_IDENTITY_ACTIONS],['start','resume','checkpoint','choose','finish','claim','vote']);
  for(const action of ['catalog','history','editor','preview','upload','save','publish'])assert.equal(DESTIN_IDENTITY_ACTIONS.has(action),false);
});
test('RPC only receives the authenticated user ID, never client claims',async()=>{
  const calls=[];const db={rpc:async(...args)=>{calls.push(args);return {data:ready,error:null};}};
  assert.equal((await getDestinPassportAccess(db,'authenticated-user')).allowed,true);
  assert.deepEqual(calls,[['passport_destin_access_server_v1',{p_user:'authenticated-user'}]]);
});
test('database errors cannot become an allowed fallback',async()=>{
  await assert.rejects(()=>getDestinPassportAccess({rpc:async()=>({data:ready,error:{message:'private database details'}})},'user'),/service unavailable/);
});
test('missing account does not query another identity',async()=>{
  const result=await getDestinPassportAccess({rpc:()=>{throw Error('must not run');}},null);
  assert.equal(result.allowed,false);assert.equal(result.code,'account_required');
});
