import {civicSites,LANDMARK_SITE} from './heritage.js';
import {worldItems} from './rules.js';
import {COUNTRIES} from './catalog.js';
import {settlementPlan,serviceItems} from './settlements.js';
import {buildingDimensions} from './building-scale.js';
import {obstacleDistance} from './collision.js';

export const WORLD_RADIUS=132;
export const BIOMES={
 hub:{seed:83,angle:0,scale:1.8,low:'#376b3d',high:'#72974d',rock:'#838a78',sky:'#9dbec5',haze:'#b8c8b2',amplitude:5.8,tree:'Tree',water:{x:-37,z:6,r:12}},
 france:{seed:13,angle:-.24,scale:1.6,low:'#416b3b',high:'#839e58',rock:'#a0a590',sky:'#a3bec7',haze:'#d2d2ba',amplitude:4.3,tree:'Tree',water:{x:-42,z:26,r:11}},
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
 if(region==='hub')return COUNTRIES.map((c,i)=>{const p=toLandscape(region,...c.portal);return{id:c.id,x:p.x+13,z:p.z-13,rotation:-.18+i*.2,variant:i,...buildingDimensions(c.id,i)};});
 const roads=landscapeRoads(region),landmark=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z),civic=civicSites(anchors);
 const sites=settlementPlan(region).plots.map(p=>({...p,id:region,...toLandscape(region,p.x,p.z),rotation:-BIOMES[region].angle+p.rotation,...buildingDimensions(region,p.variant,p.urban)}));
 return sites.filter(p=>Math.hypot(p.x,p.z)<121&&obstacleDistance(landmark,p)>LANDMARK_SITE.clearing&&!civic.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<Math.hypot(p.width,p.depth)/2+Math.hypot(c.width,c.depth)/2+1)&&obstacleDistance({x:0,z:5},p)>10&&roadDistance(p.x,p.z,roads)>5.8&&!anchors.some(a=>obstacleDistance(a,p)<(a.type==='portal'?9:a.type==='guardian'?10:a.type==='camp'?22:a.type==='atelier'?13:6))).filter((p,i,all)=>!all.slice(0,i).some(b=>Math.hypot(p.x-b.x,p.z-b.z)<11));
}
export function createTerrainField(region,save){
 const biome=BIOMES[region]||BIOMES.hub,anchors=landscapeItems(region,save),buildings=buildingSites(region,anchors),roads=landscapeRoads(region),plan=settlementPlan(region),squares=[...plan.squares,...(region==='hub'?[]:[{x:LANDMARK_SITE.x,z:LANDMARK_SITE.z,r:LANDMARK_SITE.clearing/biome.scale}])].map(p=>({...p,...toLandscape(region,p.x,p.z),r:p.r*biome.scale})),fields=plan.fields.map(p=>({...p,...toLandscape(region,p.x,p.z),w:p.w*biome.scale,h:p.h*biome.scale,rotation:-biome.angle}));
 const civic=civicSites(anchors);
 const clearings=[...civic.map(p=>({...p,r:Math.hypot(p.width,p.depth)/2+1})),{x:0,z:5,r:13},...anchors.map(p=>({...p,r:p.type==='camp'?25:p.type==='portal'?9:p.type==='guardian'?12:7})),...squares,...buildings.map(p=>({...p,r:Math.hypot(p.width,p.depth)/2+1})),...fields.map(p=>({...p,r:Math.hypot(p.w,p.h)/2})),...(region==='hub'?[]:[{...toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z),r:LANDMARK_SITE.clearing}])];
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
  const edge=Math.max(0,Math.min(1,(Math.hypot(x,z)-132)/65));y+=edge*edge*(3-2*edge)*(9+6*Math.sin(x*.034+z*.026));
  let flatten=1;for(const p of clearings){const d=Math.hypot(x-p.x,z-p.z);if(d<p.r+11){const t=Math.max(0,Math.min(1,(d-p.r)/11));flatten=Math.min(flatten,t*t*(3-2*t));}}
  const roadMargin=Math.max(0,Math.min(1,(roadDistance(x,z,roads)-4)/10));flatten=Math.min(flatten,roadMargin*roadMargin*(3-2*roadMargin));
  y*=flatten;
  const d=Math.hypot(x-lake.x,z-lake.z),blend=Math.max(0,Math.min(1,(lake.r+6-d)/7));
  return y*(1-blend)+(-2.7+Math.min(1,d/lake.r)*.6)*blend;
 }
 const protectedPoint=(x,z,pad=0)=>clearings.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+pad)||Math.hypot(x-lake.x,z-lake.z)<lake.r+4+pad||roadDistance(x,z,roads)<pad+1;
 return {biome,anchors,buildings,civic,roads,squares,fields,lake,height,protectedPoint};
}
