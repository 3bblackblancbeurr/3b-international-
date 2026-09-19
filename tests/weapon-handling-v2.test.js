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
