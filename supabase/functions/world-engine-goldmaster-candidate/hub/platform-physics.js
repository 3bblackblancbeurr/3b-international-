import {safeExplorationSpawn} from '../exploration-checkpoint.js';
import {HUB_SCALE,HUB_PLATFORM,HUB_FINAL_POSITION} from './platform-layout.js';
import obstacleFootprints from './data/platform-obstacles.json' with {type:'json'};
import {citeSurfaceDistance} from './platform-topology.js';

// Metres in the same physical deck used by exploration. This module has no
// renderer dependency and is also shipped with the authoritative combat engine.
const waterBoundary=Object.freeze({id:'cite-water-boundary',surfaceDistance:p=>-citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)*HUB_SCALE});
export function platformObstacles(){
 return [...obstacleFootprints.map(o=>({...o})),waterBoundary];
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
