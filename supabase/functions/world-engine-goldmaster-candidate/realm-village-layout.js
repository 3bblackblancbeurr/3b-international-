import {obstacleDistance} from './collision.js';

// Authored plot families around a shared, walkable village heart. Variation
// changes massing and frontage; it never moves a saved relay or story target.
const PLOTS=[
 [[-37,-36],[-32,-2],[-38,33],[35,-39],[39,-7],[32,37]],
 [[-30,-40],[-42,-7],[-33,35],[40,-34],[32,3],[38,38]],
 [[-39,-35],[-33,5],[-37,39],[31,-42],[41,-4],[32,33]],
];
const siteSeed=site=>[...site.id].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),23)>>>0;
export function createVillageHomes(site){
 const seed=siteSeed(site),plots=PLOTS[seed%PLOTS.length],result=[];
 for(let row=0;row<(site.major?4:3);row++)for(const side of [-1,1]){
  const slot=(side>0?3:0)+row,[px,pz]=row===3?[side*(31+(seed%3)),61+(side>0?3:-2)]:plots[slot];
  const variant=(row+(side>0?2:0)+site.province+seed%3)%5,width=10.8+(variant%3)*1.1,depth=9.8+(variant%2)*.8;
  const toward={x:side*12,z:row===3?34:Math.max(-17,Math.min(25,pz*.55))};
  const floors=['alpine','forest'].includes(site.kind)?1:1+(variant%2),rotation=Math.atan2(toward.x-px,toward.z-pz);
  result.push({id:site.id+':home:'+row+':'+side,site:site.id,region:site.region,x:site.x+px,z:site.z+pz,width,depth,height:floors*5.6+3,floors,rotation,variant,kind:site.kind});
 }
 return result;
}
export function villageDoor(home,padding=0){const distance=home.depth/2+padding;return{x:home.x+Math.sin(home.rotation)*distance,z:home.z+Math.cos(home.rotation)*distance};}
export const villageWalkX=site=>site.major&&site.kind==='wall'?22:20;
export function villageDoorPath(site,home){const door=villageDoor(home,1.2);return[{x:site.x+Math.sign(home.x-site.x)*villageWalkX(site),z:Math.max(site.z-44,Math.min(site.z+(site.major?55:43),door.z))},door];}
export function villageCirculation(site){
 const point=(x,z)=>({x:site.x+x,z:site.z+z}),end=site.major?70:53;
 const lanes=[
  {id:'main',width:12,points:[point(0,end),point(0,36),point(2,18),point(0,8)]},
  ...[-1,1].map(side=>({id:'promenade:'+side,width:3.4,points:[point(side*villageWalkX(site),-46),point(side*villageWalkX(site),site.major?56:45)]})),
  ...[0,24].map(z=>({id:'crossing:'+z,width:3,points:[point(-villageWalkX(site),z),point(villageWalkX(site),z)]})),
 ];
 return {lanes,square:[[-14,-12],[10,-13],[16,-5],[14,12],[3,16],[-15,10],[-17,-2]].map(([x,z])=>point(x,z))};
}

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
  const point={x:site.x+side*(row<0?15:13),z:site.z+(row<0?-16:10)};
  // The southern court (z 18..54) stays free for saved escort paths.
  // A broad envelope includes the bench, planter and lamp plus player margin.
  if(roadDistance(point)<3.6||obstacles.some(o=>obstacleDistance(point,o)<3.6))continue;
  result.push({id:site.id+':furniture:'+side+':'+row,site:site.id,region:site.region,...point,rotation:side>0?Math.PI:0,r:2.55,height:4.45,kind:'villageFurniture'});
 }
 return result;
}
