import test from 'node:test';
import assert from 'node:assert/strict';
import {createHubLifeInteraction,hubLifeAction} from '../src/world/hub/life-interaction.js';
import {contextActions} from '../src/world/interaction-system.js';
import {hubNpcSchedule} from '../src/world/hub/npc-schedule.js';
import {hubNpcActivity} from '../src/world/hub/npc-activity.js';
import {hubNpcSimulation,hubNpcNeeds} from '../src/world/hub/npc-motion.js';
import fs from 'node:fs';

const seat={id:'room:seat',type:'hubLifeObject',kind:'seat',x:4,z:6,seatX:4,seatZ:7,seatHeight:.81,heading:180,name:'Fauteuil',range:3.2};

test('sitting is physical and restores its reachable approach without mutating a save',()=>{
 const interaction=createHubLifeInteraction(),origin={x:4,z:5},save={position:{...origin},xp:10},before=JSON.stringify(save);
 assert.equal(interaction.start(seat,origin,0,10),true);
 const first=interaction.sample(10),end=interaction.sample(11);
 assert.equal(first.z,origin.z);assert.equal(end.z,seat.seatZ);assert.equal(end.pose,'Sit');assert.equal(end.seatHeight,.81);
 assert.deepEqual(interaction.finish(),origin);assert.equal(interaction.sample(12),null);assert.equal(JSON.stringify(save),before);
});

test('invalid and distant furniture never teleports the character and reduced motion removes the transition',()=>{
 const interaction=createHubLifeInteraction({reducedMotion:true});
 assert.equal(interaction.start(seat,{x:40,z:50}),false);
 assert.equal(interaction.start({...seat,seatHeight:undefined},{x:4,z:5}),false);
 assert.equal(interaction.start(seat,{x:4,z:5},0,2),true);
 assert.equal(interaction.sample(2).z,seat.seatZ);
 interaction.dispose();assert.equal(interaction.active,false);
});

test('reading and examining are standing poses with meaningful contextual verbs',()=>{
 const interaction=createHubLifeInteraction();
 for(const [kind,action,pose] of [['read','read','Read'],['examine','inspect','Inspect']]){
  const item={...seat,kind};assert.equal(hubLifeAction(item),action);assert.equal(contextActions(item)[0].id,action);
  assert.ok(interaction.start(item,{x:4,z:5}));assert.equal(interaction.sample(1).pose,pose);assert.equal(interaction.sample(1).seatHeight,0);interaction.finish();
 }
});

test('residents work at their own real service and take shelter in rain snow and storms',()=>{
 for(const weather of ['rain','heavy_rain','storm','snow']){
  const routine=hubNpcSchedule('lyna_amrane',{hour:13,weather});
  assert.equal(routine.activity,'abri météo');assert.equal(routine.activityBuildingId,'shipyard_3b');assert.equal(routine.shelter,true);assert.equal(routine.indoor,true);
 }
 assert.equal(hubNpcSchedule('ines_varga',{hour:10}).activityBuildingId,'memory_archives');
 assert.match(hubNpcSchedule('ines_varga',{hour:10}).activityLabel,/enregistrements/);
 const routine=hubNpcSchedule('the_conductor',{hour:23,weather:'rain'});assert.equal(routine.rare,false);assert.equal(routine.activityBuildingId,'train_station');
});

test('reduced motion preserves the resident work anchor and removes idle root sway',()=>{
 const npc={id:'ines_varga',activity:'travail',homeX:12,homeZ:-8};
 const a=hubNpcSimulation(npc,1,{distance:12,reducedMotion:true}),b=hubNpcSimulation(npc,20,{distance:12,reducedMotion:true});
 assert.equal(a.x,12);assert.equal(a.z,-8);assert.equal(a.heading,b.heading);assert.equal(a.state,'Work');
});


test('active civic events interrupt resident routines without changing persistent saves',()=>{
 const breakdown={id:'train_breakdown',district:'docks',effect:'mission de réparation et navettes de remplacement'};
 const emergency=hubNpcSchedule('lyna_amrane',{hour:16,activeEvents:[breakdown]});
 assert.equal(emergency.activity,'événement');
 assert.equal(emergency.eventId,'train_breakdown');
 assert.equal(emergency.district,'docks');
 assert.equal(emergency.movementIntent,'respond');
 assert.equal(emergency.activityBuildingId,null);
 const activity=hubNpcActivity({...emergency,id:'lyna_amrane'},{hour:16});
 assert.equal(activity.id,'event');
 assert.equal(activity.pace,'focused');
 assert.match(activity.detail,/réparation/);
 const market=hubNpcSchedule('nora_khelifi',{hour:20,activeEvents:[{id:'market_night',district:'commerce',effect:'vendeurs et personnages rares'}]});
 assert.equal(market.activity,'événement');
 assert.equal(market.movementIntent,'gather');
 assert.equal(market.social,true);
});


test('civic responders visibly leave routine while gatherings become social activity',()=>{
 const emergency={id:'lyna_amrane',npcId:'lyna_amrane',activity:'événement',movementIntent:'respond',homeX:4,homeZ:7};
 const response=hubNpcSimulation(emergency,32,{distance:8,playerVisible:true});
 assert.equal(response.state,'Investigate');assert.equal(response.moving,true);
 assert.ok(hubNpcNeeds(emergency,32).purpose<hubNpcNeeds({...emergency,activity:'repos',movementIntent:null},32).purpose);
 const gathering={id:'nora_khelifi',npcId:'nora_khelifi',activity:'événement',movementIntent:'gather',homeX:-4,homeZ:2};
 const social=hubNpcSimulation(gathering,32,{distance:8,playerVisible:true});
 assert.equal(social.state,'Talk');assert.equal(social.moving,false);
 assert.ok(hubNpcNeeds(gathering,32).social<hubNpcNeeds({...gathering,activity:'promenade',movementIntent:null},32).social);
});

test('live scene refresh keeps moving residents in place while copying the full schedule and event state',()=>{
 const source=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(source,/Object\.assign\(actor\.item,scheduleState,\{homeX:nextX,homeZ:nextZ\}\)/);
 assert.match(source,/lastHubScheduleKey/);
 assert.match(source,/hubScheduleClockKey/);
 assert.match(source,/refreshHubScheduleState\(\)/);
});
