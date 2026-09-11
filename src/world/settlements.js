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
export function settlementPlan(region){
 const c=REGIONS[region]||REGIONS.hub;if(region==='hub')return{roads:[],plots:[],squares:[{x:0,z:-3,r:14},{x:-18,z:17,r:8}],fields:[]};
 const curve=['maroc','algerie','turquie','estonie'].includes(region),roads=[],plots=[];
 for(const [row,z] of [-31,-13,5].entries()){
  const offset=curve?(row-1)*3:0;roads.push({kind:'street',width:4.4,points:[[-49,z+offset],[-28,z],[-10,z-offset],[17,z]]});
  for(let col=0;col<7;col++)for(const side of [-1,1]){const x=-43+col*8.8,zz=z+side*5.8+(curve?Math.sin(col*.8+row)*2:0);plots.push({x,z:zz,rotation:side<0?0:Math.PI,variant:row*14+col*2+(side+1)/2,urban:true});}
 }
 roads.push({kind:'street',width:4.8,points:[[-18,-45],[-18,-31],[-19,-13],[-18,5],[-18,23]]},{kind:'street',width:4,points:[[6,-37],[7,-14],[7,5],[0,20]]},{kind:'trail',width:2.7,points:[[0,5],[18,8],[32,19],[49,26],[62,31]]},{kind:'trail',width:2.6,points:[[11,-4],[25,-16],[35,-35]]},{kind:'trail',width:2.8,points:[[-18,-31],[-7,-43],[0,-57]]});
 for(const [i,[x,z]] of [[34,34],[58,12],[64,39],[37,48]].entries())plots.push({x,z,rotation:i*.8,variant:60+i,urban:false,scale:.83});
 return {roads,plots,squares:[{x:-18,z:17,r:8},{x:9,z:-4,r:7},{x:49,z:26,r:7}],fields:[{x:46,z:40,w:19,h:12,kind:c.crop},{x:48,z:8,w:16,h:10,kind:c.crop}]};
}
export function serviceItems(region,save){const c=REGIONS[region];if(!c)return[];if(region==='hub')return[{id:'hub:atelier',type:'atelier',name:'Atelier · Le Cercle des artisans',x:-18,z:17,color:'#efbd72',range:5}];return[
 {id:region+':atelier',type:'atelier',name:'Atelier · '+c.craft,x:-18,z:17,color:'#efbd72',range:5},
 ...[{key:'city',x:-39,z:-22},{key:'rural',x:49,z:26}].map(p=>({id:region+':survey:'+p.key,type:'survey',name:c[p.key],x:p.x,z:p.z,color:'#a8d4ae',range:5,done:save.adventure?.discoveries?.includes(region+':'+p.key)})),
 ];}
export const DISCOVERY_IDS=Object.keys(REGIONS).filter(id=>id!=='hub').flatMap(id=>[id+':city',id+':rural']);
export function compassHeading(yaw=0){return ((-yaw*180/Math.PI)%360+360)%360;}
