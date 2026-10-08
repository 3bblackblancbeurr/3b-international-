import test from 'node:test';
import assert from 'node:assert/strict';
import {Object3D} from 'three';
import {createRoutePlanner,serializeRouteObstacles} from '../src/world/route-planner.js';
import {restoreRouteObstacles} from '../src/world/route-obstacles.js';
import {obstacleDistance} from '../src/world/collision.js';
import {addCiteTerraces,CITE_TERRACES} from '../src/world/hub/terraces.js';
import {addCivicTower} from '../src/world/hub/civic-tower.js';
import {HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {citeSurfaceDistance} from '../src/world/hub/platform-topology.js';

test('worker geometry preserves every authored terrace, water and selectable floor collision',()=>{
 const collisions=[],owned=[],settings={mesh:()=>new Object3D(),geo:g=>{owned.push(g);return g;},box:null,materials:{},collisions,sign:()=>{}};
 const surfaces=addCiteTerraces(settings);assert.equal(collisions.length,40);
 const water={id:'cite-water-boundary',surfaceDistance:p=>-citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)*HUB_SCALE};collisions.push(water);
 const tower=addCivicTower({...settings,buildings:[{buildingId:'tower_circle',buildingX:0,buildingZ:-38,width:14,depth:10}],cameraSolids:[]});
 for(const o of collisions)for(const key of ['x','z','r','width','depth'])if(Number.isFinite(o[key]))o[key]*=HUB_SCALE;
 for(const index of [null,0,1,2,3,4,5]){
  const floor=tower.setFloor(index),restored=restoreRouteObstacles(structuredClone(serializeRouteObstacles(collisions,floor)));
  assert.equal(restored.length,collisions.length);
  const points=[{x:0,z:0},{x:floor?.x||0,z:floor?.z||0},{x:0,z:-38*HUB_SCALE},...CITE_TERRACES.flatMap(t=>[-12,-3,7,11].flatMap(along=>[-4,-3.3,0,3.3,4].map(across=>({x:(t.x+Math.cos(t.angle)*along-Math.sin(t.angle)*across)*HUB_SCALE,z:(t.z+Math.sin(t.angle)*along+Math.cos(t.angle)*across)*HUB_SCALE}))))];
  for(let i=0;i<collisions.length;i++)for(const point of points){const before=obstacleDistance(point,collisions[i]),after=obstacleDistance(point,restored[i]);assert.ok(before===after||Math.abs(before-after)<1e-10,collisions[i].id+' '+index+' '+before+' '+after);}
 }
 [...surfaces,...owned].forEach(g=>g.dispose());
});

test('unknown callbacks reject instead of allowing a route through an omitted collider',()=>{
 assert.throws(()=>serializeRouteObstacles([{id:'custom-wall',surfaceDistance:()=>1}]),{name:'UnsupportedObstacleError'});
 assert.throws(()=>restoreRouteObstacles([{routeShape:'unregistered'}]),/Unknown route collision/);
});

test('latest route wins, termination cancels CPU work, and late worker errors cannot cancel a newer request',async()=>{
 const workers=[],planner=createRoutePlanner({workerFactory:()=>{const worker={terminate(){this.terminated=true;},postMessage(data){this.sent=data;}};workers.push(worker);return worker;}}),input={start:{x:0,z:0},destination:{x:5,z:0},obstacles:[],radius:76};
 const first=planner.plan(input).catch(e=>e);assert.equal(planner.status().pending,true);
 const second=planner.plan(input);assert.equal((await first).name,'AbortError');assert.equal(workers[0].terminated,true);
 workers[0].onerror({message:'old worker error'});workers[0].onmessage({data:{id:workers[0].sent.id,path:[{x:999,z:999}]}});assert.equal(planner.status().pending,true);
 workers[1].onmessage({data:{id:workers[1].sent.id,path:[{x:5,z:0}]}});assert.deepEqual(await second,[{x:5,z:0}]);assert.equal(planner.status().pending,false);
 const cancelled=planner.plan(input).catch(e=>e);planner.cancel();assert.equal((await cancelled).name,'AbortError');assert.equal(workers[1].terminated,true);
 const failed=planner.plan(input).catch(e=>e);workers[2].onmessage({data:{id:workers[2].sent.id,error:'geometry failure'}});assert.match((await failed).message,/geometry failure/);assert.equal(planner.status().pending,false);
 const disposed=planner.plan(input).catch(e=>e);planner.dispose();assert.equal((await disposed).name,'AbortError');assert.equal(planner.status().disposed,true);await assert.rejects(planner.plan(input),{name:'InvalidStateError'});
});
