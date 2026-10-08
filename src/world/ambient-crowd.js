import * as THREE from 'three';
import {bakeCrowdHuman,crowdHumanMaterial} from './crowd-human-model.js';
import {createCivilianRoutes,civilianRoutine} from './ambient-civilian-routes.js';
import {obstacleDistance} from './collision.js';
import {worldCrowdPalette} from '../design-system/tokens.js';

const PROFILE_LIMITS=Object.freeze({
 mobileMedium:{fluid:16,auto:32,detail:32,updateHz:4,maxDistance:210},
 mobileHigh:{fluid:16,auto:32,detail:32,updateHz:6,maxDistance:300},
 desktop:{fluid:36,auto:96,detail:96,updateHz:10,maxDistance:480},
});

export function ambientCrowdBudget({mode='auto',deviceMemory=4,coarsePointer=false,viewport=0,reducedMotion=false}={}){
 const memory=Number.isFinite(Number(deviceMemory))?Math.max(0,Number(deviceMemory)):4,size=Math.max(0,Number(viewport)||0);
 const profile=!coarsePointer&&size>=1000&&memory>=8?'desktop':memory>=8?'mobileHigh':'mobileMedium',limits=PROFILE_LIMITS[profile],quality=['fluid','auto','detail'].includes(mode)?mode:'auto';
 return{profile,count:limits[quality],updateHz:reducedMotion?0:limits.updateHz,maxDistance:limits.maxDistance,moving:!reducedMotion};
}

const hash=(value,salt=0)=>{let n=(Math.imul(value+1,2654435761)+Math.imul(salt+11,1597334677))>>>0;n^=n>>>16;n=Math.imul(n,2246822519)>>>0;n^=n>>>13;return(n>>>0)/4294967295;};

export function createAmbientCrowd(root,items,options={}){
 const obstacles=Array.isArray(options.obstacles)?options.obstacles:[],routes=createCivilianRoutes(items,{obstacles}),localRoutes=options.localRoutes??items.some(i=>String(i.id).includes(':realm:')),groundY=typeof options.groundY==='function'?options.groundY:()=>0,environment={
  deviceMemory:options.deviceMemory,
  coarsePointer:!!options.coarsePointer,
  viewport:options.viewport,
  reducedMotion:!!options.reducedMotion,
 };
 let mode=options.mode||'auto',budget=ambientCrowdBudget({...environment,mode}),lastUpdate=-Infinity,visible=0,disposed=false;
 if(!root||!routes.length)return{tick(){},setQuality(){},get diagnostics(){return{...budget,count:0,visible:0,drawCalls:0};},dispose(){}};

 const maximum=PROFILE_LIMITS.desktop.detail,group=new THREE.Group();group.name='3B · habitants humains instanciés';group.userData.ambientCivilian=true;root.add(group);
 const walkTime={value:0},walkActive={value:budget.moving?1:0},lastUpdateTime={value:0},updateInterval={value:budget.updateHz?1/budget.updateHz:0},models=[];
 let lastTime=0,lastPlayer={x:0,z:0},lastSimulationPlayer={x:NaN,z:NaN},lastStamp=0,loadError=null;
 async function addModel(asset){
  const baked=await bakeCrowdHuman(asset);if(disposed){baked.dispose();return;}
  const material=crowdHumanMaterial(baked,walkTime,walkActive,{lastUpdateTime,updateInterval}),batches=[baked.geometry,baked.low].map((geometry,lod)=>{
   const mesh=new THREE.InstancedMesh(geometry,material,maximum);mesh.name='Foule · humains '+models.length+' · '+(lod?'lointains':'proches');mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;
   const attrs={phase:new THREE.InstancedBufferAttribute(new Float32Array(maximum),1),speed:new THREE.InstancedBufferAttribute(new Float32Array(maximum),1),travel:new THREE.InstancedBufferAttribute(new Float32Array(maximum),1),gait:new THREE.InstancedBufferAttribute(new Float32Array(maximum),1),skin:new THREE.InstancedBufferAttribute(new Float32Array(maximum*3),3),cloth:new THREE.InstancedBufferAttribute(new Float32Array(maximum*3),3),hair:new THREE.InstancedBufferAttribute(new Float32Array(maximum*3),3)};
   for(const [name,attribute] of Object.entries(attrs))geometry.setAttribute('crowd'+name[0].toUpperCase()+name.slice(1),attribute);
   group.add(mesh);return {mesh,attrs,count:0};
  });
  models.push({baked,material,batches});lastUpdate=-Infinity;update(lastTime,lastPlayer,lastStamp);
 }
 const {cloth,skin}=worldCrowdPalette,agents=Array.from({length:maximum},(_,index)=>{
  const route=routes[index%routes.length],width=Math.max(2,Math.min(7,Number(route.width)||5));
  return{route,phase:localRoutes?hash(index,1):.04+hash(index,1)*.22,speed:.42+hash(index,2)*.58,offset:(hash(index,3)-.5)*(localRoutes?Math.min(3.6,width*.7):Math.min(1.2,width*.2)),pause:3+hash(index,9)*7,activity:['looking','chatting','resting'][index%3],scale:.88+hash(index,4)*.22,cloth:cloth[Math.floor(hash(index,5)*cloth.length)],skin:skin[Math.floor(hash(index,6)*skin.length)],lod:1,visible:false};
 });
 const dummy=new THREE.Object3D(),clothColor=new THREE.Color(),skinColor=new THREE.Color();

 function update(time,player={x:0,z:0},stamp=time*1000){
  if(disposed)return;walkTime.value=time;walkActive.value=budget.moving?1:0;lastTime=time;lastPlayer=player;lastStamp=stamp;
  const populationChanged=localRoutes&&(!Number.isFinite(lastSimulationPlayer.x)||Math.hypot((player.x||0)-lastSimulationPlayer.x,(player.z||0)-lastSimulationPlayer.z)>24);
  if(lastUpdate!==-Infinity){if(!budget.updateHz&&!populationChanged||budget.updateHz&&stamp-lastUpdate<1000/budget.updateHz)return;}lastUpdate=stamp;lastSimulationPlayer={x:player.x||0,z:player.z||0};lastUpdateTime.value=time;updateInterval.value=budget.updateHz?1/budget.updateHz:0;visible=0;
  for(const model of models)for(const batch of model.batches)batch.count=0;
  const viewer=options.camera?.position||player;
  // A territory reuses its bounded human pool in nearby villages. Reassignment
  // only happens after an agent leaves the visible radius, so residents already
  // on screen keep their path, gait phase and identity through sector changes.
  const localCandidates=localRoutes?routes.filter(r=>Math.hypot((r.from.x+r.to.x)/2-(player.x||0),(r.from.z+r.to.z)/2-(player.z||0))<budget.maxDistance+36).sort((a,b)=>Math.hypot((a.from.x+a.to.x)/2-player.x,(a.from.z+a.to.z)/2-player.z)-Math.hypot((b.from.x+b.to.x)/2-player.x,(b.from.z+b.to.z)/2-player.z)):[];
  for(let index=0;index<budget.count;index++){
   if(!models.length)break;
   const agent=agents[index];
   if(localCandidates.length&&Math.hypot((agent.route.from.x+agent.route.to.x)/2-(player.x||0),(agent.route.from.z+agent.route.to.z)/2-(player.z||0))>budget.maxDistance+48){agent.route=localCandidates[index%localCandidates.length];agent.visible=false;}
   const pose=civilianRoutine(agent,time,budget.moving);let {x,z}=pose;
   // A lateral lane yields to fixed furniture; the validated centre aisle is
   // always available. Distant LOD/culling hysteresis avoids boundary flicker.
   if(agent.offset&&agent.route.obstacles.some(o=>obstacleDistance(pose,o)<.5)){const centre=civilianRoutine({...agent,offset:0},time,budget.moving);x=centre.x;z=centre.z;}
   const playerDistance=Math.hypot(x-(player.x||0),z-(player.z||0));agent.visible=playerDistance<budget.maxDistance+(agent.visible?12:0);if(!agent.visible)continue;
   const model=models[index%models.length],distance=Math.hypot(x-(viewer.x||0),z-(viewer.z||0));if(agent.lod===0&&distance>68)agent.lod=1;else if(agent.lod===1&&distance<55)agent.lod=0;const batch=model.batches[agent.lod],slot=batch.count++;
   const y=Number(groundY(x,z))||0,heading=Math.atan2(pose.dx*pose.direction,pose.dz*pose.direction);visible++;
   dummy.position.set(x,y,z);dummy.rotation.set(0,heading,0);dummy.scale.set(agent.scale,agent.scale,agent.scale);dummy.updateMatrix();batch.mesh.setMatrixAt(slot,dummy.matrix);
   batch.attrs.phase.setX(slot,hash(index,7));batch.attrs.speed.setX(slot,agent.speed/1.6);batch.attrs.travel.setX(slot,pose.speed/agent.scale);batch.attrs.gait.setX(slot,pose.gait);
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
  get diagnostics(){const batches=models.flatMap(m=>m.batches);return{...budget,visible,routes:routes.length,localPool:localRoutes,civilian:true,activities:['walking','looking','chatting','resting'],ready:models.length>0,geometry:'shipped-human',error:loadError,drawCalls:batches.filter(b=>b.mesh.count>0).length,triangles:batches.reduce((sum,b)=>sum+b.mesh.geometry.index.count/3*b.mesh.count,0),models:models.map(m=>m.baked.diagnostics)};},
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const model of models){for(const batch of model.batches)batch.mesh.dispose();model.material.dispose();model.baked.dispose();}models.length=0;},
 };
}
