import {createTerrainField,landscapeItems,toLandscape,BIOMES,WORLD_RADIUS} from './terrain.js';
import {heritageObstacles,LANDMARK_SITE} from './heritage.js';
import {parisWalls} from './paris-layout.js';
import {advanceMotion} from './motion.js';
import {findInteractionPath} from './navigation.js';
import {startField} from './field-combat.js';
import {tournamentItem,tournamentObstacles} from './tournament.js';
import {HUB_PLATFORM} from './hub/platform-layout.js';
import {platformObstacles,HUB_FINAL_POSITION} from './hub/platform-physics.js';
const cache=new Map();
export function combatObstacles(save){
 if(save.region==='hub'){if(!cache.has('hub:platform'))cache.set('hub:platform',platformObstacles());return cache.get('hub:platform');}
 const region=save.region,key=region+':'+(save.adventure.frontier?.[region]?.camp||0);
 if(!cache.has(key)){
  const f=createTerrainField(region,save),landmark=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z),tournament=tournamentItem(save),tournamentCenter=toLandscape(region,tournament.x,tournament.z);
  cache.set(key,[...f.buildings.map(b=>({...b,width:b.width+.4,depth:b.depth+.4})),...f.civic,...f.paris.flatMap(parisWalls),{...f.lake,r:f.lake.r-1},...heritageObstacles(region,landmark,-BIOMES[region].angle),...tournamentObstacles(region,tournamentCenter)]);
  if(cache.size>32)cache.delete(cache.keys().next().value);
 }
 return cache.get(key);
}
export function beginField(save,encounter){
 if(save.region==='hub'&&encounter.final)return startField({x:HUB_FINAL_POSITION.x,z:HUB_FINAL_POSITION.z+11},HUB_FINAL_POSITION);
 const items=landscapeItems(save.region,save),tournament=tournamentItem(save),enemy=encounter.tournament?{...tournament,...toLandscape('france',tournament.x,tournament.z)}:items.find(i=>encounter.final?i.type==='final':encounter.patrol?i.type==='patrol':i.card===encounter.card);
 if(!enemy)return null;
 if(encounter.final)return startField({x:enemy.x,z:enemy.z+11},enemy);
 const obstacles=combatObstacles(save),approach=findInteractionPath({x:0,z:5},enemy,obstacles,WORLD_RADIUS).at(-1)||{x:enemy.x,z:enemy.z+8};
 return startField(approach,enemy);
}
export function fieldMover(save){const obstacles=combatObstacles(save);return(position,input,budget)=>advanceMotion({position,target:null,route:[]},input,.1,budget*10,obstacles,save.region==='hub'?HUB_PLATFORM.walkRadius:WORLD_RADIUS).position;}
