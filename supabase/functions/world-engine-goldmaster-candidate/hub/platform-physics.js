import {safeExplorationSpawn} from '../exploration-checkpoint.js';
import {HUB_SCALE,HUB_PLATFORM,HUB_FINAL_POSITION,platformPortal,platformBuilding,platformWalls} from './platform-layout.js';
import plan from './data/hub-master-plan-v2.json' with {type:'json'};

// Metres in the same physical deck used by exploration. This module has no
// renderer dependency and is also shipped with the authoritative combat engine.
export function platformObstacles(){
 const local=[];
 for(let i=0;i<8;i++){
  const p=platformPortal(i);
  for(const side of [-1,1])local.push({x:p.x/HUB_SCALE+side*8,z:p.z/HUB_SCALE,width:2,depth:3});
 }
 for(const [x,z] of [[48,48],[-48,48],[48,-48],[-48,-48]])local.push({x,z,r:14.8});
 local.push({x:0,z:0,r:19.5});
 const buildings=plan.buildings.map(platformBuilding);
 for(const b of buildings){
  local.push(...platformWalls(b).map(w=>Object.fromEntries(Object.entries(w).map(([k,v])=>[k,v/HUB_SCALE]))));
  const x=b.buildingX/HUB_SCALE,z=b.buildingZ/HUB_SCALE,w=b.width/HUB_SCALE,d=b.depth/HUB_SCALE;
  local.push({x,z:z-d/2+1,width:w*.5,depth:1});
 }
 for(const b of buildings){
  const x=b.buildingX/HUB_SCALE,z=b.buildingZ/HUB_SCALE,w=b.width/HUB_SCALE,d=b.depth/HUB_SCALE;
  local.push({x,z:z-d/2-4,width:w*.74,depth:4});
  if(b.buildingId==='arena_3b')for(const side of [-1,1])local.push({x:x+side*(w/2+3),z,r:2});
 }
 for(let i=0;i<8;i++){
  const a=(i+.5)*Math.PI/4,x=Math.cos(a)*132,z=Math.sin(a)*132;
  for(const side of [-1,1])local.push({x:x+Math.cos(a+Math.PI/2)*side*6,z:z+Math.sin(a+Math.PI/2)*side*6,width:8,depth:9});
 }
 for(let i=0;i<32;i++){
  const a=(i+.5)*Math.PI/16,r=105+(i%2)*25;local.push({x:Math.cos(a)*r,z:Math.sin(a)*r,r:.65});
 }
 for(let i=0;i<24;i++){
  const a=(i+.5)*Math.PI*2/24,r=i%2?119:80,x=Math.cos(a)*r,z=Math.sin(a)*r;
  local.push({x,z,r:.6},{x:x+2,z:z+2,r:1.3});
  if(i%3===0)local.push({x:x-3,z,r:1.5});
 }
 for(const side of [-1,1])for(let i=0;i<4;i++)local.push({x:side*34,z:70+i*9,width:5,depth:3});
 return local.map(o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v*HUB_SCALE])));
}

export {HUB_FINAL_POSITION};

// Translate the complete old arena frame together, once. Health, timings,
// mastery, rewards and the player's distance to the opponent remain unchanged.
export function resumePlatformFinal(field){
 if(!field)return field;
 if(Math.abs(field.home.x-HUB_FINAL_POSITION.x)<.001&&Math.abs(field.home.z-HUB_FINAL_POSITION.z)<.001)return field;
 const dx=HUB_FINAL_POSITION.x-field.home.x,dz=HUB_FINAL_POSITION.z-field.home.z;
 const shifted={...field};
 for(const key of ['p','enemy','home','aim'])shifted[key]={x:field[key].x+dx,z:field[key].z+dz};
 const obstacles=platformObstacles();
 for(const key of ['p','enemy']){
  const safe=safeExplorationSpawn({region:'hub',...shifted[key],heading:0},'hub',{obstacles,radius:HUB_PLATFORM.walkRadius});
  shifted[key]=safe?{x:safe.x,z:safe.z}:key==='enemy'?{...HUB_FINAL_POSITION}:{x:0,z:HUB_FINAL_POSITION.z+11};
 }
 shifted.home={...HUB_FINAL_POSITION};
 return shifted;
}
