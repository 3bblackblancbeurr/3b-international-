import {obstacleDistance} from './collision.js';

// Furniture stays between the central street and the side walks. This pure
// layout is shared by rendering and the canonical collision/navigation graph.
export function createVillageFurnitureLayout(layout,obstacles=[]){
 const result=[];
 const roadDistance=point=>{
  let distance=Infinity;
  for(const road of layout.roads)for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
   if(!length)continue;
   const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/length));
   distance=Math.min(distance,Math.hypot(point.x-a.x-dx*t,point.z-a.z-dz*t)-road.width/2);
  }
  return distance;
 };
 for(const site of layout.sites.filter(s=>s.kind!=='terminal'&&s.kind!=='guardianCourt'))for(const side of [-1,1])for(const row of [-1,1]){
  const point={x:site.x+side*15,z:site.z+row*17};
  // A broad envelope includes the bench, planter and lamp plus player margin.
  if(roadDistance(point)<3.6||obstacles.some(o=>obstacleDistance(point,o)<3.6))continue;
  result.push({id:site.id+':furniture:'+side+':'+row,site:site.id,region:site.region,...point,rotation:side>0?Math.PI:0,r:2.55,height:4.45,kind:'villageFurniture'});
 }
 return result;
}
