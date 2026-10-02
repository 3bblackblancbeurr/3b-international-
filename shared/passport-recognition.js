// Private 3B recognition profile v1. This is a JWS/JWT, not a W3C VC or OIDC service.
export const RECOGNITION_SCOPES = Object.freeze(['passport.basic', 'identity.verified', 'profile.public', 'access.entitlements']);
export const PROOF_TTL_SECONDS = 300;
export const PROOF_TYPE = '3B-Recognition+jwt';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal:true});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
export const isUUID = value => typeof value === 'string' && UUID.test(value);
export const isNonce = value => typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);

export function httpsURL(value) {
  if(typeof value !== 'string' || value.length > 2048 || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash ? value : null;
  } catch { return null; }
}

export function base64url(bytes) {
  let binary='';
  for(const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export function decodeBase64url(value) {
  if(typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw Error('Invalid encoding');
  const binary = atob(value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-value.length%4)%4));
  const bytes = Uint8Array.from(binary, letter=>letter.charCodeAt(0));
  if(base64url(bytes) !== value) throw Error('Noncanonical encoding');
  return bytes;
}

export const randomSecret = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export const sha256 = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))), byte=>byte.toString(16).padStart(2,'0')).join('');

export function scopesFor(value) {
  if(!Array.isArray(value) || value.length<1 || value.length>4 || new Set(value).size!==value.length || value.some(scope=>!RECOGNITION_SCOPES.includes(scope))) throw Error('Invalid scopes');
  return [...value].sort();
}

export async function pairwiseSubject(secret, partnerId, userId) {
  if(typeof secret !== 'string' || secret.length<32 || !isUUID(partnerId) || !isUUID(userId)) throw Error('Invalid subject configuration');
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return '3b_'+base64url(await crypto.subtle.sign('HMAC',key,encoder.encode(`3b-recognition-v1\0${partnerId}\0${userId}`)));
}

export async function generateSigningJWK() {
  const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',keys.privateKey);
  return {...jwk,kid:'3b-es256-'+randomSecret().slice(0,16),alg:'ES256',use:'sig'};
}

export async function loadSigningKey(input, selectedKid) {
  const jwk=typeof input==='string'?JSON.parse(input):input;
  const kid=selectedKid || jwk?.kid;
  if(!jwk || jwk.kty!=='EC' || jwk.crv!=='P-256' || (jwk.alg && jwk.alg!=='ES256') || (jwk.use && jwk.use!=='sig') || !/^[A-Za-z0-9._-]{1,64}$/.test(kid||'')) throw Error('Invalid signing configuration');
  for(const field of ['x','y','d']) if(decodeBase64url(jwk[field]).length!==32) throw Error('Invalid signing key');
  const publicJWK={kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y,kid,alg:'ES256',use:'sig',key_ops:['verify']};
  const signingKey=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y,d:jwk.d,ext:false,key_ops:['sign']},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const verificationKey=await crypto.subtle.importKey('jwk',publicJWK,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const challenge=encoder.encode('3B recognition key consistency v1');
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signingKey,challenge);
  if(new Uint8Array(signature).length!==64 || !await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verificationKey,signature,challenge)) throw Error('Inconsistent key material');
  return {kid,signingKey,verificationKey,publicJWK};
}

export function validatePayload(payload, {issuer,audience,now=Math.floor(Date.now()/1000)}={}) {
  const keys=['v','iss','aud','sub','jti','iat','exp','nonce_hash','scopes','claims'];
  if(!payload || typeof payload!=='object' || Array.isArray(payload) || Object.keys(payload).length!==keys.length || Object.keys(payload).some(key=>!keys.includes(key))) throw Error('Invalid proof profile');
  if(payload.v!==1 || !httpsURL(payload.iss) || !httpsURL(payload.aud) || (issuer && payload.iss!==issuer) || (audience && payload.aud!==audience)) throw Error('Invalid issuer or audience');
  if(!/^3b_[A-Za-z0-9_-]{43}$/.test(payload.sub||'') || !isUUID(payload.jti) || !HASH.test(payload.nonce_hash||'')) throw Error('Invalid proof binding');
  if(!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.iat>now || payload.exp<=now || payload.exp<=payload.iat || payload.exp-payload.iat>PROOF_TTL_SECONDS) throw Error('Invalid proof validity');
  const scopes=scopesFor(payload.scopes);
  const allowed=[];
  if(scopes.includes('passport.basic')) allowed.push('passport_active','passport_version');
  if(scopes.includes('identity.verified')) allowed.push('identity_verified');
  if(scopes.includes('profile.public')) allowed.push('public_handle','display_name');
  if(scopes.includes('access.entitlements')) allowed.push('entitlements');
  const claims=payload.claims;
  if(!claims || typeof claims!=='object' || Array.isArray(claims) || Object.keys(claims).length!==allowed.length || Object.keys(claims).some(key=>!allowed.includes(key))) throw Error('Unexpected claim disclosure');
  if(scopes.includes('passport.basic') && (claims.passport_active!==true || !Number.isInteger(claims.passport_version) || claims.passport_version<1)) throw Error('Invalid passport claim');
  if(scopes.includes('identity.verified') && claims.identity_verified!==true) throw Error('Invalid identity claim');
  if(scopes.includes('profile.public') && (typeof claims.public_handle!=='string' || claims.public_handle.length>32 || typeof claims.display_name!=='string' || claims.display_name.length>80)) throw Error('Invalid public profile');
  if(scopes.includes('access.entitlements') && (!Array.isArray(claims.entitlements) || claims.entitlements.length>128 || claims.entitlements.some(code=>typeof code!=='string' || !/^(digital|plan):[A-Za-z0-9._:-]{1,96}$/.test(code)) || new Set(claims.entitlements).size!==claims.entitlements.length)) throw Error('Invalid entitlement claims');
  return payload;
}

export async function signProof(payload, material, policy={}) {
  validatePayload(payload,policy);
  const header=base64url(encoder.encode(JSON.stringify({alg:'ES256',typ:PROOF_TYPE,kid:material.kid})));
  const content=base64url(encoder.encode(JSON.stringify(payload)));
  const signed=`${header}.${content}`;
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},material.signingKey,encoder.encode(signed));
  if(new Uint8Array(signature).length!==64) throw Error('Invalid signature format');
  return `${signed}.${base64url(signature)}`;
}

export async function verifyProof(proof, material, policy={}) {
  if(typeof proof!=='string' || proof.length>16384) throw Error('Invalid proof');
  const parts=proof.split('.');
  if(parts.length!==3) throw Error('Invalid proof');
  const header=JSON.parse(decoder.decode(decodeBase64url(parts[0])));
  if(!header || Object.keys(header).length!==3 || header.alg!=='ES256' || header.typ!==PROOF_TYPE || header.kid!==material.kid) throw Error('Invalid proof header');
  const signature=decodeBase64url(parts[2]);
  if(signature.length!==64 || !await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},material.verificationKey,signature,encoder.encode(`${parts[0]}.${parts[1]}`))) throw Error('Invalid signature');
  return validatePayload(JSON.parse(decoder.decode(decodeBase64url(parts[1]))),policy);
}
