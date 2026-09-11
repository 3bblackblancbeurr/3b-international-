import test from 'node:test';
import assert from 'node:assert/strict';
import {movementHeading,compassDirection} from '../src/world/heading.js';
import {advanceMotion} from '../src/world/motion.js';
import {cameraRelative} from '../src/world/orbit.js';

test('movement compass covers eight directions at a fixed camera angle',()=>{
 const directions=[[0,-1,0,'N'],[1,-1,45,'NE'],[1,0,90,'E'],[1,1,135,'SE'],[0,1,180,'S'],[-1,1,225,'SO'],[-1,0,270,'O'],[-1,-1,315,'NO']];
 for(const [x,z,degrees,label] of directions){
  const next=advanceMotion({position:{x:0,z:5},target:null,route:[]},{x,z},.1,10,[],134);
  const heading=movementHeading(next.position.x,next.position.z-5,180);
  assert.ok(Math.abs(heading-degrees)<1e-8);assert.equal(compassDirection(heading),label);
 }
});

test('course follows camera-relative movement but survives stopping and looking around',()=>{
 const input=cameraRelative(1,0,Math.PI/2),heading=movementHeading(input.x,input.z);
 assert.ok(heading<1e-8);assert.equal(movementHeading(0,0,heading),heading);
 assert.equal(movementHeading(1e-8,-1e-8,315),315);
 assert.equal(compassDirection(359.9),'N');assert.equal(compassDirection(.1),'N');
 assert.ok(movementHeading(-.001,-1)>359);assert.ok(movementHeading(.001,-1)<1);
});

test('automatic walking updates its course at a bend and retains it on arrival',()=>{
 let state={position:{x:0,z:0},target:{x:1,z:0},route:[{x:1,z:1}]},heading=180;
 for(const expected of [90,180,180]){
  const next=advanceMotion(state,{x:0,z:0},.1,10,[],134);
  heading=movementHeading(next.position.x-state.position.x,next.position.z-state.position.z,heading);
  assert.equal(heading,expected);state=next;
 }
 assert.equal(state.moving,false);
});

test('a blocked avatar keeps its course instead of pointing at the pressed key',()=>{
 const position={x:0,z:0},next=advanceMotion({position,target:null,route:[]},{x:1,z:0},.1,10,[{x:1.2,z:0,r:1}],134);
 assert.equal(next.moving,false);
 assert.equal(movementHeading(next.position.x-position.x,next.position.z-position.z,270),270);
});
