import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIONS,contextActions,primaryContextAction,validateInteractionCatalog} from '../src/world/interaction-system.js';
import {GUARDIAN_CAMPAIGNS,INDEPENDENT_MISSION_ARCHETYPES,centralMissionIndex,validateMissionArchitecture} from '../src/world/mission-index.js';
import {HUB_DIALOGUE_INTENT_SET,hubDialogueIntents,hubDialogueIntentResponse} from '../src/world/hub/dialogue-intents.js';
import {hubNpcMemory,hubNpcMemorySummary,validateNpcMemory} from '../src/world/hub/npc-memory.js';
import {GUARDIAN_RELATIONSHIPS,guardianRelationshipsFor,guardianHubState,validateGuardianRelationships} from '../src/world/guardian-relations.js';
import {GUARDIAN_RESONANCES,RING_ABILITIES,unlockedResonances,validateResonances} from '../src/world/guardian-resonances.js';
import {RESONANCE_CONTEXT_CONTRACTS,resonanceContextCandidate,resonanceContextMessage,validateResonanceContextContracts} from '../src/world/resonance-context.js';
import {GUARDIAN_COMBAT_RULES,validateGuardianCombatRules} from '../src/world/guardian-combat.js';
import {FINAL_CIRCLE_PHASES,finalCirclePhase,validateFinalCircle} from '../src/world/final-circle.js';
import {CONTROL_ACTIONS,defaultControlBindings,normalizeControlBindings,setPrimaryControl,controlMatches,actionHeld,controlLabel,validateControlBindings} from '../src/world/control-bindings.js';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {validPose,validRuntimeMember,mergeRuntimePeers,partyRuntimeRequest} from '../src/world/cooperation.js';
import {worldRadiusFor,WORLD_RADIUS} from '../src/world/terrain.js';
import {HUB_MISSION_ACTION_PLANS,applyHubMissionAction,hubMissionActionTargets,validateHubMissionActionPlans} from '../src/world/hub/mission-actions.js';
import {hubRuntime} from '../src/world/hub/runtime-data.js';
import {DISTRICT_JOBS,availableJobs,applyDistrictJobAction,currentJobActions,jobReadyToTurnIn,validateDistrictJobs} from '../src/world/district-jobs.js';
import {serviceItems} from '../src/world/settlements.js';
import {PARTY_SIGNALS,sharedObjectiveState,validateCoopSession} from '../src/world/coop-session.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('contextual interaction catalog covers the systemic verbs without inaccessible hold-only actions',()=>{
 assert.equal(validateInteractionCatalog(),true);
 for(const id of ['talk','inspect','scan','showEvidence','repair','assemble','support','carry','revive','climb','vault','swim','dive','drive','fight','guard'])assert.ok(ACTIONS[id],id);
 const categories=new Set(Object.values(ACTIONS).map(action=>action.category));
 for(const category of ['social','investigation','world','traversal','rescue','craft','vehicle','combat','companion','rest'])assert.ok(categories.has(category),category);
 for(const [id,action] of Object.entries(ACTIONS)){
  assert.ok(action.label.length>1,id+' label');
  assert.ok(action.audio.length>1,id+' audio');
  assert.ok(action.caption.length>1,id+' caption');
  assert.ok(['light','medium','strong'].includes(action.haptic),id+' haptic');
  assert.ok(['press','toggle'].includes(action.input),id+' input');
 }
});

test('the same interaction button resolves to different verbs from target context',()=>{
 const save=blankSave();
 const cases=[
  [{id:'france',type:'portal'},'travel'],
  [{id:'n',type:'hubNpc'},'talk'],
  [{id:'g',type:'guardian',region:'france'},'fight'],
  [{id:'m',type:'beacon',done:false},'collect'],
  [{id:'i',type:'injured'},'help'],
  [{id:'w',type:'water'},'swim'],
  [{id:'c',type:'console'},'use'],
  [{id:'r',type:'repairable'},'inspect'],
  [{id:'a',type:'animal'},'observe'],
 ];
 for(const [item,expected] of cases)assert.equal(primaryContextAction(item,{save})?.id,expected,item.type);
 const water=contextActions({id:'water',type:'water'},{save});
 assert.deepEqual(water.map(a=>a.id),['swim','dive']);
 const console=contextActions({id:'relay',type:'console'},{save});
 assert.deepEqual(console.map(a=>a.id),['use','repair']);
});

test('central mission index distinguishes all eight guardian campaigns and independent mission families',()=>{
 assert.equal(validateMissionArchitecture(),true);
 const index=centralMissionIndex(),guardians=index.filter(m=>m.category==='guardian'),hub=index.filter(m=>m.source==='hub');
 assert.equal(guardians.length,8);
 assert.equal(hub.length,20);
 assert.equal(index.length,28);
 assert.equal(Object.keys(GUARDIAN_CAMPAIGNS).length,8);
 assert.equal(new Set(guardians.map(m=>m.signature)).size,8);
 assert.equal(new Set(Object.values(GUARDIAN_CAMPAIGNS).map(c=>c.combat)).size,8);
 assert.equal(new Set(Object.values(GUARDIAN_CAMPAIGNS).map(c=>c.finalRole)).size,8);
 for(const mission of guardians){
  assert.ok(mission.phases.length>=8,mission.region);
  assert.ok(mission.gameplay.length>=4,mission.region);
  assert.equal(mission.implementation,mission.region==='france'?'runtime':'hybrid',mission.region);
 }
 assert.equal(INDEPENDENT_MISSION_ARCHETYPES.length,16);
 assert.equal(new Set(INDEPENDENT_MISSION_ARCHETYPES.map(m=>m.id)).size,16);
 const verbs=new Set(INDEPENDENT_MISSION_ARCHETYPES.flatMap(m=>m.gameplay));
 assert.ok(verbs.size>=25,'independent missions need broad gameplay coverage');
});

test('structured mission actions require every unique real action before an objective advances',()=>{
 assert.equal(validateHubMissionActionPlans(),true);
 assert.ok(Object.keys(HUB_MISSION_ACTION_PLANS).length>=14);
 let save=blankSave(),missions={...save.hub.missions,eight_signals:{...save.hub.missions.eight_signals,status:'active',phase:'ACTIVE'}},progress={};
 for(let i=1;i<=7;i++){
  const result=applyHubMissionAction(missions,progress,'eight_signals','frequency:'+i);assert.equal(result.ok,true);assert.equal(result.objectiveComplete,false);
  missions=result.missions;progress=result.progress;assert.equal(missions.eight_signals.completedObjectives,0);
 }
 let result=applyHubMissionAction(missions,progress,'eight_signals','frequency:1');
 assert.equal(result.duplicate,true);assert.equal(result.missions.eight_signals.completedObjectives,0);
 result=applyHubMissionAction(missions,progress,'eight_signals','frequency:8');
 assert.equal(result.objectiveComplete,true);assert.equal(result.missions.eight_signals.completedObjectives,1);
 const targets=hubMissionActionTargets('eight_signals',result.missions.eight_signals,result.progress.eight_signals);
 assert.deepEqual(targets.map(item=>item.id),['door:identify']);
});

test('evidence presentation stays hidden and rejected until the proof has been scanned',()=>{
 let missions={voices_square:{status:'active',phase:'OBJECTIVE_2',completedObjectives:1,totalObjectives:3,claimed:false}},progress={};
 let targets=hubMissionActionTargets('voices_square',missions.voices_square,[]);
 assert.deepEqual(targets.map(action=>action.id),['dispute:evidence']);
 let result=applyHubMissionAction(missions,progress,'voices_square','dispute:present');
 assert.equal(result.ok,false);assert.equal(result.reason,'missing-action-dependency');
 result=applyHubMissionAction(missions,progress,'voices_square','dispute:evidence');
 assert.equal(result.ok,true);assert.equal(result.objectiveComplete,false);
 missions=result.missions;progress=result.progress;
 targets=hubMissionActionTargets('voices_square',missions.voices_square,progress.voices_square);
 assert.deepEqual(targets.map(action=>action.id),['dispute:present']);
 assert.equal(targets[0].verb,'showEvidence');
 result=applyHubMissionAction(missions,progress,'voices_square','dispute:present');
 assert.equal(result.ok,true);assert.equal(result.objectiveComplete,true);
 assert.equal(result.missions.voices_square.completedObjectives,2);
});

test('Hub runtime materializes only the pending physical actions for the active mission objective',()=>{
 let save=blankSave();
 save={...save,hub:{...save.hub,missions:{...save.hub.missions,eight_seeds:{...save.hub.missions.eight_seeds,status:'active',phase:'ACTIVE'}}}};
 let runtime=hubRuntime('mobileMedium',{now:new Date('2026-09-21T12:00:00Z'),hubState:save.hub});
 let actions=runtime.items.filter(item=>item.type==='hubMissionAction'&&item.missionId==='eight_seeds');
 assert.equal(actions.length,8);assert.ok(actions.every(item=>item.actionId.startsWith('seed:')));
 const recorded=Array.from({length:7},(_,i)=>'seed:'+(i+1));
 save={...save,hub:{...save.hub,stats:{...save.hub.stats,missionActions:{eight_seeds:recorded}}}};
 runtime=hubRuntime('mobileMedium',{now:new Date('2026-09-21T12:00:00Z'),hubState:save.hub});
 actions=runtime.items.filter(item=>item.type==='hubMissionAction'&&item.missionId==='eight_seeds');
 assert.deepEqual(actions.map(item=>item.actionId),['seed:8']);
});

test('authoritative mission action endpoint rejects wrong-stage actions and makes eight seeds real',()=>{
 let save=blankSave();
 save=applyWorldAction(save,{type:'hubMissionStart',id:'first_steps'});
 save=applyWorldAction(save,{type:'hubBuildingVisit',id:'heritage_welcome'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-21'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'heritage_square'});
 save=applyWorldAction(save,{type:'hubMissionClaim',id:'first_steps'});
 save=applyWorldAction(save,{type:'hubMissionStart',id:'eight_seeds'});
 assert.throws(()=>applyWorldAction(save,{type:'hubMissionAction',missionId:'eight_seeds',actionId:'conservatory:restore'}),/Action de mission invalide/);
 for(let i=1;i<=8;i++)save=applyWorldAction(save,{type:'hubMissionAction',missionId:'eight_seeds',actionId:'seed:'+i});
 assert.equal(save.hub.missions.eight_seeds.completedObjectives,1);
 assert.equal(save.hub.stats.missionActions.eight_seeds.filter(id=>id.startsWith('seed:')).length,8);
 save=applyWorldAction(save,{type:'hubMissionAction',missionId:'eight_seeds',actionId:'conservatory:restore'});
 assert.equal(save.hub.missions.eight_seeds.status,'completed');
});

test('independent country contracts are multi-step systemic jobs rather than one-click errands',()=>{
 assert.equal(validateDistrictJobs(),true);
 assert.equal(Object.keys(DISTRICT_JOBS).length,9);
 let home={wood:0,stone:0,food:3,camp:0,forge:0,garden:0,expedition:0,harvest:[],jobs:[],activeJob:'route_repair',jobStage:0,jobProgress:[]};
 assert.deepEqual(currentJobActions(home).map(action=>action.id),['route:inspect']);
 let result=applyDistrictJobAction(home,'route:repair1');assert.equal(result.ok,false);
 result=applyDistrictJobAction(home,'route:inspect');assert.equal(result.stageComplete,true);home=result.home;
 assert.equal(home.jobStage,1);assert.deepEqual(currentJobActions(home).map(action=>action.id),['route:repair1','route:repair2']);
 result=applyDistrictJobAction(home,'route:repair1');home=result.home;assert.equal(home.jobStage,1);
 const duplicate=applyDistrictJobAction(home,'route:repair1');assert.equal(duplicate.duplicate,true);
 result=applyDistrictJobAction(home,'route:repair2');home=result.home;assert.equal(home.jobStage,2);
 result=applyDistrictJobAction(home,'route:verify');home=result.home;assert.equal(jobReadyToTurnIn(home),true);
});

test('France Justice post-Guardian dossier unlocks only after Céliane and remains server-authoritative',()=>{
 let save=applyWorldAction(blankSave(),{type:'visit',region:'france'}),home=save.adventure.frontier.france||{jobs:[],activeJob:null};
 assert.equal(availableJobs(home,{region:'france',seals:save.seals}).some(([id])=>id==='justice_case'),false);
 assert.throws(()=>applyWorldAction(save,{type:'jobAccept',id:'justice_case'}),/pas disponible/);

 let italy=applyWorldAction(blankSave(),{type:'visit',region:'italie'});italy={...italy,seals:['france']};
 assert.throws(()=>applyWorldAction(italy,{type:'jobAccept',id:'justice_case'}),/pas disponible/);

 save={...save,seals:['france'],adventure:{...save.adventure,resonance:'france'}};
 home=save.adventure.frontier.france||{jobs:[],activeJob:null};
 assert.equal(availableJobs(home,{region:'france',seals:save.seals}).some(([id])=>id==='justice_case'),true);
 save=applyWorldAction(save,{type:'jobAccept',id:'justice_case'});
 assert.equal(save.adventure.frontier.france.activeJob,'justice_case');

 for(const id of ['justice:witness1','justice:witness2'])save=applyWorldAction(save,{type:'jobAction',job:'justice_case',actionId:id});
 let items=serviceItems('france',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId).sort(),['justice:proof1','justice:proof2']);
 assert.ok(items.every(item=>primaryContextAction(item,{save})?.id==='scan'));
 assert.ok(items.every(item=>contextActions(item,{save,region:'france'}).some(action=>action.id==='resonance'&&action.resonanceRegion==='france')));

 for(const id of ['justice:proof1','justice:proof2','justice:verify','justice:mediate','justice:report'])save=applyWorldAction(save,{type:'jobAction',job:'justice_case',actionId:id});
 assert.equal(jobReadyToTurnIn(save.adventure.frontier.france),true);
 const before={xp:save.xp,shards:save.shards,stone:save.adventure.frontier.france.stone};
 save=applyWorldAction(save,{type:'jobDone',id:'justice_case'});
 assert.equal(save.xp-before.xp,65);
 assert.equal(save.shards-before.shards,12);
 assert.equal(save.adventure.frontier.france.stone-before.stone,1);
 assert.ok(save.adventure.frontier.france.jobs.includes('justice_case'));
 assert.throws(()=>applyWorldAction(save,{type:'jobDone',id:'justice_case'}),/Aucun contrat/);
});

test('relay repair requires diagnosis repairs assembly and final verification in order',()=>{
 let save=applyWorldAction(blankSave(),{type:'visit',region:'estonie'});
 save=applyWorldAction(save,{type:'jobAccept',id:'signal_watch'});
 let items=serviceItems('estonie',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId),['signal:inspect']);
 assert.equal(primaryContextAction(items[0],{save})?.id,'scan');
 assert.throws(()=>applyWorldAction(save,{type:'jobAction',job:'signal_watch',actionId:'signal:bridge'}),/Action de contrat invalide/);
 save=applyWorldAction(save,{type:'jobAction',job:'signal_watch',actionId:'signal:inspect'});
 items=serviceItems('estonie',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId).sort(),['signal:align1','signal:align2']);
 assert.ok(items.every(item=>primaryContextAction(item,{save})?.id==='repair'));
 for(const actionId of ['signal:align1','signal:align2'])save=applyWorldAction(save,{type:'jobAction',job:'signal_watch',actionId});
 items=serviceItems('estonie',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId),['signal:bridge']);
 assert.equal(primaryContextAction(items[0],{save})?.id,'assemble');
 save=applyWorldAction(save,{type:'jobAction',job:'signal_watch',actionId:'signal:bridge'});
 items=serviceItems('estonie',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId),['signal:confirm']);
 assert.equal(primaryContextAction(items[0],{save})?.id,'observe');
 save=applyWorldAction(save,{type:'jobAction',job:'signal_watch',actionId:'signal:confirm'});
 assert.equal(jobReadyToTurnIn(save.adventure.frontier.estonie),true);
});

test('authoritative independent contract cannot be turned in before every real action',()=>{
 let save=applyWorldAction(blankSave(),{type:'visit',region:'france'});
 save=applyWorldAction(save,{type:'jobAccept',id:'field_rescue'});
 assert.equal(save.adventure.frontier.france.activeJob,'field_rescue');
 let items=serviceItems('france',save).filter(item=>item.type==='jobAction');
 assert.equal(items.length,2);assert.ok(items.every(item=>item.actionId.startsWith('rescue:locate')));
 assert.throws(()=>applyWorldAction(save,{type:'jobDone',id:'field_rescue'}),/Termine toutes les étapes/);
 assert.throws(()=>applyWorldAction(save,{type:'jobAction',job:'field_rescue',actionId:'rescue:help1'}),/Action de contrat invalide/);
 for(const actionId of ['rescue:locate1','rescue:locate2'])save=applyWorldAction(save,{type:'jobAction',job:'field_rescue',actionId});
 items=serviceItems('france',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId).sort(),['rescue:help1','rescue:help2']);
 for(const actionId of ['rescue:help1','rescue:help2'])save=applyWorldAction(save,{type:'jobAction',job:'field_rescue',actionId});
 items=serviceItems('france',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId).sort(),['rescue:revive2','rescue:support1']);
 assert.deepEqual(items.map(item=>primaryContextAction(item,{save})?.id).sort(),['revive','support']);
 assert.throws(()=>applyWorldAction(save,{type:'jobAction',job:'field_rescue',actionId:'rescue:carry2'}),/Action de contrat invalide/);
 for(const actionId of ['rescue:support1','rescue:revive2'])save=applyWorldAction(save,{type:'jobAction',job:'field_rescue',actionId});
 items=serviceItems('france',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId).sort(),['rescue:carry2','rescue:escort1']);
 assert.deepEqual(items.map(item=>primaryContextAction(item,{save})?.id).sort(),['carry','support']);
 const carry=items.find(item=>item.actionId==='rescue:carry2'),escort=items.find(item=>item.actionId==='rescue:escort1');
 assert.ok(carry.x<78&&carry.z>4,'the carry target must move toward the safe point');
 assert.ok(escort.x<64&&escort.z>-8,'the supported survivor must move toward the safe point');
 for(const actionId of ['rescue:escort1','rescue:carry2'])save=applyWorldAction(save,{type:'jobAction',job:'field_rescue',actionId});
 items=serviceItems('france',save).filter(item=>item.type==='jobAction');
 assert.deepEqual(items.map(item=>item.actionId),['rescue:return']);
 save=applyWorldAction(save,{type:'jobAction',job:'field_rescue',actionId:'rescue:return'});
 assert.equal(jobReadyToTurnIn(save.adventure.frontier.france),true);
 items=serviceItems('france',save).filter(item=>item.type==='job');
 assert.equal(items.length,1);assert.equal(items[0].job,'field_rescue');
 const xp=save.xp,shards=save.shards;
 save=applyWorldAction(save,{type:'jobDone',id:'field_rescue'});
 assert.equal(save.adventure.frontier.france.activeJob,null);
 assert.ok(save.adventure.frontier.france.jobs.includes('field_rescue'));
 assert.equal(save.xp-xp,DISTRICT_JOBS.field_rescue.xp);
 assert.equal(save.shards-shards,DISTRICT_JOBS.field_rescue.shards);
});

test('Hub NPC social memory persists across conversations and reacts to missions Guardians weather and familiarity',()=>{
 let save=blankSave(),item={npcId:'mael_rivière',name:'Maël Rivière',role:'guide',district:'heritage_square',country:'France',missionIds:['first_steps']};
 let memory=hubNpcMemory(item,save,{hour:12,weather:'clear'});
 assert.equal(validateNpcMemory(memory),true);assert.equal(memory.familiarity,'stranger');assert.equal(memory.guardianLiberated,false);
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'mael_rivière'});
 for(const intentId of ['identity','district','mission','identity','memory','opinion']){
  if(HUB_DIALOGUE_INTENT_SET.has(intentId))save=applyWorldAction(save,{type:'hubDialogueIntent',npcId:'mael_rivière',intentId});
 }
 memory=hubNpcMemory(item,save,{hour:23,weather:'heavy_rain'});
 assert.equal(validateNpcMemory(memory),true);assert.ok(memory.familiarityScore>0);assert.ok(memory.uniqueIntents.includes('identity'));assert.ok(memory.tension>0);assert.ok(hubNpcMemorySummary(memory).includes('humeur'));
 const persisted=normalizeSave(save),persistedMemory=hubNpcMemory(item,persisted,{hour:23,weather:'heavy_rain'});
 assert.deepEqual(persistedMemory.uniqueIntents,memory.uniqueIntents);
 save={...save,seals:['france']};memory=hubNpcMemory(item,save,{hour:12,weather:'clear'});
 assert.equal(memory.guardianLiberated,true);assert.ok(['soulagé','ouvert','confiant','neutre'].includes(memory.mood));
 const guardian=hubDialogueIntentResponse(item,'guardian',save,{guardianName:'Céliane',value:'Justice'});
 assert.match(guardian.text,/est revenu dans la Cité/);
 const runtime=hubRuntime('mobileMedium',{now:new Date('2026-09-21T12:00:00Z'),hubState:save.hub,seals:save.seals});
 const npc=runtime.items.find(row=>row.type==='hubNpc'&&row.npcId==='mael_rivière');
 assert.equal(npc.guardianLiberated,true);assert.equal(typeof npc.memorySummary,'string');assert.ok(npc.memorySummary.length>20);
});

test('hub conversations expose multiple intentions and persist intent memory authoritatively',()=>{
 let save=blankSave();
 const item={npcId:'noah_leroux',name:'Noah Leroux',role:'Veilleur',district:'broken_circle_tower',country:'France',missionIds:['eight_signals']};
 const intents=hubDialogueIntents(item,save,{hour:22,weather:'rain'});
 assert.ok(intents.length>=7);
 for(const intent of intents)assert.ok(HUB_DIALOGUE_INTENT_SET.has(intent.id));
 assert.ok(intents.some(i=>i.id==='guardian'));
 assert.ok(intents.some(i=>i.id==='oubli'));
 assert.ok(intents.some(i=>i.id==='opinion'));
 save=applyWorldAction(save,{type:'hubDialogueIntent',npcId:'noah_leroux',intentId:'identity'});
 assert.equal(save.hub.stats.dialogueHistory.length,1);
 const first=hubDialogueIntentResponse(item,'identity',save,{hour:22,weather:'rain'});
 assert.match(first.text,/Noah Leroux/);
 save=applyWorldAction(save,{type:'hubDialogueIntent',npcId:'noah_leroux',intentId:'identity'});
 assert.equal(save.hub.stats.dialogueHistory.length,1,'immediate duplicate intent must not spam memory');
 assert.throws(()=>applyWorldAction(save,{type:'hubDialogueIntent',npcId:'noah_leroux',intentId:'invented'}),/Sujet de conversation inconnu/);
});

test('liberated guardians stay alive through post-missions relationships and final roles',()=>{
 assert.equal(validateGuardianRelationships(),true);
 assert.equal(GUARDIAN_RELATIONSHIPS.length,4);
 const seals=['france','algerie'];
 const relations=guardianRelationshipsFor('france',seals);
 assert.equal(relations.length,1);
 assert.equal(relations[0].id,'justice-loyalty');
 assert.equal(guardianRelationshipsFor('france',['france']).length,0);
 const view=guardianHubState('france',{seals});
 assert.equal(view.stage,'dialogue');
 assert.match(view.postMission,/enquêtes|médiations|dossiers/i);
 assert.ok(view.finalRole.length>30);
 const union=guardianHubState('estonie',{seals:Object.keys(GUARDIAN_RESONANCES)});
 assert.equal(union.stage,'union');
 assert.match(union.line,/pattern final/i);
});

test('all eight guardian resonances are usable out of combat without awarding or skipping progression',()=>{
 assert.equal(validateResonanceContextContracts(),true);
 assert.equal(Object.keys(RESONANCE_CONTEXT_CONTRACTS).length,8);
 assert.equal(new Set(Object.values(RESONANCE_CONTEXT_CONTRACTS).map(rule=>rule.mode)).size,8);
 const regions=Object.keys(GUARDIAN_RESONANCES),base=blankSave();
 for(const region of regions){
  const rule=RESONANCE_CONTEXT_CONTRACTS[region],item={id:'context:'+region,type:rule.types[0]},verb=rule.verbs[0];
  let save={...base,seals:[...regions],adventure:{...base.adventure,resonance:region}};
  const candidate=resonanceContextCandidate(save,item,verb);assert.equal(candidate?.region,region,region);
  const before={xp:save.xp,shards:save.shards,missions:JSON.stringify(save.hub.missions)};
  save=applyWorldAction(save,{type:'resonanceContext',targetId:item.id,targetType:item.type,verb});
  assert.equal(save.adventure.resonanceContext.region,region);
  assert.equal(save.adventure.resonanceContext.mode,rule.mode);
  assert.equal(save.xp,before.xp,region+' xp');
  assert.equal(save.shards,before.shards,region+' shards');
  assert.equal(JSON.stringify(save.hub.missions),before.missions,region+' mission progression');
  assert.ok(resonanceContextMessage(save.adventure.resonanceContext).length>35,region+' message');
 }
 let france={...base,seals:['france'],adventure:{...base.adventure,resonance:'france'}};
 let actions=contextActions({id:'proof:a',type:'evidence'},{save:france,region:'france'});
 assert.ok(actions.some(action=>action.id==='resonance'&&action.resonanceRegion==='france'));
 france=applyWorldAction(france,{type:'resonanceContext',targetId:'proof:a',targetType:'evidence',verb:'inspect'});
 actions=contextActions({id:'proof:a',type:'evidence'},{save:france,region:'france'});
 assert.match(actions.find(action=>action.id==='inspect')?.caption||'',/Lecture juste active/);
 assert.throws(()=>applyWorldAction(france,{type:'resonanceContext',targetId:'enemy',targetType:'vehicle',verb:'drive'}),/ne répond pas/);
});

test('guardian resonances have combat exploration puzzle and rescue uses without creating a ninth value',()=>{
 assert.equal(validateResonances(),true);
 assert.equal(Object.keys(GUARDIAN_RESONANCES).length,8);
 assert.equal(new Set(Object.values(GUARDIAN_RESONANCES).map(a=>a.id)).size,8);
 for(const [region,ability] of Object.entries(GUARDIAN_RESONANCES)){
  for(const key of ['combat','exploration','puzzle','rescue','limit'])assert.ok(ability[key].length>30,region+' '+key);
 }
 const save={...blankSave(),seals:['france','algerie','estonie']};
 assert.deepEqual(unlockedResonances(save).map(a=>a.region),['france','algerie','estonie']);
 assert.match(RING_ABILITIES.linkPulse.rule,/pas une neuvième valeur/i);
});

test('guardian fights and the final confrontation expose eight distinct gameplay rules',()=>{
 assert.equal(validateGuardianCombatRules(),true);
 assert.equal(Object.keys(GUARDIAN_COMBAT_RULES).length,8);
 assert.equal(new Set(Object.values(GUARDIAN_COMBAT_RULES).map(rule=>rule.id)).size,8);
 assert.equal(validateFinalCircle(),true);
 assert.equal(FINAL_CIRCLE_PHASES.length,8);
 assert.deepEqual(FINAL_CIRCLE_PHASES.map(phase=>phase.region),['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie']);
 assert.equal(finalCirclePhase({final:true,enemy:800,enemyMax:800}).index,1);
 assert.equal(finalCirclePhase({final:true,enemy:700,enemyMax:800}).index,2);
 assert.equal(finalCirclePhase({final:true,enemy:400,enemyMax:800}).index,5);
 assert.equal(finalCirclePhase({final:true,enemy:0,enemyMax:800}).index,8);
});

test('core controls are remappable by action and preserve AZERTY WASD and arrow fallbacks',()=>{
 const defaults=defaultControlBindings();
 assert.equal(validateControlBindings(defaults),true);
 assert.ok(defaults.moveForward.includes('z'));
 assert.ok(defaults.moveForward.includes('w'));
 assert.ok(defaults.moveForward.includes('arrowup'));
 const remapped=setPrimaryControl(defaults,'interact','f');
 assert.equal(controlMatches(remapped,'interact','f'),true);
 assert.equal(controlMatches(remapped,'interact','e'),false);
 assert.equal(controlLabel(remapped,'interact'),'F');
 assert.equal(actionHeld(remapped,'moveForward',new Set(['z'])),true);
 const invalid=normalizeControlBindings({interact:['not-a-key']});
 assert.equal(invalid.interact[0],CONTROL_ACTIONS.interact.default[0]);
});

test('co-op coordination provides modern pings and proximity-based shared objective readiness',()=>{
 assert.equal(validateCoopSession(),true);
 assert.ok(Object.keys(PARTY_SIGNALS).length>=8);
 for(const id of ['danger','ready','regroup','objective','wait'])assert.ok(PARTY_SIGNALS[id],id);
 const now=10000,peers=[
  {id:'a',region:'france',x:1,z:1,received:9900},
  {id:'b',region:'france',x:20,z:20,received:9900},
  {id:'c',region:'italie',x:1,z:1,received:9900},
 ];
 let state=sharedObjectiveState(peers,{region:'france',x:0,z:0},{required:2,radius:5,selfPresent:true,now});
 assert.equal(state.ready,true);assert.equal(state.count,2);assert.deepEqual(state.members,['a']);
 state=sharedObjectiveState(peers,{region:'france',x:0,z:0},{required:3,radius:5,selfPresent:true,now});
 assert.equal(state.ready,false);
});

test('authoritative coop runtime uses its own RPC and merges state without replacing smooth realtime pose',async()=>{
 let call=null;
 const client={rpc:async(name,args)=>{call={name,args};return{data:{party_id:'party',members:[]},error:null};}};
 const result=await partyRuntimeRequest('heartbeat',{region:'france',x:4,z:5,heading:90},client);
 assert.equal(result.party_id,'party');
 assert.equal(call.name,'world_party_runtime_command');
 assert.deepEqual(call.args,{p_action:'heartbeat',p_payload:{region:'france',x:4,z:5,heading:90}});
 assert.equal(validRuntimeMember({id:'u2',region:'france',x:2,z:3,heading:0,state:'downed'}),true);
 assert.equal(validRuntimeMember({id:'u2',region:'france',x:999,z:3,heading:0,state:'downed'}),false);
 const realtime=[{id:'u2',region:'france',x:9,z:10,heading:45,seq:8,received:900,signal:null}];
 const runtime=[{id:'u2',region:'france',x:2,z:3,heading:0,state:'downed',revision:4,updated_at:'2026-09-21T01:00:00Z'},{id:'u3',region:'france',x:6,z:7,heading:15,state:'active',revision:2}];
 const members=[{id:'u2',avatar:{name:'A'}},{id:'u3',avatar:{name:'B'}}];
 const merged=mergeRuntimePeers(realtime,runtime,members,1000),u2=merged.find(peer=>peer.id==='u2'),u3=merged.find(peer=>peer.id==='u3');
 assert.equal(u2.lifeState,'downed');assert.equal(u2.x,9);assert.equal(u2.z,10);assert.equal(u2.runtimeRevision,4);
 assert.equal(u3.lifeState,'active');assert.equal(u3.x,6);assert.equal(u3.z,7);
});

test('coop authority is wired through downed interactions shared objectives and the applied migration manifest',()=>{
 const scene=read('src/world/scene.js'),page=read('src/world/WorldPage.jsx'),actors=read('src/world/party-actors.js'),panel=read('src/world/PartyPanel.jsx');
 assert.match(scene,/type:'downedPlayer'/);
 assert.match(page,/\.revive\(item\.userId\)/);
 assert.match(page,/\.down\(\)/);
 assert.match(page,/refuge-regroup:/);
 assert.match(panel,/Valider le regroupement · 2 voyageurs/);
 assert.match(actors,/À TERRE/);
 const manifest=JSON.parse(read('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json'));
 assert.equal(manifest.count,108);
 for(const version of ['20260921012440','20260921012512','20260921013055'])assert.ok(manifest.migrations.some(row=>row.version===version),version);
 const runtimeSql=read('supabase/migrations/20260921012440_world_party_runtime_authority_v1.sql');
 const recoverySql=read('supabase/migrations/20260921013055_world_party_runtime_save_recovery_v2.sql');
 assert.match(runtimeSql,/world_party_runtime_command/);
 assert.match(runtimeSql,/Rapproche-toi du voyageur pour le réanimer/);
 assert.match(runtimeSql,/world_party_objectives/);
 assert.match(recoverySql,/world_party_runtime_state_guard/);
 assert.match(recoverySql,/ceil\(v_max_hp\*\.35\)/);
});

test('co-op pose validation covers the real metropolis radius instead of the old 261-unit cap',()=>{
 const hubRadius=worldRadiusFor('hub');
 assert.ok(hubRadius>300,'Hub must be materially larger than country maps for this regression test');
 assert.equal(validPose({seq:1,region:'hub',x:300,z:0,heading:90}),true);
 assert.equal(validPose({seq:2,region:'hub',x:hubRadius+2,z:0,heading:0}),false);
 assert.equal(validPose({seq:3,region:'france',x:WORLD_RADIUS+2,z:0,heading:0}),false);
 assert.equal(validPose({seq:4,region:'france',x:WORLD_RADIUS-2,z:0,heading:0}),true);
});

test('runtime surfaces use contextual prompts multimodal feedback and remappable controls',()=>{
 const hud=read('src/world/WorldHUD.jsx'),page=read('src/world/WorldPage.jsx'),scene=read('src/world/scene.js'),audio=read('src/world/audio.js'),controls=read('src/world/CombatControls.jsx'),field=read('src/world/FieldEncounter.jsx');
 assert.match(hud,/contextActions/);
 assert.match(hud,/controlLabel\(controls,'interact'\)/);
 assert.doesNotMatch(hud,/<kbd>E<\/kbd>/);
 assert.match(page,/hubDialogueIntent/);
 assert.match(page,/Parler de…/);
 assert.match(page,/world-controls/);
 assert.match(page,/Vibrations/);
 assert.match(page,/navigator\?\.vibrate|navigator\.vibrate/);
 assert.match(scene,/loadControlBindings/);
 assert.match(scene,/controlMatches\(controls,'interact'/);
 assert.doesNotMatch(scene,/key==='e'/);
 assert.match(audio,/function interaction\(actionId\)/);
 assert.match(audio,/actionFeedback/);
 assert.match(hud,/play-context-actions/);
 assert.match(hud,/onContextAction/);
 assert.match(page,/scene\.current\?\.combatAction\(kind\)/);
 assert.match(controls,/if\(e\.field\)onFieldAction\?\.\(kind\)/);
 assert.match(field,/onFieldAction=\{onFieldAction\}/);
});
