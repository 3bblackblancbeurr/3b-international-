import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPremiumTransitVehicle} from '../src/world/premium-hub-visuals.js';
import {goldMasterTokens,worldArtMaterials} from '../src/design-system/tokens.js';

function fixture(){
 const root=new THREE.Group(),geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,24)},materials=[];
 const options={root,geometry,groundY:()=>12,material:(color,props)=>{const value=new THREE.MeshStandardMaterial({color,...props});materials.push(value);return value;}};
 return {root,geometry,materials,options,dispose(){for(const item of new Set(Object.values(geometry)))item.dispose();for(const item of materials)item.dispose();}};
}

for(const [transport,budget] of [['train',11],['boat',3],['telepheric',7]])test(transport+' details fit the existing draw budget and reuse all geometry',()=>{
 const f=fixture(),spec=Object.freeze({transport,height:2,color:goldMasterTokens.colors.champagne}),start=Object.freeze({x:5,z:8});
 try{
  const first=createPremiumTransitVehicle(spec,start,f.options),geometryCount=Object.keys(f.geometry).length;
  assert.deepEqual(first.position.toArray(),[5,14,8]);
  assert.ok(first.children.length<=budget,first.children.length+' draws exceed '+budget);
  let triangles=0;
  first.traverse(object=>{
   if(!object.isMesh)return;
   const vertices=object.geometry.getAttribute('position');triangles+=(object.geometry.index?.count||vertices.count)/3;
   for(const value of vertices.array)assert.ok(Number.isFinite(value));
   for(const value of object.geometry.getAttribute('normal').array)assert.ok(Number.isFinite(value));
  });
  assert.ok(triangles<3500,'geometry budget: '+triangles+' triangles');
  for(let i=0;i<24;i++){
   const next=createPremiumTransitVehicle(spec,start,f.options);
   assert.equal(next.children.length,first.children.length);
   next.children.forEach((mesh,index)=>assert.equal(mesh.geometry,first.children[index].geometry));
   next.removeFromParent();
  }
  assert.equal(Object.keys(f.geometry).length,geometryCount,'no cache growth per vehicle');
  const glass=first.children.find(mesh=>mesh.name.includes('vitrage')||mesh.name.includes('vitrée'));
  assert.ok(glass?.material.transparent,'real glazing rather than an opaque blue block');
  assert.ok(glass.material.opacity>.5&&glass.material.opacity<1);
  assert.equal(glass.material.color.getHexString(),new THREE.Color(worldArtMaterials.monumentBlue).getHexString());
 }finally{f.dispose();}
});

test('the navette has a tapered bow and visible working deck instead of a rectangular hull',()=>{
 const f=fixture();
 try{
  const boat=createPremiumTransitVehicle({transport:'boat',height:0,color:goldMasterTokens.colors.champagne},{x:0,z:0},f.options);
  const hull=boat.children[0],vertices=hull.geometry.getAttribute('position');
  let bowWidth=0,middleWidth=0;
  for(let i=0;i<vertices.count;i++){
   const x=Math.abs(vertices.getX(i)),z=vertices.getZ(i);
   if(z>1.4)bowWidth=Math.max(bowWidth,x);
   if(Math.abs(z)<1)middleWidth=Math.max(middleWidth,x);
  }
  assert.ok(bowWidth<middleWidth*.78,'bow tapers within the unchanged footprint');
  const deck=boat.children.find(mesh=>mesh.name.includes('accastillage'));
  assert.ok(deck);
  deck.geometry.computeBoundingBox();
  assert.ok(deck.geometry.boundingBox.max.y>.65,'cabin roof and deck trim have actual relief');
  assert.ok(deck.geometry.boundingBox.min.z<-1.4,'stern bench belongs to the same physical assembly');
 }finally{f.dispose();}
});

test('the existing scene geometry owner can dispose every cached craft resource once',()=>{
 const f=fixture(),counts=new Map();
 for(const transport of ['train','boat','telepheric'])createPremiumTransitVehicle({transport,height:0,color:goldMasterTokens.colors.champagne},{x:0,z:0},f.options);
 for(const geometry of new Set(Object.values(f.geometry)))geometry.addEventListener('dispose',()=>counts.set(geometry,(counts.get(geometry)||0)+1));
 f.dispose();
 assert.equal(counts.size,new Set(Object.values(f.geometry)).size);
 assert.ok([...counts.values()].every(count=>count===1));
});
