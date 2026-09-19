import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

function completeFirstSteps(){
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-19'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 return applyWorldAction(save,{type:'hubMissionClaim',id:'first_steps'});
}

test('Hub mission state survives normalization and defaults safely',()=>{
 const save=blankSave();
 assert.equal(Object.keys(save.hub.missions).length,20);
 const mutated={...save,hub:{...save.hub,missions:{...save.hub.missions,first_echo:{...save.hub.missions.first_echo,status:'active',completedObjectives:1}}}};
 const normalized=normalizeSave(mutated);
 assert.equal(normalized.hub.missions.first_echo.status,'active');
 assert.equal(normalized.hub.missions.first_echo.completedObjectives,1);
});

test('Shared reducer validates full Hub mission lifecycle and grants reward once',()=>{
 let save=completeFirstSteps();
 save=applyWorldAction(save,{type:'hubMissionStart',id:'first_echo'});
 assert.equal(save.hub.missions.first_echo.status,'active');
 save=applyWorldAction(save,{type:'hubMissionStep',id:'first_echo',objective:0});
 save=applyWorldAction(save,{type:'hubMissionStep',id:'first_echo',objective:1});
 save=applyWorldAction(save,{type:'hubMissionStep',id:'first_echo',objective:2});
 assert.equal(save.hub.missions.first_echo.status,'completed');
 const before={xp:save.xp,shards:save.shards};
 save=applyWorldAction(save,{type:'hubMissionClaim',id:'first_echo'});
 assert.equal(save.hub.missions.first_echo.claimed,true);
 assert.equal(save.xp,before.xp+120);
 assert.equal(save.shards,before.shards+30);
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionClaim',id:'first_echo'}),/Récompense indisponible/);
});

test('Manual Hub mission objectives must be completed in order',()=>{
 let save=applyWorldAction(completeFirstSteps(),{type:'hubMissionStart',id:'first_echo'});
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionStep',id:'first_echo',objective:2}),/Objectif invalide/);
});
