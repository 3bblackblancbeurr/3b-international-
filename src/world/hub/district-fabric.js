import * as THREE from 'three';
import {CITE_ISLANDS,citeSurfaceDistance} from './platform-topology.js';
import {HUB_SCALE,platformRuntimeItems} from './platform-layout.js';
import {terraceAisle} from './terraces.js';
import {obstacleDistance} from '../collision.js';
import {landscapeItems} from '../terrain.js';
import {hubRuntime,HUB_PLAN} from './runtime-data.js';
import {hubPublicPlaces} from './platform-life.js';
import {blankSave} from '../rules.js';
import {HUB_MISSION_ACTION_PLANS} from './mission-actions.js';

const PROFILES=Object.freeze({
 archives:{height:12,style:'lantern'},arena:{height:7,style:'terrace'},
 commerce:{height:16,style:'spire'},community:{height:10,style:'terrace'},
 innovation:{height:22,style:'lantern'},docks:{height:7,style:'shed'},
 builders:{height:15,style:'spire'},gardens:{height:6,style:'pergola'},
});
let permanentReservations;
function interactionReservations(){
 if(permanentReservations)return permanentReservations;
 const save=blankSave(),points=new Map();
 const stages=Math.max(...Object.values(HUB_MISSION_ACTION_PLANS).map(p=>p.length));
 for(let step=0;step<stages;step++){
  for(const [id,plan] of Object.entries(HUB_MISSION_ACTION_PLANS))if(save.hub.missions[id])Object.assign(save.hub.missions[id],{status:'active',completedObjectives:Math.min(step,plan.length-1)});
  const runtime=hubRuntime('desktop',{hubState:save.hub,now:new Date('2026-10-02T12:00:00Z'),weather:'heavy_rain'});
  for(const item of [...platformRuntimeItems(landscapeItems('hub',save),runtime.items,HUB_PLAN),...hubPublicPlaces()])points.set(item.id,item);
 }
 for(const p of [{id:'refuge-creature',x:-52,z:105},{id:'arena-creature',x:66,z:-57}])points.set(p.id,{...p,x:p.x*HUB_SCALE,z:p.z*HUB_SCALE,range:5});
 permanentReservations=[...points.values()].filter(i=>!['hubDistrict','hubBuilding'].includes(i.type)&&Number.isFinite(i.x)&&Number.isFinite(i.z)).map(i=>({x:i.x/HUB_SCALE,z:i.z/HUB_SCALE,r:Math.min(6,Math.max(3,(i.range||3)/HUB_SCALE))}));
 return permanentReservations;
}

/** Secondary city fabric, outside transport corridors and interaction clearances. */
export function addDistrictFabric({root,owned,buildings,collisions,cameraSolids,materials,box}){
 const sites=[],layers=new Map(),octagon=new THREE.CylinderGeometry(1,1,1,8),cone=new THREE.ConeGeometry(1,1,8);owned.push(octagon,cone);
 function layer(geometry,material,name,x,y,z,sx,sy,sz,yaw=0){
  const key=geometry.uuid+material.uuid;if(!layers.has(key))layers.set(key,{geometry,material,name,transforms:[]});
  layers.get(key).transforms.push({x,y,z,sx,sy,sz,yaw});
 }
 const reserved=interactionReservations();
 for(const island of CITE_ISLANDS.filter(i=>PROFILES[i.id])){
  const profile=PROFILES[island.id],candidates=[];
  for(let ix=-3;ix<=3;ix++)for(let iz=-3;iz<=3;iz++){
   const x=island.x+ix*9,z=island.z+iz*9,r=3.6;
   if(Math.hypot(x-island.x,z-island.z)>island.r-7)continue;
   let lane=Math.abs(Math.hypot(x,z)-125);for(let axis=0;axis<8;axis++)lane=Math.min(lane,Math.abs(-Math.sin(axis*Math.PI/4)*x+Math.cos(axis*Math.PI/4)*z));
   if(lane<11||citeSurfaceDistance(x,z)>-6||terraceAisle(x,z,6))continue;
   if(buildings.some(b=>Math.abs(x-b.buildingX)<b.width/2+7&&Math.abs(z-b.buildingZ)<b.depth/2+12))continue;
   if(reserved.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+r+2))continue;
   if(collisions.some(o=>!o.surfaceDistance&&obstacleDistance({x,z},o)<r+2))continue;
   candidates.push({x,z,r,ix,iz});
  }
  candidates.sort((a,b)=>Math.hypot(b.x-island.x,b.z-island.z)-Math.hypot(a.x-island.x,a.z-island.z));
  let count=0;
  for(const p of candidates){
   if(count>=7||sites.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<9))continue;
   const h=profile.height*(.72+((Math.abs(p.ix*7+p.iz*3)%5)/10)),w=5,d=5,yaw=0;
   sites.push({...p,height:h,district:island.id});count++;
   layer(box,materials.stone,'Socles et façades',p.x,.3,p.z,6,.6,6);
   const round=profile.style==='lantern',shape=round?octagon:box;
   layer(shape,materials.dark,'Bâtiments des quartiers',p.x,h/2+.6,p.z,round?w/2:w,h,round?d/2:d,yaw);
   layer(shape,materials.gold,'Corniches',p.x,h+.75,p.z,round?2.8:5.6,.25,round?2.8:5.6,yaw);
   if(profile.style==='spire'){
    layer(box,materials.glass,'Attiques',p.x,h+2.2,p.z,3.5,3,3.5,yaw);
    layer(cone,materials.gold,'Flèches',p.x,h+5.2,p.z,2,3.2,2,yaw);
   }else if(round){
    layer(octagon,materials.glass,'Lanternes',p.x,h+2.3,p.z,2,3.2,2);
    layer(cone,materials.gold,'Couvertures des lanternes',p.x,h+4.4,p.z,2.4,1.2,2.4);
   }else if(profile.style==='shed'){
    layer(box,materials.gold,'Toitures des docks',p.x,h+1,p.z,6,.25,6);
   }else{
    for(const side of [-1,1])layer(box,materials.green,'Jardins suspendus',p.x+side*1.8,h+1.2,p.z,.7,.8,4);
    for(const dx of [-1.7,1.7])for(const dz of [-1.7,1.7])layer(box,materials.gold,'Pavillons de toiture',p.x+dx,h+2,p.z+dz,.12,2.4,.12);
    layer(box,materials.dark,'Ombrières',p.x,h+3.3,p.z,4.4,.15,4.4);
   }
   // Side balconies, with recessed blue glazing and thin gold rails.
   for(let floor=3;floor<h;floor+=3.5){
    layer(box,materials.glass,'Baies et loggias',p.x,floor,p.z+2.55,3.5,1.5,.12);
    layer(box,materials.gold,'Balcons',p.x,floor-.8,p.z+2.9,4,.12,.7);
   }
   collisions.push({id:`fabric-${island.id}-${count}`,x:p.x,z:p.z,width:6,depth:6});
   cameraSolids.push({x:p.x,z:p.z,width:6,depth:6,bottom:0,top:h+6});
  }
 }
 const group=new THREE.Group();group.name='3B · tissu urbain des quartiers';root.add(group);const dummy=new THREE.Object3D();
 for(const l of layers.values()){
  const mesh=new THREE.InstancedMesh(l.geometry,l.material,l.transforms.length);mesh.name=l.name;mesh.castShadow=mesh.receiveShadow=true;
  for(const [i,p] of l.transforms.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);owned.push(mesh);
 }
 return{sites,count:sites.length,setQuality(mode){group.children.forEach(m=>m.castShadow=mode!=='fluid');}};
}
