import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcRouteScheduler} from '../src/world/hub/npc-routes.js';
import {createRoutePlanner} from '../src/world/route-planner.js';
import {restoreRouteObstacles} from '../src/world/route-obstacles.js';
import {findPath} from '../src/world/navigation.js';
import {moveWithCollision} from '../src/world/rules.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(options={}){
 const workers=[],planner=createRoutePlanner({workerFactory:()=>{
  const worker={messages:[],postMessage(packet){this.messages.push(packet);},terminate(){this.terminated=true;}};
  workers.push(worker);return worker;
 }});
 const scheduler=createNpcRouteScheduler({planner,...options});
 const reply=path=>{const worker=workers.at(-1),packet=worker.messages.at(-1);worker.onmessage({data:{id:packet.id,path}});};
 return {workers,planner,scheduler,reply};
}
const request=(actor,destination,obstacles=[])=>()=>({start:{...actor.position},destination,obstacles,radius:76});

test('resident routes use one serial worker and capture the next start only when executing',async()=>{
 const {scheduler,workers,reply}=harness(),first={position:{x:0,z:0}},second={position:{x:2,z:0}};
 scheduler.schedule(first,{request:request(first,{x:10,z:0})});
 scheduler.schedule(second,{request:request(second,{x:20,z:0})});
 assert.equal(workers.length,1);assert.equal(workers[0].messages.length,1);
 assert.equal(scheduler.pending,2);assert.equal(first.routePending,true);assert.equal(second.routePending,true);
 second.position.x=4;reply([{x:5,z:0},{x:10,z:0}]);await flush();
 assert.deepEqual(first.walkTarget,{x:5,z:0});assert.deepEqual(first.walkRoute,[{x:10,z:0}]);
 assert.equal(first.routePending,false);assert.equal(workers.length,1);
 assert.deepEqual(workers[0].messages[1].start,{x:4,z:0});
 reply([{x:20,z:0}]);await flush();assert.equal(scheduler.pending,0);assert.equal(second.routePending,false);
 scheduler.dispose();assert.equal(workers[0].terminated,true);
});

test('new schedules cancel running routes and stale worker replies cannot replace the new destination',async()=>{
 const {scheduler,workers,reply}=harness(),actor={position:{x:0,z:0}};
 scheduler.schedule(actor,{request:request(actor,{x:10,z:0})});
 const old=workers[0],oldPacket=old.messages[0];
 scheduler.schedule(actor,{request:request(actor,{x:-10,z:0})});await flush();
 assert.equal(old.terminated,true);assert.equal(actor.routePending,true);
 old.onmessage({data:{id:oldPacket.id,path:[{x:999,z:999}]}});
 assert.equal(actor.walkTarget,null);
 reply([{x:-10,z:0}]);await flush();assert.deepEqual(actor.walkTarget,{x:-10,z:0});
 assert.equal(actor.routePending,false);scheduler.dispose();
});

test('scene rebuild and disposal release every waiting resident without applying late work',async()=>{
 const {scheduler,workers}=harness(),actors=[0,1,2].map(x=>({position:{x,z:0}}));
 for(const actor of actors)scheduler.schedule(actor,{request:request(actor,{x:20,z:0})});
 const old=workers[0],packet=old.messages[0];scheduler.clear();await flush();
 assert.equal(old.terminated,true);assert.equal(scheduler.pending,0);
 assert.ok(actors.every(actor=>!actor.routePending&&actor.walkTarget===null));
 old.onmessage({data:{id:packet.id,path:[{x:20,z:0}]}});await flush();
 assert.ok(actors.every(actor=>actor.walkTarget===null));
 scheduler.dispose();assert.equal(scheduler.schedule(actors[0],{request:request(actors[0],{x:20,z:0})}),false);
});

test('worker failure and stale scene callbacks release the queue without synchronous retries',async()=>{
 const {scheduler,workers,reply}=harness(),first={position:{x:0,z:0}},second={position:{x:1,z:0}};
 let live=true;
 scheduler.schedule(first,{request:request(first,{x:10,z:0})});
 scheduler.schedule(second,{request:request(second,{x:20,z:0}),valid:()=>live});
 workers[0].onerror({message:'worker unavailable'});await flush();
 assert.equal(first.routePending,false);assert.equal(first.walkTarget,null);
 assert.equal(workers.length,2);live=false;reply([{x:20,z:0}]);await flush();
 assert.equal(second.routePending,false);assert.equal(second.walkTarget,null);assert.equal(scheduler.pending,0);
 scheduler.dispose();
});

test('an unresponsive worker times out and cannot hold the whole resident queue indefinitely',async()=>{
 const {scheduler,workers,reply}=harness({timeoutMs:20}),first={position:{x:0,z:0}},second={position:{x:1,z:0}};
 scheduler.schedule(first,{request:request(first,{x:10,z:0})});
 scheduler.schedule(second,{request:request(second,{x:20,z:0})});
 await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(workers[0].terminated,true);assert.equal(first.routePending,false);
 assert.equal(workers.length,2);reply([{x:20,z:0}]);await flush();
 assert.equal(second.routePending,false);assert.deepEqual(second.walkTarget,{x:20,z:0});scheduler.dispose();
});

test('blocked workers release every resident without attempting a main-thread search',async()=>{
 let attempts=0;const planner=createRoutePlanner({workerFactory:()=>{attempts++;throw Error('Worker blocked by browser');}});
 const scheduler=createNpcRouteScheduler({planner}),actors=[0,1].map(x=>({position:{x,z:0}}));
 for(const actor of actors)scheduler.schedule(actor,{request:request(actor,{x:10,z:0})});
 await flush();assert.equal(attempts,2);assert.equal(scheduler.pending,0);
 assert.ok(actors.every(actor=>!actor.routePending&&actor.walkTarget===null));scheduler.dispose();
});

test('worker route transfer retains the authored collision path around a wall',async()=>{
 const {scheduler,workers,reply}=harness(),actor={position:{x:-8,z:0}},destination={x:8,z:0},obstacles=[{x:0,z:0,width:3,depth:10}];
 scheduler.schedule(actor,{request:request(actor,destination,obstacles)});
 const packet=workers[0].messages[0],restored=restoreRouteObstacles(packet.obstacles);
 const path=findPath(packet.start,packet.destination,restored,packet.radius);
 assert.deepEqual(path,findPath(actor.position,destination,obstacles,76));assert.ok(path.length>1);
 reply(path);await flush();
 let position={...actor.position};
 for(const waypoint of [actor.walkTarget,...actor.walkRoute]){
  const length=Math.hypot(waypoint.x-position.x,waypoint.z-position.z),origin=position,steps=Math.ceil(length/.1);
  for(let i=1;i<=steps;i++){
   const expected={x:origin.x+(waypoint.x-origin.x)*i/steps,z:origin.z+(waypoint.z-origin.z)*i/steps};
   position=moveWithCollision(position,expected.x-position.x,expected.z-position.z,obstacles,76);
   assert.ok(Math.hypot(position.x-expected.x,position.z-expected.z)<1e-8,'accepted segments remain physically walkable');
  }
 }
 assert.ok(Math.hypot(position.x-destination.x,position.z-destination.z)<1e-8);scheduler.dispose();
});
