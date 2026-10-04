import * as THREE from 'three';
import {bakeCrowdHuman,crowdHumanMaterial} from './crowd-human-model.js';
import {HUB_SCALE} from './hub/platform-layout.js';
import {worldCrowdPalette} from '../design-system/tokens.js';

const PROFILE_LIMITS=Object.freeze({
 mobileMedium:{fluid:16,auto:24,detail:24,updateHz:4,maxDistance:210},
 mobileHigh:{fluid:16,auto:24,detail:24,updateHz:6,maxDistance:300},
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

 const maximum=PROFILE_LIMITS.desktop.detail,group=new THREE.Group();group.name='3B · habitants humains instanciés';root.add(group);
 const walkTime={value:0},walkActive={value:budget.moving?1:0},lastUpdateTime={value:0},updateInterval={value:budget.updateHz?1/budget.updateHz:0},models=[];
 let lastTime=0,lastPlayer={x:0,z:0},lastStamp=0,loadError=null;
 async function addModel(asset){
  const baked=await bakeCrowdHuman(asset);if(disposed){baked.dispose();return;}
  const material=crowdHumanMaterial(baked,walkTime,walkActive,{lastUpdateTime,updateInterval}),batches=[baked.geometry,baked.low].map((geometry,lod)=>{
   const mesh=new THREE.InstancedMesh(geometry,material,maximum);mesh.name='Foule · humains '+models.length+' · '+(lod?'lointains':'proches');mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;
   const attrs={phase:new THREE.InstancedBufferAttribute(new Float32Array(maximum),1),speed:new THREE.InstancedBufferAttribute(new Float32Array(maximum),1),travel:new THREE.InstancedBufferAttribute(new Float32Array(maximum),1),skin:new THREE.InstancedBufferAttribute(new Float32Array(maximum*3),3),cloth:new THREE.InstancedBufferAttribute(new Float32Array(maximum*3),3),hair:new THREE.InstancedBufferAttribute(new Float32Array(maximum*3),3)};
   for(const [name,attribute] of Object.entries(attrs))geometry.setAttribute('crowd'+name[0].toUpperCase()+name.slice(1),attribute);
   group.add(mesh);return {mesh,attrs,count:0};
  });
  models.push({baked,material,batches});lastUpdate=-Infinity;update(lastTime,lastPlayer,lastStamp);
 }
 const {cloth,skin}=worldCrowdPalette,agents=Array.from({length:maximum},(_,index)=>{
  const route=routes[index%routes.length],dx=route.to.x-route.from.x,dz=route.to.z-route.from.z,length=Math.hypot(dx,dz)||1,width=Math.max(2,Math.min(7,Number(route.width)||5));
  return{route,length,dx,dz,nx:-dz/length,nz:dx/length,phase:hash(index,1)*2,speed:.42+hash(index,2)*.58,offset:(hash(index,3)-.5)*width*.62,scale:.88+hash(index,4)*.22,cloth:cloth[Math.floor(hash(index,5)*cloth.length)],skin:skin[Math.floor(hash(index,6)*skin.length)]};
 });
 const dummy=new THREE.Object3D(),clothColor=new THREE.Color(),skinColor=new THREE.Color();

 function update(time,player={x:0,z:0},stamp=time*1000){
  if(disposed)return;walkTime.value=time;walkActive.value=budget.moving?1:0;lastTime=time;lastPlayer=player;lastStamp=stamp;
  if(lastUpdate!==-Infinity){if(!budget.updateHz||stamp-lastUpdate<1000/budget.updateHz)return;}lastUpdate=stamp;lastUpdateTime.value=time;updateInterval.value=budget.updateHz?1/budget.updateHz:0;visible=0;
  for(const model of models)for(const batch of model.batches)batch.count=0;
  const viewer=options.camera?.position||player;
  for(let index=0;index<budget.count;index++){
   if(!models.length)break;
   const agent=agents[index],cycle=(agent.phase+(budget.moving?time*agent.speed/agent.length:0))%2,t=cycle<=1?cycle:2-cycle,direction=cycle<=1?1:-1;
   const x=agent.route.from.x+agent.dx*t+agent.nx*agent.offset,z=agent.route.from.z+agent.dz*t+agent.nz*agent.offset;
   if(Math.hypot(x-(player.x||0),z-(player.z||0))>budget.maxDistance)continue;
   const model=models[index%models.length],distance=Math.hypot(x-(viewer.x||0),z-(viewer.z||0)),batch=model.batches[distance<60?0:1],slot=batch.count++;
   const y=Number(groundY(x,z))||0,heading=Math.atan2(agent.dx*direction,agent.dz*direction);visible++;
   dummy.position.set(x,y,z);dummy.rotation.set(0,heading,0);dummy.scale.set(agent.scale,agent.scale,agent.scale);dummy.updateMatrix();batch.mesh.setMatrixAt(slot,dummy.matrix);
   batch.attrs.phase.setX(slot,hash(index,7));batch.attrs.speed.setX(slot,agent.speed/1.6);batch.attrs.travel.setX(slot,agent.speed/agent.scale);
   skinColor.set(agent.skin);clothColor.set(agent.cloth);batch.attrs.skin.setXYZ(slot,skinColor.r,skinColor.g,skinColor.b);batch.attrs.cloth.setXYZ(slot,clothColor.r,clothColor.g,clothColor.b);
   const hair=hash(index,8)>.78?'#897665':hash(index,8)>.4?'#35271e':'#17191d';skinColor.set(hair);batch.attrs.hair.setXYZ(slot,skinColor.r,skinColor.g,skinColor.b);
  }
  for(const model of models)for(const {mesh,attrs,count} of model.batches){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;for(const attr of Object.values(attrs))attr.needsUpdate=true;if(count){mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.45;}}
 }
 const ready=(async()=>{
  if(!options.modelAsset&&!options.modelLibrary)return;
  const first=options.modelAsset||await options.modelLibrary.load('/world/living/traveller-0.glb');await addModel(first);
  if(options.modelLibrary&&!disposed){const female=await options.modelLibrary.load('/world/living/traveller-3.glb');await addModel(female);}
 })().catch(error=>{if(!disposed){loadError=error.message;options.onError?.('Les habitants ne peuvent pas être affichés.');console.error('[3B human crowd]',error);}});

 return{
  tick: update,ready,
  setQuality(nextMode){mode=nextMode;budget=ambientCrowdBudget({...environment,mode});lastUpdate=-Infinity;},
  get diagnostics(){const batches=models.flatMap(m=>m.batches);return{...budget,visible,ready:models.length>0,geometry:'shipped-human',error:loadError,drawCalls:batches.filter(b=>b.mesh.count>0).length,triangles:batches.reduce((sum,b)=>sum+b.mesh.geometry.index.count/3*b.mesh.count,0),models:models.map(m=>m.baked.diagnostics)};},
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const model of models){for(const batch of model.batches)batch.mesh.dispose();model.material.dispose();model.baked.dispose();}models.length=0;},
 };
}
