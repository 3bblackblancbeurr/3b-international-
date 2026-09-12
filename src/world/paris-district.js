import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {PARIS_DECOR,parisInteriorAt} from './paris-layout.js';
import {toLandscape} from './terrain.js';
import {LANDMARK_SITE} from './heritage.js';
import {frontierState} from './frontier.js';

// Each building loads once. Low detail arrives first; nearby buildings request
// their detailed model through a bounded queue. Ownership ends with the country.
export function createParisDistrict({region,field,root,resident,flora,occlusion,onError}){
 const group=new THREE.Group();root.add(group);group.name='Paris · Quartier des Verrières';
 if(region!=='france'||typeof document==='undefined')return{group,ready:Promise.resolve(),interior:null,update(){},tick(){},dispose(){group.removeFromParent();}};
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map(),assets=[],owned=[],textures=[],queue=[];
 let dead=false,running=0,lastZone=null;
 const eiffelGeometries=[];
 const v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const textureLoader=new THREE.TextureLoader();
 function texture(channel){const t=textureLoader.load('/world/paris/textures/plastered_wall_02_'+channel+'.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(channel==='Diffuse')t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;}
 const maps=region==='france'?{map:texture('Diffuse'),normalMap:texture('nor_gl'),roughnessMap:texture('Rough')}:null;
 function pump(){while(running<2&&queue.length){running++;const {url,resolve,reject}=queue.shift();loader.loadAsync(url).then(a=>{assets.push(a);resolve(a);},reject).finally(()=>{running--;pump();});}}
 function load(name){if(!cache.has(name))cache.set(name,new Promise((resolve,reject)=>{queue.push({url:'/world/paris/'+name+'.glb',resolve,reject});pump();}));return cache.get(name);}
 const entries=[];
 function attach(asset,entry,high){
  if(dead)return;
  const model=asset.scene.clone(true);
  model.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const m=o.material.clone();owned.push(m);o.material=m;occlusion?.apply(m);
   if(m.name==='Paris limestone'){Object.assign(m,maps);m.normalScale.set(.28,.28);m.color.set('#eee4ce');}
   if(entry.site.interior){m.clippingPlanes=[entry.plane];m.clipShadows=true;}
  });
  entry.lod.addLevel(model,high?0:entry.site.id==='eiffel'?220:82,.15);entry.lod.updateMatrixWorld();
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
 return{group,ready,get interior(){return lastZone;},update(save){const home=frontierState(save,'france');for(const p of improvements)p.flag.visible=home[p.kind]>=p.rank;},tick(camera,position){
  lastZone=parisInteriorAt(position,field.paris||[]);
  for(const e of entries){const d=Math.hypot(position.x-e.site.x,position.z-e.site.z);e.lod.visible=d<230;
   e.plane.constant=lastZone?.id===e.site.id?field.height(e.site.x,e.site.z)+5.05:10000;
    if((d<88||e.site.id==='eiffel')&&!e.requested){
      e.requested=true;
      {load(e.site.model).then(a=>attach(a,e,true)).catch(error=>{if(!dead)onError?.(error);});}
    }
   e.lod.update(camera);
  }
  },dispose(){dead=true;group.removeFromParent();new Set(improvements.map(i=>i.geometry)).forEach(g=>g.dispose());const geometries=new Set(),materials=new Set();Promise.allSettled([...cache.values()]).then(()=>{for(const a of assets)a.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());});owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());eiffelGeometries.forEach(g=>g.dispose());}};
}
