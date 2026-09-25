import test from 'node:test';
import assert from 'node:assert/strict';
import {createTechniqueTracker,detectJoystickTechnique,shapeJoystick} from '../src/games/penaltyRush/joystick.js';

test('premium joystick keeps a quiet center and progressive power',()=>{
  assert.equal(shapeJoystick(4,3).active,false);
  const mid=shapeJoystick(44,0);
  const edge=shapeJoystick(100,0);
  assert.ok(mid.intensity>.25&&mid.intensity<.65);
  assert.equal(edge.intensity,1);
  assert.equal(mid.x,1);
});

test('quick lateral reversal becomes a cut',()=>{
  const t=createTechniqueTracker();
  detectJoystickTechnique(t,{active:true,x:.9,y:0,intensity:.85,angle:0},1000);
  const move=detectJoystickTechnique(t,{active:true,x:-.9,y:0,intensity:.9,angle:Math.PI},1120);
  assert.equal(move?.type,'cut');
  assert.equal(move?.direction,-1);
});

test('side then forward becomes a body feint',()=>{
  const t=createTechniqueTracker();
  detectJoystickTechnique(t,{active:true,x:.85,y:0,intensity:.8,angle:0},1000);
  const move=detectJoystickTechnique(t,{active:true,x:.1,y:-.9,intensity:.88,angle:-Math.PI/2},1190);
  assert.equal(move?.type,'feint');
  assert.equal(move?.direction,1);
});

test('fast quarter-circle becomes roulette rhythm',()=>{
  const t=createTechniqueTracker();
  detectJoystickTechnique(t,{active:true,x:1,y:0,intensity:.82,angle:0},1000);
  detectJoystickTechnique(t,{active:true,x:.7,y:-.7,intensity:.84,angle:-Math.PI/4},1070);
  const move=detectJoystickTechnique(t,{active:true,x:0,y:-1,intensity:.86,angle:-Math.PI/2},1140);
  assert.equal(move?.type,'rhythm');
  assert.equal(move?.label,'ROULETTE');
});
