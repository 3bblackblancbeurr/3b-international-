import {COUNTRY_PORTALS,HUB_DISTRICTS} from './catalog.js';

export const HUB_BOUNDS=Object.freeze({minX:-800,maxX:800,minZ:-650,maxZ:650,width:1600,depth:1300,unit:'metres'});
export const HUB_CELL_SIZE=200;

export const DISTRICT_LAYOUT=Object.freeze({
 'heritage-square':{x:0,z:80,elevation:0,radius:115,landmark:'Place de l’Héritage'},
 'broken-circle':{x:0,z:-165,elevation:18,radius:105,landmark:'Tour du Cercle Brisé'},
 archives:{x:-330,z:-245,elevation:28,radius:130,landmark:'Archives de la Mémoire'},
 community:{x:-255,z:-20,elevation:8,radius:120,landmark:'Maison de la Communauté'},
 arena:{x:310,z:-45,elevation:14,radius:135,landmark:'Arène 3B'},
 commerce:{x:265,z:170,elevation:4,radius:125,landmark:'Maison 3B'},
 innovation:{x:330,z:-285,elevation:42,radius:130,landmark:'Centre de Données Matrix'},
 docks:{x:-125,z:410,elevation:-6,radius:150,landmark:'Gare maritime'},
 'unity-gardens':{x:-410,z:290,elevation:16,radius:145,landmark:'Mémorial des Ouvriers'},
 'city-3b':{x:235,z:410,elevation:2,radius:145,landmark:'Portail Ville 3B'},
});

export const PORTAL_LAYOUT=Object.freeze({
 france:{x:-650,z:-255,elevation:42,facing:1.05},
 algerie:{x:645,z:430,elevation:18,facing:-2.25},
 maroc:{x:-655,z:250,elevation:10,facing:.72},
 tunisie:{x:650,z:230,elevation:24,facing:-2.55},
 espagne:{x:-650,z:-30,elevation:20,facing:.2},
 italie:{x:630,z:-40,elevation:38,facing:-2.9},
 turquie:{x:610,z:-390,elevation:64,facing:-2.35},
 estonie:{x:-165,z:-545,elevation:58,facing:1.55},
});

export const TIER_ZERO_BUILDINGS=Object.freeze([
 {id:'building-heritage-arrival',district:'heritage-square',x:0,z:80,width:150,depth:120,height:24,interior:false},
 {id:'building-broken-circle-tower',district:'broken-circle',x:0,z:-165,width:78,depth:78,height:280,interior:true},
 {id:'building-archives',district:'archives',x:-330,z:-245,width:145,depth:110,height:52,interior:true},
 {id:'building-express-station',district:'docks',x:-205,z:350,width:120,depth:48,height:24,interior:true},
 {id:'building-maritime-station',district:'docks',x:-100,z:455,width:150,depth:72,height:28,interior:true},
 {id:'building-france-gate',district:'archives',x:-650,z:-255,width:60,depth:34,height:88,interior:false},
 {id:'building-algeria-gate',district:'docks',x:645,z:430,width:68,depth:38,height:94,interior:false},
 {id:'building-city-3b-portal',district:'city-3b',x:235,z:410,width:138,depth:100,height:46,interior:true},
]);

export const TRAIN_TRACK=Object.freeze([
 {x:0,z:115,stop:'heritage-square'},
 {x:45,z:-135,stop:'broken-circle'},
 {x:-280,z:-300,stop:'archives'},
 {x:-380,z:-30,stop:'community'},
 {x:-440,z:280,stop:'unity-gardens'},
 {x:-190,z:430,stop:'docks'},
 {x:225,z:455,stop:'city-3b'},
 {x:380,z:175,stop:'commerce'},
 {x:405,z:-55,stop:'arena'},
 {x:345,z:-360,stop:'innovation'},
 {x:45,z:-135,stop:'broken-circle'},
 {x:0,z:115,stop:'heritage-square'},
]);

export const BOAT_ROUTE=Object.freeze([
 {x:-95,z:500,stop:'docks'},
 {x:25,z:540},
 {x:205,z:500,stop:'city-3b'},
 {x:35,z:300,stop:'heritage-square'},
 {x:-300,z:410,stop:'unity-gardens'},
 {x:-95,z:500,stop:'docks'},
]);

export const CABLE_ROUTES=Object.freeze([
 {id:'cable-north',from:{x:20,z:40,y:20},to:{x:330,z:-285,y:78}},
 {id:'cable-west',from:{x:-125,z:410,y:14},to:{x:0,z:-165,y:108}},
 {id:'cable-gardens',from:{x:-410,z:290,y:32},to:{x:-330,z:-245,y:66}},
]);

export const ZIPLINE_ROUTES=Object.freeze([
 {id:'zip-archives',from:{x:-330,z:-245,y:78},to:{x:-40,z:60,y:15}},
 {id:'zip-arena',from:{x:310,z:-45,y:58},to:{x:265,z:170,y:20}},
 {id:'zip-gardens',from:{x:-410,z:290,y:64},to:{x:-125,z:410,y:10}},
]);

export const TRAVEL_SPEEDS=Object.freeze({walk:4.6,run:7.2,sprint:9.2,vehicle:18,train:28,boat:14,'cable-car':10,zipline:22});
export const distance2D=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const travelSeconds=(a,b,mode='walk')=>distance2D(a,b)/(TRAVEL_SPEEDS[mode]||TRAVEL_SPEEDS.walk);

export function validateHubLayout(){
 const errors=[],districtIds=new Set(HUB_DISTRICTS.map(d=>d.id));
 const inside=p=>p.x>=HUB_BOUNDS.minX&&p.x<=HUB_BOUNDS.maxX&&p.z>=HUB_BOUNDS.minZ&&p.z<=HUB_BOUNDS.maxZ;
 for(const [id,point] of Object.entries(DISTRICT_LAYOUT)){if(!districtIds.has(id))errors.push(`Quartier de layout inconnu : ${id}.`);if(!inside(point))errors.push(`Quartier hors limites : ${id}.`);}
 for(const portal of COUNTRY_PORTALS){const point=PORTAL_LAYOUT[portal.code];if(!point)errors.push(`Position manquante pour la porte ${portal.code}.`);else if(!inside(point))errors.push(`Porte hors limites : ${portal.code}.`);}
 const portals=Object.entries(PORTAL_LAYOUT);for(let i=0;i<portals.length;i++)for(let j=i+1;j<portals.length;j++)if(distance2D(portals[i][1],portals[j][1])<180)errors.push(`Portes trop proches : ${portals[i][0]} et ${portals[j][0]}.`);
 for(const building of TIER_ZERO_BUILDINGS){if(!districtIds.has(building.district))errors.push(`Bâtiment ${building.id} lié à un quartier inconnu.`);if(!inside(building))errors.push(`Bâtiment hors limites : ${building.id}.`);if(building.width<=0||building.depth<=0||building.height<=0)errors.push(`Dimensions invalides : ${building.id}.`);}
 if(TRAIN_TRACK[0].x!==TRAIN_TRACK.at(-1).x||TRAIN_TRACK[0].z!==TRAIN_TRACK.at(-1).z)errors.push('La voie du 3B Express doit être fermée.');
 if(BOAT_ROUTE[0].stop!=='docks'||BOAT_ROUTE.at(-1).stop!=='docks')errors.push('La Ligne des Reflets doit partir et revenir aux Docks.');
 return errors;
}
