import {hubBuildingService,HUB_BUILDING_PANEL_TARGETS,HUB_BUILDING_ROUTE_TARGETS} from './building-services.js';

// Interiors are presentation cells. Visiting a desk never awards progress or
// invents an account capability: it opens the existing, authorised service.
const THEMES=Object.freeze({
 tower_circle:'circle',heritage_welcome:'welcome',mission_hotel:'mission',
 memory_archives:'archive',living_cards_gallery:'gallery',arena_3b:'arena',
 mobility_center:'mobility',house_3b:'textile',garage_3b:'garage',
 community_house:'community',ai_textile_lab:'textile',mode3_studio:'textile',
 central_marina:'marina',shipyard_3b:'marina',train_station:'mobility',
 workers_memorial:'memory',wildlife_refuge:'garden',city_planning_office:'planning',city_gallery:'gallery',
});
export const HUB_INTERIOR_BOUNDS=Object.freeze({width:20,depth:24,radius:16});

export function hubInteriorSpec(building,save){
 const id=typeof building==='string'?building:building?.buildingId||building?.id;
 const service=hubBuildingService({buildingId:id},save);
 if(!service||!THEMES[id])return null;
 const actions=service.actions.filter(action=>action.kind==='panel'?HUB_BUILDING_PANEL_TARGETS.includes(action.target):action.kind==='route'&&HUB_BUILDING_ROUTE_TARGETS.includes(action.target)).slice(0,4);
 return {...service,theme:THEMES[id],bounds:HUB_INTERIOR_BOUNDS,
  entry:{x:0,z:7},
  items:[{id:'hub:interior:exit',type:'hubInteriorExit',name:'Sortir dans la Cité',actions:['enter'],x:0,z:9.6,range:3.2},
   ...actions.map((action,index)=>({id:'hub:interior:desk:'+index,type:'hubInteriorDesk',name:action.label,actions:['use'],action,
    x:(index%2===0?-1:1)*5.7,z:index<2?-4.5:3,range:3.4})),
  ],
 };
}

export function hubInteriorObstacles(spec){
 if(!spec)return[];const {width,depth}=spec.bounds;
 return [{x:0,z:-depth/2,width:width+.4,depth:.5},{x:-width/2,z:0,width:.5,depth},{x:width/2,z:0,width:.5,depth},
  // The front wall stays solid for navigation; the exit is an explicit action.
  {x:0,z:depth/2,width:width+.4,depth:.5},
  ...spec.items.filter(item=>item.type==='hubInteriorDesk').map(item=>({x:item.x,z:item.z,width:2.8,depth:1.4})),
  {x:0,z:-8.7,width:4.2,depth:2.2},
 ];
}

export function hubInteriorAction(item){
 if(item?.type!=='hubInteriorDesk')return null;const action=item.action;
 if(action?.kind==='panel'&&HUB_BUILDING_PANEL_TARGETS.includes(action.target))return action;
 if(action?.kind==='route'&&HUB_BUILDING_ROUTE_TARGETS.includes(action.target))return action;
 return null;
}
