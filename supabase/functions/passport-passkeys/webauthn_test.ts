import assert from 'node:assert/strict';
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
import {isoCBOR} from 'npm:@simplewebauthn/server@13.3.3/helpers';
import {encodeBase64url,sha256,validateWebAuthnClient} from '../_shared/passport-security.js';

// Synthetic software authenticator: no account, device, network or civil data is used.
const encoder=new TextEncoder(),origin='https://3b.example',rpID='3b.example';
const join=(...parts:Uint8Array[])=>{const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let n=0;for(const part of parts){result.set(part,n);n+=part.length;}return result;};
const hash=async(value:Uint8Array)=>new Uint8Array(await crypto.subtle.digest('SHA-256',value as BufferSource));
function counter(value:number){const result=new Uint8Array(4);new DataView(result.buffer).setUint32(0,value);return result;}
function der(signature:Uint8Array){
  const integer=(bytes:Uint8Array)=>{let n=0;while(n<bytes.length-1&&bytes[n]===0)n++;let value=bytes.slice(n);if(value[0]&128)value=join(new Uint8Array([0]),value);return join(new Uint8Array([2,value.length]),value);};
  const value=join(integer(signature.slice(0,32)),integer(signature.slice(32)));return join(new Uint8Array([0x30,value.length]),value);
}

Deno.test('real WebAuthn cryptographic verification with pinned SimpleWebAuthn 13.3.3',async t=>{
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const publicKey=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
  const cose=isoCBOR.encode(new Map<number,number|Uint8Array>([[1,2],[3,-7],[-1,1],[-2,publicKey.slice(1,33)],[-3,publicKey.slice(33)]]));
  const credentialBytes=crypto.getRandomValues(new Uint8Array(32)),credentialId=encodeBase64url(credentialBytes);
  const handle=crypto.getRandomValues(new Uint8Array(32));
  const registration=await generateRegistrationOptions({rpName:'3B synthetic test',rpID,userID:handle,userName:'Synthetic member',
    attestationType:'none',supportedAlgorithmIDs:[-7],authenticatorSelection:{residentKey:'required',userVerification:'required'}});
  assert.equal(registration.authenticatorSelection?.userVerification,'required');
  const clientData=encoder.encode(JSON.stringify({type:'webauthn.create',challenge:registration.challenge,origin,crossOrigin:false}));
  const length=new Uint8Array(2);new DataView(length.buffer).setUint16(0,credentialBytes.length);
  const authData=join(await hash(encoder.encode(rpID)),new Uint8Array([0x45]),counter(0),new Uint8Array(16),length,credentialBytes,cose);
  const attestation=isoCBOR.encode(new Map<string,string|Uint8Array|Map<string,string>>([['fmt','none'],['attStmt',new Map<string,string>()],['authData',authData]]));
  const response:any={id:credentialId,rawId:credentialId,type:'public-key',clientExtensionResults:{},response:{
    clientDataJSON:encodeBase64url(clientData),attestationObject:encodeBase64url(attestation),transports:['internal']}};
  const challengeHash=await sha256(registration.challenge);
  const registered=await verifyRegistrationResponse({response,expectedChallenge:async value=>await sha256(value)===challengeHash,
    expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
  assert.equal(registered.verified,true);assert.ok(registered.registrationInfo);
  const credential=registered.registrationInfo.credential;
  await t.step('registration yields the verified COSE public key and UV is required',()=>{
    assert.equal(credential.id,credentialId);assert.deepEqual(credential.publicKey,cose);assert.equal(credential.counter,0);
  });
  await t.step('registration with a different origin is rejected',async()=>{
    await assert.rejects(verifyRegistrationResponse({response,expectedChallenge:registration.challenge,expectedOrigin:'https://evil.example',expectedRPID:rpID,requireUserVerification:true}));
  });
  const options=await generateAuthenticationOptions({rpID,allowCredentials:[{id:credentialId}],userVerification:'required'});
  assert.equal(options.userVerification,'required');
  async function assertion({flags=5,count=1,challenge=options.challenge,source=origin,domain=rpID}={}){
    const data=encoder.encode(JSON.stringify({type:'webauthn.get',challenge,origin:source,crossOrigin:false}));
    const authenticatorData=join(await hash(encoder.encode(domain)),new Uint8Array([flags]),counter(count));
    const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,join(authenticatorData,await hash(data))));
    return {id:credentialId,rawId:credentialId,type:'public-key' as const,clientExtensionResults:{},response:{
      clientDataJSON:encodeBase64url(data),authenticatorData:encodeBase64url(authenticatorData),signature:encodeBase64url(der(signature)),userHandle:encodeBase64url(handle)}};
  }
  const authenticate=(response:any,storedCounter=0)=>verifyAuthenticationResponse({response,expectedChallenge:options.challenge,
    expectedOrigin:origin,expectedRPID:rpID,credential:{...credential,counter:storedCounter},requireUserVerification:true});
  await t.step('a real signed assertion verifies and advances its counter',async()=>{
    const response=await assertion();validateWebAuthnClient(response,origin,Array.from(handle,b=>b.toString(16).padStart(2,'0')).join(''));
    const result=await authenticate(response);assert.equal(result.verified,true);assert.equal(result.authenticationInfo.newCounter,1);
  });
  await t.step('a signed assertion with the wrong challenge is rejected',async()=>{await assert.rejects(authenticate(await assertion({challenge:'wrong-challenge'})));});
  await t.step('a signed assertion with the wrong origin is rejected',async()=>{await assert.rejects(authenticate(await assertion({source:'https://evil.example'})));});
  await t.step('a signed assertion with another RP hash is rejected',async()=>{await assert.rejects(authenticate(await assertion({domain:'evil.example'})));});
  await t.step('a correctly signed assertion without UV is rejected',async()=>{await assert.rejects(authenticate(await assertion({flags:1})));});
  await t.step('a reused signature counter is rejected',async()=>{await assert.rejects(authenticate(await assertion(),1));});
  await t.step('a forged signature is never verified',async()=>{
    const response=await assertion();response.response.signature=encodeBase64url(new Uint8Array(72).fill(1));
    let verified=false;try {verified=(await authenticate(response)).verified;}catch(error){assert.ok(error instanceof Error);}
    assert.equal(verified,false);
  });
});
