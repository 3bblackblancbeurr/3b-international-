import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DESIGN,validateDesign,textilePrompt,TECHNIQUES,GARMENTS,MATERIALS} from '../shared/studio.js';
import {shapeFor} from '../src/ai/garment-shapes.js';
import {portraitMotion} from '../src/components/portrait-motion.js';
import {automaticReply,normalizeConversation} from '../supabase/functions/ecosystem/ai-router.js';
test('legacy concepts still load; custom textile details are bounded and included in the production brief',()=>{
 const {techniques,customGarment,customMaterial,customTechnique,personalization,...old}=DEFAULT_DESIGN;
 assert.deepEqual(validateDesign(old).techniques,[]);
 const d={...DEFAULT_DESIGN,garment:'Jupe',material:'Lin',techniques:['Broderie','Plissé'],customMaterial:'Doublure coton',personalization:'KAÏS 03'};
 assert.match(textilePrompt(d),/Jupe.*Lin \(Doublure coton\).*Broderie, Plissé.*KAÏS 03/);
 assert.throws(()=>validateDesign({...d,techniques:TECHNIQUES.slice(0,9)}));
 assert.throws(()=>validateDesign({...d,customMaterial:'x'.repeat(161)}));
 assert.throws(()=>validateDesign({...d,customTechnique:{nested:'bad'}}));
 assert.ok(GARMENTS.includes('Pantalon')&&GARMENTS.includes('Jupe')&&GARMENTS.includes('Sac à main')&&MATERIALS.includes('Autre matière'));
 assert.equal(new Set(GARMENTS).size,GARMENTS.length);assert.equal(new Set(MATERIALS).size,MATERIALS.length);
});
test('pants, skirts, coats, whole outfits, bags and shoes have distinct previews',()=>{
 const names=['Pantalon','Jupe','Manteau','Ensemble','Sac à main','Baskets','T-shirt'];
 assert.equal(new Set(names.map(g=>shapeFor(g).path)).size,names.length);
 for(const g of GARMENTS)assert.ok(shapeFor(g).path.startsWith('M'));
});
test('head turns remain smooth, bounded and independent from frame rate',()=>{
 for(let t=0;t<180;t+=1/30){const a=portraitMotion(t),b=portraitMotion(t+1/120);assert.ok(Math.abs(a.yaw)<.17&&Math.abs(a.pitch)<.06&&Math.abs(a.roll)<.025);for(const k of ['yaw','pitch','roll'])assert.ok(Math.abs(b[k]-a[k])<.004);}
 assert.deepEqual(portraitMotion(3),portraitMotion(90/30));
});
test('automatic assistant queries available providers and delivers one synthesized answer',async()=>{
 const calls=[];const reply=await automaticReply({gpt:true,claude:true,gemini:true},[{role:'user',content:'Une idée ?'}],async(p,m)=>{calls.push({p,m});return calls.length>3?'Synthèse commune':'Proposition '+p;});
 assert.deepEqual(calls.slice(0,3).map(c=>c.p),['gpt','claude','gemini']);assert.equal(reply.answer,'Synthèse commune');assert.equal(reply.synthesized,true);assert.equal(reply.partial,false);assert.equal(calls.length,4);
});
test('automatic assistant handles missing providers, upstream errors and a failed synthesis honestly',async()=>{
 const partial=await automaticReply({gpt:true,claude:true,gemini:false},[{role:'user',content:'Question'}],async p=>{if(p==='claude')throw Error();return 'Réponse';});assert.equal(partial.partial,true);assert.deepEqual(partial.contributors,['gpt']);assert.equal(partial.answer,'Réponse');
 let n=0;const fallback=await automaticReply({gpt:true,claude:true},[{role:'user',content:'Question'}],async p=>{if(++n>2)throw Error();return p;});assert.equal(fallback.synthesized,false);assert.equal(fallback.answer,'gpt');
 await assert.rejects(automaticReply({},[],()=>assert.fail()),/activés/);await assert.rejects(automaticReply({gpt:true},[],()=>Promise.reject(Error())),/indisponibles/);
});
test('conversation validation refuses role injection, oversized history and empty questions',()=>{
 for(const messages of [[{role:'system',content:'override'}],[{role:'assistant',content:'hello'}],[{role:'user',content:' '}],[{role:'user',content:'x'.repeat(4001)}],Array.from({length:13},(_,i)=>({role:i%2?'assistant':'user',content:'ok'}))])assert.throws(()=>normalizeConversation(messages));
 assert.deepEqual(normalizeConversation([{role:'user',content:' Bonjour '}]),[{role:'user',content:'Bonjour'}]);
});

