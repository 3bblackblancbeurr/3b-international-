import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldEntryPolicy} from '../src/world/entry-policy.js';
import {worldRadiusFor} from '../src/world/terrain.js';
import {normalizeExplorationCheckpoint,explorationCheckpointCommand,safeExplorationSpawn} from '../src/world/exploration-checkpoint.js';

function traveler(){
 let save=applyWorldAction(blankSave(),{type:'avatar',avatar:{name:'Kaïs'}});
 return applyWorldAction(save,{type:'visit',region:'france'});
}

test('exploration checkpoint is a persistent pose without progression or economic effects',()=>{
 const before=traveler(),command={type:'checkpoint',region:'france',x:26.321,z:-40.556,heading:-20.129};
 const after=applyWorldAction(before,command),restored=normalizeSave(JSON.parse(JSON.stringify(after)));
 assert.deepEqual(restored.adventure.exploration,{region:'france',x:26.32,z:-40.56,heading:339.87});
 for(const key of ['xp','shards','wins','collection','seals','beacons','visited','walked'])assert.deepEqual(after[key],before[key],key);
 assert.deepEqual(worldEntryPolicy(restored),{kind:'resume-exploration',region:'france',resumeEncounter:false,action:null});
 assert.equal(worldEntryPolicy({...restored,adventure:{...restored.adventure,avatar:{created:false}}}).region,'hub');
});

test('checkpoint command rejects a different region, malformed positions and out-of-bounds poses',()=>{
 const save=traveler(),base={type:'checkpoint',region:'france',x:10,z:10,heading:0};
 for(const delta of [{region:'hub'},{region:'invalid'},{x:NaN},{z:Infinity},{heading:NaN},{x:'12'},{x:worldRadiusFor('france')},{x:200,z:200}])assert.throws(()=>applyWorldAction(save,{...base,...delta}),/reprise invalide|pays exploré/);
 let duel=applyWorldAction(save,{type:'tournamentStart'});
 assert.throws(()=>applyWorldAction(duel,base),/rencontre/);
 assert.equal(explorationCheckpointCommand(duel,{region:'france',position:{x:0,z:5},heading:0}),null);
});

test('checkpoint normalization tolerates legacy saves and omits foreign payload fields',()=>{
 assert.equal(normalizeSave(blankSave()).adventure.exploration,null);
 assert.equal(normalizeExplorationCheckpoint({region:'france',x:0,z:0}),null);
 assert.equal(normalizeExplorationCheckpoint({region:'bad',x:0,z:0,heading:0}),null);
 assert.equal(normalizeExplorationCheckpoint({region:'hub',x:5001,z:0,heading:0}),null);
 assert.deepEqual(normalizeExplorationCheckpoint({region:'hub',x:10,z:20,heading:720,xp:999,shards:999}),{region:'hub',x:10,z:20,heading:0});
});

test('snapshot checkpoint generation ignores cinematics and small movements',()=>{
 let save=traveler();save=applyWorldAction(save,{type:'checkpoint',region:'france',x:20,z:20,heading:359});
 assert.equal(explorationCheckpointCommand(save,{region:'france',position:{x:20.4,z:20.4},heading:1}),null);
 assert.equal(explorationCheckpointCommand(save,{region:'france',position:{x:50,z:50},heading:0,cinematic:true}),null);
 assert.equal(explorationCheckpointCommand(save,{region:'hub',position:{x:50,z:50},heading:0}),null);
 assert.deepEqual(explorationCheckpointCommand(save,{region:'france',position:{x:22,z:20},heading:10}),{type:'checkpoint',region:'france',x:22,z:20,heading:10});
});

test('changed scenery relocates an obstructed checkpoint without moving it to another region',()=>{
 const point={region:'france',x:20,z:20,heading:90};
 assert.deepEqual(safeExplorationSpawn(point,'france'),point);
 const safe=safeExplorationSpawn(point,'france',{obstacles:[{x:20,z:20,r:2}],portals:[{x:25,z:20}],radius:260});
 assert.ok(safe);assert.ok(Math.hypot(safe.x-20,safe.z-20)>3.15);assert.ok(Math.hypot(safe.x-25,safe.z-20)>4.5);
 assert.equal(safeExplorationSpawn(point,'italie'),null);
 assert.equal(safeExplorationSpawn(point,'france',{groundY:()=>-3}),null);
});
