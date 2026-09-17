export const CITY_LEVELS=Array.from({length:50},(_,i)=>({level:i+1,xp:i===0?0:Math.round(120*Math.pow(i,1.55)),reward:i%10===9?'monument':i%5===4?'district':i%3===2?'style':'building'}));
export const CITY_EVENTS=[
 {id:'market-day',name:'Marché des Liens',minLevel:2,duration:600,reward:{currency:90,xp:35}},
 {id:'training',name:'Entraînement des Gardiens',minLevel:4,duration:480,reward:{xp:60}},
 {id:'heritage-night',name:'Nuit des Héritages',minLevel:6,duration:900,reward:{currency:140,xp:70}},
 {id:'matrix-outage',name:'Panne Matrix',minLevel:8,duration:420,reward:{xp:90}},
 {id:'union-festival',name:'Festival de l’Union',minLevel:10,duration:1200,reward:{currency:240,xp:120}},
];
export function levelForCityXp(xp=0){let level=1;for(const step of CITY_LEVELS)if(xp>=step.xp)level=step.level;else break;return level;}
export function availableCityEvents(level){return CITY_EVENTS.filter(e=>e.minLevel<=level);}
export function completeCityEvent(city,eventId){const event=CITY_EVENTS.find(e=>e.id===eventId);if(!event||event.minLevel>(city.level||1))return city;const xp=(city.xp||0)+(event.reward.xp||0);return{...city,xp,level:levelForCityXp(xp),currency:(city.currency||0)+(event.reward.currency||0),updatedAt:Date.now()};}
