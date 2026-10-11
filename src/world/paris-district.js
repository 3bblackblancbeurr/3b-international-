import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {PARIS_DECOR,parisInteriorAt} from './paris-layout.js';
import {toLandscape} from './terrain.js';
import {LANDMARK_SITE} from './heritage.js';
import {frontierState} from './frontier.js';
import {districtHighDetailAllowed} from './district-quality.js';

// Each building loads once. Low detail arrives first; nearby buildings request
// their detailed model through a bounded queue. Ownership ends with the country.
export function createParisDistrict({region,field,root,resident,flora,occlusion,onError,loader:providedLoader,textureLoader:providedTextureLoader}){
 const group=new THREE.Group();root.add(group);group.name='Paris · Quartier des Verrières';
 if(region!=='france'||typeof document==='undefined'&&!providedLoader)return{group,ready:Promise.resolve(),interior:null,update(){},tick(){},setQuality(){},dispose(){group.removeFromParent();}};
  const loader=providedLoader||new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map(),assets=[],owned=[],textures=[],queue=[],released=new Set();
 let dead=false,running=0,lastZone=null,allowHigh=false;
 const eiffelGeometries=[];
 const v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const textureLoader=providedTextureLoader||new THREE.TextureLoader();
 function texture(channel){const t=textureLoader.load('/world/paris/textures/plastered_wall_02_'+channel+'.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(channel==='Diffuse')t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;}
 const maps=region==='france'?{map:texture('Diffuse'),normalMap:texture('nor_gl'),roughnessMap:texture('Rough')}:null;
 function release(asset){asset.scene.traverse(o=>{for(const resource of [o.geometry,...[o.material].flat()].filter(Boolean))if(!released.has(resource)){released.add(resource);resource.dispose();}});}
 function pump(){if(dead)return;while(running<2&&queue.length){const request=queue.shift(),{name,high,resolve,reject}=request;if(high&&!allowHigh){cache.delete(name);resolve(null);continue;}running++;loader.loadAsync('/world/paris/'+name+'.glb').then(a=>{if(dead){release(a);resolve(null);}else{assets.push(a);resolve(a);}},reject).finally(()=>{running--;pump();});}}
 function load(name,high=false){if(dead||high&&!allowHigh)return Promise.resolve(null);if(!cache.has(name))cache.set(name,new Promise((resolve,reject)=>{queue.push({name,high,resolve,reject});pump();}));return cache.get(name);}
 const entries=[];
 function attach(asset,entry,high){
  if(dead||!asset)return;
  const model=asset.scene.clone(true);
  model.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const m=o.material.clone();owned.push(m);o.material=m;occlusion?.apply(m);
   if(m.name==='Paris limestone'){Object.assign(m,maps);m.normalScale.set(.28,.28);m.color.set('#eee4ce');}
   if(entry.site.interior){m.clippingPlanes=[entry.plane];m.clipShadows=true;}
  });
  entry[high?'high':'low']=model;entry.lod.addLevel(model,high?0:entry.site.id==='eiffel'?220:82,.15);entry.lod.updateMatrixWorld();if(!allowHigh){if(entry.low)entry.low.visible=true;if(entry.high)entry.high.visible=false;}
 }
 function entry(site){const lod=new THREE.LOD();lod.autoUpdate=false;lod.position.set(site.x,field.height(site.x,site.z)+.09,site.z);lod.rotation.y=site.rotation;group.add(lod);const e={site,lod,requested:false,plane:new THREE.Plane(new THREE.Vector3(0,-1,0),10000)};entries.push(e);return e;}
  const sites=region==='france'?[...field.paris,...PARIS_DECOR.map(d=>({...d,...toLandscape(region,d.x,d.z),rotation:d.rotation+.24})),{id:'eiffel',model:'Eiffel',...toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z),rotation:.24}]:[];
  const ready=Promise.all(sites.map(site=>{const e=entry(site);return load(site.model+'-lod').then(a=>attach(a,e,false));})).catch(e=>{if(!dead)onError?.(e);});
 const improvements=[];
 for(const site of field.paris.filter(s=>s.interior)){
  const g=new THREE.Group();g.position.set(site.x,.1,site.z);g.rotation.y=site.rotation;group.add(g);
  const geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({color:'#d5b477',metalness:.5,roughness:.4});owned.push(mat);
  for(let rank=1;rank<=8;rank++){const flag=new THREE.Mesh(geo,mat);flag.position.set(-8+(rank-1)*2.25,4,site.depth/2+.35);flag.scale.set(.75,.8,.12);g.add(flag);improvements.push({flag,rank,kind:site.id==='refuge'?'camp':'forge',geometry:geo});}
 }
 if(region==='france'){
  // The useful interiors receive their own residents; walkers elsewhere follow streets.
  for(const site of field.paris.filter(s=>s.interior))resident(site.x-5,site.z+1,'#577b78',group,site.id==='atelier'?'artisan':'woman');
  for(const [x,z] of [[-4,-1],[0,-18],[20,-17],[32,-31],[22,8],[6,17],[-25,10],[-27,24],[36,31]]){
   const p=toLandscape(region,x,z);flora.plant('Tree',p.x,field.height(p.x,p.z),p.z,1.15,(x+z)*.31,group);
   for(let i=0;i<5;i++)flora.plant('Shrub',p.x+Math.cos(i*1.25)*2,field.height(p.x,p.z),p.z+Math.sin(i*1.25)*2,.85,i,group);
  }
 }
 return{group,ready,get interior(){return lastZone;},update(save){const home=frontierState(save,'france');for(const p of improvements)p.flag.visible=home[p.kind]>=p.rank;},setQuality(mode,capabilities={}){if(dead)return;allowHigh=districtHighDetailAllowed(mode,capabilities);if(!allowHigh){for(let i=queue.length-1;i>=0;i--)if(queue[i].high){const request=queue.splice(i,1)[0];cache.delete(request.name);request.resolve(null);}for(const e of entries){if(e.low)e.low.visible=true;if(e.high)e.high.visible=false;}}},tick(camera,position){
  if(dead)return;
  lastZone=parisInteriorAt(position,field.paris||[]);
  for(const e of entries){const d=Math.hypot(position.x-e.site.x,position.z-e.site.z);e.lod.visible=d<230;
   e.plane.constant=lastZone?.id===e.site.id?field.height(e.site.x,e.site.z)+5.05:10000;
    if(allowHigh&&(d<88||e.site.id==='eiffel')&&!e.requested){
      e.requested=true;
      {load(e.site.model,true).then(a=>{if(a)attach(a,e,true);else e.requested=false;}).catch(error=>{if(!dead)onError?.(error);});}
    }
   if(allowHigh)e.lod.update(camera);else{if(e.low)e.low.visible=true;if(e.high)e.high.visible=false;}
  }
  },dispose(){if(dead)return;dead=true;group.removeFromParent();for(const request of queue.splice(0)){cache.delete(request.name);request.resolve(null);}new Set(improvements.map(i=>i.geometry)).forEach(g=>g.dispose());assets.forEach(release);owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());eiffelGeometries.forEach(g=>g.dispose());}};
}
