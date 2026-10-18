import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANALYTICS_CONSENT_KEY,readAnalyticsConsent,writeAnalyticsConsent,isPrivateAnalyticsContext,analyticsPrivacySignal} from '../src/lib/privacy-preferences.js';
const memory=()=>{const map=new Map();return{getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};};
test('analytics consent is absent by default, dated, purpose-bound and expires without renewal',()=>{
 const storage=memory(),now=1800000000000;
 assert.equal(readAnalyticsConsent(storage,now),false);
 storage.setItem(ANALYTICS_CONSENT_KEY,'yes');assert.equal(readAnalyticsConsent(storage,now),false);
 writeAnalyticsConsent(storage,true,now);assert.equal(readAnalyticsConsent(storage,now),true);
 assert.equal(readAnalyticsConsent(storage,now+180*86400000),false);
 assert.equal(readAnalyticsConsent(storage,now-300001),false);
 const record=JSON.parse(storage.getItem(ANALYTICS_CONSENT_KEY));record.purpose='ads';storage.setItem(ANALYTICS_CONSENT_KEY,JSON.stringify(record));assert.equal(readAnalyticsConsent(storage,now),false);
});
test('refusal is effective in memory even if the browser cannot persist it',()=>{
 const storage=memory(),now=1800000000000;writeAnalyticsConsent(storage,true,now);
 storage.setItem=()=>{throw Error('quota');};assert.throws(()=>writeAnalyticsConsent(storage,false,now));assert.equal(readAnalyticsConsent(storage,now),false);
 const next=memory();writeAnalyticsConsent(next,true,now);assert.equal(readAnalyticsConsent(next,now),true);
 writeAnalyticsConsent(next,false,now);assert.equal(readAnalyticsConsent(next,now),false);
});
test('sensitive contexts cannot emit app-open or route analytics even through a direct hash',()=>{
 for(const [page,hash] of [['health','#sante'],['admin','#administration-3b'],['albert','#albert-3b'],['member','#membre'],['religion','#religion'],['finance','#banque-crypto'],['news','#informations-actuelles']]){
  assert.equal(isPrivateAnalyticsContext(page,''),true);assert.equal(isPrivateAnalyticsContext(undefined,hash),true);
 }
 assert.equal(isPrivateAnalyticsContext('home','#accueil'),false);
 assert.equal(analyticsPrivacySignal({doNotTrack:'1'}),true);assert.equal(analyticsPrivacySignal({globalPrivacyControl:true}),true);assert.equal(analyticsPrivacySignal({}),false);
});
test('enabled analytics fails closed when the browser blocks the localStorage getter',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),previousFetch=globalThis.fetch;
 const source=readFileSync(new URL('../src/lib/analytics.js',import.meta.url),'utf8').replace("'./privacy-preferences.js'",JSON.stringify(new URL('../src/lib/privacy-preferences.js',import.meta.url).href)).replaceAll('import.meta.env',"({VITE_POSTHOG_ENABLED:'true'})");
 let calls=0;
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{hash:'#accueil'},get localStorage(){throw new DOMException('Stockage bloqué','SecurityError');}}});
  globalThis.fetch=()=>{calls++;throw Error('Unexpected analytics request');};
  const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  assert.equal(module.captureAppOpen(),false);assert.equal(module.captureRouteView({page:'home'}),false);assert.equal(calls,0);
 }finally{if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;globalThis.fetch=previousFetch;}
});
