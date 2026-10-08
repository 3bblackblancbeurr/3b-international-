import {obstacleDistance} from './collision.js';
import {spatialObstacles} from './hub/spatial-obstacles.js';
import {realmRoads} from './realm-layout.js';
// Small country maps keep the battle-tested full-grid search. The metropolis
// uses a bounded corridor search so long taps do not allocate a 650 m square grid.
export function findInteractionPath(start,item,obstacles,radius=76){
 const d=Math.hypot(start.x-item.x,start.z-item.z),gap=item.type==='hubNpc'?3:['guardian','patrol'].includes(item.type)?4:item.type==='atelier'?3.3:['echo','survey','beacon'].includes(item.type)?2:0;
 // Conversation guidance stops within speaking distance, outside the person.
 const approach=gap&&d>gap?{x:item.x+(start.x-item.x)*gap/d,z:item.z+(start.z-item.z)*gap/d}:item.type==='hubNpc'?start:item;
 const path=findPath(start,approach,obstacles,radius);
 return path.length?path:findPath(start,item,obstacles,radius);
}

function compactPath(start,destination,obstacles,radius){
 const gap=1.25,step=2,limit=Math.floor((radius-gap)/step),size=limit*2+1;
 const nearby=radius>200?spatialObstacles(obstacles,{padding:gap}):()=>obstacles;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const clearanceCache=new Map();
 const clear=(p,clearance=gap)=>{
  const key=p.x+':'+p.z+':'+clearance;
  if(!clearanceCache.has(key))clearanceCache.set(key,Math.hypot(p.x,p.z)<=radius-clearance&&!nearby(p).some(o=>obstacleDistance(p,o)<clearance));
  return clearanceCache.get(key);
 };
 const segment=(a,b,clearance=gap)=>{const count=Math.ceil(distance(a,b)/.5);for(let i=1;i<=count;i++)if(!clear({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count},clearance))return false;return true;};
 const point=id=>({x:(id%size-limit)*step,z:(Math.floor(id/size)-limit)*step});
 const idAt=p=>(Math.round(p.z/step)+limit)*size+Math.round(p.x/step)+limit;
 const nearest=(p,connect=false,clearance=gap)=>{const candidates=[];for(let x=Math.round(p.x/step)-4;x<=Math.round(p.x/step)+4;x++)for(let z=Math.round(p.z/step)-4;z<=Math.round(p.z/step)+4;z++){if(Math.abs(x)>limit||Math.abs(z)>limit)continue;const q={x:x*step,z:z*step};if(clear(q)&&(!connect||segment(p,q,clearance)))candidates.push(q);}return candidates.sort((a,b)=>distance(a,p)-distance(b,p))[0];};
 const length=Math.hypot(destination.x,destination.z),scale=Math.min(1,(radius-gap)/Math.max(1,length));
 let end={x:destination.x*scale,z:destination.z*scale};if(!clear(end))end=nearest(end);if(!end)return[];
 if(segment(start,end))return[end];
 // Manual walking permits 0.7 m beside furniture. Its valid stopping point
 // may sit inside the route planner's wider 1.25 m comfort margin. Keep the
 // short departure connector physically clear, then retain the wider margin.
 const departureClearance=clear(start)?gap:.7;if(!clear(start,departureClearance))return[];
 const first=nearest(start,true,departureClearance),last=nearest(end,true);if(!first||!last)return[];
 const firstId=idAt(first),lastId=idAt(last),scores=new Map([[firstId,0]]),parents=new Map(),closed=new Set(),heap=[];
 const push=node=>{heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(last.f<=heap[child].f)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
 push({id:firstId,f:distance(first,last)});
 // Keep the authored two-unit grid, including its narrow bridge connectors.
 // An isolated target must not synchronously exhaust the whole large Hub.
 const maxExpanded=radius>2000?14000:radius>400?24000:size*size;
 while(heap.length&&closed.size<maxExpanded){const {id}=pop();if(closed.has(id))continue;
  if(id===lastId){const raw=[end];let cursor=id;while(cursor!==undefined){raw.unshift(point(cursor));cursor=parents.get(cursor);}const smooth=departureClearance<gap?[first]:[];let from=departureClearance<gap?first:start,index=departureClearance<gap?1:0;while(index<raw.length){let far=index;while(far+1<raw.length&&segment(from,raw[far+1]))far++;smooth.push(raw[far]);from=raw[far];index=far+1;}return smooth;}
  closed.add(id);const p=point(id);
  for(const dx of [-step,0,step])for(const dz of [-step,0,step]){if(!dx&&!dz)continue;const q={x:p.x+dx,z:p.z+dz};if(Math.abs(q.x)>limit*step||Math.abs(q.z)>limit*step)continue;const next=idAt(q),cost=scores.get(id)+Math.hypot(dx,dz);if(closed.has(next)||cost>=(scores.get(next)??Infinity)||!segment(p,q))continue;scores.set(next,cost);parents.set(next,id);push({id:next,f:cost+distance(q,last)});}
 }
 return[];
}

function metropolisPath(start,destination,obstacles,radius){
 const gap=1.25,step=4,distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const nearby=spatialObstacles(obstacles,{cellSize:24,padding:gap});
 const length=Math.hypot(destination.x,destination.z),scale=Math.min(1,(radius-gap)/Math.max(1,length));
 let end={x:destination.x*scale,z:destination.z*scale};
 const clear=p=>Math.hypot(p.x,p.z)<=radius-gap&&!nearby(p).some(o=>obstacleDistance(p,o)<gap);
 const segment=(a,b)=>{const count=Math.ceil(distance(a,b)/1.25);for(let i=1;i<=count;i++)if(!clear({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count}))return false;return true;};
 if(clear(end)&&segment(start,end))return[end];
 const span=distance(start,end),margin=Math.min(radius*.2,Math.max(42,span*.16));
 const minX=Math.max(-radius+gap,Math.min(start.x,end.x)-margin),maxX=Math.min(radius-gap,Math.max(start.x,end.x)+margin);
 const minZ=Math.max(-radius+gap,Math.min(start.z,end.z)-margin),maxZ=Math.min(radius-gap,Math.max(start.z,end.z)+margin);
 const cols=Math.max(2,Math.floor((maxX-minX)/step)+1),rows=Math.max(2,Math.floor((maxZ-minZ)/step)+1);
 const point=id=>({x:minX+(id%cols)*step,z:minZ+Math.floor(id/cols)*step});
 const idAt=p=>Math.max(0,Math.min(rows-1,Math.round((p.z-minZ)/step)))*cols+Math.max(0,Math.min(cols-1,Math.round((p.x-minX)/step)));
 const nearest=(p,connect=false)=>{const candidates=[];const cx=Math.round((p.x-minX)/step),cz=Math.round((p.z-minZ)/step);for(let x=cx-6;x<=cx+6;x++)for(let z=cz-6;z<=cz+6;z++){if(x<0||z<0||x>=cols||z>=rows)continue;const q={x:minX+x*step,z:minZ+z*step};if(clear(q)&&(!connect||segment(p,q)))candidates.push(q);}return candidates.sort((a,b)=>distance(a,p)-distance(b,p))[0];};
 if(!clear(end))end=nearest(end);if(!end)return[];
 if(segment(start,end))return[end];
 const first=nearest(start,true),last=nearest(end,true);if(!first||!last)return[];
 const firstId=idAt(first),lastId=idAt(last),scores=new Map([[firstId,0]]),parents=new Map(),closed=new Set(),heap=[];
 const push=node=>{heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(last.f<=heap[child].f)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
 push({id:firstId,f:distance(first,last)});
 while(heap.length&&closed.size<24000){const {id}=pop();if(closed.has(id))continue;
  if(id===lastId){const raw=[end];let cursor=id;while(cursor!==undefined){raw.unshift(point(cursor));cursor=parents.get(cursor);}const smooth=[];let from=start,index=0;while(index<raw.length){let far=index;while(far+1<raw.length&&segment(from,raw[far+1]))far++;smooth.push(raw[far]);from=raw[far];index=far+1;}return smooth;}
  closed.add(id);const p=point(id);
  for(const dx of [-step,0,step])for(const dz of [-step,0,step]){if(!dx&&!dz)continue;const q={x:p.x+dx,z:p.z+dz};if(q.x<minX||q.x>maxX||q.z<minZ||q.z>maxZ||!segment(p,q))continue;const next=idAt(q),cost=scores.get(id)+Math.hypot(dx,dz);if(closed.has(next)||cost>=(scores.get(next)??Infinity))continue;scores.set(next,cost);parents.set(next,id);push({id:next,f:cost+distance(q,last)});}
 }
 return[];
}

function territoryPath(start,destination,obstacles,radius){
 const region=obstacles.find(o=>String(o.id).includes(':realm:home:')||String(o.id).includes(':home:'))?.region;
 const roads=realmRoads(region);if(!roads.length)return metropolisPath(start,destination,obstacles,radius);
 const nearby=spatialObstacles(obstacles,{cellSize:24,padding:1.25}),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const clear=p=>Math.hypot(p.x,p.z)<=radius-1.25&&!nearby(p).some(o=>obstacleDistance(p,o)<1.25);
 const segment=(a,b)=>{const n=Math.ceil(distance(a,b)/1.5);for(let i=1;i<=n;i++)if(!clear({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;};
 if(clear(destination)&&segment(start,destination))return[destination];
 // Long journeys use an authored sparse road graph. Local departure/arrival
 // searches stay below 600 units and never allocate a country-wide grid.
 const nodes=[],edges=[],lookup=new Map();
 function node(p){const key=p.x.toFixed(3)+':'+p.z.toFixed(3);if(lookup.has(key))return lookup.get(key);const n=nodes.length;lookup.set(key,n);nodes.push(p);edges.push([]);return n;}
 for(const road of roads)for(let i=1;i<road.points.length;i++){const a=node(road.points[i-1]),b=node(road.points[i]),cost=distance(nodes[a],nodes[b]);edges[a].push({to:b,cost});edges[b].push({to:a,cost});}
 function connectors(point,arrival=false){const sorted=nodes.map((p,index)=>({p,index,d:distance(p,point)})).sort((a,b)=>a.d-b.d).slice(0,8),matches=[];
  for(const candidate of sorted){if(candidate.d>650)continue;const from=arrival?candidate.p:point,to=arrival?point:candidate.p;
   const path=segment(from,to)?[to]:metropolisPath(from,to,obstacles,radius);if(path.length){const length=path.reduce((state,p)=>({length:state.length+distance(state.p,p),p}),{length:0,p:from}).length;matches.push({node:candidate.index,path,length});if(matches.length>=3)break;}}
  return matches;
 }
 const starts=connectors(start),ends=connectors(destination,true);if(!starts.length||!ends.length)return metropolisPath(start,destination,obstacles,radius);
 const scores=new Map(),previous=new Map(),origins=new Map(),visited=new Set(),endMap=new Map(ends.map(e=>[e.node,e]));for(const s of starts){scores.set(s.node,s.length);origins.set(s.node,s);}
 let final=null,bestTotal=Infinity;
 while(visited.size<nodes.length){let current=-1,best=Infinity;for(const [n,score] of scores)if(!visited.has(n)&&score<best){best=score;current=n;}if(current<0||best>bestTotal)break;visited.add(current);
  const end=endMap.get(current);if(end&&best+end.length<bestTotal){final={node:current,end};bestTotal=best+end.length;}
  for(const edge of edges[current]){if(visited.has(edge.to)||!segment(nodes[current],nodes[edge.to]))continue;const cost=best+edge.cost;if(cost<(scores.get(edge.to)??Infinity)){scores.set(edge.to,cost);previous.set(edge.to,current);origins.set(edge.to,origins.get(current));}}
 }
 if(!final)return[];const path=[];let n=final.node;while(previous.has(n)){path.unshift(nodes[n]);n=previous.get(n);}return[...origins.get(final.node).path,...path,...final.end.path];
}

export function findPath(start,destination,obstacles,radius=76){
 // The expanded archipelago still has narrow doors, switchbacks and water.
 // Its precise, spatially indexed search must survive a larger world radius.
 if(radius>2000&&!obstacles.some(o=>o.id==='cite-water-boundary')){
  if(Math.hypot(start.x,start.z)<350&&Math.hypot(destination.x,destination.z)<350)return compactPath(start,destination,obstacles,Math.max(260,Math.hypot(start.x,start.z)+16,Math.hypot(destination.x,destination.z)+16));
  if(Math.hypot(start.x-destination.x,start.z-destination.z)<320)return compactPath(start,destination,obstacles,radius);
  return territoryPath(start,destination,obstacles,radius);
 }
 return radius>400&&!obstacles.some(o=>o.id==='cite-water-boundary')?metropolisPath(start,destination,obstacles,radius):compactPath(start,destination,obstacles,radius);
}
