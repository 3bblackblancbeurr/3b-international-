import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITE_ISLANDS,CITE_GATE_SITES,citeSurfaceDistance} from './platform-topology.js';
import {terraceAisle} from './terraces.js';
import {obstacleDistance} from '../collision.js';
import {COUNTRIES} from '../catalog.js';
import {HUB_SCALE,platformPortal} from './platform-layout.js';

/** Instanced botanical silhouettes; trunks have collision and foliage stays above head height. */
export function addCiteVegetation({root,owned,buildings,collisions}){
 const sites=[],clock={value:0},wind={value:.35};
 let seed=31082026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<32;i++){
  const a=(i+.5)*Math.PI/16,r=105+(i%2)*25,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(!terraceAisle(x,z,2)&&!collisions.some(o=>!o.surfaceDistance&&obstacleDistance({x,z},o)<2.2))sites.push({x,z,scale:.8+random()*.25,yaw:a,species:i%3?'broadleaf':'cypress'});
 }
 for(const island of CITE_ISLANDS.filter(i=>['gardens','archives','innovation','refuge','community','builders'].includes(i.id)))for(let attempt=0,count=0;attempt<220&&count<14;attempt++){
  const a=random()*Math.PI*2,r=island.r*(.25+random()*.53),x=island.x+Math.cos(a)*r,z=island.z+Math.sin(a)*r;
  const radius=Math.hypot(x,z);let lane=Math.abs(radius-125);for(let i=0;i<8;i++)lane=Math.min(lane,Math.abs(-Math.sin(i*Math.PI/4)*x+Math.cos(i*Math.PI/4)*z));
  if(lane<10||citeSurfaceDistance(x,z)>-4||terraceAisle(x,z,3)||buildings.some(b=>Math.abs(x-b.buildingX)<b.width/2+5&&Math.abs(z-b.buildingZ)<b.depth/2+9)||collisions.some(o=>!o.surfaceDistance&&obstacleDistance({x,z},o)<2.2)||sites.some(p=>Math.hypot(p.x-x,p.z-z)<4))continue;
  sites.push({x,z,scale:.75+random()*.35,yaw:random()*Math.PI*2,species:['innovation','archives','refuge'].includes(island.id)?'pine':island.id==='gardens'?'cypress':'broadleaf'});count++;
 }
 // Six planted pockets per country are fitted to the actual peripheral island,
 // with species silhouettes from the selected reference rather than one generic tree.
 for(const [index,country] of COUNTRIES.entries()){
  const gate=platformPortal(index),site=CITE_GATE_SITES.find(s=>s.name===country.id),gx=gate.x/HUB_SCALE,gz=gate.z/HUB_SCALE,a=Math.atan2(gx,gz);
  const species=['maroc','tunisie','algerie'].includes(country.id)?'palm':country.id==='estonie'?'pine':['italie','espagne'].includes(country.id)?'cypress':'broadleaf';
  for(const [lx,lz] of [[-28,-17],[28,-17],[-28,17],[28,17],[-23,-27],[23,27]]){
   const x=gx+Math.cos(a)*lx+Math.sin(a)*lz,z=gz-Math.sin(a)*lx+Math.cos(a)*lz;
   if(citeSurfaceDistance(x,z)>-3.8||collisions.some(o=>!o.surfaceDistance&&obstacleDistance({x,z},o)<2.1)||sites.some(p=>Math.hypot(p.x-x,p.z-z)<4.5))continue;
   sites.push({x,z,species,scale:.85+random()*.23,yaw:random()*Math.PI*2,country:country.id,baseY:site?.baseY||0});
  }
 }
 const group=new THREE.Group();group.name='3B · jardins botaniques';root.add(group);
 const trunkGeo=new THREE.CylinderGeometry(.12,.24,5.4,8,8);trunkGeo.translate(0,2.7,0);
 // Root flare and shallow bark ridges remain actual silhouette geometry. All
 // roots fit inside the canonical .4-unit trunk collision, including scaling.
 const trunkPosition=trunkGeo.attributes.position;
 for(let i=0;i<trunkPosition.count;i++){
  const yy=trunkPosition.getY(i),xx=trunkPosition.getX(i),zz=trunkPosition.getZ(i),angle=Math.atan2(zz,xx),flare=1+.20*Math.exp(-yy*3),grain=1+.035*Math.sin(angle*5+yy*.55);
  trunkPosition.setX(i,xx*flare*grain);trunkPosition.setZ(i,zz*flare*grain);
 }
 trunkGeo.computeVertexNormals();
 const palmTrunkGeo=new THREE.CylinderGeometry(.13,.23,6.74,8,24);palmTrunkGeo.translate(0,3.37,0);
 const bark=palmTrunkGeo.attributes.position;
 for(let i=0;i<bark.count;i++){const yy=bark.getY(i),ring=1+.08*Math.sin(yy*22.5);bark.setX(i,bark.getX(i)*ring);bark.setZ(i,bark.getZ(i)*ring);}palmTrunkGeo.computeVertexNormals();
 const trunkMat=new THREE.MeshStandardMaterial({color:'#4c3e2f',roughness:1});
 const parts=[];
 for(let i=0;i<9;i++){
  const a=i*2.39996,r=i===0?0:1.3+(i%2)*.35,y=5.1+(i%3)*.9;
  const g=new THREE.IcosahedronGeometry(1,1);g.scale(1.45,1.8,1.35);g.translate(Math.cos(a)*r,y,Math.sin(a)*r);parts.push(g);
 }
 const broadleafGeo=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 const pineParts=[];
 for(let tier=0;tier<5;tier++){
  const radius=2.55-tier*.39,height=2.95-tier*.23,yy=3.45+tier*.99;
  const cone=new THREE.ConeGeometry(radius,height,12,2);cone.translate(0,yy+height/2,0);
  const positions=cone.attributes.position;
  for(let j=0;j<positions.count;j++){
   const xx=positions.getX(j),zz=positions.getZ(j),a=Math.atan2(zz,xx),m=1+.09*Math.sin(a*7+tier*2.1);positions.setX(j,xx*m);positions.setZ(j,zz*m);
  }
  cone.computeVertexNormals();pineParts.push(cone);
 }
 const pineGeo=mergeGeometries(pineParts);pineParts.forEach(g=>g.dispose());
 const cypressParts=[];
 for(let tier=0;tier<4;tier++){
  const crown=new THREE.IcosahedronGeometry(1,1);crown.scale(1.1-tier*.15,1.8,1.06-tier*.14);crown.translate(0,4.8+tier*1.04,0);cypressParts.push(crown);
 }
 const cypressGeo=mergeGeometries(cypressParts);cypressParts.forEach(g=>g.dispose());
 // Curved, tapered palm fronds have a three-dimensional droop and visible gaps.
 const palmPositions=[],palmIndices=[];
 for(let frond=0;frond<11;frond++){
  const a=frond*Math.PI*2/11,co=Math.cos(a),si=Math.sin(a),length=3.45+(frond%3)*.28;
  for(let seg=0;seg<9;seg++){
   const base=palmPositions.length/3;
   for(const [t,side] of [[seg/9,-1],[seg/9,1],[(seg+1)/9,1],[(seg+1)/9,-1]]){
    const width=Math.sin(t*Math.PI)*.41*(1-.28*t),r=t*length,yy=6.72+Math.sin(t*Math.PI)*.48-t*t*1.8;
    palmPositions.push(co*r-si*side*width,yy,si*r+co*side*width);
   }
   palmIndices.push(base,base+2,base+1,base,base+3,base+2);
  }
 }
 const palmGeo=new THREE.BufferGeometry();palmGeo.setAttribute('position',new THREE.Float32BufferAttribute(palmPositions,3));palmGeo.setIndex(palmIndices);palmGeo.computeVertexNormals();
 const crownGeometries={broadleaf:broadleafGeo,pine:pineGeo,cypress:cypressGeo,palm:palmGeo};
 const color=new THREE.Color();
 for(const [species,geometry] of Object.entries(crownGeometries)){
  const colors=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<geometry.attributes.position.count;i++){
   const h=geometry.attributes.position.getY(i),shade=.86+random()*.22;
   color.set(species==='palm'?'#4b6e42':species==='cypress'?'#284c39':species==='pine'?'#2e5142':'#355c3e').multiplyScalar(shade+(h-4)*.035); // gold-master-allow: reviewed species-specific foliage albedo; docs/hub-reference-art-exceptions.md#botany.
   colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 }
 const leafMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.93,metalness:0,vertexColors:true,side:THREE.DoubleSide}); // gold-master-allow: neutral base preserves baked foliage vertex colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
 const windShader=shader=>{
  shader.uniforms.citeTreeTime=clock;shader.uniforms.citeTreeWind=wind;
  shader.vertexShader='uniform float citeTreeTime;uniform float citeTreeWind;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float plantPhase=0.;
   #ifdef USE_INSTANCING
   plantPhase=instanceMatrix[3].x*.23+instanceMatrix[3].z*.17;
   #endif
   float flexibility=pow(max(0.,position.y-3.)*.2,1.35);
   transformed.x+=(sin(citeTreeTime*.9+plantPhase)+sin(citeTreeTime*1.73+position.z*2.1+plantPhase)*.20)*citeTreeWind*.12*flexibility;
   transformed.z+=cos(citeTreeTime*.72+plantPhase+position.x*.6)*citeTreeWind*.06*flexibility;`);
 };
 leafMat.onBeforeCompile=windShader;leafMat.customProgramCacheKey=()=> 'cite-botanical-wind-v2';
 // Moving leaves and their shadows use the same anchored deformation; a
 // close-up storm never leaves a static shadow detached from the canopy.
 const leafDepth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide}),leafDistance=new THREE.MeshDistanceMaterial({side:THREE.DoubleSide});
 for(const material of [leafDepth,leafDistance]){material.onBeforeCompile=windShader;material.customProgramCacheKey=()=> 'cite-botanical-shadow-wind-v2';}
 const dummy=new THREE.Object3D();
 function batch(geometry,material,name,selection){
  const mesh=new THREE.InstancedMesh(geometry,material,selection.length);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;
  if(material===leafMat){mesh.customDepthMaterial=leafDepth;mesh.customDistanceMaterial=leafDistance;}
  for(let i=0;i<selection.length;i++){const p=selection[i];dummy.position.set(p.x,p.baseY||0,p.z);dummy.rotation.y=p.yaw;dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);owned.push(mesh);
 }
 batch(trunkGeo,trunkMat,'Troncs',sites.filter(p=>p.species!=='palm'));
 const palms=sites.filter(p=>p.species==='palm');if(palms.length)batch(palmTrunkGeo,trunkMat,'Stipes des palmiers',palms);
 for(const [species,geometry] of Object.entries(crownGeometries)){
  const selection=sites.filter(p=>p.species===species);if(!selection.length)continue;
  batch(geometry,leafMat,species==='broadleaf'?'Canopées ramifiées':species==='pine'?'Pinède des héritages':species==='cypress'?'Cyprès des jardins':'Palmiers des rivages',selection);
 }
 for(const p of sites)collisions.push({x:p.x,z:p.z,r:.4});
 owned.push(trunkGeo,palmTrunkGeo,...Object.values(crownGeometries),trunkMat,leafMat,leafDepth,leafDistance);
 return{count:sites.length,mapSites:sites.map(p=>({...p,r:(p.species==='palm'?4:p.species==='cypress'?1.35:2.9)*p.scale,kind:'tree'})),diagnostics:{species:Object.keys(crownGeometries).length,drawBatches:group.children.length,animatedShadows:true},tick(time){clock.value=Number.isFinite(time)?time:0;},setWeather(value){wind.value=value==='storm'?1:value==='rain'?.65:.35;},setQuality(mode){group.children.forEach(o=>{o.castShadow=mode!=='fluid';});}};
}
