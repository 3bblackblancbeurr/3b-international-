import test from 'node:test';
import assert from 'node:assert/strict';
import {createHubCartography,mapFootprint,mapStructureOutline,hubMapRoute,hubMapDestinations,hubMiniMapMarkers} from '../src/world/hub/cartography-model.js';
import {CITE_ISLANDS,CITE_BRIDGES,CITE_PROMENADES,CITE_CONNECTORS,citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {islandDeckGeometry} from '../src/world/hub/island-cliffs.js';
import {HUB_SCALE,HUB_PLATFORM,platformPortal,platformWalls} from '../src/world/hub/platform-layout.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {blankSave} from '../src/world/rules.js';
import {findPath} from '../src/world/navigation.js';
import {obstacleDistance} from '../src/world/collision.js';

const approx=(a,b,msg,tolerance=.0001)=>assert.ok(Math.abs(a-b)<tolerance,msg+` (${a} ≠ ${b})`);

test('atlas coast outlines are the actual triangulated island deck edge, in world metres',()=>{
 const map=createHubCartography();assert.equal(map.islands.length,CITE_ISLANDS.length);
 for(const island of CITE_ISLANDS){
  const deck=islandDeckGeometry(island),p=deck.attributes.position,outline=map.islands.find(i=>i.id===island.id).outline;
  try{assert.equal(outline.length,64);for(let i=1;i<p.count;i++){
   const x=p.getX(i)*HUB_SCALE,z=p.getZ(i)*HUB_SCALE,nearest=outline.reduce((d,q)=>Math.min(d,Math.hypot(q.x-x,q.z-z)),Infinity);
   assert.ok(nearest<.0001,island.id+' vertex '+i+' differs from the real deck edge');
  }}finally{deck.dispose();}
 }
});

test('atlas includes both actual promenades, all bridges, causeways and correctly rotated footprints',()=>{
 const map=createHubCartography();assert.equal(map.bridges.length,CITE_BRIDGES.length);assert.equal(map.connectors.length,CITE_CONNECTORS.length);assert.equal(map.promenades.length,CITE_PROMENADES.length);
 for(const ring of map.promenades){const actual=CITE_PROMENADES.find(p=>p.id===ring.id);approx(ring.inner,actual.inner*HUB_SCALE,ring.id+' inner coast');approx(ring.outer,actual.outer*HUB_SCALE,ring.id+' outer coast');}
 for(const bridge of [...map.bridges,...map.connectors]){
  const polygon=mapFootprint(bridge);approx(Math.hypot(polygon[1].x-polygon[0].x,polygon[1].z-polygon[0].z),bridge.width,bridge.id+' length');approx(Math.hypot(polygon[2].x-polygon[1].x,polygon[2].z-polygon[1].z),bridge.depth,bridge.id+' width');
  for(let i=0;i<=20;i++){const t=i/20,x=bridge.x+Math.cos(-bridge.rotation)*(t-.5)*(bridge.width-4),z=bridge.z+Math.sin(-bridge.rotation)*(t-.5)*(bridge.width-4);assert.ok(citeSurfaceDistance(x/HUB_SCALE,z/HUB_SCALE)<0,bridge.id+' map path is dry');}
 }
 assert.ok(map.extent>CITE_PROMENADES.at(-1).outer*HUB_SCALE);
});

test('atlas room walls, entrance coordinates and eight heritage gates match runtime locations',()=>{
 const items=worldRuntimeItems('hub',blankSave()),map=createHubCartography(items);assert.equal(map.buildings.length,19);
 for(const b of map.buildings){const actual=items.find(i=>i.id===b.id);assert.equal(b.x,actual.buildingX);assert.equal(b.z,actual.buildingZ);assert.deepEqual(b.walls,platformWalls(actual));assert.deepEqual(b.entrance,actual.entrance);}
 const gates=items.filter(i=>i.type==='portal');assert.equal(gates.length,8);gates.forEach((g,index)=>{const p=platformPortal(index);approx(g.x,p.x,g.id+' longitude');approx(g.z,p.z,g.id+' latitude');});
 assert.deepEqual(map.terraces.map(t=>t.rise),Array(8).fill(6));
});

test('map consumes already generated scenery and keeps physical path routes over dry, unobstructed ground',()=>{
 const save=blankSave(),items=worldRuntimeItems('hub',save),hub=createHubPlatform(save);
 try{
  const actualMap=createHubCartography(items,hub.cartography);assert.equal(actualMap.fabric.length,hub.architectureDiagnostics.districtBuildings);assert.equal(actualMap.vegetation.length,hub.architectureDiagnostics.botanicalTrees);assert.ok(actualMap.structures.length>=36);const vessels=actualMap.structures.filter(s=>s.kind==='vessel');assert.equal(vessels.length,5);for(const vessel of vessels){const hull=mapStructureOutline(vessel);assert.equal(hull.length,6);assert.ok(hull.every(p=>Math.abs(p.x)<actualMap.extent&&Math.abs(p.z)<actualMap.extent),'whole map includes each actual ship hull');}
  for(const site of [...actualMap.fabric,...actualMap.vegetation,...actualMap.structures])assert.ok(Number.isFinite(site.x)&&Number.isFinite(site.z),'Every generated decoration retains actual world coordinates');
  const runtime={units:'world',fabric:[{x:72,z:88,width:10.2,depth:10.2,height:21}],vegetation:[{x:74,z:91,scale:1.1}],structures:[{x:80,z:94,width:12,depth:8,rotation:.3}],obstacles:hub.collisions};
  const map=createHubCartography(items,runtime);assert.equal(map.fabric[0].x,72);assert.equal(map.vegetation[0].z,91);assert.equal(map.structures[0].width,12);assert.ok(map.obstacles.length>100);
  const target=items.find(i=>i.type==='portal'&&i.id==='france'),route=findPath(HUB_PLATFORM.spawn,target,hub.collisions,HUB_PLATFORM.walkRadius),polyline=hubMapRoute(HUB_PLATFORM.spawn,route);assert.ok(polyline.length>2,'a displayed route detours around city obstacles');
  for(let i=1;i<polyline.length;i++){const a=polyline[i-1],b=polyline[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5);for(let k=1;k<=n;k++){const q={x:a.x+(b.x-a.x)*k/n,z:a.z+(b.z-a.z)*k/n};assert.ok(citeSurfaceDistance(q.x/HUB_SCALE,q.z/HUB_SCALE)<0,'map route cannot cross sea');assert.ok(hub.collisions.every(o=>obstacleDistance(q,o)>=1.2),'map route cannot cross furniture or walls');}}
  assert.deepEqual(hubMapRoute(HUB_PLATFORM.spawn,[]),[],'no invented straight route while a destination is only marked');
 }finally{hub.dispose();}
});

test('search, category filters and small-map density preserve real destinations without filler',()=>{
 const items=worldRuntimeItems('hub',blankSave()),search=hubMapDestinations(items,{query:'memoire'});assert.ok(search.some(i=>i.buildingId==='memory_archives'),'accent-independent library search');
 const travel=hubMapDestinations(items,{category:'travel'});assert.equal(travel.filter(i=>i.type==='portal').length,8);assert.ok(travel.every(i=>['portal','hubTransport'].includes(i.type)));
 const blocked={id:'hidden',type:'hubMission',name:'Hidden',x:0,z:0,locked:true};assert.ok(!hubMapDestinations([...items,blocked]).some(i=>i.id===blocked.id));
 const map=createHubCartography(items),visible=hubMiniMapMarkers(items,{x:0,z:0},map.extent,items[0]);assert.ok(visible.length<=22);assert.ok(visible.every(i=>items.some(actual=>actual.id===i.id&&actual.x===i.x&&actual.z===i.z)));
});
