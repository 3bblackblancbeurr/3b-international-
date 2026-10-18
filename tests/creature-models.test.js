import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CARDS} from '../src/world/catalog.js';
import {CARD_DESIGNS} from '../src/world/card-designs.js';
import {GUARDIAN_IDENTITIES} from '../src/world/guardian-identity.js';
import {createCreatureActor,creatureRecipe} from '../src/world/creature-models.js';

const samples={C025:'wolf',C050:'lynx',C065:'bear',C085:'fennec',C105:'eagle',C125:'lion',C145:'bull'};
const joint=(actor,name)=>actor.object.getObjectByName(name);
const matrices=actor=>{const values=[];actor.object.traverse(object=>{if(object.isInstancedMesh)values.push(...object.instanceMatrix.array);});return values;};
const bones=actor=>{const found=[];actor.object.traverse(object=>{if(object.isGroup&&object.name.startsWith('leg:'))found.push(object);});return found;};

test('only existing non-guardian spirit cards receive animal adaptations; named animal identities take precedence',()=>{
 const eligible=CARDS.filter(card=>CARD_DESIGNS[card.id].kind==='spirit');assert.ok(eligible.length>=30);
 for(const card of CARDS){assert.equal(!!creatureRecipe(card.id),eligible.includes(card),card.id);}
 for(const id of [...Object.keys(GUARDIAN_IDENTITIES),'C001','C005','C015','C161','C164','C165','C999'])assert.equal(createCreatureActor({card:id}),null,id);
 for(const [id,animal] of Object.entries({C025:'wolf',C045:'wolf',C054:'wolf',C038:'lion',C085:'fennec',C099:'fennec',C125:'lion',C138:'lion',C145:'bull',C158:'bull'}))assert.equal(creatureRecipe(id).animal,animal,id);
 assert.deepEqual(new Set(eligible.map(card=>creatureRecipe(card.id).region)),new Set(['italie','estonie','turquie','algerie','tunisie','maroc','espagne']));
});

test('seven real animal anatomies have distinct geometry, supported feet and bounded instanced bodies',()=>{
 const signatures=new Set();
 for(const [card,animal] of Object.entries(samples)){
  const actor=createCreatureActor({card}),state=actor.snapshotCreature(),meshes=[];actor.object.traverse(object=>{if(object.isMesh)meshes.push(object);});
  assert.equal(state.animal,animal);assert.equal(state.anatomy.legs,animal==='eagle'?2:4);assert.equal(bones(actor).length,state.anatomy.legs);
  assert.ok(meshes.every(mesh=>mesh.isInstancedMesh),'source joints never draw a hidden humanoid or second body');assert.ok(meshes.length<=8);assert.ok(state.parts>=35&&state.parts<=60);
  assert.ok(meshes.every(mesh=>mesh.geometry.attributes.position.count<150));
  const box=new THREE.Box3().setFromObject(actor.object),size=box.getSize(new THREE.Vector3());
  assert.ok(box.min.y>-.12,card+': resting feet stay on the floor');assert.ok(size.y>2&&size.y<5,card+': player-scale height');assert.ok([size.x,size.y,size.z].every(Number.isFinite));
  assert.equal(state.anatomy.wings,animal==='eagle'?2:0);assert.equal(state.anatomy.horns,animal==='bull'?2:0);
  signatures.add([size.x.toFixed(2),size.y.toFixed(2),size.z.toFixed(2),state.parts].join(':'));actor.dispose();
 }
 assert.equal(signatures.size,7,'the seven silhouettes are more than differently coloured copies');
});

test('leg gait advances from actual travelled distance and does not move the canonical actor root',()=>{
 for(const card of Object.keys(samples)){
  const actor=createCreatureActor({card});actor.object.position.set(14,0,-8);const original=actor.object.position.clone();
  actor.update(.2);assert.equal(actor.snapshotCreature().phase,0,'idle never walks in place');assert.ok(bones(actor).every(bone=>bone.rotation.x===0));
  actor.update(.1,.3,.1,.32);assert.ok(actor.snapshotCreature().phase>0);assert.ok(bones(actor).some(bone=>Math.abs(bone.rotation.x)>.01),card);
  assert.deepEqual(actor.object.position,original,'the combat/navigation engine retains root movement ownership');
  const phase=actor.snapshotCreature().phase;for(let i=0;i<16;i++)actor.update(.1);assert.equal(actor.snapshotCreature().phase,phase);assert.ok(bones(actor).every(bone=>Math.abs(bone.rotation.x)<.001),'feet settle after stopping');
  actor.dispose();
 }
});

test('accepted attacks, guards, impacts and collapse have distinct bounded poses and reset correctly',()=>{
 const actor=createCreatureActor({card:'C025'}),head=joint(actor,'head');
 actor.action('Attack',.6);actor.update(.2);assert.equal(actor.snapshotCreature().animation,'Attack');assert.ok(joint(actor,'jaw').rotation.x>.1);assert.ok(head.rotation.x<0);
 actor.action('Hit',.3);actor.update(.1);assert.ok(joint(actor,'torso').rotation.z>0);actor.update(.25);assert.equal(actor.snapshotCreature().animation,'Idle');
 actor.setCombat({guard:1});actor.update(.1);assert.ok(head.rotation.x>0);actor.setCombat({});
 actor.action('Death',1);for(let i=0;i<8;i++)actor.update(.25);assert.equal(actor.snapshotCreature().animation,'Death');assert.ok(actor.object.children[0].scale.y<.7);
 actor.reset();assert.equal(actor.snapshotCreature().animation,'Idle');assert.equal(actor.object.children[0].scale.y,1);assert.equal(actor.object.children[0].rotation.z,0);
 const eagle=createCreatureActor({card:'C105'}),wing=joint(eagle,'wing:1'),folded=Math.abs(wing.rotation.z);eagle.action('Cast',.6);eagle.update(.25);assert.ok(Math.abs(wing.rotation.z)<folded*.3,'the actual articulated wings spread for the accepted action');
 actor.dispose();eagle.dispose();
});

test('reduced motion keeps idle geometry fixed and still provides essential grounded movement and accepted poses',()=>{
 for(const card of Object.keys(samples)){
  const actor=createCreatureActor({card,reducedMotion:true}),before=matrices(actor);
  for(let i=0;i<12;i++)actor.update(.2);assert.deepEqual(matrices(actor),before,card+': no idle breathing, tail sway or feather loop');
  actor.update(.1,.2,0,.2);assert.ok(bones(actor).some(bone=>Math.abs(bone.rotation.x)>.01));
  actor.action('Attack',.5);actor.update(.1);assert.ok(joint(actor,'head').rotation.x<0);assert.equal(actor.object.children[0].position.y,0,'no motion bob');
  actor.dispose();
 }
});

test('attention, distant detail and invalid frame times preserve finite actor transforms',()=>{
 const actor=createCreatureActor({card:'C085'});actor.setAttention({x:5,y:3,z:2});actor.update(.2);assert.ok(joint(actor,'head').rotation.y>0);
 const total=()=>{let count=0;actor.object.traverse(object=>{if(object.isInstancedMesh)count+=object.count;});return count;},full=total();actor.setLod(120);actor.update(.1);assert.ok(total()<full);actor.setLod(0);actor.update(.1);assert.equal(total(),full);
 for(const dt of [NaN,Infinity,-1,100])actor.update(dt,0,0,NaN);
 assert.ok(matrices(actor).every(Number.isFinite));actor.dispose();
});

test('every owned geometry, material and instance releases once and disposal prevents later actions',()=>{
 const actor=createCreatureActor({card:'C125'}),geometries=new Set(),materials=new Set(),instances=[];
 actor.object.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);materials.add(object.material);instances.push(object);}});
 let geo=0,mat=0,instance=0;for(const geometry of geometries)geometry.addEventListener('dispose',()=>geo++);for(const material of materials)material.addEventListener('dispose',()=>mat++);for(const mesh of instances)mesh.addEventListener('dispose',()=>instance++);
 const parent=new THREE.Group();parent.add(actor.object);actor.dispose();actor.dispose();actor.update(.1);actor.reset();
 assert.equal(geo,geometries.size);assert.equal(mat,materials.size);assert.equal(instance,instances.length);assert.equal(actor.object.parent,null);assert.equal(actor.object.children.length,0);assert.equal(actor.ready,false);assert.equal(actor.action('Attack'),false);
});
