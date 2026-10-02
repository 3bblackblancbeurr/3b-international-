import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {generateSigningJWK,randomSecret,sha256,decodeBase64url} from '../shared/passport-recognition.js';
import {createRecognitionHandler} from '../shared/passport-recognition-service.js';
import {PassportFailure,passportRuntime} from '../shared/passport-recognition-runtime.js';
import {createPassportTicketIssuer,createPassportTicketVerifier} from '../shared/passport-recognition-tickets.js';
globalThis.crypto??=webcrypto;
const USER='c21a3f85-a5c8-4f4a-a412-09c6d5bc1fe1',SESSION='7a82a1c6-cf7d-41e7-b191-364792114125',PARTNER='9929f283-0ad7-45bc-8c11-1b6014d069e3';
const APP='https://3b-international.vercel.app',BASE='https://project.supabase.co';
const request=(body,key='member',origin=APP)=>new Request(BASE+'/functions/v1/passport-recognition',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key,...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});

async function fixture({empty=false,disabled=false,vault=false}={}){
  const jwk=await generateSigningJWK(),pairwise=randomSecret(),apiKey=randomSecret(),keyHash=await sha256(apiKey);
  const partners=empty?[]:[{id:PARTNER,name:'Contract fixture only',website:'https://partner.example',audience:'https://partner.example/3b',allowed_scopes:['passport.basic','identity.verified']}];
  const proofs=new Map(),calls=[];let active=true;
  const env={PASSPORT_RECOGNITION_ISSUER:APP,...(!vault?{PASSPORT_RECOGNITION_SIGNING_JWK:JSON.stringify(jwk),PASSPORT_RECOGNITION_PAIRWISE_SECRET:pairwise}:{}),...(disabled?{PASSPORT_RECOGNITION_ENABLED:'false'}:{})};
  async function api(path,body){
    calls.push({path,body});
    if(path.endsWith('/loyalty_rate'))return true;
    if(path.includes('/passport_recognition_settings?'))return[{enabled:true}];
    if(path.endsWith('/passport_recognition_signing_material_v1'))return{enabled:true,signing_jwk:jwk,pairwise_secret:pairwise};
    if(path.includes('/passport_recognition_partners?'))return path.includes('api_key_hash=eq.')?(path.includes(keyHash)?partners:[]):partners;
    if(path.includes('/passport_recognition_proofs?'))return[...proofs.values()];
    if(path.endsWith('/passport_recognition_issue_v1')){
      if(!active||empty||body.p_partner!==PARTNER||body.p_consent!==true||body.p_scopes.some(scope=>!partners[0].allowed_scopes.includes(scope))||[...proofs.values()].some(p=>p.nonce===body.p_nonce_hash))throw new PassportFailure(400,'Issue rejected');
      const id=crypto.randomUUID(),iat=Math.floor(Date.now()/1000),expires_at=new Date((iat+300)*1000).toISOString();
      const payload={v:1,iss:body.p_issuer,aud:partners[0].audience,sub:body.p_subject,jti:id,iat,exp:iat+300,nonce_hash:body.p_nonce_hash,scopes:body.p_scopes,claims:body.p_scopes.includes('identity.verified')?{identity_verified:true}:{passport_active:true,passport_version:2}};
      proofs.set(id,{id,partner_id:PARTNER,scopes:body.p_scopes,issued_at:new Date(iat*1000).toISOString(),expires_at,revoked_at:null,consumed_at:null,payload,nonce:body.p_nonce_hash});
      return{id,payload,expires_at,partner_name:partners[0].name};
    }
    if(path.endsWith('/passport_recognition_consume_v1')){
      const record=proofs.get(body.p_payload.jti);
      if(!active||!record||record.revoked_at||record.consumed_at||record.nonce!==body.p_nonce_hash||JSON.stringify(record.payload)!==JSON.stringify(body.p_payload))throw new PassportFailure(400,'Proof no longer valid');
      record.consumed_at=new Date().toISOString();
      return{valid:true,proof_id:record.id,partner_name:partners[0].name,claims:record.payload.claims,scopes:record.scopes,expires_at:record.expires_at};
    }
    if(path.endsWith('/passport_recognition_revoke_v1')){const record=proofs.get(body.p_proof);if(!record||body.p_user!==USER)return false;record.revoked_at=new Date().toISOString();return true;}
    throw Error('Unexpected API call '+path);
  }
  const runtime={api,authenticate:async req=>{if(req.headers.get('authorization')!=='Bearer member')throw new PassportFailure(401,'Session required');return{userId:USER,sessionId:SESSION};},getEnv:name=>env[name],baseURL:BASE,appURL:APP};
  return{handler:createRecognitionHandler(runtime),runtime,env,jwk,pairwise,apiKey,proofs,calls,deactivate:()=>{active=false;}};
}

test('member creates a minimal signed proof; partner verifies once with its exact challenge',async()=>{
  const fixtureData=await fixture(),nonce=randomSecret();
  const response=await fixtureData.handler(request({action:'issue',partnerId:PARTNER,scopes:['passport.basic'],nonce,consent:true}));
  assert.equal(response.status,200);const issue=await response.json();
  assert.equal(issue.proof,issue.proofJWT);
  const payload=JSON.parse(new TextDecoder().decode(decodeBase64url(issue.proof.split('.')[1])));
  assert.deepEqual(payload.claims,{passport_active:true,passport_version:2});
  for(const forbidden of ['user_id','name','address','birth_date','document','api_key_hash'])assert.equal(Object.hasOwn(payload.claims,forbidden),false);
  assert.equal(payload.nonce_hash,await sha256(nonce));
  const verify=()=>fixtureData.handler(request({action:'verify',proof:issue.proof,nonce},fixtureData.apiKey,null));
  assert.equal((await verify()).status,200);
  assert.equal((await verify()).status,400);
  const record=fixtureData.proofs.get(issue.proofId);assert.ok(record.consumed_at);
});

test('missing consent, forbidden scope, unsupported partner, wrong challenge and unknown key are rejected',async()=>{
  const fixtureData=await fixture(),nonce=randomSecret();
  for(const patch of [{consent:false},{scopes:['age.over18']},{scopes:['profile.public']},{partnerId:crypto.randomUUID()},{nonce:'short'},{scopes:['passport.basic'],identity_verified:true}]){
    const result=await fixtureData.handler(request({action:'issue',partnerId:PARTNER,scopes:['passport.basic'],nonce,consent:true,...patch}));
    assert.equal(result.status,400);
  }
  const issue=await(await fixtureData.handler(request({action:'issue',partnerId:PARTNER,scopes:['passport.basic'],nonce,consent:true}))).json();
  assert.equal((await fixtureData.handler(request({action:'verify',proof:issue.proof,nonce:randomSecret()},fixtureData.apiKey,null))).status,403);
  assert.equal((await fixtureData.handler(request({action:'verify',proof:issue.proof,nonce},randomSecret(),null))).status,401);
  assert.equal(fixtureData.proofs.get(issue.proofId).consumed_at,null);
});

test('live database downgrade/revocation overrides a still-valid signature',async()=>{
  for(const revoke of [true,false]){
    const fixtureData=await fixture(),nonce=randomSecret();
    const issue=await(await fixtureData.handler(request({action:'issue',partnerId:PARTNER,scopes:['passport.basic'],nonce,consent:true}))).json();
    if(revoke)assert.equal((await fixtureData.handler(request({action:'revoke',proofId:issue.proofId}))).status,200);else fixtureData.deactivate();
    assert.equal((await fixtureData.handler(request({action:'verify',proof:issue.proof,nonce},fixtureData.apiKey,null))).status,400);
  }
});

test('a holder can revoke when signature feature is disabled or private key is unavailable',async()=>{
  const fixtureData=await fixture(),nonce=randomSecret();
  const issue=await(await fixtureData.handler(request({action:'issue',partnerId:PARTNER,scopes:['passport.basic'],nonce,consent:true}))).json();
  fixtureData.env.PASSPORT_RECOGNITION_ENABLED='false';delete fixtureData.env.PASSPORT_RECOGNITION_SIGNING_JWK;
  const disabled=createRecognitionHandler(fixtureData.runtime);
  assert.equal((await disabled(request({action:'issue',partnerId:PARTNER,scopes:['passport.basic'],nonce:randomSecret(),consent:true}))).status,503);
  assert.equal((await disabled(request({action:'revoke',proofId:issue.proofId}))).status,200);
});

test('empty partner registry stays empty; metadata/JWKS/status never expose key or civil data',async()=>{
  const fixtureData=await fixture({empty:true,vault:true});
  const status=await(await fixtureData.handler(request({action:'status'}))).json();
  assert.equal(status.readiness.ready,false);assert.deepEqual(status.partners,[]);assert.equal(status.readiness.hasPartners,false);
  const publicResponse=await fixtureData.handler(new Request(BASE+'/functions/v1/passport-recognition?action=jwks'));
  const published=await publicResponse.json();assert.equal(published.keys.length,1);assert.equal(Object.hasOwn(published.keys[0],'d'),false);
  const metadata=await(await fixtureData.handler(new Request(BASE+'/functions/v1/passport-recognition?action=metadata'))).json();
  assert.equal(metadata.online_validation_required,true);assert.equal(metadata.official_recognition,false);
  for(const serialized of [JSON.stringify(status),JSON.stringify(published),JSON.stringify(metadata)]){assert.equal(serialized.includes(fixtureData.jwk.d),false);assert.equal(serialized.includes(fixtureData.pairwise),false);assert.equal(serialized.includes(USER),false);}
  assert.equal(fixtureData.calls.filter(call=>call.path.endsWith('/passport_recognition_signing_material_v1')).length,1);
});

test('status requires member authentication; untrusted origin and oversize body are refused',async()=>{
  const fixtureData=await fixture();
  assert.equal((await fixtureData.handler(request({action:'status'},'unknown'))).status,401);
  assert.equal((await fixtureData.handler(request({action:'status'},'member','https://evil.example'))).status,403);
  assert.equal((await fixtureData.handler(request({action:'status',large:'x'.repeat(25000)}))).status,413);
});

test('Vault bootstrap validates its key before persistence and supplies the selected KID',async()=>{
  const fixtureData=await fixture();
  const withoutKid={...fixtureData.jwk};delete withoutKid.kid;
  fixtureData.env.PASSPORT_RECOGNITION_SIGNING_JWK=JSON.stringify(withoutKid);
  fixtureData.env.PASSPORT_RECOGNITION_SIGNING_KID='configured-key';
  delete fixtureData.env.PASSPORT_RECOGNITION_PAIRWISE_SECRET;
  const healthy=createRecognitionHandler(fixtureData.runtime);
  assert.equal((await healthy(request({action:'status'}))).status,200);
  const proposal=fixtureData.calls.find(call=>call.path.endsWith('/passport_recognition_signing_material_v1'));
  assert.equal(proposal.body.p_signing_jwk.kid,'configured-key');
  assert.equal(proposal.body.p_signing_jwk.alg,'ES256');
  fixtureData.calls.length=0;
  fixtureData.env.PASSPORT_RECOGNITION_SIGNING_JWK=JSON.stringify({...withoutKid,crv:'P-384'});
  const invalid=createRecognitionHandler(fixtureData.runtime);
  const status=await(await invalid(request({action:'status'}))).json();
  assert.equal(status.readiness.configured,false);
  assert.equal(fixtureData.calls.some(call=>call.path.endsWith('/passport_recognition_signing_material_v1')),false);
});

test('member authentication rechecks the live Supabase session after validating JWT with Auth',async()=>{
  const token='e30.'+btoa(JSON.stringify({session_id:SESSION})).replace(/=+$/,'')+'.signature';
  let active=true;
  const runtime=passportRuntime(name=>({SUPABASE_URL:BASE,SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture',SUPABASE_ANON_KEY:'public-fixture'})[name],async url=>url.endsWith('/auth/v1/user')?Response.json({id:USER}):Response.json(active));
  const requestValue=new Request(APP,{headers:{Authorization:'Bearer '+token}});
  assert.deepEqual(await runtime.authenticate(requestValue),{userId:USER,sessionId:SESSION});
  active=false;await assert.rejects(runtime.authenticate(requestValue),error=>error.status===401);
});

test('QR issuance passes only a token hash into one authenticated transactional RPC',async()=>{
  const calls=[],ticketId=crypto.randomUUID(),passportId=crypto.randomUUID();
  const runtime={appURL:APP,authenticate:async()=>({userId:USER,sessionId:SESSION}),api:async(path,body)=>{calls.push({path,body});if(path.endsWith('/passport_ticket_issue_v1'))return{ticket_id:ticketId,passport_public_id:passportId,passport_version:2,passport_state:'active',expires_at:body.p_expires_at};if(path.endsWith('/passport_ticket_revoke_v1'))return body.p_user===USER;throw Error('Unexpected RPC');}};
  const encoded=[];const handler=createPassportTicketIssuer(runtime,url=>{encoded.push(url);return'data:image/png;base64,fixture';});
  const response=await handler(request({action:'issue'}));assert.equal(response.status,200);const result=await response.json();
  const token=new URL(result.verifyUrl).hash.slice('#ticket='.length);
  assert.match(token,/^[0-9a-f]{64}$/);assert.equal(result.ticketId,ticketId);assert.equal(encoded[0],result.verifyUrl);
  assert.equal(calls.length,1);assert.equal(calls[0].body.p_token_hash,await sha256(token));assert.equal(JSON.stringify(calls[0]).includes(token),false);
  assert.equal(calls[0].body.p_session,SESSION);
  assert.equal((await handler(request({action:'revoke',ticketId}))).status,200);
  assert.equal((await handler(request({action:'issue',user_id:crypto.randomUUID()}))).status,400);
});

test('QR verification consumes atomically and cannot confuse founder badge with verified civil identity',async()=>{
  let used=false;
  const verifier=createPassportTicketVerifier({api:async path=>{
    if(path.endsWith('/loyalty_rate'))return true;
    if(used)throw new PassportFailure(400,'Used');used=true;
    return{passport_public_id:crypto.randomUUID(),passport_state:'active',passport_version:2,name:'Public fixture',handle:'fixture',country:'France',public_verified:true,public_title:'Founder',identity_verification_state:'unverified',identity_assurance_level:'account_verified'};
  }});
  const response=await verifier(request({ticket:'a'.repeat(64)}));assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.passport.publicBadgeVerified,true);assert.equal(data.passport.identityVerified,false);assert.equal(data.passport.identityVerifiedAt,null);
  assert.equal(Object.hasOwn(data.passport,'user_id'),false);assert.equal(Object.hasOwn(data.passport,'identity_verification_ref_hash'),false);
  assert.equal((await verifier(request({ticket:'a'.repeat(64)}))).status,400);
});
