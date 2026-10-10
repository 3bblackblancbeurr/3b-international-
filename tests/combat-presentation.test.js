import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createCombatTelegraph} from '../src/world/combat-telegraph.js';
import {combatCue,createCombatEffects} from '../src/world/combat-effects.js';
import {attackContains,startField,stepField} from '../src/world/field-combat.js';
import {guardianCombatAnimation,guardianWeaponAnimations} from '../src/world/guardian-animation.js';
import {GUARDIAN_IDENTITIES} from '../src/world/guardian-identity.js';
import {fitGuardianWeapons} from '../src/world/guardian-weapons.js';
import {weaponAnimations} from '../src/world/weapon-animation.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

const hero={x:0,y:0,z:6},enemy={x:0,y:0,z:0};
const battle=()=>({region:'france',turn:0,enemy:180,enemyMax:180,hp:100,maxHP:100,focus:3,stats:{attack:15,affinity:2,speed:1},intent:'frappe',field:startField(hero,enemy)});
const move=(p,d,s)=>({x:p.x+d.x*s,z:p.z+d.z*s});

test('danger boundaries use the locked aim and actual field shape, on the rendered terrain',()=>{
 const e=battle();Object.assign(e.field,{phase:'windup',windup:1000,aim:{x:6,z:0}});
 const view=createCombatTelegraph({heightAt:(x,z)=>x*.2+z*.1});
 try{
  view.update(e,0,{x:30,y:0,z:30},enemy);view.root.updateMatrixWorld(true);
  const boundary=view.root.getObjectByName('Strike danger edge'),vertices=boundary.geometry.attributes.position;
  // Centre of the rendered forward edge remains inside the server's cone.
  const local=new T.Vector3().fromBufferAttribute(vertices,Math.floor(vertices.count/4)),world=boundary.localToWorld(local);
  assert.ok(attackContains(e.field,e.intent,{x:world.x*.999,z:world.z*.999}));
  assert.equal(attackContains(e.field,e.intent,{x:-7,z:0}),false,'reverse side is outside the painted cone');
  assert.equal(view.root.position.y,.12);
  e.intent='rituel';view.update(e,0,{x:30,y:0,z:30},enemy);
  assert.equal(view.root.position.x,6);assert.equal(view.root.position.z,0);assert.ok(Math.abs(view.root.position.y-1.32)<1e-10);
  assert.equal(view.root.getObjectByName('Area danger fill').visible,true);
  assert.equal(attackContains(e.field,e.intent,{x:11.7,z:0}),true);assert.equal(attackContains(e.field,e.intent,{x:11.9,z:0}),false);
 }finally{view.dispose();}
});

test('windup gauge only advances with accepted combat, survives extensions and resets between assaults',()=>{
 const e=battle();Object.assign(e.field,{phase:'windup',windup:1000});
 for(const reducedMotion of [false,true]){
  const view=createCombatTelegraph({reducedMotion});
  try{
   view.update(e,0,hero,enemy);const geometries=view.root.children.map(x=>x.geometry),count=view.root.children.length;
   assert.equal(view.state.progress,0);
   view.update(e,100,hero,enemy);assert.equal(view.state.progress,0,'elapsed rendering cannot fabricate readiness');
   e.field.windup=500;view.update(e,101,hero,enemy);assert.equal(view.state.progress,.5);assert.equal(view.root.getObjectByName('Accepted windup gauge').geometry.drawRange.count,144);
   e.field.windup=850;view.update(e,102,hero,enemy);assert.ok(view.state.progress<.5,'accepted extension postpones readiness');
   e.field.phase='recovery';view.update(e,103,hero,enemy);assert.equal(view.root.visible,false);
   Object.assign(e.field,{phase:'windup',windup:1000});view.update(e,104,hero,enemy);assert.equal(view.state.progress,0);
   e.boss=true;e.region='turquie';e.guardianFlag=true;e.field.windup=300;view.update(e,105,hero,enemy);
   assert.equal(view.root.getObjectByName('Accepted windup gauge').visible,false,'incomplete signal retains only its canonical ground shape');
   assert.equal(view.root.getObjectByName('Strike danger edge').visible,true);
   assert.equal(view.root.children.length,count);assert.deepEqual(view.root.children.map(x=>x.geometry),geometries);
  }finally{view.dispose();delete e.boss;delete e.guardianFlag;e.region='france';e.field.windup=1000;}
 }
});

test('accepted guard impacts receive contact sparks; a missed strike never displays a damage impact',()=>{
 const e=battle();Object.assign(e.field,{phase:'windup',windup:0,guard:500,recover:0});
 const guarded=stepField(e,{x:0,z:0},move),cue=combatCue(e,guarded,'enemy');
 assert.ok(cue.blocked);assert.ok(cue.defended);assert.ok(cue.incoming>0);
 const fx=createCombatEffects({reducedMotion:true});
 try{
  fx.start(cue,0);fx.update(.45,new T.Vector3(0,0,6),new T.Vector3());
  assert.equal(fx.root.getObjectByName('Accepted guard contact').visible,true);
  assert.equal(fx.root.getObjectByName('Accepted outgoing impact').visible,false);
  const far=battle();far.field.p={x:0,z:40};const missed=stepField(far,{x:0,z:0,kind:'strike'},move),missCue=combatCue(far,missed,'strike');
  assert.equal(missCue.outgoing,0);fx.start(missCue,1);fx.update(1.4,new T.Vector3(0,0,40),new T.Vector3());
  assert.equal(fx.root.getObjectByName('Accepted outgoing impact').visible,false);
  assert.equal(fx.root.getObjectByName('Accepted incoming impact').visible,false);
  assert.equal(fx.root.getObjectByName('Accepted guard contact').visible,false);
 }finally{fx.dispose();}
});

test('eight guardian gestures are distinct, keep real hand contact and hold preparation without root motion',async()=>{
 const signatures=new Set();
 for(const identity of Object.values(GUARDIAN_IDENTITIES)){
  const asset=await loadShippedCrowdFixture(identity.body*3+identity.style),model=clone(asset.scene),equipment=fitGuardianWeapons(model,identity),mixer=new T.AnimationMixer(model);
  const style=weaponAnimations(asset.animations.find(c=>c.name==='Idle'),['dagues','baltiques','tolede','kilij'].includes(identity.weapon)?'scissors':'paris');
  try{
   const clips=guardianWeaponAnimations(model,identity,equipment,style),prepared=clips.find(c=>c.name==='GuardianAnticipation');
   assert.ok(clips.some(c=>c.name==='GuardianPower'));assert.ok(clips.some(c=>c.name==='GuardianRecover'));
   assert.ok(prepared.tracks.every(track=>! /^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(track.name)));
   const signature=prepared.tracks.find(t=>t.name==='spine_02.quaternion').values;signatures.add(Array.from(signature).map(x=>x.toFixed(4)).join(','));
   const action=mixer.clipAction(prepared).play();mixer.setTime(.4);const pose=model.getObjectByName('hand_r').quaternion.clone();mixer.setTime(.8);
   assert.ok(pose.normalize().angleTo(model.getObjectByName('hand_r').quaternion.clone().normalize())<1e-6,'preparation holds instead of attacking on its own');
   for(const root of equipment.mounts)assert.equal(root.parent,model.getObjectByName('hand_'+root.userData.guardianWeapon.side));
   action.stop();
  }finally{mixer.stopAllAction();mixer.uncacheRoot(model);equipment.dispose();}
 }
 assert.equal(signatures.size,8,'all eight torso/shoulder signatures are different');
 assert.equal(guardianCombatAnimation('percée'),'GuardianAttack3');assert.equal(guardianCombatAnimation('double'),'GuardianAttack2');assert.equal(guardianCombatAnimation('rituel'),'GuardianPower');
});
