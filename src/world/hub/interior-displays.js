import * as THREE from 'three';
import {roomFurniturePlan} from './interior-furnishings.js';

/** Inhabited rooms: coherent wall joinery, counter exhibits and authored floor furniture.
 * All nineteen rooms batch their fittings globally; the service aisle stays clear. */
export function addInteriorDisplays({root,owned,box,buildings,materials,collisions=[]}){
 const layers=new Map(),dummy=new THREE.Object3D(),anchors=[],furnishings=[],roomPlans=[],batches=[];
 const timber=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.64,metalness:.02,envMapIntensity:.2});
 const cloth=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.98,metalness:0,envMapIntensity:.08});
 const paper=new THREE.MeshStandardMaterial({color:'#d9d1b6',roughness:.97,metalness:0,envMapIntensity:.12});
 const light=new THREE.MeshStandardMaterial({color:'#efdeb6',roughness:.6,emissive:'#e0bc78',emissiveIntensity:.8});
 const furnishingMaterials={wood:timber,cloth,paper,light,metal:materials.gold,ink:materials.dark,glass:materials.glass};
 owned.push(timber,cloth,paper,light);
 timber.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 joineryP;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   joineryP=position;
   #ifdef USE_INSTANCING
   joineryP=(instanceMatrix*vec4(position,1.)).xyz;
   #endif`);
  shader.fragmentShader='varying vec3 joineryP;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=sin(joineryP.z*52.+sin(joineryP.x*3.)*2.+sin(joineryP.z*7.)*.8);
   diffuseColor.rgb*=.94+.06*grain;`);
 };
 timber.customProgramCacheKey=()=> '3b-interior-walnut-v1';
 const plaster=new THREE.MeshStandardMaterial({color:'#8b8780',roughness:.94,metalness:0,emissive:'#827b6a',emissiveIntensity:.025});owned.push(plaster);
 function piece(material,x,y,z,sx,sy,sz,yaw=0,pitch=0,roll=0,color){
  if(!layers.has(material))layers.set(material,[]);layers.get(material).push({x,y,z,sx,sy,sz,yaw,pitch,roll,color});
 }
 for(const b of buildings){
  const plan=roomFurniturePlan(b);roomPlans.push(plan);anchors.push(...plan.anchors);furnishings.push(...plan.furnishings);
  for(const p of plan.pieces)piece(furnishingMaterials[p.material],p.x,p.y,p.z,p.sx,p.sy,p.sz,p.yaw,p.pitch,p.roll,p.color||(p.material==='wood'?'#665142':p.material==='cloth'?plan.program.accent:undefined));
  collisions.push(...plan.furnishings.map(f=>({...f})));
  const x=b.buildingX,z=b.buildingZ-b.depth/2+1,table=2.2,space=b.width*.19;
  // Interior coatings are inset into the existing three closed walls.
  piece(plaster,x,b.height/2+.2,b.buildingZ-b.depth/2+.32,b.width-.65,b.height-1.2,.035);
  for(const side of [-1,1])piece(plaster,x+side*(b.width/2-.32),b.height/2+.2,b.buildingZ,.035,b.height-1.2,b.depth-.65);
  // All joinery stays within the closed wall footprint: the middle aisle and
  // the existing counter/service approach remain clear.
  const rear=b.buildingZ-b.depth/2+.39,innerWidth=b.width-.9;
  for(const yy of [.25,1.75,b.height-.75]){
   piece(materials.gold,x,yy,rear,innerWidth,.045,.04);
   for(const side of [-1,1])piece(materials.gold,x+side*(b.width/2-.39),yy,b.buildingZ,.04,.045,b.depth-.9);
  }
  for(let i=0;i<=4;i++){
   const px=x-innerWidth/2+innerWidth*i/4;
   piece(plaster,px,b.height/2,rear+.025,.12,b.height-1.1,.08);
   piece(materials.gold,px,b.height/2,rear+.075,.025,b.height-1.1,.02);
  }
  // Recessed wall panels sit above the real counter. Their contents distinguish
  // archives, transport halls, ateliers and civic buildings in the live scene.
  const panelY=Math.min(5.5,b.height*.55),panelH=Math.min(3,b.height*.32);
  const archival=['memory_archives','living_cards_gallery','mission_hotel'].includes(b.buildingId);
  const maritime=['central_marina','shipyard_3b','mobility_center','train_station'].includes(b.buildingId);
  const atelier=['house_3b','ai_textile_lab','mode3_studio','community_house'].includes(b.buildingId);
  for(const side of [-1,1]){
   const px=x+side*b.width*.27,pw=b.width*.28;
   piece(materials.gold,px,panelY,rear+.06,pw,panelH,.06);
   piece(plaster,px,panelY,rear+.10,pw-.12,panelH-.12,.035);
   if(archival){
    for(let row=0;row<3;row++){
     const yy=panelY-panelH/2+.24+row*(panelH-.3)/3;
     piece(materials.gold,px,yy,rear+.17,pw-.18,.055,.16);
     const count=Math.max(3,Math.floor((pw-.4)/.22));
     for(let j=0;j<count;j++){
      const hh=.28+(j%4)*.08;
      piece(j%3?materials.glass:materials.gold,px-pw/2+.23+j*(pw-.46)/(count-1),yy+hh/2+.03,rear+.16,.13,hh,.09);
     }
    }
   }else if(maritime){
    // Layered chart with paired routes, harbour markers and a gold compass.
    for(let row=0;row<4;row++)piece(materials.glass,px,panelY-panelH*.3+row*panelH*.2,rear+.135,pw*.8,.035,.018);
    for(let j=0;j<5;j++){
     const xx=px-pw*.35+j*pw*.175,yy=panelY+Math.sin(j*1.9+side)*panelH*.25;
     piece(materials.gold,xx,yy,rear+.15,.09,.09,.025);
     if(j<4)piece(materials.gold,xx+pw*.08,yy,rear+.15,pw*.16,.025,.02);
    }
    piece(materials.gold,px,panelY,rear+.17,.025,panelH*.72,.025);
   }else if(atelier){
    for(let j=0;j<5;j++)piece(j%2?materials.gold:materials.glass,px-pw*.32+j*pw*.16,panelY,rear+.15,pw*.12,panelH*(.45+(j%3)*.16),.025);
    for(let row=0;row<3;row++)piece(materials.gold,px,panelY-panelH*.3+row*panelH*.3,rear+.17,pw*.8,.018,.018);
   }else{
    // Eight bars recall the eight gates without duplicating exterior signage.
    for(let j=0;j<8;j++)piece(j===3?materials.gold:materials.glass,px-pw*.35+j*pw*.1,panelY,rear+.14,pw*.055,panelH*(.35+(j%4)*.12),.025);
    piece(materials.gold,px,panelY-panelH*.34,rear+.16,pw*.8,.025,.025);
   }
  }
  if(['memory_archives','living_cards_gallery','mission_hotel'].includes(b.buildingId)){
   // Bound volumes, gold spines and a low reading stand.
   for(let i=0;i<5;i++){
    const xx=x-space+i*.33,h=.45+(i%3)*.12;
    piece(i%2?materials.dark:materials.glass,xx,table+h/2,z,.22,h,.44);
    piece(materials.gold,xx,table+h*.5,z+.23,.15,.045,.035);
   }
   piece(materials.gold,x+space*.55,table+.12,z,1,.12,.52);
   piece(materials.glass,x+space*.55,table+.23,z,.85,.08,.46);
  }else if(['central_marina','shipyard_3b','mobility_center','train_station'].includes(b.buildingId)){
   // Scale vessel with cabin, paired decks and a slender mast.
   piece(materials.dark,x,table+.12,z,2.1,.24,.5);
   piece(materials.gold,x,table+.28,z,1.8,.08,.48);
   piece(materials.glass,x-.1,table+.5,z,.75,.35,.36);
   piece(materials.gold,x+.5,table+.65,z,.035,.85,.035);
  }else if(['house_3b','ai_textile_lab','mode3_studio','community_house'].includes(b.buildingId)){
   // Textile sample stacks and a framed blue display.
   for(let i=0;i<3;i++)for(let j=0;j<3;j++)piece(j%2?materials.gold:materials.dark,x-space+i*.8,table+.06+j*.09,z,.6,.09,.46);
   piece(materials.gold,x+space*.65,table+.48,z,1,.8,.06);
   piece(materials.glass,x+space*.65,table+.48,z+.04,.86,.64,.04);
  }else if(['city_planning_office','city_gallery','tower_circle','heritage_welcome'].includes(b.buildingId)){
   // A city model on a bounded presentation plinth.
   piece(materials.dark,x,table+.08,z,2,.16,.65);
   for(let i=0;i<5;i++){const h=.2+(i%3)*.2;piece(i===2?materials.gold:materials.glass,x-.75+i*.36,table+.16+h/2,z,.22,h,.25);}
  }else{
   // A civic object with a champagne frame and two keepsake boxes.
   piece(materials.gold,x,table+.18,z,1,.14,.55);
   piece(materials.glass,x,table+.46,z,.5,.5,.35);
   for(const side of [-1,1])piece(materials.dark,x+side*.9,table+.15,z,.4,.3,.4);
  }
 }
 const group=new THREE.Group();group.name='3B · objets des comptoirs';group.userData.roomPrograms=roomPlans.map(p=>({buildingId:p.buildingId,theme:p.program.theme,accent:p.program.accent}));root.add(group);
 for(const [material,poses] of layers){
  const batch=new THREE.InstancedMesh(box,material,poses.length);batch.castShadow=batch.receiveShadow=true;
  for(const [i,p] of poses.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.pitch,p.yaw,p.roll);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);if(p.color||material===timber||material===cloth)batch.setColorAt(i,new THREE.Color(p.color||'#ffffff'));}
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);owned.push(batch);batches.push({batch,poses});
 }
 let quality='detail',lastView=null;const viewpoint=new THREE.Vector3(),color=new THREE.Color();
 function updateView(camera){
  camera.getWorldPosition(viewpoint);group.worldToLocal(viewpoint);
  if(lastView&&lastView.distanceToSquared(viewpoint)<9)return;
  lastView=viewpoint.clone();const radius=quality==='fluid'?78:145,radius2=radius*radius;
  for(const {batch,poses} of batches){
   let count=0;
   for(const p of poses){
    if((p.x-viewpoint.x)**2+(p.y-viewpoint.y)**2+(p.z-viewpoint.z)**2>radius2)continue;
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.pitch,p.yaw,p.roll);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();batch.setMatrixAt(count,dummy.matrix);
    if(batch.instanceColor)batch.setColorAt(count,color.set(p.color||'#ffffff'));
    count++;
   }
   batch.count=count;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
  }
 }
 return{count:buildings.length,anchors,furnishings,roomPlans,floorSurfaces:roomPlans.flatMap(p=>p.floorSurfaces),updateView,setQuality(mode){quality=mode;lastView=null;group.children.forEach(o=>o.castShadow=mode!=='fluid');}};
}
