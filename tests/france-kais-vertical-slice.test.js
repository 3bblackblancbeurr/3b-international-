import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {contextActions} from '../src/world/interaction-system.js';
import {isWorldCinematicKey} from '../src/world/cinematic-events.js';

test('France starts with a real interactive Kais beat before the Justice route',()=>{
 let save=blankSave();
 save=applyWorldAction(save,{type:'visit',region:'france'});
 const kais=worldRuntimeItems('france',save).find(item=>item.type==='kais');
 assert.ok(kais,'Kaïs must exist in the playable France runtime');
 assert.equal(kais.id,'france:kais');
 assert.ok(contextActions(kais,{save,region:'france'}).some(action=>action.id==='talk'));
 assert.equal(isWorldCinematicKey('kais:france'),true);
});

test('Kais guidance persists without granting XP shards fragments or inventory',()=>{
 let save=blankSave();
 save=applyWorldAction(save,{type:'visit',region:'france'});
 const before={xp:save.xp,shards:save.shards,seals:[...save.seals],collection:{...save.collection}};
 const next=applyWorldAction(save,{type:'cinematicSeen',key:'kais:france'});
 assert.equal(next.xp,before.xp);
 assert.equal(next.shards,before.shards);
 assert.deepEqual(next.seals,before.seals);
 assert.deepEqual(next.collection,before.collection);
 assert.ok(next.adventure.cinematicSeen.includes('kais:france'));
});

test('the existing Kais GLB is loaded rendered and wired to the cinematic',()=>{
 const models=readFileSync(new URL('../src/world/models.js',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 const page=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
 assert.match(models,/\/world\/models\/kais-3d\.glb/);
 assert.match(scene,/createKais\(models\.kais\)/);
 assert.match(scene,/kind==='kais-guidance'/);
 assert.match(page,/kind:'kais-guidance'/);
});
