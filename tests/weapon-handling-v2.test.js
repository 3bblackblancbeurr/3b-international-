import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WEAPONS} from '../src/world/arsenal.js';
import {getWeaponHandling,weaponHandlingIds} from '../src/world/weapon-handling.js';
import {weaponAnimations} from '../src/world/weapon-animation.js';
import {fitWeapon} from '../src/world/weapon-model.js';

test('all 16 arsenal weapons have explicit handling profiles',()=>{
 const ids=WEAPONS.map(w=>w.id).sort();
 assert.deepEqual(weaponHandlingIds().sort(),ids);
 for(const weapon of WEAPONS){
  const p=getWeaponHandling(weapon.id);
  assert.ok(p.grip?.bone);
  assert.ok(['oneHand','twoHand','dual','offHand','bow','body'].includes(p.hold));
  assert.ok(['hip','back','hidden'].includes(p.stow));
  if(['twoHand','bow'].includes(p.hold))assert.ok(p.secondary?.hand,weapon.id+' missing secondary grip');
  assert.ok(p.grip.position.every(Number.isFinite));
  assert.ok(p.grip.rotation.every(Number.isFinite));
 }
});

test('Lumière d’Alger is handheld, never an arm mount',()=>{
 const p=getWeaponHandling('alger');
 assert.equal(p.hold,'oneHand');
 assert.equal(p.grip.bone,'hand_r');
 assert.equal(p.stow,'hip');
});

test('each weapon receives a stable Ready upper-body pose',()=>{
 const bones=['spine_02','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l'];
 const idle=new THREE.AnimationClip('Idle',1,bones.map(n=>new THREE.QuaternionKeyframeTrack(n+'.quaternion',[0,1],[0,0,0,1,0,0,0,1])));
 for(const weapon of WEAPONS){
  const clips=weaponAnimations(idle,weapon.id);
  const ready=clips.find(c=>c.name==='Ready');
  assert.ok(ready,weapon.id+' missing Ready pose');
  assert.ok(ready.tracks.every(t=>! /root|pelvis|thigh_|calf_|foot_|ball_/.test(t.name)));
  assert.ok(ready.tracks.every(t=>Array.from(t.values).every(Number.isFinite)));
 }
});

test('a physical weapon transitions from holster toward the grip hand',()=>{
 const model=new THREE.Group();
 const handR=new THREE.Group();handR.name='hand_r';handR.position.set(.65,1.15,0);
 const handL=new THREE.Group();handL.name='hand_l';handL.position.set(-.65,1.15,0);
 const spine=new THREE.Group();spine.name='spine_02';spine.position.set(0,1.25,-.12);
 const pelvis=new THREE.Group();pelvis.name='pelvis';pelvis.position.set(0,.85,0);
 model.add(handR,handL,spine,pelvis);model.updateMatrixWorld(true);
 const weapon=fitWeapon(model,{weapon:'saber',weaponForm:0},{drawn:false});
 const root=model.getObjectByName('3B-equipped-saber');
 const before=root.position.clone();
 assert.ok(before.distanceTo(pelvis.position)<before.distanceTo(handR.position));
 weapon.setDrawn(true);
 for(let i=1;i<=60;i++)weapon.update(i/60,{});
 assert.ok(root.position.distanceTo(handR.position)<root.position.distanceTo(pelvis.position));
 weapon.dispose();
});


test('L’Arco Romano renders as a bow from its base form',()=>{
 const model=new THREE.Group();
 for(const [name,x,y] of [['hand_r',.6,1.1],['hand_l',-.6,1.1],['spine_02',0,1.25],['pelvis',0,.85]]){const bone=new THREE.Group();bone.name=name;bone.position.set(x,y,0);model.add(bone);}
 model.updateMatrixWorld(true);
 const weapon=fitWeapon(model,{weapon:'romano',weaponForm:0},{drawn:true});
 const root=model.getObjectByName('3B-equipped-romano');let hasTorus=false;root.traverse(child=>{if(child.geometry?.type==='TorusGeometry')hasTorus=true;});assert.equal(hasTorus,true);
 weapon.dispose();
});


test('weapon animations include explicit draw and sheathe transitions',()=>{
 const bones=['spine_02','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l'];
 const idle=new THREE.AnimationClip('Idle',1,bones.map(n=>new THREE.QuaternionKeyframeTrack(n+'.quaternion',[0,1],[0,0,0,1,0,0,0,1])));
 for(const weapon of WEAPONS){
  const names=weaponAnimations(idle,weapon.id).map(c=>c.name);
  assert.ok(names.includes('EquipDraw'),weapon.id+' missing EquipDraw');
  assert.ok(names.includes('EquipSheathe'),weapon.id+' missing EquipSheathe');
 }
});

test('two-hand profiles expose a finite secondary target and IK pass',()=>{
 const model=new THREE.Group();
 const right=new THREE.Group();right.name='hand_r';right.position.set(.35,1.1,0);model.add(right);
 const upper=new THREE.Group();upper.name='upperarm_l';upper.position.set(-.2,1.35,0);model.add(upper);
 const lower=new THREE.Group();lower.name='lowerarm_l';lower.position.set(0,-.28,0);upper.add(lower);
 const hand=new THREE.Group();hand.name='hand_l';hand.position.set(0,-.28,0);lower.add(hand);
 const spine=new THREE.Group();spine.name='spine_02';spine.position.set(0,1.25,-.12);model.add(spine);
 const pelvis=new THREE.Group();pelvis.name='pelvis';pelvis.position.set(0,.85,0);model.add(pelvis);model.updateMatrixWorld(true);
 const weapon=fitWeapon(model,{weapon:'axe',weaponForm:0},{drawn:true});
 const target=weapon.getSecondaryTarget();
 assert.ok(target&&[target.x,target.y,target.z].every(Number.isFinite));
 assert.equal(weapon.applySecondaryIK(),true);
 assert.ok([upper.quaternion.x,upper.quaternion.y,upper.quaternion.z,upper.quaternion.w,lower.quaternion.x,lower.quaternion.y,lower.quaternion.z,lower.quaternion.w].every(Number.isFinite));
 weapon.dispose();
});

test('holstered blades keep a visible support or scabbard on the body',()=>{
 const model=new THREE.Group();
 for(const [name,x,y] of [['hand_r',.5,1.1],['hand_l',-.5,1.1],['spine_02',0,1.25],['pelvis',0,.85]]){const bone=new THREE.Group();bone.name=name;bone.position.set(x,y,0);model.add(bone);}
 model.updateMatrixWorld(true);
 const weapon=fitWeapon(model,{weapon:'saber',weaponForm:0},{drawn:false});
 const support=model.getObjectByName('3B-support-saber');
 assert.ok(support);assert.ok(support.children.length>=2);
 weapon.dispose();assert.equal(model.getObjectByName('3B-support-saber'),undefined);
});
