import {realmLayout,realmSectorKey,REALM_SECTOR_SIZE,realmRandom} from './realm-layout.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>(v=clamp(v),v*v*(3-2*v));
const lerp=(a,b,t)=>a+(b-a)*t;
export const REALM_GROUND_STYLES=Object.freeze({
 france:{relief:135,rolling:16,tree:'Tree',cover:48},italie:{relief:78,rolling:25,tree:'Cypress',cover:34},
 estonie:{relief:28,rolling:8,tree:'Pine',cover:68},turquie:{relief:168,rolling:24,tree:'Cypress',cover:23},
 algerie:{relief:126,rolling:21,tree:'Palm',cover:19},tunisie:{relief:45,rolling:12,tree:'Olive',cover:28},
 maroc:{relief:220,rolling:29,tree:'Palm',cover:18},espagne:{relief:145,rolling:23,tree:'Olive',cover:31},
});

/** Height and protection queries use a sector index. Sampling an outer tile
 * never scans every road of a country or allocates a whole-country heightmap. */
export function createRealmGroundField(region,coreHeight){
 const layout=realmLayout(region);if(!layout)return null;
 const style=REALM_GROUND_STYLES[region],phase=(layout.seed%997)*.017,index=new Map();
 const raw=(x,z)=>{
  const broad=Math.sin(x*.0011+phase)*Math.cos(z*.00135-phase),rolling=Math.sin(x*.0057+phase)*Math.cos(z*.0041)+.3*Math.sin(x*.012+z*.009);
  const radial=clamp((Math.hypot(x,z)-500)/(layout.radius*.72)),ridge=Math.pow(Math.max(0,Math.sin(x*.0015+z*.0012+phase)),2);
  return broad*style.rolling+rolling*style.rolling*.34+ridge*style.relief*radial;
 };
 const blended=(x,z)=>{const d=Math.hypot(x,z);if(d<=350)return coreHeight(x,z);if(d>=550)return raw(x,z);const t=smooth((d-350)/200);return lerp(coreHeight(x,z),raw(x,z),t);};
 const sites=layout.sites.map(s=>({...s,y:blended(s.x,s.z)}));
 function place(entry,minX,minZ,maxX,maxZ){for(let x=Math.floor(minX/REALM_SECTOR_SIZE);x<=Math.floor(maxX/REALM_SECTOR_SIZE);x++)for(let z=Math.floor(minZ/REALM_SECTOR_SIZE);z<=Math.floor(maxZ/REALM_SECTOR_SIZE);z++){const key=realmSectorKey(x,z);if(!index.has(key))index.set(key,[]);index.get(key).push(entry);}}
 for(const site of sites)place({site},site.x-site.r-35,site.z-site.r-35,site.x+site.r+35,site.z+site.r+35);
 const siteHeight=(x,z)=>{
  let y=blended(x,z);for(const {site} of index.get(realmSectorKey(Math.floor(x/REALM_SECTOR_SIZE),Math.floor(z/REALM_SECTOR_SIZE)))||[]){if(!site)continue;const d=Math.hypot(x-site.x,z-site.z);if(d<site.r+30)y=lerp(site.y,y,smooth((d-site.r)/30));}return y;
 };
 const roadSegments=[];
 for(const road of layout.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,entry={road,a,b,dx,dz,lengthSq:dx*dx+dz*dz,ay:siteHeight(a.x,a.z),by:siteHeight(b.x,b.z)};roadSegments.push(entry);
  const pad=road.width/2+9;place(entry,Math.min(a.x,b.x)-pad,Math.min(a.z,b.z)-pad,Math.max(a.x,b.x)+pad,Math.max(a.z,b.z)+pad);
 }
 const local=(x,z)=>index.get(realmSectorKey(Math.floor(x/REALM_SECTOR_SIZE),Math.floor(z/REALM_SECTOR_SIZE)))||[];
 function roadAt(x,z){let best=null,distance=Infinity;for(const segment of local(x,z)){if(!segment.road)continue;const t=clamp(((x-segment.a.x)*segment.dx+(z-segment.a.z)*segment.dz)/segment.lengthSq),d=Math.hypot(x-segment.a.x-segment.dx*t,z-segment.a.z-segment.dz*t)-segment.road.width/2;if(d<distance){distance=d;best={...segment,t,d};}}return best;}
 function height(x,z){
  if(Math.hypot(x,z)<=350)return coreHeight(x,z);
  let y=siteHeight(x,z);
  // A road joins the edge of a level settlement. Its interpolated outside
  // slope must not deform the town square or the guardian's combat floor.
  if(local(x,z).some(entry=>entry.site&&Math.hypot(x-entry.site.x,z-entry.site.z)<entry.site.r))return y;
  const road=roadAt(x,z);
  if(road&&road.d<9)y=lerp(lerp(road.ay,road.by,road.t),y,smooth(road.d/9));
  return y;
 }
 function protectedPoint(x,z,pad=0){return local(x,z).some(entry=>entry.site?Math.hypot(x-entry.site.x,z-entry.site.z)<entry.site.r+pad:entry.road&&(()=>{const t=clamp(((x-entry.a.x)*entry.dx+(z-entry.a.z)*entry.dz)/entry.lengthSq);return Math.hypot(x-entry.a.x-entry.dx*t,z-entry.a.z-entry.dz*t)<entry.road.width/2+pad;})());}
 function sector(x,z){
  const rng=realmRandom(layout.seed^Math.imul(x,73856093)^Math.imul(z,19349663)),plants=[],stones=[],originX=x*REALM_SECTOR_SIZE,originZ=z*REALM_SECTOR_SIZE;
  for(let i=0;i<style.cover;i++){
   const px=originX+rng()*REALM_SECTOR_SIZE,pz=originZ+rng()*REALM_SECTOR_SIZE;
   if(Math.abs(px)<515&&Math.abs(pz)<515||Math.hypot(px,pz)>layout.radius-8||protectedPoint(px,pz,6))continue;
   const y=height(px,pz),slope=Math.abs(height(px+2,pz)-y)+Math.abs(height(px,pz+2)-y);
   if(slope>3)continue;
   const province=sites.filter(s=>s.major&&s.province<3).reduce((best,s)=>!best||Math.hypot(px-s.x,pz-s.z)<Math.hypot(px-best.x,pz-best.z)?s:best,null);
   let type=style.tree;if(province?.kind==='alpine'||province?.kind==='forest')type='Pine';if(province?.kind==='vineyard'||province?.kind==='palazzo')type='Cypress';if(province?.kind==='mountain'||province?.kind==='kasbah')type='Olive';
   plants.push({x:px,z:pz,y,type,scale:.9+rng()*.8,rotation:rng()*Math.PI*2});
  }
  for(let i=0;i<7;i++){
   const px=originX+rng()*REALM_SECTOR_SIZE,pz=originZ+rng()*REALM_SECTOR_SIZE;
   if(Math.abs(px)<515&&Math.abs(pz)<515||Math.hypot(px,pz)>layout.radius-8||protectedPoint(px,pz,6))continue;
   stones.push({x:px,z:pz,y:height(px,pz),scale:1+rng()*3.6,rotation:rng()*6});
  }
  return{x,z,key:realmSectorKey(x,z),plants,stones};
 }
 return {layout,style,height,raw,roadAt,roadSegments,protectedPoint,sector,sites};
}
