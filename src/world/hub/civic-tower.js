import * as THREE from 'three';
import {HUB_SCALE} from './platform-layout.js';

export const CIVIC_TOWER_FINAL_LEVELS=Object.freeze([
 {id:'heritage_gallery',name:'Galerie des Héritages',y:12},
 {id:'council_eight',name:'Conseil des Huit',y:22},
 {id:'living_maps',name:'Salle des Cartes Vivantes',y:32},
 {id:'city_observatory',name:'Observatoire de la Cité',y:42},
 {id:'circle_chamber',name:'Chambre du Cercle',y:52},
 {id:'horizon_belvedere',name:'Belvédère des Horizons',y:62},
]);

/** Six complete, selectable upper decks inside the existing Tower footprint. */
export function addCivicTower({mesh,geo,box,materials,buildings,collisions,cameraSolids,sign}){
 const hall=buildings.find(b=>b.buildingId==='tower_circle');
 if(!hall)return null;
 const x=hall.buildingX,z=hall.buildingZ,w=hall.width-.8,d=hall.depth-.8;
 const levels=CIVIC_TOWER_FINAL_LEVELS;
 const decks=[],upperFurniture=[],floorDetails=[],{dark,gold,stone,glass,blue}=materials;
 const add=(...args)=>{const object=mesh(...args);floorDetails.push(object);return object;};

 // Eight structural piers and a glowing lift core make the tower one building.
 for(const side of [-1,1])for(const edge of [-1,1]){
  const px=x+side*(w/2-.24),pz=z+edge*(d/2-.24);
  add(box,dark,px,32,pz,.5,64,.5);
  add(box,gold,px+side*.29,32,pz,.1,64,.18);
  add(box,blue,px-side*.29,32,pz,.06,60,.1).castShadow=false;
  cameraSolids.push({id:'tower-hall-pier-'+side+'-'+edge,x:px,z:pz,width:.65,depth:.65,bottom:0,top:65});
 }
 add(box,dark,x-w/2+1.9,32,z-d/2+1.15,2.15,64,2.35);
 add(box,glass,x-w/2+1.9,32,z-d/2+2.36,1.85,61,.12).castShadow=false;
 for(const side of [-1,1])add(box,gold,x-w/2+1.9+side*.86,32,z-d/2+1.15,.1,64,2.5);

 const exhibitDescriptions=[
  'Les huit héritages sont présentés autour du Cercle. Chaque baie raconte une mémoire, une valeur et un métier transmis.',
  'Le Conseil des Huit réunit les gardiens, les bâtisseurs et les représentants des quartiers autour d’une table commune.',
  'La carte vivante montre les portes, les transports, les quartiers restaurés et les traces encore effacées par l’Oubli.',
  'L’observatoire relie les huit axes de la cité, ses cascades, ses gares, ses ports et les horizons du monde extérieur.',
  'La Chambre du Cercle conserve le noyau de mémoire. Chaque fragment retrouvé rallume une branche de la Tour.',
  'Le Belvédère des Horizons offre la lecture complète de la métropole-archipel et de ses huit territoires.',
 ];

 const heritageBay=(floor,index)=>{
  const angle=index*Math.PI/4,rx=w*.34,rz=d*.3,px=x+Math.cos(angle)*rx,pz=z+Math.sin(angle)*rz;
  const plinth=add(box,index%2?dark:stone,px,floor.y+.38,pz,1.05,.76,.8);plinth.rotation.y=-angle;
  const marker=add(geo(new THREE.IcosahedronGeometry(.28+(index%3)*.04,1)),index%2?gold:blue,px,floor.y+1.1,pz);marker.castShadow=false;
  const stem=add(box,gold,px,floor.y+.78,pz,.08,.7,.08);stem.rotation.y=-angle;
 };

 for(const [index,floor] of levels.entries()){
  const deck=mesh(box,stone,x,floor.y-.22,z,w,.44,d);decks.push(deck);
  const openingX=x-w/2+1.9,openingZ=z-d/2+1.3;
  for(const side of [-1,1]){
   add(box,gold,x+side*w/2,floor.y+.07,z,.14,.18,d);
   add(box,glass,x+side*(w/2-.12),floor.y+.74,z,.12,1.35,d-.5).castShadow=false;
   add(box,gold,x+side*(w/2-.12),floor.y+1.46,z,.16,.12,d);
  }
  for(const edge of [-1,1]){
   add(box,glass,x,floor.y+.74,z+edge*(d/2-.12),w-.5,1.35,.12).castShadow=false;
   add(box,gold,x,floor.y+1.46,z+edge*(d/2-.12),w,.12,.16);
  }
  add(box,dark,openingX,floor.y+.05,openingZ,1.85,.1,2.05);
  for(const side of [-1,1])add(box,gold,openingX+side*.78,floor.y+1.55,z-d/2+.38,.12,3.1,.15);
  add(box,blue,openingX,floor.y+3.02,z-d/2+.3,1.55,.1,.14).castShadow=false;
  sign(floor.name,x,floor.y+2.45,z-d/2+.18,Math.min(11,w-1));
  for(let bay=0;bay<8;bay++)heritageBay(floor,bay);
  const circulation=add(geo(new THREE.TorusGeometry(Math.min(w,d)*.23,.07,5,40)),gold,x,floor.y+.12,z);circulation.rotation.x=-Math.PI/2;

  const plinthX=x+3.05,plinthZ=z-d/2+1.1;
  add(box,dark,plinthX,floor.y+.44,plinthZ,2.05,.88,1.25);
  const plinth={id:'tower-display-'+index,x:plinthX,z:plinthZ,width:2.05,depth:1.25,enabled:false};
  upperFurniture.push(plinth);collisions.push(plinth);

  if(floor.id==='heritage_gallery'){
   const circle=add(geo(new THREE.TorusGeometry(1.35,.12,6,40)),gold,x,floor.y+1.8,z);circle.rotation.set(Math.PI/2,.18,.22);
   add(geo(new THREE.IcosahedronGeometry(.7,1)),blue,x,floor.y+1.8,z).castShadow=false;
  }else if(floor.id==='council_eight'){
   add(geo(new THREE.CylinderGeometry(2.2,2.35,.42,24)),dark,x,floor.y+.45,z);
   add(geo(new THREE.CylinderGeometry(1.95,2.05,.12,24)),gold,x,floor.y+.72,z);
   for(let seat=0;seat<8;seat++){
    const angle=seat*Math.PI/4,px=x+Math.cos(angle)*3,pz=z+Math.sin(angle)*2.25;
    const chair=add(box,stone,px,floor.y+.55,pz,.8,1.1,.75);chair.rotation.y=-angle+Math.PI/2;
   }
  }else if(floor.id==='living_maps'){
   const map=add(box,blue,x,floor.y+.86,z,4.8,.12,3.25);map.castShadow=false;
   add(box,gold,x,floor.y+.66,z,5.15,.18,3.6);
   for(let marker=0;marker<8;marker++){
    const angle=marker*Math.PI/4;
    add(geo(new THREE.IcosahedronGeometry(.22,1)),marker%2?gold:glass,x+Math.cos(angle)*1.85,floor.y+1.28,z+Math.sin(angle)*1.2).castShadow=false;
   }
  }else if(floor.id==='city_observatory'){
   for(const tilt of [-.58,0,.58]){
    const ring=add(geo(new THREE.TorusGeometry(2.25,.12,6,48)),tilt?gold:blue,x,floor.y+2.25,z);ring.rotation.set(Math.PI/2,tilt,tilt*.55);
   }
   add(geo(new THREE.IcosahedronGeometry(.74,2)),glass,x,floor.y+2.25,z).castShadow=false;
  }else if(floor.id==='circle_chamber'){
   const core=add(geo(new THREE.IcosahedronGeometry(1.25,2)),blue,x,floor.y+2.1,z);core.castShadow=false;
   for(let spoke=0;spoke<8;spoke++){
    const angle=spoke*Math.PI/4,end={x:x+Math.cos(angle)*3.4,z:z+Math.sin(angle)*2.6};
    const bridge=add(box,spoke%2?gold:stone,(x+end.x)/2,floor.y+.28,(z+end.z)/2,Math.hypot(end.x-x,end.z-z),.18,.5);bridge.rotation.y=-Math.atan2(end.z-z,end.x-x);
   }
   for(const tilt of [-.45,.45]){
    const ring=add(geo(new THREE.TorusGeometry(1.9,.1,6,48)),gold,x,floor.y+2.1,z);ring.rotation.set(Math.PI/2,tilt,tilt*.6);
   }
  }else{
   const table=add(geo(new THREE.CylinderGeometry(2.7,3,.35,32)),dark,x,floor.y+.48,z);table.receiveShadow=true;
   const compass=add(geo(new THREE.TorusGeometry(2.1,.1,6,48)),gold,x,floor.y+.72,z);compass.rotation.x=-Math.PI/2;
   for(let direction=0;direction<8;direction++){
    const angle=direction*Math.PI/4;
    const ray=add(box,blue,x+Math.cos(angle)*1.4,floor.y+.78,z+Math.sin(angle)*1.05,2.4,.06,.08);ray.rotation.y=-angle;ray.castShadow=false;
   }
  }
 }

 for(const side of [-1,1]){
  add(box,gold,x-w/2+.44+side*.13,32,z-d/2+.33,.09,64,.14);
  add(box,blue,x+w/2-.44-side*.13,32,z+d/2-.33,.055,60,.1).castShadow=false;
 }
 for(const edge of [-1,1]){
  const crown=add(geo(new THREE.ConeGeometry(1.45,9,5)),gold,x+edge*w*.3,67,z+edge*d*.22);crown.rotation.y=edge*.35;
 }
 const crownCore=add(geo(new THREE.IcosahedronGeometry(1.35,2)),blue,x,68,z);crownCore.castShadow=false;
 for(const tilt of [-.5,.5]){
  const ring=add(geo(new THREE.TorusGeometry(2.6,.1,6,48)),gold,x,68,z);ring.rotation.set(Math.PI/2,tilt,tilt*.5);
 }

 const bound={id:'tower-upper-floor-boundary',enabled:false,surfaceDistance:p=>{
  const a=Math.abs(p.x/HUB_SCALE-x)-(w/2-.2),b=Math.abs(p.z/HUB_SCALE-z)-(d/2-.2);
  return-(Math.hypot(Math.max(a,0),Math.max(b,0))+Math.min(0,Math.max(a,b)))*HUB_SCALE;
 }};
 collisions.push(bound);
 let selected=null;
 const floors=levels.map((floor,index)=>Object.freeze({...floor,index,buildingId:hall.buildingId,x:x*HUB_SCALE,z:z*HUB_SCALE,y:floor.y*1.5,width:w*HUB_SCALE,depth:d*HUB_SCALE,range:3.5}));
 const ground={id:'tower-ground',index:null,name:'Hall de l’Unité',buildingId:hall.buildingId,x:x*HUB_SCALE,z:z*HUB_SCALE,y:0,width:w*HUB_SCALE,depth:d*HUB_SCALE};
 const destinations=[ground,...floors];
 const exhibits=floors.map((floor,index)=>({
  id:'hub:tower-exhibit:'+index,type:'hubLifeObject',kind:'examine',floorIndex:index,buildingId:hall.buildingId,
  name:'Examiner · '+floor.name,detail:exhibitDescriptions[index],x:(x+1.05)*HUB_SCALE,z:(z-d/2+1.1)*HUB_SCALE,heading:90,range:3.2,
 }));
 const liftItems=[{id:'hub:tower-lift',type:'hubLift',buildingId:hall.buildingId,name:'Ascenseur panoramique de la Tour',x:(x-w/2+1.9)*HUB_SCALE,z:(z-d/2+1.3)*HUB_SCALE,range:3.5,destinations}];
 return{
  decks,floors,liftItems,ground,details:floorDetails,
  lifeItems(){return selected===null?[]:[exhibits[selected]];},
  setFloor(index){
   selected=Number.isInteger(index)&&floors[index]?index:null;
   bound.enabled=selected!==null;
   for(const [i,plinth] of upperFurniture.entries())plinth.enabled=selected===i;
   for(let i=0;i<decks.length;i++)decks[i].visible=selected===null||i<=selected;
   return selected===null?null:floors[selected];
  },
  collisions(){return selected===null?[]:[bound,upperFurniture[selected]];},
  height(wx,wz){
   if(selected===null)return null;
   if(Math.abs(wx/HUB_SCALE-x)>w/2||Math.abs(wz/HUB_SCALE-z)>d/2)return null;
   return floors[selected].y;
  },
  get selected(){return selected;},
 };
}
