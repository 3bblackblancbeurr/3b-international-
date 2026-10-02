import * as THREE from 'three';
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
 const bodyGeometry=new THREE.CapsuleGeometry(.27,1.08,2,6),headGeometry=new THREE.SphereGeometry(.24,7,5);
 const bodyMaterial=new THREE.MeshStandardMaterial({color:worldCrowdPalette.base,roughness:.92,metalness:.02,vertexColors:true}),headMaterial=new THREE.MeshStandardMaterial({color:worldCrowdPalette.base,roughness:.96,metalness:0,vertexColors:true});
 const bodies=new THREE.InstancedMesh(bodyGeometry,bodyMaterial,maximum),heads=new THREE.InstancedMesh(headGeometry,headMaterial,maximum);
 bodies.name='Foule · silhouettes';heads.name='Foule · visages';for(const mesh of [bodies,heads]){mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;group.add(mesh);}

 const {cloth,skin}=worldCrowdPalette,agents=Array.from({length:maximum},(_,index)=>{
  const route=routes[index%routes.length],dx=route.to.x-route.from.x,dz=route.to.z-route.from.z,length=Math.hypot(dx,dz)||1,width=Math.max(2,Math.min(7,Number(route.width)||5));
  return{route,length,dx,dz,nx:-dz/length,nz:dx/length,phase:hash(index,1)*2,speed:.42+hash(index,2)*.58,offset:(hash(index,3)-.5)*width*.62,scale:.88+hash(index,4)*.22,cloth:cloth[Math.floor(hash(index,5)*cloth.length)],skin:skin[Math.floor(hash(index,6)*skin.length)]};
 });
 const dummy=new THREE.Object3D(),clothColor=new THREE.Color(),skinColor=new THREE.Color();

 function update(time,player={x:0,z:0},stamp=time*1000){
  if(disposed)return;
  if(lastUpdate!==-Infinity){if(!budget.updateHz||stamp-lastUpdate<1000/budget.updateHz)return;}lastUpdate=stamp;visible=0;
  for(let index=0;index<budget.count;index++){
   const agent=agents[index],cycle=(agent.phase+(budget.moving?time*agent.speed/agent.length:0))%2,t=cycle<=1?cycle:2-cycle,direction=cycle<=1?1:-1;
   const x=agent.route.from.x+agent.dx*t+agent.nx*agent.offset,z=agent.route.from.z+agent.dz*t+agent.nz*agent.offset;
   if(Math.hypot(x-(player.x||0),z-(player.z||0))>budget.maxDistance)continue;
   const y=Number(groundY(x,z))||0,heading=Math.atan2(agent.dx*direction,agent.dz*direction),slot=visible++;
   dummy.position.set(x,y+1.02*agent.scale,z);dummy.rotation.set(0,heading,0);dummy.scale.set(agent.scale,agent.scale,agent.scale);dummy.updateMatrix();bodies.setMatrixAt(slot,dummy.matrix);bodies.setColorAt(slot,clothColor.set(agent.cloth));
   dummy.position.set(x,y+2.02*agent.scale,z);dummy.scale.setScalar(agent.scale);dummy.updateMatrix();heads.setMatrixAt(slot,dummy.matrix);heads.setColorAt(slot,skinColor.set(agent.skin));
  }
  for(const mesh of [bodies,heads]){mesh.count=visible;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;if(visible)mesh.computeBoundingSphere();}
 }
 update(0,{x:0,z:0},0);
 return{
  tick: update,
  setQuality(nextMode){mode=nextMode;budget=ambientCrowdBudget({...environment,mode});lastUpdate=-Infinity;},
  get diagnostics(){return{...budget,visible,drawCalls:visible?2:0};},
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();bodies.dispose();heads.dispose();bodyGeometry.dispose();headGeometry.dispose();bodyMaterial.dispose();headMaterial.dispose();},
 };
}
