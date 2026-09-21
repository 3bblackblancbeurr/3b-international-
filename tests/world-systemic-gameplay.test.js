import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIONS,contextActions,primaryContextAction,validateInteractionCatalog} from '../src/world/interaction-system.js';
import {GUARDIAN_CAMPAIGNS,INDEPENDENT_MISSION_ARCHETYPES,centralMissionIndex,validateMissionArchitecture} from '../src/world/mission-index.js';
import {HUB_DIALOGUE_INTENT_SET,hubDialogueIntents,hubDialogueIntentResponse} from '../src/world/hub/dialogue-intents.js';
import {GUARDIAN_RELATIONSHIPS,guardianRelationshipsFor,guardianHubState,validateGuardianRelationships} from '../src/world/guardian-relations.js';
import {GUARDIAN_RESONANCES,RING_ABILITIES,unlockedResonances,validateResonances} from '../src/world/guardian-resonances.js';
import {CONTROL_ACTIONS,defaultControlBindings,normalizeControlBindings,setPrimaryControl,controlMatches,actionHeld,controlLabel,validateControlBindings} from '../src/world/control-bindings.js';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {validPose} from '../src/world/cooperation.js';
import {worldRadiusFor,WORLD_RADIUS} from '../src/world/terrain.js';

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
 assert.deepEqual(unlockedResonances(save).map(a=>a.region),['france','estonie','algerie'].filter(id=>save.seals.includes(id)));
 assert.match(RING_ABILITIES.linkPulse.rule,/pas une neuvième valeur/i);
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

test('co-op pose validation covers the real metropolis radius instead of the old 261-unit cap',()=>{
 const hubRadius=worldRadiusFor('hub');
 assert.ok(hubRadius>300,'Hub must be materially larger than country maps for this regression test');
 assert.equal(validPose({seq:1,region:'hub',x:300,z:0,heading:90}),true);
 assert.equal(validPose({seq:2,region:'hub',x:hubRadius+2,z:0,heading:0}),false);
 assert.equal(validPose({seq:3,region:'france',x:WORLD_RADIUS+2,z:0,heading:0}),false);
 assert.equal(validPose({seq:4,region:'france',x:WORLD_RADIUS-2,z:0,heading:0}),true);
});

test('runtime surfaces use contextual prompts multimodal feedback and remappable controls',()=>{
 const hud=read('src/world/WorldHUD.jsx'),page=read('src/world/WorldPage.jsx'),scene=read('src/world/scene.js'),audio=read('src/world/audio.js');
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
});
