import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

test('First Steps advances only from the real district/transport/district sequence',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionStep',id:'first_steps',objective:0}),/uniquement par tes actions/);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,0);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'first_steps',task:'welcome_house'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'mael_rivière'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 assert.equal(save.hub.missions.first_steps.status,'completed');
});

test('Boat Without Flag advances from a boat ride then returning to the docks',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'boat_without_flag'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'boat',from:'docks',to:'gardens',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.boat_without_flag.completedObjectives,0);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'boat',from:'docks',to:'gardens',night:true,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.boat_without_flag.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'docks'});
 assert.equal(save.hub.missions.boat_without_flag.status,'completed');
});

test('Telepherics and ziplines are server-valid transport actions',()=>{
 let save=blankSave();
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'telepheric',from:'docks',to:'broken_circle_tower',night:false,dateKey:'2026-09-19'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'gardens',to:'docks',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.stats.transportRides.telepheric,1);
 assert.equal(save.hub.stats.transportRides.zipline,1);
 assert.ok(save.hub.stats.transportStops.includes('telepheric:broken_circle_tower'));
 assert.ok(save.hub.stats.transportStops.includes('zipline:docks'));
 assert.throws(()=>applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'docks',to:'gardens',night:false,dateKey:'2026-09-19'}),/Trajet Hub invalide/);
 assert.throws(()=>applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'docks',night:false,dateKey:'2026-09-19'}),/Trajet Hub invalide/);
});


test('Storm Rescue combines a real boat ride, rescue task and return to docks',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'storm_rescue'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'boat',from:'docks',to:'gardens',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.storm_rescue.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'storm_rescue',task:'rescue_crew'});
 assert.equal(save.hub.missions.storm_rescue.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'docks'});
 assert.equal(save.hub.missions.storm_rescue.status,'completed');
});

test('Silent Cable requires inspect, repair, then an actual telepheric ride',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'silent_cable'});
 save=applyWorldAction(save,{type:'hubMissionTask',id:'silent_cable',task:'inspect_line'});
 assert.equal(save.hub.missions.silent_cable.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'silent_cable',task:'repair_pylon'});
 assert.equal(save.hub.missions.silent_cable.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'telepheric',from:'docks',to:'broken_circle_tower',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.silent_cable.status,'completed');
});


test('Rooftops Circle needs two distinct zipline routes',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'rooftops_circle'});
 save=applyWorldAction(save,{type:'hubMissionTask',id:'rooftops_circle',task:'course'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'gardens',to:'docks',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'gardens',to:'docks',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'archives',to:'community',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'rooftops_circle',task:'viewpoint'});
 assert.equal(save.hub.missions.rooftops_circle.status,'completed');
});

test('Wagon Eight requires a night train before wagon and eight-value tasks',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'wagon_eight'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.wagon_eight.completedObjectives,0);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:true,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.wagon_eight.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'wagon_eight',task:'missing_wagon'});
 assert.equal(save.hub.missions.wagon_eight.completedObjectives,2);
 for(let i=1;i<=8;i++)save=applyWorldAction(save,{type:'hubMissionTask',id:'wagon_eight',task:'value_'+i});
 assert.equal(save.hub.missions.wagon_eight.status,'completed');
});

test('Voices Square counts three distinct canonical residents',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'voices_square'});
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'amira_mansouri'});
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'amira_mansouri'});
 assert.equal(save.hub.missions.voices_square.completedObjectives,0);
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'lucia_navaro'});
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'soraya_najem'});
 assert.equal(save.hub.missions.voices_square.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'voices_square',task:'resolve_dispute'});
 save=applyWorldAction(save,{type:'hubMissionTask',id:'voices_square',task:'organize_meeting'});
 assert.equal(save.hub.missions.voices_square.status,'completed');
});
