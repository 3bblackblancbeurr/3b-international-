const cross=(ax,az,bx,bz)=>ax*bz-az*bx;
export function cityTrafficJunctions(routes=[]){
 const nodes=[];
 for(let i=0;i<routes.length;i++)for(let j=i+1;j<routes.length;j++){
  const a=routes[i],b=routes[j];if(['bridge','tunnel'].includes(a.kind)||['bridge','tunnel'].includes(b.kind)||['pedestrian','motorway'].includes(a.roadType)||['pedestrian','motorway'].includes(b.roadType))continue;
  const ax=a.x2-a.x1,az=a.z2-a.z1,bx=b.x2-b.x1,bz=b.z2-b.z1,det=cross(ax,az,bx,bz);if(Math.abs(det)<.01)continue;
  const t=cross(b.x1-a.x1,b.z1-a.z1,bx,bz)/det,u=cross(b.x1-a.x1,b.z1-a.z1,ax,az)/det;
  if(t<0||t>1||u<0||u>1)continue;const x=a.x1+t*ax,z=a.z1+t*az;
  if(!nodes.some(n=>Math.hypot(n.x-x,n.z-z)<1))nodes.push({x,z,ux:ax/Math.hypot(ax,az),uz:az/Math.hypot(ax,az),width:Math.max(a.width||4,b.width||4)});
 }
 return nodes;
}
export function cityTrafficLight(node,time){
 const green=[8,12,20].includes(node.green)?node.green:10;
 const gx=node.mode==='x'?green*1.5:node.mode==='z'?green*.75:green;
 const gz=node.mode==='z'?green*1.5:node.mode==='x'?green*.75:green;
 const phase=((time%(gx+gz+8))+gx+gz+8)%(gx+gz+8);
 return phase<gx?'x':phase<gx+2?'x-yellow':phase<gx+4?'stop':phase<gx+gz+4?'z':phase<gx+gz+6?'z-yellow':'stop';
}
export function createCityTraffic(routes=[],signals=[],roadPlan=routes){
 const crossings=cityTrafficJunctions(roadPlan);
 // A junction is controlled only after the mayor installs and saves its signals.
 const junctions=signals.flatMap(s=>{const node=crossings.find(n=>Math.hypot(n.x-s.x,n.z-s.z)<1);return node?[{...node,...s}]:[];});
 const vehicles=routes.map((route,i)=>{const length=Math.hypot(route.x2-route.x1,route.z2-route.z1);return {route,index:i,length,ux:(route.x2-route.x1)/length,uz:(route.z2-route.z1)/length,distance:0,speed:length/Math.max(4,route.duration),size:route.vehicleType==='bus'?2.3:route.vehicleType==='scooter'?.8:1,waiting:false,hold:i*.9};});
 return {junctions,vehicles,time:0};
}
const position=v=>({x:v.route.x1+v.ux*v.distance+v.uz*(v.route.laneOffset||0),z:v.route.z1+v.uz*v.distance-v.ux*(v.route.laneOffset||0)});
export function stepCityTraffic(state,seconds){
 const dt=Math.max(0,Math.min(.1,seconds));state.time+=dt;
 // Front vehicles advance first. Followers see the current leader and preserve a bumper gap.
 const ordered=[...state.vehicles].sort((a,b)=>b.distance/b.length-a.distance/a.length);
 for(const v of ordered){if(!Number.isFinite(v.length)||v.length<.1)continue;
  v.waiting=false;if(v.hold>0){v.hold=Math.max(0,v.hold-dt);v.waiting=true;continue;}
  const p=position(v);let limit=v.length;
  for(const n of state.junctions){const dx=n.x-v.route.x1,dz=n.z-v.route.z1,along=dx*v.ux+dz*v.uz;if(along<=v.distance||along>v.length||Math.abs(dx*v.uz-dz*v.ux)>.8)continue;
   const orientation=Math.abs(v.ux*(n.ux??1)+v.uz*(n.uz??0))>.7?'x':'z';if(cityTrafficLight(n,state.time)!==orientation)limit=Math.min(limit,Math.max(0,along-(n.width||4)/2-.8-v.size*.5));
  }
  for(const other of state.vehicles){
   if(other!==v&&other.hold<=0&&Math.abs(v.ux*other.ux+v.uz*other.uz)<.8){
    const q=position(other),along=(q.x-p.x)*v.ux+(q.z-p.z)*v.uz,lateral=Math.abs((q.x-p.x)*v.uz-(q.z-p.z)*v.ux);
    if(along>0&&along<3&&lateral<(v.size+other.size)*.5+.5&&(other.index<v.index||lateral<.4))limit=Math.min(limit,v.distance+Math.max(0,along-(v.size+other.size)*.5-.5));
   }
if(other===v||other.hold>0&&other.distance===0)continue;
   if(v.ux*other.ux+v.uz*other.uz<.95)continue;
   const q=position(other),dx=q.x-p.x,dz=q.z-p.z,ahead=dx*v.ux+dz*v.uz,lateral=Math.abs(dx*v.uz-dz*v.ux);
   if(ahead>0&&lateral<.8)limit=Math.min(limit,v.distance+Math.max(0,ahead-(v.size+other.size)*.5-.55));
  }
  const before=v.distance;v.distance=Math.max(v.distance,Math.min(limit,v.distance+v.speed*dt));v.waiting=v.distance-before<v.speed*dt*.2;
  if(v.distance>=v.length-.001){const startFree=state.vehicles.every(o=>o===v||Math.hypot(position(o).x-v.route.x1,position(o).z-v.route.z1)>(v.size+o.size)*.5+.8);if(startFree){v.distance=0;v.hold=v.route.vehicleType==='bus'?3:.6;}}
 }
 return state.vehicles.map(v=>({index:v.index,phase:v.length?v.distance/v.length:0,waiting:v.waiting||v.hold>0,visible:v.hold<=0}));
}
