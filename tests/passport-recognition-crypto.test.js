import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createPublicKey,verify as nodeVerify} from 'node:crypto';
import {generateSigningJWK,loadSigningKey,pairwiseSubject,randomSecret,sha256,signProof,verifyProof,base64url,decodeBase64url,httpsURL,scopesFor} from '../shared/passport-recognition.js';
globalThis.crypto??=webcrypto;

const ISSUER='https://3b-international.vercel.app',AUDIENCE='https://partner.example/3b';
const USER='c21a3f85-a5c8-4f4a-a412-09c6d5bc1fe1',PARTNER='9929f283-0ad7-45bc-8c11-1b6014d069e3';
async function fixture(){
  const jwk=await generateSigningJWK(),material=await loadSigningKey(jwk);
  const now=Math.floor(Date.now()/1000);
  return{jwk,material,payload:{v:1,iss:ISSUER,aud:AUDIENCE,sub:await pairwiseSubject(randomSecret(),PARTNER,USER),jti:crypto.randomUUID(),iat:now,exp:now+300,nonce_hash:await sha256(randomSecret()),scopes:['passport.basic'],claims:{passport_active:true,passport_version:2}}};
}

test('ES256 proof verifies with an independently imported public JWK and exposes no private key',async()=>{
  const {jwk,material,payload}=await fixture();
  const proof=await signProof(payload,material,{issuer:ISSUER});
  assert.deepEqual(await verifyProof(proof,material,{issuer:ISSUER,audience:AUDIENCE}),payload);
  const [header,content,signature]=proof.split('.');
  const imported=await crypto.subtle.importKey('jwk',material.publicJWK,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},imported,decodeBase64url(signature),new TextEncoder().encode(header+'.'+content)),true);
  const independent=createPublicKey({key:material.publicJWK,format:'jwk'});
  assert.equal(nodeVerify('sha256',Buffer.from(header+'.'+content),{key:independent,dsaEncoding:'ieee-p1363'},Buffer.from(decodeBase64url(signature))),true);
  assert.equal(decodeBase64url(signature).length,64);
  assert.equal(Object.hasOwn(material.publicJWK,'d'),false);
  assert.equal(JSON.stringify(material.publicJWK).includes(jwk.d),false);
  assert.equal(content.includes(USER),false);
  assert.deepEqual(material.publicJWK.key_ops,['verify']);
});

test('tampering, wrong audience/issuer and a different trusted key are rejected cryptographically',async()=>{
  const {material,payload}=await fixture(),proof=await signProof(payload,material);
  const [header,content,signature]=proof.split('.');
  const altered=base64url(new TextEncoder().encode(JSON.stringify({...payload,claims:{passport_active:true,passport_version:999}})));
  await assert.rejects(verifyProof(header+'.'+altered+'.'+signature,material));
  const changedSignature=signature.slice(0,10)+(signature[10]==='A'?'B':'A')+signature.slice(11);
  await assert.rejects(verifyProof(header+'.'+content+'.'+changedSignature,material));
  await assert.rejects(verifyProof(proof,material,{audience:'https://other.example'}));
  await assert.rejects(verifyProof(proof,material,{issuer:'https://fake.example'}));
  const wrong=await loadSigningKey({...await generateSigningJWK(),kid:material.kid});
  await assert.rejects(verifyProof(proof,wrong));
});

test('algorithm substitution, token-supplied key URLs and unknown key ids are refused',async()=>{
  const {material,payload}=await fixture(),proof=await signProof(payload,material);
  const [,content,signature]=proof.split('.');
  for(const header of [{alg:'none',typ:'3B-Recognition+jwt',kid:material.kid},{alg:'HS256',typ:'3B-Recognition+jwt',kid:material.kid},{alg:'ES256',typ:'3B-Recognition+jwt',kid:'untrusted'},{alg:'ES256',typ:'3B-Recognition+jwt',kid:material.kid,jku:'https://evil.example/key'}]){
    await assert.rejects(verifyProof(base64url(new TextEncoder().encode(JSON.stringify(header)))+'.'+content+'.'+signature,material));
  }
});

test('expiration, future issuance, excessive lifetime and excess claims cannot be signed',async()=>{
  const {material,payload}=await fixture();
  for(const variant of [{...payload,exp:payload.iat},{...payload,iat:payload.iat+600,exp:payload.iat+900},{...payload,exp:payload.iat+301},{...payload,claims:{...payload.claims,legal_family_name:'Private'}},{...payload,scopes:['identity.verified'],claims:{identity_verified:false}},{...payload,scopes:['age.over18'],claims:{age_over18:true}}])await assert.rejects(signProof(variant,material));
  const proof=await signProof(payload,material);
  await assert.rejects(verifyProof(proof,material,{now:payload.exp}));
  assert.deepEqual(await verifyProof(proof,material,{now:payload.exp-1}),payload);
});

test('pairwise pseudonyms are stable for one partner and distinct for different partners/members',async()=>{
  const secret=randomSecret(),subject=await pairwiseSubject(secret,PARTNER,USER);
  assert.equal(subject,await pairwiseSubject(secret,PARTNER,USER));
  assert.notEqual(subject,await pairwiseSubject(secret,'bcf0a825-bb7f-4d70-8219-8651e1024e79',USER));
  assert.notEqual(subject,await pairwiseSubject(secret,PARTNER,'b9cbf688-e145-4c44-a099-6a8c826dba20'));
  assert.match(subject,/^3b_[A-Za-z0-9_-]{43}$/);
  assert.equal(subject.includes(USER),false);
});

test('malformed keys, HTTP/credentialed/whitespace URLs and duplicate scopes fail closed',async()=>{
  const {jwk}=await fixture();
  await assert.rejects(loadSigningKey({...jwk,crv:'P-384'}));
  await assert.rejects(loadSigningKey({...jwk,d:undefined}));
  await assert.rejects(loadSigningKey({...jwk,alg:'HS256'}));
  for(const value of ['http://partner.example','https://name:secret@partner.example',' https://partner.example','https://partner.example/a b','https://partner.example?x=1','https://partner.example#fragment'])assert.equal(httpsURL(value),null);
  assert.throws(()=>scopesFor(['passport.basic','passport.basic']));
  assert.throws(()=>scopesFor(['*']));
});
