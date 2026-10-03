import {cityOperationalPlacements,cityRoadNetwork} from './city3b-networks.js';
import {segmentDistance} from './city3b-landscape.js';
export const CITY_SPORTS=[{code:'football',name:'Football',pattern:/STADIUM|FOOTBALL/},{code:'basket',name:'Basketball',pattern:/BASKET/},{code:'tennis',name:'Tennis',pattern:/TENNIS/},{code:'swim',name:'Natation',pattern:/POOL|AQUATIC/},{code:'gym',name:'Gymnastique',pattern:/GYM/},{code:'arena',name:'Entraînement en arène',pattern:/ARENA|PLAYGROUND/}];
export function citySportsFacilities(data){
 const roads=cityRoadNetwork(data),population=data.life?.available?Number(data.life.population)||0:0;
 return cityOperationalPlacements(data).map(p=>{const sport=CITY_SPORTS.find(s=>s.pattern.test(p.building_code));if(!sport)return null;const connected=roads.some(r=>segmentDistance(p.center,r)<=14);return {...p,sport,connected,active:connected&&population>0,participants:connected?Math.min(6,Math.floor(population/4)):0};}).filter(Boolean);
}
export function citySportPose(sport,time,index=0){
 const t=time+index*.72,side=index%2?1:-1;
 if(sport==='swim')return {x:-.24+index*.11,z:Math.sin(t*.65)*.30,y:.29,rotation:Math.cos(t*.65)>0?0:Math.PI,limb:Math.sin(t*4)*.65};
 if(sport==='tennis')return {x:Math.sin(t*.7)*.22,z:side*.27,y:.28,rotation:side>0?Math.PI:0,limb:Math.sin(t*3)*.6};
 if(sport==='basket')return {x:Math.sin(t*.8)*.25,z:Math.cos(t*.8)*.23,y:.28+Math.max(0,Math.sin(t*1.6))*.16,rotation:t*.8,limb:Math.sin(t*2.5)*.7};
 if(sport==='gym')return {x:side*.16,z:Math.sin(t*.5)*.1,y:.28+Math.abs(Math.sin(t*1.5))*.12,rotation:Math.PI/2,limb:Math.sin(t*1.5)*.8};
 if(sport==='arena')return {x:side*.19,z:Math.floor(index/2)*.20-.10,y:.28,rotation:side>0?Math.PI/2:-Math.PI/2,limb:Math.sin(t*2)*.8};
 return {x:Math.sin(t*.55)*.29,z:Math.cos(t*.63)*.28,y:.28,rotation:t*.55,limb:Math.sin(t*4)*.6};
}
