import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createLivingLibrary,createLivingActor} from './living.js';

function fallbackAtlas(){
 const texture=new THREE.DataTexture(new Uint8Array([72,96,112,255]),1,1,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}
async function optionalTexture(url){try{return await new THREE.TextureLoader().loadAsync(url);}catch(error){console.warn('[3B world] texture optionnelle indisponible',url,error);return fallbackAtlas();}}
async function optionalScene(loader,url){try{return await loader.loadAsync(url);}catch(error){console.warn('[3B world] décor optionnel indisponible',url,error);return{scene:new THREE.Group(),animations:[]};}}
function disposeScene(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
function prepareStaticScene(root){root?.traverse(o=>{if(!o.isMesh)return;o.receiveShadow=true;const name=o.material?.name||'';o.castShadow=!/lawn|travertine|island strata|slate inlay/i.test(name);});}

export async function loadWorldModels(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),living=createLivingLibrary();
 // Only gameplay-critical assets block entry. The authored place pack is ~1 MB
 // and is requested lazily by Hub/Maroc after the world can already start.
 const [hero,kit,atlas]=await Promise.all([
  living.load('/world/living/traveller-0.glb'),
  loader.loadAsync('/world/models/chapter-kit.glb'),
  optionalTexture('/world/guardians-atlas.webp')
 ]);
 kit.living=living;prepareStaticScene(kit.scene);atlas.colorSpace=THREE.SRGBColorSpace;
 let dead=false,placesAsset=null,placesPromise=null;
 function getPlaces(){
  if(!placesPromise)placesPromise=optionalScene(loader,'/world/places/living-places.glb').then(asset=>{
   if(dead){disposeScene(asset.scene);return{scene:new THREE.Group(),animations:[]};}
   prepareStaticScene(asset.scene);placesAsset=asset;return asset;
  });
  return placesPromise;
 }
 return {hero,kit,atlas,living,getPlaces,dispose(){
  if(dead)return;dead=true;living.dispose();disposeScene(kit.scene);if(placesAsset)disposeScene(placesAsset.scene);else placesPromise?.then(asset=>disposeScene(asset.scene)).catch(()=>{});atlas.dispose();
 }};
}

export function createKais(asset){
 const object=clone(asset.scene);object.scale.setScalar(2.6);
 const personal=new Map();object.traverse(o=>{if(!o.isMesh)return;const copy=m=>{if(!personal.has(m))personal.set(m,m.clone());return personal.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});
 const mixer=new THREE.AnimationMixer(object),actions={};
 for(const clip of asset.animations){
  const name=['Idle','Walk','Run'].find(name=>clip.name.includes(name));
  if(name)actions[name]=mixer.clipAction(clip);
 }
 let current='Idle',heading=0;
 actions.Idle?.play();
 return {object,
  setColor(color){for(const m of personal.values()){if(/brushed champagne/.test(m.name))m.color.set(color);if(/graphite panels/.test(m.name))m.color.set(color).multiplyScalar(.28);}},
  update(dt,dx,dz,travelled){
   const speed=dt?travelled/dt:0,next=speed>.08?(speed>9?'Run':'Walk'):'Idle';
   if(next!==current){actions[next]?.reset().setEffectiveWeight(1).play();actions[current]?.crossFadeTo(actions[next],.18,false);current=next;}
   if(speed>.08){
    const wanted=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(wanted-heading),Math.cos(wanted-heading));
    heading+=delta*(1-Math.exp(-dt*18));object.rotation.y=heading;
    actions[current]?.setEffectiveTimeScale(speed/(current==='Run'?10.5:5.8));
   }
   mixer.update(dt);
  },
  reset(){heading=0;object.rotation.y=0;},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(object);personal.forEach(m=>m.dispose());object.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}
 };
}

export function createCreature(asset,region,color,scale=2){
 const source=asset.scene.getObjectByName('Creature_'+region);if(!source)throw Error('Gardien manquant : '+region);
 const high=clone(source),object=new THREE.LOD(),mixer=new THREE.AnimationMixer(high);high.scale.setScalar(scale);
 const clips=asset.animations.filter(c=>c.name.startsWith(region+'_')),actions={};for(const clip of clips)actions[clip.name.endsWith('Walk')?'Walk':'Idle']=mixer.clipAction(clip);
 let current='Idle';actions.Idle?.play();
 const geometry=new THREE.IcosahedronGeometry(1,0),material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25,roughness:.45}),low=new THREE.Mesh(geometry,material);low.position.y=2;low.scale.set(1.4,2,1.4);
 object.addLevel(high,0);object.addLevel(low,77,.12);object.autoUpdate=false;
 return{object,update(dt,camera,moving=false){object.update(camera);if(!high.visible)return;const next=moving?'Walk':'Idle';if(next!==current){actions[next]?.reset().play();actions[current]?.crossFadeTo(actions[next],.2,false);current=next;}mixer.update(dt*(moving?2:1));},dispose(){mixer.stopAllAction();mixer.uncacheRoot(high);high.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});geometry.dispose();material.dispose();}};
}

export function isCelianeResident(kind,color){return kind==='woman'&&String(color).toLowerCase()==='#7bbdff';}
function createCelianeResident(living){
 const actor=createLivingActor(living,{avatar:{body:'femme',style:'sentinelle',hair:4,color:2,fabricColor:'#17263d',accentColor:'#d7bd83',trouserColor:'#202b3b',bootColor:'#151922',outer:'none',bag:false,skin:2},scale:2.08});
 const geometry=new THREE.TorusGeometry(1.05,.028,6,40),material=new THREE.MeshBasicMaterial({color:'#e0c27b',transparent:true,opacity:.48,depthWrite:false}),aura=new THREE.Mesh(geometry,material);aura.name='Celiane · Justice aura';aura.rotation.x=Math.PI/2;aura.position.y=.045;actor.object.add(aura);let time=0;
 return{object:actor.object,get ready(){return actor.ready;},action:name=>actor.action(name),face:(dx,dz,dt)=>actor.face(dx,dz,dt),update(dt,dx=0,dz=0,travelled=0){actor.update(dt,dx,dz,travelled);time+=dt;aura.rotation.z=time*.16;material.opacity=.36+Math.sin(time*1.7)*.1;},reset(){actor.reset();time=0;},setColor:color=>actor.setColor(color),dispose(){actor.dispose();geometry.dispose();material.dispose();}};
}
export function createResident(asset,kind,color){
 if(asset.living){
  if(isCelianeResident(kind,color))return createCelianeResident(asset.living);
  return createLivingActor(asset.living,{avatar:{body:kind==='woman'?'femme':'homme',style:kind==='elder'?'mystique':kind==='artisan'?'sentinelle':'voyageur',hair:kind==='woman'?4:kind==='elder'?6:3,color:2,fabricColor:color,outer:kind==='artisan'?'apron':'none',bag:kind==='traveler',skin:2},scale:2});
 }
 const source=asset.scene.getObjectByName('Resident_'+kind);if(!source)throw Error('Habitant manquant : '+kind);const object=source.clone(true),owned=[];object.scale.setScalar(2.4);
 object.traverse(o=>{if(o.isMesh&&o.material.name==='Resident cloth'){o.material=o.material.clone();o.material.color.set(color).multiplyScalar(.65);owned.push(o.material);}});
 let elapsed=0;return{object,update(dt){elapsed+=dt;object.position.y=Math.sin(elapsed*1.5)*.018;},dispose(){owned.forEach(m=>m.dispose());}};
}
