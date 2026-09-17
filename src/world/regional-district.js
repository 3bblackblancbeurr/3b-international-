import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

export function regionalRenderBudget(memory=4,cores=4){
 const m=Number(memory)||4,c=Number(cores)||4;
 if(m<=3||c<=4)return{detail:52,visible:195,anisotropy:2,normalMap:false,castShadow:false};
 if(m>=8&&c>=8)return{detail:82,visible:285,anisotropy:6,normalMap:true,castShadow:true};
 return{detail:66,visible:245,anisotropy:4,normalMap:true,castShadow:true};
}

// Three house sizes, per-material instance batches and two levels of detail.
// Low geometry is the streaming baseline. Detailed GLBs are requested only when
// the player approaches buildings of that level, so entering one country never
// downloads every high-detail district model up front.
export function createRegionalDistrict({region,field,root,fallback,occlusion,onError}){
 const group=new THREE.Group();group.name='Regional architecture';root.add(group);
 if(region==='france'||region==='hub'||typeof document==='undefined')return{group,ready:Promise.resolve(),tick(){},dispose(){group.removeFromParent();}};
 const budget=regionalRenderBudget(navigator.deviceMemory,navigator.hardwareConcurrency);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),owned=[],textures=[],batches=[],assets=[],entries=field.buildings.map(p=>({...p,level:Math.min(3,p.floors)}));
 let dead=false,lastX=Infinity,lastZ=Infinity;const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D(),highLoaded=new Set(),highLoading=new Map();
 const maps={};
 for(const [key,channel] of [['map','Diffuse'],['roughnessMap','Rough'],...(budget.normalMap?[['normalMap','nor_gl']]:[])]){const t=new THREE.TextureLoader().load('/world/paris/textures/plastered_wall_02_'+channel+'.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=budget.anisotropy;if(key==='map')t.colorSpace=THREE.SRGBColorSpace;maps[key]=t;textures.push(t);}
 async function load(level,high){
  const asset=await loader.loadAsync(`/world/districts/${region}-${level}${high?'':'-lod'}.glb`);assets.push(asset);if(dead)return;
  asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(!o.isMesh)return;const material=o.material.clone();owned.push(material);if(/Masonry|Dressed stone/.test(material.name)){
   Object.assign(material,maps);if(budget.normalMap)material.normalScale.set(.2,.2);else{material.normalMap=null;material.normalScale.set(0,0);}material.needsUpdate=true;
  }occlusion?.apply(material);
   const mesh=new THREE.InstancedMesh(o.geometry,material,Math.max(1,entries.length));mesh.castShadow=budget.castShadow;mesh.receiveShadow=true;mesh.count=0;group.add(mesh);batches.push({mesh,level,high,local:o.matrixWorld.clone()});
  });lastX=Infinity;
 }
 function requestHigh(level){
  if(dead||highLoaded.has(level)||highLoading.has(level))return;
  const task=load(level,true).then(()=>{if(!dead)highLoaded.add(level);}).catch(error=>{if(!dead)onError?.(error);}).finally(()=>{highLoading.delete(level);lastX=Infinity;});
  highLoading.set(level,task);
 }
 // Bound the initial download to low-detail architecture only. The existing
 // procedural fallback remains visible until all required low models are ready.
 const ready=(async()=>{for(const level of [1,2,3])if(entries.some(e=>e.level===level))await load(level,false);if(!dead)fallback.visible=false;})().catch(error=>{if(!dead)onError?.(error);});
 return{group,ready,get diagnostics(){return{models:assets.length,instances:batches.reduce((n,b)=>n+b.mesh.count,0),fallback:fallback.visible,highDetail:[...highLoaded]};},tick(camera,position){
  for(const level of [1,2,3])if(!highLoaded.has(level)&&entries.some(e=>e.level===level&&Math.hypot(e.x-position.x,e.z-position.z)<budget.detail))requestHigh(level);
  if(Math.hypot(position.x-lastX,position.z-lastZ)<3)return;lastX=position.x;lastZ=position.z;
  for(const b of batches){let count=0;for(const e of entries){const d=Math.hypot(e.x-position.x,e.z-position.z),useHigh=highLoaded.has(e.level)&&d<budget.detail;if(e.level!==b.level||d>budget.visible||useHigh!==b.high)continue;
    dummy.position.set(e.x,field.height(e.x,e.z),e.z);dummy.rotation.set(0,e.rotation,0);dummy.scale.set(e.width/12,1,e.depth/10);dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,b.local);b.mesh.setMatrixAt(count++,matrix);
   }b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;if(count)b.mesh.computeBoundingSphere();}
 },dispose(){dead=true;group.removeFromParent();batches.forEach(b=>b.mesh.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());Promise.allSettled([ready,...highLoading.values()]).finally(()=>{const geometries=new Set(),materials=new Set();for(const a of assets)a.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());});}};
}
