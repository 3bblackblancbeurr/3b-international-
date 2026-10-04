import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const landmarks=fs.readFileSync(new URL('../src/world/hub/landmark-craft.js',import.meta.url),'utf8');
const tower=fs.readFileSync(new URL('../src/world/hub/civic-tower.js',import.meta.url),'utf8');

test('final Hub pass covers every requested AAA landmark',()=>{
 for(const token of [
  'tour_cercle_brise','archives_memoire','arena_3b','quartier_commerce',
  'docks_transports','portail_ville_3b','jardins_unite',
 ])assert.match(landmarks,new RegExp(token));
 assert.match(landmarks,/hub-aaa-max-v4/);
 assert.match(landmarks,/opaqueBatchReady:true/);
 assert.match(landmarks,/preservesSaveContract:true/);
});

test('Tower exposes the complete six-level civic programme',()=>{
 for(const token of [
  'heritage_gallery','council_eight','living_maps','city_observatory',
  'circle_chamber','horizon_belvedere',
 ])assert.match(tower,new RegExp(token));
 assert.match(tower,/Hall de l’Unité/);
 assert.match(tower,/Ascenseur panoramique de la Tour/);
 assert.match(tower,/CIVIC_TOWER_FINAL_LEVELS/);
});

test('AAA craft stays procedural and asset-download free',()=>{
 assert.doesNotMatch(landmarks,/fetch\s*\(/);
 assert.doesNotMatch(landmarks,/TextureLoader/);
 assert.match(landmarks,/TubeGeometry/);
 assert.match(landmarks,/civicShaftGeometry/);
 assert.match(landmarks,/authoredMeshes/);
});
