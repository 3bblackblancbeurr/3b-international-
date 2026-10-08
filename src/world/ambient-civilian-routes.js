import {HUB_SCALE} from './hub/platform-layout.js';
import {CITE_BRIDGES,CITE_PROMENADES,citeSurfaceDistance} from './hub/platform-topology.js';
import {obstacleDistance} from './collision.js';

const TAU=Math.PI*2;
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const positiveModulo=(n,d)=>(n%d+d)%d;

/** Residents belong to public aisles. The same city coast and collision data
 * protect their feet, including the promenade and its actual bridge crossings. */
export function createCivilianRoutes(items=[],{obstacles=[]}={}){
 const authored=items.filter(item=>item?.type==='hubRoad'&&item.kind!=='express'&&validPoint(item.from)&&validPoint(item.to));
 const candidates=authored.length?authored.map(road=>({...road,kind:'street'})):items.some(item=>item.type==='hubBuilding')?[
  ...CITE_BRIDGES.map(bridge=>{const angle=bridge.angle;return{kind:'district',width:5,from:{x:Math.cos(angle)*49*HUB_SCALE,z:Math.sin(angle)*49*HUB_SCALE},to:{x:Math.cos(angle)*121*HUB_SCALE,z:Math.sin(angle)*121*HUB_SCALE}};}),
  ...CITE_PROMENADES.flatMap((ring,r)=>Array.from({length:8},(_,i)=>({kind:r?'horizon':'promenade',width:3,arc:true,radius:(ring.inner+2.6)*HUB_SCALE,startAngle:i*TAU/8,endAngle:(i+1)*TAU/8}))),
 ]:[];
 const routes=[];
 for(const route of candidates){
  const length=route.arc?route.radius*(route.endAngle-route.startAngle):Math.hypot(route.to.x-route.from.x,route.to.z-route.from.z);
  if(length<8)continue;
  const bounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};
  for(let i=0;i<=8;i++){const p=civilianRoutePoint({...route,length},i/8);bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);bounds.minZ=Math.min(bounds.minZ,p.z);bounds.maxZ=Math.max(bounds.maxZ,p.z);}
  const nearObstacles=obstacles.filter(o=>{
   if(o.enabled===false)return false;if(typeof o.surfaceDistance==='function')return true;
   const extent=(o.width?Math.hypot(o.width,o.depth)/2:o.r||0)+3;
   return o.x+extent>=bounds.minX&&o.x-extent<=bounds.maxX&&o.z+extent>=bounds.minZ&&o.z-extent<=bounds.maxZ;
  });
  // Split around static furniture once during construction. Runtime simulation
  // has no path search, and never walks a resident through a building or railing.
  const samples=Math.max(2,Math.ceil(length/2)),clear=t=>{
   const p=civilianRoutePoint({...route,length},t,0);
   return (authored.length||citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)<-.9/HUB_SCALE)&&!nearObstacles.some(o=>obstacleDistance(p,o)<1.05);
  };
  let start=null;
  for(let i=0;i<=samples;i++){
   const t=i/samples,open=clear(t);
   if(open&&start===null)start=t;
   if(start!==null&&(!open||i===samples)){
    const end=open?t:(i-1)/samples;
    if((end-start)*length>=12){
     if(route.arc)routes.push({...route,startAngle:route.startAngle+(route.endAngle-route.startAngle)*start,endAngle:route.startAngle+(route.endAngle-route.startAngle)*end,length:(end-start)*length,obstacles:nearObstacles});
     else routes.push({...route,from:civilianRoutePoint({...route,length},start,0),to:civilianRoutePoint({...route,length},end,0),length:(end-start)*length,obstacles:nearObstacles});
    }
    start=null;
   }
  }
 }
 // Interleave district aisles and promenades so a bounded mobile population
 // inhabits several quarters instead of filling the first four identical lines.
 const districts=routes.filter(route=>['district','street'].includes(route.kind)),walks=routes.filter(route=>!['district','street'].includes(route.kind)),ordered=[];
 for(let i=0;i<Math.max(districts.length,walks.length);i++){if(districts[i])ordered.push(districts[i]);if(walks[i])ordered.push(walks[i]);}
 return ordered;
}

export function civilianRoutePoint(route,t,offset=0){
 if(route.arc){const a=route.startAngle+(route.endAngle-route.startAngle)*t,r=route.radius+offset;return{x:Math.cos(a)*r,z:Math.sin(a)*r,dx:-Math.sin(a),dz:Math.cos(a)};}
 const dx=route.to.x-route.from.x,dz=route.to.z-route.from.z,len=Math.hypot(dx,dz)||1;
 return{x:route.from.x+dx*t-dz/len*offset,z:route.from.z+dz*t+dx/len*offset,dx:dx/len,dz:dz/len};
}

/** Rank already collision-checked public paths by proximity to the visitor.
 * Reuse the existing paths; never introduce shortcuts through houses, rails or water.
 * A bounded pool can therefore follow the active quarter without spawning meshes. */
export function nearbyCivilianRoutes(routes=[],position={x:0,z:0},radius=210,limit=48){
 const x=Number.isFinite(position.x)?position.x:0,z=Number.isFinite(position.z)?position.z:0;
 const max=Math.max(12,Number.isFinite(radius)?radius:210),take=Math.max(1,Math.min(192,Math.floor(limit)||1));
 const ranked=routes.map((route,index)=>{
  // Sampling handles straight roads and circular promenades with one stable
  // distance contract, even when the nearest part is at the end of an arc.
  const distance=Math.min(...[0,.25,.5,.75,1].map(t=>{const p=civilianRoutePoint(route,t);return Math.hypot(p.x-x,p.z-z);}));
  return {route,index,distance};
 }).sort((a,b)=>a.distance-b.distance||a.index-b.index);
 // A visitor at a gate must still see nearby walkers even if all walks
 // are farther than the soft radius. Do not move the pedestrian paths.
 const nearby=ranked.filter(row=>row.distance<=max+18);
 return (nearby.length?nearby:ranked).slice(0,take).map(row=>row.route);
}

/** Independent civilian rhythm: a walk, a short look around, the return trip.
 * No mission IDs, interaction bubbles, saved progression or skeleton per person. */
export function civilianRoutine(agent,time,moving=true){
 const travel=agent.route.length/agent.speed,pause=agent.pause||4,cycle=2*(travel+pause),clock=positiveModulo(agent.phase*cycle+(moving?time:0),cycle);
 let t,direction,remaining;
 if(clock<travel){t=clock/travel;direction=1;remaining=Math.min(clock,travel-clock);}
 else if(clock<travel+pause){t=1;direction=1;remaining=0;}
 else if(clock<2*travel+pause){t=1-(clock-travel-pause)/travel;direction=-1;remaining=Math.min(clock-travel-pause,2*travel+pause-clock);}
 else{t=0;direction=-1;remaining=0;}
 const gait=moving?Math.min(1,Math.max(0,remaining/.4)):0;
 return{...civilianRoutePoint(agent.route,t,agent.offset||0),t,direction,gait,activity:gait>.1?'walking':agent.activity||'looking',speed:agent.speed*gait};
}
