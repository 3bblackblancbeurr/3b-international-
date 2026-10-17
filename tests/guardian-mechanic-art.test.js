import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGuardianMechanicArt} from '../src/world/guardian-mechanic-art.js';
import {guardianBossPresentation,GUARDIAN_BOSS_PHASES} from '../src/world/guardian-combat.js';
import {createRealmEffects} from '../src/world/realm-effects.js';

const regions=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
const encounter=(region,extra={})=>({boss:true,region,enemy:100,enemyMax:100,guardianMeter:74,guardianShield:26,guardianFlag:false,field:{home:{x:100,z:200},p:{x:102,z:203},enemy:{x:100,z:200},aim:{x:104,z:205},phase:'windup'},...extra});
const node=(art,name)=>art.root.getObjectByName(name);
const matching=(art,pattern)=>{const result=[];art.root.traverse(object=>{if(pattern.test(object.name))result.push(object);});return result;};
const instanceValues=art=>{const result=[];art.root.traverse(object=>{if(object.isInstancedMesh)result.push(...object.instanceMatrix.array);});return result;};

test('seven guardian mechanics have distinct tangible geometry in at most four instanced material batches',()=>{
 const signatures=new Set();
 for(const region of regions){
  const art=createGuardianMechanicArt(region),source=encounter(region),presentation=guardianBossPresentation(source),original=JSON.stringify(source);art.update(presentation);
  assert.equal(art.root.visible,true);assert.equal(art.root.userData.projection,true);assert.ok(art.diagnostics.renderMeshes<=4);assert.ok(art.diagnostics.parts>8&&art.diagnostics.parts<90);
  let lights=0,meshes=0;art.root.traverse(object=>{if(object.isLight)lights++;if(object.isMesh){meshes++;assert.ok(object.isInstancedMesh);assert.equal(object.material.transparent,true);assert.equal(object.castShadow,false);}});
  assert.equal(lights,0);assert.equal(meshes,art.diagnostics.renderMeshes);assert.equal(JSON.stringify(source),original,'presentation never writes combat state');
  signatures.add([art.diagnostics.parts,new THREE.Box3().setFromObject(art.root).getSize(new THREE.Vector3()).toArray().map(n=>n.toFixed(2))].join(':'));art.dispose();
 }
 assert.equal(signatures.size,7);assert.equal(createGuardianMechanicArt('france'),null);assert.equal(createGuardianMechanicArt('unknown'),null);
});

test('Algerian caravan positions, radius and stable clasp follow the canonical snapshot only',()=>{
 const art=createGuardianMechanicArt('algerie'),presentation=guardianBossPresentation(encounter('algerie'));
 art.update(presentation);assert.equal(art.root.userData.state.stable,presentation.link.stable);
 presentation.link.points.forEach((point,i)=>assert.deepEqual(node(art,'Charge du voyageur '+(i+1)).position.toArray(),[point.x-100,0,point.z-200]));
 assert.equal(node(art,'Périmètre du lien').scale.x,presentation.radius);
 assert.equal(node(art,'Périmètre du lien').scale.y,1,'a larger link radius never lifts the inlay off the floor');
 const distended=structuredClone(presentation);distended.link.stable=false;art.update(distended);assert.equal(node(art,'Lien stable · fermoirs réunis').visible,false,'scenery does not infer or award a stable link');
 art.dispose();
});

test('heritage leaves and intensity graduations reflect exact accepted values without inventing a loss or threshold',()=>{
 const heritage=createGuardianMechanicArt('maroc'),heat=createGuardianMechanicArt('espagne');
 for(const value of [0,24,74,100]){
  const h=guardianBossPresentation(encounter('maroc',{guardianMeter:value})),s=guardianBossPresentation(encounter('espagne',{guardianMeter:value}));heritage.update(h);heat.update(s);
  assert.equal(heritage.root.userData.state.integrity,value);assert.equal(heat.root.userData.state.intensity,value);
  assert.equal(matching(heritage,/^feuillet protégé/).filter(n=>n.visible).length,Math.ceil(value/10));assert.equal(matching(heat,/^degré d’intensité/).filter(n=>n.visible).length,Math.ceil(value/10));
 }
 heritage.dispose();heat.dispose();
});

test('rebuilt shield blocks disappear only when the accepted shield falls, while courage uses the published advance',()=>{
 const defence=createGuardianMechanicArt('italie'),advance=createGuardianMechanicArt('tunisie');
 const initial=guardianBossPresentation(encounter('italie'));defence.update(initial);assert.ok(matching(defence,/^défense présente/).some(n=>n.visible));
 defence.update({...initial,shield:0});assert.ok(matching(defence,/^défense présente/).every(n=>!n.visible));assert.equal(defence.root.userData.state.shield,0);
 for(const [index,phase] of GUARDIAN_BOSS_PHASES.italie.entries()){defence.update({...initial,index:index+1,shield:phase.shield/2});assert.equal(defence.root.userData.state.capacity,phase.shield);assert.equal(defence.root.userData.state.assemblages,3,'half the canonical phase shield fills half the assemblies');}
 const phase3=guardianBossPresentation(encounter('tunisie',{enemy:20}));advance.update(phase3);assert.equal(advance.root.userData.state.advance,phase3.advance);assert.equal(Object.hasOwn(advance.root.userData.state,'safe'),false,'the art never creates a new safety window');
 defence.dispose();advance.dispose();
});

test('the incomplete signal preserves the reliable aim and Estonian copy frames use real decoy points',()=>{
 const compass=createGuardianMechanicArt('turquie'),mirrors=createGuardianMechanicArt('estonie'),signal=guardianBossPresentation(encounter('turquie',{guardianFlag:true})),copies=guardianBossPresentation(encounter('estonie'));
 compass.update(signal);assert.deepEqual(node(compass,'Compas sur le repère fiable').position.toArray(),[4,0,5]);assert.equal(node(compass,'Information partielle · trois signes').visible,true);
 compass.update({...signal,signal:{hidden:true,reliable:null}});assert.equal(node(compass,'Compas sur le repère fiable').visible,false);
 mirrors.update(copies);copies.decoys.forEach((point,i)=>assert.deepEqual(node(mirrors,'Cadre du leurre '+(i+1)).position.toArray(),[point.x-100,0,point.z-200]));
 const recovery=encounter('estonie');recovery.field.phase='recovery';mirrors.update(guardianBossPresentation(recovery));assert.ok(matching(mirrors,/^Cadre du leurre/).every(n=>!n.visible));
 compass.dispose();mirrors.dispose();
});

test('reduced motion is static between equal snapshots and the real effect retains existing decoy capsules',()=>{
 const art=createGuardianMechanicArt('maroc',{reducedMotion:true}),presentation=guardianBossPresentation(encounter('maroc'));art.update(presentation);const first=instanceValues(art);art.update(structuredClone(presentation));assert.deepEqual(instanceValues(art),first);
 art.update(null);assert.equal(art.root.visible,false);art.dispose();
 const effect=createRealmEffects('estonie',{reducedMotion:true}),source=encounter('estonie');effect.tick(1,{encounter:source,player:source.field.p,focus:source.field.enemy,presentation:guardianBossPresentation(source)});
 const capsules=effect.root.children.filter(child=>child.geometry?.type==='CapsuleGeometry');assert.equal(capsules.filter(capsule=>capsule.visible).length,2);
 assert.ok(effect.root.children.some(child=>child.userData.mechanic==='estonie'));effect.dispose();effect.dispose();
});

test('all projected materials, geometries and instance buffers are released once',()=>{
 const art=createGuardianMechanicArt('maroc'),geometries=new Set(),materials=new Set(),meshes=[];art.root.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);materials.add(object.material);meshes.push(object);}});
 let geo=0,mat=0,buffers=0;for(const geometry of geometries)geometry.addEventListener('dispose',()=>geo++);for(const material of materials)material.addEventListener('dispose',()=>mat++);for(const mesh of meshes)mesh.addEventListener('dispose',()=>buffers++);
 const parent=new THREE.Group();parent.add(art.root);art.dispose();art.dispose();art.update(guardianBossPresentation(encounter('maroc')));
 assert.equal(geo,geometries.size);assert.equal(mat,materials.size);assert.equal(buffers,meshes.length);assert.equal(art.root.parent,null);assert.equal(art.root.children.length,0);
});
