import {PAGE_HASHES} from './navigation.js';
export const ANALYTICS_CONSENT_KEY='3b_analytics_optin_v1';
let sessionBlocked=false;
export function blockAnalyticsForSession(){sessionBlocked=true;}
const LIFETIME=180*86400000;
export const PRIVATE_ANALYTICS_PAGES=new Set(['health','foodscan','admin','member','passport','loyalty','finance','albert','ia-trio','control','religion','news','association','partners','join']);
export function isPrivateAnalyticsContext(page,hash){return PRIVATE_ANALYTICS_PAGES.has(page)||Object.entries(PAGE_HASHES).some(([id,value])=>PRIVATE_ANALYTICS_PAGES.has(id)&&hash==='#'+value);}
export function readAnalyticsConsent(storage,now=Date.now()){
 if(sessionBlocked)return false;
 try{
  const value=JSON.parse(storage.getItem(ANALYTICS_CONSENT_KEY)||'null');
  if(!value||value.version!==1||value.purpose!=='analytics'||typeof value.allowed!=='boolean'||!Number.isSafeInteger(value.updatedAt)||!Number.isSafeInteger(value.expiresAt)||value.updatedAt>now+300000||value.expiresAt<=now||value.expiresAt-value.updatedAt!==LIFETIME)return false;
  return value.allowed;
 }catch{return false;}
}
export function writeAnalyticsConsent(storage,allowed,now=Date.now()){
 if(typeof allowed!=='boolean'||!Number.isSafeInteger(now))throw Error('Choix de confidentialité invalide.');
 if(!allowed)blockAnalyticsForSession();
 storage.setItem(ANALYTICS_CONSENT_KEY,JSON.stringify({version:1,purpose:'analytics',allowed,updatedAt:now,expiresAt:now+LIFETIME}));
 if(allowed)sessionBlocked=false;
 return allowed;
}
export function analyticsPrivacySignal(nav=globalThis.navigator){
 if(!nav)return true;
 const dnt=nav.doNotTrack||globalThis.doNotTrack||nav.msDoNotTrack;
 return nav.globalPrivacyControl===true||dnt==='1'||dnt==='yes';
}
