import {REALM_MASTER_SPEC,targetRealmRadius} from './realm-master-spec.js';
import {createVillageFurnitureLayout,createVillageHomes,villageWalkX} from './realm-village-layout.js';
import {obstacleDistance} from './collision.js';

/** Playable territory measurements, in game units. These are compact artistic
 * interpretations, never a geographic map or a claim of real country size. */
export const REALM_REFERENCE_RADIUS=286*1.7;
export const REALM_CORE_RADIUS=260;
export const REALM_SECTOR_SIZE=256;
const TAU=Math.PI*2;
const seedFor=id=>[...id].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),19)>>>0;
export function realmRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}

// A named province has its own settlement, surroundings and structural
// silhouette. Labels describe inspiration; fictional plazas carry the quests.
export const REALM_PROVINCES=Object.freeze({
 france:[['Passages de Paris','arcade','Passages couverts et pierre de taille, inspirés des rues de Paris.'],['Vallée de Loire','chateau','Château de création, jardins clos et villages inspirés de la Loire.'],['Hauts des Alpes','alpine','Hameaux, sapins et reliefs inspirés des paysages alpins.']],
 algerie:[['Terrasses de la Casbah','casbah','Cours, escaliers et terrasses inspirés de l’architecture de la Casbah d’Alger.'],['Jardins du Sahara','oasis','Oasis de création, palmeraies et ateliers aux portes du désert.'],['Crêtes de Kabylie','mountain','Hameaux de montagne et chemins inspirés de paysages de Kabylie.']],
 maroc:[['Cours de Marrakech','riad','Patios, fontaines et passages inspirés des riads et souks de Marrakech.'],['Rivage de Casablanca','coastal','Promenade et galeries inspirées des villes de la côte atlantique.'],['Chemins de l’Atlas','kasbah','Kasbah de création, villages en terre et sommets inspirés de l’Atlas.']],
 tunisie:[['Jardins de Carthage','ruins','Vestiges de création, colonnes et jardins inspirés de Carthage.'],['Maisons bleu-blanc','coastal','Ruelles de création inspirées des façades de Sidi Bou Saïd.'],['Oliveraies d’El Jem','aqueduct','Arcades de création et oliveraies autour d’un amphithéâtre central inspiré d’El Jem.']],
 espagne:[['Ateliers de Barcelone','modernist','Courbes, mosaïques et ateliers inspirés du modernisme catalan.'],['Patios de Séville','patio','Patios de création, azulejos et fontaines inspirés de l’Andalousie.'],['Monts et oliveraies','windmill','Moulins, terrasses et villages inspirés de paysages espagnols.']],
 italie:[['Sentiers de Rome','aqueduct','Arcades de création et travertin inspirés de l’architecture antique de Rome.'],['Ateliers de Florence','palazzo','Cour et palais de création inspirés de l’architecture florentine.'],['Vignes de Toscane','vineyard','Villages, cyprès et vignes inspirés des collines toscanes.']],
 turquie:[['Bazars d’Istanbul','bazaar','Galeries, ateliers et coupoles inspirés des bazars d’Istanbul.'],['Vallées de Cappadoce','fairychimney','Sentiers et silhouettes minérales inspirés des cheminées de fée de Cappadoce.'],['Plateaux d’Anatolie','caravanserai','Cour de création, tissage et relais inspirés des caravansérails d’Anatolie.']],
 estonie:[['Remparts de Tallinn','wall','Remparts, tours et maisons inspirés de la vieille ville de Tallinn.'],['Bois de Lahemaa','forest','Forêts et sentiers inspirés des paysages du parc de Lahemaa.'],['Rivages baltiques','lighthouse','Village portuaire de création, dunes et pinèdes inspirés du littoral baltique.']],
});

export function realmDimensions(region){
 const ratio=REALM_MASTER_SPEC[region]?.areaTargetMultiplier;
 if(!ratio)return null;
 const radius=targetRealmRadius(REALM_REFERENCE_RADIUS,region);
 return {region,radius,diameter:radius*2,area:Math.PI*radius*radius,areaHubRatio:ratio,referenceRadius:REALM_REFERENCE_RADIUS,coreRadius:REALM_CORE_RADIUS,sectorSize:REALM_SECTOR_SIZE};
}
export function realmSectorAt(point){return{x:Math.floor(point.x/REALM_SECTOR_SIZE),z:Math.floor(point.z/REALM_SECTOR_SIZE)};}
export const realmSectorKey=(x,z)=>x+':'+z;
const cache=new Map();
export function realmLayout(region){
 if(cache.has(region))return cache.get(region);
 const dimensions=realmDimensions(region);if(!dimensions)return null;
 const rng=realmRandom(seedFor(region)),turn=(seedFor(region)%628)/100,sites=[],buildings=[],roads=[];
 const makeSite=(id,name,kind,x,z,province,major=false,context='')=>{
  const site={id:region+':realm:'+id,region,name,kind,x,z,province,major,r:major?88:65,context,arrival:{x,z:z+30},campaign:{x:x-18,z:z+22},monument:{x,z:z-27},rotation:0};
  sites.push(site);
  buildings.push(...createVillageHomes(site));
  return site;
 };
 const origin={x:0,z:320};
 function connect(a,b,id,width=11){
  const start={x:a.x,z:a.z+120},end={x:b.x,z:b.z+120},dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz),points=[{x:a.x,z:a.z},start],steps=Math.max(4,Math.ceil(length/150));
  // A bounded, smooth route follows the land rather than a raised radial deck.
  const bend=Math.min(65,length*.055)*(rng()>.5?1:-1);
  for(let i=1;i<steps;i++){const t=i/steps,offset=Math.sin(t*Math.PI)*bend;points.push({x:start.x+dx*t-dz/length*offset,z:start.z+dz*t+dx/length*offset});}
  points.push(end,{x:b.x,z:b.z});roads.push({id:region+':realm:road:'+id,kind:'countryRoad',width,points});
 }
 const provinces=REALM_PROVINCES[region];
 for(let p=0;p<3;p++){
  const [name,kind,context]=provinces[p],angle=turn+p*TAU/3,r=dimensions.radius*[.22,.47,.73][p],x=Math.cos(angle)*r,z=Math.sin(angle)*r;
  const province=makeSite('province-'+p,name,kind,x,z,p,true,context);connect(origin,province.arrival,'province-'+p);
  for(let v=0;v<4;v++){
   const a=angle+((v%2?1:-1)*(.18+v*.085)),distance=dimensions.radius*[.34,.54,.70,.87][v],vx=Math.cos(a)*distance,vz=Math.sin(a)*distance;
   const village=makeSite('village-'+p+'-'+v,'Hameau '+['des Sources','des Jardins','des Crêtes','du Rivage'][v]+' · '+name,kind,vx,vz,p,false,context);
   connect(province.arrival,village.arrival,'village-'+p+'-'+v,7);
  }
 }
 const guardianAngle=turn+TAU*.13,guardianR=dimensions.radius*.90;
 const guardian={id:region+':realm:guardian-court',region,name:REALM_MASTER_SPEC[region].encounter,kind:'guardianCourt',x:Math.cos(guardianAngle)*guardianR,z:Math.sin(guardianAngle)*guardianR,r:55,arrival:{x:Math.cos(guardianAngle)*guardianR,z:Math.sin(guardianAngle)*guardianR+28},campaign:{x:Math.cos(guardianAngle)*guardianR,z:Math.sin(guardianAngle)*guardianR},major:true,province:3,context:'Lieu de création du Monde 3B. La fiction du gardien ne décrit pas l’histoire du pays.'};
 sites.push(guardian);connect(sites[10].arrival,guardian.arrival,'guardian',9);
 // The central terminal is outside the original story/architecture footprint.
 const terminal={id:region+':realm:terminal',region,name:'Relais central',kind:'terminal',x:origin.x,z:origin.z,r:20,arrival:{x:origin.x,z:origin.z},campaign:{x:origin.x,z:origin.z},province:-1,context:'Retour au noyau historique et départ vers les provinces.'};
 sites.unshift(terminal);
 // Routes skirt settlement envelopes instead of cutting through another
 // village. Only the authored centre aisle is allowed into an endpoint town.
 const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
 for(const road of roads){
  const envelopes=sites.filter(s=>s.kind!=='terminal').map(s=>({...s,r:s.r+road.width/2+12}));
  for(let i=1;i<road.points.length-1;i++)for(const s of envelopes){const p=road.points[i],d=Math.hypot(p.x-s.x,p.z-s.z);if(d<s.r){const angle=Math.atan2(p.z-s.z,p.x-s.x);p.x=s.x+Math.cos(angle)*(s.r+3);p.z=s.z+Math.sin(angle)*(s.r+3);}}
  const routed=[road.points[0]];
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],blocked=envelopes.filter(s=>Math.hypot(a.x-s.x,a.z-s.z)>s.r-.1&&Math.hypot(b.x-s.x,b.z-s.z)>s.r-.1&&segmentDistance(s,a,b)<s.r);
   if(!blocked.length){routed.push(b);continue;}
   const nodes=[a,b,...blocked.flatMap(s=>[-1,1].flatMap(x=>[-1,1].map(z=>({x:s.x+x*(s.r+4),z:s.z+z*(s.r+4)}))))],scores=new Map([[0,0]]),previous=new Map(),visited=new Set();
   const clear=(u,v)=>!envelopes.some(s=>Math.hypot(a.x-s.x,a.z-s.z)>s.r-.1&&Math.hypot(b.x-s.x,b.z-s.z)>s.r-.1&&segmentDistance(s,u,v)<s.r-.1);
   while(visited.size<nodes.length){let next=-1,best=Infinity;for(const [node,score] of scores)if(!visited.has(node)&&score<best){next=node;best=score;}if(next<0||next===1)break;visited.add(next);for(let n=0;n<nodes.length;n++){if(visited.has(n)||n===next||!clear(nodes[next],nodes[n]))continue;const cost=best+Math.hypot(nodes[next].x-nodes[n].x,nodes[next].z-nodes[n].z);if(cost<(scores.get(n)??Infinity)){scores.set(n,cost);previous.set(n,next);}}}
   if(!previous.has(1)){routed.push(b);continue;}
   const path=[];let n=1;while(n!==0){path.unshift(nodes[n]);n=previous.get(n);}routed.push(...path);
  }
  road.points=routed;
 }
 const layout={...dimensions,seed:seedFor(region),sites,buildings,roads,provinces};cache.set(region,layout);return layout;
}
export const realmSites=region=>realmLayout(region)?.sites||[];
export const realmBuildings=region=>realmLayout(region)?.buildings||[];
export const realmRoads=region=>realmLayout(region)?.roads||[];
/** Columns frame the guardian court without closing its southern entrance or
 * reducing the wide, unobstructed central combat floor. Shared with rendering. */
export const REALM_COURT_COLUMNS=Object.freeze(Array.from({length:7},(_,i)=>{
 const angle=(i+1)*Math.PI/4;return Object.freeze({x:Math.sin(angle)*47,z:Math.cos(angle)*47});
}));
export function realmMonumentObstacles(region){return realmSites(region).filter(s=>s.major&&s.monument).flatMap(s=>{
 const {x,z}=s.monument;
 if(['arcade','aqueduct','ruins','wall'].includes(s.kind))return[
  ...[-2,-1,0,1,2].map(i=>({id:s.id+':pier:'+i,x:x+i*8,z,width:1.8,depth:3,height:11,rotation:0})),
  ...(s.kind==='wall'?[-1,1].map(side=>({id:s.id+':tower:'+side,x:x+side*16,z:z-2,width:7.4,depth:7.4,height:25,rotation:0})):[]),
  ...(s.kind==='ruins'?[-1,1].map(side=>({id:s.id+':column:'+side,x:x+side*11,z:z+8,width:1.6,depth:1.6,height:6,rotation:0})):[]),
 ];
 if(['forest','alpine','vineyard','mountain'].includes(s.kind))return[{id:s.id+':plinth',x,z,width:8,depth:7,height:4,rotation:0},...[-1,1].map(side=>({id:s.id+':shelter:'+side,x:x+side*9,z:z-2,width:.5,depth:.5,height:4.5,rotation:0}))];
 if(s.kind==='fairychimney')return Array.from({length:9},(_,i)=>{const a=i*2.399,r=8+((i*7)%9);return{id:s.id+':chimney:'+i,x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,width:4.4,depth:4.4,height:8+i*1.4,rotation:0};});
 if(['riad','patio','bazaar','caravanserai','oasis'].includes(s.kind))return[
  ...[-1,1].map(side=>({id:s.id+':court-side:'+side,x:x+side*11,z,width:4,depth:23,height:10,rotation:0})),
  {id:s.id+':court-back',x,z:z-9.5,width:26,depth:4,height:10,rotation:0},
  ...[-1,1].map(side=>({id:s.id+':court-front:'+side,x:x+side*8,z:z+9.5,width:10,depth:4,height:10,rotation:0})),
  {id:s.id+':court-fountain',x,z,width:6,depth:6,height:.7,rotation:0},
 ];
 if(s.kind==='lighthouse'||s.kind==='windmill')return[{id:s.id+':monument',x,z,width:13,depth:11,height:26,rotation:0}];
 return [{id:s.id+':monument',x,z,width:26,depth:19,height:22,rotation:0}];
});}
const realmStructuralObstacles=region=>[...realmBuildings(region).map(b=>({...b})),...realmMonumentObstacles(region),...realmSites(region).filter(s=>s.kind==='guardianCourt').flatMap(s=>REALM_COURT_COLUMNS.map((p,i)=>({id:s.id+':column:'+i,x:s.x+p.x,z:s.z+p.z,width:3.6,depth:3.6,height:9,rotation:0})))];
const furnitureCache=new Map();
export function realmStreetFurniture(region){if(!realmLayout(region))return[];if(!furnitureCache.has(region))furnitureCache.set(region,createVillageFurnitureLayout(realmLayout(region),realmStructuralObstacles(region)));return furnitureCache.get(region);}
export const realmStaticObstacles=region=>[...realmStructuralObstacles(region),...realmStreetFurniture(region).map(p=>({...p}))];
export function realmCampaignPosition(region,index=0){
 const sites=realmSites(region),site=index===3?sites.find(s=>s.kind==='guardianCourt'):sites.find(s=>s.id.endsWith('province-'+Math.max(0,Math.min(2,index))));
 return site?{...site.campaign,site:site.id,province:site.province,name:site.name}:{x:0,z:5};
}
export function realmTravelItems(region){return realmSites(region).map(site=>({id:site.id+':relay',type:'realmTravel',region,name:site.name,label:site.name,...site.arrival,range:6,site:site.id,province:site.province,description:site.context,unlocked:true}));}
export function realmNavigationItems(region){return realmSites(region).map(site=>({id:site.id,type:'realmSite',region,name:site.name,...site.campaign,range:6,province:site.province,kind:site.kind,description:site.context}));}
export function realmCivilianRoadItems(region){
 return realmSites(region).filter(s=>s.kind!=='terminal'&&s.kind!=='guardianCourt').flatMap(s=>[
  ...[-4,0,4].map(x=>({id:s.id+':civilian:'+x,width:3,from:{x:s.x+x,z:s.z-6},to:{x:s.x+x,z:s.z+35}})),
  ...[-1,1].map(side=>({id:s.id+':promenade:'+side*20,width:3,from:{x:s.x+side*villageWalkX(s),z:s.z-43},to:{x:s.x+side*villageWalkX(s),z:s.z+43}})),
  ...[0,24].map(z=>({id:s.id+':crossing:'+z,width:2.8,from:{x:s.x-villageWalkX(s),z:s.z+z},to:{x:s.x+villageWalkX(s),z:s.z+z}})),
 ].map(route=>({...route,type:'hubRoad',kind:'street'})));
}
export function realmPositionValid(region,point,padding=.9){
 const size=realmDimensions(region);return !!size&&!!point&&Number.isFinite(point.x)&&Number.isFinite(point.z)&&Math.hypot(point.x,point.z)<=size.radius-padding&&!realmStaticObstacles(region).some(b=>obstacleDistance(point,b)<padding);
}
export function safeRealmPosition(region,point){
 if(realmPositionValid(region,point))return{x:point.x,z:point.z};
 if(point&&Number.isFinite(point.x)&&Number.isFinite(point.z))for(let r=3;r<=24;r+=3)for(let i=0;i<12;i++){const a=i*TAU/12,p={x:point.x+Math.cos(a)*r,z:point.z+Math.sin(a)*r};if(realmPositionValid(region,p))return p;}
 return{x:0,z:5};
}
/** Fast walking on inter-province roads keeps large spaces usable; sprint is
 * still controlled by gameplay. This multiplier never changes combat speed. */
export function realmTraversal(region,point,{combat=false}={}){
 if(!realmDimensions(region)||combat||Math.hypot(point.x,point.z)<REALM_CORE_RADIUS+60)return{speedMultiplier:1,mode:'walk'};
 const nearSite=realmSites(region).some(s=>Math.hypot(point.x-s.x,point.z-s.z)<s.r+35);
 return{speedMultiplier:nearSite?1:2.4,mode:nearSite?'walk':'journey'};
}
