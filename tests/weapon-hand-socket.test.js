import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {fitWeapon} from '../src/world/weapon-model.js';
import {WEAPONS} from '../src/world/arsenal.js';
import {weaponAnimations} from '../src/world/weapon-animation.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

function anatomy(model){
 const hand=model.getObjectByName('hand_r');
 const inHand=name=>hand.worldToLocal(model.getObjectByName(name).getWorldPosition(new T.Vector3()));
 const middle=inHand('middle_01_r'),fingers=middle.clone().normalize(),across=inHand('index_01_r').sub(inHand('pinky_01_r'));
 across.addScaledVector(fingers,-across.dot(fingers)).normalize();
 return {hand,middle,fingers,across,dorsal:new T.Vector3().crossVectors(fingers,across).normalize()};
}

function assertContact(model,weapon,label){
 model.updateWorldMatrix(true,true);
 const {hand,middle,fingers,across,dorsal}=anatomy(model),root=weapon.object;
 const contact=hand.worldToLocal(root.localToWorld(new T.Vector3(...root.userData.weaponGrip)));
 const direction=new T.Vector3(0,1,0).applyQuaternion(root.quaternion);
 assert.equal(root.parent,hand,label+' remains a child of the animated hand');
 if(root.userData.weaponMount==='wrist'){
  assert.ok(contact.length()<1e-5,label+' cuff encircles the wrist joint');
  assert.ok(direction.dot(fingers)>.999,label+' blade extends beyond the fingers, away from the forearm');
 }else{
  const depth=contact.dot(fingers)/middle.length();
  assert.ok(depth>.65&&depth<.75,label+' handle is within the palm, beyond the wrist');
  assert.ok(contact.dot(dorsal)<-.014&&contact.dot(dorsal)>-.04,label+' handle sits inside the curled fingers');
  assert.ok(direction.dot(across)>.999,label+' blade exits the thumb side of the grip');
 }
 assert.ok(root.scale.distanceTo(new T.Vector3(1,1,1))<1e-7,label+' inherits the hand scale without attach compensation');
}

test('equipping the real skeleton at bind time or mid-attack produces the same local socket',async()=>{
 const asset=await loadShippedCrowdFixture();
 for(const item of WEAPONS){
  const bind=clone(asset.scene),animated=clone(asset.scene);
  animated.position.set(12,3,-7);animated.rotation.y=1.7;animated.scale.set(1.12,1.04,.94);
  const mixer=new T.AnimationMixer(animated);mixer.clipAction(asset.animations.find(c=>c.name==='Attack')).play();mixer.update(.35);
  const first=fitWeapon(bind,{weapon:item.id,weaponForm:2}),second=fitWeapon(animated,{weapon:item.id,weaponForm:2});
  try{
   assert.ok(first.object.position.distanceTo(second.object.position)<1e-5,item.id+' does not inherit the equip frame');
   assert.ok(first.object.quaternion.angleTo(second.object.quaternion)<1e-5,item.id+' ignores global heading and the current wrist rotation');
   assertContact(animated,second,item.id);
  }finally{first.dispose();second.dispose();mixer.stopAllAction();mixer.uncacheRoot(animated);}
 }
});

test('all 64 weapon forms use their physical handle or wrist mount on the shipped hand',async()=>{
 const asset=await loadShippedCrowdFixture(),model=asset.scene,mixer=new T.AnimationMixer(model);
 mixer.clipAction(asset.animations.find(c=>c.name==='Idle')).play();mixer.update(.4);
 for(const item of WEAPONS)for(let tier=0;tier<4;tier++){
  const weapon=fitWeapon(model,{weapon:item.id,weaponForm:tier});
  try{
   assertContact(model,weapon,item.id+' form '+tier);
   if(weapon.object.userData.weaponMount==='palm'){
    const hand=model.getObjectByName('hand_r'),elbow=model.getObjectByName('lowerarm_r');
    const forearm=new T.Line3(elbow.getWorldPosition(new T.Vector3()),hand.getWorldPosition(new T.Vector3()));
    const blade=weapon.object.localToWorld(new T.Vector3(0,weapon.object.userData.weaponGrip[1]+.4,0));
    assert.ok(blade.distanceTo(forearm.closestPointToPoint(blade,true,new T.Vector3()))>.28,item.id+' blade clears the arm in the actual idle animation');
   }
  }finally{weapon.dispose();}
 }
 mixer.stopAllAction();mixer.uncacheRoot(model);
});

test('palm and cuff contact stays attached through locomotion and combat on all six avatar rigs',async()=>{
 for(let index=0;index<6;index++){
  const asset=await loadShippedCrowdFixture(index),model=asset.scene,mixer=new T.AnimationMixer(model);
  const guard=weaponAnimations(asset.animations.find(c=>c.name==='Idle')).find(c=>c.name==='Guard');
  model.scale.set(1.13,.95,1.07);model.rotation.y=.8;
  for(const id of ['heritage','bow','zellige','claws']){
   const weapon=fitWeapon(model,{weapon:id});
   try{
    for(const clip of [...asset.animations.filter(c=>['Idle','Walk','Run','Attack'].includes(c.name)),guard]){
     mixer.stopAllAction();mixer.clipAction(clip).reset().play();
     for(const time of [0,.18,.4,.7]){mixer.setTime(time);weapon.update(time,{}, {reducedMotion:true});assertContact(model,weapon,`rig ${index} ${id} ${clip.name} ${time}`);}
    }
   }finally{weapon.dispose();}
  }
  mixer.stopAllAction();mixer.uncacheRoot(model);
 }
});

test('wrist-mounted cuff has its open cylinder along the claw direction',()=>{
 const model=new T.Group(),hand=new T.Bone();hand.name='hand_r';model.add(hand);
 const weapon=fitWeapon(model,{weapon:'claws'});
 try{
  const cuff=weapon.object.children.find(o=>o.name==='weapon-assembly-dark');cuff.geometry.computeBoundingBox();
  const size=cuff.geometry.boundingBox.getSize(new T.Vector3()),centre=cuff.geometry.boundingBox.getCenter(new T.Vector3());
  assert.ok(Math.abs(centre.y-.07)<1e-6,'cuff centre matches its wrist socket');
  assert.ok(Math.abs(size.y-.16)<1e-6,'open sleeve runs along the blades');
  assert.ok(size.z<.13&&size.x<.13,'cuff clears the forearm without a perpendicular barrel');
 }finally{weapon.dispose();}
});
