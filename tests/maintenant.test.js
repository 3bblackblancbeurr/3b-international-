import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_HASHES,readLocation,getPageHref} from '../src/lib/navigation.js';
import {itemsForCategory,searchNavigation} from '../src/components/navigation-menu.js';
import {
 EXPERIENCES,VALUES,GOALS,HELP_IDEAS,MINUTES,
 JOURNEY_STORAGE_KEY,READ_STORAGE_KEY,normalizeJourney,normalizeReadMode,
 journeyFor,circleProgress,nextValueState,safeParseStorage,safeWriteStorage
} from '../src/maintenant/model.js';
import {applyReadMode} from '../src/maintenant/accessibility.js';
import {
 HERITAGE_VAULT_KEY,HERITAGE_ITERATIONS,
 createHeritageVault,openHeritageVault,sealHeritage,validateHeritageEnvelope,validateHeritageEntries
} from '../src/maintenant/heritage-vault.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('the six experiences are distinct and lead to existing real 3B routes',()=>{
 assert.deepEqual(EXPERIENCES.map(x=>x.id),['boussole','cercle','coup','scanner','heritage','universel']);
 assert.equal(new Set(GOALS.map(x=>x.id)).size,6);
 assert.deepEqual(MINUTES,[15,30,60]);
 for(const goal of GOALS) {
  assert.ok(PAGE_HASHES[goal.route],goal.id);
  assert.equal(goal.steps.length,3);
  assert.ok(goal.steps.every(step=>step.title&&step.detail));
 }
 assert.equal(HELP_IDEAS.length,3);
 assert.ok(PAGE_HASHES.maintenant==='maintenant');
 const href=new URL(getPageHref('maintenant',new URL('https://3b.example/#accueil')),'https://3b.example');
 assert.equal(readLocation(href).page,'maintenant');
 const list=[{id:'maintenant',label:'3B Maintenant',description:'Six expériences'}];
 assert.equal(itemsForCategory(list,'principal').filter(x=>x.id==='maintenant').length,1);
 assert.equal(searchNavigation(list,'maintenant')[0].id,'maintenant');
});
test('canon 3B keeps countries and guardians coherent and self-reported values stay local',()=>{
 assert.deepEqual(VALUES.map(x=>x.country),['France','Algérie','Maroc','Tunisie','Espagne','Italie','Turquie','Estonie']);
 assert.deepEqual(VALUES.map(x=>x.guardian),['Céliane','Yliane','Naël','Soraya','Diego','Alessio','Émir','Eira']);
 assert.equal(new Set(VALUES.map(x=>x.id)).size,8);
 const start=normalizeJourney({goal:'aider',minutes:15,intensity:'calme'});
 assert.equal(circleProgress(start),0);
 const one=nextValueState(start,'justice');
 assert.equal(circleProgress(one),1);
 assert.equal(one.values.justice,true);
 assert.equal(circleProgress(nextValueState(one,'justice')),0);
 assert.equal(circleProgress(nextValueState(one,'invalid-value')),1);
 assert.equal(journeyFor({goal:'creer',minutes:60}).route,'ia');
 assert.deepEqual(journeyFor({goal:'creer',minutes:15}).steps.map(s=>s.allocatedMinutes),[3,9,3]);
 assert.deepEqual(journeyFor({goal:'creer',minutes:60}).steps.map(s=>s.allocatedMinutes),[12,36,12]);
 assert.notEqual(journeyFor({goal:'creer',minutes:60,intensity:'calme'}).coaching,journeyFor({goal:'creer',minutes:60,intensity:'dynamique'}).coaching);
});
test('local preferences reject tampered payloads and do not invent reward or identity data',()=>{
 const parsed=normalizeJourney({goal:'hacker',minutes:1000000,intensity:'false',values:{justice:1,foi:true,'__proto__':true},passport:'admin'});
 assert.equal(parsed.goal,'bouger');
 assert.equal(parsed.minutes,30);
 assert.equal(parsed.intensity,'normal');
 assert.equal(parsed.values.justice,false);
 assert.equal(parsed.values.foi,true);
 assert.equal(Object.hasOwn(parsed,'passport'),false);
 assert.deepEqual(normalizeReadMode({large:'yes',contrast:true,calm:1}),{large:false,contrast:true,calm:false});
 const memory=new Map();const storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 assert.equal(safeWriteStorage(storage,JOURNEY_STORAGE_KEY,parsed),true);
 assert.equal(safeParseStorage(storage,JOURNEY_STORAGE_KEY,normalizeJourney).goal,'bouger');
 assert.equal(safeWriteStorage({setItem(){throw Error('blocked');}},READ_STORAGE_KEY,{}),false);
 assert.deepEqual(safeParseStorage({getItem(){throw Error('blocked');}},JOURNEY_STORAGE_KEY,normalizeJourney),normalizeJourney(null));
 const root={dataset:{}};
 applyReadMode({large:true,contrast:true,calm:false},root);
 assert.equal(root.dataset.threebLargeText,'true');
 assert.equal(root.dataset.threebHighContrast,'true');
 assert.equal(root.dataset.threebCalmMotion,'false');
});
test('Héritage is encrypted with randomized IV; no personal text leaks into local envelope',async()=>{
 assert.equal(HERITAGE_VAULT_KEY,'threeb_heritage_vault_v1');
 assert.equal(HERITAGE_ITERATIONS,600000);
 const rows=[{id:'demo-memory-123',title:'Recette secrète de famille',story:'Un souvenir qui ne doit jamais sortir du coffre.',created:'2026-10-16'}];
 const {envelope,key}=await createHeritageVault('ma longue phrase secrète de test !',rows);
 assert.equal(envelope.algorithm,'AES-256-GCM');
 assert.ok(!JSON.stringify(envelope).includes('Recette secrète'));
 assert.ok(!JSON.stringify(envelope).includes('Un souvenir'));
 assert.deepEqual((await openHeritageVault(envelope,'ma longue phrase secrète de test !')).entries,rows);
 const again=await sealHeritage(rows,key,envelope.salt);
 assert.notEqual(again.iv,envelope.iv);
 assert.notEqual(again.ciphertext,envelope.ciphertext);
 assert.deepEqual(validateHeritageEnvelope(JSON.stringify(envelope)).envelope,envelope);
 await assert.rejects(openHeritageVault(envelope,'mauvais mot de passe !!!!'),/incorrecte|endommagé/);
 const bytes=Uint8Array.from(Buffer.from(envelope.ciphertext,'base64'));bytes[0]^=1;
 await assert.rejects(openHeritageVault({...envelope,ciphertext:Buffer.from(bytes).toString('base64')},'ma longue phrase secrète de test !'),/incorrecte|endommagé/);
 await assert.rejects(openHeritageVault({...envelope,iterations:1},'ma longue phrase secrète de test !'),/Format/);
 await assert.rejects(createHeritageVault('court',rows),/12 caractères/);
 assert.throws(()=>validateHeritageEntries([{id:'bad',title:'x',story:'y',created:'2026-10-16'}]),/invalide/);
});
test('six modules are wired honestly, no camera starts without user action and no cloud-saved family notes',()=>{
 const app=read('../src/App.jsx');
 const home=read('../src/components/HomePage.jsx');
 const source=read('../src/maintenant/MaintenantPage.jsx');
 const scanner=read('../src/maintenant/ScannerPanel.jsx');
 const heritage=read('../src/maintenant/HeritagePanel.jsx');
 assert.match(app,/page === "maintenant" && <MaintenantPage/);
 assert.match(app,/\"maintenant\"/);
 assert.match(home,/<Concept13AtlasHome goTo=\{goTo\}\/>/);
 const nav=read('../src/components/navigation-menu.js');
 assert.match(nav,/maintenant/,'3B Maintenant remains reachable from the single app menu');
 assert.match(source,/role="tablist"/);
 assert.doesNotMatch(source,/className="now-back"/);
 assert.match(source,/aria-pressed=/);
 assert.match(source,/Coup de Main|COUP DE MAIN/);
 assert.match(source,/Marquer comme exploré/);
 assert.match(source,/Aucune demande d’aide n’est publiée automatiquement/);
 assert.match(scanner,/file\.size>MAX_IMAGE/);
 assert.match(scanner,/BarcodeDetector/);
 assert.doesNotMatch(scanner,/\bgetUserMedia\(/);
 assert.doesNotMatch(scanner,/\bfetch\(/);
 assert.doesNotMatch(heritage,/\bfetch\(|ecosystem\(|authClient|memberRequest/);
 assert.match(heritage,/type="password"/);
 assert.match(heritage,/localStorage\.setItem\(HERITAGE_VAULT_KEY,JSON\.stringify/);
 assert.doesNotMatch(source,/awardXP|addXP|passportUpdate|recordWorldAction/);
});
