import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction,advanceBattle} from '../src/world/engine.js';
import {normalizeOrbit,DEFAULT_ORBIT} from '../src/world/orbit.js';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AnimationMixer} from 'three';
test('guard has two recoveries per encounter, persists their consumption and cannot stall indefinitely',()=>{
 let s=applyWorldAction(blankSave(),{type:'visit',region:'france'});s=applyWorldAction(s,{type:'patrol'});let e=advanceBattle(s.adventure.encounter,'strike');
 for(let i=0;i<80&&!e.result;i++){e=advanceBattle(e,'guard');e=normalizeSave({...s,adventure:{...s.adventure,encounter:e}}).adventure.encounter;}
 assert.equal(e.recoveries,0);assert.equal(e.result,'defeat');assert.ok(e.turn<80);
 const old={...s.adventure.encounter};delete old.recoveries;assert.equal(normalizeSave({...s,adventure:{...s.adventure,encounter:old}}).adventure.encounter.recoveries,2);
});
test('solo exploration persists without removing companions or weakening the group',()=>{
 const before=blankSave(),solo=applyWorldAction(before,{type:'companion',id:null});assert.equal(normalizeSave(solo).adventure.companionHidden,true);assert.deepEqual(solo.team,before.team);assert.deepEqual(solo.collection,before.collection);
 const recalled=applyWorldAction(solo,{type:'companion',id:before.leader});assert.equal(recalled.adventure.companionHidden,false);assert.equal(recalled.adventure.companion,before.leader);
});
test('camera preferences tolerate missing and malformed local storage without invalid geometry',()=>{
 assert.deepEqual(normalizeOrbit(null),DEFAULT_ORBIT);assert.deepEqual(normalizeOrbit({yaw:NaN,pitch:Infinity,distance:'24'}),DEFAULT_ORBIT);
 const wide={yaw:1.2,pitch:.8,distance:36};assert.deepEqual(normalizeOrbit(wide),wide);assert.equal(normalizeOrbit({distance:1000}).distance,52);assert.equal(normalizeOrbit({pitch:-5}).pitch,.16);
});
test('the authored rooster loads compressed geometry and all seven clips animate its articulated parts',async()=>{
 const bytes=fs.readFileSync(new URL('../public/world/card-models/C165-v2.glb',import.meta.url)),asset=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assert.ok(bytes.length<180000);assert.ok(asset.scene.getObjectByName('CoqSupreme'));assert.ok(asset.scene.getObjectByName('Tail_fan')||asset.scene.getObjectByName('Tail fan'));
 const mixer=new AnimationMixer(asset.scene),parts=[];asset.scene.traverse(o=>parts.push(o));
 for(const name of ['Idle','Walk','Run','Attack','Hit','Death','Cast']){const clip=asset.animations.find(c=>c.name===name);assert.ok(clip,name);mixer.stopAllAction();mixer.clipAction(clip).reset().play();mixer.update(0);const before=parts.map(o=>o.quaternion.toArray());mixer.update(.22);assert.ok(parts.some((o,i)=>o.quaternion.toArray().some((v,j)=>Math.abs(v-before[i][j])>.001)),name+' visibly moves');assert.ok(parts.every(o=>o.quaternion.toArray().every(Number.isFinite)));}
 mixer.stopAllAction();mixer.uncacheRoot(asset.scene);
});
