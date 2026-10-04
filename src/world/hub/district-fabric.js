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
 // Explicit window geometry keeps floors and reveals aligned on every facade.
 const body=new THREE.MeshPhysicalMaterial({color:'#101d2b',roughness:.48,metalness:.58,clearcoat:.2,envMapIntensity:.22});
 const glazing=new THREE.MeshPhysicalMaterial({color:'#173c52',roughness:.2,metalness:.18,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.35});
 const day={value:1};
 glazing.onBeforeCompile=shader=>{
  shader.uniforms.fabricDay=day;
  shader.vertexShader='varying float fabricLit;varying vec2 fabricUv;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   fabricUv=uv;vec3 centre=vec3(0.);
   #ifdef USE_INSTANCING
   centre=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
   #endif
   fabricLit=step(.66,fract(sin(dot(centre,vec3(127.1,311.7,74.7)))*43758.5453));`);
  shader.fragmentShader='varying float fabricLit;varying vec2 fabricUv;uniform float fabricDay;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   vec2 edge=min(fabricUv,1.-fabricUv);float reveal=smoothstep(.025,.12,min(edge.x,edge.y));
   float interior=smoothstep(.14,.32,fabricUv.y);
   float furnishing=1.-step(.56,fabricUv.x)*step(fabricUv.y,.38)*.75;
   float curtain=.72+.28*smoothstep(.18,.28,abs(fabricUv.x-.5));
   totalEmissiveRadiance+=vec3(.72,.43,.19)*fabricLit*pow(1.-fabricDay,1.5)*.20*reveal*interior*furnishing*curtain;`);
 };
 glazing.customProgramCacheKey=()=> '3b-fabric-glazing-v1';owned.push(body,glazing);
 const fineNames=new Set(['Baies vitrées','Encadrements de baies','Linteaux de baies','Tableaux de baies','Meneaux verticaux','Garde-corps de balcon','Montants de balcon','Poignées des portes','Chapiteaux de socle','Descentes et nervures','Frises civiques','Reliefs civiques']);
 function layer(geometry,material,name,x,y,z,sx,sy,sz,yaw=0){
  const fine=fineNames.has(name),key=geometry.uuid+material.uuid+(fine?'detail':'structure');if(!layers.has(key))layers.set(key,{geometry,material,name,fine,transforms:[]});
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
   const h=profile.height*(.72+((Math.abs(p.ix*7+p.iz*3)%5)/10)),w=5,d=5,yaw=profile.style==='lantern'?Math.PI/8:0;
   sites.push({...p,height:h,district:island.id});count++;
   layer(box,materials.stone,'Socles et façades',p.x,.3,p.z,6,.6,6);
   const round=profile.style==='lantern',shape=round?octagon:box;
   // Stepped silhouettes: each district has its own upper-storey proportions.
   // All tiers remain within the original solid six-metre footprint.
   const stepped=h>=10&&profile.style!=='shed'&&profile.style!=='pergola';
   // Setback ledges fall between window rows, rather than cutting through glazing.
   const first=stepped?(Math.round((h*.55-1.25)/3.5)*3.5+1.25-.6)/h:1;
   const second=stepped?Math.min((Math.round((h*.82-1.25)/3.5)*3.5+1.25-.6)/h,1):1;
   const setbacks=stepped?[[0,first,1],[first,second,.84],[second,1,.68]].filter(([a,b])=>b>a+.001):[[0,1,1]];
   const facadeScale=y=>stepped?(y>=second*h+.6?.68:y>=first*h+.6?.84:1):1;
   for(const [bottom,top,scale] of setbacks){
    layer(shape,body,'Bâtiments des quartiers',p.x,(bottom+top)*h/2+.6,p.z,(round?w/2:w)*scale,(top-bottom)*h,(round?d/2:d)*scale,yaw);
    if(bottom>0){
     layer(shape,round?materials.gold:materials.stone,'Terrasses en retrait',p.x,bottom*h+.56,p.z,(round?w/2:w)*scale+.12,.14,(round?d/2:d)*scale+.12,yaw);
     layer(shape,materials.gold,'Bandeaux des retraits',p.x,bottom*h+.66,p.z,(round?w/2:w)*scale+.14,.07,(round?d/2:d)*scale+.14,yaw);
    }
   }
   layer(shape,materials.gold,'Corniches',p.x,h+.75,p.z,(round?2.8:5.6)*facadeScale(h+.6),.25,(round?2.8:5.6)*facadeScale(h+.6),yaw);
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
   // Four finished facades: paired glazing, mullions and recessed horizontal reveals.
   for(let floor=3;floor<h-.3;floor+=3.5){
    for(let face=0;face<4;face++){
     const angle=face*Math.PI/2,scale=facadeScale(floor),front=(round?2.31:2.51)*scale;
     for(const side of [-1,1]){
      const across=side*(round?.47:1.02)*scale,wx=p.x+Math.cos(angle)*across+Math.sin(angle)*front,wz=p.z-Math.sin(angle)*across+Math.cos(angle)*front;
      layer(box,glazing,'Baies vitrées',wx,floor,wz,(round?.72:1.5)*scale,1.65,.12,angle);
      layer(box,materials.gold,'Encadrements de baies',wx,floor-.9,wz,(round?.82:1.65)*scale,.10,.20,angle);
      layer(box,materials.gold,'Linteaux de baies',wx,floor+.9,wz,(round?.82:1.65)*scale,.07,.17,angle);
      for(const edge of [-1,1]){
       const offset=edge*(round?.4:.81)*scale;
       layer(box,materials.gold,'Tableaux de baies',wx+Math.cos(angle)*offset,floor,wz-Math.sin(angle)*offset,.045,1.85,.16,angle);
      }
     }
     const bx=p.x+Math.sin(angle)*front,bz=p.z+Math.cos(angle)*front;
     layer(box,materials.gold,'Meneaux verticaux',bx,floor,bz,.075,1.8,.18,angle);
     // Balconies remain inside the existing protected six-metre footprint.
     if(!round&&profile.style!=='shed'){
      layer(box,materials.stone,'Dalles de balcon',bx+Math.sin(angle)*.22,floor-1,bz+Math.cos(angle)*.22,4.25*scale,.14,.52,angle);
      layer(box,materials.gold,'Garde-corps de balcon',bx+Math.sin(angle)*.45,floor-.35,bz+Math.cos(angle)*.45,4.2*scale,.065,.06,angle);
      for(const side of [-1,0,1])layer(box,materials.gold,'Montants de balcon',bx+Math.cos(angle)*side*1.9*scale+Math.sin(angle)*.45,floor-.65,bz-Math.sin(angle)*side*1.9*scale+Math.cos(angle)*.45,.055,.65,.055,angle);
     }
    }
   }
   // Stone entrance surrounds and lintels sit on the existing building facade.
   for(const side of [-1,1])layer(box,materials.stone,'Portails de rez-de-chaussée',p.x+side*.85,1.45,p.z+(round?2.32:2.55),.16,2.7,.2);
   layer(box,materials.gold,'Linteaux des entrées',p.x,2.85,p.z+(round?2.33:2.56),1.9,.13,.24);
   layer(box,glazing,'Portes vitrées',p.x,1.4,p.z+(round?2.34:2.57),1.5,2.5,.1);
   // Detailed ground-level joinery and district-specific structural rhythms.
   for(const side of [-1,1]){
    layer(box,materials.gold,'Poignées des portes',p.x+side*.18,1.45,p.z+(round?2.43:2.66),.035,.34,.04);
    for(const edge of [-1,1]){
     const xx=p.x+side*(round?1.45:2.36),zz=p.z+edge*(round?1.45:2.36);
     layer(box,materials.stone,'Pilastres de socle',xx,1.55,zz,.19,2.5,.19);
     layer(box,materials.gold,'Chapiteaux de socle',xx,2.82,zz,.32,.12,.32);
    }
   }
   for(let face=0;face<4;face++){
    const a=face*Math.PI/2;
    for(const side of [-1,1]){
     const across=side*(round?1.25:2.25),front=round?1.92:2.57;
     const xx=p.x+Math.cos(a)*across+Math.sin(a)*front,zz=p.z-Math.sin(a)*across+Math.cos(a)*front;
     // Bronze rain pipes and vertical fins frame the lower street frontage.
     layer(box,materials.gold,'Descentes et nervures',xx,h*.27+.6,zz,.065,h*.54,.07,a);
    }
    if(island.id==='builders'||island.id==='commerce')for(let j=0;j<3;j++){
     const yy=3+j*2.4,xx=p.x+Math.sin(a)*2.6,zz=p.z+Math.cos(a)*2.6;
     layer(box,materials.gold,'Frises civiques',xx,yy,zz,4.6,.08,.09,a);
     for(const side of [-1,1])layer(box,materials.gold,'Reliefs civiques',xx+Math.cos(a)*side*1.8,yy+.23,zz-Math.sin(a)*side*1.8,.25,.38,.12,a);
    }
    if(island.id==='community'||island.id==='gardens'){
     const xx=p.x+Math.sin(a)*2.7,zz=p.z+Math.cos(a)*2.7;
     layer(box,materials.stone,'Jardinières de façade',xx,3.25,zz,3.8,.28,.36,a);
     layer(box,materials.green,'Végétation des jardinières',xx,3.47,zz,3.6,.22,.3,a);
    }
   }
   collisions.push({id:`fabric-${island.id}-${count}`,x:p.x,z:p.z,width:6,depth:6});
   cameraSolids.push({x:p.x,z:p.z,width:6,depth:6,bottom:0,top:h+6});
  }
 }
 const group=new THREE.Group();group.name='3B · tissu urbain des quartiers';root.add(group);const dummy=new THREE.Object3D(),detailBatches=[];
 for(const l of layers.values()){
  const mesh=new THREE.InstancedMesh(l.geometry,l.material,l.transforms.length);mesh.name=l.name;mesh.castShadow=mesh.receiveShadow=true;
  for(const [i,p] of l.transforms.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);owned.push(mesh);if(l.fine){mesh.userData.distanceDetail=true;detailBatches.push({mesh,poses:l.transforms});}
 }
 let quality='detail',lastView=null;const viewPoint=new THREE.Vector3();
 function updateView(camera){
  camera.getWorldPosition(viewPoint);group.worldToLocal(viewPoint);
  if(lastView&&lastView.distanceToSquared(viewPoint)<9)return;
  lastView=viewPoint.clone();const radius=quality==='fluid'?100:180,radius2=radius*radius;
  for(const {mesh,poses} of detailBatches){
   let count=0;
   for(const p of poses){
    if((p.x-viewPoint.x)**2+(p.y-viewPoint.y)**2+(p.z-viewPoint.z)**2>radius2)continue;
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(count++,dummy.matrix);
   }
   mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
   // The original full bounding sphere remains conservative after compaction.
  }
 }
 return{sites,count:sites.length,updateView,setDaylight(value){day.value=value;},setQuality(mode){quality=mode;lastView=null;group.children.forEach(m=>m.castShadow=mode!=='fluid');}};
}
