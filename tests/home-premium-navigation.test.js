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
 assert.doesNotMatch(home,/welcome-hero|Un héritage|Nos différences|Notre force|luxury-manifesto-line/);
 assert.match(home,/const PRIMARY_IDS = \['passport', 'world3b'\]/);
 assert.ok(home.indexOf('<WorldPortalCard') < home.indexOf('L’essentiel'));
 const guide=home.lastIndexOf('Comprendre l’écosystème 3B');
 assert.ok(guide>home.indexOf('Explorer 3B'));
 assert.doesNotMatch(home,/<InstallCards|dashboard-footer/);
 assert.match(home,/item.status!=='soon'/);
});

test('mobile navigation keeps an active destination instead of staged games',()=>{
 assert.match(nav,/\{ id: "shop", label: "Boutique" \}/);
 assert.doesNotMatch(nav,/\{ id: "games", label: "Jeux" \}/);
 assert.match(nav,/Services & avantages/);
});

test('sport religion manga games and nosbloc are locked in preparation without deleting their routes',()=>{
 for(const id of ['nosbloc','games','religion','manga','sport']){
  assert.match(app,new RegExp('id: "'+id+'"[\\s\\S]{0,120}status: "soon"'));
 }
 assert.match(app,/const PREPARATION_ROUTE_IDS = new Set\(\["nosbloc", "games", "religion", "manga", "sport"\]\)/);
 assert.match(app,/PREPARATION_ROUTE_IDS\.has\(page\) \|\| page === "game"/);
 assert.match(app,/EN PRÉPARATION · 3B/);
 assert.match(nav,/En préparation"[\s\S]*"nosbloc", "games", "manga", "religion", "sport"/);
});

test('community and textile AI remain explicitly staged as coming soon',()=>{
 for(const label of ['Communauté','Espace textile & IA']){
  assert.match(app,new RegExp('label: "'+label+'"[\\s\\S]{0,90}status: "soon"'));
 }
 assert.match(nav,/item\.status === "soon"/);
});

test('home presents one cinematic world entry without the legacy atlas and pylons',()=>{
 assert.match(portal,/home-world-entry/);
 assert.match(portal,/hub-cite-origine\.webp/);
 assert.match(portal,/fetchPriority="high"/);
 assert.match(portal,/page="world3b"/);
 assert.doesNotMatch(portal,/UniversePreview|CircleArtwork|nexus-gates|nexus-portal-pylon/);
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
