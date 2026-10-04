/** Per-route broad phase. No global cache: rebuilding a hub cannot leave stale walls. */
export function spatialObstacles(obstacles,{cellSize=12,padding=1.25}={}){
 const cells=new Map(),fallback=[];
 for(const o of obstacles){
  if(o.enabled===false)continue;
  const angle=o.rotation||0,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  const rx=(o.width?(c*o.width+s*o.depth)/2:o.r)+padding,rz=(o.width?(s*o.width+c*o.depth)/2:o.r)+padding;
  if(!Number.isFinite(rx)||!Number.isFinite(rz)||!Number.isFinite(o.x)||!Number.isFinite(o.z)){fallback.push(o);continue;}
  for(let x=Math.floor((o.x-rx)/cellSize);x<=Math.floor((o.x+rx)/cellSize);x++)for(let z=Math.floor((o.z-rz)/cellSize);z<=Math.floor((o.z+rz)/cellSize);z++){
   const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(o);
  }
 }
 return point=>[...(cells.get(Math.floor(point.x/cellSize)+':'+Math.floor(point.z/cellSize))||[]),...fallback];
}
