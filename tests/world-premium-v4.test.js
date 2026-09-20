import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,worldItems} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {hubMissionPrerequisitesMet,hubMissionChainProgress} from '../src/world/hub/mission-graph.js';
import {hubNpcSchedule,hubDayPart} from '../src/world/hub/npc-schedule.js';
import {hubDialogueScene,HUB_DIALOGUE_CHOICE_SET} from '../src/world/hub/dialogue-v3.js';
import {worldTimeSnapshot} from '../src/world/world-time.js';
import {streamingProfile,lodForDistance} from '../src/world/streaming.js';
import {GUARDIAN_VALUES,guardianValueOptions} from '../src/world/guardian-values.js';

test('mission graph locks chained missions until prerequisites are claimed',()=>{
 let save=blankSave();
 assert.equal(hubMissionPrerequisitesMet('first_echo',save.hub.missions),false);
 save={...save,hub:{...save.hub,missions:{...save.hub.missions,first_steps:{...save.hub.missions.first_steps,status:'completed',completedObjectives:3,claimed:true}}}};
 assert.equal(hubMissionPrerequisitesMet('first_echo',save.hub.missions),true);
 assert.ok(hubMissionChainProgress(save.hub.missions).unlocked>0);
});

test('NPC schedules change by day part and keep rare conductor at night',()=>{
 assert.equal(hubDayPart(2),'night');
 assert.equal(hubDayPart(12),'day');
 assert.equal(hubNpcSchedule('the_conductor',{hour:12}).rare,true);
 assert.equal(hubNpcSchedule('the_conductor',{hour:23}).rare,false);
 const lunch=hubNpcSchedule('ines_varga',{hour:12,day:1,weather:'clear'});assert.equal(lunch.activity,'pause de midi');assert.equal(lunch.social,true);assert.ok(['commerce','gardens','heritage_square','community'].includes(lunch.district));
});

test('dialogue V3 choices are bounded and server-known',()=>{
 const npc={name:'Inès',role:'archiviste',missionIds:['first_echo']};
 const scene=hubDialogueScene(npc,{hour:12,missionState:{first_echo:{status:'active'}},talks:3});
 assert.ok(scene.choices.length>=2);
 for(const choice of scene.choices)assert.ok(HUB_DIALOGUE_CHOICE_SET.has(choice.id));
});

test('day-night clock and LOD profiles remain bounded',()=>{
 for(const hour of [0,6,12,19,23]){
  const d=new Date('2026-09-19T00:00:00Z');d.setUTCHours(hour);
  const snap=worldTimeSnapshot(d);
  assert.ok(snap.daylight>=0&&snap.daylight<=1);
  assert.ok(snap.sun>=0&&snap.sun<=1);
 }
 const low=streamingProfile('auto',4);
 assert.equal(lodForDistance(0,low),0);
 assert.equal(lodForDistance(low.far+1,low),3);
});

test('France Justice trial is server validated and gives guardian preparation',()=>{
 let save=applyWorldAction(blankSave(),{type:'visit',region:'france'});
 save={...save,adventure:{...save.adventure,chapters:{...save.adventure.chapters,france:{helped:true,powers:['ally','ambiance','terrain'],solved:true,restored:2,challenge:false,choice:'garden',board:[]}}}};
 const options=guardianValueOptions('france',save.adventure.values.france);
 assert.ok(options.some(option=>option.correct));
 assert.throws(()=>applyWorldAction(save,{type:'guardianValueChoice',choiceId:'raccourci'}),/valeur attendue/);
 for(const [choiceId] of GUARDIAN_VALUES.france.choices)save=applyWorldAction(save,{type:'guardianValueChoice',choiceId});
 assert.equal(save.adventure.values.france.completed,true);
 const trial=worldItems('france',save).find(item=>item.type==='valueTrial');
 assert.equal(trial.done,true);
});
