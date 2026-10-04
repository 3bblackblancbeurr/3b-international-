import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {worldEntryPolicy,isUnresolvedWorldEncounter} from '../src/world/entry-policy.js';
import {advancePortalCrossing,initialPortalCrossingState} from '../src/world/portal-crossing.js';
import {ambientCrowdBudget} from '../src/world/ambient-crowd.js';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

const save=(region='france',encounter=null)=>({region,adventure:{encounter}});

test('normal World 3B openings enter the Nexus through the authoritative visit action',()=>{
 assert.deepEqual(worldEntryPolicy(save('hub')), {kind:'nexus',region:'hub',resumeEncounter:false,action:null});
 assert.deepEqual(worldEntryPolicy(save('france')), {kind:'nexus',region:'hub',resumeEncounter:false,action:{type:'visit',region:'hub'}});
 assert.deepEqual(worldEntryPolicy(save('france',{result:'victory'})), {kind:'nexus',region:'hub',resumeEncounter:false,action:{type:'visit',region:'hub'}});
 const country=applyWorldAction(blankSave(),{type:'visit',region:'france'}),plan=worldEntryPolicy(country),nexus=applyWorldAction(country,plan.action);
 assert.equal(nexus.region,'hub');assert.equal(nexus.adventure.encounter,null);
});

test('unfinished combat and bonding encounters resume without being erased',()=>{
 for(const encounter of [{result:null,region:'france',field:{p:{x:4,z:7}}},{result:'calm',region:'maroc',pact:true,pactStep:1}]){
  assert.equal(isUnresolvedWorldEncounter(encounter),true);
  assert.deepEqual(worldEntryPolicy(save(encounter.region,encounter)),{kind:'resume-encounter',region:encounter.region,resumeEncounter:true,action:null});
 }
 for(const result of ['victory','recruited','missed','defeat'])assert.equal(isUnresolvedWorldEncounter({result}),false);
});

test('physical portal crossing fires once and rearms only after leaving the exit radius',()=>{
 const portals=[{id:'france',type:'portal',x:0,z:0}],outside={x:5,z:0},inside={x:2.8,z:0};
 let state=initialPortalCrossingState(),step=advancePortalCrossing(state,outside,portals);assert.equal(step.entered,null);state=step.state;
 step=advancePortalCrossing(state,inside,portals);assert.equal(step.entered.id,'france');state=step.state;
 for(const point of [{x:0,z:0},{x:3.6,z:0},{x:2.4,z:0}]){step=advancePortalCrossing(state,point,portals);assert.equal(step.entered,null);state=step.state;}
 step=advancePortalCrossing(state,{x:4,z:0},portals);assert.equal(step.entered,null);assert.equal(step.state.latchedPortalId,null);state=step.state;
 step=advancePortalCrossing(state,inside,portals);assert.equal(step.entered.id,'france');
 assert.equal(advancePortalCrossing(initialPortalCrossingState(),{x:0,z:5},[{id:'hub',x:0,z:20}]).entered,null,'country spawn must not retrigger its return portal');
});

test('ambient crowd budgets stay inside mobile targets and stop motion when requested',()=>{
 const medium=ambientCrowdBudget({mode:'detail',deviceMemory:4,coarsePointer:true,viewport:844}),high=ambientCrowdBudget({mode:'detail',deviceMemory:8,coarsePointer:true,viewport:1366}),desktop=ambientCrowdBudget({mode:'detail',deviceMemory:8,coarsePointer:false,viewport:1440});
 assert.deepEqual([medium.profile,high.profile,desktop.profile],['mobileMedium','mobileHigh','desktop']);
 assert.ok(medium.count<=35);assert.ok(high.count<=60);assert.ok(desktop.count<=100);
 assert.ok(ambientCrowdBudget({mode:'fluid',deviceMemory:4,coarsePointer:true}).count<medium.count);
 assert.deepEqual(ambientCrowdBudget({reducedMotion:true}),{profile:'mobileMedium',count:24,updateHz:0,maxDistance:210,moving:false});
});

test('entry, physical crossing and instanced crowd policies are wired into the live world',()=>{
 const page=fs.readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8'),scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8'),crowd=fs.readFileSync(new URL('../src/world/ambient-crowd.js',import.meta.url),'utf8');
 assert.match(page,/worldEntryPolicy\(result\.data\)/);assert.match(page,/recordWorldAction\(uid,data,entry\.action\)/);
 assert.match(scene,/advancePortalCrossing\(portalCrossing,position/);assert.match(scene,/createAmbientCrowd\(root,items/);
 assert.match(crowd,/new THREE\.InstancedMesh/);
});
