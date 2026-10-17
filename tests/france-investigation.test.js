import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {campaignSnapshot,campaignObjectives} from '../src/world/campaign-runtime.js';
import {CAMPAIGN_RUNTIME_SPEC} from '../src/world/campaign-spec.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {FRANCE_INVESTIGATION_STATIONS,franceInvestigationObjective,franceInvestigationState} from '../src/world/france-investigation.js';
import {realmCampaignPosition,realmDimensions,realmPositionValid,realmSites,realmStaticObstacles} from '../src/world/realm-layout.js';
import {obstacleDistance} from '../src/world/collision.js';
import {findPath} from '../src/world/navigation.js';

const reload=save=>normalizeSave(JSON.parse(JSON.stringify(save)));
const arrive=()=>reload(applyWorldAction(blankSave(),{type:'visit',region:'france'}));
function act(save,extra={}){
 const current=campaignSnapshot(save,'france');
 return reload(applyWorldAction(save,{type:'campaignAction',region:'france',objective:current.objective,operation:'interact',position:current.target,...extra}));
}
const choice=(save,value)=>act(save,{choice:value});
function reachArchives(){let save=arrive();save=act(save);save=act(save);return choice(save,'archive');}

test('France testimony, archives and return scenes form a compact walkable district with room for staging',()=>{
 const obstacles=realmStaticObstacles('france'),radius=realmDimensions('france').radius;
 const arrival=realmSites('france').find(site=>site.id==='france:realm:province-0').arrival;
 for(const station of FRANCE_INVESTIGATION_STATIONS){
  assert.ok(realmPositionValid('france',station.position),station.id+' lies in the real walkable realm');
  assert.ok(Math.min(...obstacles.map(obstacle=>obstacleDistance(station.position,obstacle)))>=4,station.id+' leaves room for Kaïs and the physical staging');
  const path=findPath(arrival,station.position,obstacles,radius);
  assert.ok(path.length,station.id+' is reachable from the province relay with the actual walking pathfinder');
  assert.ok(Math.hypot(path.at(-1).x-station.position.x,path.at(-1).z-station.position.z)<.1);
  assert.ok(Math.hypot(arrival.x-station.position.x,arrival.z-station.position.z)<100,'no cross-province journey for a conversation');
 }
 for(const phaseId of ['rumor','evidence','post']){
  const phase=CAMPAIGN_RUNTIME_SPEC.france.find(row=>row.id===phaseId);
  const scenes=phase.steps.map(step=>franceInvestigationObjective(phaseId,step.id));
  for(let index=1;index<scenes.length;index++){
   const before=scenes[index-1].position,after=scenes[index].position,distance=Math.hypot(before.x-after.x,before.z-after.z);
   assert.ok(distance>13,'the next evidence cannot be accepted from the previous speaking range');
   assert.ok(distance<100,'each interaction follows the nearby authored town');
   assert.ok(findPath(before,after,obstacles,radius).length,'the next action has a real walking route');
  }
 }
 const plateau=franceInvestigationObjective('coordination','relais').position,other={x:plateau.x+18,z:plateau.z};
 assert.ok(realmPositionValid('france',other));assert.ok(findPath(plateau,other,obstacles,radius).length);
});

test('physical witness positions and evidence choices reject shortcuts and preserve accepted traces through reload',()=>{
 let save=arrive(),current=campaignSnapshot(save),first={...current.target};
 assert.equal(current.staging.speaker,'Léa · relieuse');
 assert.equal(current.staging.evidenceId,'temoignage_lea');
 assert.deepEqual(current.investigation.testimonies,[]);
 assert.throws(()=>act(save,{objective:'france:evidence:archive'}),/ordre/);
 save=act(save,{xp:999999,effects:['dossier_resolu']});
 assert.equal(save.xp,0);assert.equal(franceInvestigationState(save).caseResolved,false);
 assert.equal(franceInvestigationState(save).testimonies.length,1);
 assert.throws(()=>act(save,{position:first}),/véritable point/);
 const replay={type:'campaignAction',region:'france',objective:'france:rumor:relieuse',position:first};
 assert.deepEqual(applyWorldAction(reload(save),replay),save);
 save=act(save);current=campaignSnapshot(save);const xp=save.xp;
 save=choice(save,'accuser');
 assert.equal(campaignSnapshot(save).objective,current.objective);assert.equal(save.xp,xp);
 assert.equal(campaignSnapshot(save).integrity,80);assert.equal(franceInvestigationState(save).testimonies.length,2);
 save=choice(save,'archive');assert.equal(campaignSnapshot(save).phaseId,'evidence');
 assert.equal(franceInvestigationState(save).archivesOpen,false);
 save=act(save);assert.deepEqual(franceInvestigationState(save).evidence.map(trace=>trace.id),['date_originale']);
 assert.throws(()=>act(save,{position:campaignSnapshot(reachArchives()).target}),/véritable point/);
 save=act(save);const evidence=franceInvestigationState(save).evidence;
 for(let count=0;count<5;count++)save=choice(save,'rumeur');
 assert.equal(campaignSnapshot(save).integrity,0);assert.equal(franceInvestigationState(save).archivesOpen,false);
 save=act(save,{operation:'retry'});assert.equal(campaignSnapshot(save).integrity,100);
 assert.deepEqual(franceInvestigationState(save).evidence,evidence);
 save=choice(save,'rapprocher');assert.equal(franceInvestigationState(save).archivesOpen,true);
 assert.equal(franceInvestigationState(save).namesRestored,false);
 assert.deepEqual(franceInvestigationState(reload(save)),franceInvestigationState(save));
});

test('the companion link requires actual presence on the other plateau before the page can be restored',()=>{
 let save=reachArchives();save=act(save);save=act(save);save=choice(save,'rapprocher');
 assert.equal(campaignSnapshot(save).phaseId,'coordination');assert.ok(save.adventure.companion);
 save=act(save);let current=campaignSnapshot(save),companion={...current.relay.companion};
 assert.equal(current.target.x,companion.x+18);assert.equal(current.target.z,companion.z);
 save=reload(applyWorldAction(save,{type:'companionOrder',value:'guard'}));
 for(let count=0;count<4;count++){current=campaignSnapshot(save);save=act(save,{operation:'tick',tick:current.tick+1,position:companion});}
 assert.equal(campaignSnapshot(save).trial,0,'standing on the companion plateau never charges the player plateau');
 assert.equal(franceInvestigationState(save).namesRestored,false);
 for(let count=0;count<15;count++){current=campaignSnapshot(save);save=act(save,{operation:'tick',tick:current.tick+1});}
 assert.equal(campaignSnapshot(save).objective,'france:coordination:reparer');
 assert.equal(franceInvestigationState(save).namesRestored,false,'the physical link does not automatically choose who keeps the page');
 save=choice(save,'garder');assert.equal(franceInvestigationState(save).namesRestored,false);
 save=choice(save,'rendre');assert.equal(franceInvestigationState(save).namesRestored,true);
 assert.equal(campaignSnapshot(save).phaseId,'memory');assert.equal(campaignSnapshot(save).staging,null);
 assert.deepEqual(campaignSnapshot(save).target,{x:realmCampaignPosition('france',0).x,z:realmCampaignPosition('france',0).z},'memory exploration preserves the original province anchors');
});

function winCeliane(save){
 save=act(save);const phases=new Set();
 for(let count=0;count<900&&!save.adventure.encounter.result;count++){
  const encounter=save.adventure.encounter,field=encounter.field,distance=Math.hypot(field.enemy.x-field.p.x,field.enemy.z-field.p.z);
  phases.add(encounter.phase);
  const kind=field.phase==='windup'?(field.windup<=400&&!field.guard?'guard':undefined):encounter.focus>=2?'power':'strike';
  save=reload(applyWorldAction(save,{type:'field',x:distance>6?(field.enemy.x-field.p.x)/distance:0,z:distance>6?(field.enemy.z-field.p.z)/distance:0,kind}));
 }
 assert.equal(save.adventure.encounter.result,'victory');
 return reload(applyWorldAction(save,{type:'leave'}));
}

test('the complete France case keeps its IDs, reward ledger, boss gate and visible consequences after every reload',()=>{
 let save=arrive();const seen=[],rewards=[];
 for(let count=0;count<100&&!campaignSnapshot(save,'france').finished;count++){
  let current=campaignSnapshot(save,'france');seen.push(current.objective);
  assert.ok(campaignObjectives(save,current.mode==='homecoming'?'hub':save.region).some(item=>item.id===current.objective));
  if(current.mode==='guardian'){save=winCeliane(save);assert.equal(franceInvestigationState(save).caseResolved,false);continue;}
  if(current.mode==='homecoming')save=reload(applyWorldAction(save,{type:'visit',region:'hub'}));
  if(current.mode==='relay'){
   save=act(save);save=reload(applyWorldAction(save,{type:'companionOrder',value:'guard'}));
   for(let tick=0;tick<15;tick++){current=campaignSnapshot(save);save=act(save,{operation:'tick',tick:current.tick+1});}
   continue;
  }
  const step=CAMPAIGN_RUNTIME_SPEC.france[current.phaseIndex].steps[current.stepIndex];
  const selected=current.mode==='value'?GUARDIAN_VALUES.france.choices[save.adventure.values.france.step]?.[0]:step.answer;
  if(current.objective==='france:post:mediation'){
   const before=save;save=choice(save,'effacer');assert.equal(franceInvestigationState(save).caseResolved,false);assert.equal(save.xp,before.xp);
  }
  const action={type:'campaignAction',region:'france',objective:current.objective,operation:'interact',position:current.target,choice:selected};
  save=reload(applyWorldAction(save,action));
  const reward=save.xp;assert.deepEqual(applyWorldAction(reload(save),action),save,'a duplicate accepted action changes neither inventory nor rewards');rewards.push(reward);
  if(current.mode==='homecoming')save=reload(applyWorldAction(save,{type:'visit',region:'france'}));
 }
 const state=save.adventure.campaigns.france,final=campaignSnapshot(save,'france');
 assert.equal(final.finished,true);assert.equal(state.completed.length,8);assert.equal(new Set(state.claimed).size,8);
 assert.ok(save.seals.includes('france'));assert.equal(save.adventure.chapters.france.restored,3);
 assert.equal(final.investigation.archivesOpen,true);assert.equal(final.investigation.namesRestored,true);assert.equal(final.investigation.caseResolved,true);
 assert.deepEqual(final.investigation.evidence.map(trace=>trace.id),['date_originale','couture','correction','aveu']);
 assert.deepEqual(seen.filter(id=>id.startsWith('france:post:')),['france:post:nouveau','france:post:contradictoire','france:post:mediation']);
 assert.ok(rewards.every((reward,index)=>index===0||reward>=rewards[index-1]));
});

test('presentation flags come from accepted evidence and effects, never from phase, clocks or unknown fields',()=>{
 const save=arrive();
 save.adventure.campaigns.france={version:1,active:true,completed:CAMPAIGN_RUNTIME_SPEC.france.map(phase=>phase.id),clock:999,trial:99,inventory:{invented:9},effects:['invented'],namesRestored:true,caseResolved:true};
 assert.deepEqual(franceInvestigationState(save),{testimonies:[],evidence:[],archivesOpen:false,namesRestored:false,caseResolved:false});
 assert.equal(franceInvestigationObjective('memory','memory0'),null);
 const metadata=franceInvestigationObjective('rumor','relieuse');metadata.position.x=0;
 assert.notEqual(franceInvestigationObjective('rumor','relieuse').position.x,0,'callers cannot move the shared authored stations');
});
