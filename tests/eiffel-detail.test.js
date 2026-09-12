import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {createEiffelTower} from '../src/world/eiffel-tower.js';

test('Eiffel detail preserves the same navigable footprint and three material batches as mobile geometry',()=>{
 const counts=[];
 for(const detail of [false,true]){
  const tower=createEiffelTower({height:60,detail}),size=new Box3().setFromObject(tower).getSize(new Vector3());
  assert.equal(tower.children.length,3);assert.ok(Math.abs(size.y-60)<.1);assert.ok(size.x<23&&size.z<23);
  let count=0;for(const mesh of tower.children){count+=mesh.geometry.index.count/3;assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));mesh.geometry.dispose();mesh.material.dispose();}counts.push(count);
 }
 assert.ok(counts[0]<20000);assert.ok(counts[1]>counts[0]*2&&counts[1]<80000);
});
