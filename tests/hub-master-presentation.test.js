import test from 'node:test';
import assert from 'node:assert/strict';
import missions from '../src/world/hub/data/missions-v1.json' with {type:'json'};
import events from '../src/world/hub/data/events-v1.json' with {type:'json'};
import {HUB_MISSION_GRAPH} from '../src/world/hub/mission-graph.js';
import {hubCategoryLabel,hubNpcLabel,hubMissionLabel,hubConditionLabel,hubRewardLabel,hubObjectiveLabel,hubEventLabel,hubPlaceLabel,hubElevationLabel,hubDistanceLabel,hubSearchMatches,hubJournalRows} from '../src/world/hub/presentation.js';
import {hubMissionJournal} from '../src/world/hub/mission-journal.js';
import {platformNextObjective} from '../src/world/hub/platform-layout.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {hubDialogueIntentResponse} from '../src/world/hub/dialogue-presentation.js';
import {blankSave} from '../src/world/rules.js';

test('every authored Hub mission is presented without saved identifiers or English categories',()=>{
 for(const mission of missions){
  assert.notEqual(hubCategoryLabel(mission.category),mission.category,mission.id+' category');
  assert.notEqual(hubNpcLabel(mission.giver),mission.giver,mission.id+' resident');
  assert.equal(hubMissionLabel(mission.id),mission.title);
  for(const objective of mission.objectives)assert.equal(hubObjectiveLabel(objective),objective,mission.id+' authored objective');
  for(const reward of mission.rewards)assert.notEqual(hubRewardLabel(reward),reward,mission.id+' reward');
  for(const condition of HUB_MISSION_GRAPH[mission.id]?.optional||[])assert.doesNotMatch(hubConditionLabel(condition),/[_:]|weather|talk|transport|event/,mission.id+' optional');
 }
 for(const event of events)assert.notEqual(hubEventLabel(event.id),event.id.replaceAll('_',' '));
 assert.equal(hubConditionLabel('talk:ines_varga'),'Parler à Inès Varga');
 assert.equal(hubConditionLabel('talk:the_conductor'),'Parler au Conducteur Sans Nom');
 assert.equal(hubConditionLabel('transport:zipline'),'Emprunter la tyrolienne');
 assert.match(hubConditionLabel('weather:heavy_rain'),/forte pluie/);
 assert.doesNotMatch(hubObjectiveLabel('future_internal_objective'),/future|_/);
});

test('first objective names the actual guide and preserves its navigation ID and the save',()=>{
 const save=blankSave(),before=structuredClone(save),items=worldRuntimeItems('hub',save,{hour:12,weather:'clear'}),next=platformNextObjective(items,save);
 assert.match(next.label,/Maël Rivière/);
 assert.doesNotMatch(next.label,/mael_rivière/);
 assert.equal(next.item.npcId,'mael_rivière');
 assert.deepEqual(save,before);
});

test('Hub journal makes active work and unclaimed rewards easy to find without hiding other missions',()=>{
 const save=blankSave();save.hub.missions.first_steps={...save.hub.missions.first_steps,status:'completed',completedObjectives:3,claimed:true};
 save.hub.missions.first_echo={...save.hub.missions.first_echo,status:'active',completedObjectives:1};
 save.hub.missions.boat_without_flag={...save.hub.missions.boat_without_flag,status:'completed',completedObjectives:2,claimed:false};
 const rows=hubMissionJournal(save),before=structuredClone(rows),all=hubJournalRows(rows);
 assert.equal(all.length,19);assert.equal(all[0].id,'first_echo');assert.equal(all[1].id,'boat_without_flag');
 assert.deepEqual(hubJournalRows(rows,'active').map(row=>row.id),['first_echo']);
 assert.ok(hubJournalRows(rows,'available').every(row=>!row.locked&&row.status==='available'));
 assert.ok(hubJournalRows(rows,'locked').every(row=>row.locked));
 assert.deepEqual(new Set(hubJournalRows(rows,'completed').map(row=>row.id)),new Set(['first_steps','boat_without_flag']));
 assert.deepEqual(rows,before);
});

test('atlas searches French district names, accents and old aliases without rewriting real coordinates',()=>{
 const item={id:'hub:reference:terrasses_onis',name:'Terrasses de l’Oasis',district:'gardens',type:'hubPublicPlace',x:21.4,z:-12.8},before={...item};
 for(const query of ['terrasses oasis','terrasses onis','jardins unite'])assert.equal(hubSearchMatches(item,query),true,query);
 assert.equal(hubSearchMatches(item,'archives oasis'),false,'all words are required');
 assert.equal(hubSearchMatches({type:'hubNpc',npcId:'mael_rivière',district:'heritage_square'},'mael riviere'),true);
 assert.equal(hubSearchMatches({name:'Place del Sol',district:'community'},'place du sol'),true);
 assert.equal(hubSearchMatches({name:'Gare',transport:'train',district:'docks'},'express'),true);
 assert.equal(hubPlaceLabel('Place du Sol · Terrasses de l’Onis'),'Place del Sol · Terrasses de l’Oasis');
 assert.deepEqual(item,before);
});

test('displayed altitude rounds renderer precision, and distances describe real metres',()=>{
 assert.equal(hubElevationLabel(4.199999999999999),'+4,2 m');
 assert.equal(hubElevationLabel(6),'+6 m');
 assert.equal(hubElevationLabel(-0.00001),'0 m');
 assert.equal(hubElevationLabel(-12.300000000001),'-12,3 m');
 assert.equal(hubElevationLabel(Number.NaN),'Altitude inconnue');
 assert.equal(hubDistanceLabel({x:3,z:4},{x:0,z:0}),'5 m');
 assert.equal(hubDistanceLabel({x:0,z:0},{x:0,z:0}),'À proximité');
 assert.equal(hubDistanceLabel({x:1200,z:0},{x:0,z:0}),'1,2 km');
 assert.equal(hubDistanceLabel({x:NaN,z:0},{x:0,z:0}),'Distance inconnue');
});

test('resident dialogue names the local place and completed story without leaking identifiers',()=>{
 const save=blankSave(),item={npcId:'mael_rivière',name:'Maël Rivière',district:'heritage_square',missionIds:['first_steps']};
 save.hub.missions.first_steps={...save.hub.missions.first_steps,status:'completed',claimed:true};
 const district=hubDialogueIntentResponse(item,'district',save).text;
 assert.match(district,/Pont des Civilisations/);assert.doesNotMatch(district,/heritage_square/);
 const opinion=hubDialogueIntentResponse(item,'opinion',save).text;
 assert.match(opinion,/Les premiers pas/);assert.doesNotMatch(opinion,/first_steps/);
});
