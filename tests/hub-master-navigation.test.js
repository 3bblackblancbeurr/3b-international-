import test from 'node:test';
import assert from 'node:assert/strict';
import authoredMissions from '../src/world/hub/data/missions-v1.json' with {type:'json'};
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {platformNextObjective} from '../src/world/hub/platform-layout.js';
import {hubMissionReward} from '../src/world/hub/mission-catalog.js';
import {hubMissionJournal} from '../src/world/hub/mission-journal.js';
import {hubDialogueScene} from '../src/world/hub/dialogue-presentation.js';

const context={hour:12,weather:'clear'};
const runtime=save=>worldRuntimeItems('hub',save,context);
const next=save=>platformNextObjective(runtime(save),save);
const resume=save=>normalizeSave(JSON.parse(JSON.stringify(save)));
function finishFirstSteps(){
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'});
 save=applyWorldAction(save,{type:'hubBuildingVisit',id:'heritage_welcome'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-10-07'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 return applyWorldAction(save,{type:'hubMissionClaim',id:'first_steps'});
}

test('first Hub journey can be resumed at every step, returns to the reward and unlocks its sequel',()=>{
 let save=blankSave();const entry=next(save);
 assert.equal(entry.item.npcId,'mael_rivière');
 const mission=runtime(save).find(item=>item.missionId==='first_steps'&&item.type==='hubMission'),advertised=hubMissionReward(mission);
 assert.deepEqual(advertised,{xp:40,shards:10});
 save=resume(applyWorldAction(save,{type:'hubMissionStart',id:mission.missionId}));
 assert.equal(next(save).item.buildingId,'heritage_welcome');
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionClaim',id:mission.missionId}),/Récompense indisponible/);
 save=resume(applyWorldAction(save,{type:'hubBuildingVisit',id:'heritage_welcome'}));
 assert.equal(next(save).item.transport,'train');
 const halfway=structuredClone(save.hub.missions.first_steps);
 save=resume(applyWorldAction(save,{type:'hubNpcTalk',id:'mael_rivière'}));
 assert.deepEqual(save.hub.missions.first_steps,halfway,'conversation preserves the actual next transport objective');
 save=resume(applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-10-07'}));
 assert.equal(next(save).item.district,'heritage_square');
 assert.equal(next(save).item.type,'hubDistrict');
 save=resume(applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'}));
 assert.equal(next(save).item.missionId,'first_steps');
 assert.match(next(save).label,/Récupérer la récompense/);
 assert.equal(hubMissionJournal(save).find(row=>row.id==='first_echo').locked,true,'sequel waits until the reward is claimed');
 const before={xp:save.xp,shards:save.shards};
 save=resume(applyWorldAction(save,{type:'hubMissionClaim',id:'first_steps'}));
 assert.equal(save.xp,before.xp+advertised.xp);assert.equal(save.shards,before.shards+advertised.shards);
 assert.equal(save.hub.missions.first_steps.claimed,true);
 assert.equal(hubMissionJournal(save).find(row=>row.id==='first_echo').locked,false);
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionClaim',id:'first_steps'}),/Récompense indisponible/);
 assert.equal(next(save).item.npcId,'ines_varga');
});

test('structured mission keeps its physical action IDs through reloads and pays the exact contract',()=>{
 let save=applyWorldAction(finishFirstSteps(),{type:'hubMissionStart',id:'first_echo'});
 const mission=runtime(save).find(item=>item.type==='hubMission'&&item.missionId==='first_echo'),reward=hubMissionReward(mission);
 assert.deepEqual(reward,{xp:120,shards:30});
 for(const actionId of ['signal:locate','memory:restore','beacon:activate']){
  const target=next(save).item;
  assert.equal(target.type,'hubMissionAction');assert.equal(target.actionId,actionId);
  const reloaded=resume(save),afterReload=next(reloaded).item;
  assert.equal(afterReload.id,target.id);assert.equal(afterReload.actionId,actionId);
  assert.equal(afterReload.x,target.x);assert.equal(afterReload.z,target.z);
  save=resume(applyWorldAction(reloaded,{type:'hubMissionAction',missionId:'first_echo',actionId}));
 }
 assert.equal(next(save).item.missionId,'first_echo');
 assert.match(next(save).label,/récompense/);
 const before={xp:save.xp,shards:save.shards};
 save=resume(applyWorldAction(save,{type:'hubMissionClaim',id:'first_echo'}));
 assert.equal(save.xp,before.xp+reward.xp);assert.equal(save.shards,before.shards+reward.shards);
 assert.equal(save.hub.missions.first_echo.claimed,true);
 assert.equal(hubMissionJournal(save).find(row=>row.id==='eight_signals').locked,false);
});

test('all live mission contracts retain authored importance for accurate reward previews',()=>{
 const items=runtime(blankSave());
 for(const authored of authoredMissions){
  const item=items.find(row=>row.type==='hubMission'&&row.missionId===authored.id);
  assert.ok(item,authored.id+' available in world catalog');
  assert.equal(item.importance,authored.importance);
  assert.deepEqual(hubMissionReward(item),hubMissionReward(authored),authored.id+' preview agrees with engine');
 }
});

test('active resident dialogue names the story while preserving its canonical scene and choices',()=>{
 const save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_steps'}),npc=runtime(save).find(item=>item.npcId==='mael_rivière');
 const scene=hubDialogueScene(npc,{missionState:save.hub.missions,talks:1,...context});
 assert.equal(scene.id,'mission-active');assert.match(scene.text,/Les premiers pas/);assert.doesNotMatch(scene.text,/first_steps/);
});
