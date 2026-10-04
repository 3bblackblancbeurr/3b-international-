import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import plan from '../src/world/hub/data/hub-master-plan-v2.json' with {type:'json'};
import {platformBuilding,HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {roomFurniturePlan,ROOM_PROGRAMS} from '../src/world/hub/interior-furnishings.js';
import {addInteriorDisplays} from '../src/world/hub/interior-displays.js';
import {obstacleDistance} from '../src/world/collision.js';
const buildings=plan.buildings.map(raw=>{const b=platformBuilding(raw);return {...b,buildingX:b.buildingX/HUB_SCALE,buildingZ:b.buildingZ/HUB_SCALE,width:b.width/HUB_SCALE,depth:b.depth/HUB_SCALE,height:b.height/1.5};});

test('nineteen authored room programs keep furniture inside walls and out of the service aisle',()=>{
 assert.equal(Object.keys(ROOM_PROGRAMS).length,19);
 for(const b of buildings){
  const p=roomFurniturePlan(b);assert.ok(p.furnishings.length>=3,b.buildingId);assert.ok(p.anchors.some(a=>a.kind==='seat'),b.buildingId);
  for(const f of p.furnishings){
   assert.ok(Math.abs(f.x-b.buildingX)+f.width/2<b.width/2-.275,b.buildingId+' side walls');
   assert.ok(Math.abs(f.z-b.buildingZ)+f.depth/2<b.depth/2-.275,b.buildingId+' front/rear walls');
   assert.ok(Math.abs(f.x-b.buildingX)-f.width/2>=2.4,b.buildingId+' service aisle');
  }
  // Solid furniture bodies must not intersect one another.
  for(let i=0;i<p.furnishings.length;i++)for(let j=i+1;j<p.furnishings.length;j++){
   const a=p.furnishings[i],c=p.furnishings[j];
   assert.ok(Math.abs(a.x-c.x)>=(a.width+c.width)/2-.015||Math.abs(a.z-c.z)>=(a.depth+c.depth)/2-.015,b.buildingId+' furniture overlap '+a.kind+'/'+c.kind);
  }
  for(const a of p.anchors){
   assert.ok(p.furnishings.every(f=>obstacleDistance(a,f)>.74),b.buildingId+' standing approach '+a.kind);
   if(a.kind==='seat'){
    const seat=p.furnishings.find(f=>f.kind==='seat'&&Math.hypot(f.x-a.seatX,f.z-a.seatZ)<.01);assert.ok(seat);assert.ok(a.seatHeight>.5&&a.seatHeight<.8);
   }
  }
 }
});

test('furniture feet are grounded and programs are batched without one draw per object',()=>{
 const root=new THREE.Group(),owned=[],collisions=[],box=new THREE.BoxGeometry(1,1,1),materials={dark:new THREE.MeshStandardMaterial(),gold:new THREE.MeshStandardMaterial(),glass:new THREE.MeshStandardMaterial()};
 try{
  const result=addInteriorDisplays({root,owned,box,buildings,materials,collisions});
  assert.equal(result.count,19);assert.equal(collisions.length,result.furnishings.length);assert.ok(result.anchors.length>=35);
  assert.ok(root.children[0].children.length<=8,'shared material batches');
  for(const room of result.roomPlans){
   for(const f of room.furnishings){
    const parts=room.pieces.filter(p=>Math.abs(p.x-f.x)<f.width/2+.15&&Math.abs(p.z-f.z)<f.depth/2+.15);
    assert.ok(parts.some(p=>p.y-p.sy/2<=.001),room.buildingId+' '+f.kind+' has ground support');
   }
  }
  result.setQuality('fluid');assert.ok(root.children[0].children.every(o=>!o.castShadow));
 }finally{box.dispose();Object.values(materials).forEach(m=>m.dispose());owned.forEach(o=>o.dispose());}
});

test('interior distance compaction restores matrices and upholstery colours on return',()=>{
 const root=new THREE.Group(),owned=[],box=new THREE.BoxGeometry(1,1,1),materials={dark:new THREE.MeshStandardMaterial(),gold:new THREE.MeshStandardMaterial(),glass:new THREE.MeshStandardMaterial()},camera=new THREE.PerspectiveCamera();
 try{
  const result=addInteriorDisplays({root,owned,box,buildings,materials});root.updateMatrixWorld(true);
  camera.position.set(-82,3,-74);camera.updateMatrixWorld(true);result.updateView(camera);
  const batches=root.children[0].children;
  const snapshot=()=>batches.map(b=>({count:b.count,matrix:b.count?[...b.instanceMatrix.array.slice(0,16)]:[],color:b.instanceColor&&b.count?[...b.instanceColor.array.slice(0,3)]:[]}));
  const near=snapshot();assert.ok(near.some(b=>b.count));
  camera.position.set(3000,3,3000);camera.updateMatrixWorld(true);result.updateView(camera);assert.ok(batches.every(b=>b.count===0));
  camera.position.set(-82,3,-74);camera.updateMatrixWorld(true);result.updateView(camera);assert.deepEqual(snapshot(),near);
  result.setQuality('fluid');result.updateView(camera);assert.ok(batches.reduce((n,b)=>n+b.count,0)<near.reduce((n,b)=>n+b.count,0));
 }finally{box.dispose();Object.values(materials).forEach(m=>m.dispose());owned.forEach(o=>o.dispose());}
});
