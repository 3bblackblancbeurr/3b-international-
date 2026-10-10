import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {apparitionPose,createApparitionClock,APPARITION_DURATION} from '../src/world/invisible/apparition-sequence.js';
import {createApparitionArt} from '../src/world/invisible/apparition-art.js';
test('the apparition fades, gestures, moves within seven centimetres and disappears without moving its anchor',()=>{
 assert.equal(apparitionPose(0).opacity,0);assert.equal(apparitionPose(4.2).clip,'Interact');assert.equal(apparitionPose(7).clip,'Walk');
 for(let t=0;t<15;t+=.01){const p=apparitionPose(t);assert.ok(p.x>=0&&p.x<=.07);assert.ok(p.z>=0&&p.z<=.012);assert.ok(p.opacity>=0&&p.opacity<=.86);}
 assert.equal(apparitionPose(APPARITION_DURATION).done,true);assert.equal(apparitionPose(APPARITION_DURATION).opacity,0);
 for(const t of [0,7,12])assert.deepEqual(apparitionPose(t,{animated:false}),apparitionPose(0,{animated:false}));
});
test('tracking loss, loading and pause cannot advance the sequence; resume has no time jump',()=>{
 const c=createApparitionClock();c.advance(0);c.advance(.02);assert.equal(c.elapsed,.02);
 c.advance(80,{visible:false});c.advance(90,{ready:false});assert.equal(c.elapsed,.02);c.advance(90.02);assert.ok(Math.abs(c.elapsed-.04)<1e-8);
 c.setPaused(true);c.advance(91);c.advance(99);assert.ok(Math.abs(c.elapsed-.04)<1e-8);c.setPaused(false);c.advance(101);assert.ok(Math.abs(c.elapsed-.04)<1e-8);c.restart();assert.equal(c.elapsed,0);
});
function asset(){const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.12,.36,.04),new THREE.MeshStandardMaterial());mesh.name='Human';scene.add(mesh);const animations=['Idle','Walk','Interact'].map((name,i)=>new THREE.AnimationClip(name,1,[new THREE.NumberKeyframeTrack('Human.rotation[z]',[0,.5,1],[0,(i+1)*.08,0])]));return {scene,animations,mesh};}
test('animation transforms affect the model but never the spatial root, and replay resets the sequence',async()=>{
 const a=asset(),art=createApparitionArt({load:async()=>a});await art.promise;assert.equal(art.ready,true);
 const matrix=new THREE.Matrix4().makeTranslation(1,2,3);art.root.matrixAutoUpdate=false;art.root.matrix.copy(matrix);
 for(let i=0;i<=150;i++)art.update(i*.05);assert.notEqual(a.mesh.rotation.z,0);assert.deepEqual(art.root.matrix.toArray(),matrix.toArray());assert.ok(art.root.children[0].position.x>0);
 art.replay();art.update(100);assert.equal(art.root.children[0].position.x,0);assert.equal(a.scene.visible,false);art.dispose();
});
test('late model downloads are disposed after closing, and failed downloads report a recoverable error',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),a=asset();let disposed=0,ready=0;a.mesh.geometry.addEventListener('dispose',()=>disposed++);
 const art=createApparitionArt({load:()=>pending,onReady:()=>ready++});art.dispose();resolve(a);await art.promise;assert.equal(disposed,1);assert.equal(ready,0);
 let errors=0;const bad=createApparitionArt({load:async()=>{throw Error('offline');},onError:()=>errors++});await bad.promise;assert.equal(errors,1);assert.equal(bad.ready,false);bad.dispose();
});
