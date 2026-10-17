import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_HASHES,getPageHref,readLocation} from '../src/lib/navigation.js';
import {WORLD_MODULES,WORLD_MORE_SERVICES,WORLD_REALMS,WORLD_MODULE_GROUPS,findWorldModules,findWorldExtraServices,findAlbertDestination,albertLocalGuideAnswer} from '../src/components/world-living-data.js';

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
 assert.deepEqual(findWorldExtraServices('scanner').map(item=>item.id),['foodscan']);
 assert.deepEqual(findWorldExtraServices('film').map(item=>item.id),['cinema']);
 assert.deepEqual(findWorldExtraServices('recrutement').map(item=>item.id),['join']);
 assert.equal(findWorldExtraServices('').length,0);
 assert.equal(findWorldModules().length,22,'extra results must not inflate the 22 core universe tiles');
 for(const id of ['news','association','partners','finance','travel','tv','admin'])
  assert.ok(WORLD_MODULES.some(item=>item.id===id),'required 3B space missing: '+id);
 for(const id of ['foodscan','cinema','join'])
  assert.ok(WORLD_MORE_SERVICES.some(item=>item.id===id),'required 3B service missing: '+id);
 assert.equal(WORLD_MODULES.some(item=>item.id==='music'||/musique/i.test(item.label)),false,'removed 3B Music must not return as a canonical module');
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
 assert.match(src,/ta voix peut être traitée par son fournisseur/,'microphone provider disclosure is explicit');
 assert.match(src,/reconnaissance vocale peut utiliser un service du navigateur/,'keyboard privacy alternative is stated');
 assert.doesNotMatch(src,/fetch\(['"]http:\/\/127\.0\.0\.1/);
});

test('Albert understands French requests and avoids false destinations from incidental substrings',()=>{
 assert.equal(findAlbertDestination('je ne sais pas'),null,'negation must not open step counter');
 assert.equal(findAlbertDestination('une discussion sociale'),null,'IA letters inside a longer word are not an AI intent');
 assert.equal(findAlbertDestination('Je veux une conversation IA')?.id,'ia-trio','generative chat remains distinct from tactile design IA');
 assert.equal(findAlbertDestination('Je veux cuisiner une recette')?.id,'health','cooking belongs to Santé');
 assert.equal(findAlbertDestination('Je cherche un partenaire')?.id,'partners');
 assert.equal(findAlbertDestination('Je veux voyager')?.id,'travel','French infinitive resolves to Voyage');
 assert.equal(findAlbertDestination('suivre mes pas')?.id,'health','explicit steps context is still recognized');
 assert.equal(findAlbertDestination('Je veux regarder un film')?.id,'cinema');
 assert.equal(findAlbertDestination('comment faire')?.id,'guide');
 assert.equal(findAlbertDestination('Je cherche des jeux vidéo')?.id,'games');
 assert.equal(albertLocalGuideAnswer('Où est le chatbot ?').destination?.id,'ia-trio');
});

test('3B World and Albert stay routed React experiences, not a promotional screenshot',()=>{
 const app=read('src/App.jsx'),home=read('src/components/HomePage.jsx');
 const map=read('src/components/LivingWorldHome.jsx'),globe=read('src/components/LivingWorldGlobe.jsx');
 const styles=read('src/styles/world-living-home.css');
 const atlas=read('src/components/Concept13AtlasHome.jsx');
 const mapArtwork=read('src/components/AtlasCinematicMap.jsx');
 const atlasCss=read('src/styles/concept13-atlas-v4.css');
 assert.ok(app.includes('page === "albert" && <AlbertPublicPreview'));
 assert.ok(home.includes('<Concept13AtlasHome goTo={goTo}/>'));
 for(const expected of ['WORLD_MODULES.map','WORLD_REALMS.map','AtlasCinematicMap','threeb:open-app-menu','page="world3b"','atlas3b-directory','atlas3b-module-link'])assert.ok(atlas.includes(expected),expected);
 assert.ok(mapArtwork.includes('black-marble-mobile.webp'));
 assert.ok(mapArtwork.includes('ResizeObserver'));
 assert.ok(atlasCss.includes('prefers-reduced-motion:reduce'));
 assert.doesNotMatch(atlas,/1.2M|850K|39 PAYS|fausses statistiques/i);
 const globe3d=read('src/components/HeritageGlobe3D.jsx');
 assert.match(globe3d,/WebGLRenderer|IntersectionObserver/);
 assert.ok(globe3d.includes('nasa-bluemarble'));
 assert.ok(map.includes('onSelect={setActiveRealm}'));
 assert.ok(map.includes('world3b-universes'));
 assert.ok(map.includes('localStorage'));
 for(const expected of ['IntersectionObserver','prefers-reduced-motion','onPointerMove','onKeyDown','ArrowUp','ArrowDown','requestAnimationFrame'])assert.ok(globe.includes(expected),expected);
 assert.ok(globe.includes('(pointer: coarse)'));
 assert.ok(map.includes('Mettre la rotation de la planète en pause'));
 assert.ok(styles.includes('.world-living-globe-canvas'));
 assert.ok(styles.includes('prefers-reduced-motion:reduce'));
 assert.doesNotMatch(map,/1.2M|850K|39 PAYS|fausses statistiques/i);
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
 assert.match(qa,/Atlas replaces the scrolling 22-card home/);
 assert.match(qa,/Eight categories in a single swipe rail/);
 assert.match(qa,/Albert also fits in one viewport/);
});

test('World Living Gold Master sources tokens and shared controls',()=>{
 const legacy=read('src/components/LivingWorldHome.jsx');
 assert.equal(legacy.includes('<button'),false,'Legacy home retains shared Gold Master button');
 assert.match(legacy,/<Button variant="ghost"/);
 const concierge=read('src/components/AlbertPublicPreview.jsx');
 assert.match(concierge,/th-albert-toolbar/);
 assert.match(concierge,/aria-pressed=\{panel==='talk'\}/);
 assert.match(concierge,/Mode guide local/);
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
