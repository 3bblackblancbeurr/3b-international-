import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_HASHES,getPageHref,readLocation} from '../src/lib/navigation.js';
import {WORLD_MODULES,WORLD_MORE_SERVICES,WORLD_REALMS,WORLD_MODULE_GROUPS,findWorldModules,findAlbertDestination,albertLocalGuideAnswer} from '../src/components/world-living-data.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('22 principal world modules are unique, routed and discoverable without inventing data',()=>{
 assert.equal(WORLD_MODULES.length,22);
 assert.equal(new Set(WORLD_MODULES.map(item=>item.id)).size,22);
 for(const item of WORLD_MODULES){
  assert.ok(item.label.length>3&&item.group&&item.icon,item.id);
  assert.ok(Object.hasOwn(PAGE_HASHES,item.id),'real route missing for '+item.id);
  const source=new URL('https://3b.example/#accueil');
  const result=new URL(getPageHref(item.id,source),source);
  assert.equal(readLocation(result).page,item.id);
 }
 for(const extra of WORLD_MORE_SERVICES)assert.ok(Object.hasOwn(PAGE_HASHES,extra.id));
 assert.equal(findWorldModules().length,22);
 assert.equal(findWorldModules({query:'Santé'})[0].id,'health');
 assert.deepEqual(findWorldModules({category:'favorites',favorites:['health','travel']}).map(item=>item.id),['health','travel']);
 assert.equal(findWorldModules({query:'aucun-module-connu'}).length,0);
 assert.equal(WORLD_MODULE_GROUPS[0].id,'all');
});

test('world realms follow the eight 3B narrative countries, without false physical hubs',()=>{
 assert.deepEqual(WORLD_REALMS.map(realm=>realm.id),['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie']);
 for(const realm of WORLD_REALMS){
  assert.ok(Number.isFinite(realm.lat)&&Number.isFinite(realm.lon));
  assert.ok(Math.abs(realm.lat)<=90&&Math.abs(realm.lon)<=180);
  assert.ok(realm.guardian&&realm.value&&realm.flag);
 }
});

test('Albert public concierge guides to existing routes without pretending local PC connectivity',()=>{
 assert.deepEqual(findAlbertDestination('Je veux voyager'),{id:'travel',label:'Voyage 3B'});
 assert.equal(findAlbertDestination('scanner alimentaire').id,'foodscan');
 assert.equal(albertLocalGuideAnswer('Bonjour').destination,null);
 assert.equal(albertLocalGuideAnswer('Je veux voir les jeux').destination.id,'games');
 assert.equal(albertLocalGuideAnswer('Qui es-tu ?').destination,null);
 assert.equal(albertLocalGuideAnswer('Où est le chatbot ?').destination.id,'ia-trio');
 assert.match(albertLocalGuideAnswer('Qui es-tu ?').message,/pas connecté/);
 const src=read('src/components/AlbertPublicPreview.jsx');
 assert.match(src,/Mode guide local/);
 assert.match(src,/Albert personnel non connecté/);
 assert.match(src,/SpeechRecognition/);
 assert.doesNotMatch(src,/fetch\(['"]http:\/\/127\.0\.0\.1/);
});

test('3B World and Albert are real routed React components, not pasted promotional screenshots',()=>{
 const app=read('src/App.jsx'),home=read('src/components/HomePage.jsx');
 const map=read('src/components/LivingWorldHome.jsx'),globe=read('src/components/LivingWorldGlobe.jsx');
 const styles=read('src/styles/world-living-home.css');
 assert.match(app,/page === "albert" && <AlbertPublicPreview/);
 assert.match(home,/<LivingWorldHome goTo=\{goTo\} menuItems=\{menuItems\}/);
 assert.match(home,/<WorldPortalCard goTo=\{goTo\}/);
 assert.match(map,/onSelect=\{setActiveRealm\}/);
 assert.match(map,/world3b-universes/);
 assert.match(map,/localStorage/);
 assert.match(globe,/IntersectionObserver/);
 assert.match(globe,/prefers-reduced-motion/);
 assert.match(globe,/onPointerMove/);
 assert.match(globe,/onKeyDown/);
 assert.match(globe,/requestAnimationFrame/);
 assert.match(globe,/\(pointer: coarse\)/);
 assert.match(globe,/\?1\.25:1\.5/);
 assert.match(globe,/!reduced\(\)&&!state\.drag/);
 assert.match(styles,/\.world-living-globe-canvas/);
 assert.match(styles,/@media\(max-width:370px\)/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(map,/1\.2M|850K|39 PAYS|fausses statistiques/i);
});

test('deep-linked world / Albert loads without four-second splash and conflicting floating companions',()=>{
 const provider=read('src/design-system/LuxuryExperience.jsx');
 const app=read('src/App.jsx');
 const concierge=read('src/components/AlbertPublicPreview.jsx');
 const qa=read('scripts/verify-world-living-ui.mjs');
 assert.match(provider,/!window\.location\.hash \|\| window\.location\.hash === '#intro'/);
 assert.match(app, /"home","albert"\]\.includes\(page\) && <CompanionLayer/);
 assert.match(concierge,/albert3b-local-dock/);
 assert.match(qa,/Direct link bypasses cinema overlay/);
 assert.match(qa,/Floating companion does not cover Albert conversation/);
 assert.match(qa,/\[360,800\]/);
 assert.match(qa,/\[393,873\]/);
 assert.match(qa,/\[1440,1000\]/);
 assert.match(qa,/Phone globe caps raster density/);
 assert.match(qa,/Mobile dock avoids fixed backdrop blur/);
});

test('World Living Gold Master sources tokens and shared controls',()=>{
 const components=['src/components/AlbertPublicPreview.jsx','src/components/LivingWorldHome.jsx'];
 for(const path of components){
  const source=read(path);
  assert.equal(source.includes('<button'),false,'native button in '+path);
  assert.ok(source.includes('<Button variant="ghost"'),path);
 }
 const css=read('src/styles/world-living-home.css');
 const hex=new RegExp('#[0-9a-fA-F]{3,8}'+String.fromCharCode(92)+'b');
 assert.equal(hex.test(css),false,'scenic CSS colors belong in Gold Master tokens');
 const radius=/\bborder-radius\s*:\s*([^;}]+)/g;
 const shadow=/\bbox-shadow\s*:\s*([^;}]+)/g;
 assert.ok([...css.matchAll(radius)].every(match=>match[1].trim().startsWith('var(')),'Gold Master radius');
 assert.ok([...css.matchAll(shadow)].every(match=>match[1].trim().startsWith('var(')),'Gold Master shadow');
 const canvas=read('src/components/LivingWorldGlobe.jsx');
 assert.ok(canvas.includes('worldLivingCanvasPalette'));
 assert.equal(hex.test(canvas),false,'canvas pigments belong in JS palette');
});
