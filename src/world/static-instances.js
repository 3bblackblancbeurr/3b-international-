import * as THREE from 'three';

// Keep the existing item/LOD visibility owners. Only the rendering is instanced.
// Meshes on layer 31 remain in their hierarchy for bounds and visibility, while
// the camera sees compact shared batches on layer 0. No geometry/material clones.
export function createStaticInstances(root,entries,{exclude=[]}={}){
 const skipped=new Set();for(const object of exclude)object?.traverse(o=>skipped.add(o));
 const sourceSet=new Set(),groups=new Map(),batchRoot=new THREE.Group();batchRoot.name='3B · architecture instanciée';
 root.updateMatrixWorld(true);
 for(const objects of entries.values())for(const object of objects)object.traverse(source=>{
  if(!source.isMesh||source.isSkinnedMesh||source.isInstancedMesh||Array.isArray(source.material)||source.material.transparent||skipped.has(source)||sourceSet.has(source))return;
  sourceSet.add(source);const key=[source.geometry.uuid,source.material.uuid,source.castShadow,source.receiveShadow].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(source);
 });
 const batches=[],inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4(),frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere();
 for(const sources of groups.values()){
  if(sources.length<3)continue;
  const first=sources[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,sources.length);
  mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;
  batchRoot.add(mesh);const masks=sources.map(s=>s.layers.mask);sources.forEach(s=>s.layers.set(31));batches.push({sources,masks,mesh});
 }
 root.add(batchRoot);let dead=false;
 const visible=source=>{for(let o=source;o&&o!==root;o=o.parent)if(!o.visible)return false;return true;};
 function update(camera=null){
  if(dead)return;if(camera){camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);}root.updateMatrixWorld(true);inverse.copy(batchRoot.matrixWorld).invert();
  for(const {sources,mesh} of batches){let count=0;
   for(const source of sources){if(!visible(source))continue;if(camera){if(!source.geometry.boundingSphere)source.geometry.computeBoundingSphere();sphere.copy(source.geometry.boundingSphere).applyMatrix4(source.matrixWorld);sphere.radius+=10;if(!frustum.intersectsSphere(sphere))continue;}matrix.multiplyMatrices(inverse,source.matrixWorld);mesh.setMatrixAt(count++,matrix);}
   mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(count)mesh.computeBoundingSphere();
  }
 }
 update();
 return {update,get diagnostics(){return{batches:batches.length,sourceMeshes:batches.reduce((n,b)=>n+b.sources.length,0),visibleInstances:batches.reduce((n,b)=>n+b.mesh.count,0)};},
  dispose(){if(dead)return;dead=true;for(const {sources,masks,mesh} of batches){sources.forEach((s,i)=>s.layers.mask=masks[i]);mesh.dispose();}batchRoot.removeFromParent();}};
}
