import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIONS,contextActions,primaryContextAction,validateInteractionCatalog} from '../src/world/interaction-system.js';
import {GUARDIAN_CAMPAIGNS,INDEPENDENT_MISSION_ARCHETYPES,centralMissionIndex,validateMissionArchitecture} from '../src/world/mission-index.js';
import {HUB_DIALOGUE_INTENT_SET,hubDialogueIntents,hubDialogueIntentResponse} from '../src/world/hub/dialogue-intents.js';
import {GUARDIAN_RELATIONSHIPS,guardianRelationshipsFor,guardianHubState,validateGuardianRelationships} from '../src/world/guardian-relations.js';
import {GUARDIAN_RESONANCES,RING_ABILITIES,unlockedResonances,validateResonances} from '../src/world/guardian-resonances.js';
import {GUARDIAN_COMBAT_RULES,validateGuardianCombatRules} from '../src/world/guardian-combat.js';
import {FINAL_CIRCLE_PHASES,finalCirclePhase,validateFinalCircle} from '../src/world/final-circle.js';
import {CONTROL_ACTIONS,defaultControlBindings,normalizeControlBindings,setPrimaryControl,controlMatches,actionHeld,controlLabel,validateControlBindings} from '../src/world/control-bindings.js';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {validPose} from '../src/world/cooperation.js';
import {worldRadiusFor,WORLD_RADIUS} from '../src/world/terrain.js';
import {HUB_MISSION_ACTION_PLANS,applyHubMissionAction,hubMissionActionTargets,validateHubMissionActionPlans} from '../src/world/hub/mission-actions.js';
import {hubRuntime} from '../src/world/hub/runtime-data.js';
import {DISTRICT_JOBS,applyDistrictJobAction,currentJobActions,jobReadyToTurnIn,validateDistrictJobs} from '../src/world/district-jobs.js';
import {serviceItems} from '../src/world/settlements.js';
import {PARTY_SIGNALS,sharedObjectiveState,validateCoopSession} from '../src/world/coop-session.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('contextual interaction catalog covers the systemic verbs without inaccessible hold-only actions',()=>{
 assert.equal(validateInteractionCatalog(),true);
 assert.ok(Object.keys(ACTIONS).length>=35);
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
  assert.equal(mission.implementation,'hybrid');
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
 assert.equal(Object.keys(DISTRICT_JOBS).length,8);
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
