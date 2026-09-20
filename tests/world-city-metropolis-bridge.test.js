import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

function completeFirstSteps(){
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});
 save=applyWorldAction(save,{type:'hubBuildingVisit',id:'heritage_welcome'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-20'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 return applyWorldAction(save,{type:'hubMissionClaim',id:'first_steps'});
}

test('First Foundation advances only from verified City proof stages',()=>{
 let save=completeFirstSteps();
 save=applyWorldAction(save,{type:'hubMissionStart',id:'first_foundation'});
 const local=applyWorldAction(save,{type:'hubCitySync'});
 assert.equal(local.hub.missions.first_foundation.completedObjectives,0);
 save=applyWorldAction(save,{type:'hubCityProof',proof:{founded:true,synced:false,built:false}});
 assert.equal(save.hub.missions.first_foundation.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubCityProof',proof:{founded:true,synced:true,built:false}});
 assert.equal(save.hub.missions.first_foundation.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubCityProof',proof:{founded:true,synced:true,built:true}});
 assert.equal(save.hub.missions.first_foundation.status,'completed');
});

test('world-engine derives City proof server-side and refuses a client proof',()=>{
 const edge=readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8');
 assert.match(edge,/async function cityProof\(uid:string\)/);
 assert.match(edge,/nexus_cities\?user_id=eq\./);
 assert.match(edge,/nexus_city_placements\?city_id=eq\./);
 assert.match(edge,/nexus_city_journal\?user_id=eq\./);
 assert.match(edge,/entry\.action\.type==='hubCityProof'/);
 assert.match(edge,/entry\.action\.type==='hubCitySync'\?\{type:'hubCityProof',proof:await cityProof\(uid\)\}/);
});

test('City 3B writes one durable world synchronization receipt',()=>{
 const city=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
 assert.match(city,/async function markWorldSync\(uid:string\)/);
 assert.match(city,/action=eq\.world_sync/);
 assert.match(city,/action:'world_sync'/);
 assert.match(city,/await markWorldSync\(uid\)/);
});

test('embedded City panel asks the World to reconcile verified progress',()=>{
 const panel=readFileSync(new URL('../src/city/City3BPanel.jsx',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
 assert.match(panel,/onWorldCitySync/);
 assert.match(panel,/worldSyncRef\.current/);
 assert.match(world,/type:'hubCitySync'/);
 assert.match(world,/onWorldCitySync=\{syncCityProgress\}/);
});
