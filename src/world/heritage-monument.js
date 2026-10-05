import {worldArtMaterials} from '../design-system/tokens.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored physical Broken Circle. The opening remains empty and traversable.
// Two fractured annular blocks, chamfered edges, radial ribs and inset seams.
export function createHeritageMonument(){
 const root=new THREE.Group();root.name='Cercle Brisé · monument physique';
 const materials={
  stone:new THREE.MeshPhysicalMaterial({color:worldArtMaterials.monumentStone,metalness:.22,roughness:.54,clearcoat:.18,clearcoatRoughness:.42}),
  gold:new THREE.MeshPhysicalMaterial({color:worldArtMaterials.monumentGold,metalness:.9,roughness:.27,clearcoat:.5,clearcoatRoughness:.2}),
  dark:new THREE.MeshPhysicalMaterial({color:worldArtMaterials.monumentDark,metalness:.5,roughness:.39,clearcoat:.2,clearcoatRoughness:.38}),
  light:new THREE.MeshPhysicalMaterial({color:worldArtMaterials.monumentBlue,emissive:worldArtMaterials.monumentEmission,emissiveIntensity:.62,metalness:.46,roughness:.24,clearcoat:.48,clearcoatRoughness:.15}),
 };
 const parts=new Map(Object.keys(materials).map(k=>[k,[]]));
 const add=(kind,g,x=0,y=0,z=0,rz=0)=>{const m=new THREE.Matrix4().makeRotationZ(rz);m.setPosition(x,y,z);parts.get(kind).push(g.applyMatrix4(m));};
 function band(inner,outer,start,end,depth,bevel=.04){
  const s=new THREE.Shape();s.moveTo(Math.cos(start)*outer,Math.sin(start)*outer);
  s.absarc(0,0,outer,start,end,false);s.lineTo(Math.cos(end)*inner,Math.sin(end)*inner);
  s.absarc(0,0,inner,end,start,true);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{steps:1,depth,bevelEnabled:bevel>0,bevelSegments:2,bevelSize:bevel,bevelThickness:bevel,curveSegments:44});g.translate(0,0,-depth/2);return g;
 }
 const cy=12.4,arcs=[[.16*Math.PI,.94*Math.PI],[1.05*Math.PI,1.92*Math.PI]];
 for(const [start,end] of arcs){
  add('stone',band(9.7,11,start,end,1.35,.12),0,cy,0);
  for(const side of [-1,1]){
   add('gold',band(10.68,10.88,start+.01,end-.01,.07),0,cy,side*.77);
   add('gold',band(9.78,9.90,start+.01,end-.01,.07),0,cy,side*.77);
   add('light',band(10.09,10.14,start+.035,end-.035,.035,.01),0,cy,side*.78);
  }
  for(let a=start+.055;a<end-.04;a+=.105){
   const r=10.39;add('dark',new THREE.BoxGeometry(.05,.72,.10),Math.cos(a)*r,cy+Math.sin(a)*r,.78,a-Math.PI/2);
   add('gold',new THREE.BoxGeometry(.028,.18,.06),Math.cos(a)*10.43,cy+Math.sin(a)*10.43,.85,a-Math.PI/2);
  }
  for(const a of [start,end])add('gold',new THREE.BoxGeometry(1.1,.11,1.54),Math.cos(a)*10.35,cy+Math.sin(a)*10.35,0,a);
 }
 for(const side of [-1,1]){
  add('stone',new THREE.BoxGeometry(2.4,3.6,3),side*8.2,1.8,0);
  add('gold',new THREE.BoxGeometry(2.55,.12,3.15),side*8.2,3.64,0);
  add('dark',new THREE.BoxGeometry(2.65,.45,3.4),side*8.2,.22,0);
  for(const x of [-.75,0,.75])add('gold',new THREE.BoxGeometry(.055,2.4,.055),side*8.2+x,1.8,1.54);

  // Stepped buttresses visually carry the ring into the civic platform.
  // They remain outside the traversable centre opening.
  add('dark',new THREE.BoxGeometry(4.25,.42,4.9),side*8.2,.21,0);
  add('stone',new THREE.BoxGeometry(3.55,.46,4.15),side*8.2,.58,0);
  add('gold',new THREE.BoxGeometry(3.72,.075,4.3),side*8.2,.85,0);
  for(const x of [-1.42,1.42])add('light',new THREE.BoxGeometry(.045,.18,3.72),side*8.2+x,.9,0);
 }

 // Eight authored heritage seals are distributed across the two intact arcs.
 // They read as structural inlays rather than UI icons and keep the fractures open.
 const heritageAngles=[];
 for(const [start,end] of arcs){
  for(const t of [.15,.38,.62,.85])heritageAngles.push(start+(end-start)*t);
 }
 for(const a of heritageAngles){
  const r=10.36;
  add('dark',new THREE.BoxGeometry(.34,.82,.18),Math.cos(a)*r,cy+Math.sin(a)*r,.83,a-Math.PI/2);
  add('gold',new THREE.BoxGeometry(.11,.56,.07),Math.cos(a)*10.42,cy+Math.sin(a)*10.42,.94,a-Math.PI/2);
  add('light',new THREE.BoxGeometry(.035,.3,.035),Math.cos(a)*10.47,cy+Math.sin(a)*10.47,1.0,a-Math.PI/2);
 }

 // Controlled fracture debris: small, heavy pieces stay close to the broken
 // right edge so the break feels engineered, not like random floating blocks.
 const fracturePieces=[
  {x:10.72,y:10.82,z:.18,w:.78,h:.54,d:.92,r:.18},
  {x:11.42,y:11.67,z:-.18,w:.58,h:.42,d:.72,r:-.22},
  {x:11.56,y:12.72,z:.24,w:.72,h:.46,d:.84,r:.28},
  {x:10.92,y:13.68,z:-.12,w:.52,h:.38,d:.64,r:-.3},
  {x:10.5,y:14.42,z:.16,w:.46,h:.34,d:.56,r:.34},
 ];
 for(const piece of fracturePieces){
  add('stone',new THREE.BoxGeometry(piece.w,piece.h,piece.d),piece.x,piece.y,piece.z,piece.r);
  add('gold',new THREE.BoxGeometry(piece.w*.72,.045,piece.d*1.02),piece.x,piece.y+piece.h*.48,piece.z,piece.r);
  add('light',new THREE.BoxGeometry(.035,piece.h*.62,piece.d*.56),piece.x-piece.w*.36,piece.y,piece.z+.02,piece.r);
 }
 const geometries=[];
 for(const [kind,list] of parts){
  if(!list.length)continue;const normalized=list.map(g=>g.index?g.toNonIndexed():g);
  const geometry=mergeGeometries(normalized);geometries.push(geometry);
  new Set([...list,...normalized]).forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(geometry,materials[kind]);mesh.castShadow=kind!=='light';mesh.receiveShadow=true;mesh.name='Cercle Brisé · '+kind;root.add(mesh);
 }
 let dead=false;
 return {root,collisions:[-1,1].map(side=>({x:side*8.2,z:0,width:2.7,depth:3.5,rotation:0})),
  setDaylight(value){materials.light.emissiveIntensity=.22+.78*(1-Math.max(0,Math.min(1,value)));},
  dispose(){if(dead)return;dead=true;root.removeFromParent();geometries.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());}};
}
