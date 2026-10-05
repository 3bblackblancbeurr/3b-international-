import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CITE_ISLANDS,CITE_BRIDGES,CITE_CONNECTORS,CITE_PROMENADES} from '../src/world/hub/platform-topology.js';
import {bridgeRailSpans,bridgeRailPoint,islandDeckDistance} from '../src/world/hub/bridge-rail-spans.js';
import {islandDeckGeometry} from '../src/world/hub/island-cliffs.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {blankSave} from '../src/world/rules.js';

test('rail coast classification matches the rendered irregular coastal triangles',()=>{
 const material=new THREE.MeshBasicMaterial();
 try{for(const island of CITE_ISLANDS){
  const geometry=islandDeckGeometry(island),deck=new THREE.Mesh(geometry,material);deck.updateMatrixWorld();
  try{for(let i=0;i<97;i++){
   const angle=(i+.31)*Math.PI*2/97;
   for(const factor of [.985,1.015]){
    const x=island.x+Math.cos(angle)*island.r*factor,z=island.z+Math.sin(angle)*island.r*factor;
    const hit=new THREE.Raycaster(new THREE.Vector3(x,(island.baseY||0)+1,z),new THREE.Vector3(0,-1,0)).intersectObject(deck).length>0;
    assert.equal(islandDeckDistance(island,x,z)<=0,hit,island.id+' matches its actual mesh');
   }
  }}finally{geometry.dispose();}
 }}finally{material.dispose();}
});

test('every retained rail span clears island shores and both promenade junctions',()=>{
 let railLength=0;
 for(const bridge of [...CITE_BRIDGES,...CITE_CONNECTORS])for(const side of [-1,1]){
  for(const span of bridgeRailSpans(bridge,side)){
   assert.ok(span.start>=-bridge.length/2&&span.end<=bridge.length/2&&span.end>span.start);
   railLength+=span.end-span.start;
   for(let t=.005;t<1;t+=.025){
    const p=bridgeRailPoint(bridge,side,span.start+(span.end-span.start)*t),r=Math.hypot(p.x,p.z);
    assert.ok(CITE_ISLANDS.every(island=>islandDeckDistance(island,p.x,p.z)>.19),'no guardrail crosses an island');
    assert.ok(CITE_PROMENADES.every(deck=>r<deck.inner-.19||r>deck.outer+.19),'both circuits remain open');
   }
  }
 }
 assert.ok(railLength>80,'open-water bridges retain real edge protection');
});

test('archive centre aisle has no radial bridge balustrade through its room',()=>{
 const hub=createHubPlatform(blankSave());hub.root.updateMatrixWorld(true);
 try{
  const bridge=CITE_BRIDGES[7],along=22.308657865101413,p=bridgeRailPoint(bridge,-1,along);
  const hits=new THREE.Raycaster(new THREE.Vector3(p.x*HUB_SCALE,3,p.z*HUB_SCALE),new THREE.Vector3(0,-1,0)).intersectObject(hub.root,true).filter(h=>!h.object.material.transparent);
  assert.ok(hits.length);assert.ok(hits[0].point.y<.3,'standing-height gold bars must not cross the service aisle');
 }finally{hub.dispose();}
});

test('central fountain water is above its real bed and remains contained by its bank',()=>{
 const hub=createHubPlatform(blankSave());hub.root.updateMatrixWorld(true);
 try{
  const rayAt=r=>new THREE.Raycaster(new THREE.Vector3(r*HUB_SCALE,3,0),new THREE.Vector3(0,-1,0)).intersectObject(hub.root,true);
  const waterHit=rayAt(15.4).find(hit=>hit.object.material.uniforms?.waveAmp&&hit.point.y>0),bedHit=rayAt(15.4).find(hit=>!hit.object.material.transparent),bankHit=rayAt(17).find(hit=>!hit.object.material.transparent);
  assert.ok(waterHit&&bedHit&&bankHit,'fountain has water, a solid bed and a solid annular bank');
  const amplitude=.395*waterHit.object.material.uniforms.waveAmp.value*1.5;
  assert.ok(waterHit.point.y-amplitude>bedHit.point.y+.1,'even a trough stays above the solid pedestal');
  assert.ok(waterHit.point.y+amplitude<bankHit.point.y-.1,'even a crest stays below the rim');
 }finally{hub.dispose();}
});
