import {createTerrainField,landscapeItems,toLandscape,BIOMES,worldRadiusFor} from './terrain.js';
import {realmStaticObstacles,realmCampaignPosition} from './realm-layout.js';
import {heritageObstacles,LANDMARK_SITE} from './heritage.js';
import {parisWalls} from './paris-layout.js';
import {advanceMotion} from './motion.js';
import {findInteractionPath} from './navigation.js';
import {startField} from './field-combat.js';
import {hasCombatLineOfSight} from './combat-sight.js';
import hubPlan from './hub/data/hub-master-plan-v2.json' with {type:'json'};
import {HUB_SCALE,HUB_PLATFORM,platformBuilding,platformWalls} from './hub/platform-layout.js';
import {citeSurfaceDistance} from './hub/platform-topology.js';
import {obstacleDistance} from './collision.js';
const cache=new Map();
export const finalArenaPosition=()=>({x:0,z:23*HUB_SCALE});
export function combatObstacles(save){
 const region=save.region,key=region+':'+(save.adventure.frontier?.[region]?.camp||0);
 if(!cache.has(key)){
  if(region==='hub'){
   const buildings=hubPlan.buildings.map(platformBuilding);
   cache.set(key,[{id:'circle-monument',x:0,z:0,r:19.5*HUB_SCALE},...buildings.flatMap(platformWalls),...buildings.map(b=>({x:b.buildingX,z:b.buildingZ-b.depth/2+HUB_SCALE,width:b.width*.5,depth:HUB_SCALE})),{id:'cite-water-boundary',surfaceDistance:p=>-citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)*HUB_SCALE}]);
   return cache.get(key);
  }
  const f=createTerrainField(region,save),landmark=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z);
  cache.set(key,[...f.buildings.map(b=>({...b,width:b.width+.4,depth:b.depth+.4})),...f.civic,...f.paris.flatMap(parisWalls),{...f.lake,r:f.lake.r-1,blocksAttacks:false},...heritageObstacles(region,landmark,-BIOMES[region].angle),...realmStaticObstacles(region)]);
  if(cache.size>32)cache.delete(cache.keys().next().value);
 }
 return cache.get(key);
}
export function beginField(save,encounter){
 const items=landscapeItems(save.region,save),enemy=items.find(i=>encounter.final?i.type==='final':encounter.patrol?i.type==='patrol':i.card===encounter.card);
 if(!enemy)return null;
 if(encounter.final){const arena=finalArenaPosition();return startField({x:arena.x,z:arena.z+11},arena);}
 if(encounter.boss&&!encounter.patrol)return startField({x:enemy.x,z:enemy.z+8},enemy);
 const obstacles=combatObstacles(save),approach=findInteractionPath({x:0,z:5},enemy,obstacles,worldRadiusFor(save.region)).at(-1)||{x:enemy.x,z:enemy.z+8};
 return startField(approach,enemy);
}
/** Older accounts retain resources and mastery. Retired arena coordinates
 * move once to the physical court, with a brief readable recovery window. */
export function alignLegacyCombatField(save,encounter){
 const f=encounter?.field,boss=encounter?.boss&&!encounter.patrol;if(!f||!boss)return encounter;
 const old=encounter.final?toLandscape('hub',0,-3):toLandscape(encounter.region,0,-57);if(Math.hypot(f.home.x-old.x,f.home.z-old.z)>.1)return encounter;
 const arena=encounter.final?finalArenaPosition():realmCampaignPosition(encounter.region,3),obstacles=combatObstacles(save);
 const safe=point=>{const candidate={x:point.x+arena.x-old.x,z:point.z+arena.z-old.z};if(!obstacles.some(o=>obstacleDistance(candidate,o)<.9))return candidate;for(let radius=3;radius<=42;radius+=3)for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:candidate.x+Math.cos(a)*radius,z:candidate.z+Math.sin(a)*radius};if(!obstacles.some(o=>obstacleDistance(p,o)<.9))return p;}return{x:arena.x,z:arena.z+11};};
 return{...encounter,field:{...f,p:safe(f.p),enemy:safe(f.enemy),home:{x:arena.x,z:arena.z},aim:safe(f.aim),phase:'recovery',windup:0,recover:Math.max(350,f.recover)}};
}
export function fieldMover(save){
 const obstacles=combatObstacles(save);
 const move=(position,input,budget)=>advanceMotion({position,target:null,route:[]},input,.1,budget*10,obstacles,save.region==='hub'?HUB_PLATFORM.walkRadius:worldRadiusFor(save.region)).position;
 move.lineOfSight=(from,to)=>hasCombatLineOfSight(from,to,obstacles);
 return move;
}
