import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {districtHighDetailAllowed} from './district-quality.js';

// Three house sizes, per-material instance batches and two levels of detail.
// A district grows without growing its draw count with every individual house.
export function createRegionalDistrict({region,field,root,fallback,occlusion,onError,loader:providedLoader,textureLoader:providedTextureLoader}){
 const group=new THREE.Group();group.name='Regional architecture';root.add(group);
 if(region==='france'||region==='hub'||typeof document==='undefined'&&!providedLoader)return{group,ready:Promise.resolve(),tick(){},setQuality(){},dispose(){group.removeFromParent();}};
 const loader=providedLoader||new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),textureLoader=providedTextureLoader||new THREE.TextureLoader(),owned=[],textures=[],batches=[],assets=[],requests=new Map(),highLevels=new Set(),released=new Set(),entries=field.buildings.map(p=>({...p,level:Math.min(3,p.floors)})),levels=[1,2,3].filter(level=>entries.some(e=>e.level===level));
 let dead=false,lastX=Infinity,lastZ=Infinity,lastPosition=null,allowHigh=false,highLoad=null;const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
 const maps={};for(const [key,channel] of [['map','Diffuse'],['normalMap','nor_gl'],['roughnessMap','Rough']]){const t=textureLoader.load('/world/paris/textures/plastered_wall_02_'+channel+'.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(key==='map')t.colorSpace=THREE.SRGBColorSpace;maps[key]=t;textures.push(t);}
 function release(asset){asset.scene.traverse(o=>{for(const resource of [o.geometry,...[o.material].flat()].filter(Boolean))if(!released.has(resource)){released.add(resource);resource.dispose();}});}
 function load(level,high){
  const key=level+':'+high;if(requests.has(key))return requests.get(key);
  if(dead||high&&!allowHigh)return Promise.resolve(null);
  const promise=loader.loadAsync(`/world/districts/${region}-${level}${high?'':'-lod'}.glb`).then(asset=>{
  if(dead){release(asset);return null;}assets.push(asset);
  asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(!o.isMesh)return;const material=o.material.clone();owned.push(material);if(/Masonry|Dressed stone/.test(material.name)){Object.assign(material,maps);material.normalScale.set(.2,.2);}occlusion?.apply(material);
   const mesh=new THREE.InstancedMesh(o.geometry,material,Math.max(1,entries.length));mesh.castShadow=mesh.receiveShadow=true;mesh.count=0;group.add(mesh);batches.push({mesh,level,high,local:o.matrixWorld.clone()});
  });if(high)highLevels.add(level);lastX=Infinity;return asset;
  }).catch(error=>{if(!dead)onError?.(error);return null;});requests.set(key,promise);return promise;
 }
 // Low buildings complete the initial view. High models are fetched only while
 // the selected quality and device permit them, including after a mode change.
 const ready=(async()=>{let complete=true;for(const level of levels){if(dead)return;complete=!!(await load(level,false))&&complete;}if(!dead&&complete)fallback.visible=false;})();
 function prepareHigh(){
  if(dead||!allowHigh||highLoad)return;
  highLoad=(async()=>{await ready;for(const level of levels){if(dead||!allowHigh)return;await load(level,true);}})().finally(()=>{highLoad=null;if(!dead&&allowHigh&&levels.some(level=>!requests.has(level+':true')))prepareHigh();});
 }
 function updateBatches(position){
  lastPosition={x:position.x,z:position.z};lastX=position.x;lastZ=position.z;
  for(const b of batches){let count=0;for(const e of entries){const d=Math.hypot(e.x-position.x,e.z-position.z),useHigh=allowHigh&&highLevels.has(e.level)&&d<66;if(e.level!==b.level||d>245||useHigh!==b.high)continue;
    dummy.position.set(e.x,field.height(e.x,e.z),e.z);dummy.rotation.set(0,e.rotation,0);dummy.scale.set(e.width/12,1,e.depth/10);dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,b.local);b.mesh.setMatrixAt(count++,matrix);
   }b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;if(count)b.mesh.computeBoundingSphere();}
 }
 return{group,ready,get diagnostics(){return{models:assets.length,instances:batches.reduce((n,b)=>n+b.mesh.count,0),highInstances:batches.filter(b=>b.high).reduce((n,b)=>n+b.mesh.count,0),highDetailAllowed:allowHigh,fallback:fallback.visible};},tick(camera,position){if(dead||Math.hypot(position.x-lastX,position.z-lastZ)<3)return;updateBatches(position);},setQuality(mode,capabilities={}){if(dead)return;const next=districtHighDetailAllowed(mode,capabilities);if(next===allowHigh)return;allowHigh=next;lastX=Infinity;if(lastPosition)updateBatches(lastPosition);if(allowHigh)prepareHigh();},dispose(){if(dead)return;dead=true;group.removeFromParent();batches.forEach(b=>b.mesh.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());assets.forEach(release);}};
}
