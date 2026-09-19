import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {buildHubRuntimeItems} from '../src/world/hub/runtime.js';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..','src','world','hub','data');
const read=(name)=>JSON.parse(readFileSync(join(root,name),'utf8'));
const plan=read('hub-master-plan-v2.json'),npcs=read('npcs-v1.json'),missions=read('missions-v1.json'),events=read('events-v1.json'),secrets=read('secrets-v1.json');

test('First Steps progresses from district, train ride and return instead of marker spam',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransit',id:'train:heritage_square'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 assert.equal(save.hub.missions.first_steps.status,'completed');
});

test('First Echo progresses through Ines, Archives and the hidden archive clue',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_echo'});
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'ines_varga'});
 assert.equal(save.hub.missions.first_echo.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'archives'});
 assert.equal(save.hub.missions.first_echo.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_archive_reverse'});
 assert.equal(save.hub.missions.first_echo.status,'completed');
});

test('Boat Without Flag requires a boat ride then the abandoned quay secret',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'boat_without_flag'});
 save=applyWorldAction(save,{type:'hubTransit',id:'boat:docks'});
 assert.equal(save.hub.missions.boat_without_flag.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_abandoned_quay'});
 assert.equal(save.hub.missions.boat_without_flag.status,'completed');
});

test('Rooftops Circle requires Arena, two distinct ziplines and tower arrival',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'rooftops_circle'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'arena'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransit',id:'zipline:Z3'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransit',id:'zipline:Z4'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'broken_circle_tower'});
 assert.equal(save.hub.missions.rooftops_circle.status,'completed');
});

test('Hub rejects invented interactions server-side',()=>{
 const save=blankSave();
 assert.throws(()=>applyWorldAction(save,{type:'hubDistrictVisit',id:'fake'}),/Quartier Hub inconnu/);
 assert.throws(()=>applyWorldAction(save,{type:'hubNpcTalk',id:'fake'}),/Personnage Hub inconnu/);
 assert.throws(()=>applyWorldAction(save,{type:'hubTransit',id:'zipline:Z99'}),/Transport Hub inconnu/);
});

test('Runtime materializes 3 telepherics and 6 ziplines with destinations',()=>{
 const runtime=buildHubRuntimeItems({plan,npcs,missions,events,secrets,profile:'desktop'});
 const tele=runtime.items.filter(item=>item.type==='hubTransport'&&item.transport==='telepheric');
 const zip=runtime.items.filter(item=>item.type==='hubTransport'&&item.transport==='zipline');
 assert.equal(tele.length,3);assert.equal(zip.length,6);
 for(const item of [...tele,...zip]){
   assert.ok(item.transitId);
   assert.ok(Number.isFinite(item.targetX)&&Number.isFinite(item.targetZ));
   assert.ok(item.targetDistrict);
 }
});
