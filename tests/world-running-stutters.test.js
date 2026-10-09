import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStaticInstances} from '../src/world/static-instances.js';
import {worldAmbientOcclusion} from '../src/world/postprocessing.js';
import {worldVisualCapabilities} from '../src/world/device-capabilities.js';

test('static visibility updates do not revisit unrelated scenery or upload unchanged matrices',()=>{
 const root=new THREE.Group(),parent=new THREE.Group(),unrelated=new THREE.Group();root.add(parent,unrelated);
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),sources=[];
 for(let i=0;i<5;i++){const m=new THREE.Mesh(geometry,material);m.position.set(i*2,0,-10);parent.add(m);sources.push(m);}
 const instances=createStaticInstances(root,new Map([['building',[parent]]]));
 const batch=root.getObjectByName('3B · architecture instanciée').children[0],version=batch.instanceMatrix.version;
 let visits=0;unrelated.updateMatrixWorld=()=>visits++;
 for(let i=0;i<60;i++)instances.update();
 assert.equal(visits,0,'a periodic LOD update must not force unrelated world/skeleton transforms');
 assert.equal(batch.instanceMatrix.version,version,'stable visibility reuses the GPU buffer');
 const authored=Float32Array.from(batch.instanceMatrix.array),bounds=batch.boundingSphere.clone();
 sources[0].visible=false;instances.update();assert.equal(batch.count,4);
 sources[0].visible=true;instances.update();assert.equal(batch.count,5);
 assert.deepEqual(batch.instanceMatrix.array,authored,'restoring visibility restores the exact authored transforms');
 assert.deepEqual(batch.boundingSphere,bounds,'cached full bounds cover every visible subset');
 instances.dispose();geometry.dispose();material.dispose();
});

test('cached static geometry follows transformed roots and culls/restores across camera turns',()=>{
 const root=new THREE.Group(),parent=new THREE.Group();parent.position.set(3,2,0);root.add(parent);
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),sources=[];
 for(let i=0;i<4;i++){const m=new THREE.Mesh(geometry,material);m.position.set(i,0,-30);parent.add(m);sources.push(m);}
 const instances=createStaticInstances(root,new Map([['building',[parent]]]));
 const camera=new THREE.PerspectiveCamera(60,1,.1,200),batch=root.getObjectByName('3B · architecture instanciée').children[0];
 camera.lookAt(3,2,-30);instances.update(camera);assert.equal(batch.count,4);
 camera.lookAt(0,0,30);instances.update(camera);assert.equal(batch.count,0);
 root.position.set(100,0,0);root.rotation.y=.3;root.scale.setScalar(1.5);root.updateMatrixWorld(true);
 const target=sources[0].getWorldPosition(new THREE.Vector3());camera.position.copy(target).add(new THREE.Vector3(0,0,25));camera.lookAt(target);instances.update(camera);assert.equal(batch.count,4);
 const matrix=new THREE.Matrix4();batch.getMatrixAt(0,matrix);batch.updateWorldMatrix(true,false);matrix.premultiply(batch.matrixWorld);
 assert.ok(new THREE.Vector3().setFromMatrixPosition(matrix).distanceTo(target)<1e-5);
 instances.dispose();geometry.dispose();material.dispose();
});

test('turning a phone sideways does not activate desktop ambient occlusion in automatic mode',()=>{
 for(const [width,height] of [[390,844],[844,390],[1366,1024]]){
  const phone=worldVisualCapabilities({mode:'auto',width,height,deviceMemory:8,coarsePointer:true});
  assert.equal(worldAmbientOcclusion('auto',width,1.75,phone),false);
  assert.equal(worldAmbientOcclusion('detail',width,1.75,phone),true,'explicit detailed mode remains available');
 }
 const desktop=worldVisualCapabilities({mode:'auto',width:1440,height:900,deviceMemory:8});
 assert.equal(worldAmbientOcclusion('auto',1440,1,desktop),true);
 assert.equal(worldAmbientOcclusion('auto',1440,.8,desktop),false);
 assert.equal(worldAmbientOcclusion('fluid',1440,1,desktop),false);
});
