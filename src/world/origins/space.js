import {heritageObstacles} from '../heritage.js';
import {isCountry,countryLayout} from './countries.js';
import {BUILDINGS,ROOMS,ROOM_SHELVES,SCALE,SPAWNS,EIFFEL_SITE} from './data.js';
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const wall=(x,z,w,d,h=10,angle=0)=>({x,z,w,d,h,angle});
const collisionCache=new Map();
export function obstacles(zone,flags={}){
 if(isCountry(zone)){if(collisionCache.has(zone))return collisionCache.get(zone);const obs=countryLayout(zone).buildings.map(b=>wall(b.x,b.z,b.width,b.depth,12,b.angle));const l=countryLayout(zone);for(const h of heritageObstacles(zone,l.landmark,0))obs.push(wall(h.x,h.z,h.width||h.r*2,h.depth||h.r*2,20,h.rotation));obs.push(wall(l.centre.x,l.centre.z-6,4,4,1),wall(-3.2,32,1.1,1.3,5.4),wall(3.2,32,1.1,1.3,5.4));collisionCache.set(zone,obs);return obs;}
 const key=zone+':'+!!flags.trial;if(collisionCache.has(key))return collisionCache.get(key);
 if(zone==='sanctuary')return [wall(0,0,12,2,16),...Array.from({length:8},(_,i)=>wall(Math.sin(i*Math.PI/4+.18)*23,-Math.cos(i*Math.PI/4+.18)*23,1.2,1.2,4)),...Array.from({length:7},(_,i)=>{const a=(i+1)*Math.PI/4;return wall(Math.sin(a)*29,-Math.cos(a)*29,4.2,.5,6,-a);})];
 const out=BUILDINGS.map(b=>wall(b.x,b.z,b.width+.2,b.depth+.2,15,b.angle));
 for(const sx of [-1,1])for(const sz of [-1,1])out.push(wall(EIFFEL_SITE.x+sx*52*60/330,EIFFEL_SITE.z+sz*52*60/330,21*60/330,21*60/330,2));
 for(const r of ROOMS){
  out.push(wall(r.x,r.z-r.d/2,r.w,.4,4.6),wall(r.x-r.w/2,r.z,.4,r.d,4.6),wall(r.x+r.w/2,r.z,.4,r.d,4.6));
  const opening=r.id==='archives'?3.8:SCALE.doorWidth;
  for(const sign of [-1,1])out.push(wall(r.x+sign*(r.w+opening)/4,r.z+r.d/2,(r.w-opening)/2,.4,4.6));
 }
 out.push(wall(-8,-14,3.7,3.7,1));
 for(const x of [-1,1])out.push(wall(0,-34+x*2.08,34,.13,3.6));
 for(const [x,z] of [[-10,5],[10,7],[-15,-18],[15,-16],[-34,-15],[12,-4],[-15,28],[15,28],[-31,-42],[32,-42]])out.push(wall(x,z,.5,.5,4.5));
 if(!flags.trial)out.push(wall(0,-54.5,3.8,.5,4.5));
 for(const shelf of ROOM_SHELVES)out.push(wall(shelf.x,shelf.z,shelf.w,shelf.d,shelf.h));
 collisionCache.set(key,out);return out;
}
export function inside(p,o,r=SCALE.radius){const a=o.angle||0,c=Math.cos(a),s=Math.sin(a),x=(p.x-o.x)*c-(p.z-o.z)*s,z=(p.x-o.x)*s+(p.z-o.z)*c;return Math.abs(x)<o.w/2+r&&Math.abs(z)<o.d/2+r;}
export function clear(p,zone,flags={},radius=SCALE.radius){
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
 if(zone==='sanctuary'&&Math.hypot(p.x,p.z)>39)return false;
 if(isCountry(zone)&&(Math.abs(p.x)>105||p.z< -120||p.z>45))return false;
 if(zone==='france'&&(p.x< -110||p.x>65||p.z< -145||p.z>40))return false;
 return !obstacles(zone,flags).some(o=>inside(p,o,radius));
}
export function safePosition(p,zone,flags){return p&&clear(p,zone,flags)?{x:p.x,z:p.z}:{...SPAWNS[zone]};}
export function move(p,dx,dz,zone,flags={},radius=SCALE.radius){
 const result={...p},steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18)),obs=obstacles(zone,flags);
 const valid=q=>(zone==='sanctuary'?Math.hypot(q.x,q.z)<39:isCountry(zone)?Math.abs(q.x)<105&&q.z> -120&&q.z<45:q.x> -110&&q.x<65&&q.z> -145&&q.z<40)&&!obs.some(o=>inside(q,o,radius));
 for(let i=0;i<steps;i++){let q={x:result.x+dx/steps,z:result.z};if(valid(q))result.x=q.x;q={x:result.x,z:result.z+dz/steps};if(valid(q))result.z=q.z;}
 return result;
}
export function lineClear(a,b,zone,flags,radius=SCALE.radius){const n=Math.max(1,Math.ceil(distance(a,b)/.25));for(let i=1;i<=n;i++)if(!clear({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},zone,flags,radius))return false;return true;}
// The raised promenade has continuous ramps at both ends, no invisible teleport.
export function ground(p,zone){if(isCountry(zone))return 0;if(zone==='sanctuary'){const r=Math.hypot(p.x,p.z-9);return r<2.8?.6:r<3.1?.4:r<3.4?.2:0;}if(Math.abs(p.z+34)>2)return 0;const x=Math.abs(p.x);return x<9?2.4:x<17?(17-x)*.3:0;}
export function route(start,end,zone,flags){
 if(lineClear(start,end,zone,flags,.36))return [end];
 const step=1, key=p=>`${Math.round(p.x)},${Math.round(p.z)}`,first={x:Math.round(start.x),z:Math.round(start.z)},last={x:Math.round(end.x),z:Math.round(end.z)};
 const open=[first],cost=new Map([[key(first),0]]),parents=new Map(),points=new Map([[key(first),first]]),closed=new Set();let iterations=0;
 const heuristic=p=>Math.abs(p.x-last.x)+Math.abs(p.z-last.z);
 while(open.length&&iterations++<10000){open.sort((a,b)=>cost.get(key(b))+heuristic(b)-cost.get(key(a))-heuristic(a));const p=open.pop(),k=key(p);if(closed.has(k))continue;closed.add(k);
  if(distance(p,last)<1.5&&lineClear(p,end,zone,flags,.36)){const path=[end];let id=k;while(parents.has(id)){path.unshift(points.get(id));id=parents.get(id);}return path;}
  for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const q={x:p.x+dx,z:p.z+dz},id=key(q),n=cost.get(k)+1;if(closed.has(id)||n>=(cost.get(id)??Infinity)||!lineClear(p,q,zone,flags,.36))continue;cost.set(id,n);parents.set(id,k);points.set(id,q);open.push(q);}
 }return [];
}
