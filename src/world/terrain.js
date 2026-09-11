import {worldItems} from './rules.js';
import {COUNTRIES} from './catalog.js';
import {settlementPlan,serviceItems} from './settlements.js';

export const WORLD_RADIUS=132;
export const BIOMES={
 hub:{seed:83,angle:0,scale:1.8,low:'#537d57',high:'#91a674',rock:'#838a78',sky:'#9dbec5',haze:'#b8c8b2',amplitude:5.8,tree:'Tree',water:{x:-37,z:6,r:12}},
 france:{seed:13,angle:-.24,scale:1.6,low:'#597854',high:'#9baa79',rock:'#a0a590',sky:'#a3bec7',haze:'#d2d2ba',amplitude:4.3,tree:'Tree',water:{x:-42,z:26,r:11}},
 italie:{seed:29,angle:.5,scale:1.65,low:'#697b44',high:'#adad72',rock:'#b6aa8d',sky:'#a8c3c7',haze:'#ded1b1',amplitude:7,tree:'Cypress',water:{x:47,z:32,r:10}},
 estonie:{seed:41,angle:-.62,scale:1.65,low:'#3b615c',high:'#77988c',rock:'#abb6af',sky:'#6c959f',haze:'#a6c2bd',amplitude:5.8,tree:'Pine',water:{x:-35,z:30,r:14}},
 turquie:{seed:67,angle:1.1,scale:1.65,low:'#928474',high:'#c8b59b',rock:'#baa28d',sky:'#899dab',haze:'#d3b9b2',amplitude:7.4,tree:'Cypress',water:{x:43,z:23,r:8}},
 algerie:{seed:97,angle:-.85,scale:1.7,low:'#ae9060',high:'#d7bd87',rock:'#a38662',sky:'#a8c3c0',haze:'#e1d0ab',amplitude:6,tree:'Palm',water:{x:-29,z:24,r:12}},
 tunisie:{seed:113,angle:.15,scale:1.7,low:'#8c9a78',high:'#d0c8a5',rock:'#b9b7a0',sky:'#91c7d0',haze:'#c1dad4',amplitude:4.5,tree:'Palm',water:{x:-43,z:14,r:17}},
 maroc:{seed:151,angle:.72,scale:1.7,low:'#917753',high:'#b6a27b',rock:'#997e66',sky:'#9cb2b9',haze:'#d3c1a5',amplitude:9.5,tree:'Palm',water:{x:36,z:26,r:10}},
 espagne:{seed:179,angle:-.4,scale:1.65,low:'#7c804c',high:'#bfad76',rock:'#b98e71',sky:'#c3b2b3',haze:'#e3c6a6',amplitude:8.5,tree:'Cypress',water:{x:-43,z:28,r:11}},
};
export function randomFor(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function toLandscape(region,x,z){const b=BIOMES[region]||BIOMES.hub,c=Math.cos(b.angle),s=Math.sin(b.angle);return{x:(x*c-z*s)*b.scale,z:(x*s+z*c)*b.scale};}
export function landscapeItems(region,save){return [...worldItems(region,save),...serviceItems(region,save)].map(item=>({...item,...toLandscape(region,item.x,item.z)}));}
export function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
export function landscapeRoads(region){return settlementPlan(region).roads.map(r=>({...r,width:r.width*(BIOMES[region]?.scale||1),points:r.points.map(p=>toLandscape(region,...p))}));}
export function roadDistance(x,z,roads){return Math.min(Infinity,...roads.flatMap(r=>r.points.slice(1).map((b,i)=>segmentDistance(x,z,r.points[i],b)-r.width/2)));}
export function buildingSites(region,anchors=[]){
 if(region==='hub')return COUNTRIES.map((c,i)=>{const p=toLandscape(region,...c.portal);return{id:c.id,x:p.x+10,z:p.z-10,rotation:-.18+i*.2,variant:i};});
 const roads=landscapeRoads(region),landmark=toLandscape(region,35,-35);
 return settlementPlan(region).plots.map(p=>({...p,id:region,...toLandscape(region,p.x,p.z),rotation:-BIOMES[region].angle+p.rotation})).filter(p=>Math.hypot(p.x,p.z)<124&&Math.hypot(p.x-landmark.x,p.z-landmark.z)>15&&Math.hypot(p.x,p.z-5)>12&&roadDistance(p.x,p.z,roads)>4.8&&!anchors.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<(a.type==='portal'?12:a.type==='guardian'?14:9)));
}
export function createTerrainField(region,save){
 const biome=BIOMES[region]||BIOMES.hub,anchors=landscapeItems(region,save),buildings=buildingSites(region,anchors),roads=landscapeRoads(region),plan=settlementPlan(region),squares=plan.squares.map(p=>({...p,...toLandscape(region,p.x,p.z),r:p.r*biome.scale})),fields=plan.fields.map(p=>({...p,...toLandscape(region,p.x,p.z),w:p.w*biome.scale,h:p.h*biome.scale,rotation:-biome.angle}));
 const clearings=[{x:0,z:5,r:13},...anchors.map(p=>({...p,r:p.type==='portal'?9:p.type==='guardian'?12:7})),...squares,...buildings.map(p=>({...p,r:6})),...fields.map(p=>({...p,r:Math.hypot(p.w,p.h)/2})),...(region==='hub'?[]:[{...toLandscape(region,35,-35),r:11}])];
 // Find a dry margin around every interaction and building before carving water.
 let lake={...biome.water},found=false;
 for(let ring=0;ring<25&&!found;ring++)for(let i=0;i<32;i++){
  const a=i/32*Math.PI*2,p={x:biome.water.x+Math.cos(a)*ring*5,z:biome.water.z+Math.sin(a)*ring*5,r:biome.water.r};
  if(Math.hypot(p.x,p.z)+p.r>118||roadDistance(p.x,p.z,roads)<p.r+9||clearings.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<p.r+c.r+7))continue;
  lake=p;found=true;break;
 }
 function height(x,z){
  const f=biome.seed*.017;
  let y=(Math.sin(x*.032+f)*Math.cos(z*.027-f)+.36*Math.sin(x*.079+z*.053+f))*biome.amplitude;
  // A continuous landscape extends into distant ridges, with gentle clearings
  // around interactions. There are no radial paths or raised navigation decks.
  const edge=Math.max(0,(Math.hypot(x,z)-104)/34);y+=edge*edge*(6+4*Math.sin(x*.034+z*.026));
  let flatten=1;for(const p of clearings){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r+11){const t=Math.max(0,Math.min(1,(d-p.r)/11));flatten=Math.min(flatten,t*t*(3-2*t));}}
  const roadMargin=Math.max(0,Math.min(1,(roadDistance(x,z,roads)-4)/10));flatten=Math.min(flatten,roadMargin*roadMargin*(3-2*roadMargin));
  y*=flatten;
  const d=Math.hypot(x-lake.x,z-lake.z),blend=Math.max(0,Math.min(1,(lake.r+6-d)/7));
  return y*(1-blend)+(-2.7+Math.min(1,d/lake.r)*.6)*blend;
 }
 const protectedPoint=(x,z,pad=0)=>clearings.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+pad)||Math.hypot(x-lake.x,z-lake.z)<lake.r+4+pad||roadDistance(x,z,roads)<pad+1;
 return {biome,anchors,buildings,roads,squares,fields,lake,height,protectedPoint};
}
