import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITE_ISLANDS,citeSurfaceDistance} from './platform-topology.js';
import {terraceAisle} from './terraces.js';
import {HUB_SCALE,platformRuntimeItems} from './platform-layout.js';
import {hubRuntime,HUB_PLAN} from './runtime-data.js';
import {hubPublicPlaces} from './platform-life.js';
import {HUB_MISSION_ACTION_PLANS} from './mission-actions.js';
import {blankSave} from '../rules.js';
import {landscapeItems} from '../terrain.js';
import {obstacleDistance} from '../collision.js';
import {REFERENCE_GATE_DISTRICT_STYLES} from './reference-gate-districts.js';

const DISTRICTS=Object.freeze({arrival:'Accueil des voyageurs',archives:'Jardins des archives',arena:'Parvis de l’Arène',commerce:'Promenade des savoir-faire',community:'Jardin de la communauté',innovation:'Jardin de l’Innovation',docks:'Baie des Horizons',builders:'Jardin des bâtisseurs',gardens:'Jardins des Héritages',refuge:'Jardin du refuge','builders-annex':'Terrasse des bâtisseurs'});
const turn=(site,x,z)=>({x:site.x+Math.cos(site.rotation)*x+Math.sin(site.rotation)*z,z:site.z-Math.sin(site.rotation)*x+Math.cos(site.rotation)*z});
const finite=Number.isFinite;
let reservedSites;

/** Future objective locations remain clear even before their mission is active. */
export function civicInteractionReservations(){
 if(reservedSites)return reservedSites;
 const save=blankSave(),points=new Map(),stages=Math.max(...Object.values(HUB_MISSION_ACTION_PLANS).map(plan=>plan.length));
 for(let stage=0;stage<stages;stage++){
  for(const [id,plan] of Object.entries(HUB_MISSION_ACTION_PLANS))if(save.hub.missions[id])Object.assign(save.hub.missions[id],{status:'active',completedObjectives:Math.min(stage,plan.length-1)});
  // Include rain shelters and public activities, rather than depending on the
  // weather or the current save when selecting permanent street furniture.
  const runtime=hubRuntime('desktop',{hubState:save.hub,now:new Date('2026-10-02T12:00:00Z'),weather:'heavy_rain'});
  for(const item of [...platformRuntimeItems(landscapeItems('hub',save),runtime.items,HUB_PLAN),...hubPublicPlaces()])points.set(item.id,item);
 }
 for(const p of [{id:'refuge-creature',x:-52,z:105},{id:'arena-creature',x:66,z:-57}])points.set(p.id,{...p,x:p.x*HUB_SCALE,z:p.z*HUB_SCALE,range:5});
 reservedSites=[...points.values()].filter(item=>!['hubDistrict','hubBuilding'].includes(item.type)&&finite(item.x)&&finite(item.z)).map(item=>({id:item.id,x:item.x/HUB_SCALE,z:item.z/HUB_SCALE,r:Math.max(2.2,Math.min(5,(item.range||3)/HUB_SCALE))}));
 return reservedSites;
}

/** One specification drives mesh placement, colliders and seated/reading poses.
 * Coordinates are city layout metres; no new ground or transport deck is drawn. */
export function civicDetailLayout({buildings=[],collisions=[],reservations=civicInteractionReservations(),limitPerDistrict=2}={}){
 const stations=[],anchors=[],pieces=[];
 const add=(site,material,shape,x,y,z,sx,sy,sz,detail=false)=>{const p=turn(site,x,z);pieces.push({stationId:site.id,material,shape,x:p.x,y,z:p.z,sx,sy,sz,yaw:site.rotation,detail});};
 for(const island of CITE_ISLANDS.filter(site=>DISTRICTS[site.id])){
  let count=0;
  for(const radius of [.67,.50,.78])for(let sample=0;sample<24&&count<limitPerDistrict;sample++){
   const angle=(sample+.5)*Math.PI/12,x=island.x+Math.cos(angle)*island.r*radius,z=island.z+Math.sin(angle)*island.r*radius;
   const site={id:`civic-rest:${island.id}:${count}`,district:island.id,name:DISTRICTS[island.id],kind:'rest-station',x,z,width:6.4,depth:1.25,bottom:0,top:1.83,rotation:Math.atan2(island.x-x,island.z-z)};
   const approach=turn(site,0,2.5),points=[site,approach,...[-1,1].flatMap(sx=>[-1,1].map(sz=>turn(site,sx*site.width/2,sz*site.depth/2)))];
   // Leave radial civic routes, both promenades, belvedere ramps, doors and all
   // semantic mission points unobstructed. The front approach is checked too.
   if(points.some(p=>citeSurfaceDistance(p.x,p.z)>-1.4||terraceAisle(p.x,p.z,3)))continue;
   if(points.some(p=>Math.abs(Math.hypot(p.x,p.z)-125)<7.8||Math.abs(Math.hypot(p.x,p.z)-178)<7))continue;
   if(points.some(p=>Array.from({length:4},(_,axis)=>Math.abs(-Math.sin(axis*Math.PI/4)*p.x+Math.cos(axis*Math.PI/4)*p.z)).some(distance=>distance<7.8)))continue;
   if(buildings.some(b=>points.some(p=>Math.abs(p.x-b.buildingX)<b.width/2+3.6&&Math.abs(p.z-b.buildingZ)<b.depth/2+4.8)))continue;
   if(reservations.some(p=>obstacleDistance(p,site)<p.r+1.25))continue;
   if([...collisions,...stations].some(obstacle=>{
    // surfaceDistance closures in the platform already use world metres.
    const distance=p=>obstacle.surfaceDistance?obstacleDistance({x:p.x*HUB_SCALE,z:p.z*HUB_SCALE},obstacle)/HUB_SCALE:obstacleDistance(p,obstacle);
    return points.some(p=>distance(p)<1.15)||distance(site)<site.width/2+1.3;
   }))continue;
   stations.push(site);count++;
   anchors.push({id:`hub:life:${site.id}:seat`,type:'hubLifeObject',kind:'seat',district:site.district,x:approach.x,z:approach.z,seatX:x,seatZ:z,seatHeight:.77,heading:site.rotation,range:3.2,name:'S’asseoir · '+site.name,detail:'Un banc ombragé, face au jardin et aux passages de la cité.'});
   anchors.push({id:`hub:life:${site.id}:garden`,type:'hubLifeObject',kind:'read',district:site.district,x:approach.x,z:approach.z,heading:site.rotation+Math.PI,range:3.2,name:'Lire · '+site.name,detail:'Les jardins de la cité réunissent pinèdes, cyprès, palmiers et arbres de rive. Les plantations laissent libres les portes, les rampes et les accès aux services.'});
   // Flush stone pad, two shaped supports, eight separated timber slats,
   // continuous back, armrests and visible brass bolts at human scale.
   add(site,'stone','box',0,.018,0,3.45,.036,1.16);
   for(const side of [-1,1]){
    add(site,'stone','box',side*1.12,.34,0,.24,.68,.85);
    add(site,'gold','box',side*1.12,.09,0,.31,.06,.91,true);
    add(site,'dark','box',side*1.44,.85,0,.09,.65,.09);
    add(site,'wood','box',side*1.44,1.11,0,.13,.10,.79);
    for(const zz of [-.29,.29])add(site,'gold','cylinder',side*1.12,.787,zz,.023,.018,.023,true);
   }
   for(let slat=0;slat<8;slat++)add(site,'wood','box',0,.71,-.39+slat*.11,3.0,.12,.09);
   for(let slat=0;slat<5;slat++)add(site,'wood','box',0,.89+slat*.135,-.48,3.0,.10,.10);
   add(site,'dark','box',0,.34,0,2.5,.08,.08);
   // A real planting vessel shows soil, drainage lip and grouped leaves.
   add(site,'stone','cylinder',-2.55,.38,0,.52,.76,.52);
   add(site,'gold','cylinder',-2.55,.72,0,.55,.055,.55,true);
   add(site,'wood','cylinder',-2.55,.758,0,.47,.016,.47,true);
   for(let leaf=0;leaf<7;leaf++){
    const a=leaf*Math.PI*2/7;add(site,'green','leaf',-2.55+Math.cos(a)*.22,.98+(leaf%3)*.13,Math.sin(a)*.22,.24,.29,.23);
   }
   // Enclosed waste bin has a recessed opening rather than an opaque black
   // cylinder. The opening, rim and maintenance latch remain real geometry.
   add(site,'dark','cylinder',2.55,.50,0,.39,1,.39);
   add(site,'gold','cylinder',2.55,.10,0,.40,.07,.40,true);
   add(site,'gold','cylinder',2.55,1.03,0,.40,.06,.40);
   add(site,'dark','cylinder',2.55,1.09,0,.23,.045,.23);
   add(site,'gold','box',2.55,.56,.395,.065,.15,.025,true);
   // Fixed plaque is bounded by the same station collider. Its label is in a
   // shared opaque atlas; no per-bench textures or individual draw calls.
   add(site,'dark','box',-2.55,1.19,-.28,.05,.89,.05);
   add(site,'gold','box',-2.55,1.58,-.28,1.20,.38,.07);
   add(site,'label','label',-2.55,1.58,-.238,1.12,.31,1,true);
  }
 }
 return{stations,anchors,pieces};
}

function labelAtlas(names,materials,owned){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const context=canvas.getContext('2d');if(!context)return null;
 const rowHeight=512/names.length;
 context.fillStyle=materials.dark.color.getStyle();context.fillRect(0,0,512,512);
 context.fillStyle=materials.gold.color.getStyle();context.textAlign='center';context.textBaseline='middle';context.font='600 30px sans-serif';
 // Short physical plaques remain readable at walking distance. Full place
 // names and the botanical text are retained in their interaction anchors.
 names.forEach((name,index)=>context.fillText(name.replace(/^(Jardins? (des?|du|de la|de l’)|Parvis de l’|Promenade des|Accueil des|Terrasse des)\s*/,'').toLocaleUpperCase('fr'),256,(index+.5)*rowHeight,480));
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
 const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});owned.push(texture,material);return material;
}

/** Draw-call bounded furnishings, with exact collision/pose data and distance LOD. */
export function addCivicDetailScene({root,owned,box,materials={},buildings=[],collisions=[],cameraSolids=[],reservations}={}){
 if(!root||!Array.isArray(owned))throw new TypeError('Civic detail needs a root and resource owner');
 const palette=REFERENCE_GATE_DISTRICT_STYLES.france,localMaterial=(key,color,roughness,metalness=0)=>materials[key]||(owned.push(materials[key]=new THREE.MeshStandardMaterial({color,roughness,metalness})),materials[key]);
 // All fallback albedos come from the already reviewed pavilion palette.
 materials={...materials};localMaterial('stone',palette.wall,.83);localMaterial('gold',palette.trim,.34,.74);localMaterial('dark',palette.roof,.62,.25);localMaterial('wood',REFERENCE_GATE_DISTRICT_STYLES.espagne.roof,.86);localMaterial('green',REFERENCE_GATE_DISTRICT_STYLES.maroc.roof,.97);
 const plan=civicDetailLayout({buildings,collisions,...(reservations?{reservations}:{})}),group=new THREE.Group();group.name='3B · jardins et mobilier civique';root.add(group);
 const register=asset=>(owned.push(asset),asset),geometries={box:box||register(new THREE.BoxGeometry(1,1,1)),cylinder:register(new THREE.CylinderGeometry(1,1,1,10)),leaf:register(new THREE.IcosahedronGeometry(1,0)),label:register(new THREE.PlaneGeometry(1,1))};
 const names=[...new Set(plan.stations.map(site=>site.name))],labels=names.length?labelAtlas(names,materials,owned):null,dummy=new THREE.Object3D(),poseById=new Map(plan.stations.map(site=>[site.id,site]));
 const batches=[];
 const pose=(mesh,index,p)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);};
 const fineShader=shader=>{shader.vertexShader='attribute float civicFine;attribute float civicNear;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed*=1.-civicFine*(1.-civicNear);');};
 const depth=register(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking})),distance=register(new THREE.MeshDistanceMaterial());
 for(const material of [depth,distance]){material.onBeforeCompile=fineShader;material.customProgramCacheKey=()=> '3b-civic-fine-shadow-v1';}
 // Bake one complete local station per material, then instance that station.
 // Bolt/collar detail has a per-instance mask in the same draw. A distant
 // station retains all its collidable body without a second set of batches.
 const first=plan.stations[0],model=first?plan.pieces.filter(piece=>piece.stationId===first.id&&piece.material!=='label'):[];
 for(const key of ['stone','wood','dark','gold','green']){
  const parts=model.filter(piece=>piece.material===key).map(piece=>{
   const localX=(piece.x-first.x)*Math.cos(first.rotation)-(piece.z-first.z)*Math.sin(first.rotation),localZ=(piece.x-first.x)*Math.sin(first.rotation)+(piece.z-first.z)*Math.cos(first.rotation);
   const source=geometries[piece.shape],geometry=source.index?source.toNonIndexed():source.clone();
   dummy.position.set(localX,piece.y,localZ);dummy.rotation.set(0,piece.yaw-first.rotation,0);dummy.scale.set(piece.sx,piece.sy,piece.sz);dummy.updateMatrix();geometry.applyMatrix4(dummy.matrix);
   geometry.setAttribute('civicFine',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(piece.detail?1:0),1));return geometry;
  });
  if(!parts.length)continue;
  const geometry=register(mergeGeometries(parts));parts.forEach(part=>part.dispose());geometry.setAttribute('civicNear',new THREE.InstancedBufferAttribute(new Float32Array(plan.stations.length).fill(1),1));
  const material=register(materials[key].clone()),baseShader=materials[key].onBeforeCompile,baseCache=materials[key].customProgramCacheKey();material.onBeforeCompile=(shader,renderer)=>{baseShader.call(materials[key],shader,renderer);fineShader(shader);};material.customProgramCacheKey=()=> baseCache+'-civic-fine-v1';
  const mesh=register(new THREE.InstancedMesh(geometry,material,plan.stations.length));mesh.name='Mobilier civique · '+key+' · ensemble';mesh.castShadow=mesh.receiveShadow=true;mesh.customDepthMaterial=depth;mesh.customDistanceMaterial=distance;
  const poses=plan.stations.map(site=>({x:site.x,y:0,z:site.z,sx:1,sy:1,sz:1,yaw:site.rotation}));poses.forEach((p,index)=>pose(mesh,index,p));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);batches.push({shape:'ensemble',poses,mesh});
 }
 if(labels){
  const poses=plan.pieces.filter(piece=>piece.material==='label'),geometry=register(geometries.label.clone()),rows=new Float32Array(poses.length);poses.forEach((p,index)=>rows[index]=names.indexOf(poseById.get(p.stationId).name));geometry.setAttribute('civicLabelRow',new THREE.InstancedBufferAttribute(rows,1));
  labels.onBeforeCompile=shader=>{shader.vertexShader='attribute float civicLabelRow;\n'+shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.y=(vMapUv.y+${names.length}.0-1.0-civicLabelRow)/${names.length}.0;\n#endif`);};labels.customProgramCacheKey=()=> '3b-civic-labels-'+names.length;
  const mesh=register(new THREE.InstancedMesh(geometry,labels,poses.length));mesh.name='Mobilier civique · plaques · détail';mesh.castShadow=mesh.receiveShadow=false;poses.forEach((p,index)=>pose(mesh,index,p));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);batches.push({shape:'label',detail:true,poses,mesh});
 }
 collisions.push(...plan.stations.map(site=>({...site})));cameraSolids.push(...plan.stations.map(site=>({...site})));
 let quality='detail',lastView=null;const view=new THREE.Vector3();
 const updateView=camera=>{
  if(!camera)return;camera.getWorldPosition(view);group.worldToLocal(view);if(lastView&&lastView.distanceToSquared(view)<9)return;lastView=view.clone();
  const range=quality==='fluid'?65:125;
  for(const layer of batches){
   if(!layer.detail){const mask=layer.mesh.geometry.attributes.civicNear;layer.poses.forEach((p,index)=>mask.setX(index,(p.x-view.x)**2+(p.z-view.z)**2<=range**2?1:0));mask.needsUpdate=true;continue;}let count=0;
   for(const p of layer.poses){if((p.x-view.x)**2+(p.z-view.z)**2>range**2)continue;pose(layer.mesh,count,p);if(layer.shape==='label')layer.mesh.geometry.attributes.civicLabelRow.setX(count,names.indexOf(poseById.get(p.stationId).name));count++;}
   layer.mesh.count=count;layer.mesh.instanceMatrix.needsUpdate=true;if(layer.shape==='label')layer.mesh.geometry.attributes.civicLabelRow.needsUpdate=true;
  }
 };
 return{group,plan,anchors:plan.anchors,mapSites:plan.stations,diagnostics:{restStations:plan.stations.length,seats:plan.stations.length,planters:plan.stations.length,wasteBins:plan.stations.length,drawBatches:batches.length,labelTexturePixels:labels?512*512:0,instances:batches.reduce((sum,batch)=>sum+batch.poses.length,0),authoredTriangles:batches.reduce((sum,batch)=>sum+(batch.mesh.geometry.index?.count||batch.mesh.geometry.attributes.position.count)/3*batch.poses.length,0)},updateView,
  setQuality(mode){quality=mode;lastView=null;for(const layer of batches)layer.mesh.castShadow=mode!=='fluid'&&!layer.detail;},
 };
}
