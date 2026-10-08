import {HUB_SCALE} from './hub/platform-layout.js';
import {CITE_TERRACES} from './hub/terraces.js';

const error=(name,message)=>Object.assign(Error(message),{name});
const coordinates=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
export function serializeRouteObstacles(obstacles,towerFloor){
 return obstacles.map(o=>{
  const data=Object.fromEntries(['id','region','x','z','r','width','depth','rotation','enabled'].filter(key=>o[key]!==undefined).map(key=>[key,o[key]]));
  if(typeof o.surfaceDistance!=='function')return data;
  if(o.id==='cite-water-boundary')return{id:o.id,enabled:o.enabled,routeShape:'water',scale:HUB_SCALE};
  if(o.id==='tower-upper-floor-boundary'){
   if(o.enabled===false)return{id:o.id,enabled:false};
   if(coordinates(towerFloor)&&Number.isFinite(towerFloor.width)&&Number.isFinite(towerFloor.depth))return{id:o.id,enabled:o.enabled,routeShape:'inside',bounds:{x:towerFloor.x,z:towerFloor.z,width:towerFloor.width-.4*HUB_SCALE,depth:towerFloor.depth-.4*HUB_SCALE}};
  }
  const match=String(o.id).match(/^belvedere-(\d+)-(?:rail-(-?1)-(-3|7)|end)$/),t=match&&CITE_TERRACES[Number(match[1])];
  if(t){
   const along=match[2]?Number(match[3]):10,across=match[2]?Number(match[2])*3.3:0;
   return{id:o.id,enabled:o.enabled,x:(t.x+Math.cos(t.angle)*along-Math.sin(t.angle)*across)*HUB_SCALE,z:(t.z+Math.sin(t.angle)*along+Math.cos(t.angle)*across)*HUB_SCALE,width:(match[2]?(along===-3?14:6):.24)*HUB_SCALE,depth:(match[2] ? .24 : 6.8)*HUB_SCALE,rotation:-t.angle};
  }
  throw error('UnsupportedObstacleError','Route collision cannot be transferred: '+(o.id||'unnamed'));
 });
}

export function createRoutePlanner({workerFactory}={}){
 let worker=null,pending=null,sequence=0,disposed=false,lastError=null;
 const fail=problem=>{lastError=problem.message;const request=pending;pending=null;worker?.terminate();worker=null;request?.reject(problem);};
 const cancel=()=>{sequence++;if(pending){const request=pending;pending=null;worker?.terminate();worker=null;request.reject(error('AbortError','Route calculation cancelled.'));}};
 const ensureWorker=()=>{
  if(worker)return worker;
  const instance=worker=workerFactory?workerFactory():new Worker(new URL('./route-planner.worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{if(worker!==instance||!pending||data.id!==pending.id)return;if(data.error){fail(Error(data.error));return;}const request=pending;pending=null;lastError=null;request.resolve(data.path);};
  worker.onerror=event=>{if(worker!==instance)return;event.preventDefault?.();fail(Error(event.message||'Route worker failed.'));};
  worker.onmessageerror=()=>{if(worker===instance)fail(Error('Route worker message could not be read.'));};
  return worker;
 };
 return{
  async plan({start,destination,item,interaction=false,obstacles,radius,towerFloor}){
   cancel();if(disposed)throw error('InvalidStateError','Route planner is disposed.');destination=item||destination;
   let packet;try{if(!coordinates(start)||!coordinates(destination)||!Array.isArray(obstacles)||!Number.isFinite(radius)||radius<=0)throw TypeError('Invalid route request.');packet=serializeRouteObstacles(obstacles,towerFloor);}catch(problem){lastError=problem.message;throw problem;}const id=++sequence;
   return new Promise((resolve,reject)=>{try{const active=ensureWorker();pending={id,resolve,reject};active.postMessage({id,start:{x:start.x,z:start.z},destination:{x:destination.x,z:destination.z,type:destination.type},interaction,obstacles:packet,radius});}catch(problem){fail(problem);reject(problem);}});
  },
  cancel,
  dispose(){cancel();worker?.terminate();worker=null;disposed=true;},
  status(){return{pending:!!pending,disposed,available:!!workerFactory||typeof Worker!=='undefined',error:lastError};},
 };
}
