import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector2,Vector3,Raycaster,Plane} from 'three';
import {attachCityTouchCamera,cityTouchGesture,cityTouchRotation} from '../src/city/city3b-camera-touch.js';
import {createCityCameraMotion} from '../src/city/city3b-camera-motion.js';
test('phone terrain follows both finger axes after any camera rotation and stays anchored while pinching',()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();
 try{for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const element=new EventTarget();element.clientHeight=500;element.getBoundingClientRect=()=>({left:0,top:0,width:500,height:500});element.setPointerCapture=()=>{};
  const camera=new PerspectiveCamera(40,1);camera.position.set(0,30,40).applyAxisAngle(new Vector3(0,1,0),yaw);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const controls={target:new Vector3(),minDistance:9,maxDistance:200,minPolarAngle:.12,maxPolarAngle:1.5,update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
  const dispose=attachCityTouchCamera(element,{camera,controls,motion:createCityCameraMotion(camera,controls),canPan:()=>true,onGesture(){}});
  const emit=(type,id,x,y)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType:'touch',pointerId:id,clientX:x,clientY:y});element.dispatchEvent(e);};
  const screen=point=>{const p=point.clone().project(camera);return {x:(p.x+1)*250,y:(1-p.y)*250};};
  try{
   emit('pointerdown',1,250,250);emit('pointermove',1,285,310);
   const moved=screen(new Vector3());assert.ok(Math.abs(moved.x-285)<.001);assert.ok(Math.abs(moved.y-310)<.001,'downward drag must move the terrain down');emit('pointerup',1,285,310);
   emit('pointerdown',1,250,250);emit('pointerdown',2,350,250);
   const ray=new Raycaster();ray.setFromCamera(new Vector2(.2,0),camera);const anchor=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),0),new Vector3());
   emit('pointermove',1,200,250);emit('pointermove',2,400,250);
   const pinched=screen(anchor);assert.ok(Math.abs(pinched.x-300)<.001);assert.ok(Math.abs(pinched.y-250)<.001,'pinch keeps the touched neighbourhood under the fingers');
  }finally{dispose();}
 }}finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
test('small finger angle noise does not rotate the map and intentional twist remains continuous',()=>{
 assert.equal(cityTouchRotation(0,5*Math.PI/180),0);
 assert.ok(Math.abs(cityTouchRotation(0,20*Math.PI/180)-12*Math.PI/180)<1e-10);
 assert.ok(Math.abs(cityTouchRotation(179*Math.PI/180,-179*Math.PI/180))===0);
});
test('two fingers describe independent pan, pinch and twist',()=>{const g=cityTouchGesture([{x:0,y:0},{x:0,y:100}]);assert.deepEqual(g,{x:0,y:50,distance:100,angle:Math.PI/2});});
test('inspection keeps tap selection while a camera drag suppresses selection',()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();
 const element=new EventTarget();element.clientHeight=500;element.getBoundingClientRect=()=>({left:0,top:0,width:500,height:500});element.setPointerCapture=()=>{};
 const camera=new PerspectiveCamera(40);camera.position.set(0,30,40);camera.lookAt(0,0,0);
 const controls={target:new Vector3(),minDistance:9,maxDistance:200,minPolarAngle:.12,maxPolarAngle:1.5,update(){}};
 const events=[];let cancelled=0;
 const dispose=attachCityTouchCamera(element,{camera,controls,motion:createCityCameraMotion(camera,controls),canPan:()=>true,onGesture:()=>cancelled++,onConstruction:e=>events.push(e.type)});
 const emit=(type,x)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType:'touch',pointerId:1,clientX:x,clientY:100});element.dispatchEvent(e);};
 try{emit('pointerdown',100);emit('pointermove',102);emit('pointerup',102);assert.deepEqual(events,['pointerdown','pointerup']);events.length=0;emit('pointerdown',100);emit('pointermove',160);emit('pointerup',160);assert.deepEqual(events,['pointerdown']);assert.ok(cancelled>0);assert.ok(controls.target.length()>0);}finally{dispose();if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
test('two-finger camera cancels construction and stays in camera mode until both fingers lift',()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();
 const element=new EventTarget();element.clientHeight=500;element.getBoundingClientRect=()=>({left:0,top:0,width:500,height:500});element.setPointerCapture=()=>{};
 const camera=new PerspectiveCamera(40);camera.position.set(0,30,40);camera.lookAt(0,0,0);
 const controls={target:new Vector3(),enableDamping:true,minDistance:9,maxDistance:200,minPolarAngle:.12,maxPolarAngle:1.5,update(){}};
 const motion=createCityCameraMotion(camera,controls);let cancelled=0,construction=[];
 const dispose=attachCityTouchCamera(element,{camera,controls,motion,canPan:()=>false,onConstruction:e=>construction.push(e.type),onGesture:()=>cancelled++});
 const emit=(type,id,x,y)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerType:'touch',pointerId:id,clientX:x,clientY:y});element.dispatchEvent(event);return event.defaultPrevented;};
 try{
  assert.equal(emit('pointerdown',1,100,100),true);assert.deepEqual(construction,['pointerdown'],'single finger is forwarded only to construction, not OrbitControls');
  assert.equal(emit('pointerdown',2,200,100),true);
  assert.equal(emit('pointermove',2,300,100),true);
  assert.ok(Math.abs(camera.position.distanceTo(controls.target)-25)<1e-7,'pinch doubles zoom');
  emit('pointermove',2,100,300);assert.ok(Math.abs(camera.position.x-controls.target.x)>1,'twist rotates the orbit');
  assert.equal(emit('pointerup',2,100,300),true);
  assert.equal(emit('pointermove',1,120,110),true,'remaining finger cannot draw a road');
  assert.equal(emit('pointerup',1,120,110),true);
  assert.deepEqual(construction,['pointerdown'],'two-finger gesture cannot finish a construction');emit('pointerdown',3,100,100);assert.deepEqual(construction,['pointerdown','pointerdown'],'next gesture can construct again');
  emit('pointercancel',3,100,100);assert.ok(cancelled>=3);
 }finally{dispose();if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
