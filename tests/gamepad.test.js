import test from 'node:test';
import assert from 'node:assert/strict';
import {createGamepadInput} from '../src/world/origins/gamepad.js';
const pad=(buttons=[],axes=[0,0,0,0])=>({index:0,connected:true,mapping:'standard',axes,buttons:Array.from({length:16},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))});
test('stick deadzone removes drift and diagonal movement remains normalized',()=>{
 const input=createGamepadInput();assert.deepEqual(input.sample([pad([],[.1,.1,0,0])]).move,{x:0,y:0});
 const m=input.sample([pad([],[1,1,0,0])]).move;assert.ok(Math.abs(Math.hypot(m.x,m.y)-1)<1e-9);
});
test('a held button fires once and cannot leak out of pause or reconnect',()=>{
 const input=createGamepadInput();input.sample([pad()]);assert.deepEqual(input.sample([pad([2])]).actions,['light']);
 assert.deepEqual(input.sample([pad([2])]).actions,[]);input.sample([pad([3])],false);
 assert.deepEqual(input.sample([pad([3])]).actions,[]);input.sample([]);
 assert.deepEqual(input.sample([pad([2])]).actions,[]);
});
test('unsupported controllers and disconnected pads produce no input',()=>{
 const input=createGamepadInput();for(const p of [{...pad([2]),mapping:''},{...pad([2]),connected:false}])assert.deepEqual(input.sample([p]).actions,[]);
});
