import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCreaturePresence} from '../src/world/creature-presence.js';
const rig=()=>{const model=new T.Group(),chest=new T.Bone(),head=new T.Bone(),foot=new T.Bone();chest.name='spine_03';head.name='Head';foot.name='foot_l';foot.position.set(.15,.04,0);model.position.set(5,2,9);model.add(chest,foot);chest.add(head);return {model,chest,head,foot};};

test('quiet creature layers remain bounded and leave imported locomotion roots and feet untouched',()=>{
 for(const card of ['C166','C171']){const {model,chest,head,foot}=rig(),position=model.position.clone(),footPosition=foot.position.clone(),presence=createCreaturePresence(model,{card});const base=new T.Quaternion().setFromEuler(new T.Euler(.06,0,0));for(let i=0;i<1800;i++){presence.beforeMixer();head.quaternion.copy(base);presence.update(.016,i*.016,{viewer:{x:12,y:5,z:15}});assert.ok(chest.scale.x>.99&&chest.scale.x<1.01);assert.ok(head.quaternion.angleTo(base)<.35);}assert.deepEqual(model.position,position);assert.deepEqual(foot.position,footPosition);presence.beforeMixer();assert.ok(head.quaternion.equals(base));assert.deepEqual(chest.scale,new T.Vector3(1,1,1));presence.dispose();assert.equal(chest.children.length,1);}
});

test('reduced motion and action poses keep the imported rig pose intact',()=>{
 const {model,chest,head}=rig(),q=head.quaternion.clone(),presence=createCreaturePresence(model,{card:'C166',reducedMotion:true});presence.update(.1,5);assert.ok(head.quaternion.equals(q));assert.deepEqual(chest.scale,new T.Vector3(1,1,1));presence.dispose();const active=createCreaturePresence(model,{card:'C171'});active.update(.1,5,{active:true});assert.ok(head.quaternion.equals(q));assert.deepEqual(chest.scale,new T.Vector3(1,1,1));active.dispose();assert.equal(createCreaturePresence(model,{card:'C010'}),null);
});

test('creature fittings release their own resources without disposing imported model resources',()=>{
 const {model,chest}=rig(),presence=createCreaturePresence(model,{card:'C166'}),resources=new Set(),calls=new Map();chest.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);}});for(const r of resources)r.addEventListener('dispose',()=>calls.set(r,(calls.get(r)||0)+1));assert.equal(chest.children[1].children.length,2);presence.dispose();presence.dispose();for(const r of resources)assert.equal(calls.get(r),1);
});
