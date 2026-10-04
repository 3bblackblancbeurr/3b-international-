import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITE_ISLANDS,citeSurfaceDistance} from './platform-topology.js';
import {terraceAisle} from './terraces.js';
import {obstacleDistance} from '../collision.js';

/** Instanced botanical silhouettes; trunks have collision and foliage stays above head height. */
export function addCiteVegetation({root,owned,buildings,collisions}){
 const sites=[],clock={value:0},wind={value:.35};
 let seed=31082026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<32;i++){
  const a=(i+.5)*Math.PI/16,r=105+(i%2)*25,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(!terraceAisle(x,z,2)&&!collisions.some(o=>!o.surfaceDistance&&obstacleDistance({x,z},o)<2.2))sites.push({x,z,scale:.8+random()*.25,yaw:a});
 }
 for(const island of CITE_ISLANDS.filter(i=>['gardens','archives','innovation','refuge','community','builders'].includes(i.id)))for(let attempt=0,count=0;attempt<220&&count<14;attempt++){
  const a=random()*Math.PI*2,r=island.r*(.25+random()*.53),x=island.x+Math.cos(a)*r,z=island.z+Math.sin(a)*r;
  const radius=Math.hypot(x,z);let lane=Math.abs(radius-125);for(let i=0;i<8;i++)lane=Math.min(lane,Math.abs(-Math.sin(i*Math.PI/4)*x+Math.cos(i*Math.PI/4)*z));
  if(lane<10||citeSurfaceDistance(x,z)>-4||terraceAisle(x,z,3)||buildings.some(b=>Math.abs(x-b.buildingX)<b.width/2+5&&Math.abs(z-b.buildingZ)<b.depth/2+9)||collisions.some(o=>!o.surfaceDistance&&obstacleDistance({x,z},o)<2.2)||sites.some(p=>Math.hypot(p.x-x,p.z-z)<4))continue;
  sites.push({x,z,scale:.75+random()*.35,yaw:random()*Math.PI*2});count++;
 }
 const group=new THREE.Group();group.name='3B · jardins botaniques';root.add(group);
 const trunkGeo=new THREE.CylinderGeometry(.12,.24,4.8,8);trunkGeo.translate(0,2.4,0);
 const trunkMat=new THREE.MeshStandardMaterial({color:'#4c3e2f',roughness:1});
 const parts=[];
 for(let i=0;i<9;i++){
  const a=i*2.39996,r=i===0?0:1.3+(i%2)*.35,y=5.1+(i%3)*.9;
  const g=new THREE.IcosahedronGeometry(1,1);g.scale(1.45,1.8,1.35);g.translate(Math.cos(a)*r,y,Math.sin(a)*r);parts.push(g);
 }
 const crownGeo=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 const colors=new Float32Array(crownGeo.attributes.position.count*3),color=new THREE.Color();
 for(let i=0;i<crownGeo.attributes.position.count;i++){const h=crownGeo.attributes.position.getY(i),shade=.88+random()*.23;color.set('#244e38').multiplyScalar(shade+(h-4)*.045);colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}
 crownGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const leafMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.93,metalness:0,vertexColors:true});
 leafMat.onBeforeCompile=shader=>{shader.uniforms.citeTreeTime=clock;shader.uniforms.citeTreeWind=wind;shader.vertexShader='uniform float citeTreeTime;uniform float citeTreeWind;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(citeTreeTime*.9+position.y*1.1)*citeTreeWind*.055*max(0.,position.y-3.);');};leafMat.customProgramCacheKey=()=> 'cite-needle-wind-v1';
 const dummy=new THREE.Object3D();
 for(const [geo,mat,name] of [[trunkGeo,trunkMat,'Troncs'],[crownGeo,leafMat,'Cèdres et conifères']]){
  const mesh=new THREE.InstancedMesh(geo,mat,sites.length);mesh.name=name==='Troncs'?name:'Canopées ramifiées';mesh.castShadow=mesh.receiveShadow=true;
  for(let i=0;i<sites.length;i++){const p=sites[i];dummy.position.set(p.x,0,p.z);dummy.rotation.y=p.yaw;dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);owned.push(mesh);
 }
 for(const p of sites)collisions.push({x:p.x,z:p.z,r:.4});
 owned.push(trunkGeo,crownGeo,trunkMat,leafMat);
 return{count:sites.length,mapSites:sites.map(p=>({...p,r:2.9*p.scale,kind:'tree'})),tick(time){clock.value=time;},setWeather(value){wind.value=value==='storm'?1:value==='rain'?.65:.35;},setQuality(mode){group.children.forEach(o=>{o.castShadow=mode!=='fluid';});}};
}
