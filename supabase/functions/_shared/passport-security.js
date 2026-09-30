// Shared, environment-independent rules. No browser value can grant assurance.
const encoder = new TextEncoder();
export const PILOT_SCOPES = Object.freeze(['passport.basic', 'identity.verified']);
export const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const sha256 = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
export async function pairwiseSubject(userId, clientId, secret) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[a-z0-9._:-]{3,96}$/.test(clientId) || secret.length < 32)
    throw new Error('Invalid pairwise configuration');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return '3bp_' + hex(await crypto.subtle.sign('HMAC', key, encoder.encode('3b-partner-v1|' + clientId + '|' + userId)));
}
export function normalizePilotScopes(scopes) {
  if (!Array.isArray(scopes) || !scopes.length || scopes.length > PILOT_SCOPES.length ||
      scopes.some(scope => !PILOT_SCOPES.includes(scope))) throw new Error('Unsupported scopes');
  return [...new Set(scopes)].sort();
}
export function audience(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || value.length > 240)
    throw new Error('Invalid audience');
  return url.href;
}
export function idnowCompletion(result, expected) {
  // A sandbox success never becomes a civil identity proof in production.
  if (result?.sessionId !== expected.sessionId || result?.flowId !== expected.flowId ||
      result?.metadata?.subjectId !== expected.subjectId || result?.environment !== expected.logical ||
      result?.sessionStatus !== 'COMPLETED') throw new Error('Provider result binding mismatch');
  if (result.outcome === 'accepted') return expected.physical === 'production' && expected.logical === 'live' && expected.approved
    ? {state:'verified',code:null} : {state:'error',code:'flow_not_approved'};
  if (result.outcome === 'rejected') return {state:'rejected',code:'provider_rejected'};
  // NO_OUTCOME / unknown schemas must be retried or reviewed, never asserted as verified.
  throw new Error('Provider result has no definitive outcome');
}
export function idnowWebhookEvent(payload, expected) {
  const data=payload?.data,event=data?.payload;
  const statuses={'session.created':'CREATED','session.completed':'COMPLETED','session.aborted':'ABORTED','session.expired':'EXPIRED','session.error':'ERROR'};
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(data?.eventId||'')||payload.sub!==data.eventId||!uuid.test(event?.sessionId||'')||
    !Object.hasOwn(statuses,data?.eventName)||event.sessionStatus!==statuses[data.eventName]||
    data.environment!==expected.logical||event.flowId!==expected.flowId||typeof data.eventVersion!=='string'||
    data.eventVersion.length>24) throw new Error('Provider webhook binding mismatch');
  return {eventId:data.eventId,eventName:data.eventName,eventVersion:data.eventVersion,sessionId:event.sessionId};
}
export function decodeBase64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) throw new Error('Invalid base64url');
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-value.length%4)%4)), c=>c.charCodeAt(0));
}
export function encodeBase64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function validateWebAuthnClient(response, expectedOrigin, expectedHandle) {
  const data=JSON.parse(new TextDecoder().decode(decodeBase64url(response?.response?.clientDataJSON)));
  if(data.crossOrigin===true||(data.topOrigin!==undefined&&data.topOrigin!==expectedOrigin))
    throw new Error('Cross-origin credential not allowed');
  const handle=response?.response?.userHandle;
  if(handle!==null&&handle!==undefined&&hex(decodeBase64url(handle))!==expectedHandle)
    throw new Error('Credential account mismatch');
}
