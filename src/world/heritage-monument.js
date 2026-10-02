import {worldArtMaterials} from '../design-system/tokens.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored physical Broken Circle. The opening remains empty and traversable.
// Two fractured annular blocks, chamfered edges, radial ribs and inset seams.
export function createHeritageMonument(){
 const root=new THREE.Group();root.name='Cercle Brisé · monument physique';
 const materials={
  stone:new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentStone,metalness:.26,roughness:.57}),
  gold:new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentGold,metalness:.84,roughness:.32}),
  dark:new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentDark,metalness:.48,roughness:.42}),
  light:new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentBlue,emissive:worldArtMaterials.monumentEmission,emissiveIntensity:.44,metalness:.4,roughness:.3}),
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
  setDaylight(value){materials.light.emissiveIntensity=.16+.62*(1-Math.max(0,Math.min(1,value)));},
  dispose(){if(dead)return;dead=true;root.removeFromParent();geometries.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());}};
}
