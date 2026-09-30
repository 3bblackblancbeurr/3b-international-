import {obstacleDistance} from './collision.js';

// Shorten the view before a wall, instead of letting the lens enter it. The
// existing dither sightline handles scenery immediately beside the character.
export function clearCameraView(view,obstacles=[],heightAt=()=>0){
 const target={...view.target},desired={...view.position};let fraction=1;
 const dx=desired.x-target.x,dy=desired.y-target.y,dz=desired.z-target.z;
 const span=Math.hypot(dx,dy,dz),samples=Math.max(8,Math.min(64,Math.ceil(span/.7)));
 const relevant=obstacles.filter(obstacle=>obstacle.enabled!==false&&obstacleDistance(target,obstacle)<span+1);
 for(let i=1;i<=samples;i++){
  const t=i/samples,p={x:target.x+dx*t,y:target.y+dy*t,z:target.z+dz*t};
  if(relevant.some(obstacle=>p.y<(obstacle.baseY??heightAt(obstacle.x,obstacle.z))+(obstacle.height||2.5)+.45&&obstacleDistance(p,obstacle)<.65)){
   fraction=Math.max(.08,(i-1)/samples-.025);break;
  }
 }
 const position={x:target.x+dx*fraction,y:target.y+dy*fraction,z:target.z+dz*fraction};
 position.y=Math.max(position.y,heightAt(position.x,position.z)+1.2);
 return {position,target,obstructed:fraction<1};
}

export function hubArrivalPosition(items,obstacles=[]){
 const square=items.find(item=>item.type==='hubDistrict'&&item.district==='heritage_square')||{x:0,z:42};
 const offsets=[[24,20],[-24,20],[0,32],[36,16],[-36,16],[24,36],[-24,36],[40,36],[-40,36]];
 const candidates=offsets.map(([x,z])=>({x:square.x+x,z:square.z+z}));
 const clearance=p=>obstacles.reduce((nearest,obstacle)=>Math.min(nearest,obstacleDistance(p,obstacle)),Infinity);
 return candidates.find(p=>clearance(p)>=5)||candidates.sort((a,b)=>clearance(b)-clearance(a))[0];
}
