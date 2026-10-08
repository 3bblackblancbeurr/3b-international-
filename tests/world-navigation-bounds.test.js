import test from 'node:test';
import assert from 'node:assert/strict';
import {findPath,findInteractionPath} from '../src/world/navigation.js';
import {advanceMotion} from '../src/world/motion.js';
import {obstacleDistance} from '../src/world/collision.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';

test('bounded large-Hub navigation still walks through a five-unit bridge gap',()=>{
 const radius=HUB_PLATFORM.walkRadius,start={x:340,z:-24},item={id:'bridge-destination',type:'hubBuilding',x:380,z:-24,range:4},obstacles=[{id:'cite-water-boundary',surfaceDistance:p=>radius-Math.hypot(p.x,p.z)},...[-1,1].map(sign=>({x:360,z:sign*192.5,width:6,depth:380}))];
 const path=findInteractionPath(start,item,obstacles,radius);assert.ok(path.length);assert.ok(path.some(p=>Math.abs(p.z)<1.3),'Route uses the narrow open connector');
 let state={position:start,target:path.shift(),route:path};for(let frame=0;frame<600&&state.target;frame++){state=advanceMotion(state,{x:0,z:0},1/30,10.5,obstacles,radius);assert.ok(!obstacles.some(o=>obstacleDistance(state.position,o)<.69),'Movement never crosses a wall');}
 assert.ok(Math.hypot(state.position.x-item.x,state.position.z-item.z)<.1,'Real movement reaches the opposite platform');
});

test('an isolated destination returns without searching the whole Hub grid',()=>{
 const radius=HUB_PLATFORM.walkRadius;let checks=0;
 // A continuous closed annulus is impassable even though its centre and the
 // departure are both clear. Exhaustive search would visit the outer disc.
 const obstacles=[{id:'cite-water-boundary',surfaceDistance:p=>{checks++;return Math.abs(Math.hypot(p.x,p.z)-80)-3;}}];
 assert.deepEqual(findPath({x:180,z:0},{x:0,z:0},obstacles,radius),[]);
 assert.ok(checks<500000,'Collision work has a fixed upper bound: '+checks);
});
