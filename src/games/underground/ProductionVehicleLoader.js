import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {PLATFORM_ENVELOPE} from './vehiclePlatform.js';

const loader=new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const draco=new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
loader.setDRACOLoader(draco);

const assetCache=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function cloneScene(root){
  const clone=root.clone(true);
  clone.traverse(o=>{
    if(!o.isMesh)return;
    o.geometry=o.geometry?.clone?.()||o.geometry;
    if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];const copied=mats.map(m=>m.clone());o.material=Array.isArray(o.material)?copied:copied[0];}
    o.castShadow=true;o.receiveShadow=true;
  });
  return clone;
}

function normalizeScene(root,envelope=PLATFORM_ENVELOPE){
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3();box.getSize(size);
  const targetLength=envelope.lengthM||4.35;
  const longest=Math.max(size.x,size.z,.001);
  const scale=clamp(targetLength/longest,.08,20);
  root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);
  const normalizedBox=new THREE.Box3().setFromObject(root),center=new THREE.Vector3();normalizedBox.getCenter(center);
  root.position.x-=center.x;root.position.z-=center.z;root.position.y-=normalizedBox.min.y;
  root.updateMatrixWorld(true);
  return {box:new THREE.Box3().setFromObject(root),scale};
}

function discoverWheels(root){
  const wheels=[];root.traverse(o=>{if(!o.isObject3D)return;const n=(o.name||'').toLowerCase();if(/wheel|rim|tire|tyre|roue/.test(n))wheels.push(o);});
  return wheels;
}

function tagProductionModel(root,vehicle,meta){
  root.name=`U3B_Final_${vehicle?.id||'vehicle'}`;
  root.userData.productionVehicle=true;
  root.userData.vehicleId=vehicle?.id||null;
  root.userData.modelAsset=vehicle?.modelAsset||null;
  root.userData.productionMeta=meta;
  root.userData.wheelNodes=discoverWheels(root);
  root.userData.disposeProductionAsset=()=>root.traverse(o=>{o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap'])m[key]?.dispose?.();m.dispose?.();});}});
  return root;
}

async function fetchTemplate(url){
  if(assetCache.has(url))return assetCache.get(url);
  const promise=loader.loadAsync(url).then(gltf=>({scene:gltf.scene,animations:gltf.animations||[],asset:gltf.asset||{}})).catch(error=>{assetCache.delete(url);throw error;});
  assetCache.set(url,promise);return promise;
}

export function hasProductionVehicleAsset(vehicle){return typeof vehicle?.modelAsset==='string'&&(/\.glb(?:$|\?)/i.test(vehicle.modelAsset)||/^https?:\/\//i.test(vehicle.modelAsset));}

export async function loadProductionVehicle(vehicle,{envelope=PLATFORM_ENVELOPE}={}){
  if(!hasProductionVehicleAsset(vehicle))return null;
  const template=await fetchTemplate(vehicle.modelAsset),root=cloneScene(template.scene),fit=normalizeScene(root,envelope);
  const meta={source:vehicle.modelAsset,fitScale:fit.scale,animations:template.animations.length,generatedAt:Date.now()};
  return tagProductionModel(root,vehicle,meta);
}

export function updateProductionVehicleRuntime(root,{speedKph=0,time=0,steer=0}={}){
  if(!root?.userData?.productionVehicle)return;
  const wheelNodes=root.userData.wheelNodes||[],spin=time*Math.max(.4,speedKph*.12);
  for(const node of wheelNodes){const n=(node.name||'').toLowerCase();if(/front|fl|fr|avant/.test(n))node.rotation.y=steer*.32;if(/wheel|tire|tyre|roue/.test(n))node.rotation.x=spin;}
}

export function clearProductionVehicleCache(){assetCache.clear();}
