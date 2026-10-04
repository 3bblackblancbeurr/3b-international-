import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {fitWeapon} from '../src/world/weapon-model.js';
test('scissor blades separate visually and return to their original mount',()=>{
 const model=new T.Group(),hand=new T.Group();hand.name='hand_r';model.add(hand);
 const weapon=fitWeapon(model,{weapon:'scissors'}),root=model.getObjectByName('3B-equipped-scissors');
 const blades=root.children.filter(o=>o.userData.weaponPart==='blade');assert.equal(blades.length,2);
 const original=blades.map(b=>b.position.clone());
 for(let i=0;i<30;i++)weapon.update(i/30,{detached:3});
 assert.ok(blades[0].position.distanceTo(original[0])>.5);
 for(let i=30;i<90;i++)weapon.update(i/30,{});
 assert.ok(blades[0].position.distanceTo(original[0])<.001);
 weapon.dispose();assert.equal(hand.children.length,0);
});

 test('forged blade bevels face outward and keep the original equipment reach',async()=>{
  const {craftedBladeGeometry}=await import('../src/world/weapon-blade.js'),g=craftedBladeGeometry(.7);try{
   const p=g.attributes.position,n=g.attributes.normal;assert.ok(Math.abs(g.boundingBox.max.y-g.boundingBox.min.y-.7)<1e-6);
   for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(n.getX(i))&&Number.isFinite(n.getY(i))&&Number.isFinite(n.getZ(i)));assert.ok(p.getX(i)*n.getX(i)+p.getZ(i)*n.getZ(i)>-1e-6,'visible bevel normals point outward');}
  }finally{g.dispose();}
 });
