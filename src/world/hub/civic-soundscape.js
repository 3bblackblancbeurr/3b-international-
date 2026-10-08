import {spatialAudio} from '../audio-spatial.js';
import {HUB_SCALE,PLATFORM_DISTRICTS,platformBuilding,platformInteriorAt} from './platform-layout.js';
import {CITE_ISLANDS,CITE_BRIDGES,CITE_CONNECTORS,citeIslandRadius} from './platform-topology.js';
import plan from './data/hub-master-plan-v2.json' with {type:'json'};
import {roomFurniturePlan} from './interior-furnishings.js';

const buildings=plan.buildings.map(platformBuilding);
const floorSurfaces=buildings.flatMap(b=>roomFurniturePlan({...b,buildingX:b.buildingX/HUB_SCALE,buildingZ:b.buildingZ/HUB_SCALE,width:b.width/HUB_SCALE,depth:b.depth/HUB_SCALE,height:b.height/1.5}).floorSurfaces.map(f=>({...f,x:f.x*HUB_SCALE,z:f.z*HUB_SCALE,width:f.width*HUB_SCALE,depth:f.depth*HUB_SCALE,buildingId:b.buildingId})));
const DISTRICT_SOUNDS={
 archives:['Feuilles et rayonnages',960,.014,'memory_archives'],arena:['Activité de l’Arène',470,.018,'arena_3b'],
 commerce:['Ateliers et marché',740,.020,'house_3b'],community:['Place des rencontres',610,.014,'community_house'],
 innovation:['Relais des ateliers',140,.015,'ai_textile_lab'],docks:['Machines du port',190,.017,'shipyard_3b'],
 gardens:['Feuillage des jardins',2100,.014,null],city3b_portal:['Galerie des Bâtisseurs',860,.012,'city_gallery'],
};

/** Sources use the very same coast and district coordinates as the playable geometry.
 * The nearest four are rendered; walking never creates an unbounded audio graph. */
export const HUB_AMBIENT_SOURCES=Object.freeze([
 ...CITE_ISLANDS.filter(i=>!['nexus','arrival'].includes(i.id)).slice(0,20).map(island=>{
  const angle=Math.atan2(island.z,island.x),r=citeIslandRadius(island,angle)+.15;
  return Object.freeze({id:'cascade:'+island.id,kind:'water',name:'Cascade',x:(island.x+Math.cos(angle)*r)*HUB_SCALE,z:(island.z+Math.sin(angle)*r)*HUB_SCALE,radius:74,frequency:1050,volume:.085});
 }),
 Object.freeze({id:'fountain:nexus',kind:'water',name:'Fontaine du Cercle',x:0,z:0,radius:60,frequency:1550,volume:.045}),
 Object.freeze({id:'machine:broken-circle',kind:'machine',name:'Résonance du Cercle Brisé',x:0,z:0,radius:96,frequency:78,volume:.032}),
 // The living quarters share the exact physical coordinates used for the map,
 // collisions and NPC activity. These are quiet spatial beds, not synthetic voices.
 Object.freeze({id:'life:welcome',kind:'activity',name:'Passants de la Place',...PLATFORM_DISTRICTS.heritage_square,radius:66,frequency:630,volume:.014}),
 Object.freeze({id:'life:gardens',kind:'nature',name:'Oiseaux des Jardins',...PLATFORM_DISTRICTS.gardens,radius:86,frequency:2250,volume:.016}),
 Object.freeze({id:'life:marina',kind:'activity',name:'Équipages de la Marina',...PLATFORM_DISTRICTS.docks,radius:72,frequency:510,volume:.015}),
 ...Object.entries(DISTRICT_SOUNDS).map(([id,[name,frequency,volume,buildingId]])=>{
  const room=buildings.find(b=>b.buildingId===buildingId),position=room?{x:room.buildingX,z:room.buildingZ}:PLATFORM_DISTRICTS[id];
  return Object.freeze({id:'district:'+id,kind:id==='innovation'||id==='docks'?'machine':'activity',name,...position,buildingId,radius:48,frequency,volume});
 }),
]);

export function hubAmbientFrame(listener,{interior=null,phase='day',weather='clear',limit=4}={}){
 interior=typeof interior==='string'?{id:interior}:interior;
 const night=phase==='night',indoors=!!interior;
 const sources=HUB_AMBIENT_SOURCES.map(source=>{
  const spatial=spatialAudio(listener,source,source.radius);
  const sameRoom=source.buildingId&&source.buildingId===interior?.id;
  const indoorFactor=indoors?(source.kind==='water'?.10:source.kind==='nature'?.08:sameRoom?.85:.2):1;
  const dayFactor=source.kind==='nature'?(night?.10:phase==='dawn'?.60:1):night&&source.kind==='activity'?.35:1;
  const wet=['rain','heavy_rain','storm','snow'].includes(weather);
  const weatherFactor=source.kind==='water'&&wet?1.12:wet&&source.kind==='nature'?.12:wet&&source.kind==='activity'?.58:1;
  return {...source,...spatial,gain:spatial.gain*source.volume*indoorFactor*dayFactor*weatherFactor};
 }).filter(source=>source.gain>.0004).sort((a,b)=>b.gain-a.gain).slice(0,Math.max(0,Math.min(4,limit)));
 return {sources,caption:sources[0]?.gain>.006?sources[0].name:null};
}

/** Bridge decks and islands both carry real stone paving. The bridge substructure
 * adds a lower resonance; it does not turn the visible paving into metal flooring. */
export function hubFootstepSurface(position={x:0,z:0},interior=null){
 const room=typeof interior==='string'?buildings.find(b=>b.buildingId===interior):typeof interior==='object'&&interior?.id?buildings.find(b=>b.buildingId===interior.id):platformInteriorAt(position,buildings);
 const rug=room&&floorSurfaces.find(f=>f.buildingId===room.buildingId&&Math.abs(position.x-f.x)<f.width/2&&Math.abs(position.z-f.z)<f.depth/2);
 if(rug)return {id:'woven-runner',frequency:1700,pitch:96,volume:.016,duration:.055};
 if(room||interior)return {id:'interior-stone',frequency:520,pitch:100,volume:.050,duration:.07};
 const x=position.x/HUB_SCALE,z=position.z/HUB_SCALE;
 const island=CITE_ISLANDS.some(i=>Math.hypot(x-i.x,z-i.z)<citeIslandRadius(i,Math.atan2(z-i.z,x-i.x)));
 const bridge=!island&&[...CITE_BRIDGES,...CITE_CONNECTORS].some(b=>{
  const dx=x-b.x,dz=z-b.z,c=Math.cos(b.angle),s=Math.sin(b.angle);
  return Math.abs(dx*c+dz*s)<b.length/2&&Math.abs(-dx*s+dz*c)<b.width/2;
 });
 return bridge?{id:'bridge-stone',frequency:730,pitch:84,volume:.041,duration:.09}:{id:'paving',frequency:1450,pitch:132,volume:.035,duration:.06};
}
