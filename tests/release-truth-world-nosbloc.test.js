import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {COUNTRY_CINEMA} from '../src/world/cinematic-director.js';
import {COUNTRY_CAMPAIGNS} from '../src/world/country-campaigns.js';
import {HERITAGE} from '../src/world/heritage.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const countries=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'];

test('official World release metadata no longer exposes Origins as public runtime',()=>{
  const release=JSON.parse(read('public/world-release.json'));
  assert.equal(release.entry,'world3b');
  assert.equal(release.countries,8);
  assert.equal(release.previousWorldAvailable,false);
});

test('all eight countries keep heritage, campaign and cinematic profiles',()=>{
  for(const country of countries){
    assert.ok(HERITAGE[country],country+' heritage');
    assert.ok(COUNTRY_CAMPAIGNS[country],country+' campaign');
    assert.ok(COUNTRY_CINEMA[country],country+' cinematic profile');
    assert.ok(COUNTRY_CAMPAIGNS[country].campaign.length>=5,country+' campaign depth');
  }
});

test('all country art packs required by the web runtime remain present',()=>{
  assert.equal(existsSync(new URL('../public/world/paris/manifest.json',import.meta.url)),true);
  for(const country of countries.filter(x=>x!=='france')){
    for(const tier of [1,2,3]){
      assert.equal(existsSync(new URL('../public/world/districts/'+country+'-'+tier+'.glb',import.meta.url)),true,country+'-'+tier);
    }
  }
});

test('World and City documentation keeps their progression independent',()=>{
  const doc=read('docs/WORLD_CITY_MASTER_V2.md');
  assert.match(doc,/Les deux expériences sont désormais \*\*séparées\*\*/);
  assert.match(doc,/Créer ma Ville est accessible directement depuis le Passeport actif/);
  assert.match(doc,/premier Souvenir requis pour créer sa Ville/);
  assert.doesNotMatch(doc,/progression croisée Monde\/Ville/);
});

test('Nosbloc stays visibly gated until public runtime gates are deliberately opened',()=>{
  const app=read('src/App.jsx');
  const doc=read('docs/NOSBLOC_RELEASE_STATUS_2026-09-28.md');
  assert.match(app,/PREPARATION_ROUTE_IDS = new Set\(\[[^\]]*"nosbloc"/);
  assert.match(doc,/Discover : désactivé/);
  assert.match(doc,/paiements : désactivés/);
  assert.match(doc,/retraits : désactivés/);
});

test('release truth docs do not claim a false grand-studio completion',()=>{
  const world=read('docs/WORLD_GOLD_MASTER_STATUS_2026-09-28.md');
  const nosbloc=read('docs/NOSBLOC_RELEASE_STATUS_2026-09-28.md');
  assert.match(world,/pas encore déclaré « terminé artistiquement à 100 % »/);
  assert.match(nosbloc,/n'est pas encore ouverte au public/);
});
