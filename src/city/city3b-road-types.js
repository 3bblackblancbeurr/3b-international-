// Width is part of the road model, never a free drawing parameter.
export const CITY_ROAD_TYPES=Object.freeze([
 {id:'pedestrian',label:'Chemin piéton',width:2,level:1,speed:0,lanes:0,color:0xc9bfaa},
 {id:'dirt',label:'Chemin de terre',width:3,level:1,speed:2,lanes:1,color:0x9b8061},
 {id:'simple',label:'Route simple',width:4,level:1,speed:4,lanes:2,color:0x555f63},
 {id:'oneway',label:'Sens unique',width:4,level:2,speed:5,lanes:1,color:0x4e5a62},
 {id:'double',label:'Double sens',width:8,level:3,speed:6,lanes:2,color:0x485660},
 {id:'motorway',label:'Autoroute',width:10,level:5,speed:9,lanes:4,color:0x414d56},
].map(Object.freeze));
export const cityRoadType=id=>CITY_ROAD_TYPES.find(t=>t.id===id)||CITY_ROAD_TYPES[2];
export const cityRoadLaneOffset=(road,index=0)=>{
 const model=cityRoadType(road.roadType);
 if(model.id==='oneway')return 0;
 if(model.id==='dirt')return .65;
 if(model.id==='motorway')return index%2?3.4:1.3;
 return Math.max(.45,Number(road.width||model.width)*.25);
};
