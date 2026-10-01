import test from 'node:test';
import assert from 'node:assert/strict';
import {audience,normalizePilotScopes,pairwiseSubject,idnowCompletion,idnowWebhookEvent,sha256,randomToken,decodeBase64url,encodeBase64url,validateWebAuthnClient} from '../supabase/functions/_shared/passport-security.js';

test('pairwise subjects differ by partner and never expose member UUID',async()=>{
  const uid='123e4567-e89b-12d3-a456-426614174000',secret='x'.repeat(40);
  const one=await pairwiseSubject(uid,'partner-one',secret),two=await pairwiseSubject(uid,'partner-two',secret);
  assert.notEqual(one,two);assert.match(one,/^3bp_[0-9a-f]{64}$/);assert.ok(!one.includes(uid));
  assert.equal(await pairwiseSubject(uid,'partner-one',secret),one);
  await assert.rejects(pairwiseSubject(uid,'partner-one','short'));
});
test('pilot closes age and public profile scopes; audience is a fixed HTTPS destination',()=>{
  assert.deepEqual(normalizePilotScopes(['identity.verified','passport.basic']),['identity.verified','passport.basic']);
  for(const scopes of [['*'],['age.over18'],['profile.public'],[],['passport.basic','unknown']])assert.throws(()=>normalizePilotScopes(scopes));
  assert.equal(audience('https://partner.example/verify'),'https://partner.example/verify');
  for(const value of ['http://partner.example','https://user:secret@partner.example','https://partner.example/?leak=x','https://partner.example/#x'])assert.throws(()=>audience(value));
});
const expected={sessionId:'session-example',flowId:'flow-example',subjectId:'opaque-subject',physical:'production',logical:'live',approved:true};
const result={sessionId:expected.sessionId,flowId:expected.flowId,metadata:{subjectId:expected.subjectId},environment:'live',sessionStatus:'COMPLETED',outcome:'accepted'};
test('IDnow requires completed live result with every binding verified',()=>{
  assert.deepEqual(idnowCompletion(result,expected),{state:'verified',code:null});
  for(const patch of [{sessionId:'other'},{flowId:'other'},{metadata:{subjectId:'other'}},{environment:'staging'},{sessionStatus:'PROCESSING'},{outcome:'NO_OUTCOME'}])
    assert.throws(()=>idnowCompletion({...result,...patch},expected));
  assert.deepEqual(idnowCompletion({...result,outcome:'rejected'},expected),{state:'rejected',code:'provider_rejected'});
});
test('sandbox, staging and unapproved IDnow acceptance never grant civil trust',()=>{
  assert.equal(idnowCompletion(result,{...expected,physical:'sandbox'}).state,'error');
  assert.equal(idnowCompletion({...result,environment:'staging'},{...expected,logical:'staging'}).state,'error');
  assert.equal(idnowCompletion(result,{...expected,approved:false}).state,'error');
});
test('signed IDnow events still require matching subject, flow, environment and terminal status',()=>{
  const eventId='123e4567-e89b-12d3-a456-426614174000',sessionId='123e4567-e89b-12d3-a456-426614174001';
  const data={eventId,eventName:'session.completed',eventVersion:'1.0',environment:'live',payload:{sessionId,flowId:'expected-flow',sessionStatus:'COMPLETED'}};
  const payload={sub:eventId,data},bindings={logical:'live',flowId:'expected-flow'};
  assert.equal(idnowWebhookEvent(payload,bindings).sessionId,sessionId);
  assert.throws(()=>idnowWebhookEvent({...payload,sub:sessionId},bindings));
  for(const patch of [{environment:'staging'},{eventName:'session.error'},{payload:{...data.payload,flowId:'other-flow'}},{payload:{...data.payload,sessionStatus:'RUNNING'}}])
    assert.throws(()=>idnowWebhookEvent({...payload,data:{...data,...patch}},bindings));
});
test('tokens use 256-bit randomness, store only their hash; WebAuthn binary roundtrips',async()=>{
  const one=randomToken(),two=randomToken();assert.match(one,/^[0-9a-f]{64}$/);assert.notEqual(one,two);
  assert.notEqual(await sha256(one),one);assert.match(await sha256(one),/^[0-9a-f]{64}$/);
  const bytes=Uint8Array.from([0,255,127,64,1,250,99]);assert.deepEqual(decodeBase64url(encodeBase64url(bytes)),bytes);
  for(const value of ['%','a','abc='])assert.throws(()=>decodeBase64url(value));
});
test('WebAuthn rejects cross-origin ceremonies and a handle belonging to another account',()=>{
  const handle=new Uint8Array(32).fill(42),origin='https://3b.example',hexHandle=Array.from(handle,b=>b.toString(16).padStart(2,'0')).join('');
  const response=(patch={},userHandle=encodeBase64url(handle))=>({response:{clientDataJSON:encodeBase64url(new TextEncoder().encode(JSON.stringify({origin,crossOrigin:false,...patch}))),userHandle}});
  assert.doesNotThrow(()=>validateWebAuthnClient(response(),origin,hexHandle));
  assert.doesNotThrow(()=>validateWebAuthnClient(response({},null),origin,hexHandle));
  assert.throws(()=>validateWebAuthnClient(response({crossOrigin:true}),origin,hexHandle));
  assert.throws(()=>validateWebAuthnClient(response({topOrigin:'https://evil.example'}),origin,hexHandle));
  assert.throws(()=>validateWebAuthnClient(response(),origin,'1'.repeat(64)));
});
