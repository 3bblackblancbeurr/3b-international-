import * as THREE from 'three';
import {HUB_SCALE} from './platform-layout.js';

/** Real upper decks on the existing, reachable Tower hall. Vertical travel is
 * explicit: one bounded upper floor can be selected without changing a save. */
export function addCivicTower({mesh,geo,box,materials,buildings,collisions,cameraSolids,sign}){
 const hall=buildings.find(b=>b.buildingId==='tower_circle');if(!hall)return null;
 const x=hall.buildingX,z=hall.buildingZ,w=hall.width-.8,d=hall.depth-.8;
 const levels=[{id:'tower-memory',name:'Galerie du Cercle',y:14},{id:'tower-network',name:'Observatoire des huit portes',y:28},{id:'tower-crown',name:'Belvédère des Horizons',y:42}];
 const decks=[],upperFurniture=[],{dark,gold,stone,glass,blue}=materials;
 for(const side of [-1,1])for(const edge of [-1,1]){
  const px=x+side*(w/2-.24),pz=z+edge*(d/2-.24);
  mesh(box,dark,px,21,pz,.45,42,.45);mesh(box,gold,px+side*.28,21,pz,.09,42,.16);
  cameraSolids.push({id:'tower-hall-pier',x:px,z:pz,width:.6,depth:.6,bottom:0,top:43});
 }
 for(const [index,floor] of levels.entries()){
  const deck=mesh(box,stone,x,floor.y-.22,z,w,.44,d);decks.push(deck);
  for(const side of [-1,1]){
   mesh(box,gold,x+side*w/2,floor.y+.06,z,.12,.16,d);
   mesh(box,glass,x+side*(w/2-.12),floor.y+.64,z,.12,1.2,d-.5);
   mesh(box,gold,x+side*(w/2-.12),floor.y+1.28,z,.15,.12,d);
  }
  for(const edge of [-1,1]){
   mesh(box,glass,x,floor.y+.64,z+edge*(d/2-.12),w-.5,1.2,.12);
   mesh(box,gold,x,floor.y+1.28,z+edge*(d/2-.12),w,.12,.15);
  }
  // A glass lift spine has visible landings, paired guides and call lights.
  mesh(box,dark,x-w/2+1.9,floor.y+.04,z-d/2+1.3,1.7,.08,1.8);
  for(const side of [-1,1])mesh(box,gold,x-w/2+1.9+side*.7,floor.y+1.4,z-d/2+.4,.12,2.8,.14);
  mesh(box,blue,x-w/2+1.9,floor.y+2.7,z-d/2+.35,1.45,.09,.12);
  sign(floor.name,x,floor.y+2.3,z-d/2+.2,Math.min(10,w-1));
  // Per-level exhibition plinth stays against the rear wall, leaving the middle free.
  mesh(box,dark,x+3.1,floor.y+.42,z-d/2+1.1,2,.84,1.2);
  const plinth={id:'tower-display-'+index,x:x+3.1,z:z-d/2+1.1,width:2,depth:1.2,enabled:false};upperFurniture.push(plinth);collisions.push(plinth);
  if(index===0){const circle=mesh(geo(new THREE.TorusGeometry(.64,.075,4,24)),gold,x+3.1,floor.y+1.42,z-d/2+1.1);circle.rotation.y=.28;}
  else if(index===1)for(let gate=0;gate<8;gate++){const a=gate*Math.PI/4;mesh(box,gold,x+3.1+Math.cos(a)*.65,floor.y+1.15,z-d/2+1.1+Math.sin(a)*.38,.1,.5,.12);}
  else mesh(geo(new THREE.IcosahedronGeometry(.5,0)),glass,x+3.1,floor.y+1.4,z-d/2+1.1);
 }
 for(const side of [-1,1])mesh(box,gold,x-w/2+.45+side*.12,21,z-d/2+.35,.08,42,.12);
 const bound={id:'tower-upper-floor-boundary',enabled:false,surfaceDistance:p=>{
  const a=Math.abs(p.x/HUB_SCALE-x)-(w/2-.2),b=Math.abs(p.z/HUB_SCALE-z)-(d/2-.2);
  return-(Math.hypot(Math.max(a,0),Math.max(b,0))+Math.min(0,Math.max(a,b)))*HUB_SCALE;
 }};collisions.push(bound);
 let selected=null;
 const floors=levels.map((floor,index)=>Object.freeze({...floor,index,buildingId:hall.buildingId,x:x*HUB_SCALE,z:z*HUB_SCALE,y:floor.y*1.5,width:w*HUB_SCALE,depth:d*HUB_SCALE,range:3.5}));
 const ground={id:'tower-ground',index:null,name:'Hall du Cercle',buildingId:hall.buildingId,x:x*HUB_SCALE,z:z*HUB_SCALE,y:0,width:w*HUB_SCALE,depth:d*HUB_SCALE};
 const destinations=[ground,...floors];
 const descriptions=[
  'Huit héritages partagent la cité. Cette galerie conserve leur mémoire commune et le travail des bâtisseurs du Cercle.',
  'Observe les huit portes depuis cette galerie : leurs emblèmes, leurs axes et les ponts qui relient les quartiers de la cité.',
  'Deux promenades et huit passerelles vers les Horizons donnent accès aux panoramas marins. La cité demeure une zone sûre.',
 ];
 const exhibits=floors.map((floor,index)=>({id:'hub:tower-exhibit:'+index,type:'hubLifeObject',kind:'examine',floorIndex:index,buildingId:hall.buildingId,name:'Examiner · '+floor.name,detail:descriptions[index],x:(x+1.1)*HUB_SCALE,z:(z-d/2+1.1)*HUB_SCALE,heading:90,range:3.2}));
 const liftItems=[{id:'hub:tower-lift',type:'hubLift',buildingId:hall.buildingId,name:'Ascenseur de la Tour',x:(x-w/2+1.9)*HUB_SCALE,z:(z-d/2+1.3)*HUB_SCALE,range:3.5,destinations}];
 return{decks,floors,liftItems,ground,lifeItems(){return selected===null?[]:[exhibits[selected]];},setFloor(index){selected=Number.isInteger(index)&&floors[index]?index:null;bound.enabled=selected!==null;for(const [i,plinth] of upperFurniture.entries())plinth.enabled=selected===i;for(let i=0;i<decks.length;i++)decks[i].visible=selected===null||i<=selected;return selected===null?null:floors[selected];},
  collisions(){return selected===null?[]:[bound,upperFurniture[selected]];},
  height(wx,wz){if(selected===null)return null;if(Math.abs(wx/HUB_SCALE-x)>w/2||Math.abs(wz/HUB_SCALE-z)>d/2)return null;return floors[selected].y;},get selected(){return selected;}};
}
