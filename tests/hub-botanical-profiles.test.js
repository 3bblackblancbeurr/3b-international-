import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addCiteVegetation} from '../src/world/hub/cite-vegetation.js';
import {citeSurfaceDistance,CITE_GATE_SITES} from '../src/world/hub/platform-topology.js';

test('four planted silhouettes are physically connected to trunks and exactly mapped',()=>{
 const root=new THREE.Group(),owned=[],collisions=[];
 try{
  const plants=addCiteVegetation({root,owned,buildings:[],collisions}),group=root.getObjectByName('3B · jardins botaniques');
  assert.deepEqual(new Set(plants.mapSites.map(p=>p.species)),new Set(['broadleaf','pine','cypress','palm']));
  assert.equal(plants.count,plants.mapSites.length);assert.ok(group.children.length<=6);
  const trunk=group.getObjectByName('Troncs'),stipe=group.getObjectByName('Stipes des palmiers');assert.equal(trunk.count+stipe.count,plants.count);
  for(const p of plants.mapSites){
   assert.ok(collisions.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<.001),'map tree has actual solid trunk');
   assert.ok(citeSurfaceDistance(p.x,p.z)<-.42,'root grounded on actual coast');
   if(p.country)assert.equal(p.baseY,CITE_GATE_SITES.find(s=>s.name===p.country).baseY||0,'raised island tree datum');
  }
  for(const [canopyName,trunkMesh] of [['Canopées ramifiées',trunk],['Pinède des héritages',trunk],['Cyprès des jardins',trunk],['Palmiers des rivages',stipe]]){
   const canopy=group.getObjectByName(canopyName);assert.ok(canopy?.count>0);canopy.geometry.computeBoundingBox();trunkMesh.geometry.computeBoundingBox();
   assert.ok(canopy.geometry.boundingBox.min.y<trunkMesh.geometry.boundingBox.max.y,'canopy connects to its trunk');assert.ok(canopy.geometry.attributes.color,'leaf shades actually authored');
  }
  plants.setQuality('fluid');assert.ok(group.children.every(m=>!m.castShadow));
 }finally{owned.forEach(o=>o.dispose());}
});
