import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_TOUCH_LAYOUT,normalizeTouchLayout,resetTouchLayout} from '../src/world/touch-layout.js';
test('touch layout keeps six independent controls',()=>{const positions=resetTouchLayout();assert.deepEqual(Object.keys(positions).sort(),Object.keys(DEFAULT_TOUCH_LAYOUT).sort());});
test('touch controls clamp unsafe positions to the viewport and reject invalid data',()=>{
 const p=normalizeTouchLayout({jump:{x:-150,y:900},guard:{x:'untrusted',y:null},power:{x:54,y:41}});
 assert.deepEqual(p.jump,{x:7,y:92});
 assert.deepEqual(p.guard,DEFAULT_TOUCH_LAYOUT.guard);
 assert.deepEqual(p.power,{x:54,y:41});
});
test('editing never mutates the default layout',()=>{const edited=normalizeTouchLayout({joystick:{x:50,y:50}});assert.deepEqual(edited.joystick,{x:50,y:50});assert.deepEqual(DEFAULT_TOUCH_LAYOUT.joystick,{x:13,y:75});});
