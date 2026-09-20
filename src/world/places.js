import * as THREE from 'three';
import {toLandscape} from './terrain.js';
import {chapterState} from './chapters.js';
import {currentSceneryOcclusion} from './occlusion.js';

// The authored Blender courtyards have open entrances; collisions follow pillars,
// not a solid bounding box across the playable courtyard.
export function livingPlaceCollisions(region){
 const local=[];
 if(region==='maroc'){
  for(const side of [-1,1])for(const j of [-1,0,1])for(const edge of [-1,1]){local.push({x:j*4.7+edge*2.055,z:side*7.4,r:.24});local.push({x:side*7.4,z:j*4.7+edge*2.055,r:.24});}
  for(const side of [-1,1])for(const j of [-1,1])local.push({x:side*8.4,z:j*5.6,r:1.9});
  local.push({x:0,z:0,r:1.65},{x:-8,z:-8,r:1.8});
  for(const x of [-4,4])for(const z of [-4,4])local.push({x,z,r:.9});
 }
 const center=toLandscape(region,-18,17),a=-(region==='maroc'?.72:0),c=Math.cos(a),s=Math.sin(a);
 return local.map(p=>({x:center.x+p.x*c+p.z*s,z:center.z-p.x*s+p.z*c,r:p.r}));
}

export function addLivingPlaces(models,region,root,height,flora){
 const groups=[],materials=[],living=[],gardens=[],occlusion=currentSceneryOcclusion();let disposed=false,active=region==='hub';
 const relevant=region==='hub'||region==='maroc',container=relevant?new THREE.Group():null;
 if(container){container.name='Authored living places';root.add(container);groups.push(container);}
 function place(asset,name,x,z,rotation=0){const source=asset?.scene?.getObjectByName(name);if(!source||disposed)return null;const p=toLandscape(region,x,z),g=source.clone(true);g.position.set(p.x,height(p.x,p.z)+.09,p.z);g.rotation.y=rotation;g.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const list=[o.material].flat();o.material=list.map(m=>{const n=m.clone();materials.push(n);occlusion?.apply(n);if(/Living_leaves|Living leaves|Spring_water|Spring water/.test(n.name))living.push({material:n,color:n.color.clone()});return n;});if(o.material.length===1)o.material=o.material[0];});container.add(g);return g;}
 function replant(group,type){
  if(!group||!flora)return;const old=[];group.traverse(o=>{if(o.isMesh&&/Living[_ ]leaves/.test(o.material?.name||''))old.push(o);});old.forEach(o=>o.removeFromParent());
  const plants=new THREE.Group();group.add(plants);
  if(type==='Terraces'){
   for(let row=0;row<3;row++)for(let x=-7;x<=7;x++)for(const z of [-.8,0,.8])flora.plant('Shrub',x,row*.45+.04,-row*3.5-z,.36,x*.9+row,plants);
   gardens.push(plants);
  }else for(const x of [-4,4])for(const z of [-4,4])flora.plant('Shrub',x,1.65,z,1.2,x+z,plants);
 }
 function applyState(){for(const g of gardens)g.visible=active;for(const entry of living){entry.material.color.copy(entry.color);if(!active)entry.material.color.lerp(new THREE.Color('#b19c74'),.85);}}
 function build(asset){
  if(disposed||!relevant)return;
  if(region==='maroc'){
   const made=[place(asset,'Riad',-18,17,-.72),place(asset,'Aqueduct',49,19,-.72),place(asset,'Terraces',46,40,-.72),place(asset,'Terraces',48,8,-.72)];
   for(const g of made)if(g&&(g.name==='Riad'||g.name==='Terraces'))replant(g,g.name);
  }else place(asset,'UnionWorkshop',-18,17);
  applyState();
 }
 let ready=Promise.resolve();
 if(relevant){
  if(typeof models.getPlaces==='function')ready=models.getPlaces().then(build).catch(()=>{});
  else build(models.places);
 }
 return{groups,ready,update(save){active=region==='hub'||chapterState(save,region).restored>=2;applyState();},dispose(){disposed=true;materials.forEach(m=>m.dispose());container?.removeFromParent();}};
}
