import {RESOURCE_SITES,frontierState,patrolOpponent} from './frontier.js';
// Authored districts inspired by real places, not geographic replicas.
export const REGIONS={
 hub:{city:'Le Nexus',craft:'Le Cercle des artisans',rural:'Les jardins des liens',crop:'garden',paving:'#b8b6a0',earth:'#8c9270'},
 france:{city:'Les passages de Paris',craft:'Le quartier des verrières',rural:'Les vergers de Loire',crop:'orchard',paving:'#c8bba5',earth:'#a49b70',source:'https://parisjetaime.com/article/paris-insolite-les-passages-couverts-a1801'},
 italie:{city:'Les cours de Florence',craft:'La place des ateliers',rural:'Les vignes de Toscane',crop:'vineyard',paving:'#c0a183',earth:'#ae946b',source:'https://www.feelflorence.it/'},
 estonie:{city:'Les ruelles de Tallinn',craft:'La cour des tisserands',rural:'La lisière de Lahemaa',crop:'forest',paving:'#9ea9a1',earth:'#6e8373',source:'https://visitestonia.com/en/where-to-go/lahemaa-national-park-estonia'},
 turquie:{city:'Les cours d’Istanbul',craft:'Le bazar des résonances',rural:'Les vallées de Cappadoce',crop:'rocks',paving:'#c1afa0',earth:'#b99c7e',source:'https://goturkiye.com/architecture/architectural-wonders'},
 algerie:{city:'Les terrasses d’Alger',craft:'La cour des artisans',rural:'Les jardins de l’oasis',crop:'oasis',paving:'#d6c6a5',earth:'#c5aa77',source:'https://whc.unesco.org/fr/list/565'},
 tunisie:{city:'Les ruelles de Sidi Bou Saïd',craft:'La place des céramistes',rural:'Les oliveraies du rivage',crop:'olive',paving:'#ddd3b7',earth:'#b4ab82',source:'https://www.discovertunisia.com/decouvrir/carthage-et-sidi-bou-said'},
 maroc:{city:'Les cours de Marrakech',craft:'Le souk des couleurs',rural:'Les terrasses de l’Atlas',crop:'terrace',paving:'#c39370',earth:'#b88d64',source:'https://www.visitmorocco.com/fr/voyage/marrakech/medina'},
 espagne:{city:'Les patios de Séville',craft:'La place des azulejos',rural:'Les oliviers d’Andalousie',crop:'olive',paving:'#d0b591',earth:'#b79f70',source:'https://www.spain.info/en/region/andalusia/'},
};
export const DISTRICT_SPOTS=[{key:'city',x:-18,z:-12,r:35},{key:'craft',x:-18,z:17,r:14},{key:'rural',x:48,z:28,r:23}];
export function districtAt(region,position,transform){if(region==='hub')return REGIONS.hub.city;const config=REGIONS[region]||REGIONS.hub;let closest='Les chemins du pays',best=Infinity;for(const d of DISTRICT_SPOTS){const p=transform(d.x,d.z),distance=Math.hypot(p.x-position.x,p.z-position.z);if(distance<d.r*1.6&&distance<best){closest=config[d.key];best=distance;}}return closest;}
// Rounded corners are shared by rendering, footprints and the mini-map.
function roundLane(points){
 const result=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],entry=b.map((v,k)=>v+(a[k]-v)*.23),exit=b.map((v,k)=>v+(c[k]-v)*.23);
  result.push(entry);
  for(let step=1;step<=6;step++){const t=step/6;result.push(b.map((v,k)=>(1-t)*(1-t)*entry[k]+2*(1-t)*t*v+t*t*exit[k]));}
 }
 result.push(points.at(-1));return result;
}
export function settlementPlan(region){
 const c=REGIONS[region]||REGIONS.hub;if(region==='hub')return{roads:[],plots:[],squares:[{x:0,z:-3,r:14},{x:-18,z:17,r:8}],fields:[]};
 // Streets grow around courtyards and an old trade road, not a grid.
 const roads=[],plots=[],index=Object.keys(REGIONS).indexOf(region);
 const warp=([x,z])=>[x+Math.sin(z*.058+index)*({france:1,italie:2,estonie:3,turquie:2.8,algerie:3.8,tunisie:2.5,maroc:3.5,espagne:1.8}[region]),z+Math.sin(x*.045+index*.7)*2.2];
 const lanes=[
  [[0,17],[-4,3],[-12,-9],[-21,-21],[-27,-37],[-18,-53]],
  [[-4,3],[-24,7],[-43,-1],[-60,-17],[-54,-38],[-38,-52],[-18,-53],[4,-48],[20,-33],[15,-16],[-12,-9]],
  [[-60,-17],[-45,-25],[-21,-21],[2,-29],[20,-33]],
  [[-43,-1],[-42,-12],[-45,-25],[-38,-52]],
  [[-24,7],[-18,17],[0,17]],
 ];
 for(const [lane,line] of lanes.entries()){
  const points=roundLane(line.map(warp)),width=lane===0?(region==='france'?6:5.3):4.8;
  roads.push({kind:'street',width,points});
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);
  for(let at=5;at<total-5;at+=9.2){let segment=0,left=at;while(left>lengths[segment]&&segment<lengths.length-1)left-=lengths[segment++];
   const a=points[segment],b=points[segment+1],t=left/lengths[segment],angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
   for(const side of [-1,1]){const offset=width/2+4.6;plots.push({x:a[0]+(b[0]-a[0])*t-Math.sin(angle)*side*offset,z:a[1]+(b[1]-a[1])*t+Math.cos(angle)*side*offset,rotation:-angle+(side<0?0:Math.PI),variant:plots.length,urban:true});}
  }
 }
 roads.push({kind:'trail',width:3.3,points:roundLane([[0,5],[18,8],[32,19],[49,26],[62,31]])},
  {kind:'trail',width:3.1,points:roundLane([[11,-4],[25,-16],[35,-35]])},
  {kind:'trail',width:3.2,points:roundLane([warp([-18,-53]),[0,-57]])});
 for(const [i,[x,z]] of [[34,34],[60,11],[60,40],[35,51],[23,40],[56,-9]].entries())plots.push({x,z,rotation:i*.8,variant:60+i,urban:false});
 return {roads,plots,squares:[{x:-18,z:17,r:8},{x:9,z:-4,r:7},{x:49,z:26,r:7}],fields:[{x:46,z:40,w:19,h:12,kind:c.crop},{x:48,z:8,w:16,h:10,kind:c.crop}]};
}
export function serviceItems(region,save){const c=REGIONS[region];if(!c)return[];if(region==='hub')return[{id:'hub:atelier',type:'atelier',name:'Atelier · Le Cercle des artisans',x:-18,z:17,color:'#efbd72',range:5}];return[
 {id:region+':camp',type:'camp',name:'Mon refuge',x:27,z:25,color:'#edc782',range:6},
 {id:region+':patrol',type:'patrol',name:'Protéger les environs',x:31,z:36,color:'#dc9a7c',range:6,card:save.adventure?.encounter?.patrol&&save.adventure.encounter.region===region?save.adventure.encounter.card:patrolOpponent(region,frontierState(save,region).expedition).id},
 ...RESOURCE_SITES.map(p=>({id:region+':resource:'+p.id,type:'resource',resource:p.id,name:p.name,x:p.x,z:p.z,color:'#a8c88c',range:4,done:frontierState(save,region).harvest.includes(p.id)})),
 {id:region+':sanctuary',type:'sanctuary',name:save.adventure?.chapters?.[region]?.restored>=2?(save.adventure.chapters[region].choice==='workshop'?'Préparer le groupe à l’atelier':'Se reposer au jardin'):'Quartier à reconstruire',x:29,z:15,color:'#9ec8ac',range:6},
 {id:region+':atelier',type:'atelier',name:'Atelier · '+c.craft,x:-18,z:17,color:'#efbd72',range:5},
 ...[{key:'city',x:-39,z:-22},{key:'rural',x:49,z:26}].map(p=>({id:region+':survey:'+p.key,type:'survey',name:c[p.key],x:p.x,z:p.z,color:'#a8d4ae',range:5,done:save.adventure?.discoveries?.includes(region+':'+p.key)})),
 ];}
export const DISCOVERY_IDS=Object.keys(REGIONS).filter(id=>id!=='hub').flatMap(id=>[id+':city',id+':rural']);
export function compassHeading(yaw=0){return ((-yaw*180/Math.PI)%360+360)%360;}
