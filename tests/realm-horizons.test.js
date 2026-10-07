import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {COUNTRIES} from '../src/world/catalog.js';
import {HORIZON_PROFILES,createRealmHorizons} from '../src/world/realm-horizons.js';
import {worldRadiusFor} from '../src/world/terrain.js';

test('all eight country panoramas are different but cost only one instanced draw call each',()=>{
 assert.equal(Object.keys(HORIZON_PROFILES).length,8);
 assert.equal(new Set(Object.values(HORIZON_PROFILES).map(x=>x.name)).size,8);
 for(const {id} of COUNTRIES){
  const pano=createRealmHorizons(id,()=>0),profile=HORIZON_PROFILES[id];
  assert.equal(pano.count,profile.count);
  assert.equal(pano.root.children.length,1);
  const mesh=pano.root.children[0];
  assert.equal(mesh.isInstancedMesh,true);
  assert.equal(mesh.count,profile.count);
  assert.equal(mesh.instanceMatrix.needsUpdate,undefined); // Three.js uses internal versioning, not a readable boolean.
  const matrix=mesh.instanceMatrix.array;
  assert.equal(matrix.length,profile.count*16);
  const bound=new Box3().setFromObject(pano.root);
  assert.ok(bound.max.y>5,id+' has visible silhouette relief');
  assert.ok(Number.isFinite(bound.min.x)&&Number.isFinite(bound.max.z));
  const radius=worldRadiusFor(id);
  assert.ok(profile.range[0]>radius,'distant scenery cannot occupy central authored missions');
  assert.ok(profile.range[1]<500,'distant scenery remains on the existing 1km terrain plane');
  pano.dispose();
  pano.dispose();
 }
});

test('hub has no extraneous horizon geometry and country horizon is deterministic',()=>{
 assert.equal(createRealmHorizons('hub').count,0);
 const a=createRealmHorizons('estonie'),b=createRealmHorizons('estonie');
 const ma=a.root.children[0],mb=b.root.children[0];
 assert.deepEqual(Array.from(ma.instanceMatrix.array),Array.from(mb.instanceMatrix.array));
 assert.deepEqual(Array.from(ma.instanceColor.array),Array.from(mb.instanceColor.array));
 a.dispose();b.dispose();
});
