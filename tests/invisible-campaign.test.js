import test from 'node:test';
import assert from 'node:assert/strict';
import {INVISIBLE_EPISODE,INVISIBLE_EPISODES,INVISIBLE_EPISODE_BY_ID,INVISIBLE_CONVERGENCE,getInvisibleEpisode} from '../src/world/invisible/catalog.js';
import {blankInvisibleState,normalizeInvisibleState,applyInvisibleAction,invisibleEpisodeProgress,invisibleCompletedFragments,invisibleCampaignSummary} from '../src/world/invisible/progression.js';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';

const expectedCities={france:'Thonon-les-Bains',algerie:'Alger',maroc:'Rabat',tunisie:'Tunis',espagne:'Barcelone',italie:'Rome',turquie:'Istanbul',estonie:'Tallinn'};
const solve=(save,episode)=>episode.points.reduce((state,point)=>applyWorldAction(state,{type:'invisibleAnswer',episodeId:episode.id,id:point.id,answer:point.riddle.options[0]}),applyWorldAction(save,{type:'invisibleStart',episodeId:episode.id}));
const chest=(save,episode)=>applyWorldAction(solve(save,episode),{type:'invisibleChest',episodeId:episode.id});
const completeCampaign=save=>INVISIBLE_EPISODES.reduce(chest,save);
const assertSameGameplay=(actual,expected)=>assert.deepEqual({...actual,updatedAt:0},{...expected,updatedAt:0});

test('the campaign supplies 24 original fictional riddles across the eight canonical realms',()=>{
 assert.equal(INVISIBLE_EPISODES.length,8);
 assert.equal(new Set(INVISIBLE_EPISODES.map(episode=>episode.id)).size,8);
 assert.equal(new Set(INVISIBLE_EPISODES.map(episode=>episode.realm)).size,8);
 assert.equal(new Set(INVISIBLE_EPISODES.flatMap(episode=>episode.points.map(point=>point.riddle.question))).size,24);
 assert.equal(INVISIBLE_EPISODE,INVISIBLE_EPISODE_BY_ID['leman-001']);
 for(const id of [undefined,null,'unknown','__proto__','constructor','toString'])assert.equal(getInvisibleEpisode(id),INVISIBLE_EPISODE);
 for(const episode of INVISIBLE_EPISODES){
  assert.equal(getInvisibleEpisode(episode.id),episode);
  assert.equal(episode.city,expectedCities[episode.realm]);
  assert.equal(episode.guardian,GUARDIAN_VALUES[episode.realm].name);
  assert.equal(episode.fragment.value,GUARDIAN_VALUES[episode.realm].value);
  assert.equal(episode.fragment.realm,episode.realm);
  assert.match(episode.fiction,/Fiction/);assert.match(episode.fiction,/aucun fait historique/);
  assert.match(episode.safety,/distance/);assert.match(episode.safety,/public/);
  assert.equal(episode.points.length,3);assert.equal(new Set(episode.points.map(point=>point.id)).size,3);
  assert.ok(Object.isFrozen(episode));
  for(const point of episode.points){
   assert.deepEqual(Object.keys(point.position).sort(),['x','y']);
   assert.ok(point.position.x>=0&&point.position.x<=100&&point.position.y>=0&&point.position.y<=100);
   assert.equal(point.riddle.options.length,3);assert.equal(new Set(point.riddle.options).size,3);
   assert.ok(Object.isFrozen(point.riddle.options));assert.ok(point.story.length>50);
  }
 }
});

test('normalization upgrades a legacy Léman save without moving its progress or restoring missing memory',()=>{
 const legacy={started:true,solved:['rive','balance','preuve'],chestOpened:true,portalOpened:true,memoryConsent:true,memoryRevision:4,memory:[
  {kind:'start',text:'Céliane m’a confié le secret du Léman.'},
  {kind:'riddle:balance',text:'J’ai résolu « Les deux plateaux ».'},
  {kind:'fragment',text:'J’ai retrouvé le Fragment de la Justice dans le coffre virtuel.'},
  {kind:'portal',text:'J’ai activé le portail du royaume de France.'},
 ],mode:'walk'};
 const state=normalizeInvisibleState(legacy);
 assert.equal(state.activeEpisode,'leman-001');assert.equal(state.mode,'walk');
 assert.deepEqual(state.memory,legacy.memory);assert.equal(state.memoryRevision,4);
 assert.equal(state.convergenceCompleted,false);assert.equal(Object.keys(state.journeys).length,7);
 assert.deepEqual(invisibleCompletedFragments(state),['leman-001']);
 for(const episode of INVISIBLE_EPISODES.slice(1))assert.deepEqual(invisibleEpisodeProgress(state,episode.id),{started:false,solved:[],chestOpened:false,portalOpened:false});
 const wrapped=normalizeSave({...blankSave(),invisible:legacy});
 assert.equal(applyWorldAction(wrapped,{type:'invisibleChest'}).xp,wrapped.xp);
 assert.equal(applyWorldAction(wrapped,{type:'invisiblePortal'}).region,'hub');
});

test('each journey validates its own ordered prefix and imported convergence needs all eight chests',()=>{
 const journeys=Object.fromEntries(INVISIBLE_EPISODES.slice(1).map(episode=>[episode.id,{started:true,solved:[episode.points[0].id,episode.points[2].id,episode.points[1].id],chestOpened:true,portalOpened:true,latitude:46,dialogue:'secret'}]));
 journeys['leman-001']={started:true,solved:INVISIBLE_EPISODE.points.map(point=>point.id),chestOpened:true};
 journeys['unknown-001']={started:true,chestOpened:true};
 const input={activeEpisode:'__proto__',journeys,convergenceCompleted:true,memoryConsent:false,memoryRevision:9,memory:[{kind:'dialogue',text:'secret'}]};
 const state=normalizeInvisibleState(input);
 assert.equal(state.activeEpisode,'leman-001');assert.equal(state.started,false);assert.equal(state.chestOpened,false);
 assert.equal(state.convergenceCompleted,false);assert.equal(state.memoryRevision,9);assert.deepEqual(state.memory,[]);
 assert.equal(Object.keys(state.journeys).length,7);
 for(const episode of INVISIBLE_EPISODES.slice(1)){
  assert.deepEqual(state.journeys[episode.id].solved,[episode.points[0].id]);
  assert.equal(state.journeys[episode.id].chestOpened,false);assert.equal(state.journeys[episode.id].portalOpened,false);
  assert.equal('latitude' in state.journeys[episode.id],false);assert.equal('dialogue' in state.journeys[episode.id],false);
 }
 assert.equal(invisibleCampaignSummary(state).completed,0);
 const full=completeCampaign(blankSave()).invisible;
 assert.equal(normalizeInvisibleState({...full,convergenceCompleted:true}).convergenceCompleted,true);
 const oneMissing={...full,journeys:{...full.journeys,'tallinn-001':{...full.journeys['tallinn-001'],chestOpened:false}}};
 assert.equal(normalizeInvisibleState({...oneMissing,convergenceCompleted:true}).convergenceCompleted,false);
});

test('all episodes are selectable immediately and an explicit episode action never moves another journey',()=>{
 let state=blankInvisibleState();
 for(const episode of INVISIBLE_EPISODES){
  state=applyInvisibleAction(state,{type:'invisibleSelectEpisode',episodeId:episode.id});
  assert.equal(state.activeEpisode,episode.id);assert.equal(invisibleEpisodeProgress(state).started,false);
 }
 state=applyInvisibleAction(state,{type:'invisibleSelectEpisode',episodeId:'alger-001'});
 state=applyInvisibleAction(state,{type:'invisibleStart'});
 state=applyInvisibleAction(state,{type:'invisibleAnswer',id:'corde',answer:'Corde'});
 state=applyInvisibleAction(state,{type:'invisibleStart',episodeId:'rome-001'});
 assert.equal(state.activeEpisode,'alger-001');assert.deepEqual(invisibleEpisodeProgress(state).solved,['corde']);
 assert.equal(invisibleEpisodeProgress(state,'rome-001').started,true);assert.equal(state.started,false);
 assert.equal(applyInvisibleAction(state,{type:'invisibleMode',mode:'walk'}).mode,'walk');
 for(const episodeId of ['unknown','__proto__','constructor',42]){
  assert.throws(()=>applyInvisibleAction(state,{type:'invisibleSelectEpisode',episodeId}),/épisode/);
  assert.throws(()=>applyInvisibleAction(state,{type:'invisibleStart',episodeId}),/épisode/);
 }
 assert.deepEqual(state.journeys['alger-001'].solved,['corde']);
});

for(const episode of INVISIBLE_EPISODES)test(episode.city+': three verified riddles, one chest reward and portal replay remain isolated',()=>{
 let save=blankSave();
 assert.throws(()=>applyWorldAction(save,{type:'invisibleAnswer',episodeId:episode.id,id:episode.points[0].id,answer:episode.points[0].riddle.options[0]}),/Commence/);
 save=applyWorldAction(save,{type:'invisibleSelectEpisode',episodeId:episode.id});
 save=applyWorldAction(save,{type:'invisibleStart'});
 assert.throws(()=>applyWorldAction(save,{type:'invisibleChest'}),/trois énigmes/);
 assert.throws(()=>applyWorldAction(save,{type:'invisiblePortal'}),/Fragment/);
 const third=episode.points[2];
 assert.throws(()=>applyWorldAction(save,{type:'invisibleAnswer',id:third.id,answer:third.riddle.options[0]}),/ordre/);
 assert.throws(()=>applyWorldAction(save,{type:'invisibleAnswer',id:'missing',answer:'anything'}),/trace/);
 for(const point of episode.points){
  for(const answer of point.riddle.options.slice(1))assert.throws(()=>applyWorldAction(save,{type:'invisibleAnswer',id:point.id,answer}),/réponse/);
  const before=save;
  save=applyWorldAction(save,{type:'invisibleAnswer',id:point.id,answer:'  '+point.riddle.options[0].toLocaleUpperCase('fr-FR')+'!  '});
  assert.equal(save.xp,before.xp);assert.equal(save.shards,before.shards);
  assertSameGameplay(applyWorldAction(save,{type:'invisibleAnswer',id:point.id,answer:point.riddle.answers[0]}),save);
 }
 assert.deepEqual(invisibleEpisodeProgress(save.invisible).solved,episode.points.map(point=>point.id));
 const before=save,action={type:'invisibleChest',xp:1_000_000,shards:1_000_000};
 save=applyWorldAction(save,action);
 assert.equal(save.xp-before.xp,120);assert.equal(save.shards-before.shards,30);
 const rewardCode=episode.realm==='france'?'invisible_fragment':'invisible_fragment_'+episode.realm;
 assert.deepEqual(worldGlobalRewardIntents(before,save,action),[{rewardCode,eventId:'invisible:'+episode.id,source:'world'}]);
 const replay=applyWorldAction(save,action);
 assert.equal(replay.xp,save.xp);assert.equal(replay.shards,save.shards);
 assert.deepEqual(worldGlobalRewardIntents(save,replay,action),[]);
 const portal=applyWorldAction(replay,{type:'invisiblePortal'});
 assert.equal(invisibleEpisodeProgress(portal.invisible).portalOpened,true);
 assert.deepEqual(portal.seals,[]);assert.deepEqual(portal.visited,[]);assert.equal(portal.region,'hub');
 assert.deepEqual(portal.adventure,before.adventure);
 assertSameGameplay(applyWorldAction(portal,{type:'invisiblePortal'}),portal);
 const resumed=normalizeSave(JSON.parse(JSON.stringify(portal)));
 assert.equal(invisibleEpisodeProgress(resumed.invisible).portalOpened,true);
 assert.equal(applyWorldAction(resumed,{type:'invisibleChest'}).xp,save.xp);
 assert.deepEqual(invisibleCompletedFragments(resumed.invisible),[episode.id]);
});

test('eight separate chests unlock the final riddle and personal convergence rewards exactly once',()=>{
 let save=blankSave();
 for(const episode of INVISIBLE_EPISODES){
  assert.throws(()=>applyWorldAction(save,{type:'invisibleConvergence',answer:'ensemble'}),/huit fragments/);
  const before=save;save=chest(save,episode);
  assert.equal(save.xp-before.xp,120);assert.equal(save.shards-before.shards,30);
 }
 const summary=invisibleCampaignSummary(save.invisible);
 assert.equal(summary.total,8);assert.equal(summary.completed,8);assert.equal(summary.convergenceReady,true);assert.equal(summary.convergenceCompleted,false);
 assert.deepEqual(summary.fragments,INVISIBLE_EPISODES.map(episode=>episode.id));
 assert.equal(summary.episodes.every(row=>row.chestOpened&&!row.portalOpened),true);
 assert.throws(()=>applyWorldAction(save,{type:'invisibleConvergence',answer:'transmet'}),/réponse/);
 assert.throws(()=>applyWorldAction(save,{type:'invisibleConvergence',answer:'e'.repeat(121)}),/réponse/);
 const before=save,action={type:'invisibleConvergence',answer:'  ENSEMBLE!  ',xp:999999,shards:999999};
 save=applyWorldAction(save,action);
 assert.equal(save.xp-before.xp,240);assert.equal(save.shards-before.shards,60);assert.equal(save.invisible.convergenceCompleted,true);
 assert.equal(save.xp-blankSave().xp,1200);assert.equal(save.shards-blankSave().shards,300);
 assert.deepEqual(worldGlobalRewardIntents(before,save,action),[{rewardCode:'invisible_convergence',eventId:'invisible:'+INVISIBLE_CONVERGENCE.id,source:'world'}]);
 assert.deepEqual(save.seals,[]);assert.deepEqual(save.visited,[]);assert.equal(save.region,'hub');
 const resumed=normalizeSave(JSON.parse(JSON.stringify(save))),replay=applyWorldAction(resumed,action);
 assertSameGameplay(replay,resumed);assert.deepEqual(worldGlobalRewardIntents(resumed,replay,action),[]);
 for(const episode of INVISIBLE_EPISODES){
  const repeated=applyWorldAction(replay,{type:'invisibleChest',episodeId:episode.id});
  assert.equal(repeated.xp,replay.xp);assert.deepEqual(worldGlobalRewardIntents(replay,repeated,{type:'invisibleChest',episodeId:episode.id}),[]);
 }
});

test('global consent records only 49 canonical event summaries and forget preserves the entire campaign',()=>{
 let save=applyWorldAction(blankSave(),{type:'invisibleMemoryConsent',enabled:true});
 for(const episode of INVISIBLE_EPISODES){
  save=chest(save,episode);
  save=applyWorldAction(save,{type:'invisiblePortal',episodeId:episode.id,dialogue:'private conversation',latitude:46,longitude:6});
 }
 save=applyWorldAction(save,{type:'invisibleConvergence',answer:'ensemble'});
 const memory=save.invisible.memory;
 assert.equal(memory.length,49);assert.equal(new Set(memory.map(row=>row.kind)).size,49);
 assert.equal(memory[0].kind,'start');assert.equal(memory[0].text,'Céliane m’a confié le secret du Léman.');
 assert.equal(memory.some(row=>row.kind==='fragment'&&row.text==='J’ai retrouvé le Fragment de la Justice dans le coffre virtuel.'),true);
 for(const episode of INVISIBLE_EPISODES.slice(1))assert.equal(memory.filter(row=>row.kind.startsWith('episode:'+episode.id+':')).length,6);
 assert.equal(memory.at(-1).kind,'convergence');
 const poisoned=normalizeInvisibleState({...save.invisible,memory:[...memory,...memory,{kind:'episode:alger-001:fragment',text:'private conversation'},{kind:'dialogue',text:'private conversation'}],latitude:46,dialogue:'private conversation'});
 assert.deepEqual(poisoned.memory,memory);assert.equal('latitude' in poisoned,false);assert.equal('dialogue' in poisoned,false);
 const forgotten=applyWorldAction(save,{type:'invisibleForget'});
 assert.deepEqual(forgotten.invisible.memory,[]);assert.equal(forgotten.invisible.memoryConsent,false);assert.equal(forgotten.invisible.memoryRevision,2);
 assert.deepEqual(invisibleCompletedFragments(forgotten.invisible),invisibleCompletedFragments(save.invisible));
 assert.equal(forgotten.invisible.convergenceCompleted,true);assert.equal(forgotten.xp,save.xp);
 assert.throws(()=>applyWorldAction(forgotten,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision:1}),/autre appareil/);
 let renewed=applyWorldAction(forgotten,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision:2});
 for(const episode of INVISIBLE_EPISODES){renewed=applyWorldAction(renewed,{type:'invisibleStart',episodeId:episode.id});renewed=applyWorldAction(renewed,{type:'invisibleChest',episodeId:episode.id});renewed=applyWorldAction(renewed,{type:'invisiblePortal',episodeId:episode.id});}
 renewed=applyWorldAction(renewed,{type:'invisibleConvergence',answer:'ensemble'});
 assert.deepEqual(renewed.invisible.memory,[],'Replaying completed events never reconstructs withdrawn memory');
 assert.equal(renewed.xp,save.xp);
});

test('consent revision applies across episodes and only future discoveries are remembered after renewed consent',()=>{
 let state=applyInvisibleAction(blankInvisibleState(),{type:'invisibleMemoryConsent',enabled:true});
 state=applyInvisibleAction(state,{type:'invisibleStart',episodeId:'alger-001'});
 assert.deepEqual(state.memory.map(row=>row.kind),['episode:alger-001:start']);
 state=applyInvisibleAction(state,{type:'invisibleForget'});
 state=applyInvisibleAction(state,{type:'invisibleAnswer',episodeId:'alger-001',id:'corde',answer:'corde'});
 state=applyInvisibleAction(state,{type:'invisibleStart',episodeId:'rome-001'});
 assert.deepEqual(state.memory,[]);
 assert.throws(()=>applyInvisibleAction(state,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision:1}),/autre appareil/);
 state=applyInvisibleAction(state,{type:'invisibleMemoryConsent',enabled:true,expectedMemoryRevision:2});
 state=applyInvisibleAction(state,{type:'invisibleAnswer',episodeId:'rome-001',id:'graine',answer:'graine'});
 state=applyInvisibleAction(state,{type:'invisibleAnswer',episodeId:'alger-001',id:'promesse',answer:'promesse'});
 assert.deepEqual(normalizeInvisibleState(state).memory.map(row=>row.kind),['episode:alger-001:riddle:promesse','episode:rome-001:riddle:graine']);
 assert.equal(state.memoryRevision,3);assert.equal(state.started,false);
 const withdrawn=applyInvisibleAction(state,{type:'invisibleMemoryConsent',enabled:false,expectedMemoryRevision:0});
 assert.equal(withdrawn.memoryRevision,4);assert.deepEqual(withdrawn.memory,[]);
});
