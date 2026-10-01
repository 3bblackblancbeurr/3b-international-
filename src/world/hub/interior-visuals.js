import * as THREE from 'three';

// One small cell is mounted at a time. Shared primitives/materials, no local
// shadow maps, particles or lights; the outdoor city is hidden while inside.
export function createHubInteriorVisual(spec,{geometry,material}){
 const root=new THREE.Group();root.name='3B-Interior-'+spec.id;
 const stone=material('#222b32',{roughness:.68,metalness:.16}),black=material('#0c141e',{roughness:.36,metalness:.54}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const gold=material('#d6b46a',{roughness:.28,metalness:.78,emissive:'#6b5024',emissiveIntensity:.18}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const blue=material('#193f55',{roughness:.30,metalness:.34,emissive:'#00a8ff',emissiveIntensity:.38}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const pale=material('#c0bbab',{roughness:.84,metalness:.04}),green=material('#43695b',{roughness:.85}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const add=(shape,mat,x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(geometry[shape],mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;root.add(m);return m;};
 const {width:w,depth:d}=spec.bounds;
 const floor=add('box',stone,0,-.15,0,w,.3,d);floor.name='3B-Interior-Floor';
 add('box',black,0,2.2,-d/2,w,4.4,.35);
 for(const side of [-1,1]){
  add('box',black,side*w/2,1.45,0,.35,2.9,d);
  add('box',gold,side*(w/2-.3),.10,0,.09,.05,d-.8);
  for(const z of [-9,-2,5]){add('box',gold,side*(w/2-.45),1.9,z,.18,3.7,.25);add('box',blue,side*(w/2-.6),2.3,z,.10,1.4,.18);}
 }
 // A cutaway front and roof keep the character readable on a portrait screen.
 for(const side of [-1,1]){add('box',black,side*6.1,1.1,d/2,7.8,2.2,.3);add('box',gold,side*2.05,1.8,10.8,.15,3.6,.25);}
 add('box',blue,0,.03,9.7,3.7,.06,1.7);
 for(const z of [-6,0,6])add('box',gold,0,.02,z,.07,.04,3.8);
 for(const item of spec.items.filter(item=>item.type==='hubInteriorDesk')){
  add('box',black,item.x,.65,item.z,2.8,1.3,1.4);
  add('box',gold,item.x,1.34,item.z,2.9,.09,1.5);
  const screen=add('box',blue,item.x,1.7,item.z-.3,1.5,.65,.12);screen.rotation.x=-.18;
  add('box',pale,item.x+.8,1.43,item.z+.2,.34,.1,.36);
 }
 const x=0,z=-8.7;
 add('box',black,x,.5,z,4.2,1,2.2);add('box',gold,x,1.04,z,4.35,.07,2.35);
 if(['archive','memory','mission','welcome'].includes(spec.theme)){
  for(const side of [-1,1])for(let shelf=0;shelf<3;shelf++){
   add('box',gold,side*7.1,1+shelf*.85,-9,3.5,.10,1);
   for(let book=0;book<4;book++)add('box',book%2?blue:pale,side*7.1-1.1+book*.72,1.32+shelf*.85,-9,.44,.55,.66);
  }
 }else if(spec.theme==='textile'){
  for(const side of [-1,1]){add('cylinder',gold,side*1.3,2.15,z,.07,2.2,.07);add('box',pale,side*1.3,2.35,z,1.2,1.2,.35);add('box',blue,side*1.3,2.4,z+.2,.12,.85,.06);}
 }else if(['marina','garage','mobility'].includes(spec.theme)){
  const hull=add('box',blue,0,1.7,z,3.1,.65,1.1);hull.rotation.y=-.35;
  add('box',pale,0,2.15,z,1.3,.45,.8);
  for(const side of [-1,1])add('cylinder',gold,side*.85,1.4,z,.35,.12,.35).rotation.x=Math.PI/2;
 }else if(spec.theme==='garden'){
  for(const side of [-1,1]){add('box',pale,side*1.1,1.3,z,1.3,.5,1.3);add('sphere',green,side*1.1,1.9,z,.9,.6,.9);}
 }else if(spec.theme==='gallery'){
  for(const side of [-1,0,1]){add('box',gold,side*4,2.4,-11.6,2.4,2.8,.16);add('box',blue,side*4,2.4,-11.45,2.12,2.5,.10);}
 }else if(spec.theme==='planning'){
  for(const [bx,bz,h] of [[-1,-.3,.9],[0,.2,1.5],[1,-.1,.7]]){add('box',pale,bx,1.1+h/2,z+bz,.65,h,.65);add('box',blue,bx,1.1+h,z+bz,.5,.06,.5);}
 }else{
  const ring=add('ring',gold,0,2.5,z,1.4,1.4,1.4);ring.rotation.z=.3;
  add('sphere',blue,0,2.5,z,.42,.42,.42);
 }
 return {root,floor};
}
