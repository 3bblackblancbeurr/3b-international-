import * as THREE from 'three';
import {facadeArchGeometry,mansardRoofGeometry,northlightRoofGeometry} from './facade-craft.js';
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
 archives:{height:12,style:'lantern',tint:'#829294'},arena:{height:7,style:'terrace',tint:'#80674e'},
 commerce:{height:16,style:'spire',tint:'#304e61'},community:{height:10,style:'terrace',tint:'#858e80'},
 innovation:{height:22,style:'lantern',tint:'#284d60'},docks:{height:7,style:'shed',tint:'#8e9993'},
 builders:{height:15,style:'spire',tint:'#667985'},gardens:{height:6,style:'pergola',tint:'#898e73'},
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
 const sites=[],layers=new Map(),octagon=new THREE.CylinderGeometry(1,1,1,8),cone=new THREE.ConeGeometry(1,1,8),arch=facadeArchGeometry(),mansard=mansardRoofGeometry(),northlight=northlightRoofGeometry();owned.push(octagon,cone,arch,mansard,northlight);
 // Explicit window geometry keeps floors and reveals aligned on every facade.
 const body=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.68,metalness:.12,clearcoat:.08,envMapIntensity:.14});
 body.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 masonryP;varying vec3 masonryN;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   masonryP=position;masonryN=normal;
   #ifdef USE_INSTANCING
   masonryP=(instanceMatrix*vec4(position,1.)).xyz;
   masonryN=normalize(mat3(instanceMatrix)*normal);
   #endif`);
  shader.fragmentShader='varying vec3 masonryP;varying vec3 masonryN;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float across=mix(masonryP.x,masonryP.z,step(.5,abs(masonryN.x)));
   float course=floor(masonryP.y/.52);vec2 joint=abs(fract(vec2(across/1.16+mod(course,2.)*.5,masonryP.y/.52))-.5);
   float seam=smoothstep(.464,.495,max(joint.x,joint.y));
   float stone=fract(sin(dot(floor(vec2(across/1.16,course)),vec2(41.7,289.1)))*43758.5);
   diffuseColor.rgb*=mix(.93+stone*.11,.69,seam*.62);`);
 };body.customProgramCacheKey=()=> '3b-district-masonry-v1';
 const glazing=new THREE.MeshPhysicalMaterial({color:'#244b60',emissive:'#112a34',emissiveIntensity:.07,roughness:.24,metalness:.14,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:.36});
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
   totalEmissiveRadiance+=vec3(.79,.49,.29)*fabricLit*pow(1.-fabricDay,1.25)*.33*reveal*interior*furnishing*curtain;`);
 };
 glazing.customProgramCacheKey=()=> '3b-fabric-glazing-v2-night';owned.push(body,glazing);
 const fineNames=new Set(['Baies vitrées','Encadrements de baies','Linteaux de baies','Tableaux de baies','Meneaux verticaux','Garde-corps de balcon','Montants de balcon','Poignées des portes','Chapiteaux de socle','Descentes et nervures','Frises civiques','Reliefs civiques','Lucarnes de toiture','Frontons des lucarnes','Clés des arcades']);
 function layer(geometry,material,name,x,y,z,sx,sy,sz,yaw=0,color){
  const fine=fineNames.has(name),key=geometry.uuid+material.uuid+(fine?'detail':'structure');if(!layers.has(key))layers.set(key,{geometry,material,name,fine,transforms:[]});
  layers.get(key).transforms.push({x,y,z,sx,sy,sz,yaw,color});
 }
 const reserved=interactionReservations();
 for(const island of CITE_ISLANDS.filter(i=>PROFILES[i.id])){
  const profile=PROFILES[island.id],candidates=[];
  for(let ix=-3;ix<=3;ix++)for(let iz=-3;iz<=3;iz++){
   const seed=[...String(island.id)].reduce((n,char)=>(Math.imul(n,31)+char.charCodeAt(0))>>>0,17)*.00001;const x=island.x+ix*9+Math.sin(seed+ix*19.37+iz*7.13)*1.95,z=island.z+iz*9+Math.cos(seed*.37+ix*11.17-iz*17.33)*1.95,r=3.6;
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
   if(count>=12||sites.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<9))continue;
   const h=profile.height*(.72+((Math.abs(p.ix*7+p.iz*3)%5)/10)),w=5,d=5,yaw=profile.style==='lantern'?Math.PI/8:0;
   sites.push({...p,height:h,district:island.id,style:profile.style,yaw,width:6,depth:6});count++;
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
    layer(shape,body,'Bâtiments des quartiers',p.x,(bottom+top)*h/2+.6,p.z,(round?w/2:w)*scale,(top-bottom)*h,(round?d/2:d)*scale,yaw,profile.tint);
    if(bottom>0){
     layer(shape,round?materials.gold:materials.stone,'Terrasses en retrait',p.x,bottom*h+.56,p.z,(round?w/2:w)*scale+.12,.14,(round?d/2:d)*scale+.12,yaw);
     layer(shape,materials.gold,'Bandeaux des retraits',p.x,bottom*h+.66,p.z,(round?w/2:w)*scale+.14,.07,(round?d/2:d)*scale+.14,yaw);
    }
   }
   layer(shape,materials.gold,'Corniches',p.x,h+.75,p.z,(round?2.8:5.6)*facadeScale(h+.6),.25,(round?2.8:5.6)*facadeScale(h+.6),yaw);
   const roofScale=facadeScale(h+.6);
   if(profile.style==='spire'){
    if(island.id==='commerce'){
     // Mansard stone roof, glazed dormers and a high lantern distinguish the bazaar skyline.
     layer(mansard,body,'Mansardes du commerce',p.x,h+.87,p.z,5.8*roofScale,2.2,5.8*roofScale,0,'#354a55');
     for(let face=0;face<4;face++){
      const angle=face*Math.PI/2,front=2.71*roofScale,xx=p.x+Math.sin(angle)*front,zz=p.z+Math.cos(angle)*front;
      layer(box,body,'Joues des lucarnes',xx-Math.sin(angle)*.2,h+1.64,zz-Math.cos(angle)*.2,1.25*roofScale,1.05,.62,angle,'#354a55');
      layer(box,glazing,'Lucarnes de toiture',xx+Math.sin(angle)*.13,h+1.72,zz+Math.cos(angle)*.13,1.04*roofScale,.77,.08,angle);
      layer(box,materials.gold,'Frontons des lucarnes',xx,h+2.22,zz,1.37*roofScale,.10,.77,angle);
     }
     layer(octagon,glazing,'Belvédères du commerce',p.x,h+3.0,p.z,.86,1.15,.86,Math.PI/8);
     layer(cone,materials.gold,'Flèches du commerce',p.x,h+4.17,p.z,1.14,1.4,1.14);
    }else{
     // City builders: open framed upper pavilion instead of a duplicate bazaar spire.
     layer(box,glazing,'Pavillons des bâtisseurs',p.x,h+1.95,p.z,2.7,2.25,2.7);
     for(const dx of [-1,1])for(const dz of [-1,1])layer(box,materials.gold,'Contreforts des pavillons',p.x+dx*1.5,h+2.05,p.z+dz*1.5,.2,2.8,.2);
     layer(mansard,body,'Couvertures des bâtisseurs',p.x,h+3.32,p.z,3.65,1.5,3.65,0,'#536572');
     layer(box,materials.gold,'Couronnes des bâtisseurs',p.x,h+4.86,p.z,2.4,.17,2.4);
     layer(box,materials.gold,'Aiguilles des bâtisseurs',p.x,h+5.74,p.z,.095,1.76,.095);
    }
   }else if(round){
    const radius=island.id==='innovation'?1.66:1.88;
    layer(octagon,glazing,'Lanternes',p.x,h+2.12,p.z,radius,2.72,radius,Math.PI/8);
    for(let k=0;k<8;k++){
     const a=k*Math.PI/4,rr=radius*.93;
     layer(box,materials.gold,'Nervures des lanternes',p.x+Math.cos(a)*rr,h+2.12,p.z+Math.sin(a)*rr,.085,2.88,.085,a);
    }
    layer(octagon,materials.gold,'Ceintures des lanternes',p.x,h+3.58,p.z,radius+.10,.16,radius+.10,Math.PI/8);
    layer(cone,body,'Couvertures des lanternes',p.x,h+4.15,p.z,radius+.18,1.12,radius+.18,Math.PI/8,island.id==='innovation'?'#253e53':'#647581');
    if(island.id==='innovation'){
     // A segmented antenna crown reads as an observatory at medium distance.
     for(let k=0;k<4;k++){
      const a=k*Math.PI/2;
      layer(box,materials.gold,'Ailettes des observatoires',p.x+Math.cos(a)*.95,h+4.99,p.z+Math.sin(a)*.95,.09,1.72,.09,a);
     }
     layer(octagon,glazing,'Capsules des observatoires',p.x,h+4.96,p.z,.62,1.03,.62,Math.PI/8);
    }else layer(cone,materials.gold,'Épis des archives',p.x,h+5.01,p.z,.36,.72,.36);
   }else if(profile.style==='shed'){
    // Three sawtooth roof bays cast real alternating slopes, with north-facing glass.
    for(let k=0;k<3;k++){
     const xx=p.x-1.96+k*1.96;
     layer(northlight,body,'Toitures en sheds',xx,h+.91,p.z,1.96,.94,5.65,0,'#607884');
     layer(box,glazing,'Vitrages des sheds',xx+.99,h+1.45,p.z,.06,.8,5.30);
     layer(box,materials.gold,'Faîtages des sheds',xx+.99,h+1.87,p.z,.095,.08,5.8);
    }
    for(const side of [-1,1])layer(box,materials.gold,'Gouttières des docks',p.x+side*2.97,h+.86,p.z,.12,.14,5.9);
   }else{
    // Actual corner parapets, planted terraces and slatted pergolas replace a solid roof plate.
    for(const side of [-1,1]){
     layer(box,materials.stone,'Acrotères des terrasses',p.x+side*2.35*roofScale,h+1.03,p.z,.16,.55,4.65*roofScale);
     layer(box,materials.stone,'Jardinières des toits',p.x+side*1.73*roofScale,h+1.1,p.z,.8,.5,3.55*roofScale);
     layer(box,materials.green,'Jardins suspendus',p.x+side*1.73*roofScale,h+1.52,p.z,.72,.4,3.48*roofScale);
    }
    const pavilionH=island.id==='gardens'?1.96:2.32;
    for(const dx of [-1.55,1.55])for(const dz of [-1.55,1.55])layer(box,materials.gold,'Pavillons de toiture',p.x+dx*roofScale,h+.98+pavilionH/2,p.z+dz*roofScale,.13,pavilionH,.13);
    for(let k=0;k<7;k++)layer(box,materials.dark,'Lames des pergolas',p.x+(k-3)*.54*roofScale,h+1+pavilionH,p.z,.20,.15,4.0*roofScale);
    if(island.id==='arena')for(const side of [-1,1])layer(box,materials.gold,'Bannières des terrasses',p.x+side*1.3,h+2.04,p.z-1.58,.57,1.06,.065);
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
   if(['archives','commerce','community','gardens'].includes(island.id)){
    layer(arch,body,'Arcades des entrées',p.x,.08,p.z+(round?2.33:2.58),1,1,1,0,profile.tint);
    layer(box,materials.gold,'Clés des arcades',p.x,2.86,p.z+(round?2.48:2.73),.23,.29,.18);
   }
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
  for(const [i,p] of l.transforms.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(l.material===body)mesh.setColorAt(i,new THREE.Color(p.color||'#ffffff'));}
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
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);if(mesh.instanceColor)mesh.setColorAt(count,new THREE.Color(p.color||'#ffffff'));count++;
   }
   mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
   // The original full bounding sphere remains conservative after compaction.
  }
 }
 return{sites,mapSites:sites.map(({x,z,width,depth,height,district,style,yaw})=>({x,z,width,depth,height,district,style,yaw})),count:sites.length,updateView,setDaylight(value){day.value=value;},setQuality(mode){quality=mode;lastView=null;group.children.forEach(m=>m.castShadow=mode!=='fluid');}};
}
