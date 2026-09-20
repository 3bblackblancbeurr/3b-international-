import {obstacleDistance} from './collision.js';
// A bounded navigation grid is only searched on a tap/Atlas command. Manual
// movement stays immediate. Segment checks prevent diagonal corner cutting.
export function findInteractionPath(start,item,obstacles,radius=76){
 const d=Math.hypot(start.x-item.x,start.z-item.z),gap=['guardian','patrol'].includes(item.type)?4:item.type==='atelier'?3.3:['echo','survey','beacon'].includes(item.type)?2:0;
 const approach=gap&&d>gap?{x:item.x+(start.x-item.x)*gap/d,z:item.z+(start.z-item.z)*gap/d}:item;
 const path=findPath(start,approach,obstacles,radius);
 // A fountain or planter can isolate the preferred side of an interaction.
 // Search its other accessible sides before giving up on the destination.
 return path.length?path:findPath(start,item,obstacles,radius);
}
export function findPath(start,destination,obstacles,radius=76){
 const gap=1.25,step=radius>400?4:2,distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const length=Math.hypot(destination.x,destination.z),scale=Math.min(1,(radius-gap)/Math.max(1,length));
 let end={x:destination.x*scale,z:destination.z*scale};
 const clear=p=>Math.hypot(p.x,p.z)<=radius-gap&&!obstacles.some(o=>obstacleDistance(p,o)<gap);
 const segment=(a,b)=>{const count=Math.ceil(distance(a,b)/(radius>400?1.25:.5));for(let i=1;i<=count;i++)if(!clear({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count}))return false;return true;};
 if(clear(end)&&segment(start,end))return[end];
 const span=distance(start,end),margin=Math.min(radius*.16,Math.max(30,span*.12));
 const minX=Math.max(-radius+gap,Math.min(start.x,end.x)-margin),maxX=Math.min(radius-gap,Math.max(start.x,end.x)+margin);
 const minZ=Math.max(-radius+gap,Math.min(start.z,end.z)-margin),maxZ=Math.min(radius-gap,Math.max(start.z,end.z)+margin);
 const cols=Math.max(2,Math.floor((maxX-minX)/step)+1),rows=Math.max(2,Math.floor((maxZ-minZ)/step)+1);
 const point=id=>({x:minX+(id%cols)*step,z:minZ+Math.floor(id/cols)*step});
 const idAt=p=>Math.max(0,Math.min(rows-1,Math.round((p.z-minZ)/step)))*cols+Math.max(0,Math.min(cols-1,Math.round((p.x-minX)/step)));
 const nearest=(p,connect=false)=>{const candidates=[];const cx=Math.round((p.x-minX)/step),cz=Math.round((p.z-minZ)/step);for(let x=cx-5;x<=cx+5;x++)for(let z=cz-5;z<=cz+5;z++){if(x<0||z<0||x>=cols||z>=rows)continue;const q={x:minX+x*step,z:minZ+z*step};if(clear(q)&&(!connect||segment(p,q)))candidates.push(q);}return candidates.sort((a,b)=>distance(a,p)-distance(b,p))[0];};
 if(!clear(end))end=nearest(end);if(!end)return[];
 if(segment(start,end))return[end];
 const first=nearest(start,true),last=nearest(end,true);if(!first||!last)return[];
 const firstId=idAt(first),lastId=idAt(last),scores=new Map([[firstId,0]]),parents=new Map(),closed=new Set(),heap=[];
 const push=node=>{heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(last.f<=heap[child].f)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
 push({id:firstId,f:distance(first,last)});
 while(heap.length){
  const {id}=pop();if(closed.has(id))continue;
  if(id===lastId){const raw=[end];let cursor=id;while(cursor!==undefined){raw.unshift(point(cursor));cursor=parents.get(cursor);}const smooth=[];let from=start,index=0;while(index<raw.length){let far=index;while(far+1<raw.length&&segment(from,raw[far+1]))far++;smooth.push(raw[far]);from=raw[far];index=far+1;}return smooth;}
  closed.add(id);const p=point(id);
  for(const dx of [-step,0,step])for(const dz of [-step,0,step]){if(!dx&&!dz)continue;const q={x:p.x+dx,z:p.z+dz};if(q.x<minX||q.x>maxX||q.z<minZ||q.z>maxZ||!segment(p,q))continue;const next=idAt(q),cost=scores.get(id)+Math.hypot(dx,dz);if(closed.has(next)||cost>=(scores.get(next)??Infinity))continue;scores.set(next,cost);parents.set(next,id);push({id:next,f:cost+distance(q,last)});}
 }
 return[];
}
