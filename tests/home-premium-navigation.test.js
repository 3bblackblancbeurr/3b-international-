import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync(new URL('../src/components/HomePage.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const nav=readFileSync(new URL('../src/components/AppNavigation.jsx',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/components/WorldPortalCard.jsx',import.meta.url),'utf8');
const games=readFileSync(new URL('../src/games/premium.css',import.meta.url),'utf8');

test('home hides technical status cards and keeps the ecosystem guide at the bottom',()=>{
 assert.doesNotMatch(home,/home-journey-status|home-status-item/);
 assert.doesNotMatch(home,/heritage-poster|background\.png/);
 assert.match(home,/const PRIMARY_IDS = \['passport', 'world3b', 'games'\]/);
 const guide=home.lastIndexOf('Comprendre l’écosystème 3B');
 assert.ok(guide>home.indexOf('Explorer 3B'));
 assert.ok(home.lastIndexOf('dashboard-footer')>guide);
});

test('mobile navigation prioritizes games instead of the shop',()=>{
 assert.match(nav,/\{ id: "games", label: "Jeux" \}/);
 assert.doesNotMatch(nav,/\{ id: "shop", label: "Boutique" \},\n\];/);
 assert.match(nav,/Services & avantages/);
});

test('community and textile AI remain explicitly staged as coming soon',()=>{
 for(const label of ['Communauté','Espace textile & IA']){
  assert.match(app,new RegExp('label: "'+label+'"[\\s\\S]{0,90}status: "soon"'));
 }
 assert.match(nav,/item\.status === "soon"/);
});

test('the home world card uses the canonical Cité des Huit Héritages instead of a small Nexus ring',()=>{
 assert.match(portal,/CITÉ DES HUIT HÉRITAGES/);
 assert.match(portal,/10 quartiers utiles/);
 assert.match(portal,/8 Portes reliées/);
 assert.match(portal,/cite-huit-heritages-canon-v3\.svg/);
 assert.match(portal,/hub-city-canon-map/);
 assert.doesNotMatch(portal,/CircleArtwork|nexus-authentic-circle|nexus-ring-scene|nexus-gates/);
 assert.doesNotMatch(portal,/client Unreal Engine|UE 5\.8 foundation|Le web reste le cœur/i);
});

test('each core game has a dedicated card art direction',()=>{
 for(const id of ['penalty-rush','arena','tower','maze','key-race','dada3b']){
  assert.ok(games.includes('[data-game="'+id+'"]'),'missing card art for '+id);
 }
 assert.match(games,/forbidden-hall\.webp/);
 assert.match(games,/maze-ruins\.webp/);
 assert.match(games,/conic-gradient/);
 assert.match(games,/data-visual="runner"/);
});
