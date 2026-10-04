/** Cartography uses the same physical topology as the playable Cité.
 * All values returned here are world metres; SVG x/y correspond to world x/z.
 * Runtime decoration is supplied by the city builder, never generated twice. */
import * as topology from './platform-topology.js';
import {HUB_SCALE,HUB_PLATFORM,PLATFORM_DISTRICTS,platformBuilding,platformWalls,platformPortal} from './platform-layout.js';
import {CITE_TERRACES} from './terraces.js';
import {HUB_DISTRICT_STORIES} from './platform-life.js';
import hubPlan from './data/hub-master-plan-v2.json' with {type:'json'};

export const HUB_MAP_PALETTE=Object.freeze({
 nexus:'#c3b587',arrival:'#b7a680',archives:'#7e98a1',arena:'#ad896d',commerce:'#b69a70',community:'#91a792',innovation:'#7da8b5',docks:'#8899a0',builders:'#aa9a7d',gardens:'#799a7b',refuge:'#84a58c',station:'#9da4a4','builders-annex':'#a99c83',
});
const metres=p=>({...p,x:p.x*HUB_SCALE,z:p.z*HUB_SCALE});
export function mapFootprint({x,z,width,depth,rotation=0}){
 const c=Math.cos(rotation),s=Math.sin(rotation);
 return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([dx,dz])=>({x:x+c*dx+s*dz,z:z-s*dx+c*dz}));
}
export function mapStructureOutline(site){
 if(site.kind!=='vessel')return mapFootprint(site);
 const c=Math.cos(site.rotation||0),s=Math.sin(site.rotation||0);
 return Array.from({length:6},(_,i)=>{const a=i*Math.PI/3,dx=Math.sin(a)*site.width/2,dz=Math.cos(a)*site.depth/2;return{x:site.x+c*dx+s*dz,z:site.z-s*dx+c*dz};});
}
export function mapIslandOutline(island){
 return Array.from({length:64},(_,i)=>{const angle=i*Math.PI*2/64,r=topology.citeIslandRadius(island,angle);return{x:(island.x+Math.cos(angle)*r)*HUB_SCALE,z:(island.z+Math.sin(angle)*r)*HUB_SCALE};});
}
const normalizeRuntimeSite=p=>p.units==='world'?p:{...p,x:p.x*HUB_SCALE,z:p.z*HUB_SCALE,width:(p.width??6)*HUB_SCALE,depth:(p.depth??6)*HUB_SCALE,r:p.r===undefined?undefined:p.r*HUB_SCALE,height:(p.height??0)*1.5};
export function createHubCartography(items=[],runtime=null){
 const islands=topology.CITE_ISLANDS.map(island=>({...metres(island),r:island.r*HUB_SCALE,outline:mapIslandOutline(island),color:HUB_MAP_PALETTE[island.id]||'#8f9990'}));
 const bridges=topology.CITE_BRIDGES.map((b,i)=>({...metres(b),id:'bridge-'+i,width:b.length*HUB_SCALE,depth:b.width*HUB_SCALE,rotation:-b.angle}));
 const promenades=(topology.CITE_PROMENADES||[{id:'heritage-promenade',inner:119,outer:131}]).map(p=>({...p,inner:p.inner*HUB_SCALE,outer:p.outer*HUB_SCALE}));
 const connectors=(topology.CITE_CONNECTORS||[]).map((p,i)=>({...metres(p),id:p.id||'connector-'+i,width:p.length*HUB_SCALE,depth:p.width*HUB_SCALE,rotation:-p.angle}));
 const avenues=Array.from({length:8},(_,index)=>{const p=platformPortal(index),a=Math.atan2(p.x,p.z);return{id:'avenue-'+index,x:p.x*.56,z:p.z*.56,width:9*HUB_SCALE,depth:116*HUB_SCALE,rotation:a};});
 const terraces=CITE_TERRACES.map(t=>({...metres(t),width:t.length*HUB_SCALE,depth:t.width*HUB_SCALE,rotation:-t.angle,rise:t.rise*1.5}));
 const roomItems=items.filter(i=>i.type==='hubBuilding'&&i.physicalInterior);
 const buildings=(roomItems.length?roomItems:hubPlan.buildings.map(platformBuilding)).map(b=>({id:b.id,name:b.name,district:b.district,x:b.buildingX,z:b.buildingZ,width:b.width,depth:b.depth,height:b.height,entrance:b.entrance,walls:platformWalls(b),interior:b.interior,functions:b.functions,buildingId:b.buildingId}));
 const districts=Object.entries(PLATFORM_DISTRICTS).map(([id,p])=>({id,...p,name:HUB_DISTRICT_STORIES[id]?.name||id,color:HUB_MAP_PALETTE[id]||HUB_MAP_PALETTE.arrival}));
 // The runtime has already applied city transforms to every site when units='world'.
 const runtimeSite=p=>normalizeRuntimeSite({...p,units:p.units||runtime?.units});
 const fabric=(runtime?.fabric||[]).map(runtimeSite);
 const vegetation=(runtime?.vegetation||[]).map(runtimeSite);
 const structures=(runtime?.structures||[]).map(runtimeSite);
 const obstacles=(runtime?.obstacles||[]).filter(p=>!p.surfaceDistance&&Number.isFinite(p.x)&&Number.isFinite(p.z));
 const sceneryExtent=[...fabric,...vegetation,...structures].flatMap(p=>p.r?[Math.abs(p.x)+p.r,Math.abs(p.z)+p.r]:Number.isFinite(p.width)&&Number.isFinite(p.depth)?mapStructureOutline(p).map(q=>Math.max(Math.abs(q.x),Math.abs(q.z))):[Math.abs(p.x),Math.abs(p.z)]);
 const extent=Math.max(HUB_PLATFORM.radius,...promenades.map(p=>p.outer),...sceneryExtent,...islands.flatMap(p=>p.outline.map(q=>Math.max(Math.abs(q.x),Math.abs(q.z)))))+14;
 return{units:'world',islands,bridges,promenades,connectors,avenues,terraces,buildings,districts,fabric,vegetation,structures,obstacles,extent,diameter:HUB_PLATFORM.radius*2};
}
export function hubMapScale(span){const distance=span>500?100:span>250?50:span>140?25:10;return{distance,label:distance+' m'};}
export function hubMapRoute(position,route=[]){
 if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))return[];
 const valid=route.filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z));
 if(!valid.length)return[];
 return [{x:position.x,z:position.z},...valid].reduce((line,p)=>{const last=line.at(-1);if(!last||Math.hypot(last.x-p.x,last.z-p.z)>.001)line.push(p);return line;},[]);
}
export function hubMapCategory(item){
 if(item.type==='portal'||item.type==='hubTransport')return'travel';
 if(item.type==='hubBuilding'||item.type==='hubHeritageFacility'||item.type==='hubLift'||item.type==='atelier')return'services';
 if(item.type==='hubMission'||item.type==='hubMissionAction'||item.type==='hubSecretStep'||item.type==='hubSecret')return'story';
 return'life';
}
export function hubMapDestinations(items,{category='all',query=''}={}){
 const q=query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const hidden=new Set(['echo','final','hubRoad','hubStructure','hubTraffic','hubTransitLink','hubStreetFurniture','hubDistrictTerrace','hubVerticalConnector','hubDistrict','hubWaterFeature','hubSkybridge','hubHeritagePlatform','hubCivicPlaza','hubDistrictLandmark']);
 return items.filter(i=>!hidden.has(i.type)&&i.range!==-1&&Number.isFinite(i.x)&&Number.isFinite(i.z)&&!i.locked&&(!q||[i.name,i.district,...(i.functions||[])].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q))&&(category==='all'||hubMapCategory(i)===category));
}
/** Detail indicators keep the small map readable; a selected destination is never culled. */
export function hubMiniMapMarkers(items,position,halfSpan,waypoint){
 const destinations=hubMapDestinations(items),visible=destinations.filter(i=>Math.abs(i.x-position.x)<halfSpan+10&&Math.abs(i.z-position.z)<halfSpan+10);
 const important=i=>i.id===waypoint?.id?0:i.type==='portal'?1:i.type==='hubBuilding'?2:i.type==='hubTransport'?3:i.type==='hubMissionAction'?4:6;
 return visible.sort((a,b)=>important(a)-important(b)||Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z)).reduce((list,item)=>{
  if(list.length>=22||important(item)>4)return list;
  const spacing=halfSpan/12;
  if(item.id!==waypoint?.id&&list.some(p=>Math.hypot(p.x-item.x,p.z-item.z)<spacing))return list;
  list.push(item);return list;
 },[]);
}

/** Atlas symbols keep their true coordinate and cull crowded lower-priority symbols.
 * Every destination remains selectable in the adjacent list. */
export function hubAtlasMapMarkers(items,halfSpan){
 const rank=i=>i.type==='portal'?0:i.type==='hubBuilding'?1:i.type==='hubTransport'?2:i.type==='hubMissionAction'?3:i.type==='hubMission'?4:5;
 const spacing=Math.max(2,halfSpan/22);
 return [...items].sort((a,b)=>rank(a)-rank(b)).reduce((visible,item)=>{
  if(!visible.some(i=>Math.hypot(i.x-item.x,i.z-item.z)<spacing))visible.push(item);
  return visible;
 },[]);
}
