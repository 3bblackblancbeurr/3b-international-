import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WEAPONS} from '../src/world/arsenal.js';
import {getWeaponHandling,weaponHandlingIds} from '../src/world/weapon-handling.js';
import {resolveWeaponHandling} from '../src/world/avatar-compatibility.js';
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


test('left-handed configuration mirrors primary and secondary weapon hands',()=>{
 const right=resolveWeaponHandling('axe',{weapon:'axe',handedness:'right'});
 const left=resolveWeaponHandling('axe',{weapon:'axe',handedness:'left'});
 assert.equal(right.grip.bone,'hand_r');assert.equal(left.grip.bone,'hand_l');
 assert.equal(right.secondary.hand,'hand_l');assert.equal(left.secondary.hand,'hand_r');
 assert.equal(left.grip.position[0],-right.grip.position[0]);
 assert.equal(left.holster.position[0],-right.holster.position[0]);
});

test('left-handed ready and strike clips mirror the active arm',()=>{
 const bones=['spine_02','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l'];
 const idle=new THREE.AnimationClip('Idle',1,bones.map(n=>new THREE.QuaternionKeyframeTrack(n+'.quaternion',[0,1],[0,0,0,1,0,0,0,1])));
 const right=weaponAnimations(idle,'saber','right'),left=weaponAnimations(idle,'saber','left');
 for(const name of ['Ready','EquipDraw','EquipSheathe','WeaponStrike']){assert.ok(right.some(c=>c.name===name));assert.ok(left.some(c=>c.name===name));}
 const values=(clips,name,bone)=>Array.from(clips.find(c=>c.name===name).tracks.find(t=>t.name===bone+'.quaternion').values);
 assert.notDeepEqual(values(right,'Ready','upperarm_r'),values(left,'Ready','upperarm_r'));
 assert.notDeepEqual(values(right,'WeaponStrike','upperarm_r'),values(left,'WeaponStrike','upperarm_r'));
});


test('all 16 weapons stay finite for both handedness and holster states',()=>{
 for(const handedness of ['right','left'])for(const weaponDef of WEAPONS){
  const model=new THREE.Group();
  const bones={
   pelvis:[0,.85,0],spine_02:[0,1.25,-.12],spine_03:[0,1.45,0],
   upperarm_r:[.22,1.42,0],lowerarm_r:[.24,-.25,0],hand_r:[0,-.25,0],
   upperarm_l:[-.22,1.42,0],lowerarm_l:[-.24,-.25,0],hand_l:[0,-.25,0]
  };
  const objects={};
  for(const [name,pos] of Object.entries(bones)){const bone=new THREE.Group();bone.name=name;bone.position.set(...pos);objects[name]=bone;}
  model.add(objects.pelvis,objects.spine_02,objects.spine_03,objects.upperarm_r,objects.upperarm_l);
  objects.upperarm_r.add(objects.lowerarm_r);objects.lowerarm_r.add(objects.hand_r);objects.upperarm_l.add(objects.lowerarm_l);objects.lowerarm_l.add(objects.hand_l);
  model.updateMatrixWorld(true);
  const weapon=fitWeapon(model,{weapon:weaponDef.id,weaponForm:0,handedness},{drawn:false});
  for(const drawn of [false,true]){weapon.setDrawn(drawn);for(let i=1;i<=12;i++)weapon.update(i/30,{});const root=model.getObjectByName('3B-equipped-'+weaponDef.id);assert.ok(root,weaponDef.id+' missing root');for(const n of [...root.position,...root.quaternion,...root.scale])assert.ok(Number.isFinite(n),weaponDef.id+' '+handedness+' produced non-finite transform');}
  weapon.dispose();assert.equal(model.getObjectByName('3B-equipped-'+weaponDef.id),undefined);
 }
});
