import test from 'node:test';
import assert from 'node:assert/strict';
import {INVISIBLE_EPISODE,INVISIBLE_REALMS} from '../src/world/invisible/catalog.js';
import {blankInvisibleState,normalizeInvisibleState,applyInvisibleAction,INVISIBLE_MEMORY_REVISION_LIMIT} from '../src/world/invisible/progression.js';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';

const solve=state=>INVISIBLE_EPISODE.points.reduce((next,point)=>applyInvisibleAction(next,{type:'invisibleAnswer',id:point.id,answer:point.riddle.answers[0]}),state);
const solveWorld=save=>INVISIBLE_EPISODE.points.reduce((next,point)=>applyWorldAction(next,{type:'invisibleAnswer',id:point.id,answer:point.riddle.answers[0]}),save);

test('the eight Invisible realms share the existing guardian canon and fictional map',()=>{
 assert.deepEqual(INVISIBLE_REALMS,COUNTRIES.map(({id,name})=>({id,name,value:GUARDIAN_VALUES[id].value})));
 assert.equal(INVISIBLE_EPISODE.guardian,GUARDIAN_VALUES.france.name);
 assert.equal(INVISIBLE_EPISODE.fragment.value,'Justice');
 assert.match(INVISIBLE_EPISODE.fiction,/Fiction/);
 for(const point of INVISIBLE_EPISODE.points){assert.equal(point.riddle.answers.length>0,true);assert.ok(point.position.x>=0&&point.position.x<=100&&point.position.y>=0&&point.position.y<=100);assert.equal('latitude' in point.position,false);}
});

test('normalization preserves only the valid ordered prefix and prerequisite flags',()=>{
 for(const input of [null,[],false,'forged'])assert.deepEqual(normalizeInvisibleState(input),blankInvisibleState());
 let state=normalizeInvisibleState({started:false,solved:['rive','balance','preuve'],chestOpened:true,portalOpened:true});
 assert.deepEqual(state.solved,[]);assert.equal(state.chestOpened,false);assert.equal(state.portalOpened,false);
 state=normalizeInvisibleState({started:true,solved:['rive','preuve','balance'],chestOpened:true,portalOpened:true,mode:'drive'});
 assert.deepEqual(state.solved,['rive']);assert.equal(state.chestOpened,false);assert.equal(state.portalOpened,false);assert.equal(state.mode,'remote');
 state=normalizeInvisibleState({started:true,solved:['rive','rive','balance','preuve'],chestOpened:true});
 assert.deepEqual(state.solved,['rive']);assert.equal(state.chestOpened,false);
 state=normalizeInvisibleState({started:1,memoryConsent:'yes',mode:'walk'});
 assert.equal(state.started,false);assert.equal(state.memoryConsent,false);assert.equal(state.mode,'walk');
 const old={...blankSave()};delete old.invisible;assert.deepEqual(normalizeSave(old).invisible,blankInvisibleState());
});

test('wrong answers and out-of-order actions cannot open a chest or portal',()=>{
 const blank=blankInvisibleState();assert.throws(()=>applyInvisibleAction(blank,{type:'invisibleAnswer',id:'rive',answer:'reflet'}),/Commence/);
 const state=applyInvisibleAction(blank,{type:'invisibleStart'});
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleAnswer',id:'balance',answer:'balance'}),/ordre/);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleAnswer',id:'rive',answer:'soleil'}),/réponse/);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleAnswer',id:'rive',answer:'r'.repeat(121)}),/réponse/);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleAnswer',id:'unknown',answer:'reflet'}),/trace/);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleChest'}),/trois énigmes/);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisiblePortal'}),/Fragment/);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleMode',mode:'drive'}),/mode/);
 assert.deepEqual(state.solved,[]);assert.equal(state.chestOpened,false);
 const first=applyInvisibleAction(state,{type:'invisibleAnswer',id:'rive',answer:'  LE REFLET!  '});
 assert.deepEqual(first.solved,['rive']);assert.deepEqual(applyInvisibleAction(first,{type:'invisibleAnswer',id:'rive',answer:'reflet'}),first);
});

test('remote and walk complete the same episode and preserve progress through mode changes',()=>{
 for(const mode of ['remote','walk']){
  let state=applyInvisibleAction(blankInvisibleState(),{type:'invisibleMode',mode});state=applyInvisibleAction(state,{type:'invisibleStart'});
  state=solve(state);state=applyInvisibleAction(state,{type:'invisibleChest'});state=applyInvisibleAction(state,{type:'invisiblePortal'});
  assert.deepEqual(state.solved,['rive','balance','preuve']);assert.equal(state.portalOpened,true);assert.equal(state.mode,mode);
  const switched=applyInvisibleAction(state,{type:'invisibleMode',mode:mode==='walk'?'remote':'walk'});assert.equal(switched.portalOpened,true);assert.deepEqual(switched.solved,state.solved);
 }
});

test('the chest grants world rewards and the global intent only on its first validated transition',()=>{
 let save=solveWorld(applyWorldAction(blankSave(),{type:'invisibleStart'})),before=save;
 save=applyWorldAction(save,{type:'invisibleChest',xp:999999,shards:999999});
 assert.equal(save.xp-before.xp,120);assert.equal(save.shards-before.shards,30);
 assert.deepEqual(worldGlobalRewardIntents(before,save,{type:'invisibleChest'}),[{rewardCode:'invisible_fragment',eventId:'invisible:leman-001',source:'world'}]);
 const replay=applyWorldAction(save,{type:'invisibleChest'});assert.equal(replay.xp,save.xp);assert.equal(replay.shards,save.shards);assert.deepEqual(worldGlobalRewardIntents(save,replay,{type:'invisibleChest'}),[]);
 const portal=applyWorldAction(replay,{type:'invisiblePortal'});assert.equal(portal.region,'hub');assert.deepEqual(portal.seals,[]);assert.deepEqual(portal.visited,[]);assert.equal(portal.invisible.portalOpened,true);
 assert.deepEqual(worldGlobalRewardIntents(replay,portal,{type:'invisiblePortal'}),[]);
 const resumed=normalizeSave(JSON.parse(JSON.stringify(portal)));assert.equal(resumed.invisible.portalOpened,true);
 assert.equal(applyWorldAction(resumed,{type:'invisibleChest'}).xp,resumed.xp);
});

test('memory requires explicit consent, stores canonical summaries, and forget does not reset rewards',()=>{
 let state=applyInvisibleAction(blankInvisibleState(),{type:'invisibleStart'});
 state=applyInvisibleAction(state,{type:'invisibleAnswer',id:'rive',answer:'reflet',latitude:46,dialogue:'private text'});assert.deepEqual(state.memory,[]);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleMemoryConsent',enabled:'yes'}),/explicite/);
 state=applyInvisibleAction(state,{type:'invisibleMemoryConsent',enabled:true});assert.deepEqual(state.memory,[]);
 state=applyInvisibleAction(state,{type:'invisibleAnswer',id:'balance',answer:'balance'});assert.equal(state.memory.length,1);assert.equal(state.memory[0].kind,'riddle:balance');
 const poisoned=normalizeInvisibleState({...state,latitude:46,longitude:6,dialogue:'private',memory:[...state.memory,{kind:'dialogue',text:'private'},{kind:'riddle:rive',text:'forged'},{kind:'portal',text:'J’ai activé le portail du royaume de France.'}]});
 assert.deepEqual(poisoned.memory,state.memory);assert.equal('latitude' in poisoned,false);assert.equal('dialogue' in poisoned,false);
 state=solve(state);state=applyInvisibleAction(state,{type:'invisibleChest'});const forgotten=applyInvisibleAction(state,{type:'invisibleForget'});
 assert.equal(forgotten.chestOpened,true);assert.deepEqual(forgotten.solved,state.solved);assert.equal(forgotten.memoryConsent,false);assert.deepEqual(forgotten.memory,[]);
 assert.deepEqual(applyInvisibleAction({...state},{type:'invisibleMemoryConsent',enabled:false}).memory,[]);
 const optedBack=applyInvisibleAction(forgotten,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision:forgotten.memoryRevision});assert.deepEqual(optedBack.memory,[]);
 assert.deepEqual(applyInvisibleAction(optedBack,{type:'invisibleChest'}).memory,[]);
});

test('consent revisions reject stale activations while withdrawal is unconditional and bounded',()=>{
 for(const revision of [-1,Infinity,NaN,0.5,'1'])assert.equal(normalizeInvisibleState({memoryRevision:revision}).memoryRevision,0);
 assert.equal(normalizeInvisibleState({memoryRevision:Number.MAX_SAFE_INTEGER}).memoryRevision,INVISIBLE_MEMORY_REVISION_LIMIT);
 let state=applyInvisibleAction(blankInvisibleState(),{type:'invisibleMemoryConsent',enabled:true});assert.equal(state.memoryRevision,1);
 state=applyInvisibleAction(state,{type:'invisibleStart'});assert.equal(state.memory.length,1);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleMemoryConsent',enabled:true}),/autre appareil/);
 const forgotten=applyInvisibleAction(state,{type:'invisibleForget',expectedMemoryRevision:0});assert.equal(forgotten.memoryRevision,2);assert.deepEqual(forgotten.memory,[]);
 for(const expectedMemoryRevision of [undefined,0,1,'2'])assert.throws(()=>applyInvisibleAction(forgotten,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision}),/autre appareil/);
 const withdrawn=applyInvisibleAction(forgotten,{type:'invisibleMemoryConsent',enabled:false,expectedMemoryRevision:0});assert.equal(withdrawn.memoryRevision,3);assert.equal(withdrawn.memoryConsent,false);
 const renewed=applyInvisibleAction(withdrawn,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision:3});assert.equal(renewed.memoryRevision,4);assert.equal(renewed.memoryConsent,true);assert.deepEqual(renewed.memory,[]);
 const limit=normalizeInvisibleState({...renewed,memoryRevision:INVISIBLE_MEMORY_REVISION_LIMIT});
 assert.throws(()=>applyInvisibleAction(limit,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision:INVISIBLE_MEMORY_REVISION_LIMIT}),/plus être activée/);
 assert.equal(applyInvisibleAction(limit,{type:'invisibleForget'}).memoryRevision,INVISIBLE_MEMORY_REVISION_LIMIT);
 assert.equal(applyInvisibleAction(limit,{type:'invisibleMemoryConsent',enabled:false}).memoryConsent,false);
});
