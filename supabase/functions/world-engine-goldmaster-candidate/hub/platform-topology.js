/** Authoritative physical city: layout coordinates, y=0 public decks.
 * Every island coast and causeway is shared by render, collision and map. */
const freezeSites=sites=>Object.freeze(sites.map(site=>Object.freeze(site)));
export const CITE_COAST_SEGMENTS=64;
const coastVertices=new WeakMap();
export const CITE_GATE_SITES=freezeSites([
 {sector:0,x:-10,z:-216,r:43,name:'estonie',cliffDepth:52},
 {sector:1,x:145,z:-159,r:43,name:'turquie',cliffDepth:44},
 {sector:2,x:215,z:-12,r:43,name:'italie',cliffDepth:35},
 {sector:3,x:163,z:143,r:42,name:'tunisie',cliffDepth:42},
 {sector:4,x:70,z:200,r:41,name:'algerie',cliffDepth:49},
 {sector:5,x:-145,z:151,r:44,name:'maroc',cliffDepth:45},
 {sector:6,x:-217,z:22,r:43,name:'espagne',cliffDepth:38},
 {sector:7,x:-176,z:-134,r:42,name:'france',cliffDepth:54},
].map(site=>{const angle=Math.atan2(site.z,site.x),baseY=({0:8,1:6,4:3,7:4})[site.sector]||0;return{...site,...(baseY?{x:Math.cos(angle)*238,z:Math.sin(angle)*238}:{}),angle,baseY};}));
export const CITE_ISLANDS=freezeSites([
 {id:'refuge',x:-56,z:100,r:24,cliffDepth:31},{id:'station',x:0,z:132,r:22,cliffDepth:28},{id:'builders-annex',x:59,z:95,r:25,cliffDepth:36},
 {id:'nexus',x:0,z:0,r:42,cliffDepth:38},{id:'arrival',x:0,z:35,r:30,cliffDepth:29},
 ...[[-66,-66,'archives',40,42],[66,-66,'arena',44,36],[94,0,'commerce',40,32],[-94,0,'community',40,39],[0,-94,'innovation',40,45],[0,100,'docks',40,30],[66,66,'builders',40,37],[-66,66,'gardens',40,43]].map(([x,z,id,r,cliffDepth])=>({id,x,z,r,cliffDepth})),
 ...CITE_GATE_SITES.map(site=>({...site,id:'gate-'+site.sector})),
 ...Array.from({length:8},(_,i)=>{const a=(i+.5)*Math.PI/4;return{id:'residence-'+i,x:Math.cos(a)*132,z:Math.sin(a)*132,r:17,cliffDepth:27+(i%4)*4};}),
]);
export const CITE_BRIDGES=freezeSites(Array.from({length:8},(_,i)=>{
 const a=-Math.PI/2+i*Math.PI/4;
 return{id:'civic-axis-'+i,x:Math.cos(a)*88,z:Math.sin(a)*88,length:132,width:12,angle:a};
}));
export const CITE_PROMENADES=freezeSites([
 {id:'heritage-promenade',inner:119,outer:131},
 {id:'horizon-arcade',inner:173,outer:183},
]);
const segment=(id,start,end,width,startHeight=0,endHeight=startHeight)=>({id,x:(start.x+end.x)/2,z:(start.z+end.z)/2,length:Math.hypot(end.x-start.x,end.z-start.z),width,angle:Math.atan2(end.z-start.z,end.x-start.x),startHeight,endHeight});
function countrySpans(site,i){
 const a=-Math.PI/2+i*Math.PI/4,start={x:Math.cos(a)*146,z:Math.sin(a)*146};
 if(!site.baseY)return[segment('country-causeway-'+i,start,site,10)];
 const ux=Math.cos(site.angle),uz=Math.sin(site.angle),px=-uz,pz=ux;
 const A={x:ux*190-px*23,z:uz*190-pz*23},B={x:ux*194+px*31,z:uz*194+pz*31};
 // Broad switchback slopes remain outside the low transit arcade and the
 // raised island; the final level landing meets the country's axial aisle.
 const coast=citeIslandRadius({...site,id:'gate-'+i},site.angle+Math.PI),C={x:site.x-ux*(coast+2),z:site.z-uz*(coast+2)};
 return[segment('country-causeway-'+i,start,A,10),segment('country-ramp-'+i+'-a',A,B,10,0,site.baseY*.7),segment('country-ramp-'+i+'-b',B,C,10,site.baseY*.7,site.baseY),segment('country-landing-'+i,C,site,10,site.baseY)];
}
export const CITE_DOCK_SPANS=freezeSites([
 {id:'dock-main',x:0,z:172,length:48,width:12,angle:Math.PI/2},
 {id:'dock-cross',x:0,z:188,length:100,width:8,angle:0},
 ...[-43,0,43].map((x,i)=>({id:'dock-finger-'+i,x,z:206,length:36,width:8,angle:Math.PI/2})),
]);
export const CITE_CONNECTORS=freezeSites([
 ...Array.from({length:8},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/4;return{id:'horizon-causeway-'+i,x:Math.cos(angle)*162,z:Math.sin(angle)*162,length:34,width:9,angle};}),
 ...CITE_GATE_SITES.flatMap(countrySpans),
 ...CITE_DOCK_SPANS,
]);
const surfaceSpans=[...CITE_BRIDGES,...CITE_CONNECTORS].map(span=>{const cos=Math.cos(span.angle),sin=Math.sin(span.angle);return{...span,cos,sin,extentX:(Math.abs(cos)*span.length+Math.abs(sin)*span.width)/2,extentZ:(Math.abs(sin)*span.length+Math.abs(cos)*span.width)/2};});
function phase(island){return[...island.id].reduce((n,c)=>n+c.charCodeAt(0),0)*.017;}
function rawCoast(island,angle){
 const seed=phase(island),gate=island.id.startsWith('gate-');
 const fracture=gate?.075*Math.sin(angle*3+seed)+.035*Math.sin(angle*7-seed):.065*Math.sin(angle*3+seed)+.035*Math.sin(angle*5-seed)+.02*Math.sin(angle*11+seed*.4);
 return island.r*(1+fracture);
}
/** Exact radial intersection with the actual 64-sided coast, not a circular shortcut. */
export function citeIslandRadius(island,angle){
 if(!coastVertices.has(island))coastVertices.set(island,Array.from({length:CITE_COAST_SEGMENTS},(_,i)=>{const a=i*Math.PI*2/CITE_COAST_SEGMENTS,r=rawCoast(island,a);return{x:Math.cos(a)*r,z:Math.sin(a)*r,r};}));
 const points=coastVertices.get(island),step=Math.PI*2/CITE_COAST_SEGMENTS,a=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2),index=Math.floor(a/step),p=points[index%CITE_COAST_SEGMENTS],q=points[(index+1)%CITE_COAST_SEGMENTS],r0=p.r,x0=p.x,z0=p.z,ex=q.x-x0,ez=q.z-z0;
 const ux=Math.cos(a),uz=Math.sin(a),denom=ux*ez-uz*ex;
 return Math.abs(denom)<1e-10?r0:(x0*ez-z0*ex)/denom;
}
export function citeIslandContour(island){
 return Array.from({length:CITE_COAST_SEGMENTS},(_,i)=>{const angle=i*Math.PI*2/CITE_COAST_SEGMENTS,r=rawCoast(island,angle);return{x:island.x+Math.cos(angle)*r,z:island.z+Math.sin(angle)*r};});
}
export function citeSurfaceDistance(x,z){
 let result=Infinity;const radius=Math.hypot(x,z);
 for(const ring of CITE_PROMENADES)result=Math.min(result,Math.abs(radius-(ring.inner+ring.outer)/2)-(ring.outer-ring.inner)/2);
 for(const island of CITE_ISLANDS){const dx=x-island.x,dz=z-island.z,reach=island.r*1.13+result;if(reach>0&&dx*dx+dz*dz<reach*reach)result=Math.min(result,Math.hypot(dx,dz)-citeIslandRadius(island,Math.atan2(dz,dx)));}
 for(const bridge of surfaceSpans){const dx=x-bridge.x,dz=z-bridge.z,reach=Math.max(0,result);if(Math.abs(dx)>bridge.extentX+reach||Math.abs(dz)>bridge.extentZ+reach)continue;const c=bridge.cos,s=bridge.sin,along=Math.abs(dx*c+dz*s)-bridge.length/2,across=Math.abs(-dx*s+dz*c)-bridge.width/2;result=Math.min(result,Math.hypot(Math.max(0,along),Math.max(0,across))+Math.min(0,Math.max(along,across)));}
 return result;
}
export function citeSpanHeight(span,x,z){
 const along=(x-span.x)*Math.cos(span.angle)+(z-span.z)*Math.sin(span.angle),t=Math.max(0,Math.min(1,along/span.length+.5));
 return(span.startHeight||0)+((span.endHeight||0)-(span.startHeight||0))*t;
}
/** Height belongs to exactly the same rendered footprint as the physical deck.
 * Country switchbacks have continuous landings; civic services remain at y=0. */
export function citeTerrainHeight(x,z){
 let height=0;
 for(const island of CITE_ISLANDS)if(island.baseY&&Math.hypot(x-island.x,z-island.z)<=citeIslandRadius(island,Math.atan2(z-island.z,x-island.x))+.00001)height=Math.max(height,island.baseY);
 for(const span of CITE_CONNECTORS)if(span.startHeight||span.endHeight){const dx=x-span.x,dz=z-span.z,c=Math.cos(span.angle),s=Math.sin(span.angle);if(Math.abs(dx*c+dz*s)<=span.length/2+.00001&&Math.abs(-dx*s+dz*c)<=span.width/2+.00001)height=Math.max(height,citeSpanHeight(span,x,z));}
 return height;
}
