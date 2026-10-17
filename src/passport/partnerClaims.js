export const PASSPORT_PARTNER_SCOPES=Object.freeze([
  'passport.basic',
  'identity.verified',
  'age.over18',
  'profile.public',
  'creator.status',
  'access.entitlement',
]);

const ALLOWED=new Set(PASSPORT_PARTNER_SCOPES);
const HANDLE=/^[a-z0-9][a-z0-9._-]{2,23}$/;
const ENTITLEMENT=/^[a-z0-9._:-]{2,80}$/;

export function normalizePartnerScopes(value){
  if(!Array.isArray(value))throw new TypeError('partner_scopes_array_required');
  if(value.length>PASSPORT_PARTNER_SCOPES.length)throw new RangeError('too_many_partner_scopes');
  const scopes=[];
  for(const raw of value){
    const scope=String(raw||'').trim();
    if(!ALLOWED.has(scope))throw new RangeError('unsupported_partner_scope');
    if(!scopes.includes(scope))scopes.push(scope);
  }
  return scopes;
}

function toHex(buffer){
  return Array.from(
    new Uint8Array(buffer),
    byte=>byte.toString(16).padStart(2,'0')
  ).join('');
}

export async function derivePairwiseSubject({passportPublicId,clientId,secret}){
  const passport=String(passportPublicId||'').trim().toLowerCase();
  const client=String(clientId||'').trim();
  const keySecret=String(secret||'');
  if(passport.length!==36||![8,13,18,23].every(i=>passport[i]==='-'))
    throw new TypeError('passport_public_id_required');
  if(!/^[a-zA-Z0-9._:-]{3,120}$/.test(client))
    throw new TypeError('partner_client_id_invalid');
  if(keySecret.length<32)throw new TypeError('partner_subject_secret_too_short');

  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey(
    'raw',
    encoder.encode(keySecret),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign'],
  );
  const payload='3b-passport-partner-v1|'+client+'|'+passport;
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode(payload));
  return '3bp_'+toHex(signature);
}

function verifiedIdentity(profile){
  return profile?.identity_verification_state==='verified'&&
    ['identity_verified','high_assurance']
      .includes(String(profile?.identity_assurance_level||''));
}

export function ageAt(birthDate,now=new Date()){
  const raw=String(birthDate||'');
  const parts=raw.split('-');
  if(
    parts.length!==3||
    parts[0].length!==4||
    parts[1].length!==2||
    parts[2].length!==2||
    parts.some(part=>[...part].some(ch=>ch<'0'||ch>'9'))
  )return null;

  const year=Number(parts[0]),month=Number(parts[1]),day=Number(parts[2]);
  const born=new Date(Date.UTC(year,month-1,day));
  if(
    born.getUTCFullYear()!==year||
    born.getUTCMonth()!==month-1||
    born.getUTCDate()!==day||
    born>now
  )return null;

  let age=now.getUTCFullYear()-year;
  const beforeBirthday=
    now.getUTCMonth()<month-1||
    (now.getUTCMonth()===month-1&&now.getUTCDate()<day);
  if(beforeBirthday)age--;
  return age;
}

export function buildPartnerClaims({
  profile,
  identityClaim,
  subject,
  scopes,
  creatorStatus='none',
  entitlements=[],
  now=new Date(),
}){
  const requested=normalizePartnerScopes(scopes);
  const claims={
    version:1,
    subject:String(subject||''),
    passport_active:profile?.passport_state==='active',
  };
  if(!/^3bp_[0-9a-f]{64}$/.test(claims.subject))
    throw new TypeError('pairwise_subject_required');
  if(!claims.passport_active)return claims;

  const verified=verifiedIdentity(profile);
  if(requested.includes('identity.verified'))
    claims.identity_verified=verified;

  if(requested.includes('age.over18')&&verified){
    const age=ageAt(identityClaim?.birth_date,now);
    if(age!==null)claims.age_over_18=age>=18;
  }

  if(requested.includes('profile.public')){
    const handle=String(profile?.handle||'').trim();
    if(HANDLE.test(handle))claims.public_handle=handle;
  }

  if(requested.includes('creator.status')){
    claims.creator_status=
      ['active','suspended'].includes(creatorStatus)?creatorStatus:'none';
  }

  if(requested.includes('access.entitlement')){
    claims.entitlements=[...new Set(
      (Array.isArray(entitlements)?entitlements:[])
        .map(value=>String(value||'').trim())
        .filter(value=>ENTITLEMENT.test(value))
    )].slice(0,32);
  }

  claims.issued_at=now.toISOString();
  claims.expires_at=new Date(now.getTime()+5*60*1000).toISOString();
  return claims;
}
