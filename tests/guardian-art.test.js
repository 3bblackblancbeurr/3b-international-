import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GUARDIAN_IDENTITIES,guardianIdentity} from '../src/world/guardian-identity.js';
import {fitGuardianAppearance} from '../src/world/guardian-appearance.js';
import {fitGuardianWeapons} from '../src/world/guardian-weapons.js';
import {createLivingActor} from '../src/world/living.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

function gripContact(model,root,label){
 model.updateWorldMatrix(true,true);const side=root.userData.guardianWeapon.side,hand=model.getObjectByName('hand_'+side),inHand=name=>hand.worldToLocal(model.getObjectByName(name).getWorldPosition(new T.Vector3()));
 const contact=hand.worldToLocal(root.localToWorld(new T.Vector3(...root.userData.weaponGrip))),middle=inHand('middle_01_'+side),fingers=middle.clone().normalize(),across=inHand('index_01_'+side).sub(inHand('pinky_01_'+side));across.addScaledVector(fingers,-across.dot(fingers)).normalize();
 assert.equal(root.parent,hand,label+' follows the animated hand');
 const direction=new T.Vector3(0,1,0).applyQuaternion(root.quaternion);
 if(root.userData.weaponMount==='wrist'){assert.ok(contact.length()<1e-5,label+' cuff touches wrist');assert.ok(direction.dot(fingers)>.999,label+' cuff follows fingers');}
 else{assert.ok(Math.abs(contact.dot(fingers)/middle.length()-.7)<1e-4,label+' grip centred in palm');assert.ok(direction.dot(across)>.999,label+' blade clears thumb');}
}

test('poster identities resolve to eight humans, correct silhouettes and emblem-only totems',()=>{
 assert.equal(Object.keys(GUARDIAN_IDENTITIES).length,8);
 for(const identity of Object.values(GUARDIAN_IDENTITIES)){assert.equal(guardianIdentity(identity.region),identity);assert.match(identity.asset,/traveller-[0-5]\.glb$/);}
 assert.equal(guardianIdentity('france').weapon,'rapiere');assert.equal(guardianIdentity('algerie').weapon,'flyssa');assert.equal(guardianIdentity('maroc').weapon,'dagues');assert.equal(guardianIdentity('tunisie').shield,true);assert.equal(guardianIdentity('estonie').weapon,'baltiques');assert.equal(guardianIdentity('turquie').weapon,'kilij');
 assert.equal(guardianIdentity('C164'),null,'the Oubli never becomes a ninth guardian');
});

test('all eight load humanoid assets in the real actor path, with armour and canonical equipment',async()=>{
 for(const identity of Object.values(GUARDIAN_IDENTITIES)){
  const asset=await loadShippedCrowdFixture(identity.body*3+identity.style);let actor,url;
  await new Promise((resolve,reject)=>{actor=createLivingActor({load:async value=>{url=value;return asset;}},{card:identity.card,onLoad:resolve,onError:reject});});
  try{
   assert.equal(url,identity.asset);assert.equal(actor.object.userData.guardianIdentity.name,identity.name);const view=actor.snapshotGuardian();assert.equal(view.ready,true);assert.equal(view.totemRole,'emblem');assert.equal(view.rigBones,65);assert.ok(view.armourDraws<=4);assert.ok(view.armourVertices<20000);
   const dual=['dagues','baltiques'].includes(identity.weapon)||identity.shield||identity.gauntlet;assert.equal(view.weapons.length,dual?2:1);
   assert.equal(view.weapons[0].kind,identity.weapon);assert.equal(view.weapons[0].hand,'hand_r');if(dual)assert.equal(view.weapons[1].hand,'hand_l');
   actor.object.traverse(o=>{if(o.isMesh&&o.morphTargetInfluences)assert.ok(o.morphTargetInfluences.every(Number.isFinite),'all body morphs remain finite and renderable');});
   actor.action('Guard',.9);actor.update(.25);assert.equal(actor.snapshotGuardian().animation,'Guard','human guard exists for every guardian');
   actor.setGuardianState({liberated:true,phase:3});actor.update(.2);assert.equal(actor.snapshotGuardian().state.liberated,true);
   actor.action('Attack2',.8);actor.update(.2);assert.equal(actor.snapshotGuardian().animation,'Attack2');
  }finally{actor.dispose();}
 }
});

test('all canonical right and left equipment stays in anatomical contact on six real rigs through attacks',async()=>{
 for(let index=0;index<6;index++){
  const asset=await loadShippedCrowdFixture(index),model=clone(asset.scene),mixer=new T.AnimationMixer(model);model.rotation.y=1.4;model.scale.set(1.1,.97,1.05);
  for(const identity of Object.values(GUARDIAN_IDENTITIES)){
   const weapons=fitGuardianWeapons(model,identity);
   try{for(const clip of asset.animations.filter(c=>['Idle','Walk','Run','Attack','Cast'].includes(c.name))){mixer.stopAllAction();mixer.clipAction(clip).reset().play();for(const time of [.01,.2,.45,.7]){mixer.setTime(time);for(const root of weapons.mounts)gripContact(model,root,`rig ${index} ${identity.name} ${clip.name} ${root.userData.guardianWeapon.side}`);}}}
   finally{weapons.dispose();}
  }
  mixer.stopAllAction();mixer.uncacheRoot(model);
 }
});

test('armour shares the imported skeleton, preserves cached materials and changes visibly after liberation',async()=>{
 const asset=await loadShippedCrowdFixture(4),model=clone(asset.scene),sourceMaterials=[];asset.scene.traverse(o=>{if(o.isMesh)sourceMaterials.push([o.material,o.material.color.clone()]);});
 const appearance=fitGuardianAppearance(model,guardianIdentity('france'));const pieces=[];appearance.object.traverse(o=>{if(o.isSkinnedMesh)pieces.push(o);});
 try{
  assert.ok(pieces.length>0);const source=model.getObjectByName('B3Surface004');for(const piece of pieces)assert.equal(piece.skeleton,source.skeleton,'no extra skeleton allocation');
  appearance.setState({liberated:false,phase:3});const influenced=appearance.materials[0].color.clone();appearance.setState({liberated:true,phase:1});assert.ok(Math.hypot(...appearance.materials[0].color.toArray().map((v,i)=>v-influenced.toArray()[i]))>.05,'owned plate colour visibly recovers');
  for(const [m,color] of sourceMaterials)assert.ok(m.color.equals(color),'cached assets remain untouched');
 }finally{appearance.dispose();}assert.equal(pieces[0].parent?.parent,null,'owned armour removed on dispose');
});

test('armour uses the current imported anatomy instead of applying its bind translation twice',async()=>{
 for(let index=0;index<6;index++){
  const asset=await loadShippedCrowdFixture(index),model=clone(asset.scene);model.position.set(15,3,-8);model.scale.set(1.1,1.03,.97);model.updateWorldMatrix(true,true);
  const appearance=fitGuardianAppearance(model,guardianIdentity('france')),bounds=new T.Box3();model.updateMatrixWorld(true);
  try{
   appearance.object.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i+=3)bounds.expandByPoint(model.worldToLocal(o.localToWorld(o.getVertexPosition(i,new T.Vector3()))));});
   assert.ok(bounds.min.y>-.1&&bounds.max.y<2.05,`rig ${index} armour follows human height (${bounds.min.y}–${bounds.max.y})`);
   assert.ok(bounds.min.x>-.7&&bounds.max.x<.7,`rig ${index} armour follows shoulder width`);
  }finally{appearance.dispose();}
 }
});

test('distant guardians use a four-draw humanoid LOD with hysteresis and recover the selected hair/equipment',async()=>{
 const identity=guardianIdentity('france'),asset=await loadShippedCrowdFixture(4);let actor;
 await new Promise((ok,fail)=>{actor=createLivingActor({load:async()=>asset},{card:identity.card,onLoad:ok,onError:fail});});
 try{
  const hair=actor.object.getObjectByName('Hair_4'),otherHair=actor.object.getObjectByName('Hair_2'),blade=actor.object.getObjectByName('Céliane · rapiere r');assert.equal(hair.visible,true);assert.equal(otherHair.visible,false);
  actor.setLod(50);actor.update(.02);let view=actor.snapshotGuardian();assert.equal(view.lod,'far');assert.ok(view.farDraws<=4);assert.ok(view.farVertices<2000);assert.equal(hair.visible,false);assert.equal(blade.visible,false);
  actor.setLod(40);assert.equal(actor.snapshotGuardian().lod,'far','no flicker around the outer threshold');actor.setLod(30);actor.update(.02);assert.equal(actor.snapshotGuardian().lod,'full');assert.equal(hair.visible,true);assert.equal(otherHair.visible,false,'hidden hairstyle does not reappear');assert.equal(blade.visible,true);
 }finally{actor.dispose();}
});

test('guardian attack wrists send blades in front of the torso and raise a real guard instead of crossing the body',async()=>{
 for(const identity of Object.values(GUARDIAN_IDENTITIES)){
  const asset=await loadShippedCrowdFixture(identity.body*3+identity.style);let actor;
  await new Promise((ok,fail)=>{actor=createLivingActor({load:async()=>asset},{card:identity.card,onLoad:ok,onError:fail});});
  try{
   actor.object.rotation.y=.9;actor.object.position.set(16,4,-12);const weapon=actor.object.getObjectByName(identity.name+' · '+identity.weapon+' r');
   for(const name of ['Attack','Attack2','Attack3','Guard']){
    actor.action(name,1);for(let i=0;i<20;i++)actor.update(.02);actor.object.updateMatrixWorld(true);
    const direction=new T.Vector3(0,1,0).applyQuaternion(weapon.getWorldQuaternion(new T.Quaternion())).applyQuaternion(actor.object.getWorldQuaternion(new T.Quaternion()).invert());
    assert.ok(name==='Guard'?direction.y>.8:direction.z>.8,identity.name+' '+name+' directs the blade beyond the body');
    if(name==='Guard'&&identity.shield){const shield=actor.object.getObjectByName(identity.name+' · shield l');const normal=new T.Vector3(0,0,1).applyQuaternion(shield.getWorldQuaternion(new T.Quaternion())).applyQuaternion(actor.object.getWorldQuaternion(new T.Quaternion()).invert());assert.ok(normal.z>.95,'Soraya shield faces incoming danger');}
   }
  }finally{actor.dispose();}
 }
});
