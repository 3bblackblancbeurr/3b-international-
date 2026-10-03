import {createTerrainField} from './terrain.js';
import {blankSave} from './rules.js';
import {HUB_PLATFORM,HUB_SCALE,platformBuilding,platformPortal} from './hub/platform-layout.js';
import plan from './hub/data/hub-master-plan-v2.json' with {type:'json'};

// The map follows the physical floating deck, not the retired metropolis layout.
export function cartographyField(region){
 if(region!=='hub')return createTerrainField(region,blankSave());
 const basins=[[48,48],[-48,48],[48,-48],[-48,-48]].map(([x,z])=>({x:x*HUB_SCALE,z:z*HUB_SCALE,r:14*HUB_SCALE}));
 const circle=Array.from({length:65},(_,i)=>({x:Math.cos(i*Math.PI/32)*125*HUB_SCALE,z:Math.sin(i*Math.PI/32)*125*HUB_SCALE}));
 return {radius:HUB_PLATFORM.radius,fields:[],civic:[],paris:[],
  lake:{x:0,z:0,r:16*HUB_SCALE},lakes:[...basins,{x:0,z:0,r:16*HUB_SCALE}],
  roads:[{id:'promenade',kind:'street',width:4*HUB_SCALE,points:circle},...Array.from({length:8},(_,i)=>({id:'gate:'+i,kind:'street',width:9*HUB_SCALE,points:[{x:0,z:0},platformPortal(i)]}))],
  squares:Array.from({length:8},(_,i)=>({...platformPortal(i),r:11*HUB_SCALE})),
  buildings:plan.buildings.map(platformBuilding).map(b=>({...b,x:b.buildingX,z:b.buildingZ,rotation:0})),
 };
}
