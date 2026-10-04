import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HUB_SCALE} from './hub/platform-layout.js';
import {worldCrowdPalette} from '../design-system/tokens.js';

const PROFILE_LIMITS=Object.freeze({
 mobileMedium:{fluid:16,auto:28,detail:34,updateHz:4,maxDistance:210},
 mobileHigh:{fluid:24,auto:44,detail:58,updateHz:6,maxDistance:300},
 desktop:{fluid:36,auto:72,detail:96,updateHz:10,maxDistance:480},
});

export function ambientCrowdBudget({mode='auto',deviceMemory=4,coarsePointer=false,viewport=0,reducedMotion=false}={}){
 const memory=Number.isFinite(Number(deviceMemory))?Math.max(0,Number(deviceMemory)):4,size=Math.max(0,Number(viewport)||0);
 const profile=!coarsePointer&&size>=1000&&memory>=8?'desktop':memory>=8?'mobileHigh':'mobileMedium',limits=PROFILE_LIMITS[profile],quality=['fluid','auto','detail'].includes(mode)?mode:'auto';
 return{profile,count:limits[quality],updateHz:reducedMotion?0:limits.updateHz,maxDistance:limits.maxDistance,moving:!reducedMotion};
}

const validPoint=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.z);
const hash=(value,salt=0)=>{let n=(Math.imul(value+1,2654435761)+Math.imul(salt+11,1597334677))>>>0;n^=n>>>16;n=Math.imul(n,2246822519)>>>0;n^=n>>>13;return(n>>>0)/4294967295;};

function crowdRoutes(items){
 const roads=(Array.isArray(items)?items:[]).filter(item=>item?.type==='hubRoad'&&validPoint(item.from)&&validPoint(item.to)&&Math.hypot(item.to.x-item.from.x,item.to.z-item.from.z)>8);
 if(!roads.length&&items?.some(item=>item.type==='hubBuilding'))return Array.from({length:4},(_,i)=>{const a=i*Math.PI/2;return {kind:'avenue',width:5*HUB_SCALE,from:{x:Math.cos(a)*47*HUB_SCALE,z:Math.sin(a)*47*HUB_SCALE},to:{x:Math.cos(a)*80*HUB_SCALE,z:Math.sin(a)*80*HUB_SCALE}};});
 const lanes=roads.filter(item=>item.kind==='lane'),avenues=roads.filter(item=>item.kind==='avenue').filter((_,index)=>index%2===0);
 return [...lanes,...avenues].length?[...lanes,...avenues]:roads.filter(item=>item.kind!=='express');
}

export function createAmbientCrowd(root,items,options={}){
 const routes=crowdRoutes(items),groundY=typeof options.groundY==='function'?options.groundY:()=>0,environment={
  deviceMemory:options.deviceMemory,
  coarsePointer:!!options.coarsePointer,
  viewport:options.viewport,
  reducedMotion:!!options.reducedMotion,
 };
 let mode=options.mode||'auto',budget=ambientCrowdBudget({...environment,mode}),lastUpdate=-Infinity,visible=0,disposed=false;
 if(!root||!routes.length)return{tick(){},setQuality(){},get diagnostics(){return{...budget,count:0,visible:0,drawCalls:0};},dispose(){}};

 const maximum=PROFILE_LIMITS.desktop.detail,group=new THREE.Group();group.name='3B · foule ambiante instanciée';root.add(group);
 const parts=[];
 function limb(geometry,x,y,z,joint=0){
  geometry.translate(x,y,z);const part=geometry.index?geometry.toNonIndexed():geometry;
  if(part!==geometry)geometry.dispose();
  part.setAttribute('crowdJoint',new THREE.Float32BufferAttribute(Array(part.attributes.position.count).fill(joint),1));parts.push(part);
 }
 limb(new THREE.CylinderGeometry(.27,.22,.72,8),0,.08,0);
 limb(new THREE.CylinderGeometry(.065,.075,.18,6),0,.54,0);
 for(const side of [-1,1]){
  limb(new THREE.CapsuleGeometry(.075,.49,2,6),side*.34,-.06,0,side*2);
  limb(new THREE.CapsuleGeometry(.085,.53,2,6),side*.14,-.61,0,side);
  limb(new THREE.BoxGeometry(.17,.12,.28),side*.14,-.95,.06,side);
 }
 const bodyGeometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 const phases=new THREE.InstancedBufferAttribute(new Float32Array(maximum),1);bodyGeometry.setAttribute('crowdPhase',phases);
 const headGeometry=new THREE.SphereGeometry(.19,8,6),walkTime={value:0},walkActive={value:budget.moving?1:0};
 const bodyMaterial=new THREE.MeshStandardMaterial({color:worldCrowdPalette.base,roughness:.92,metalness:.02}),headMaterial=new THREE.MeshStandardMaterial({color:worldCrowdPalette.base,roughness:.96,metalness:0});
 // Instance colours work independently of vertex colours; an absent colour
 // attribute must not multiply every resident down to black.
 bodyMaterial.onBeforeCompile=shader=>{
  shader.uniforms.crowdWalkTime=walkTime;shader.uniforms.crowdWalkActive=walkActive;
  shader.vertexShader='attribute float crowdJoint;attribute float crowdPhase;uniform float crowdWalkTime;uniform float crowdWalkActive;float crowdAngle(){return sin(crowdWalkTime*5.6+crowdPhase)*sign(crowdJoint)*crowdWalkActive*(abs(crowdJoint)>1.5?-.22:.3); }\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   if(abs(crowdJoint)>.5){float a=crowdAngle();objectNormal.yz=mat2(cos(a),sin(a),-sin(a),cos(a))*objectNormal.yz;}`);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   if(abs(crowdJoint)>.5){vec3 pivot=vec3(sign(crowdJoint)*(abs(crowdJoint)>1.5?.34:.14),abs(crowdJoint)>1.5?.32:-.25,0.);float a=crowdAngle();transformed-=pivot;transformed.yz=mat2(cos(a),sin(a),-sin(a),cos(a))*transformed.yz;transformed+=pivot;}`);
 };
 bodyMaterial.customProgramCacheKey=()=> '3b-crowd-articulated-v1';
 const bodies=new THREE.InstancedMesh(bodyGeometry,bodyMaterial,maximum),heads=new THREE.InstancedMesh(headGeometry,headMaterial,maximum);
 bodies.name='Foule · silhouettes';heads.name='Foule · visages';for(const mesh of [bodies,heads]){mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;group.add(mesh);}

 const {cloth,skin}=worldCrowdPalette,agents=Array.from({length:maximum},(_,index)=>{
  const route=routes[index%routes.length],dx=route.to.x-route.from.x,dz=route.to.z-route.from.z,length=Math.hypot(dx,dz)||1,width=Math.max(2,Math.min(7,Number(route.width)||5));
  return{route,length,dx,dz,nx:-dz/length,nz:dx/length,phase:hash(index,1)*2,speed:.42+hash(index,2)*.58,offset:(hash(index,3)-.5)*width*.62,scale:.88+hash(index,4)*.22,cloth:cloth[Math.floor(hash(index,5)*cloth.length)],skin:skin[Math.floor(hash(index,6)*skin.length)]};
 });
 const dummy=new THREE.Object3D(),clothColor=new THREE.Color(),skinColor=new THREE.Color();

 function update(time,player={x:0,z:0},stamp=time*1000){
  if(disposed)return;walkTime.value=time;walkActive.value=budget.moving?1:0;
  if(lastUpdate!==-Infinity){if(!budget.updateHz||stamp-lastUpdate<1000/budget.updateHz)return;}lastUpdate=stamp;visible=0;
  for(let index=0;index<budget.count;index++){
   const agent=agents[index],cycle=(agent.phase+(budget.moving?time*agent.speed/agent.length:0))%2,t=cycle<=1?cycle:2-cycle,direction=cycle<=1?1:-1;
   const x=agent.route.from.x+agent.dx*t+agent.nx*agent.offset,z=agent.route.from.z+agent.dz*t+agent.nz*agent.offset;
   if(Math.hypot(x-(player.x||0),z-(player.z||0))>budget.maxDistance)continue;
   const y=Number(groundY(x,z))||0,heading=Math.atan2(agent.dx*direction,agent.dz*direction),slot=visible++;
   dummy.position.set(x,y+1.02*agent.scale,z);dummy.rotation.set(0,heading,0);dummy.scale.set(agent.scale,agent.scale,agent.scale);dummy.updateMatrix();bodies.setMatrixAt(slot,dummy.matrix);bodies.setColorAt(slot,clothColor.set(agent.cloth));
   phases.setX(slot,hash(index,7)*Math.PI*2);
   dummy.position.set(x,y+1.78*agent.scale,z);dummy.scale.setScalar(agent.scale);dummy.updateMatrix();heads.setMatrixAt(slot,dummy.matrix);heads.setColorAt(slot,skinColor.set(agent.skin));
  }
  phases.needsUpdate=true;
  for(const mesh of [bodies,heads]){mesh.count=visible;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;if(visible){mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.25;}}
 }
 update(0,{x:0,z:0},0);
 return{
  tick: update,
  setQuality(nextMode){mode=nextMode;budget=ambientCrowdBudget({...environment,mode});lastUpdate=-Infinity;},
  get diagnostics(){return{...budget,visible,drawCalls:visible?2:0};},
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();bodies.dispose();heads.dispose();bodyGeometry.dispose();headGeometry.dispose();bodyMaterial.dispose();headMaterial.dispose();},
 };
}
