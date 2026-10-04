import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {locomotionBlend,createLocomotionMixer,smoothActorHeading} from '../src/world/actor-locomotion.js';
import {createLivingActor} from '../src/world/living.js';

// Keep the shipped mesh, rig and compressed animation buffers. Texture decoding
// is irrelevant to anatomy and requires a DOM, so omit material/image references.
async function travellerRig(){
 const bytes=fs.readFileSync(new URL('../public/world/living/traveller-0.glb',import.meta.url)),length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
 delete gltf.images;delete gltf.textures;delete gltf.materials;for(const mesh of gltf.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const json=JSON.stringify(gltf),chunk=Buffer.from(json+' '.repeat((4-Buffer.byteLength(json)%4)%4)),head=Buffer.alloc(20),tail=Buffer.alloc(8);
 head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+chunk.length+bin.length,8);head.writeUInt32LE(chunk.length,12);head.writeUInt32LE(0x4e4f534a,16);tail.writeUInt32LE(bin.length);tail.writeUInt32LE(0x004e4942,4);
 const result=Buffer.concat([head,chunk,tail,bin]);return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength),'');
}

test('analogue speeds blend complete gaits continuously and retain the available fallback',()=>{
 for(let speed=0;speed<8;speed+=.007){
  const {weights}=locomotionBlend(speed),next=locomotionBlend(speed+.0001).weights;
  assert.ok(Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-1)<1e-10);
  assert.ok(Object.values(weights).every(v=>v>=0&&v<=1));
  assert.ok(Object.keys(weights).every(name=>Math.abs(weights[name]-next[name])<.001));
 }
 assert.equal(locomotionBlend(0).weights.Idle,1);assert.equal(locomotionBlend(3.2).weights.Jog,1);
 const fallback=locomotionBlend(3.2,['Idle','Walk','Run']).weights;assert.ok(fallback.Walk>0&&fallback.Run>0);assert.equal(fallback.Jog,0);
});

test('turns choose the short angle across north and never snap around on a reverse input',()=>{
 const from=Math.PI-.01,next=smoothActorHeading(from,-.01,-1,1/60);
 assert.ok(Math.abs(next-from)<.025);
 let heading=0;for(let i=0;i<40;i++){const turned=smoothActorHeading(heading,0,-1,1/60);assert.ok(Math.abs(turned-heading)<=9/60+1e-10);heading=turned;}
 assert.ok(Math.abs(Math.atan2(Math.sin(Math.PI-heading),Math.cos(Math.PI-heading)))<.01);
 assert.equal(smoothActorHeading(.5,0,0,.25),.5);assert.equal(smoothActorHeading(.5,1,0,-1),.5);
});

test('shipped Walk, Jog and Run retain the same stride phase through acceleration and braking',async()=>{
 const asset=await travellerRig(),mixer=new T.AnimationMixer(asset.scene),actions=Object.fromEntries(['Idle','Walk','Jog','Run'].map(name=>[name,mixer.clipAction(asset.animations.find(clip=>clip.name===name))])),gait=createLocomotionMixer(actions);
 for(let i=0;i<180;i++){
  const speed=i<90?i/90*5.2:(180-i)/90*5.2;gait.update(speed,1/60);mixer.update(1/60);
  const phases=['Walk','Jog','Run'].map(name=>actions[name].time/actions[name].getClip().duration);
  assert.ok(Math.max(...phases)-Math.min(...phases)<1e-5,'stride phase remains synchronized');
 }
 mixer.stopAllAction();mixer.uncacheRoot(asset.scene);
});

test('seated avatars meet the cushion and keep their actual shoe soles above elevated floors',async()=>{
 const asset=await travellerRig();
 for(const height of [.9,1,1.1]){
  let actor;await new Promise(resolve=>{actor=createLivingActor({load:()=>Promise.resolve(asset)},{avatar:{height,boots:0,weapon:'paris'},scale:2.2,onLoad:resolve});});
  const floor=4.8;actor.object.position.set(12,floor,-7);actor.face(1,0,.25);
  for(const cushion of [.45,.9,1.15]){
   actor.object.position.y=floor;actor.setPose('Sit',{seatHeight:cushion});actor.update(.25);
   assert.equal(actor.object.getObjectByName('3B-equipped-paris').visible,false);
   actor.object.position.y=floor+actor.poseRootOffset();actor.object.updateMatrixWorld(true);
   const pelvis=actor.object.getObjectByName('pelvis').getWorldPosition(new T.Vector3()),boot=actor.object.getObjectByName('Boots_0'),soles=new T.Box3().setFromObject(boot,true);
   assert.ok(Math.abs(pelvis.y-floor-cushion)<1e-5,`cushion contact for height ${height}`);
   assert.ok(soles.min.y>=floor-.035,`shoe penetrates floor at height ${height}: ${soles.min.y-floor}`);
   assert.ok(soles.min.y<=floor+.16,`shoe floats above floor at height ${height}: ${soles.min.y-floor}`);
   for(const side of ['l','r']){
    const hip=actor.object.getObjectByName('thigh_'+side).getWorldPosition(new T.Vector3()),knee=actor.object.getObjectByName('calf_'+side).getWorldPosition(new T.Vector3()),hand=actor.object.getObjectByName('hand_'+side).getWorldPosition(new T.Vector3()),elbow=actor.object.getObjectByName('lowerarm_'+side).getWorldPosition(new T.Vector3());
    const thighContact=hip.clone().lerp(knee,.52).add(new T.Vector3(0,.12*2.2,0));
    assert.ok(hand.distanceTo(thighContact)<.12,'the wrist rests over its own thigh');
    const localPelvis=actor.object.worldToLocal(pelvis.clone()),localHand=actor.object.worldToLocal(hand),localElbow=actor.object.worldToLocal(elbow);
    assert.ok(localHand.z>localPelvis.z+.12,'the hand remains in front of the torso and backrest');
    assert.ok(localElbow.z>localPelvis.z+.06,'the elbow bends towards the knees');
    assert.ok(Math.abs(localElbow.x)<.45,'the elbow stays inside the chair armrest width');
   }
  }
  actor.setPose('Read');actor.object.position.y=floor;actor.update(.25);assert.equal(actor.poseRootOffset(),0);
  actor.setPose(null);actor.update(.25,1,0,1);const foot=actor.object.getObjectByName('foot_l'),before=foot.quaternion.clone();actor.update(.1,.5,0,.5);
  assert.equal(actor.object.getObjectByName('3B-equipped-paris').visible,true);
  assert.ok(before.angleTo(foot.quaternion)>.005,'leaving the chair restores moving legs');
  actor.object.traverse(o=>assert.ok(o.quaternion.toArray().every(Number.isFinite)));actor.dispose();
 }
});
