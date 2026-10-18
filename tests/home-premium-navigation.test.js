import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NAV_GROUPS,PRINCIPAL_DESTINATIONS} from '../src/components/navigation-menu.js';

const home=readFileSync(new URL('../src/components/HomePage.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const account=readFileSync(new URL('../src/loyalty/AccountPage.jsx',import.meta.url),'utf8');
const nav=readFileSync(new URL('../src/components/AppNavigation.jsx',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/components/WorldPortalCard.jsx',import.meta.url),'utf8');
const games=readFileSync(new URL('../src/games/premium.css',import.meta.url),'utf8');

test('home hides technical status cards and keeps the ecosystem guide at the bottom',()=>{
 assert.doesNotMatch(home,/home-journey-status|home-status-item/);
 assert.doesNotMatch(home,/heritage-poster|background\.png/);
 assert.doesNotMatch(home,/welcome-hero|Un héritage|Nos différences|Notre force|luxury-manifesto-line/);
 assert.doesNotMatch(home,/PRIMARY_IDS|L’essentiel|home-primary-directory/);
 assert.match(home,/<Concept13AtlasHome goTo=\{goTo\}/);
 const immersive=readFileSync(new URL('../src/components/Concept13AtlasHome.jsx',import.meta.url),'utf8');
 assert.match(immersive,/atlas3b/);
 assert.match(immersive,/Ouvrir le menu général 3B/);
 assert.match(immersive,/atlas3b-dock/);
 assert.doesNotMatch(home,/secondaryGroups\.map|universe-grid|WorldPortalCard/);
 assert.deepEqual(NAV_GROUPS.find(group=>group.title==='Identité & progression').ids,['passport','member']);
 assert.ok(account.includes('<MemberHub goTo={goTo} profile={profile}/>'));
 assert.match(app,/page === "loyalty" && <LoyaltyPage/);
 assert.deepEqual(NAV_GROUPS.find(group=>group.title==='Univers 3B').ids,['world3b','invisible','secret']);
 assert.doesNotMatch(home,/<InstallCards|dashboard-footer/);
 assert.match(nav,/itemsForCategory|searchNavigation/);
});

test('mobile navigation keeps an active destination instead of staged games',()=>{
 assert.ok(PRINCIPAL_DESTINATIONS.some(item=>item.id==='shop'&&item.label==='Boutique'));
 assert.equal(PRINCIPAL_DESTINATIONS.some(item=>item.id==='games'),false);
 assert.ok(NAV_GROUPS.some(group=>group.title==='Services & avantages'));
});

test('only Nosbloc remains locked while existing modules reopen',()=>{
 assert.match(app,/id: "nosbloc"[\s\S]{0,120}status: "soon"/);
 for(const id of ['games','manga','sport','community','ia']){
  const start=app.indexOf('id: "'+id+'"'),end=app.indexOf('},',start);
  assert.ok(start>=0&&end>start,'known item '+id);
  assert.doesNotMatch(app.slice(start,end),/status:\s*"soon"/);
 }
 assert.match(app,/const PREPARATION_ROUTE_IDS = new Set\(\["nosbloc"\]\)/);
 assert.match(app,/const isPreparationRoute = PREPARATION_ROUTE_IDS\.has\(page\)/);
 for(const route of ['games','manga','sport','community','esports'])assert.match(app,new RegExp('page === "'+route+'" && <'));
 assert.match(app,/<AiPage page=\{page\} goTo=\{goTo\}/);
 assert.deepEqual(NAV_GROUPS.find(group=>group.title==='En préparation').ids,['nosbloc']);
 assert.ok(NAV_GROUPS.find(group=>group.title==='Comprendre 3B').ids.includes('religion'));
});

test('community and textile IA use their existing real modules',()=>{
 assert.match(app,/page === "community" && <CommunityPage/);
 assert.match(app,/<AiPage page=\{page\} goTo=\{goTo\}/);
 assert.doesNotMatch(nav,/app-menu-upcoming/);
 assert.equal(PRINCIPAL_DESTINATIONS.find(item=>item.label==='Scanner')?.id,'invisible');
});

test('home presents one cinematic world entry without the legacy atlas and pylons',()=>{
 assert.match(portal,/home-world-entry/);
 assert.match(portal,/HomeCinematicArtwork/);
 assert.doesNotMatch(portal,/<BrokenCircle3D/);
 assert.match(portal,/home-aaa-actions/);
 assert.doesNotMatch(portal,/hub-cite-origine\.webp|<img className="home-world-art"/);
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
