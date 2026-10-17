import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOblivionActor} from '../src/world/oblivion-manifestation.js';
import {createFinaleEnvironment} from '../src/world/finale-environment.js';
const encounter=(phase=1,mastery=0)=>({final:true,enemyMax:360,enemy:360-(phase-1)*45,finalCircleMastery:mastery,field:{phase:'windup'}});
test('the final manifestation has its own bounded body and eight inherited fragments',()=>{
 const actor=createOblivionActor();assert.equal(actor.ready,true);assert.equal(actor.object.userData.guardianIdentity,undefined);
 const bounds=new THREE.Box3().setFromObject(actor.object),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.y>9&&size.y<13);assert.ok(size.x>7&&size.x<15);
 let vertices=0,meshes=0,skinned=0;actor.object.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;meshes++;if(o.isSkinnedMesh)skinned++;}});
 assert.equal(skinned,0);assert.ok(meshes<=24);assert.ok(vertices<15000);
 assert.equal(actor.object.children[0].children.filter(o=>o.name.startsWith('Mémoire ·')).length,8);
 actor.dispose();actor.dispose();assert.equal(actor.ready,false);assert.equal(actor.object.children.length,0);
});
test('all eight accepted final phases and mastery masks reach the actual body without mutation',()=>{
 const actor=createOblivionActor();
 for(let phase=1;phase<=8;phase++){
  const e=encounter(phase,(1<<(phase-1))-1),before=structuredClone(e);actor.setFinalState(e);actor.update(.1);
  assert.equal(actor.object.userData.oblivion.phase,phase);assert.equal(actor.object.userData.oblivion.mastery,before.finalCircleMastery);assert.deepEqual(e,before);
 }
 actor.setFinalState({...encounter(8,255),result:'victory'});assert.equal(actor.object.userData.oblivion.victory,true);actor.dispose();
});
test('accepted attack gestures move the final body, while reduced motion keeps it stable',()=>{
 for(const reducedMotion of [false,true]){
  const actor=createOblivionActor({reducedMotion}),arm=actor.object.getObjectByName('Aile brisée gauche');
  actor.update(0);const before=arm.quaternion.clone();actor.action('Attack',1);actor.update(.25);actor.update(.25);
  assert.equal(before.equals(arm.quaternion),reducedMotion);actor.dispose();
 }
});
test('final anchors reflect only final battle/mastery or accepted victory and preserve collision budgets',()=>{
 const scene=createFinaleEnvironment({reducedMotion:true});const save={adventure:{finished:false}};
 scene.tick(0,{save});assert.equal(scene.root.visible,false);
 for(let phase=1;phase<=8;phase++){
  const e=encounter(phase,(1<<(phase-1))-1),before=structuredClone(e);scene.tick(phase,{encounter:e,save,player:{x:0,z:8}});
  assert.equal(scene.root.userData.presentation.phase,phase);assert.equal(scene.root.userData.presentation.restored,false);assert.deepEqual(e,before);
 }
 scene.tick(9,{save:{adventure:{finished:true}},player:{x:0,z:8}});assert.equal(scene.root.userData.presentation.mastery,255);assert.equal(scene.root.userData.presentation.restored,true);
 scene.tick(10,{save:{adventure:{finished:true}},player:{x:300,z:8}});assert.equal(scene.root.visible,false);
 assert.deepEqual(scene.diagnostics,{anchors:8,meshes:4,lineSegments:8,collisions:0});scene.dispose();scene.dispose();assert.equal(scene.root.parent,null);
});
