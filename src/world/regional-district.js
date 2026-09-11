import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Three house sizes, per-material instance batches and two levels of detail.
// A district grows without growing its draw count with every individual house.
export function createRegionalDistrict({region,field,root,fallback,occlusion,onError}){
 const group=new THREE.Group();group.name='Regional architecture';root.add(group);
 if(region==='france'||region==='hub'||typeof document==='undefined')return{group,ready:Promise.resolve(),tick(){},dispose(){group.removeFromParent();}};
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),owned=[],textures=[],batches=[],assets=[],entries=field.buildings.map(p=>({...p,level:Math.min(3,p.floors)}));
 let dead=false,lastX=Infinity,lastZ=Infinity,highReady=false;const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
 const maps={};for(const [key,channel] of [['map','Diffuse'],['normalMap','nor_gl'],['roughnessMap','Rough']]){const t=new THREE.TextureLoader().load('/world/paris/textures/plastered_wall_02_'+channel+'.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(key==='map')t.colorSpace=THREE.SRGBColorSpace;maps[key]=t;textures.push(t);}
 async function load(level,high){
  const asset=await loader.loadAsync(`/world/districts/${region}-${level}${high?'':'-lod'}.glb`);assets.push(asset);if(dead)return;
  asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(!o.isMesh)return;const material=o.material.clone();owned.push(material);if(/Masonry|Dressed stone/.test(material.name)){Object.assign(material,maps);material.normalScale.set(.2,.2);}occlusion?.apply(material);
   const mesh=new THREE.InstancedMesh(o.geometry,material,Math.max(1,entries.length));mesh.castShadow=mesh.receiveShadow=true;mesh.count=0;group.add(mesh);batches.push({mesh,level,high,local:o.matrixWorld.clone()});
  });lastX=Infinity;
 }
 // Bound initial downloads; keep the existing geometry visible until complete.
 const ready=(async()=>{for(const level of [1,2,3])if(entries.some(e=>e.level===level))await load(level,false);if(!dead)fallback.visible=false;for(const level of [1,2,3])if(entries.some(e=>e.level===level))await load(level,true);highReady=true;lastX=Infinity;})().catch(error=>{if(!dead)onError?.(error);});
 return{group,ready,get diagnostics(){return{models:assets.length,instances:batches.reduce((n,b)=>n+b.mesh.count,0),fallback:fallback.visible};},tick(camera,position){
  if(Math.hypot(position.x-lastX,position.z-lastZ)<3)return;lastX=position.x;lastZ=position.z;
  for(const b of batches){let count=0;for(const e of entries){const d=Math.hypot(e.x-position.x,e.z-position.z);if(e.level!==b.level||d>245||highReady&&(d<66)!==b.high||!highReady&&b.high)continue;
    dummy.position.set(e.x,field.height(e.x,e.z),e.z);dummy.rotation.set(0,e.rotation,0);dummy.scale.set(e.width/12,1,e.depth/10);dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,b.local);b.mesh.setMatrixAt(count++,matrix);
   }b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;if(count)b.mesh.computeBoundingSphere();}
 },dispose(){dead=true;group.removeFromParent();batches.forEach(b=>b.mesh.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());ready.finally(()=>{const geometries=new Set(),materials=new Set();for(const a of assets)a.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());});}};
}
