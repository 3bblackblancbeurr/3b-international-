import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,PlaneGeometry,BufferGeometry,Float32BufferAttribute,Matrix4} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mergeIndexedGeometries} from '../src/world/geometry-batch.js';
import {bakeGeometry} from '../src/world/landscape.js';

test('compact batches preserve every rendered triangle, UV seam, normal and material group without mutating sources',()=>{
 const box=new BoxGeometry(3,7,4,2,2,2),plane=new PlaneGeometry(10,12,3,3).toNonIndexed();plane.rotateX(-Math.PI/2);plane.translate(8,2,-4);
 const sourceIndex=box.index,sourcePosition=box.attributes.position,expanded=[box.toNonIndexed(),plane.clone()],before=mergeGeometries(expanded,true),after=mergeIndexedGeometries([box,plane],true),rendered=after.toNonIndexed();
 try{
  assert.equal(box.index,sourceIndex);assert.equal(box.attributes.position,sourcePosition);assert.equal(plane.index,null);
  assert.deepEqual(after.groups,before.groups);
  for(const key of Object.keys(before.attributes))assert.deepEqual(rendered.attributes[key].array,before.attributes[key].array,key+' exact triangle data');
  const bytes=g=>Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength||0);
  assert.ok(bytes(after)<bytes(before)*.8,'Indexed source vertices remain shared through batching');
 }finally{[box,plane,...expanded,before,after,rendered].forEach(g=>g.dispose());}
});

test('large unindexed sources retain their complete final triangles with a wide identity index',()=>{
 const source=new BufferGeometry(),points=new Float32Array(70002*3);for(let i=0;i<points.length;i++)points[i]=i*.01;
 source.setAttribute('position',new Float32BufferAttribute(points,3));const merged=mergeIndexedGeometries([source]);
 try{assert.equal(source.index,null);assert.equal(merged.index.count,70002);assert.equal(merged.index.getX(70001),70001);assert.deepEqual(merged.attributes.position.array,points);}
 finally{source.dispose();merged.dispose();}
});

test('country model baking preserves compact indices and exact world-space vertices',()=>{
 const source=new BoxGeometry(2,3,4),transform=new Matrix4().makeTranslation(31,7,-28),expanded=source.toNonIndexed().applyMatrix4(transform),baked=bakeGeometry(source,transform),rendered=baked.toNonIndexed();
 try{assert.deepEqual(baked.index.array,source.index.array);assert.equal(baked.attributes.position.count,source.attributes.position.count);for(const key of Object.keys(expanded.attributes))assert.deepEqual(rendered.attributes[key].array,expanded.attributes[key].array);}
 finally{[source,expanded,baked,rendered].forEach(g=>g.dispose());}
});
