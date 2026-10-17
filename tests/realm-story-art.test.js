import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {blankSave} from '../src/world/rules.js';
import {blankCampaignState} from '../src/world/campaign-state.js';
import {CAMPAIGN_RUNTIME_SPEC,campaignEffectIds,campaignTokenIds} from '../src/world/campaign-spec.js';
import {campaignSnapshot} from '../src/world/campaign-runtime.js';
import {createRealmMarker} from '../src/world/realm-effects.js';
import {createRealmStoryRelic} from '../src/world/realm-story-relic.js';
import {REALM_STORY_STAGING,realmStoryStaging,realmStoryPlacement} from '../src/world/realm-story-staging.js';
import {realmPositionValid} from '../src/world/realm-layout.js';

const regions=Object.keys(REALM_STORY_STAGING);
function objective(region,phaseIndex=1,stepIndex=0,effects=[],inventory={}){
 const save=blankSave();save.region=region;save.visited=[region];
 save.adventure.campaigns[region]={...blankCampaignState(),active:true,completed:CAMPAIGN_RUNTIME_SPEC[region].slice(0,phaseIndex).map(phase=>phase.id),step:stepIndex,effects,inventory};
 const campaign=campaignSnapshot(save,region);
 return{id:campaign.objective,region,type:'campaignObjective',mode:campaign.mode,...campaign.target,campaign};
}
const geometrySignature=art=>art.root.children.map(mesh=>Array.from(mesh.geometry.attributes.position.array).reduce((sum,value,index)=>sum+value*(index%19+1),0).toFixed(4)).join(':');

test('seven campaigns use distinct complete 3D mission objects with three bounded opaque batches',()=>{
 const signatures=new Set();
 for(const region of regions){
  const art=createRealmStoryRelic(objective(region));assert.ok(art,region);
  assert.equal(art.root.children.length,3);assert.equal(art.stage.region,region);
  let vertices=0,triangles=0;
  for(const mesh of art.root.children){
   assert.ok(mesh.isMesh);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.vertexColors,true);
   const geometry=mesh.geometry;vertices+=geometry.attributes.position.count;triangles+=geometry.index.count/3;
   for(const attribute of Object.values(geometry.attributes))assert.ok([...attribute.array].every(Number.isFinite),region+' finite GPU data');
   for(let index=0;index<geometry.attributes.normal.count;index++)assert.ok(Math.abs(Math.hypot(geometry.attributes.normal.getX(index),geometry.attributes.normal.getY(index),geometry.attributes.normal.getZ(index))-1)<.001);
  }
  assert.ok(vertices<4000,region+' mobile vertex budget');assert.ok(triangles>200&&triangles<4000,region+' actual detailed physical geometry');
  const bounds=new THREE.Box3().setFromObject(art.root);assert.ok(bounds.max.y>=2.3&&bounds.max.y<=4.1,'scenery reads at character scale');
  assert.ok(bounds.max.x-bounds.min.x<6.4&&bounds.max.z-bounds.min.z<6.4,'bounded local scenery');
  signatures.add(geometrySignature(art));art.dispose();
 }
 assert.equal(signatures.size,7,'no country reuses the same relic silhouette');
});

test('every authored campaign step retains its canonical target and an unobstructed prop placement',()=>{
 for(const region of regions)for(let phaseIndex=0;phaseIndex<8;phaseIndex++){
  const phase=CAMPAIGN_RUNTIME_SPEC[region][phaseIndex];
  for(let stepIndex=0;stepIndex<phase.steps.length;stepIndex++){
   const item=objective(region,phaseIndex,stepIndex),before=JSON.stringify(item),stage=realmStoryStaging(item);
   if(['guardian','homecoming'].includes(phase.id)){assert.equal(stage,null);continue;}
   assert.ok(stage?.speaker&&stage?.clue&&stage?.actionLabel&&stage?.place);
   assert.equal(stage.stepId,phase.steps[stepIndex].id);assert.ok(realmPositionValid(region,item.campaign.target));
   const placement=realmStoryPlacement(item);assert.ok(placement.clearance>=1.1,region+':'+phase.id+':'+stepIndex+' scenery must fit outside real realm obstacles');
   assert.ok(Math.hypot(placement.x,placement.z)>=4.5,'the objective approach remains clear');
   assert.equal(JSON.stringify(item),before,'scenery cannot move or award a gameplay objective');
  }
 }
});

test('restored state reads only accepted country effects and inventory, and changes physical geometry',()=>{
 for(const region of regions){
  const item=objective(region,7),before=realmStoryStaging(item),original=createRealmStoryRelic(item),signature=geometrySignature(original);
  item.campaign={...item.campaign,phaseIndex:8,trial:999,clock:999,integrity:0,effects:['invented'],inventory:{invented:99}};
  assert.equal(realmStoryStaging(item).restored,false);assert.equal(realmStoryStaging(item).key,before.key,'clocks and invented repairs cannot change scenery');
  item.campaign.effects=campaignEffectIds(region);item.campaign.inventory=Object.fromEntries(campaignTokenIds(region).map(id=>[id,1]));
  const restored=createRealmStoryRelic(item);assert.equal(restored.stage.restored,true);assert.notEqual(geometrySignature(restored),signature,region+' repair changes physical construction');
  original.dispose();restored.dispose();
 }
});

test('reused live markers replace and dispose old country props only after canonical scene state changes',()=>{
 for(const region of regions){
  const item=objective(region),marker=createRealmMarker(item),first=marker.root.children.find(child=>child.userData.storyStage);
  assert.ok(first);const resources=new Set(first.children.flatMap(mesh=>[mesh.geometry,mesh.material])),disposed=new Map();
  for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
  marker.update({...item,campaign:{...item.campaign,tick:500,clock:500,trial:3,started:true}});
  assert.equal(marker.root.children.find(child=>child.userData.storyStage),first,'100 ms trial cycles reuse uploaded geometry');assert.equal(disposed.size,0);
  marker.update({...item,campaign:{...item.campaign,effects:campaignEffectIds(region)}});
  assert.notEqual(marker.root.children.find(child=>child.userData.storyStage),first);assert.equal(disposed.size,6);assert.ok([...disposed.values()].every(count=>count===1));
  assert.equal(first.parent,null);marker.tick(2,{x:item.x,z:item.z},{reducedMotion:true});marker.dispose();marker.dispose();
  assert.ok([...disposed.values()].every(count=>count===1),'retired resources are never disposed twice');
 }
});

test('story staging leaves France artefacts, guardian fights, homecoming and travel markers on their existing paths',()=>{
 for(const region of [...regions,'france']){
  assert.equal(createRealmStoryRelic({...objective(region),type:'realmTravel'}),null);
  assert.equal(createRealmStoryRelic(objective(region,5)),null);
  assert.equal(createRealmStoryRelic(objective(region,6)),null);
 }
 assert.equal(createRealmStoryRelic(objective('france')),null);
});
