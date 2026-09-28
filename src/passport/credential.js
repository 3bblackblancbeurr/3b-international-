import {isCivilIdentityVerified} from './assurance.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean=(value,max=96)=>String(value??'').trim().slice(0,max);

export function normalizePassportPublicId(value){
 const id=clean(value,36);
 return UUID.test(id)?id.toUpperCase():null;
}

export function passportNumberFromPublicId(value){
 const id=normalizePassportPublicId(value);
 return id?'3B-PASS-'+id:null;
}

export function createPassportCredentialSubject(identity){
 if(!identity?.userId||!identity?.countryCode)return null;
 const publicId=normalizePassportPublicId(identity.passportPublicId);
 if(!publicId)return null;
 return Object.freeze({
  id:'urn:3b:passport:'+publicId.toLowerCase(),
  passportNumber:passportNumberFromPublicId(publicId),
  memberHandle:clean(identity.handle,24),
  displayName:clean(identity.name,80),
  countryCode:clean(identity.countryCode,3),
  heritageValue:clean(identity.value,32),
  civilIdentityVerified:isCivilIdentityVerified(identity),
  assuranceLevel:clean(identity.identityAssuranceLevel||'account',32),
  ageOver18:identity.ageOver18===true,
  status:clean(identity.passportState,24),
  credentialVersion:Math.max(2,Number(identity.passportVersion)||2),
  issuedAt:identity.passportIssuedAt||null,
 });
}

export function canPresentPassportCredential(subject){
 return Boolean(subject?.id&&subject?.passportNumber&&subject?.status==='active');
}

export function passportCredentialType(){
 return Object.freeze(['VerifiableCredential','ThreeBPassportCredential']);
}
