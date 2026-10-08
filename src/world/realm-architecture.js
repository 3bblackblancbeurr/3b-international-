import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {REALM_COURT_COLUMNS} from './realm-layout.js';
import {createRealmMasonryTextures,installRealmMasonryAtlas,realmMasonryUv} from './realm-masonry.js';

const STYLES={
 france:['#d8c9ad','#e9e0cb','#374c5c','#405363'],italie:['#d4b58e','#eadbc2','#95543d','#49614e'],
 estonie:['#bdc5c4','#dfe4de','#775649','#486568'],turquie:['#ccb697','#ebdcc4','#86533b','#526962'],
 algerie:['#e6dfc8','#f6edda','#b6a07d','#3f7467'],tunisie:['#eee9d8','#fff4e2','#b4a68a','#236fa4'],
 maroc:['#bc8768','#e2c4a1','#8f6548','#426d61'],espagne:['#d5b68c','#efddbb','#99583e','#446753'],
};

/** Shared, vertex-coloured structural meshes. Buildings have recessed window
 * cores and distinct roof silhouettes; instances add no material draw calls. */
export function createRealmArchitecture(region){
 const [wall,trim,roof,wood]=STYLES[region]||STYLES.france,geometries=[],templates=new Map();
 const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),sphere=new THREE.SphereGeometry(1,12,8),cone=new THREE.ConeGeometry(1,1,12),matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
 const surfaces=createRealmMasonryTextures(region);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,map:surfaces.map,normalMap:surfaces.normalMap,roughnessMap:surfaces.roughnessMap,normalScale:new THREE.Vector2(.42,.42)});material.name='3B · masonry, recessed façades and regional roofs';installRealmMasonryAtlas(material);
 const plaster=['maroc','algerie','tunisie'].includes(region);
 function builder(){
  const parts=[];
  function add(geometry,color,x,y,z,sx=1,sy=sx,sz=sx,rotation=0,surface=color===wood||color===roof?3:color===wall&&plaster?1:0){
   const g=geometry.index?geometry.toNonIndexed():geometry.clone();dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();matrix.copy(dummy.matrix);g.applyMatrix4(matrix);
   const p=g.attributes.position,tint=new THREE.Color(color),colors=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)colors.set([tint.r,tint.g,tint.b],i*3);g.setAttribute('color',new THREE.BufferAttribute(colors,3));
   // A common attribute layout allows boxes, extrusions and open arches to
   // merge without relying on draw-time material arrays.
   for(const key of Object.keys(g.attributes))if(!['position','normal','color'].includes(key))g.deleteAttribute(key);
   realmMasonryUv(g,surface);
   parts.push(g);return g;
  }
  const b=(color,x,y,z,w,h,d,r=0,surface)=>add(box,color,x,y,z,w,h,d,r,surface);
  function arch(x,z,width=6.2,height=9.5,depth=3,color=wall){
   const r=width/2,t=.65,s=new THREE.Shape();s.absarc(0,0,r,0,Math.PI,false);s.lineTo(-r+t,0);s.absarc(0,0,r-t,Math.PI,0,true);s.closePath();
   const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:10});add(g,color,x,height-r,z-depth/2);g.dispose();
  }
  function finish(){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();geometries.push(g);return g;}
  return{add,b,arch,finish};
 }
 function house(floors=1){
  const key='house-'+floors;if(templates.has(key))return templates.get(key);
  const {add,b,finish}=builder(),w=12,d=10,h=floors*5.6,east=['maroc','algerie','tunisie'].includes(region);
  b('#655e52',0,h/2,0,w-.75,h,d-.75);b(trim,0,.25,0,w+.3,.5,d+.3);
  for(let face=0;face<4;face++){
   const angle=face*Math.PI/2,span=face%2?d:w,deep=face%2?w:d;
   const local=(color,x,y,z,ww,hh,dd)=>{const c=Math.cos(angle),s=Math.sin(angle);return b(color,x*c+z*s,y,-x*s+z*c,ww,hh,dd,angle);};
   for(let floor=0;floor<floors;floor++){
    const y=floor*5.6;local(wall,0,y+.35,deep/2,span,.7,.55);local(wall,0,y+5.1,deep/2,span,1,.55);
    for(let i=0;i<=3;i++)local(wall,(i-1.5)*span/3,y+2.9,deep/2,.95,4.5,.55);
    for(let i=0;i<3;i++){
     const x=(i-1)*span/3,door=floor===0&&face===0&&i===1,wh=door?4.8:3.5,wy=y+(door?2.5:2.7);
     local(door?wood:'#253e46',x,wy,deep/2-.19,2.4,wh,.08);
     for(const side of [-1,1])local(trim,x+side*1.32,wy,deep/2+.12,.19,wh+.2,.3);
     local(trim,x,wy+wh/2+.1,deep/2+.13,2.9,.22,.36);
     if(!door){local(trim,x,wy-wh/2-.1,deep/2+.22,2.9,.24,.7);local(wood,x,wy,deep/2-.05,.07,wh,.1);local(wood,x,wy+.2,deep/2-.05,2.4,.07,.1);}
     if(!east&&!door)for(const side of [-1,1])local(wood,x+side*1.5,wy,deep/2+.06,.45,wh,.12);
    }
   }
   local(trim,0,h,deep/2+.12,span+.45,.4,.68);
  }
  if(east){b(roof,0,h+.2,0,w+.7,.5,d+.7);for(const side of [-1,1]){b(trim,side*w/2,h+.85,0,.4,1.3,d+.5);b(trim,0,h+.85,side*d/2,w+.5,1.3,.4);}}
  else{
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-6.6,0,-5.6,6.6,0,-5.6,6.6,0,5.6,-6.6,0,5.6,0,3.4,-5.6,0,3.4,5.6],3));g.setIndex([0,4,5,0,5,3,4,1,2,4,2,5,0,1,4,3,5,2]);g.computeVertexNormals();add(g,roof,0,h+.15,0);g.dispose();
   b(trim,0,h,0,w+.9,.3,d+.9);b(wall,3.5,h+2.8,0,.8,3,.8);
  }
  const geometry=finish();templates.set(key,geometry);return geometry;
 }
 function monument(kind){
  if(templates.has(kind))return templates.get(kind);
  const {add,b,arch,finish}=builder();
  if(['arcade','aqueduct','ruins','wall'].includes(kind)){
   for(let i=-2;i<=2;i++){b(wall,i*8,4.8,0,1.8,9.6,3);b(trim,i*8,.3,0,2.2,.6,3.5);b(trim,i*8,9.5,0,2.2,.6,3.5);}
   for(let i=-2;i<2;i++){arch(i*8+4,0,6.2,9.5,3);b(trim,i*8+4,10.5,0,8,.7,3.5);}
   if(kind==='wall')for(const x of [-16,16]){add(cylinder,wall,x,9,-2,3.7,18,3.7);add(cone,roof,x,21,-2,4.4,7,4.4);for(let j=0;j<6;j++){const a=j*Math.PI/3;b('#344b50',x+Math.cos(a)*3.72,12,-2+Math.sin(a)*3.72,.8,2.4,.12,-a+Math.PI/2);}}
   if(kind==='ruins')for(const x of [-11,11])add(cylinder,trim,x,3,8,.8,6,.8);
  }else if(['alpine','forest','vineyard','mountain'].includes(kind)){
   for(const x of [-9,9]){b(wood,x,2,-2,.5,4,.5);b(trim,x,4.3,-2,6,.45,5);}
   b(wall,0,.65,0,8,1.3,7);add(cylinder,trim,0,2.3,0,1.2,3.4,1.2);
   if(kind==='vineyard')for(let i=-3;i<=3;i++){b(wood,i*3.7,1.7,9,.16,3.4,.16);b(wood,i*3.7,1.7,-9,.16,3.4,.16);b(wood,i*3.7,3.4,0,.16,.16,18);}
  }else if(kind==='fairychimney'){
   for(let i=0;i<9;i++){const a=i*2.399,r=8+((i*7)%9),h=8+i*1.4;const g=new THREE.CylinderGeometry(.7,2.2,h,9);add(g,wall,Math.cos(a)*r,h/2,Math.sin(a)*r);g.dispose();add(cone,'#846b55',Math.cos(a)*r,h+.9,Math.sin(a)*r,2.9,2.8,2.9);}
  }else if(kind==='lighthouse'||kind==='windmill'){
   b(wall,0,3.5,0,13,7,11);add(cylinder,trim,0,10,0,3.9,20,3.9);add(cone,roof,0,23,0,4.8,6,4.8);
   if(kind==='windmill'){for(const sign of [-1,1]){b(wood,0,15,4.2,1,14,.45);b(wood,0,15,4.2,14,1,.45);b(trim,sign*4.5,15,4.3,4,1.4,.4);}}
   else{add(cylinder,'#426576',0,20.5,0,4.1,3.8,4.1);b(trim,0,18.4,0,10,.35,10);}
  }else{
   const courtyard=['riad','patio','bazaar','caravanserai','oasis'].includes(kind);
   if(courtyard){
    for(const side of [-1,1]){b(wall,side*11,5,0,4,10,23);b(trim,side*11,10.2,0,4.7,.5,23.7);}
    b(wall,0,5,-9.5,26,10,4);b(trim,0,10.2,-9.5,26.6,.5,4.8);
    for(const side of [-1,1]){b(wall,side*8,5,9.5,10,10,4);b(trim,side*8,10.2,9.5,10.6,.5,4.8);}
    arch(0,9.5,6.2,9.5,3,trim);add(cylinder,trim,0,.3,0,3,.6,3);add(cylinder,'#487d86',0,.64,0,2.6,.05,2.6);
   }else{b(wall,0,6,0,26,12,19);b(trim,0,12.1,0,27,.5,20);}
   for(const x of [-10,10])for(const z of [-7,7]){
    if(['chateau','kasbah','casbah'].includes(kind)){add(cylinder,wall,x,8,z,2.6,16,2.6);if(kind==='chateau')add(cone,roof,x,19,z,3.1,6,3.1);else for(let i=0;i<5;i++)b(trim,x+(i-2)*.8,16.5,z,.45,1.4,.7);}
    else if(['bazaar','modernist','coastal'].includes(kind)){add(sphere,roof,x,11,z,3,4,3);}
   }
   for(const x of [-8,-4,0,4,8])for(const y of [3.5,8]){if(courtyard&&x===0)continue;const front=courtyard?11.5:9.5;b(wood,x,y,front+.01,1.8,2.5,.08);for(const side of [-1,1])b(trim,x+side*1.05,y,front+.15,.16,2.8,.22);b(trim,x,y+1.45,front+.15,2.4,.2,.25);}
   if(kind==='modernist')for(const x of [-8,0,8]){add(cone,trim,x,19,0,1.4,14,1.4);add(sphere,'#b79764',x,26,0,.9,1.2,.9);}
   if(kind==='palazzo'){b(roof,0,13,0,27,1.5,20);add(cylinder,wall,0,19,0,2.4,13,2.4);b(trim,0,24,0,6,.5,6);}
  }
  const geometry=finish();templates.set(kind,geometry);return geometry;
 }
 function guardianCourt(){
  const key='guardianCourt';if(templates.has(key))return templates.get(key);
  const {add,b,finish}=builder();
  // The slabs are volume, set into the level earth. Narrow real joints and
  // separate wedges avoid translucent decals and coplanar shimmering lines.
  for(let ring=0;ring<4;ring++)for(let i=0;i<24;i++){
   const radii=[0,8,17,28,40],inner=radii[ring]+.055,outer=radii[ring+1]-.055,a=i*Math.PI/12+.0018,c=(i+1)*Math.PI/12-.0018;
   const corners=[[Math.sin(a)*inner,Math.cos(a)*inner],[Math.sin(a)*outer,Math.cos(a)*outer],[Math.sin(c)*outer,Math.cos(c)*outer],[Math.sin(c)*inner,Math.cos(c)*inner]],positions=[];
   for(const y of [-.18,.015])for(const [x,z] of corners)positions.push(x,y,z);
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex([4,5,6,4,6,7,0,2,1,0,3,2,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);g.computeVertexNormals();add(g,ring===0?roof:(ring+i)%3===0?wall:trim,0,0,0,1,1,1,0,2);g.dispose();
  }
  // Eight short stone rays echo the eight links, with no extra material or
  // draw call. Their undersides are embedded beneath the paving surface.
  for(let i=0;i<8;i++){const a=i*Math.PI/4;b(trim,Math.sin(a)*4,.015,Math.cos(a)*4,.4,.02,4,a,2);}
  for(const p of REALM_COURT_COLUMNS){
   b(wall,p.x,.16,p.z,3.6,.62,3.6);add(cylinder,wall,p.x,4.2,p.z,1.2,7.8,1.2);add(cylinder,trim,p.x,.55,p.z,1.5,.35,1.5);b(trim,p.x,8.25,p.z,3.5,.5,3.5);add(cylinder,roof,p.x,8.64,p.z,1.15,.28,1.15);
  }
  const geometry=finish();geometry.userData={guardianCourt:true,clearRadius:40,columnRadius:47};templates.set(key,geometry);return geometry;
 }
 let disposed=false;return{material,house,monument,guardianCourt,surfaces:surfaces.diagnostics,dispose(){if(disposed)return;disposed=true;for(const geometry of geometries)geometry.dispose();for(const g of [box,cylinder,sphere,cone])g.dispose();material.dispose();surfaces.dispose();}};
}
