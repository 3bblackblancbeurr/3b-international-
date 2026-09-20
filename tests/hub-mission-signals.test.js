import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

function completeFirstSteps(){
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});
 save=applyWorldAction(save,{type:'hubBuildingVisit',id:'heritage_welcome'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-19'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 return applyWorldAction(save,{type:'hubMissionClaim',id:'first_steps'});
}

test('First Steps advances only from the real district/transport/district sequence',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionStep',id:'first_steps',objective:0}),/uniquement par tes actions/);
 save=applyWorldAction(save,{type:'hubBuildingVisit',id:'heritage_welcome'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'mael_rivière'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.first_steps.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 assert.equal(save.hub.missions.first_steps.status,'completed');
});

test('Boat Without Flag advances from a boat ride then returning to the docks',()=>{
 let save=applyWorldAction(completeFirstSteps(),{type:'hubMissionStart',id:'boat_without_flag'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'boat',from:'docks',to:'gardens',night:false,dateKey:'2026-09-19'});
 assert.equal(save.hub.missions.boat_without_flag.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'docks'});
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_abandoned_quay'});
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


test('repeating the exact same transport route cannot satisfy two mission objectives',()=>{
 let save=applyWorldAction(completeFirstSteps(),{type:'hubMissionStart',id:'rooftops_circle'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'archives',to:'community',night:false,dateKey:'2026-09-21'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'archives',to:'community',night:false,dateKey:'2026-09-21'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'zipline',from:'gardens',to:'docks',night:false,dateKey:'2026-09-21'});
 assert.equal(save.hub.missions.rooftops_circle.completedObjectives,2);
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'arena'});
 assert.equal(save.hub.missions.rooftops_circle.status,'completed');
});