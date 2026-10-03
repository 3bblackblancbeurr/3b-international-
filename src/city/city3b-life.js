import {cityMapBlueprint,cityMapRoads} from './city3b-map.js';

const number=(value,max=200000)=>Math.max(0,Math.min(max,Math.round(Number(value)||0)));
export const CITY_LIFE_POLICIES=[
 {code:'balanced',title:'Équilibre',description:'Un peu plus de bien-être pour l’ensemble du quartier.'},
 {code:'green',title:'Ville jardin',description:'Les espaces verts couvrent davantage les besoins des habitants.'},
 {code:'industry',title:'Ville active',description:'Les logements disponibles accueillent les habitants plus rapidement.'},
 {code:'culture',title:'Transmission',description:'Les lieux culturels couvrent davantage les besoins du quartier.'},
];
export const CITY_LIFE_BUILD_ACTIONS={water:'WATER_3B',energy:'SOLAR_3B',food:'SHOP_3B',health:'CLINIC_3B',education:'SCHOOL_3B',green:'TREE_MATRIX',culture:'LIBRARY_3B'};
export const CITY_LIFE_ACTIVITY={home:'À la maison',work:'Vers son lieu de travail',shopping:'Vers un commerce',walk:'Vers un espace vert',culture:'Vers un lieu culturel'};

// Only a confirmed server runtime can supply a census or event status.
export function cityLifeSnapshot(snapshot={}){
 const life=snapshot.life;
 if(life?.available!==true)return {available:false,day:0,population:0,housingCapacity:0,jobs:0,employed:0,workingPopulation:0,mobility:0,happiness:0,needs:[],inhabitants:[],events:[],history:[]};
 return {...life,available:true,day:number(life.day,2147483647),population:number(life.population),housingCapacity:number(life.housingCapacity),jobs:number(life.jobs),employed:number(life.employed),workingPopulation:number(life.workingPopulation),mobility:number(life.mobility,100),happiness:number(life.happiness,100),needs:(Array.isArray(life.needs)?life.needs:[]).map(n=>({...n,score:number(n.score,100),capacity:number(n.capacity),demand:number(n.demand)})),inhabitants:(Array.isArray(life.inhabitants)?life.inhabitants:[]).slice(0,24),events:Array.isArray(life.events)?life.events:[],history:(Array.isArray(life.history)?life.history:[]).slice(-12)};
}

export function cityLifeNextStep(life){
 if(!life.available)return null;
 if(!life.housingCapacity)return {title:'Accueillir nos premiers voisins',description:'Place une maison : les logements disponibles accueillent les habitants au fil des cycles.',action:{tab:'build',building:'HOME_ORIGIN'}};
 const weakest=life.needs.filter(n=>n.demand>0).sort((a,b)=>a.score-b.score)[0];
 if(weakest&&weakest.score<70)return {title:`Développer ${weakest.label.toLocaleLowerCase('fr')}`,description:`La capacité actuelle couvre ${weakest.score}% du besoin. Un équipement supplémentaire accompagne la population.`,action:{tab:'build',building:CITY_LIFE_BUILD_ACTIONS[weakest.code]||'HOME_ORIGIN'}};
 if(life.employed<life.workingPopulation)return {title:'Créer des emplois dans le quartier',description:`${life.workingPopulation-life.employed} actifs cherchent encore un emploi. Les commerces et services créent des postes.`,action:{tab:'build',building:'SHOP_3B'}};
 if(life.mobility<65)return {title:'Relier les lieux de vie',description:'Place un arrêt de bus et rapproche tes bâtiments des routes. Les axes personnels complètent le réseau.',action:{tab:'build',building:'BUS_STOP_3B'}};
 return {title:'Préparer le prochain rendez-vous',description:'Les événements prolongent les missions avec des conditions à maintenir dans une ville qui fonctionne.',action:{tab:'life'}};
}

const center=p=>({x:Number(p.x)+Math.max(1,Number(p.footprint_w)||1)/2,z:Number(p.z)+Math.max(1,Number(p.footprint_h)||1)/2});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function project(point,segment){
 const dx=segment.x2-segment.x1,dz=segment.z2-segment.z1,len=dx*dx+dz*dz;
 const t=len?Math.max(0,Math.min(1,((point.x-segment.x1)*dx+(point.z-segment.z1)*dz)/len)):0;
 return {x:segment.x1+t*dx,z:segment.z1+t*dz};
}

// Lightweight, deterministic routes: walk to a real road, follow its graph, walk to destination.
// Ring roads are represented by 16 segments; crossings are linked rather than guessed as free paths.
export function cityResidentRoutes(snapshot={},budget=24){
 const life=cityLifeSnapshot(snapshot);if(!life.available||!life.population)return [];
 const placements=new Map((snapshot.placements||[]).filter(p=>p.placement_state!=='stored').map(p=>[p.id,p]));
 const blueprint=cityMapBlueprint(snapshot),roads=cityMapRoads(blueprint);
 const segments=[...roads.boulevards,...roads.custom,...roads.radials.filter(r=>r.unlocked),...roads.rings.flatMap(r=>Array.from({length:16},(_,i)=>({x1:Math.cos(i*Math.PI/8)*r.radius,z1:Math.sin(i*Math.PI/8)*r.radius,x2:Math.cos((i+1)*Math.PI/8)*r.radius,z2:Math.sin((i+1)*Math.PI/8)*r.radius})))];
 const points=[],edges=[];const key=p=>`${p.x.toFixed(3)},${p.z.toFixed(3)}`;const ids=new Map();
 const node=p=>{const k=key(p);if(ids.has(k))return ids.get(k);const id=points.length;points.push(p);edges.push([]);ids.set(k,id);return id;};
 const link=(a,b)=>{if(a===b)return;const weight=distance(points[a],points[b]);edges[a].push([b,weight]);edges[b].push([a,weight]);};
 const cuts=segments.map(s=>[0,1]);
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i],b=segments[j],dx=a.x2-a.x1,dz=a.z2-a.z1,ex=b.x2-b.x1,ez=b.z2-b.z1,det=dx*ez-dz*ex;
  if(Math.abs(det)<.0001)continue;
  const rx=b.x1-a.x1,rz=b.z1-a.z1,t=(rx*ez-rz*ex)/det,u=(rx*dz-rz*dx)/det;
  if(t>=0&&t<=1&&u>=0&&u<=1){cuts[i].push(t);cuts[j].push(u);}
 }
 const segmentNodes=segments.map((s,i)=>{const list=[...new Set(cuts[i])].sort((a,b)=>a-b).map(t=>node({x:s.x1+t*(s.x2-s.x1),z:s.z1+t*(s.z2-s.z1)}));for(let k=1;k<list.length;k++)link(list[k-1],list[k]);return list;});
 const shortest=(from,to)=>{
  const costs=new Map([[from,0]]),previous=new Map(),seen=new Set();
  while(seen.size<points.length){let current=-1,cost=Infinity;for(const [id,value]of costs)if(!seen.has(id)&&value<cost){current=id;cost=value;}if(current<0)break;if(current===to){const route=[to];while(previous.has(route[0]))route.unshift(previous.get(route[0]));return route.map(id=>points[id]);}seen.add(current);for(const [id,weight]of edges[current])if(cost+weight<(costs.get(id)??Infinity)){costs.set(id,cost+weight);previous.set(id,current);}}
  return null;
 };
 const nearest=p=>segments.map((s,i)=>({p:project(p,s),i})).sort((a,b)=>distance(p,a.p)-distance(p,b.p))[0];
 return life.inhabitants.slice(0,Math.max(0,Math.min(24,budget))).flatMap((resident,index)=>{
  const home=placements.get(resident.homePlacementId),target=placements.get(resident.targetPlacementId);if(!home||!target)return [];
  const start=center(home),end=center(target);if(distance(start,end)<.5)return [{...resident,path:`M ${start.x} ${start.z}`,x:start.x,z:start.z,moving:false,duration:12,delay:index*.6}];
  const a=nearest(start),b=nearest(end);if(!a||!b)return [];
  const from=node(a.p),to=node(b.p);for(const id of segmentNodes[a.i])link(from,id);for(const id of segmentNodes[b.i])link(to,id);
  const route=shortest(from,to);if(!route)return [{...resident,path:`M ${start.x} ${start.z}`,x:start.x,z:start.z,moving:false,duration:12,delay:index*.6,disconnected:true}];
  const path=[start,...route,end],length=path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0);
  return [{...resident,path:path.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${p.z.toFixed(2)}`).join(' '),x:start.x,z:start.z,moving:true,duration:Math.max(8,Math.min(32,length/4)),delay:-(index*1.3%12)}];
 });
}
