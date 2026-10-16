import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_HASHES,readLocation,getPageHref} from '../src/lib/navigation.js';
import {NAV_GROUPS,itemsForCategory,searchNavigation} from '../src/components/navigation-menu.js';
import {GAME_CATALOG} from '../src/games/catalog.js';

const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=file('../src/App.jsx'),home=file('../src/components/HomePage.jsx'),hub=file('../src/games/GamesHub.jsx');

const items=[
 {id:'games',label:'Jeux 3B',description:'Tous les jeux 3B'},
 {id:'manga',label:'Manga 3B'},{id:'sport',label:'Espace sport 3B'},
 {id:'esports',label:'16-18 e-sport'},{id:'community',label:'Communauté'},
 {id:'ia',label:'Espace textile & IA'},{id:'nosbloc',label:'Nosbloc du 3B',status:'soon'}
];
test('only Nosbloc is locked, other destinations remain discoverable',()=>{
 assert.match(app,/id: "games",\s*label: "Jeux 3B"/);
 assert.doesNotMatch(app,/G3B · Jeux 3B/);
 assert.deepEqual(NAV_GROUPS.find(group=>group.title==='En préparation').ids,['nosbloc']);
 for(const id of ['games','sport','esports'])assert.ok(itemsForCategory(items,'play').some(item=>item.id===id),id);
 assert.ok(itemsForCategory(items,'discover').some(item=>item.id==='manga'));
 assert.equal(searchNavigation(items,'nosbloc').length,0);
 for(const id of ['games','manga','sport','esports','community','ia'])
  assert.ok(searchNavigation(items,id==='games'?'Jeux 3B':id).length>0,id);
 assert.match(app,/const PREPARATION_ROUTE_IDS = new Set\(\["nosbloc"\]\)/);
 assert.match(app,/page === "games" && <GamesHub/);
 assert.match(app,/page === "sport" && <SportPage/);
 assert.match(app,/page === "manga" && <MangaPage/);
 assert.match(app,/page === "esports" && <EsportsPage/);
 assert.match(app,/page === "community" && <CommunityPage/);
 assert.match(app,/<AiPage page=\{page\} goTo=\{goTo\}/);
});
test('Jeux 3B contains Créer ma Ville, football and all historic games',()=>{
 const city=GAME_CATALOG.find(item=>item.id==='city3b');
 assert.equal(city.title,'Créer ma Ville');
 assert.equal(GAME_CATALOG.find(item=>item.id==='penalty-rush')?.title,'PENALTY RUSH');
 for(const id of ['arena','tower','maze','key-race','dada3b','power3b'])
  assert.ok(GAME_CATALOG.some(g=>g.id===id));
 assert.match(hub,/setCityOpen\(true\)/);
 assert.match(hub,/NexusCityGateway open/);
 assert.doesNotMatch(home,/city-essential-card|PassportNexus|cityOpen/);
 assert.match(home,/<WorldPortalCard goTo=\{goTo\}/);
});
test('16-18 e-sport has a routable deep link',()=>{
 const source=new URL('https://3b.example/#accueil');
 const target=new URL(getPageHref('esports',source),source);
 assert.equal(PAGE_HASHES.esports,'16-18-esport');
 assert.equal(readLocation(target).page,'esports');
});
