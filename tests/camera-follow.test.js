import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMERA_FOLLOW_RESUME_SECONDS,angleDelta,followMovement} from '../src/world/camera-follow.js';

test('camera follow resumes quickly after a deliberate manual look',()=>{
 const orbit={yaw:0};
 assert.equal(CAMERA_FOLLOW_RESUME_SECONDS,.55);
 assert.deepEqual(followMovement(orbit,1,0,1/60,{quietFor:.54}),orbit);
 const resumed=followMovement(orbit,1,0,1/60,{quietFor:.56});assert.ok(resumed.yaw<0);
 assert.deepEqual(followMovement(orbit,1,0,1/60,{quietFor:10,manual:true}),orbit);
});

test('camera follow remains bounded and takes the shortest angular path',()=>{
 assert.ok(Math.abs(angleDelta(Math.PI-.05,-Math.PI+.05)-.1)<1e-10);
 const fast=followMovement({yaw:0},1,0,.25,{quietFor:10}),reduced=followMovement({yaw:0},1,0,.25,{quietFor:10,reducedMotion:true});
 assert.ok(Math.abs(fast.yaw)<=.25*2.35+1e-12);assert.ok(Math.abs(reduced.yaw)<=.25*1.25+1e-12);
});
