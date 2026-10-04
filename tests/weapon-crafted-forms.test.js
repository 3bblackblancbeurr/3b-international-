import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {fitWeapon} from '../src/world/weapon-model.js';
import {WEAPONS,weaponAction} from '../src/world/arsenal.js';
import {ACTIONS} from '../src/world/origins/combat.js';

const holder=()=>{const model=new T.Group(),hand=new T.Bone();hand.name='hand_r';hand.position.set(.3,1.1,-.1);model.add(hand);return {model,hand};};
const fingerprint=root=>{const hash=createHash('sha256');root.updateMatrixWorld(true);root.traverse(o=>{if(o.geometry){hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));hash.update(JSON.stringify(o.matrix.toArray()));}});return hash.digest('hex');};

test('all 64 equipped assemblies keep finite bevels and distinct physical form geometry',()=>{
 for(const w of WEAPONS){const signatures=new Set();for(let tier=0;tier<4;tier++){
  const {model,hand}=holder(),weapon=fitWeapon(model,{weapon:w.id,weaponForm:tier}),root=weapon.object;
  assert.equal(root.parent,hand,w.id+' attaches to the real hand');assert.equal(root.userData.weaponForm,tier);let meshes=0,triangles=0,steel=0;
  root.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;triangles+=(o.geometry.index?.count||p.count)/3;assert.ok(o.geometry.attributes.uv,w.id+' merge-compatible UVs');for(const v of p.array)assert.ok(Number.isFinite(v));for(const v of n.array)assert.ok(Number.isFinite(v));if(o.material.metalness>.85)steel+=p.count;});
  assert.ok(steel>0,w.id+' retains metal after geometry merge');assert.ok(meshes<=9,w.id+' fitting details are batched');assert.ok(triangles<6500,w.id+' bounded equipment detail');signatures.add(fingerprint(root));weapon.update(1,{});weapon.dispose();assert.equal(hand.children.length,0);
 }assert.equal(signatures.size,4,w.id+' all evolution cards correspond to distinct geometry');}
});

test('assembly disposal releases each owned GPU resource once and retains the character hand',()=>{
 const {model,hand}=holder(),weapon=fitWeapon(model,{weapon:'paris',weaponForm:3}),resources=new Set();weapon.object.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);}});const calls=new Map();for(const r of resources)r.addEventListener('dispose',()=>calls.set(r,(calls.get(r)||0)+1));weapon.dispose();weapon.dispose();for(const r of resources)assert.equal(calls.get(r),1);assert.equal(model.getObjectByName('hand_r'),hand);assert.equal(hand.children.length,0);
});

test('physical detail does not mutate immutable arsenal data or alter combat reach',()=>{
 for(const w of WEAPONS){const before=JSON.stringify(w),attack=weaponAction(ACTIONS.light,{weapon:w.id,weaponForm:3},1000),{model}=holder(),weapon=fitWeapon(model,{weapon:w.id,weaponForm:3});weapon.update(3,{detached:1});weapon.dispose();assert.equal(JSON.stringify(w),before);assert.deepEqual(weaponAction(ACTIONS.light,{weapon:w.id,weaponForm:3},1000),attack);}
});
