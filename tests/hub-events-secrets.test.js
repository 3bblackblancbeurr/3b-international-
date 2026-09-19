import test from 'node:test';
import assert from 'node:assert/strict';
import {isHubEventActive} from '../src/world/hub/event-runtime.js';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

test('Hub event triggers are deterministic for daily, evening and weather contexts',()=>{
 assert.equal(isHubEventActive({id:'daily',trigger:'daily'},{hour:10,day:2}),true);
 assert.equal(isHubEventActive({id:'evening',trigger:'evening'},{hour:19,day:2}),true);
 assert.equal(isHubEventActive({id:'evening',trigger:'evening'},{hour:12,day:2}),false);
 assert.equal(isHubEventActive({id:'fog',trigger:'weather:fog'},{weather:'fog'}),true);
 assert.equal(isHubEventActive({id:'fog',trigger:'weather:fog'},{weather:'clear'}),false);
});

test('Hub event discovery rewards once and survives reducer normalization',()=>{
 let save=blankSave(),before={xp:save.xp,shards:save.shards};
 save=applyWorldAction(save,{type:'hubEventDiscover',id:'arena_public_challenge'});
 assert.ok(save.hub.events.includes('arena_public_challenge'));
 assert.equal(save.xp,before.xp+25);
 assert.equal(save.shards,before.shards+6);
 const after={xp:save.xp,shards:save.shards};
 save=applyWorldAction(save,{type:'hubEventDiscover',id:'arena_public_challenge'});
 assert.deepEqual({xp:save.xp,shards:save.shards},after);
});

test('Hub secret unlock is canonical, hidden-state persistent and rewarded once',()=>{
 let save=blankSave(),before={xp:save.xp,shards:save.shards};
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_three_lights'});
 assert.ok(save.hub.secrets.includes('secret_three_lights'));
 assert.equal(save.xp,before.xp+80);
 assert.equal(save.shards,before.shards+20);
 assert.throws(()=>applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_not_real'}),/Secret Hub inconnu/);
});
