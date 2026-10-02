import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  evaluateIdentityActivation,
  evaluateRecognitionConfiguration,
  buildPassportReadinessReport,
} from '../scripts/verify-passport-acceptance-readiness.mjs';

const find=(checks,id)=>checks.find(item=>item.id===id);
const idnowValues=()=>({
  PASSPORT_IDENTITY_VERIFICATION_ENABLED:'true',
  PASSPORT_IDENTITY_PROVIDER:'idnow',
  IDNOW_PHYSICAL_ENV:'production',IDNOW_LOGICAL_ENV:'live',
  IDNOW_CLIENT_ID:'test-client-id',IDNOW_CLIENT_SECRET:'synthetic-idnow-secret',
  IDNOW_FLOW_ID:'test-flow-identifier',
  IDNOW_WEBHOOK_AUDIENCE:'https://example.test/functions/v1/passport-idv',
  IDNOW_PVID_FLOW_APPROVED:'true',
  PASSPORT_IDENTITY_REFERENCE_SECRET:'synthetic-reference-secret-for-test-only',
  MEMBER_CAPTCHA_REQUIRED:'true',
  PASSPORT_LEAKED_PASSWORD_PROTECTION_CONFIRMED:'true',
  PASSPORT_IDENTITY_LEGAL_REVIEW_APPROVED:'true',
  PASSPORT_IDENTITY_RETENTION_POLICY_APPROVED:'true',
  PASSPORT_IDENTITY_MINORS_POLICY_APPROVED:'true',
  PASSPORT_IDENTITY_SANDBOX_E2E_APPROVED:'true',
});
const recognitionValues=()=>{
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk={...privateKey.export({format:'jwk'}),alg:'ES256',kid:'test-key-1'};
  return {
    PASSPORT_RECOGNITION_ENABLED:'true',
    PASSPORT_RECOGNITION_ISSUER:'https://example.test/issuer',
    PASSPORT_RECOGNITION_SIGNING_JWK:JSON.stringify(jwk),
    PASSPORT_RECOGNITION_PAIRWISE_SECRET:'synthetic-pairwise-secret-for-test-only',
  };
};

test('IDnow readiness accepts the real OAuth/flow/audience contract without generic secrets',()=>{
  const values=idnowValues();
  const checks=evaluateIdentityActivation(values);
  assert.equal(checks.every(item=>item.ok),true);
  assert.equal(checks.some(item=>item.id==='provider_api_key_present'||item.id==='provider_webhook_secret_present'),false);
});

test('generic API key and webhook secret cannot satisfy an unconfigured IDnow adapter',()=>{
  const checks=evaluateIdentityActivation({
    PASSPORT_IDENTITY_VERIFICATION_ENABLED:'true',PASSPORT_IDENTITY_PROVIDER:'idnow',
    PASSPORT_IDENTITY_PROVIDER_API_KEY:'unused-generic-key-for-test',
    PASSPORT_IDENTITY_PROVIDER_WEBHOOK_SECRET:'unused-generic-webhook-secret-for-test',
  });
  for(const id of ['idnow_client_id_present','idnow_client_secret_present','idnow_flow_id_present','idnow_webhook_audience_valid'])assert.equal(find(checks,id).ok,false,id);
});

test('identity activation retains every production/privacy safeguard independently',()=>{
  const names={
    MEMBER_CAPTCHA_REQUIRED:'captcha_required',
    PASSPORT_LEAKED_PASSWORD_PROTECTION_CONFIRMED:'leaked_password_protection_confirmed',
    PASSPORT_IDENTITY_LEGAL_REVIEW_APPROVED:'legal_review_approved',
    PASSPORT_IDENTITY_RETENTION_POLICY_APPROVED:'retention_policy_approved',
    PASSPORT_IDENTITY_MINORS_POLICY_APPROVED:'minors_policy_approved',
    PASSPORT_IDENTITY_SANDBOX_E2E_APPROVED:'sandbox_e2e_approved',
    IDNOW_PVID_FLOW_APPROVED:'idnow_flow_approved',
  };
  for(const [name,id] of Object.entries(names)){
    const checks=evaluateIdentityActivation({...idnowValues(),[name]:'false'});
    assert.equal(find(checks,id).ok,false,id);
    assert.equal(checks.every(item=>item.ok),false,id);
  }
});

test('unsupported providers, invalid environments and unsafe callback audiences fail closed',()=>{
  const cases=[
    ['PASSPORT_IDENTITY_PROVIDER','unknown','provider_selected'],
    ['IDNOW_PHYSICAL_ENV','local','idnow_physical_environment_valid'],
    ['IDNOW_LOGICAL_ENV','test','idnow_logical_environment_valid'],
    ['IDNOW_WEBHOOK_AUDIENCE','http://example.test/callback','idnow_webhook_audience_valid'],
    ['IDNOW_WEBHOOK_AUDIENCE','https://example.test/callback#token','idnow_webhook_audience_valid'],
    ['IDNOW_WEBHOOK_AUDIENCE','https://user:password@example.test/callback','idnow_webhook_audience_valid'],
  ];
  for(const [name,value,id] of cases)assert.equal(find(evaluateIdentityActivation({...idnowValues(),[name]:value}),id).ok,false,id);
});

test('a configured IDnow sandbox cannot be declared external production identity activation',()=>{
  const values={...idnowValues(),IDNOW_PHYSICAL_ENV:'sandbox',IDNOW_LOGICAL_ENV:'staging'};
  const checks=evaluateIdentityActivation(values);
  assert.equal(find(checks,'idnow_physical_environment_valid').ok,true);
  assert.equal(find(checks,'idnow_logical_environment_valid').ok,true);
  assert.equal(find(checks,'idnow_external_environment_live').ok,false);
  assert.equal(buildPassportReadinessReport('activation',values).externalActivationReady,false);
});

test('foundation readiness is independent of absent identity activation credentials',()=>{
  const foundation=buildPassportReadinessReport('foundation',{});
  const activation=buildPassportReadinessReport('activation',{});
  assert.equal(activation.foundationReady,foundation.foundationReady);
  assert.equal(activation.externalActivationReady,false);
  assert.equal(activation.ok,false);
});

test('recognition validates a real ES256 signing key and JWK kid fallback',()=>{
  const checks=evaluateRecognitionConfiguration(recognitionValues());
  assert.equal(checks.every(item=>item.ok),true);
});

test('recognition rejects public-only, inconsistent or wrong-curve signing material',()=>{
  const values=recognitionValues(),jwk=JSON.parse(values.PASSPORT_RECOGNITION_SIGNING_JWK);
  const {privateKey:other}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const noncanonicalD=jwk.d.slice(0,-1)+alphabet[alphabet.indexOf(jwk.d.at(-1))|1];
  const badKeys=[
    {kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y,kid:jwk.kid},
    {...jwk,d:other.export({format:'jwk'}).d},
    {...jwk,crv:'P-384'},
    {...jwk,alg:'HS256'},
    {...jwk,use:'enc'},
    {...jwk,d:noncanonicalD},
  ];
  for(const bad of badKeys){
    const checks=evaluateRecognitionConfiguration({...values,PASSPORT_RECOGNITION_SIGNING_JWK:JSON.stringify(bad)});
    assert.equal(find(checks,'recognition_signing_key_valid').ok,false);
  }
});

test('recognition issuer and kid are exact and explicit disablement is respected',()=>{
  const values=recognitionValues();
  assert.equal(find(evaluateRecognitionConfiguration({...values,PASSPORT_RECOGNITION_ENABLED:'false'}),'recognition_explicitly_enabled').ok,false);
  assert.equal(find(evaluateRecognitionConfiguration({...values,PASSPORT_RECOGNITION_ISSUER:'https://example.test/issuer?other=1'}),'recognition_issuer_valid').ok,false);
  assert.equal(find(evaluateRecognitionConfiguration({...values,PASSPORT_RECOGNITION_ISSUER:' https://example.test/issuer'}),'recognition_issuer_valid').ok,false);
  assert.equal(find(evaluateRecognitionConfiguration({...values,PASSPORT_RECOGNITION_SIGNING_KID:'../../../key'}),'recognition_signing_kid_valid').ok,false);
  assert.equal(find(evaluateRecognitionConfiguration({...values,PASSPORT_RECOGNITION_SIGNING_KID:' test-key-1 '}),'recognition_signing_kid_valid').ok,false);
  assert.equal(find(evaluateRecognitionConfiguration({...values,PASSPORT_RECOGNITION_ISSUER:''}),'recognition_issuer_valid').ok,true);
});

test('configured signing cannot falsely establish deployed partner acceptance or official recognition',()=>{
  const values=recognitionValues();
  const report=buildPassportReadinessReport('recognition',values);
  assert.equal(report.recognition.configurationReady,true);
  assert.equal(report.recognition.signingConfigured,true);
  assert.equal(report.recognition.runtimeSigningReady,null);
  assert.equal(report.recognition.partnersReady,null);
  assert.equal(report.recognition.externalAcceptanceConfirmed,false);
  assert.equal(report.externalActivationReady,false);
});

test('the implemented service-only Vault path is deferred rather than asserted as deployed readiness',()=>{
  const report=buildPassportReadinessReport('recognition',{});
  assert.equal(report.recognition.vaultFallbackImplemented,true);
  assert.equal(report.recognition.partnerRegistrySchemaReady,true);
  assert.equal(report.recognition.configurationReady,null);
  assert.equal(report.recognition.runtimeSigningReady,null);
  assert.equal(report.recognition.partnersReady,null);
  for(const id of ['recognition_explicitly_enabled','recognition_signing_key_valid','recognition_signing_kid_valid','recognition_pairwise_secret_present']){
    const check=find(report.checks,id);
    assert.equal(check.ok,true,id);
    assert.equal(check.deferredToRuntime,true,id);
  }
});

test('Vault deferral cannot override explicit disablement or invalid supplied key material',()=>{
  const disabled=buildPassportReadinessReport('recognition',{PASSPORT_RECOGNITION_ENABLED:'false'});
  assert.equal(find(disabled.checks,'recognition_explicitly_enabled').ok,false);
  assert.equal(disabled.recognition.configurationReady,false);
  const invalid=buildPassportReadinessReport('recognition',{PASSPORT_RECOGNITION_ENABLED:'true',PASSPORT_RECOGNITION_SIGNING_JWK:'not-json'});
  assert.equal(find(invalid.checks,'recognition_signing_key_valid').ok,false);
  assert.equal(find(invalid.checks,'recognition_signing_kid_valid').ok,false);
  assert.equal(invalid.recognition.configurationReady,false);
  const emptyLooking=buildPassportReadinessReport('recognition',{PASSPORT_RECOGNITION_SIGNING_KID:' ',PASSPORT_RECOGNITION_SIGNING_JWK:' '});
  assert.equal(find(emptyLooking.checks,'recognition_signing_key_valid').ok,false);
  assert.equal(find(emptyLooking.checks,'recognition_signing_kid_valid').ok,false);
});

test('readiness reports never print signing keys, provider credentials or pairwise secrets',()=>{
  const values={...idnowValues(),...recognitionValues()};
  const serialized=JSON.stringify({identity:evaluateIdentityActivation(values),recognition:buildPassportReadinessReport('recognition',values)});
  for(const name of ['IDNOW_CLIENT_SECRET','PASSPORT_IDENTITY_REFERENCE_SECRET','PASSPORT_RECOGNITION_SIGNING_JWK','PASSPORT_RECOGNITION_PAIRWISE_SECRET'])assert.equal(serialized.includes(values[name]),false,name);
  assert.equal(serialized.includes(JSON.parse(values.PASSPORT_RECOGNITION_SIGNING_JWK).d),false);
});

test('example declares each IDnow setting once and no phantom generic provider secrets',()=>{
  const env=readFileSync(new URL('../.env.example',import.meta.url),'utf8');
  for(const name of Object.keys(idnowValues()))assert.equal((env.match(new RegExp('^'+name+'=','gm'))||[]).length,1,name);
  assert.doesNotMatch(env,/^PASSPORT_IDENTITY_PROVIDER_(API_KEY|WEBHOOK_SECRET)=/m);
  assert.match(env,/^PASSPORT_RECOGNITION_ENABLED=false$/m);
});
