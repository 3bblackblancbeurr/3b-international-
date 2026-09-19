import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

test('First Echo advances only through its three physical tasks',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_echo'});
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionStep',id:'first_echo',objective:0}),/uniquement par tes actions/);
 for(const task of ['signal','memory','beacon'])save=applyWorldAction(save,{type:'hubMissionTask',id:'first_echo',task});
 assert.equal(save.hub.missions.first_echo.status,'completed');
 assert.deepEqual(save.hub.stats.missionTasks.first_echo,['signal','memory','beacon']);
});

test('Eight Seeds needs all eight seeds before the conservatory can be restored',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'eight_seeds'});
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionTask',id:'eight_seeds',task:'conservatory'}),/pas disponible/);
 for(let i=1;i<=8;i++)save=applyWorldAction(save,{type:'hubMissionTask',id:'eight_seeds',task:'seed_'+i});
 assert.equal(save.hub.missions.eight_seeds.completedObjectives,1);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'eight_seeds',task:'conservatory'});
 assert.equal(save.hub.missions.eight_seeds.status,'completed');
});

test('Weather-gated mission tasks cannot be forged outside their weather',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'garden_listens'});
 for(const task of ['sound_a','sound_b','sound_c','sound_d'])save=applyWorldAction(save,{type:'hubMissionTask',id:'garden_listens',task});
 assert.equal(save.hub.missions.garden_listens.completedObjectives,1);
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionTask',id:'garden_listens',task:'fog_wait',evidence:{weather:'clear'}}),/pas disponible/);
 save=applyWorldAction(save,{type:'hubMissionTask',id:'garden_listens',task:'fog_wait',evidence:{weather:'fog'}});
 assert.equal(save.hub.missions.garden_listens.completedObjectives,2);
});

test('Mission task normalization removes forged task identifiers',()=>{
 const save=blankSave();
 const normalized=normalizeSave({...save,hub:{...save.hub,stats:{...save.hub.stats,missionTasks:{first_echo:['signal','fake'],eight_seeds:['seed_1','seed_99']}}}});
 assert.deepEqual(normalized.hub.stats.missionTasks.first_echo,['signal']);
 assert.deepEqual(normalized.hub.stats.missionTasks.eight_seeds,['seed_1']);
});
