import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {createCityCameraMotion} from '../src/city/city3b-camera-motion.js';
function fixture(){const camera=new PerspectiveCamera();camera.position.set(0,30,40);const controls={target:new Vector3(),enableDamping:true,minDistance:9,maxDistance:200,minPolarAngle:.12,maxPolarAngle:Math.PI*.48,update(){}};return {camera,controls,motion:createCityCameraMotion(camera,controls,()=>100)};}
test('zoom and rotation ease without changing orbit radius during rotation',()=>{const {camera,controls,motion}=fixture();motion.rotate(Math.PI/2);motion.update(1/60);assert.ok(camera.position.x>0&&camera.position.x<40);assert.ok(Math.abs(camera.position.distanceTo(controls.target)-50)<1e-8);motion.zoom(.5);for(let i=0;i<120;i++)motion.update(1/60);assert.ok(Math.abs(camera.position.distanceTo(controls.target)-25)<.001);});
test('camera smoothing agrees at 30, 60 and 120 fps',()=>{const positions=[30,60,120].map(fps=>{const f=fixture();f.motion.zoom(.5);for(let i=0;i<fps/2;i++)f.motion.update(1/fps);return f.camera.position;});for(const p of positions)assert.ok(p.distanceTo(positions[0])<1e-7);});
test('camera limits, reduced motion, repeated zoom and interruption',()=>{const {camera,controls,motion}=fixture();motion.zoom(.5);motion.zoom(.5);motion.update(1,true);assert.ok(Math.abs(camera.position.length()-12.5)<1e-7);motion.zoom(.01,true);assert.ok(Math.abs(camera.position.length()-9)<1e-7);motion.pan(new Vector3(200,0,-200),true);assert.deepEqual(controls.target.toArray(),[100,0,-100]);motion.rotate(1);motion.cancel();const before=camera.position.clone();assert.equal(motion.update(.1),false);assert.ok(camera.position.equals(before));});

test('distant outposts do not make the starting neighbourhood microscopic',async()=>{
 const {cityMapInitialView,cityMapBlueprint}=await import('../src/city/city3b-map.js');
 const data={city:{city:{map_extent:1000}},placements:[{x:0,z:0,footprint_w:6,footprint_h:5},{x:900,z:900,footprint_w:4,footprint_h:4}]};
 const view=cityMapInitialView(data);
 assert.ok(cityMapBlueprint(data).half/view.zoom<=34);
 assert.deepEqual(view.center,{x:3,z:2.5});
});
