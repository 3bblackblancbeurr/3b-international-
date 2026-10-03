import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {attachCityTouchCamera,cityTouchGesture} from '../src/city/city3b-camera-touch.js';
import {createCityCameraMotion} from '../src/city/city3b-camera-motion.js';
test('two fingers describe independent pan, pinch and twist',()=>{const g=cityTouchGesture([{x:0,y:0},{x:0,y:100}]);assert.deepEqual(g,{x:0,y:50,distance:100,angle:Math.PI/2});});
test('two-finger camera cancels construction and stays in camera mode until both fingers lift',()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();
 const element=new EventTarget();element.clientHeight=500;element.setPointerCapture=()=>{};
 const camera=new PerspectiveCamera(40);camera.position.set(0,30,40);camera.lookAt(0,0,0);
 const controls={target:new Vector3(),enableDamping:true,minDistance:9,maxDistance:200,minPolarAngle:.12,maxPolarAngle:1.5,update(){}};
 const motion=createCityCameraMotion(camera,controls);let cancelled=0;
 const dispose=attachCityTouchCamera(element,{camera,controls,motion,canPan:()=>false,onGesture:()=>cancelled++});
 const emit=(type,id,x,y)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerType:'touch',pointerId:id,clientX:x,clientY:y});element.dispatchEvent(event);return event.defaultPrevented;};
 try{
  assert.equal(emit('pointerdown',1,100,100),false,'single finger remains construction');
  assert.equal(emit('pointerdown',2,200,100),true);
  assert.equal(emit('pointermove',2,300,100),true);
  assert.ok(Math.abs(camera.position.distanceTo(controls.target)-25)<1e-7,'pinch doubles zoom');
  emit('pointermove',2,100,300);assert.ok(Math.abs(camera.position.x-controls.target.x)>1,'twist rotates the orbit');
  assert.equal(emit('pointerup',2,100,300),true);
  assert.equal(emit('pointermove',1,120,110),true,'remaining finger cannot draw a road');
  assert.equal(emit('pointerup',1,120,110),true);
  assert.equal(emit('pointerdown',3,100,100),false,'next gesture can construct again');
  emit('pointercancel',3,100,100);assert.ok(cancelled>=3);
 }finally{dispose();if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
