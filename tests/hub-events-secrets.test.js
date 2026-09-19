import test from 'node:test';
import assert from 'node:assert/strict';
import {hubWeatherForDate,isHubEventActive} from '../src/world/hub/event-runtime.js';
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

test('Hub secret unlock requires physical ordered progress and rewards once',()=>{
 let save=blankSave();
 assert.throws(()=>applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_three_lights'}),/condition/);
 assert.throws(()=>applyWorldAction(save,{type:'hubSecretStep',id:'secret_archive_reverse',step:0}),/Étape secrète invalide/);
 save=applyWorldAction(save,{type:'hubSecretStep',id:'secret_three_lights',step:0});
 save=applyWorldAction(save,{type:'hubSecretStep',id:'secret_three_lights',step:1});
 save=applyWorldAction(save,{type:'hubSecretStep',id:'secret_three_lights',step:2});
 const before={xp:save.xp,shards:save.shards};
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_three_lights'});
 assert.ok(save.hub.secrets.includes('secret_three_lights'));
 assert.equal(save.xp,before.xp+80);
 assert.equal(save.shards,before.shards+20);
 const after={xp:save.xp,shards:save.shards};
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_three_lights'});
 assert.deepEqual({xp:save.xp,shards:save.shards},after);
 assert.throws(()=>applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_not_real'}),/Secret Hub inconnu/);
});

test('Archive reverse secret enforces the canonical reverse order',()=>{
 let save=blankSave();
 for(const step of [3,2,1,0])save=applyWorldAction(save,{type:'hubSecretStep',id:'secret_archive_reverse',step});
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_archive_reverse'});
 assert.ok(save.hub.secrets.includes('secret_archive_reverse'));
});

test('Hub daily weather is deterministic and uses supported states',()=>{
 const a=hubWeatherForDate('2026-09-19'),b=hubWeatherForDate('2026-09-19');
 assert.equal(a,b);
 assert.ok(['clear','rain','heavy_rain','fog'].includes(a));
});
