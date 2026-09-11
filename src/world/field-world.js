import {createTerrainField,landscapeItems,toLandscape,BIOMES,WORLD_RADIUS} from './terrain.js';
import {heritageObstacles,LANDMARK_SITE} from './heritage.js';
import {parisWalls} from './paris-layout.js';
import {advanceMotion} from './motion.js';
import {findInteractionPath} from './navigation.js';
import {startField} from './field-combat.js';
const cache=new Map();
export function combatObstacles(save){
 const region=save.region,key=region+':'+(save.adventure.frontier?.[region]?.camp||0);
 if(!cache.has(key)){
  const f=createTerrainField(region,save),landmark=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z);
  cache.set(key,[...f.buildings.map(b=>({...b,width:b.width+.4,depth:b.depth+.4})),...f.civic,...f.paris.flatMap(parisWalls),{...f.lake,r:f.lake.r-1},...heritageObstacles(region,landmark,-BIOMES[region].angle)]);
  if(cache.size>32)cache.delete(cache.keys().next().value);
 }
 return cache.get(key);
}
export function beginField(save,encounter){
 const items=landscapeItems(save.region,save),enemy=items.find(i=>encounter.patrol?i.type==='patrol':i.card===encounter.card);
 if(!enemy)return null;
 const obstacles=combatObstacles(save),approach=findInteractionPath({x:0,z:5},enemy,obstacles,WORLD_RADIUS).at(-1)||{x:enemy.x,z:enemy.z+8};
 return startField(approach,enemy);
}
export function fieldMover(save){const obstacles=combatObstacles(save);return(position,input,budget)=>advanceMotion({position,target:null,route:[]},input,.1,budget*10,obstacles,WORLD_RADIUS).position;}
