import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('WorldEntry exposes one canonical World engine and no legacy Origins switch',()=>{
 const entry=read('src/world/WorldEntry.jsx');
 assert.match(entry,/CurrentWorld/);
 assert.doesNotMatch(entry,/OriginsPage|world-origins|legacy/);
});

test('current avatar editor uses the canonical armory module',()=>{
 const avatar=read('src/world/AvatarPanel.jsx');
 assert.match(avatar,/\.\/armory\/Armory\.jsx/);
 assert.doesNotMatch(avatar,/\.\/origins\//);
});

test('premium command center has the four canonical pillars',()=>{
 const menu=read('src/world/WorldCommandCenter.jsx');
 for(const label of ['JOUER','MONDE','PERSONNAGE','SYSTÈME'])assert.match(menu,new RegExp(label));
 assert.match(menu,/Personnage & armes/);
 assert.match(menu,/Ville 3B/);
 assert.match(menu,/Réglages avancés/);
});

test('premium armory exposes art, all 16 weapons and four evolution forms',()=>{
 const armory=read('src/world/armory/Armory.jsx');
 const arsenal=read('src/world/arsenal.js');
 assert.match(armory,/WEAPON_ART_ATLAS/);
 assert.match(armory,/16 ARMES CANONIQUES/);
 assert.match(armory,/EVOLUTION_XP/);
 assert.equal([...arsenal.matchAll(/weapon\('/g)].length,16);
});
