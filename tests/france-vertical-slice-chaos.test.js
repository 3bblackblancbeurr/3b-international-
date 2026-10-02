import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave,worldItems} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {chapterState} from '../src/world/chapters.js';
import {hubRuntime} from '../src/world/hub/runtime-data.js';

const restart=save=>normalizeSave(JSON.parse(JSON.stringify(save)));
const act=(save,action)=>restart(applyWorldAction(save,action));

function arriveInFrance(){
 let save=act(blankSave(),{type:'avatar',avatar:{name:'Kaïs',body:'homme',path:'lumiere'}});
 save=act(save,{type:'visit',region:'france'});
 save=act(save,{type:'help'});
 for(const power of ['ally','ambiance','terrain'])save=act(save,{type:'power',power});
 for(const index of [0,1,2,3])save=act(save,{type:'puzzleStep',index});
 save=act(save,{type:'solve'});
 for(const id of ['france:0','france:1','france:2'])save=act(save,{type:'beacon',id});
 return act(save,{type:'restore',choice:'garden'});
}

function recruitFranceCreature(save){
 const echo=worldItems('france',save).find(item=>item.type==='echo');
 assert.ok(echo,'the France slice must expose at least one real creature encounter');
 save=act(save,{type:'encounter',id:echo.id});
 save=act(save,{type:'approach',kind:'help'});
 save=act(save,{type:'pactStart'});
 const seed=save.adventure.encounter.pactSeed;
 for(const index of [(seed+1)%3,(seed+2)%3,seed%3])save=act(save,{type:'pactChoice',index});
 assert.equal(save.adventure.encounter.result,'recruited');
 assert.ok(save.collection[echo.card]);
 return act(save,{type:'leave'});
}

function masterJustice(save){
 for(const choiceId of ['écouter','preuve','réparer'])save=act(save,{type:'guardianValueChoice',choiceId});
 assert.equal(save.adventure.values.france.completed,true);
 return save;
}

function defeatFranceGuardian(save){
 save=act(save,{type:'encounter',id:'france:guardian'});
 save=restart({...save,adventure:{...save.adventure,encounter:{...save.adventure.encounter,enemy:1}}});
 save=act(save,{type:'battle',action:'strike'});
 assert.equal(save.adventure.encounter.result,'victory');
 assert.deepEqual(save.seals,['france']);
 return save;
}

test('Chaos QA: the implemented France slice survives a checkpoint/restart after every command',()=>{
 let save=arriveInFrance();
 assert.equal(save.adventure.avatar.name,'Kaïs');
 assert.equal(save.region,'france');
 assert.equal(chapterState(save,'france').restored,2);

 save=recruitFranceCreature(save);
 save=masterJustice(save);
 save=defeatFranceGuardian(save);
 save=act(save,{type:'restore'});
 assert.equal(chapterState(save,'france').restored,3);

 const reward={xp:save.xp,shards:save.shards,wins:save.wins,collection:Object.keys(save.collection).length};
 save=act(save,{type:'visit',region:'hub'});
 save=restart(save);
 assert.equal(save.region,'hub');
 assert.deepEqual(
  {xp:save.xp,shards:save.shards,wins:save.wins,collection:Object.keys(save.collection).length},
  reward,
  'a real SAVE → RESTART must preserve authoritative rewards exactly',
 );

 const restoredRegions=Object.entries(save.adventure.chapters)
  .filter(([,chapter])=>chapter?.restored===3)
  .map(([id])=>id);
 const hub=hubRuntime('desktop',{seals:save.seals,restoredRegions,storyProgress:true,hubState:save.hub,weather:'clear',hour:14,day:2,dateKey:'2026-10-02'});
 assert.equal(hub.meta.fragmentCount,1);
 assert.equal(hub.meta.evolutionStage,1);
 assert.ok(hub.items.some(item=>item.type==='hubGuardian'&&item.region==='france'&&item.name==='Céliane'));
});

test('Chaos QA: duplicate fragments, rewards and cinematic acknowledgements are idempotent',()=>{
 let save=arriveInFrance();
 const beforeDuplicate={xp:save.xp,shards:save.shards,beacons:[...save.beacons]};
 save=act(save,{type:'beacon',id:'france:0'});
 assert.deepEqual({xp:save.xp,shards:save.shards,beacons:save.beacons},beforeDuplicate);

 const beforeSeen={xp:save.xp,shards:save.shards};
 save=act(save,{type:'cinematicSeen',key:'country:france'});
 save=act(save,{type:'cinematicSeen',key:'country:france'});
 assert.equal(save.adventure.cinematicSeen.filter(key=>key==='country:france').length,1);
 assert.deepEqual({xp:save.xp,shards:save.shards},beforeSeen);

 save=masterJustice(save);
 save=defeatFranceGuardian(save);
 save=act(save,{type:'restore'});
 const completed={xp:save.xp,shards:save.shards,wins:save.wins,seals:[...save.seals]};
 save=act(save,{type:'restore'});
 assert.deepEqual({xp:save.xp,shards:save.shards,wins:save.wins,seals:save.seals},completed);
});

test('Chaos QA: defeat cannot mint a fragment and a retry grants the France seal only once',()=>{
 let save=masterJustice(arriveInFrance());
 save=act(save,{type:'encounter',id:'france:guardian'});
 save=restart({...save,adventure:{...save.adventure,encounter:{...save.adventure.encounter,hp:1,intent:'double'}}});
 save=act(save,{type:'battle',action:'wait'});
 assert.equal(save.adventure.encounter.result,'defeat');
 assert.equal(save.seals.includes('france'),false);

 save=act(save,{type:'leave'});
 save=defeatFranceGuardian(save);
 const won={xp:save.xp,shards:save.shards,wins:save.wins};
 save=act(save,{type:'leave'});
 save=defeatFranceGuardian(save);
 assert.equal(save.seals.filter(region=>region==='france').length,1);
 assert.deepEqual(
  {xp:save.xp-won.xp,shards:save.shards-won.shards,wins:save.wins-won.wins},
  {xp:35,shards:10,wins:1},
  'a rematch may grant only the bounded repeat reward, never a duplicate seal reward',
 );
});

test('Chaos QA: malformed local totals are bounded and unknown ownership is discarded on restart',()=>{
 const save=normalizeSave({
  ...arriveInFrance(),
  xp:Number.POSITIVE_INFINITY,
  shards:-50,
  wins:9e99,
  collection:{C001:9999,FAKE:9999},
  seals:['france','france','fake'],
  beacons:['france:0','france:0','fake:9'],
 });
 assert.equal(save.xp,0);
 assert.equal(save.shards,0);
 assert.equal(save.wins,10_000_000);
 assert.deepEqual(save.seals,['france'],'known seal identifiers are deduplicated while unknown values are rejected');
 assert.deepEqual(save.beacons,['france:0']);
 assert.deepEqual(save.collection,{C001:100,C357:1});
});
