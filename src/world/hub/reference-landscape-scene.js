import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPremiumWater} from '../premium-water.js';
import {citeSurfaceDistance} from './platform-topology.js';
import {citeWaterfallMaterial} from './waterfall-material.js';
import {REFERENCE_LANDMARKS} from './reference-landmarks.js';

const TAU=Math.PI*2;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const hash=(x,z,seed)=>Math.sin(x*12.9898+z*78.233+seed*37.719)*43758.5453%1;
function randomSequence(seed){let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}

/** These are physical shores and mountain masses, rather than additional realms.
 * Distances are in the same local metres as the city topology. The south remains
 * an open navigable bay; a mountain ring would hide the city from its docks. */
export function referenceLandscapeSites(layoutRadius=270){
 const expansion=layoutRadius/270;
 const feature=id=>REFERENCE_LANDMARKS.find(landmark=>landmark.id===id).feature;
 const mount=feature('mont_savoirs'),orient=feature('falaises_orient'),valley=feature('vallee_cascades');
 return [
  {id:'mount-of-knowledge',name:'Mont des Savoirs',...mount,height:62,seed:11,forest:65},
  {id:'estonia-pine-ridge',name:'Pinèdes de l’Innovation',x:-18,z:-307,r:56,height:86,seed:19,forest:190},
  {id:'northwestern-massif',name:'Massif des Héritages',x:-204,z:-329,r:83,height:127,seed:37,forest:240},
  {id:'northern-peaks',name:'Aiguilles des Héritages',x:-74,z:-389,r:83,height:157,seed:43,forest:220},
  {id:'northeastern-ridge',name:'Crêtes des Horizons',x:93,z:-359,r:71,height:121,seed:59,forest:175},
  {id:'orient-cliffs',name:'Falaises d’Orient',...orient,height:62,seed:71,forest:35},
  {id:'western-reef',name:'Rochers des Passions',x:-312,z:39,r:37,height:47,seed:83,forest:45},
  {id:'cascade-valley',name:'Vallée des Cascades',...valley,height:44,seed:97,forest:60},
  {id:'unity-coast',name:'Rives des Jardins',x:-233,z:243,r:43,height:34,seed:103,forest:90},
  {id:'dune-terraces',name:'Terrasses des Dunes',x:246,z:262,r:46,height:37,seed:109,forest:12},
 ].map(site=>({...site,x:site.x*expansion,z:site.z*expansion,r:site.r*expansion}));
}

export function referenceTerrainRadius(site,angle){
 return site.r*(1+.16*Math.sin(angle*3+site.seed)+.075*Math.sin(angle*7-site.seed*.31)+.035*Math.cos(angle*13));
}
export function referenceTerrainHeight(site,x,z,seaLevel=-18){
 const angle=Math.atan2(z,x),radius=Math.hypot(x,z)/referenceTerrainRadius(site,angle);
 if(radius>=1)return seaLevel-2;
 const uplift=Math.pow(Math.max(0,1-radius),.72);
 const ridge=.80+Math.min(1,radius*5)*(.16*Math.sin(angle*3+site.seed*.29)+.08*Math.cos(angle*7-site.seed*.13));
 const strata=Math.sin(radius*33+angle*2+site.seed)*1.25*Math.sin(radius*Math.PI);
 return seaLevel-2+site.height*uplift*ridge+strata;
}

/** The mountain shell and the tree roots use exactly the same height field. */
export function referenceTerrainGeometry(site,{segments=64,rings=12,seaLevel=-18}={}){
 const positions=[],colors=[],indices=[],color=new THREE.Color(),base=new THREE.Color('#334955'),green=new THREE.Color('#2b4c39'),pale=new THREE.Color('#8b9d9c'); // gold-master-allow: reviewed mineral/vegetation/high-altitude vertex palette; docs/hub-reference-art-exceptions.md#landscape-materials.
 positions.push(0,referenceTerrainHeight(site,0,0,seaLevel),0);
 for(let ring=1;ring<=rings;ring++)for(let segment=0;segment<segments;segment++){
  const angle=segment/segments*TAU,radius=referenceTerrainRadius(site,angle)*ring/rings,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
  positions.push(x,referenceTerrainHeight(site,x,z,seaLevel),z);
 }
 for(let segment=0;segment<segments;segment++)indices.push(0,1+(segment+1)%segments,1+segment);
 for(let ring=0;ring<rings-1;ring++)for(let segment=0;segment<segments;segment++){
  const a=1+ring*segments+segment,b=1+ring*segments+(segment+1)%segments,c=a+segments,d=b+segments;
  indices.push(a,b,c,b,d,c);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const normals=geometry.attributes.normal;
 for(let index=0;index<positions.length/3;index++){
  const x=positions[index*3],y=positions[index*3+1],z=positions[index*3+2],variation=.83+Math.abs(hash(x,z,site.seed))*.27;
  color.copy(base).lerp(green,clamp((normals.getY(index)-.55)*2,0,.7)*(site.forest?1:0));
  color.lerp(pale,clamp((y-70)/50,0,.65)).multiplyScalar(variation);
  if(y<seaLevel+3)color.multiplyScalar(.58);
  colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();return geometry;
}

function pineGeometry(){
 const parts=[];
 for(let layer=0;layer<6;layer++){
  const radius=2.6-layer*.34,height=3.6-layer*.17,geometry=new THREE.ConeGeometry(radius,height,9,1);
  geometry.translate(0,3.2+layer*1.3,0);parts.push(geometry);
 }
 const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());return geometry;
}

/** A closed vessel hull, with a genuine keel, sheer and bow rather than a box. */
export function referenceBoatHullGeometry(){
 const stations=[[-.5,0],[-.40,.29],[-.24,.44],[.05,.5],[.32,.40],[.48,.12],[.5,0]],positions=[],indices=[];
 for(const [z,beam] of stations){positions.push(-beam,.19,z,-beam*.80,-.14,z,0,-.30,z,beam*.80,-.14,z,beam,.19,z);}
 for(let station=0;station<stations.length-1;station++)for(let side=0;side<4;side++){
  const a=station*5+side,b=a+5;indices.push(a,b,a+1,a+1,b,b+1);
 }
 // The weather deck closes the hull and prevents the ocean showing through it.
 for(let station=0;station<stations.length-1;station++){
  const a=station*5,b=a+5;indices.push(a,a+4,b,a+4,b+4,b);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

function flowingRibbonGeometry(points,width){
 const curve=new THREE.CatmullRomCurve3(points),positions=[],uv=[],indices=[],segments=48;
 for(let step=0;step<=segments;step++){
  const t=step/segments,p=curve.getPoint(t),tangent=curve.getTangent(t),side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
  for(const direction of [-1,1]){positions.push(p.x+side.x*width*.5*direction,p.y,p.z+side.z*width*.5*direction);uv.push(direction<0?0:1,1-t);}
  if(step<segments){const a=step*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Adds the actual frame of the reference illustration: irregular wooded ridges,
 * sea stacks, a named reflective lake, and a connected harbour. All returned map
 * geometry is converted to world metres exactly once by this builder. */
export function addReferenceLandscape({root,owned=[],materials={},layoutRadius=270,scale=1.7,seaLevel=-18,includeDocks=true}={}){
 if(!root)throw new TypeError('A parent group is required for the city landscape');
 const group=new THREE.Group();group.name='3B · reliefs, pinèdes et Baie des Horizons';root.add(group);
 const register=value=>(owned.push(value),value),localMesh=(geometry,material,x,y,z,sx=1,sy=sx,sz=sx,parent=group)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 const rock=register(new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.91,metalness:.02})); // gold-master-allow: neutral base preserves rock vertex colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
 const wetRock=register(new THREE.MeshStandardMaterial({color:'#263f49',roughness:.32,metalness:.09,envMapIntensity:.55})); // gold-master-allow: reviewed wet coastal rock albedo; docs/hub-reference-art-exceptions.md#landscape-materials.
 const needles=register(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.93,metalness:0})); // gold-master-allow: neutral base preserves per-instance pine colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
 const bark=register(new THREE.MeshStandardMaterial({color:'#4e4433',roughness:1})); // gold-master-allow: reviewed pine bark albedo; docs/hub-reference-art-exceptions.md#landscape-materials.
 const dark=materials.dark||register(new THREE.MeshStandardMaterial({color:'#142b3a',roughness:.54,metalness:.35})); // gold-master-allow: reviewed harbour hull/metal albedo fallback; docs/hub-reference-art-exceptions.md#landscape-materials.
 const stone=materials.stone||register(new THREE.MeshStandardMaterial({color:'#657d7b',roughness:.84})); // gold-master-allow: reviewed harbour stone albedo fallback; docs/hub-reference-art-exceptions.md#landscape-materials.
 const gold=materials.gold||register(new THREE.MeshStandardMaterial({color:'#c6a66b',roughness:.30,metalness:.74})); // gold-master-allow: reviewed harbour metal albedo fallback; docs/hub-reference-art-exceptions.md#landscape-materials.
 const window=register(new THREE.MeshStandardMaterial({color:'#224657',roughness:.23,metalness:.51,emissive:'#8b6741',emissiveIntensity:.15})); // gold-master-allow: reviewed vessel glazing and warm cabin emission; docs/hub-reference-art-exceptions.md#landscape-materials.
 const wood=register(new THREE.MeshStandardMaterial({color:'#5b5345',roughness:.84})); // gold-master-allow: reviewed harbour timber albedo; docs/hub-reference-art-exceptions.md#landscape-materials.
 const signal=register(new THREE.MeshStandardMaterial({color:'#80dcec',emissive:'#44a3c4',emissiveIntensity:.42,roughness:.25})); // gold-master-allow: reviewed maritime beacon surface/emission colors; docs/hub-reference-art-exceptions.md#landscape-materials.
 const box=register(new THREE.BoxGeometry(1,1,1)),cylinder=register(new THREE.CylinderGeometry(1,1,1,10));
 const rockGeometry=register(new THREE.IcosahedronGeometry(1,1));
 const rockPositions=rockGeometry.attributes.position;
 for(let index=0;index<rockPositions.count;index++){
  const x=rockPositions.getX(index),y=rockPositions.getY(index),z=rockPositions.getZ(index),variation=.86+Math.abs(hash(x,y+z,23))*.31;
  rockPositions.setXYZ(index,x*variation,y*(.84+variation*.15),z*variation);
 }
 rockGeometry.computeVertexNormals();
 const terrainSites=referenceLandscapeSites(layoutRadius),terrainLODs=[],treeSites=[],rockSites=[],structures=[],mapVegetation=[],localCollisions=[],harbourParts=[],ships=[];
 const mapFeature=site=>({...site,x:site.x*scale,z:site.z*scale,...Object.fromEntries(['r','width','depth'].filter(key=>Number.isFinite(site[key])).map(key=>[key,site[key]*scale])),...(Number.isFinite(site.height)?{height:site.height*1.5}:{}),units:'world'});
 const random=randomSequence(31082026);
 for(const site of terrainSites){
  const lod=new THREE.LOD();lod.name=site.name;lod.position.set(site.x,0,site.z);lod.userData.layoutSite=site;
  let sampleGeometry;
  for(const [segments,rings,distance] of [[64,12,0],[32,6,650]]){
   const geometry=register(referenceTerrainGeometry(site,{segments,rings,seaLevel})),mesh=new THREE.Mesh(geometry,rock);mesh.receiveShadow=true;mesh.visible=distance===0;lod.addLevel(mesh,distance,distance?.08:0);
   sampleGeometry??=geometry;
  }
  const landmarkId=({'mount-of-knowledge':'mont_savoirs','orient-cliffs':'falaises_orient','cascade-valley':'vallee_cascades'})[site.id];
  const outline=Array.from({length:64},(_,index)=>{const angle=index/64*TAU,radius=referenceTerrainRadius(site,angle);return{x:(site.x+Math.cos(angle)*radius)*scale,z:(site.z+Math.sin(angle)*radius)*scale};});
  group.add(lod);terrainLODs.push(lod);structures.push({...mapFeature({...site,kind:site.kind||'mountain',landmarkId,walkable:false}),outline});
  const sampleSurface=new THREE.Mesh(sampleGeometry,rock),groundRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));sampleSurface.updateMatrixWorld(true);
  let accepted=0;
  for(let attempt=0;attempt<site.forest*5&&accepted<site.forest;attempt++){
   const angle=random()*TAU,radius=site.r*(.14+Math.sqrt(random())*.67),x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,y=referenceTerrainHeight(site,x,z,seaLevel);
   if(y<seaLevel+7||y>seaLevel+site.height*.81)continue;
   const worldX=site.x+x,worldZ=site.z+z;
   if(citeSurfaceDistance(worldX,worldZ)<4)continue;
   groundRay.ray.origin.set(x,200,z);const hit=groundRay.intersectObject(sampleSurface)[0];if(!hit||hit.face.normal.y<.38)continue;
   treeSites.push({massif:site.id,x:worldX,y:hit.point.y-.06,z:worldZ,scale:.58+random()*.62,yaw:random()*TAU});accepted++;
  }
  for(let index=0;index<15;index++){
   const angle=random()*TAU,radius=referenceTerrainRadius(site,angle)*(.72+random()*.20),x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,y=referenceTerrainHeight(site,x,z,seaLevel);
   rockSites.push({x:site.x+x,y:y+1,z:site.z+z,sx:1.3+random()*3.7,sy:2+random()*5,sz:1.1+random()*3.4,yaw:random()*TAU});
  }
 }
 const clock={value:0},wind={value:.35};
 needles.onBeforeCompile=shader=>{
  shader.uniforms.referenceTreeTime=clock;shader.uniforms.referenceTreeWind=wind;
  shader.vertexShader='uniform float referenceTreeTime;uniform float referenceTreeWind;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float treePhase=0.;
   #ifdef USE_INSTANCING
   treePhase=instanceMatrix[3].x*.07+instanceMatrix[3].z*.11;
   #endif
   transformed.x+=sin(referenceTreeTime*.8+treePhase+position.y*.5)*referenceTreeWind*.06*max(0.,position.y-3.);`);
 };
 needles.customProgramCacheKey=()=> 'reference-pine-wind-v1';
 const pine=register(pineGeometry()),trunk=register(new THREE.CylinderGeometry(.12,.29,9,6));trunk.translate(0,4.5,0);
 const dummy=new THREE.Object3D();
 const instanced=(geometry,material,sites,name,transform)=>{
  const mesh=new THREE.InstancedMesh(geometry,material,sites.length);mesh.name=name;mesh.receiveShadow=true;mesh.castShadow=false;
  for(let index=0;index<sites.length;index++){
   const site=sites[index];dummy.position.set(site.x,site.y,site.z);dummy.rotation.set(0,site.yaw||0,0);dummy.scale.set(site.scale||1,site.scale||1,site.scale||1);transform?.(site,dummy);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
   if(material===needles)mesh.setColorAt(index,site.color);
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);register(mesh);return mesh;
 };
 const renderedTreeSites=[...treeSites].sort((a,b)=>hash(a.x,a.z,13)-hash(b.x,b.z,13));
 // Preserve every tree's authored colour and the existing fluid-mode subset.
 // Only the batch boundaries change: offscreen massifs can now be culled
 // without submitting all the forests behind the camera as one giant sphere.
 renderedTreeSites.forEach((site,index)=>{site.order=index;site.color=new THREE.Color().setHSL(.34+random()*.035,.22+random()*.14,.11+random()*.08);});
 const fluidTreeCount=Math.ceil(treeSites.length*.60),forests=[];
 for(const massif of terrainSites){
  const sites=renderedTreeSites.filter(site=>site.massif===massif.id);if(!sites.length)continue;
  forests.push({count:sites.length,fluidCount:sites.filter(site=>site.order<fluidTreeCount).length,
   crowns:instanced(pine,needles,sites,'Pinèdes des montagnes · '+massif.id),
   trunks:instanced(trunk,bark,sites,'Troncs sur les vraies pentes · '+massif.id)});
 }
 for(const [index,site] of treeSites.entries())mapVegetation.push(mapFeature({id:'landscape-pine-'+index,kind:'tree',x:site.x,z:site.z,r:site.scale*2.6,height:site.scale*11,walkable:false}));
 // Small jagged reefs break the sea silhouette without sealing the dock entrance.
 for(let index=0;index<35;index++){
  const angle=TAU*(.04+random()*.92),radius=layoutRadius+23+random()*87,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
  if(Math.abs(x)<80&&z>0||citeSurfaceDistance(x,z)<9)continue;
  const site={x,y:seaLevel+(.4+random()*2),z,sx:3+random()*6,sy:3+random()*10,sz:2+random()*6,yaw:random()*TAU};rockSites.push(site);
  const projected=[];
  for(let vertex=0;vertex<rockPositions.count;vertex++){
   const px=rockPositions.getX(vertex)*site.sx,pz=rockPositions.getZ(vertex)*site.sz,c=Math.cos(site.yaw),s=Math.sin(site.yaw);
   projected.push({x:(x+c*px+s*pz)*scale,z:(z-s*px+c*pz)*scale});
  }
  projected.sort((a,b)=>a.x-b.x||a.z-b.z);
  const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),hull=[];
  for(const point of projected){while(hull.length>=2&&cross(hull.at(-2),hull.at(-1),point)<=0)hull.pop();hull.push(point);}
  const lower=hull.length;
  for(let vertex=projected.length-2;vertex>=0;vertex--){const point=projected[vertex];while(hull.length>lower&&cross(hull.at(-2),hull.at(-1),point)<=0)hull.pop();hull.push(point);}
  hull.pop();
  structures.push({...mapFeature({id:'sea-stack-'+index,name:'Récif rocheux',kind:'reef',x,z,r:Math.max(site.sx,site.sz),height:site.sy,walkable:false}),outline:hull});
 }
 const rocks=instanced(rockGeometry,wetRock,rockSites,'Rochers et récifs humides',(site,object)=>object.scale.set(site.sx,site.sy,site.sz));

 // The named lake sits in the real water pocket between the city and Estonia.
 // Its surface is cut away wherever the shared city topology has solid ground.
 const lake={...REFERENCE_LANDMARKS.find(landmark=>landmark.id==='lac_reflets').feature},lakeWater=createPremiumWater({region:'hub',lake,owned});lakeWater.setQuality('medium',{allowPlanarReflection:false});
 lakeWater.material.uniforms.waveAmp.value=.24;lakeWater.material.uniforms.normalStrength.value=.12;lakeWater.material.uniforms.deepColor.value.set('#12516b');lakeWater.material.uniforms.shallowColor.value.set('#4b9199'); // gold-master-allow: reviewed lake depth/shallow-water shader colors; docs/hub-reference-art-exceptions.md#lake.
 const lakeSurfaceGeometry=new THREE.CircleGeometry(lake.r,64);lakeSurfaceGeometry.rotateX(-Math.PI/2);
 const lakePosition=lakeSurfaceGeometry.attributes.position;
 // A true hole must not leave triangles drawing water through a bridge.
 const lakeIndices=lakeSurfaceGeometry.index.array,kept=[];
 for(let index=0;index<lakeIndices.length;index+=3){
  const triangle=[lakeIndices[index],lakeIndices[index+1],lakeIndices[index+2]];
  if(triangle.every(vertex=>citeSurfaceDistance(lake.x+lakePosition.getX(vertex),lake.z+lakePosition.getZ(vertex))>1))kept.push(...triangle);
 }
 lakeSurfaceGeometry.setIndex(kept);lakeSurfaceGeometry.computeBoundingSphere();register(lakeSurfaceGeometry);
 // premium-water expects XY water-plane coordinates. Keep it as a normal plane
 // and rotate the complete surface, preserving its shader displacement axis.
 lakeSurfaceGeometry.rotateX(Math.PI/2);
 const lakeSurface=localMesh(lakeSurfaceGeometry,lakeWater.material,lake.x,seaLevel+.17,lake.z);lakeSurface.rotation.x=-Math.PI/2;lakeSurface.castShadow=lakeSurface.receiveShadow=false;lakeSurface.name='Lac des Reflets';
 const lakeOutline=Array.from({length:64},(_,index)=>{const angle=index/64*TAU;return{x:(lake.x+Math.cos(angle)*lake.r)*scale,z:(lake.z+Math.sin(angle)*lake.r)*scale};});
 const lakeTriangles=[];for(let index=0;index<kept.length;index+=3)lakeTriangles.push(kept.slice(index,index+3).map(vertex=>({x:(lake.x+lakePosition.getX(vertex))*scale,z:(lake.z+lakePosition.getZ(vertex))*scale})));
 structures.push({...mapFeature({...lake,id:'lake-of-reflections',landmarkId:'lac_reflets',kind:'lake',name:'Lac des Reflets',waterLevel:(seaLevel+.17)*1.5,walkable:false,visibleTriangles:kept.length/3}),outline:lakeOutline,polygons:lakeTriangles});
 for(let index=0;index<11;index++){
  const angle=index/11*TAU,x=lake.x+Math.cos(angle)*(lake.r+1),z=lake.z+Math.sin(angle)*(lake.r+1);
  if(citeSurfaceDistance(x,z)<2)continue;
  localMesh(rockGeometry,wetRock,x,seaLevel+.8,z,1.9,2.1,1.4);
 }

 const falling=register(citeWaterfallMaterial()),valleyFalls=[];
 // Water follows two real mountain gullies before plunging into the open sea.
 for(const id of ['cascade-valley','mount-of-knowledge']){
  const site=terrainSites.find(entry=>entry.id===id),angle=Math.atan2(-site.z,-site.x)+.22;
  const points=[];
  for(let step=0;step<=18;step++){
   const progress=step/18,radius=site.r*(.33+progress*.59),a=angle+Math.sin(progress*Math.PI)*.10,x=Math.cos(a)*radius,z=Math.sin(a)*radius;
   points.push(new THREE.Vector3(site.x+x,referenceTerrainHeight(site,x,z,seaLevel)+.18,site.z+z));
  }
  const ribbon=localMesh(register(flowingRibbonGeometry(points,2.7)),falling,0,0,0);ribbon.castShadow=ribbon.receiveShadow=false;ribbon.name='Source et courant · '+site.name;
  const lip=points.at(-1),fallPoints=[lip.clone(),new THREE.Vector3(lip.x+Math.cos(angle)*1.1,lip.y-3,lip.z+Math.sin(angle)*1.1),new THREE.Vector3(lip.x+Math.cos(angle)*3.1,seaLevel+.1,lip.z+Math.sin(angle)*3.1)];
  const fall=localMesh(register(flowingRibbonGeometry(fallPoints,3.2)),falling,0,0,0);fall.castShadow=fall.receiveShadow=false;fall.name='Chute depuis la source · '+site.name;valleyFalls.push(fall);
  structures.push(mapFeature({id:site.id+'-source',kind:'cascade',name:'Source · '+site.name,x:lip.x,z:lip.z,r:3.4,height:lip.y-seaLevel,walkable:false}));
  for(let index=0;index<5;index++)localMesh(rockGeometry,wetRock,lip.x+(random()-.5)*9,seaLevel+.3,lip.z+(random()-.5)*9,1+random()*2,.8+random()*1.2,1+random()*2);
 }

 // Harbour footpaths are shared with the topology; vessels float 18 metres below
 // the city's deck and berths are reached by the existing transport interaction.
 if(includeDocks){
  const harbour=new THREE.Group();harbour.name='Baie des Horizons · quais et pontons';group.add(harbour);
  const walkway=(id,x,z,width,depth)=>{
   // Ground, balustrades and structural piers come from CITE_DOCK_SPANS. This
   // module adds port identity without drawing a second deck over that surface.
   structures.push(mapFeature({id,kind:'quay',name:'Quai · Baie des Horizons',x,z,width,depth,height:0,walkable:true}));
   for(let index=0;index<Math.floor(depth/2);index++){
    const plank=localMesh(box,wood,x,.014,z-depth/2+1+index*2,width-.18,.018,.055,harbour);plank.name='Joint de ponton · '+id;harbourParts.push(plank);
   }
  };
  walkway('dock-main',0,172,12,48);walkway('dock-cross',0,188,100,8);
  for(const [index,x] of [-43,0,43].entries())walkway('dock-finger-'+index,x,206,8,36);
  for(const x of [-43,0,43]){
   for(const side of [-1,1])for(let index=0;index<7;index++){
    const z=194+index*4.3,px=x+side*3.7;
    if(index%3===0){localMesh(box,dark,px,.25,z,.6,.5,.6,harbour);localCollisions.push({id:'dock-bollard-'+x+'-'+side+'-'+index,x:px,z,width:.65,depth:.65});}
   }
   // A capped end and a signal beacon keep the open water legible at night.
   const cap=localMesh(box,gold,x,1.05,224,7.8,.1,.1,harbour);harbourParts.push(cap);
   localMesh(cylinder,dark,x,.95,222,.15,1.9,.15,harbour);localMesh(cylinder,signal,x,2.03,222,.28,.20,.28,harbour);localCollisions.push({x,z:222,r:.4});
  }
  const hullGeometry=register(referenceBoatHullGeometry());
  for(let index=0;index<9;index++){
   const x=-43+(index%3)*43+((Math.floor(index/3)%2)?14:-14),z=200+Math.floor(index/3)*15,length=18+(index%3)*3,width=4.5+(index%2)*.8;
   const ship=new THREE.Group();ship.name='Navette maritime 3B · '+(index+1);ship.position.set(x,seaLevel+.6,z);ship.rotation.y=(index%2?-.15:.12);harbour.add(ship);ships.push({group:ship,x,z,y:ship.position.y,phase:index*1.77});
   localMesh(hullGeometry,dark,0,0,0,width,4,length,ship);
   localMesh(box,gold,0,.83,0,width*.93,.12,length*.91,ship);
   localMesh(box,stone,0,2.1,-length*.04,width*.74,2.3,length*.55,ship);
   localMesh(box,dark,0,3.48,-length*.04,width*.84,.25,length*.60,ship);
   for(const side of [-1,1]){
    for(let pane=0;pane<7;pane++)localMesh(box,window,side*width*.375,2.45,-length*.27+pane*length*.073,.035,.98,length*.053,ship);
    localMesh(box,gold,side*width*.40,1.22,0,.08,.12,length*.80,ship);
   }
   localMesh(box,window,0,2.55,length*.248,width*.6,.84,.055,ship);
   localMesh(cylinder,gold,0,4.5,-length*.2,.08,2.1,.08,ship);localMesh(cylinder,signal,0,5.57,-length*.2,.18,.16,.18,ship);
   for(let seat=0;seat<4;seat++)localMesh(box,wood,(seat%2-.5)*width*.48,1.37,length*(.31+Math.floor(seat/2)*.10),width*.22,.40,1.0,ship);
   structures.push(mapFeature({id:'horizon-ship-'+index,kind:'boat',name:'Navette maritime 3B',x,z,width,depth:length,height:6,walkable:false}));
  }
  for(const [x,z] of [[-39,185],[39,185],[-6,163],[6,163]]){
   localMesh(cylinder,dark,x,2,z,.09,4,.09,harbour);localMesh(cylinder,signal,x,4.1,z,.20,.28,.20,harbour);localCollisions.push({x,z,r:.3});
  }
 }
 const qualityObjects=[...forests.flatMap(forest=>[forest.crowns,forest.trunks]),rocks];
 // One ship moves as a whole. Its hull/windows/trim are material batches, and
 // all fixed harbour furniture is batched once rather than hundreds of draws.
 const batchStatic=parent=>{
  parent.updateMatrix();const materialGroups=new Map();
  for(const child of parent.children)if(child.isMesh&&!child.isInstancedMesh&&!child.material.transparent){
   child.updateMatrix();const key=child.material.uuid;
   if(!materialGroups.has(key))materialGroups.set(key,[]);materialGroups.get(key).push(child);
  }
  for(const children of materialGroups.values())if(children.length>1){
   const pieces=children.map(child=>{
    const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix);
    if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
    return geometry;
   });
   const geometry=mergeGeometries(pieces);pieces.forEach(piece=>piece.dispose());
   if(geometry){const mesh=new THREE.Mesh(register(geometry),children[0].material);mesh.name=parent.name+' · '+children[0].material.uuid;mesh.receiveShadow=true;mesh.castShadow=false;parent.add(mesh);children.forEach(child=>child.removeFromParent());}
  }
 };
 for(const ship of ships)batchStatic(ship.group);
 if(includeDocks)batchStatic(group.children.find(child=>child.name==='Baie des Horizons · quais et pontons'));
 batchStatic(group);
 let quality='medium';
 const foamAt=(x,z)=>{
  let amount=0;
  for(const site of rockSites){
   if(site.y>seaLevel+5)continue;
   const dx=(x-site.x)/Math.max(1,site.sx),dz=(z-site.z)/Math.max(1,site.sz),distance=Math.hypot(dx,dz);
   if(distance>.88&&distance<1.5)amount=Math.max(amount,(1-Math.abs(distance-1.12)/.38)*.72);
  }
  return clamp(amount,0,1);
 };
 return {
  group,structures,mapFeatures:structures,vegetation:mapVegetation,localCollisions,terrainSites,ships,harbourParts,lake,foamAt,
  diagnostics:{mountainMasses:terrainSites.length,pines:treeSites.length,reefs:structures.filter(site=>site.kind==='reef').length,ships:ships.length,quays:structures.filter(site=>site.kind==='quay').length,lakeTriangles:kept.length/3,sourceStreams:valleyFalls.length},
  updateView(camera){if(!camera)return;for(const lod of terrainLODs)lod.update(camera);},
  setQuality(mode){quality=mode;for(const mesh of qualityObjects)mesh.castShadow=mode==='detail'||mode==='high';for(const forest of forests)forest.crowns.count=forest.trunks.count=mode==='fluid'?forest.fluidCount:forest.count;lakeWater.setQuality(mode,{allowPlanarReflection:false});lakeWater.material.uniforms.waveAmp.value=.24;lakeWater.material.uniforms.normalStrength.value=.12;for(const lod of terrainLODs)lod.levels[0].object.castShadow=mode==='detail'||mode==='high';},
  setWeather(weather){wind.value=weather==='storm'?1:weather==='rain'?.65:.35;wetRock.roughness=weather==='storm'||weather==='rain'?.19:.32;lakeWater.setWeather(weather);},
  setDaylight(day){falling.uniforms.day.value=clamp(day,0,1);lakeWater.setDaylight(day);signal.emissiveIntensity=.42+(1-day)*.60;window.emissiveIntensity=.15+(1-day)*.5;},
  tick(time){clock.value=time;falling.uniforms.time.value=time;lakeWater.update(time);for(const ship of ships){ship.group.position.y=ship.y+Math.sin(time*.75+ship.phase)*.10;ship.group.rotation.z=Math.sin(time*.48+ship.phase)*.006;}},
  disposeReflection(){lakeWater.disposeReflection();},
  get quality(){return quality;},
 };
}
