import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPortalFrame} from '../src/world/portals.js';
import {gateOpening} from '../src/world/hub/gate-mechanism.js';

test('hub doors open before the crossing and clear its full passage',()=>{
 const frame=createPortalFrame('france','#75bbde',{mechanical:true});
 frame.tick(30,.1);assert.equal(frame.mechanism.openness,0);
 for(let i=0;i<10;i++)frame.tick(12,.1);
 assert.equal(frame.mechanism.openness,1);frame.group.updateMatrixWorld(true);
 const [left,right]=frame.mechanism.leaves.map(leaf=>new THREE.Box3().setFromObject(leaf));
 assert.ok(left.max.x<0&&right.min.x>0);assert.ok(right.min.x-left.max.x>5.6);
 frame.tick(22,.1);assert.equal(frame.mechanism.openness,1);
 for(let i=0;i<10;i++)frame.tick(30,.1);assert.equal(frame.mechanism.openness,0);
 frame.dispose();
});
test('reduced motion opens immediately and existing country frames stay static',()=>{
 assert.equal(gateOpening(0,12,.01,{reducedMotion:true}),1);
 const frame=createPortalFrame('maroc','#bb5f65');assert.equal(frame.mechanism,null);frame.dispose();
});
