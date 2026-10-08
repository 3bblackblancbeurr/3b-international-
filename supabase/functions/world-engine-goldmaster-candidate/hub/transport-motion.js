import {HUB_SCALE} from './platform-layout.js';
import {CITE_ISLANDS,CITE_PROMENADES,CITE_DOCK_SPANS,citeIslandRadius} from './platform-topology.js';

const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
const finite=value=>Number.isFinite(value)?value:0;
const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z,(b.y||0)-(a.y||0));
const world=(x,z,y=0)=>({x:x*HUB_SCALE,z:z*HUB_SCALE,y});
const freezeRoute=route=>Object.freeze({...route,units:'world',points:Object.freeze(route.points.map(point=>Object.freeze(point))),stops:Object.freeze(route.stops.map(stop=>Object.freeze({...stop,boarding:Object.freeze(stop.boarding||{x:stop.x,z:stop.z,y:0})})))});
// The outer arcade leaves the existing civic buildings and interior services clear.
const rail=CITE_PROMENADES.find(r=>r.id==='horizon-arcade');
const railRadius=(rail.inner+rail.outer)/2;
const trainAngles={heritage_square:69,archives:225,community:180,gardens:135,docks:96,city3b_portal:45,commerce:0,arena:315,innovation:270,broken_circle_tower:249};
const stationOrder=['heritage_square','archives','community','gardens','docks','city3b_portal','commerce','arena','innovation','broken_circle_tower'];
function trainRoute(){
 const points=Array.from({length:192},(_,i)=>{const a=i*Math.PI*2/192;return world(Math.cos(a)*railRadius,Math.sin(a)*railRadius,.62);});
 const stops=stationOrder.map((district,stopIndex)=>{const pointIndex=Math.round(trainAngles[district]/360*points.length)%points.length;return {id:'hub:train:'+district,district,stopIndex,pointIndex,...points[pointIndex]};});
 return freezeRoute({id:'3b-express',line:'3B Express',name:'3B Express',transport:'train',closed:true,boardable:true,heightMode:'track',speed:24,dwellSeconds:3.5,points,stops});
}
function cableRoute(transport,line,from,to,anchors){
 const height=transport==='telepheric'?34:12,points=anchors.map(([x,z],index)=>world(x,z,height+(transport==='zipline'?2*(1-index):0)));
 const stops=[from,to].map((district,stopIndex)=>({id:'hub:'+transport+':'+line+':'+stopIndex,district,stopIndex,pointIndex:stopIndex,...points[stopIndex],boardable:transport!=='zipline'||stopIndex===0}));
 return freezeRoute({id:transport+':'+line,line,name:(transport==='telepheric'?'Téléphérique ':'Tyrolienne ')+line,transport,closed:false,boardable:true,oneWay:transport==='zipline',heightMode:'track',speed:transport==='telepheric'?10:14,dwellSeconds:transport==='telepheric'?3:0,points,stops});
}

/** A conservative coast clearance at sea height. Boats stay outside even the
 * larger upper silhouette, rather than clipping through the narrower cliff base. */
export function referenceWaterClear(point,margin=2.2){
 const x=point.x/HUB_SCALE,z=point.z/HUB_SCALE;
 for(const island of CITE_ISLANDS){
  const dx=x-island.x,dz=z-island.z,d=Math.hypot(dx,dz);
  if(d<island.r*1.15+margin&&d<citeIslandRadius(island,Math.atan2(dz,dx))+margin)return false;
 }
 return true;
}
function waterSegment(a,b){
 const steps=Math.max(1,Math.ceil(distance(a,b)/(2*HUB_SCALE)));
 for(let i=0;i<=steps;i++)if(!referenceWaterClear({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps}))return false;
 return true;
}
function coastPort(district,islandId,angle){
 const island=CITE_ISLANDS.find(i=>i.id===islandId),r=citeIslandRadius(island,angle),c=Math.cos(angle),s=Math.sin(angle);
 const boarding=world(island.x+c*(r-4),island.z+s*(r-4)),mooring=world(island.x+c*(r+7),island.z+s*(r+7),-26.6);
 return {id:'hub:boat:'+district,district,boarding,mooring};
}
export function referenceBoatPorts(){
 const finger=CITE_DOCK_SPANS.find(span=>span.id==='dock-finger-0');
 return [
  {id:'hub:boat:docks',district:'docks',boarding:world(finger.x,finger.z+finger.length/2-5),mooring:world(finger.x-8,finger.z+finger.length/2-5,-26.6)},
  coastPort('gardens','gardens',Math.atan2(17,-45)),
  coastPort('city3b_portal','builders',Math.atan2(39,37)),
  coastPort('commerce','commerce',0),
  // The arrival basin is enclosed by overlapping civic cliffs. Its published
  // boat connection is a real harbour transfer, not a route through that rock.
  {id:'hub:boat:heritage_square',district:'heritage_square',boardingDistrict:'docks',destinationDistrict:'heritage_square',correspondence:'promenade',boarding:world(0,finger.z+finger.length/2-5),mooring:world(-8,finger.z+finger.length/2-5,-26.6)},
 ];
}

// Only authoring-time route construction uses a grid. Sampling a frame never
// allocates a navigation graph or performs an island search.
function waterPath(start,end){
 if(waterSegment(start,end))return [start,end];
 const step=4*HUB_SCALE,bound=290*HUB_SCALE,min=-bound,size=Math.round(bound*2/step)+1,valid=new Map();
 const xy=node=>({x:min+(node%size)*step,z:min+Math.floor(node/size)*step,y:start.y});
 const nodeAt=p=>Math.round((p.z-min)/step)*size+Math.round((p.x-min)/step);
 const usable=node=>{if(node<0||node>=size*size)return false;if(!valid.has(node))valid.set(node,referenceWaterClear(xy(node),3));return valid.get(node);};
 const nearby=p=>{const center=nodeAt(p),candidates=[];for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const node=center+dz*size+dx;if(usable(node)&&waterSegment(p,xy(node)))candidates.push(node);}return candidates.sort((a,b)=>distance(p,xy(a))-distance(p,xy(b)))[0];};
 const first=nearby(start),last=nearby(end);if(first===undefined||last===undefined)throw Error('No clear water approach for '+start.id);
 const open=[{node:first,score:distance(xy(first),xy(last))}],cost=new Map([[first,0]]),came=new Map(),closed=new Set();let found=false;
 while(open.length&&closed.size<14000){
  open.sort((a,b)=>b.score-a.score);const current=open.pop().node;if(closed.has(current))continue;closed.add(current);
  if(current===last){found=true;break;}
  const col=current%size,row=Math.floor(current/size);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const cx=col+dx,cz=row+dz;if(cx<0||cx>=size||cz<0||cz>=size)continue;
   const next=cz*size+cx;if(closed.has(next)||!usable(next)||!waterSegment(xy(current),xy(next)))continue;
   const score=cost.get(current)+step*Math.hypot(dx,dz);if(score>=(cost.get(next)??Infinity))continue;
   cost.set(next,score);came.set(next,current);open.push({node:next,score:score+distance(xy(next),xy(last))});
  }
 }
 if(!found)throw Error('No clear maritime route between '+JSON.stringify(start)+' and '+JSON.stringify(end));
 const nodes=[];for(let n=last;n!==undefined;n=came.get(n))nodes.push(xy(n));nodes.reverse();
 const raw=[start,...nodes,end],path=[start];let i=0;
 while(i<raw.length-1){let next=raw.length-1;while(next>i+1&&!waterSegment(raw[i],raw[next]))next--;path.push(raw[next]);i=next;}
 return path;
}
function boatRoute(){
 const ports=referenceBoatPorts(),points=[],stops=[];
 for(let i=0;i<ports.length;i++){
  const port=ports[i],next=ports[(i+1)%ports.length],path=waterPath(port.mooring,next.mooring);
  const pointIndex=points.length;points.push(...path.slice(0,-1));stops.push({id:port.id,district:port.district,boardingDistrict:port.boardingDistrict||port.district,destinationDistrict:port.destinationDistrict||port.district,correspondence:port.correspondence||null,stopIndex:i,pointIndex,...port.mooring,boarding:port.boarding});
 }
 return freezeRoute({id:'boat-loop',line:'boat-loop',name:'Navette de la Baie des Horizons',transport:'boat',closed:true,boardable:true,heightMode:'sea',speed:16,dwellSeconds:4.2,points,stops});
}
let routes=null;
export function referenceTransportRoutes(){
 if(!routes)routes=Object.freeze([
  trainRoute(),boatRoute(),
  cableRoute('telepheric','T1','docks','broken_circle_tower',[[-9,100],[28,28]]),
  cableRoute('telepheric','T2','gardens','archives',[[-42,70],[-47,-65]]),
  cableRoute('telepheric','T3','commerce','innovation',[[89,-30],[32,-105]]),
  cableRoute('zipline','Z1','broken_circle_tower','heritage_square',[[28,28],[15,44]]),
  cableRoute('zipline','Z2','archives','community',[[-96,-52],[-95,20]]),
  cableRoute('zipline','Z3','arena','commerce',[[95,-50],[125,0]]),
  cableRoute('zipline','Z4','innovation','arena',[[0,-125],[95,-50]]),
  cableRoute('zipline','Z5','gardens','docks',[[-92,64],[-35,115]]),
  cableRoute('zipline','Z6','city3b_portal','docks',[[80,104],[30,121]]),
 ]);
 return routes;
}
export function referenceTransportRoute(item){return referenceTransportRoutes().find(route=>route.transport===item?.transport&&(route.line===(item.line||item.transport)||route.stops.some(stop=>stop.id===item.id)))||null;}
export function referenceTransportNextStop(route,fromId){
 const stops=[...route.stops].sort((a,b)=>a.stopIndex-b.stopIndex),index=stops.findIndex(stop=>stop.id===fromId);if(index<0)return null;
 if(index<stops.length-1)return stops[index+1];
 return route.closed?stops[0]:route.oneWay?null:stops[index-1]||null;
}
export function referenceTransportSite(item){
 const route=referenceTransportRoute(item),stop=route?.stops.find(s=>s.id===item.id)||route?.stops.find(s=>s.district===item.district&&s.stopIndex===item.stopIndex);
 if(!stop)return null;
 const next=route.points[(stop.pointIndex+1)%route.points.length],transportHeading=Math.atan2(next.x-stop.x,next.z-stop.z);
 return {...stop.boarding,routeId:route.id,transportStopId:stop.id,transportHeading,travelX:stop.x,travelZ:stop.z,travelY:stop.y,boardingDistrict:stop.boardingDistrict||stop.district,destinationDistrict:stop.destinationDistrict||stop.district,correspondence:stop.correspondence||null,boardable:stop.boardable!==false,range:4.5};
}

const compiledRoutes=new WeakMap();
function legPoints(route,from,to){
 const start=from.pointIndex,end=to.pointIndex;if(start===end)return [route.points[start]];
 if(route.closed){
  // The express keeps the existing server-approved station order. Its circular
  // track can be used in either direction; take an arc, never a chord through town.
  const count=route.points.length,forward=(end-start+count)%count,direction=route.transport==='train'&&forward>count/2?-1:1;
  const points=[route.points[start]];for(let i=(start+direction+count)%count;i!==end;i=(i+direction+count)%count)points.push(route.points[i]);points.push(route.points[end]);return points;
 }
 const direction=start<end?1:-1,points=[];for(let i=start;i!==end+direction;i+=direction)points.push(route.points[i]);return points;
}
function preparePath(points){const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+distance(points[i-1],points[i]));return {points,lengths,length:lengths.at(-1)};}
function compile(route){
 if(compiledRoutes.has(route))return compiledRoutes.get(route);
 const stops=[...route.stops].sort((a,b)=>a.stopIndex-b.stopIndex),pairs=[];
 for(let i=0;i<stops.length-1;i++)pairs.push([stops[i],stops[i+1]]);
 if(route.closed)pairs.push([stops.at(-1),stops[0]]);else if(!route.oneWay)for(let i=stops.length-1;i>0;i--)pairs.push([stops[i],stops[i-1]]);
 let time=0;const legs=pairs.map(([from,to])=>{const path=preparePath(legPoints(route,from,to)),dwell=Math.max(0,route.dwellSeconds||0),travel=path.length/Math.max(.1,route.speed||6)+2;const leg={from,to,path,start:time,dwell,travel,end:time+dwell+travel};time=leg.end;return leg;});
 const compiled={legs,duration:time};compiledRoutes.set(route,compiled);return compiled;
}
function pathPose(path,travelled){
 if(path.points.length===1)return {...path.points[0],heading:0,segment:0};
 let index=0;while(index<path.lengths.length-2&&path.lengths[index+1]<travelled)index++;
 const a=path.points[index],b=path.points[index+1],fraction=clamp01((travelled-path.lengths[index])/(path.lengths[index+1]-path.lengths[index]||1));
 return {x:a.x+(b.x-a.x)*fraction,z:a.z+(b.z-a.z)*fraction,y:(a.y||0)+((b.y||0)-(a.y||0))*fraction,heading:Math.atan2(b.x-a.x,b.z-a.z),segment:index};
}
function acceleratingDistance(length,t,duration){
 const acceleration=Math.min(2,duration/3),speed=length/(duration-acceleration);
 if(t<acceleration)return speed*t*t/(2*acceleration);
 if(t>duration-acceleration)return length-speed*(duration-t)**2/(2*acceleration);
 return speed*(t-acceleration/2);
}
export function transportRouteDuration(route){return compile(route).duration;}
export function routePose(route,timeSeconds,cycleSeconds=24){
 // Compatibility for ordinary traffic and legacy callers; new hub transit uses
 // the full route object and never draws chords between circular train stops.
 if(Array.isArray(route)){
  if(!route.length)return null;if(route.length===1)return {...route[0],heading:0,segment:0,progress:0};
  const cycle=Number.isFinite(cycleSeconds)&&cycleSeconds>0?cycleSeconds:24,t=((finite(timeSeconds)%cycle)+cycle)%cycle/cycle*route.length,segment=Math.floor(t)%route.length,progress=clamp01(t-Math.floor(t)),a=route[segment],b=route[(segment+1)%route.length],smooth=progress*progress*(3-2*progress);
  return {x:a.x+(b.x-a.x)*smooth,z:a.z+(b.z-a.z)*smooth,heading:Math.atan2(b.x-a.x,b.z-a.z),segment,progress};
 }
 if(!route?.points?.length||!route?.stops?.length)return null;
 const {legs,duration}=compile(route);if(!legs.length)return {...route.points[0],heading:0,segment:0,progress:0,moving:false};
 const elapsed=route.oneWay?Math.max(0,Math.min(duration,finite(timeSeconds))):((finite(timeSeconds)%duration)+duration)%duration,leg=legs.find(l=>elapsed<l.end)||legs.at(-1),t=Math.max(0,elapsed-leg.start-leg.dwell),travelled=acceleratingDistance(leg.path.length,Math.min(leg.travel,t),leg.travel);
 return {...pathPose(leg.path,travelled),progress:clamp01(t/leg.travel),moving:t>0&&t<leg.travel,stopId:t===0?leg.from.id:null,nextStopId:leg.to.id,routeId:route.id};
}
export function sampleTransportRide(route,fromId,toId,progress){
 if(!route?.stops?.length||!route?.points?.length)return null;
 const leg=compile(route).legs.find(entry=>entry.from.id===fromId&&entry.to.id===toId);if(!leg)return null;
 // Boarding transfers use the dry markers in the scene. Interpolating a line
 // from a high quay to a sea-level berth would send the passenger through rock.
 // Reuse the vehicle's cached path, easing and timeline for the actual journey.
 const p=clamp01(progress),time=p*leg.travel;
 return {...pathPose(leg.path,acceleratingDistance(leg.path.length,time,leg.travel)),progress:p,duration:leg.travel*1000,routeTime:leg.start+leg.dwell+time,routeId:route.id};
}
