import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const catalog=readFileSync(new URL('../src/games/catalog.js',import.meta.url),'utf8');
const hub=readFileSync(new URL('../src/games/GamesHub.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const game=readFileSync(new URL('../src/games/KeyRace3B.jsx',import.meta.url),'utf8');

test('La Course des 8 Clés ne dépend plus du site externe',()=>{
 assert.doesNotMatch(catalog,/troisb-course-des-cles-demo|KEY_RACE_URL/);
 assert.doesNotMatch(hub,/target=['"]_blank['"]/);
});

test('La Course des 8 Clés possède une route interne dédiée',()=>{
 assert.match(catalog,/routeSlug:'course-des-8-cles'/);
 assert.match(hub,/goToGame\?\.\(g\.routeSlug\)/);
 assert.match(app,/gameSlug==='course-des-8-cles'/);
 assert.match(app,/KeyRace3B/);
});

test('le jeu interne conserve les 8 pays et le retour Jeux 3B',()=>{
 for(const country of ['FRANCE','ESTONIE','ESPAGNE','ITALIE','MAROC','ALGÉRIE','TUNISIE','TURQUIE']){
  assert.match(game,new RegExp(country));
 }
 assert.match(game,/Retour Jeux 3B/);
 assert.match(game,/Double tap pour sauter/);
 assert.match(game,/MONSTRE DE L’OUBLI/);
});
