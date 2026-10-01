import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {hubRuntime,HUB_MISSIONS,HUB_NPCS} from '../src/world/hub/runtime-data.js';
import {hubMissionEffect,hubDistrictEffects,HUB_MISSION_EFFECTS} from '../src/world/hub/mission-effects.js';
import {createHubMissionEffectVisual} from '../src/world/hub/mission-effect-visuals.js';
import {hubBuildingService,HUB_BUILDING_SERVICES,HUB_BUILDING_PANEL_TARGETS,HUB_BUILDING_ROUTE_TARGETS} from '../src/world/hub/building-services.js';
import {normalizeHubDesign,hubDesignSvg,HUB_SERVICE_LIMITS} from '../src/world/hub/services-state.js';
import {hubDialogueScene} from '../src/world/hub/dialogue-v3.js';
import {hubNpcSimulation} from '../src/world/hub/npc-motion.js';
import {hubJourneyDuration,hubJourneyReceipt} from '../src/world/hub/transport-journey.js';
import {hubScheduleKey} from '../src/world/hub/npc-schedule.js';
import {hubDialogueIntentResponse,hubDialogueIntents} from '../src/world/hub/dialogue-intents.js';

export function welcome(){let s=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});for(const action of [{type:'hubBuildingVisit',id:'heritage_welcome'},{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-30'},{type:'hubDistrictVisit',id:'heritage_square'},{type:'hubMissionClaim',id:'first_steps'}])s=applyWorldAction(s,action);return s;}
const physical=(s,id,actions)=>actions.reduce((save,actionId)=>applyWorldAction(save,{type:'hubMissionAction',missionId:id,actionId}),applyWorldAction(s,{type:'hubMissionStart',id}));
const design=normalizeHubDesign({kind:'textile',title:'Le Lien',baseColor:'#123456',accentColor:'#d4b574',pattern:'broderie',style:'mystique'});

test('late mission accepts permanent secret evidence and cannot repay it',()=>{
 let s=welcome();s=physical(s,'first_echo',['signal:locate','memory:restore','beacon:activate']);s=applyWorldAction(s,{type:'hubMissionClaim',id:'first_echo'});
 // The very first reverse-order clue is 3: it must not prematurely finish the objective.
 s=applyWorldAction(s,{type:'hubMissionStart',id:'broken_record'});
 s=applyWorldAction(s,{type:'hubSecretStep',id:'secret_archive_reverse',step:3});assert.equal(s.hub.missions.broken_record.completedObjectives,0);
 for(const step of [2,1,0])s=applyWorldAction(s,{type:'hubSecretStep',id:'secret_archive_reverse',step});assert.equal(s.hub.missions.broken_record.completedObjectives,1);
 s=applyWorldAction(s,{type:'hubSecretUnlock',id:'secret_archive_reverse'});assert.equal(s.hub.missions.broken_record.status,'completed');
 const late=normalizeSave({...s,hub:{...s.hub,missions:{...s.hub.missions,broken_record:{status:'available',completedObjectives:0}}}}),started=applyWorldAction(late,{type:'hubMissionStart',id:'broken_record'});
 assert.equal(started.hub.missions.broken_record.status,'completed');assert.equal(started.xp,late.xp);assert.equal(started.shards,late.shards);
 const claimed=applyWorldAction(started,{type:'hubMissionClaim',id:'broken_record'});assert.throws(()=>applyWorldAction(claimed,{type:'hubMissionClaim',id:'broken_record'}),/Récompense indisponible/);
});

test('local foundation requires three ordered actions and survives reload without any City proof',()=>{
 let s=applyWorldAction(welcome(),{type:'hubMissionStart',id:'first_foundation'});
 assert.throws(()=>applyWorldAction(s,{type:'hubMissionStep',id:'first_foundation',objective:0}),/uniquement par tes actions/);
 assert.throws(()=>applyWorldAction(s,{type:'hubMissionAction',missionId:'first_foundation',actionId:'foundation:place'}),/invalide/);
 s=applyWorldAction(s,{type:'hubMissionAction',missionId:'first_foundation',actionId:'site:survey'});
 s=normalizeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.hub.missions.first_foundation.completedObjectives,1);
 for(const actionId of ['path:plan','foundation:place'])s=applyWorldAction(s,{type:'hubMissionAction',missionId:'first_foundation',actionId});
 assert.equal(s.hub.missions.first_foundation.status,'completed');assert.ok(hubMissionEffect(s.hub,'first_foundation'));
 const before=s.xp;s=applyWorldAction(s,{type:'hubMissionClaim',id:'first_foundation'});assert.equal(s.xp,before+40);assert.throws(()=>applyWorldAction(s,{type:'hubMissionClaim',id:'first_foundation'}),/Récompense indisponible/);
 assert.deepEqual(hubDistrictEffects(s.hub),hubDistrictEffects(normalizeSave(JSON.parse(JSON.stringify(s))).hub));
});

test('all canonical mission consequences come from complete rows and stay within a finite visual budget',()=>{
 const s=blankSave();assert.deepEqual(Object.keys(HUB_MISSION_EFFECTS).sort(),HUB_MISSIONS.map(m=>m.id).sort());
 assert.equal(hubMissionEffect({missions:{first_echo:{status:'completed',completedObjectives:NaN}}},'first_echo'),null);
 for(const mission of HUB_MISSIONS)s.hub.missions[mission.id]={...s.hub.missions[mission.id],status:'completed',completedObjectives:mission.objectives.length};
 const runtime=hubRuntime('mobileMedium',{hour:14,weather:'clear',hubState:s.hub}),changes=runtime.items.filter(item=>item.type==='hubRestoration');assert.equal(changes.length,20);
 const root=new THREE.Group(),geometry={box:new THREE.BoxGeometry(),cylinder:new THREE.CylinderGeometry(1,1,1,20),sphere:new THREE.IcosahedronGeometry(1,1)};let meshes=0;
 for(const item of changes){assert.ok(Number.isFinite(item.x)&&Number.isFinite(item.z));assert.equal(item.range,-1);createHubMissionEffectVisual(item,{root,geometry,material:()=>new THREE.MeshStandardMaterial(),groundY:()=>0});}
 root.traverse(object=>{if(object.isMesh)meshes++;assert.notEqual(object.isLight,true);});assert.ok(meshes<250,meshes+' restoration meshes');
 for(let i=0;i<changes.length;i++)for(let j=i+1;j<changes.length;j++)if(changes[i].district===changes[j].district)assert.ok(Math.hypot(changes[i].x-changes[j].x,changes[i].z-changes[j].z)>10,'restoration exhibits overlap');
 for(const g of Object.values(geometry))g.dispose();
});

test('mobile NPC budget reserves a place for the current mission objective after schedule filtering',()=>{
 const s=blankSave();s.hub.missions.wagon_eight={...s.hub.missions.wagon_eight,status:'active',completedObjectives:1};
 const night=hubRuntime('mobileMedium',{hour:23,weather:'clear',hubState:s.hub});assert.equal(night.meta.npcsActive,18);assert.ok(night.items.some(i=>i.npcId==='the_conductor'));
 const day=hubRuntime('mobileMedium',{hour:14,weather:'clear',hubState:s.hub});assert.equal(day.items.some(i=>i.npcId==='the_conductor'),false,'rare night NPC stays night-only');
 const s2=applyWorldAction(welcome(),{type:'hubMissionStart',id:'first_foundation'}),mobile=hubRuntime('mobileMedium',{hour:13,weather:'heavy_rain',hubState:s2.hub}),elio=mobile.items.find(i=>i.npcId==='elio_romano');assert.ok(elio);assert.equal(elio.district,'city3b_portal');assert.equal(elio.shelter,true);
 assert.equal(hubNpcSimulation(elio,42,{distance:10}).state,'Work');
 const dialogue=hubDialogueScene(elio,{hour:13,weather:'heavy_rain',missionState:s2.hub.missions});assert.equal(dialogue.activity.id,'mission');assert.match(dialogue.text,/Première Fondation|terrain/);assert.doesNotMatch(dialogue.text,/synchronise|fonde ta ville/);
});

test('NPC routines cross hour and day boundaries and keep canonical Guardian identity',()=>{
 assert.notEqual(hubScheduleKey(new Date(2026,8,30,21,59),'clear'),hubScheduleKey(new Date(2026,8,30,22,0),'clear'));
 assert.notEqual(hubScheduleKey(new Date(2026,8,30,1),'clear'),hubScheduleKey(new Date(2026,9,1,1),'clear'));
 const s=welcome();s.seals=['france'];const mael=hubRuntime('mobileMedium',{hour:10,weather:'clear',hubState:s.hub,seals:s.seals}).items.find(i=>i.npcId==='mael_rivière');assert.equal(mael.guardianRegion,'france');assert.equal(mael.guardianLiberated,true);
 assert.ok(hubDialogueIntents(mael,s,{hour:10}).some(option=>option.id==='guardian'));assert.match(hubDialogueIntentResponse(mael,'guardian',s,{hour:10}).text,/Céliane/);
 const result=hubDialogueIntentResponse(mael,'opinion',s,{hour:10});assert.match(result.text,/pupitre/);
});

test('services persist cosmetics and never mint World or loyalty rewards',()=>{
 let s=blankSave(),before={xp:s.xp,shards:s.shards,seals:s.seals};
 s=applyWorldAction(s,{type:'hubService',operation:'saveDesign',design});s=applyWorldAction(s,{type:'hubService',operation:'saveTribute',name:'Mémoire commune',message:'<script>alert(1)</script>'});s=applyWorldAction(s,{type:'hubService',operation:'careAnimal',animal:'wolf_signal',task:'water'});
 const once=s.hub.services.care.wolf_signal.length;s=applyWorldAction(s,{type:'hubService',operation:'careAnimal',animal:'wolf_signal',task:'water'});assert.equal(s.hub.services.care.wolf_signal.length,once);
 assert.throws(()=>applyWorldAction(s,{type:'hubService',operation:'careAnimal',animal:'wolf_signal',task:'observe'}),/protège/);
 assert.deepEqual({xp:s.xp,shards:s.shards,seals:s.seals},before);assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(s))).hub.services,s.hub.services);
 assert.throws(()=>applyWorldAction(s,{type:'hubService',operation:'saveDesign',design:{...design,pattern:'__proto__'}}),/Motif inconnu/);
 assert.throws(()=>applyWorldAction(s,{type:'hubTextileWear',design}),/personnage/);
 s=applyWorldAction(s,{type:'avatar',avatar:{...s.adventure.avatar,created:true,name:'Ari'}});s=applyWorldAction(s,{type:'hubTextileWear',design});assert.equal(s.adventure.avatar.fabricColor,'#123456');assert.equal(s.adventure.avatar.pattern,'broderie');assert.equal(s.adventure.avatar.style,'mystique');
 assert.throws(()=>applyWorldAction(s,{type:'hubTextileWear',design:{...design,kind:'vehicle'}}),/textile/);
 assert.doesNotMatch(hubDesignSvg({...design,title:'<script>X</script>'}),/<script>/);
});

test('all 19 buildings expose valid useful actions without inactive IA routes',()=>{
 const save=blankSave();assert.equal(Object.keys(HUB_BUILDING_SERVICES).length,19);
 for(const buildingId of Object.keys(HUB_BUILDING_SERVICES)){const service=hubBuildingService({buildingId},save);assert.ok(service.actions.length);for(const action of service.actions)assert.ok((action.kind==='panel'?HUB_BUILDING_PANEL_TARGETS:HUB_BUILDING_ROUTE_TARGETS).includes(action.target),buildingId+' '+action.target);}
 const office=hubBuildingService({buildingId:'city_planning_office'},save);assert.ok(office.actions.some(a=>a.kind==='route'&&a.target==='city3b'));assert.doesNotMatch(office.hook,/synchroniser/);
 assert.ok(hubBuildingService({buildingId:'ai_textile_lab'},save).actions.some(a=>a.target==='service:textile'));
 assert.equal(HUB_SERVICE_LIMITS.designs,24);
});

test('transport receipt is emitted only at arrival, with no departure proof',()=>{
 const duration=hubJourneyDuration('boat',{x:0,z:0},{x:380,z:0});assert.equal(duration,10000);
 const ride={started:100,duration,transport:'boat',fromDistrict:'docks',toDistrict:'gardens',night:true,dateKey:'2026-09-30'};assert.equal(hubJourneyReceipt(ride,10099),null);assert.equal(hubJourneyReceipt(null,20000),null);assert.equal(hubJourneyReceipt(ride,10100).to,'gardens');
 const scene=readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8'),page=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');assert.match(scene,/rebuild\(region,\{preserve:true\}\)/);assert.match(scene,/onHubTransportComplete\?\.\(receipt\)/);
 const departure=page.slice(page.indexOf("if(item.type==='hubTransport')"),page.indexOf("if(item.type==='hubEvent')"));assert.doesNotMatch(departure,/act\(/);
});
