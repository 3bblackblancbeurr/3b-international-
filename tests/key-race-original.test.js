import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const catalog=readFileSync(new URL('../src/games/catalog.js',import.meta.url),'utf8');
const hub=readFileSync(new URL('../src/games/GamesHub.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const original=readFileSync(new URL('../src/games/KeyRaceOriginal.jsx',import.meta.url),'utf8');

test('La Course des clés conserve le jeu historique exact dans une coque interne 3B',()=>{
 assert.match(catalog,/https:\/\/troisb-course-des-cles-demo\.stetienne86pp\.chatgpt\.site\//);
 assert.match(catalog,/href:KEY_RACE_URL/);
 assert.match(hub,/isOriginalKeyRace=g\.id==='key-race'/);
 assert.match(hub,/goToGame\?\.\(g\.id\)/);
 assert.match(app,/gameSlug === "key-race"/);
 assert.match(original,/src=\{KEY_RACE_URL\}/);
 assert.match(original,/<iframe/);
});

test('le faux KeyRace3B recréé reste absent',()=>{
 assert.doesNotMatch(app,/KeyRace3B/);
 assert.equal(existsSync(new URL('../src/games/KeyRace3B.jsx',import.meta.url)),false);
 assert.equal(existsSync(new URL('../src/games/key-race.css',import.meta.url)),false);
});

test('Penalty Rush conserve sa route interne',()=>{
 assert.match(app,/gameSlug === "penalty-rush"/);
 assert.match(app,/RemoteGamePage/);
 assert.match(hub,/goToGame\?\.\(g\.slug\)/);
});
