import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {TOURNAMENT_ROUNDS,TOURNAMENT_REWARD,tournamentItem,tournamentObstacles,applyTournamentRule} from '../src/world/tournament.js';
import {worldEntryPolicy} from '../src/world/entry-policy.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';
import {fieldMover} from '../src/world/field-world.js';
import {toLandscape} from '../src/world/terrain.js';
import {startField,stepField} from '../src/world/field-combat.js';
import {obstacleDistance} from '../src/world/collision.js';

const enter=()=>applyWorldAction(blankSave(),{type:'visit',region:'france'});
const start=()=>applyWorldAction(enter(),{type:'tournamentStart'});
function tacticalInput(e){
 const f=e.field,dx=f.enemy.x-f.p.x,dz=f.enemy.z-f.p.z,d=Math.hypot(dx,dz)||1;
 let x=d>5?dx/d:0,z=d>5?dz/d:0,kind;
 if(f.phase==='windup'&&f.windup<=500){
  if(e.tournamentRound===1){kind='dodge';x=-dz/d;z=dx/d;}
  else kind='guard';
 }else if(e.tournamentRound<2&&e.tournamentProgress<TOURNAMENT_ROUNDS[e.tournamentRound].goal){
  // Read the attack before trying to finish the exhibition duel.
 }else if(f.phase==='recovery'&&e.focus>=2)kind='power';
 else if(f.phase!=='windup'&&d<7)kind='strike';
 return {type:'field',x,z,...(kind?{kind}:{})};
}
function winRound(initial){
 let save=initial;
 for(let tick=0;tick<1400&&!save.adventure.encounter.result;tick++){
  const previous=save,input=tacticalInput(save.adventure.encounter);save=applyWorldAction(save,input);
  assert.deepEqual(worldGlobalRewardIntents(previous,save,input),[],'a real exhibition transition cannot mint account rewards');
 }
 assert.equal(save.adventure.encounter.result,'victory',JSON.stringify(save.adventure.encounter));
 return save;
}

test('three distinct tournament rounds are won by real combat inputs and grant a single world reward',()=>{
 let save=start();const initialXP=save.xp,initialShards=save.shards,collection=save.collection;
 for(let round=0;round<3;round++){
  assert.equal(save.adventure.encounter.tournamentRound,round);
  assert.equal(save.adventure.encounter.card,TOURNAMENT_ROUNDS[round].card);
  save=winRound(save);
  assert.equal(save.adventure.encounter.tournamentProgress,TOURNAMENT_ROUNDS[round].goal);
  assert.deepEqual(save.seals,[],'exhibitions cannot liberate a Guardian');
  assert.deepEqual(save.collection,collection,'exhibitions cannot recruit their contestants');
  if(round<2){assert.equal(save.xp,initialXP);assert.equal(save.shards,initialShards);save=applyWorldAction(save,{type:'leave'});save=applyWorldAction(save,{type:'tournamentNext'});}
 }
 assert.deepEqual(save.adventure.tournament,{status:'completed',round:3,attempts:3,rewarded:true});
 assert.equal(save.xp-initialXP,TOURNAMENT_REWARD.xp);
 assert.equal(save.shards-initialShards,TOURNAMENT_REWARD.shards);
 for(const type of ['tournamentStart','tournamentNext','field'])assert.throws(()=>applyWorldAction(save,{type,x:0,z:0}),/déjà accompli|temps réel/);
 const restored=normalizeSave(JSON.parse(JSON.stringify(save)));
 assert.deepEqual(restored.adventure.tournament,save.adventure.tournament);
 assert.equal(tournamentItem(restored).done,true);
});

test('active exhibition survives reload and resumes its exact field state',()=>{
 let save=start();
 for(let tick=0;tick<17;tick++)save=applyWorldAction(save,tacticalInput(save.adventure.encounter));
 const restored=normalizeSave(JSON.parse(JSON.stringify(save)));
 assert.deepEqual(restored.adventure.encounter,save.adventure.encounter);
 assert.deepEqual(restored.adventure.tournament,save.adventure.tournament);
 assert.equal(worldEntryPolicy(restored).resumeEncounter,true);
 assert.equal(restored.region,'france');
 assert.equal(winRound(restored).adventure.tournament.status,'between');
});

test('retreat and defeat retain completed rounds and retry starts only the lost round',()=>{
 let save=winRound(start());save=applyWorldAction(save,{type:'tournamentNext'});
 const xp=save.xp,shards=save.shards;
 save=applyWorldAction(save,{type:'leave'});
 assert.equal(save.adventure.tournament.status,'abandoned');assert.equal(save.adventure.tournament.round,1);
 save=applyWorldAction(save,{type:'tournamentStart'});
 for(let tick=0;tick<1600&&!save.adventure.encounter.result;tick++)save=applyWorldAction(save,{type:'field',x:0,z:0});
 assert.equal(save.adventure.encounter.result,'defeat');assert.equal(save.adventure.tournament.status,'defeat');
 save=applyWorldAction(save,{type:'tournamentStart'});
 assert.equal(save.adventure.encounter.tournamentRound,1);assert.equal(save.adventure.encounter.tournamentProgress,0);
 assert.equal(save.adventure.encounter.hp,save.adventure.encounter.maxHP);
 save=applyWorldAction(save,{type:'tournamentAbandon'});
 assert.equal(save.adventure.encounter,null);assert.equal(save.adventure.tournament.status,'abandoned');
 assert.equal(save.xp,xp);assert.equal(save.shards,shards);
});

test('command validation prevents remote starts, skipped rounds, forged wins and turn-based bypass',()=>{
 assert.throws(()=>applyWorldAction(blankSave(),{type:'tournamentStart'}),/porte/);
 assert.throws(()=>applyWorldAction(enter(),{type:'tournamentNext'}),/pas disponible/);
 let save=start();
 assert.throws(()=>applyWorldAction(save,{type:'tournamentNext'}),/rencontre/);
 assert.throws(()=>applyWorldAction(save,{type:'battle',action:'power'}),/temps réel/);
 assert.throws(()=>applyWorldAction(save,{type:'tournamentWin',round:2,result:'victory'}),/non autorisée/);
 save=applyWorldAction(save,{type:'field',x:0,z:0,kind:'guard',result:'victory',tournamentProgress:99});
 assert.equal(save.adventure.encounter.result,null);assert.equal(save.adventure.encounter.tournamentProgress,0);
 assert.equal(save.adventure.tournament.round,0);
});

test('damage alone cannot satisfy the three exhibition rules',()=>{
 const original=start().adventure.encounter;
 for(let round=0;round<3;round++){
  const previous={...original,tournamentRound:round,tournamentProgress:0};
  const next=applyTournamentRule(previous,{...previous,enemy:0,result:'victory',field:{...previous.field,last:'strike'}});
  assert.equal(next.result,null);assert.equal(next.enemy,1);assert.equal(next.tournamentProgress,0);
 }
});

test('older saves gain an available tournament and invalid tournament opponents are discarded',()=>{
 const old=blankSave();delete old.adventure.tournament;
 assert.deepEqual(normalizeSave(old).adventure.tournament,{status:'available',round:0,attempts:0,rewarded:false});
 const save=start();save.adventure.encounter.card='C165';
 assert.equal(normalizeSave(save).adventure.encounter,null);
});

test('exhibition results never announce a Guardian liberation or companion reward',()=>{
 const before=start(),after=winRound(before);
 assert.deepEqual(worldCinematicEvents(before,after,{type:'field',x:0,z:0,kind:'strike'}),[]);
});

test('interrupting an attack with a trap does not count as blocking or evading its impact',()=>{
 const encounter=start().adventure.encounter;
 for(const round of [0,1]){
  const previous={...encounter,tournamentRound:round,field:{...encounter.field,phase:'windup'}};
  const next={...previous,field:{...previous.field,phase:'recovery',last:'trap',guard:600,dodge:100}};
  assert.equal(applyTournamentRule(previous,next).tournamentProgress,0);
 }
});

test('real combat movement and dodges stop at both tournament benches and can pass their ends',()=>{
 const save=start(),item=tournamentItem(save),center=toLandscape('france',item.x,item.z),move=fieldMover(save);
 for(const bench of tournamentObstacles('france',center)){
  const side=Math.sign(bench.x-center.x),origin={x:bench.x-side*5,z:bench.z};
  let encounter={...save.adventure.encounter,field:startField(origin,center)};
  for(let tick=0;tick<12;tick++)encounter=stepField(encounter,{x:side,z:0},move);
  assert.ok(Math.abs(encounter.field.p.x-origin.x)>2.9,'combat must actually advance toward the bench');
  assert.ok(obstacleDistance(encounter.field.p,bench)>=.7,'walking cannot enter the bench footprint');
  assert.ok((encounter.field.p.x-bench.x)*side<0,'walking must stay on the near side');
  encounter=stepField(encounter,{x:side,z:0,kind:'dodge'},move);
  assert.ok(obstacleDistance(encounter.field.p,bench)>=.7,'a dash cannot tunnel through the bench');
  assert.ok((encounter.field.p.x-bench.x)*side<0);
  let outside=move(encounter.field.p,{x:0,z:1},8);
  outside=move(outside,{x:side,z:0},8);
  assert.ok((outside.x-bench.x)*side>3,'combat movement can go around the end instead of becoming trapped');
 }
});
