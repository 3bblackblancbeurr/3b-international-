import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFranceInvestigationScene} from '../src/world/france-investigation-scene.js';
import {FRANCE_INVESTIGATION_STATIONS,franceInvestigationObjective} from '../src/world/france-investigation.js';
import {blankCampaignState} from '../src/world/campaign-state.js';
import {campaignSnapshot} from '../src/world/campaign-runtime.js';
import {obstacleDistance} from '../src/world/collision.js';
import {realmCivilianRoadItems,realmStaticObstacles} from '../src/world/realm-layout.js';
import {createCivilianRoutes,civilianRoutePoint} from '../src/world/ambient-civilian-routes.js';

const phases=['rumor','evidence','coordination','memory','value','guardian','homecoming','post'];
function save({completed=[],step=0,effects=[],inventory={},...extra}={}){
 return{region:'france',adventure:{companion:'C001',companionOrder:'follow',...extra,campaigns:{france:{...blankCampaignState(),completed,phase:completed.length,step,effects,inventory,active:true}}}};
}
const station=(scene,id)=>scene.root.children.find(child=>child.userData.stationId===id);
const descendant=(scene,name)=>scene.root.getObjectByName(name);

test('persistent France stations have readable physical props with a small fixed rendering budget',()=>{
 const scene=createFranceInvestigationScene(save(),{groundY:()=>2});
 assert.equal(scene.diagnostics.stations,7);
 assert.ok(scene.diagnostics.meshes<=10,JSON.stringify(scene.diagnostics));
 assert.ok(scene.diagnostics.vertices<11000);
 for(const row of FRANCE_INVESTIGATION_STATIONS){
  const group=station(scene,row.id);assert.ok(group,row.id);
  assert.deepEqual([group.position.x,group.position.z],[row.position.x,row.position.z]);
  assert.equal(group.position.y,2);assert.ok(group.name.includes(row.place));
  if(row.kind!=='plateau'){assert.ok(group.userData.label);const bounds=new THREE.Box3().setFromObject(group);assert.ok(bounds.max.y>=5.4,'shelves and signs read above the player waist');}
 }
 assert.ok(descendant(scene,'Premier plateau · compagnon'));
 assert.ok(descendant(scene,'Second plateau · Kaïs'));
 assert.ok(scene.cameraSolids.every(solid=>Number.isFinite(solid.bottom)&&solid.top>solid.bottom));
 scene.dispose();
});

test('all interaction approaches and both plates remain free of physical furniture',()=>{
 const scene=createFranceInvestigationScene(save());
 const plateau=FRANCE_INVESTIGATION_STATIONS.find(row=>row.kind==='plateau');
 for(const point of [...FRANCE_INVESTIGATION_STATIONS.map(row=>row.position),{x:plateau.position.x+18,z:plateau.position.z}]){
  assert.ok(scene.collisions.every(obstacle=>obstacleDistance(point,obstacle)>3),JSON.stringify(point));
 }
 for(const row of FRANCE_INVESTIGATION_STATIONS.filter(row=>row.kind!=='plateau')){
  assert.ok(scene.collisions.some(obstacle=>obstacleDistance({x:row.position.x,z:row.position.z-4.8},obstacle)<0),'solid tables have colliders');
 }
 const routes=createCivilianRoutes(realmCivilianRoadItems('france'),{obstacles:[...realmStaticObstacles('france'),...scene.collisions]});
 assert.ok(routes.length>0);
 for(const route of routes)for(let sample=0;sample<=20;sample++)assert.ok(scene.collisions.every(obstacle=>obstacleDistance(civilianRoutePoint(route,sample/20),obstacle)>.85),'resident aisles yield to the same furniture');
 scene.dispose();
});

test('shared material batches preserve station and accepted-state culling without uploading unchanged indices',()=>{
 const scene=createFranceInvestigationScene(save()),batches=descendant(scene,'3B · Enquête · matériaux partagés'),renderMeshes=batches.children.filter(object=>object.isMesh&&!object.isInstancedMesh);
 assert.ok(renderMeshes.length<=6,'five palette materials plus the browser plaque atlas');
 const versions=renderMeshes.map(mesh=>mesh.geometry.index.version),counts=renderMeshes.map(mesh=>mesh.geometry.drawRange.count);
 scene.tick(.016,null,null);assert.deepEqual(renderMeshes.map(mesh=>mesh.geometry.index.version),versions,'unchanged scenery reuses the uploaded element buffers');
 scene.tick(.016,{x:0,z:-10000},null);
 assert.ok(renderMeshes.every(mesh=>!mesh.visible&&mesh.geometry.drawRange.count===0));
 assert.equal(descendant(scene,'3B · Feuillets examinés').count,0);
 scene.tick(.016,null,null);assert.deepEqual(renderMeshes.map(mesh=>mesh.geometry.drawRange.count),counts,'returning restores every visible station range');
 scene.update(save({effects:['archives_ouvertes','noms_retablis','dossier_resolu']}));
 assert.notDeepEqual(renderMeshes.map(mesh=>mesh.geometry.drawRange.count),counts,'accepted variants affect the rendered batch, not only hidden source nodes');
 scene.dispose();
});

test('only accepted effects change persistent archive, names and corrected dossier states',()=>{
 const initial=save(),scene=createFranceInvestigationScene(initial),original=JSON.stringify(initial);
 const restored=(id,name)=>station(scene,id).getObjectByName(name).visible;
 assert.equal(restored('archive','Faits rendus au registre'),false);
 scene.update(save({completed:phases.slice(0,7)}));
 assert.deepEqual(scene.root.userData.investigation,{archivesOpen:false,namesRestored:false,caseResolved:false},'phase counters alone never repair the district');
 const accepted=save({completed:phases,effects:['archives_ouvertes','noms_retablis','dossier_resolu']});
 scene.update(accepted);
 for(const id of ['archive','bindery','quay','atelier'])assert.equal(restored(id,'Faits rendus au registre'),true,id);
 for(const id of ['archive','forum'])assert.equal(restored(id,'Dossier signé · correction conservée'),true,id);
 const loaded=createFranceInvestigationScene(JSON.parse(JSON.stringify(accepted)));
 assert.deepEqual(loaded.root.userData.investigation,scene.root.userData.investigation,'reload restores the same accepted physical state');
 scene.update(initial);assert.equal(restored('archive','Faits rendus au registre'),false,'switching saves clears old state');
 assert.equal(JSON.stringify(initial),original,'scenery never mutates the account save');
 scene.dispose();loaded.dispose();
});

test('the two flush plates reflect the accepted relay hold and guard order without awarding progress',()=>{
 const active=save({completed:phases.slice(0,2),companionOrder:'guard'});Object.assign(active.adventure.campaigns.france,{started:true,trial:8});
 const scene=createFranceInvestigationScene(active),snapshot=campaignSnapshot(active,'france');
 scene.tick(.1,snapshot.relay.player,snapshot);
 assert.deepEqual(scene.root.userData.relay,{started:true,companionHeld:true,hold:8,required:15});
 const counter=descendant(scene,'3B · Lien tenu · progression');assert.equal(counter.count,8);
 const left=descendant(scene,'Premier plateau · compagnon'),right=descendant(scene,'Second plateau · Kaïs');
 assert.equal(right.position.x-left.position.x,18);assert.equal(right.position.z,left.position.z);
 assert.deepEqual({x:left.position.x,z:left.position.z},snapshot.relay.companion);
 assert.deepEqual({x:right.position.x,z:right.position.z},snapshot.relay.player);
 const notGuarding=structuredClone(active);notGuarding.adventure.companionOrder='follow';scene.update(notGuarding);scene.tick(.1,snapshot.relay.player,snapshot);assert.equal(scene.root.userData.relay.companionHeld,false);
 scene.tick(.1,snapshot.relay.player,null);assert.equal(counter.count,0);assert.equal(scene.root.userData.relay.started,false);
 assert.equal(active.adventure.campaigns.france.trial,8);
 scene.dispose();
});

test('accepted clues get one bounded prop response, while duplicates and failed choices stay still',()=>{
 const before=save(),after=save({step:1,inventory:{temoignage_lea:1}}),scene=createFranceInvestigationScene(before);
 const response=scene.accept(before,after);assert.equal(response.animation,'Talk');
 assert.deepEqual(response.position,franceInvestigationObjective('rumor','relieuse').position);
 const sheet=station(scene,'bindery').getObjectByName('Feuillet examiné');
 scene.tick(.1,null,null);assert.notEqual(sheet.rotation.x,0);
 assert.equal(scene.accept(before,after),null,'replayed accepted action does not restart the response');
 for(let frame=0;frame<10;frame++)scene.tick(.1,null,null);
 assert.equal(sheet.rotation.x,0,'the prop always settles without another timer');
 assert.equal(scene.accept(after,structuredClone(after)),null);
 const changedClock=structuredClone(after);changedClock.adventure.campaigns.france.clock=10;assert.equal(scene.accept(after,changedClock),null,'trial clock is not an accepted clue');
 const reduced=createFranceInvestigationScene(before,{reducedMotion:true});reduced.accept(before,after);reduced.tick(.1,null,null);assert.equal(station(reduced,'bindery').getObjectByName('Feuillet examiné').rotation.x,0);
 scene.dispose();reduced.dispose();
});

test('owned resources release exactly once and borrowed scene materials remain owned by the scene',()=>{
 const shared=new Map(),scene=createFranceInvestigationScene(save(),{material:(color,extra)=>{const key=JSON.stringify([color,extra]);if(!shared.has(key))shared.set(key,new THREE.MeshStandardMaterial({color,...extra}));return shared.get(key);}});
 let sharedDisposals=0;for(const material of shared.values())material.addEventListener('dispose',()=>sharedDisposals++);
 const geometries=new Set();scene.root.traverse(object=>{if(object.isMesh)geometries.add(object.geometry);});
 let geometryDisposals=0;for(const geometry of geometries)geometry.addEventListener('dispose',()=>geometryDisposals++);
 const parent=new THREE.Group();parent.add(scene.root);scene.dispose();scene.dispose();
 assert.equal(scene.root.parent,null);assert.equal(geometryDisposals,geometries.size);assert.equal(sharedDisposals,0);
 scene.update(save());scene.tick(.1,null,null);assert.equal(scene.accept(save(),save({step:1})),null);
 for(const material of shared.values())material.dispose();
});
