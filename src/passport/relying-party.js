import {normalizePassportScopes,requiresExplicitPassportConsent} from './scopes.js';

const HTTPS_ORIGIN=/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i;
const CLIENT_KEY=/^[a-z0-9][a-z0-9._-]{2,80}$/;

export function normalizeRelyingParty(input={}){
 const clientKey=String(input.clientKey||'').trim().toLowerCase();
 const displayName=String(input.displayName||'').trim().slice(0,120);
 const origins=[...new Set((Array.isArray(input.redirectOrigins)?input.redirectOrigins:[])
  .map(value=>String(value||'').trim())
  .filter(value=>HTTPS_ORIGIN.test(value)))].slice(0,8);
 const scopes=normalizePassportScopes(input.allowedScopes);
 const status=['disabled','sandbox','active','revoked'].includes(input.status)?input.status:'disabled';

 if(!CLIENT_KEY.test(clientKey)||displayName.length<2||!origins.length)return null;

 return Object.freeze({
  clientKey,
  displayName,
  redirectOrigins:Object.freeze(origins),
  allowedScopes:Object.freeze(scopes),
  status,
  explicitConsentRequired:requiresExplicitPassportConsent(scopes),
 });
}

export function relyingPartyCanAuthorize(party,redirectOrigin,requestedScopes=[]){
 if(!party||!['sandbox','active'].includes(party.status))return false;
 if(!party.redirectOrigins.includes(String(redirectOrigin||'')))return false;
 const requested=normalizePassportScopes(requestedScopes);
 return requested.every(scope=>party.allowedScopes.includes(scope));
}

export function relyingPartyIsProduction(party){
 return party?.status==='active';
}
