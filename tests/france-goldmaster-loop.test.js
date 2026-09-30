import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {chapterState} from '../src/world/chapters.js';
import {GUARDIAN_VALUES,guardianHubPresence} from '../src/world/guardian-values.js';
import {hubRuntime} from '../src/world/hub/runtime-data.js';
import {prepareRealGuardian,realCombatInput,playRealGuardian,finishRealCountry} from './helpers/real-world-journey.js';

test('France plays real Justice/Céliane combat, resumes mid-fight and transforms the Cité',()=>{
 const prepared=prepareRealGuardian('france');let s=prepared.save;
 assert.equal(chapterState(s,'france').restored,2);
 assert.equal(GUARDIAN_VALUES.france.name,'Céliane');assert.equal(GUARDIAN_VALUES.france.value,'Justice');
 assert.equal(s.adventure.values.france.completed,true);
 assert.equal(s.adventure.encounter.enemy,s.adventure.encounter.enemyMax);
 assert.ok(s.adventure.encounter.enemyMax>=120);assert.equal(s.adventure.encounter.boss,true);
 assert.deepEqual(s.seals,[]);
 // Wind-up advances on fixed ticks independently of an outgoing attack.
 for(let i=0;i<20;i++)s=applyWorldAction(s,realCombatInput(s.adventure.encounter));
 assert.equal(s.adventure.encounter.result,null);assert.ok(s.adventure.encounter.field.time>=2000);
 const restored=normalizeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.adventure.encounter,s.adventure.encounter);
 const uninterrupted=playRealGuardian(s),resumed=playRealGuardian(restored);
 assert.equal(resumed.save.adventure.encounter.result,'victory');
 assert.deepEqual(resumed.commands,uninterrupted.commands);
 assert.deepEqual(resumed.save.adventure.encounter,uninterrupted.save.adventure.encounter);
 const full=playRealGuardian(prepared.save);
 assert.ok(full.observed.guards>=2);assert.ok(full.observed.impacts>=2);
 assert.ok(full.observed.verifiedHits>=1);assert.ok(full.observed.recoveryHits>=2);
 assert.ok(full.save.adventure.encounter.hp>0);assert.ok(full.save.adventure.encounter.hp<full.save.adventure.encounter.maxHP);
 s=resumed.save;assert.equal(s.adventure.encounter.enemy,0);assert.equal(s.adventure.encounter.rewarded,true);
 assert.deepEqual(s.seals,['france']);
 const reward={xp:s.xp,shards:s.shards,wins:s.wins};
 assert.throws(()=>applyWorldAction(s,{type:'field',x:0,z:0,kind:'strike'}),/terminée/);
 assert.deepEqual({xp:s.xp,shards:s.shards,wins:s.wins},reward);
 s=applyWorldAction(s,{type:'restore'});assert.equal(chapterState(s,'france').restored,3);
 const inaugurated={xp:s.xp,shards:s.shards};
 s=applyWorldAction(s,{type:'restore'});assert.deepEqual({xp:s.xp,shards:s.shards},inaugurated);
 s=applyWorldAction(s,{type:'visit',region:'hub'});s=normalizeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.region,'hub');assert.equal(s.adventure.encounter,null);
 const returned=guardianHubPresence(s.seals,['france']).find(g=>g.region==='france');
 assert.equal(returned.name,'Céliane');assert.equal(returned.value,'Justice');
 const hub=hubRuntime('desktop',{seals:s.seals,restoredRegions:['france'],storyProgress:true,hubState:s.hub,weather:'clear',hour:14,day:2,dateKey:'2026-09-30'});
 assert.equal(hub.meta.fragmentCount,1);assert.equal(hub.meta.evolutionStage,1);assert.equal(hub.meta.milestone.id,'circle_heartbeat');
 const platform=hub.items.find(item=>item.type==='hubHeritagePlatform'&&item.regionId==='france');
 assert.equal(platform.restored,true);assert.equal(platform.liberated,true);assert.ok(platform.glow>.5);
 const celiane=hub.items.find(item=>item.type==='hubGuardian'&&item.region==='france');
 assert.equal(celiane.name,'Céliane');assert.equal(celiane.value,'Justice');
});

test('eight distinct puzzles, values and real guardians restore all eight realms without forged victories',()=>{
 let s=blankSave();const inputs=new Set(),mechanics=new Set();
 for(const region of ['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie']){
  const journey=finishRealCountry(region,s);s=normalizeSave(JSON.parse(JSON.stringify(journey.save)));
  assert.equal(chapterState(s,region).restored,3,region);assert.equal(s.adventure.values[region].completed,true,region);
  assert.ok(s.seals.includes(region),region);assert.equal(s.region,'hub');
  assert.ok(journey.observed.recoveryHits>0,region);
  assert.ok(journey.commands.every(command=>!('enemy'in command)&&!('hp'in command)&&!('result'in command)),region);
  inputs.add(JSON.stringify(journey.commands.filter(command=>command.type==='puzzleStep').map(command=>command.index)));
  mechanics.add(GUARDIAN_VALUES[region].value);
 }
 assert.equal(inputs.size,8);assert.equal(mechanics.size,8);assert.equal(new Set(s.seals).size,8);
 assert.equal(s.adventure.finished,false,'restoring realms never automatically wins against the Oubli');
 assert.equal(guardianHubPresence(s.seals,s.seals).length,8);
});
