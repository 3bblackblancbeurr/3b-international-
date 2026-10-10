import * as THREE from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldRealmArt,worldArtMaterials} from '../design-system/tokens.js';
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
 const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),sphere=new THREE.SphereGeometry(1,12,8),cone=new THREE.ConeGeometry(1,1,12),bud=new THREE.IcosahedronGeometry(1,0),matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
 // The back of facade details is buried in the solid house. Reuse a five-face
 // box there, then index shared vertices once: richer silhouettes cost less memory.
 const facadeBox=box.toNonIndexed();for(const [name,a] of Object.entries(facadeBox.attributes))facadeBox.setAttribute(name,new THREE.BufferAttribute(a.array.slice(0,-6*a.itemSize),a.itemSize));
 const surfaces=createRealmMasonryTextures(region);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,map:surfaces.map,normalMap:surfaces.normalMap,roughnessMap:surfaces.roughnessMap,normalScale:new THREE.Vector2(.42,.42)});material.name='3B · masonry, recessed façades and regional roofs';installRealmMasonryAtlas(material);
 const plaster=['maroc','algerie','tunisie'].includes(region);
 const night={value:0},compileMasonry=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  compileMasonry(shader);shader.uniforms.villageNight=night;shader.uniforms.villageWindowColor={value:new THREE.Color(worldArtMaterials.civicWindowEmission)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float realmWindow; varying float vRealmWindow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRealmWindow=realmWindow;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vRealmWindow; uniform float villageNight; uniform vec3 villageWindowColor;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=villageWindowColor*vRealmWindow*villageNight;');
 };
 material.customProgramCacheKey=()=> '3b-realm-masonry-domestic-3';
 function builder(palette={wall,roof,wood}){
  const parts=[];
  function add(geometry,color,x,y,z,sx=1,sy=sx,sz=sx,rotation=0,surface=color===palette.wood?3:color===palette.roof?2:color===palette.wall&&plaster?1:0){
   const g=geometry.index?geometry.toNonIndexed():geometry.clone();dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();matrix.copy(dummy.matrix);g.applyMatrix4(matrix);
   const p=g.attributes.position,tint=new THREE.Color(color),colors=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)colors.set([tint.r,tint.g,tint.b],i*3);g.setAttribute('color',new THREE.BufferAttribute(colors,3));
   // A common attribute layout allows boxes, extrusions and open arches to
   // merge without relying on draw-time material arrays.
   for(const key of Object.keys(g.attributes))if(!['position','normal','color'].includes(key))g.deleteAttribute(key);
   realmMasonryUv(g,surface);g.setAttribute('realmWindow',new THREE.BufferAttribute(new Float32Array(p.count),1));
   parts.push(g);return g;
  }
  const b=(color,x,y,z,w,h,d,r=0,surface,window=0)=>{const g=add(box,color,x,y,z,w,h,d,r,surface);if(window)g.attributes.realmWindow.array.fill(window);return g;};
  function arch(x,z,width=6.2,height=9.5,depth=3,color=wall){
   const r=width/2,t=.65,s=new THREE.Shape();s.absarc(0,0,r,0,Math.PI,false);s.lineTo(-r+t,0);s.absarc(0,0,r-t,Math.PI,0,true);s.closePath();
   const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:10});add(g,color,x,height-r,z-depth/2);g.dispose();
  }
  function finish(){const merged=mergeGeometries(parts),g=mergeVertices(merged,1e-6);merged.dispose();parts.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();geometries.push(g);return g;}
  return{add,b,arch,finish};
 }
 function house(floors=1,variant=0){
  variant=Math.abs(Math.trunc(variant)||0)%3;
  const base=STYLES[region]||STYLES.france,art=worldRealmArt[region]||worldRealmArt.france;
  // Three authored identities share one atlas. Colour is baked into each
  // reusable mesh, rather than adding materials or fetching extra textures.
  const wall=new THREE.Color(base[0]).lerp(new THREE.Color(variant===1?art.sun:art.cloth),variant===1?.16:variant===2?.22:0);
  const roof=new THREE.Color(base[2]).multiplyScalar(variant===1?.83:variant===2?1.08:1),wood=new THREE.Color(base[3]).lerp(new THREE.Color(variant===1?art.ground:art.cloth),variant?.36:0);
  const key='house-'+floors+'-'+variant;if(templates.has(key))return templates.get(key);
  const {add,b,finish}=builder({wall,roof,wood}),w=12,d=10,h=floors*5.6,east=['maroc','algerie','tunisie'].includes(region);
  const timberFrame=region==='estonie'||region==='turquie',balconies=['italie','espagne','turquie'].includes(region),terracotta=region==='italie'||region==='espagne';
  b('#655e52',0,h/2,0,w-.75,h,d-.75);b(trim,0,.25,0,w+.3,.5,d+.3);
  for(let face=0;face<4;face++){
   const angle=face*Math.PI/2,span=face%2?d:w,deep=face%2?w:d;
   const local=(color,x,y,z,ww,hh,dd,window=0)=>{const c=Math.cos(angle),s=Math.sin(angle),g=add(facadeBox,color,x*c+z*s,y,-x*s+z*c,ww,hh,dd,angle);if(window)g.attributes.realmWindow.array.fill(window);return g;};
   for(let floor=0;floor<floors;floor++){
    const y=floor*5.6;local(wall,0,y+.35,deep/2,span,.7,.55);local(wall,0,y+5.1,deep/2,span,1,.55);
    // A continuous plinth and deep cornice give the facade real occlusion.
    // These details live on the existing merged mesh, without extra draws.
    local(trim,0,y+.55,deep/2+.20,span+.18,.24,.42);
    local(timberFrame?wood:trim,0,y+4.94,deep/2+.19,span+.18,.18,.36);
    for(let i=0;i<=3;i++)local(wall,(i-1.5)*span/3,y+2.9,deep/2,.95,4.5,.55);
    for(let i=0;i<3;i++){
     const x=(i-1)*span/3,door=floor===0&&face===0&&i===1,wh=door?4.8:3.5,wy=y+(door?2.5:2.7);
     local(door?wood:worldArtMaterials.civicWindowGlass,x,wy,deep/2-.19,2.4,wh,.08,!door&&(face+floor+i+variant)%3!==0?.7+(i%2)*.25:0);
     for(const side of [-1,1])local(trim,x+side*1.32,wy,deep/2+.12,.19,wh+.2,.3);
     local(trim,x,wy+wh/2+.1,deep/2+.13,2.9,.22,.36);
     if(!door){local(trim,x,wy-wh/2-.1,deep/2+.22,2.9,.24,.7);local(wood,x,wy,deep/2-.05,.07,wh,.1);local(wood,x,wy+.2,deep/2-.05,2.4,.07,.1);}
     if(!east&&!door)for(const side of [-1,1])local(wood,x+side*1.5,wy,deep/2+.06,.45,wh,.12);
     if(!door){
      // Recessed frames, shutter slats and a projecting drip edge remain
      // readable at human scale rather than painting windows on a box.
      local(trim,x,wy+wh/2+.27,deep/2+.30,3.05,.12,.52);
      if(face===0&&(region==='tunisie'||region==='france'||region==='italie'))for(const side of [-1,1])for(let slat=0;slat<4;slat++)local(wood,x+side*1.5,wy-wh*.36+slat*wh*.24,deep/2+.16,.40,.075,.14);
      if(region==='maroc'||region==='algerie'){
       for(const bar of [-.72,0,.72])local(wood,x+bar,wy,deep/2+.10,.065,wh-.1,.12);
       for(const bar of [-.8,.35])local(wood,x,wy+bar,deep/2+.10,2.25,.065,.12);
      }
      if(balconies&&floor===floors-1&&floors>1&&i===1){
       local(trim,x,y+.89,deep/2+.56,3.7,.24,1.35);
       local(wood,x,y+1.85,deep/2+1.11,3.6,.12,.12);
       for(const bar of [-1.55,-.78,0,.78,1.55])local(wood,x+bar,y+1.38,deep/2+1.11,.075,.86,.075);
      }
     }
    }
    if(timberFrame){for(const post of [-1,1])local(wood,post*(span/2-.22),y+2.8,deep/2+.21,.22,5.3,.24);local(wood,0,y+5.34,deep/2+.24,span,.28,.28);}
    if(region==='france')for(const side of [-1,1])for(let course=0;course<3;course++)local(trim,side*(span/2-.24),y+1.05+course*1.45,deep/2+.17,course%2?.58:.88,.45,.28);
   }
   local(trim,0,h,deep/2+.12,span+.45,.4,.68);
  }
  // Readable domestic details: doors have panels and a handle, gutters have
  // actual volume, and an upper-storey planter casts its own small shadow.
  const dark=new THREE.Color(art.ground).multiplyScalar(.48),leaf=new THREE.Color(art.cloth).lerp(new THREE.Color(worldRealmArt.italie.cloth),.65);
  for(const x of [-.6,.6])for(const y of [1.25,3.3])b(wood,x,y,5.02,.84,1.52,.11,0,3);
  b(worldArtMaterials.travellerMetal,.81,2.5,5.13,.12,.32,.10);
  b(trim,0,.14,5.44,3,.28,.65);
  if(!east)for(const side of [-1,1]){b(roof,side*6.27,h-.23,0,.18,.18,10.7,0,2);b(roof,side*6.15,h/2,-4.8,.12,h,.12,0,2);}
  if(variant===1){
   // Workshop canopy and blank craft plaque. No invented language or shop UI.
   for(let stripe=0;stripe<7;stripe++)b(stripe%2?trim:wood,(stripe-3)*.43,4.48,5.76,.43,.14,1.35,0,3);
   for(const x of [-1.52,1.52])b(wood,x,4.12,6.33,.10,.64,.10,0,3);
   b(wood,-4.25,4.65,5.40,1.16,.72,.14,0,3);b(worldArtMaterials.travellerMetal,-4.25,4.65,5.49,.42,.36,.04);
  }else if(variant===2){
   for(const x of [-4,4]){
    const y=floors>1?6.4:1.15;b(wood,x,y,5.54,2.5,.45,.62,0,3);b(dark,x,y+.25,5.54,2.27,.05,.43,0,1);
    for(let sprig=0;sprig<5;sprig++)add(bud,leaf.clone().multiplyScalar(sprig%2?1:.82),x+(sprig-2)*.42,y+.43+(sprig%2)*.12,5.54,.32,.35,.30,0,1);
   }
  }
  if(east){
   b(roof,0,h+.2,0,w+.7,.5,d+.7);for(const side of [-1,1]){b(trim,side*w/2,h+.85,0,.4,1.3,d+.5);b(trim,0,h+.85,side*d/2,w+.5,1.3,.4);}
   if(region==='maroc')for(const side of [-1,1])for(let merlon=0;merlon<7;merlon++)b(wall,(merlon-3)*1.7,h+1.67,side*d/2,.65,.65,.50);
   if(region==='algerie'){b(wall,-3.7,h+1.40,-2.5,2.7,2.35,2.5);b(trim,-3.7,h+2.64,-2.5,3,.22,2.8);}
   if(region==='tunisie'){add(sphere,trim,-3.6,h+.36,-2.6,1.45,.82,1.45);b(wood,3.8,h+1.33,-2.8,.18,2.2,.18);b(wood,2.9,h+2.34,-2.8,2,.14,.18);}
  }
  else{
   const rise=region==='estonie'?4.6:region==='france'?3.5:region==='italie'?1.75:region==='espagne'?2.2:2.65;
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-6.6,0,-5.6,6.6,0,-5.6,6.6,0,5.6,-6.6,0,5.6,0,rise,-5.6,0,rise,5.6],3));g.setIndex([0,4,5,0,5,3,4,1,2,4,2,5,0,1,4,3,5,2]);g.computeVertexNormals();add(g,roof,0,h+.15,0);g.dispose();
   b(trim,0,h,0,w+.9,.3,d+.9);b(wall,3.5,h+rise*.64+1.1,.6,.9,2.2,.9);b(trim,3.5,h+rise*.64+2.26,.6,1.12,.18,1.12);
   b(roof,0,h+rise+.20,0,.22,.22,11.6);
   if(terracotta){
    // Sparse raised tile courses catch grazing light. Texture grain supplies
    // the finer tiles, keeping each instanced house comfortably bounded.
    for(const side of [-1,1])for(let course=1;course<5;course++){const x=side*course*1.27,y=h+.17+rise*(1-Math.abs(x)/6.6);b(roof,x,y,0,.10,.14,11.3);}
   }
   if(region==='france')for(const side of [-1,1]){b(wall,side*3.15,h+1.32,0,1.65,2.1,1.45);b(wood,side*3.15,h+1.37,.74,.87,1.25,.08);b(trim,side*3.15,h+2.45,0,1.86,.19,1.67);}
   if(timberFrame)for(const side of [-1,1]){b(wood,side*6.48,h+.23,0,.22,.24,11.6);b(wood,side*3.05,h+rise*.45,-5.65,.16,.26,.18);}
  }
  const geometry=finish();geometry.userData={region,variant,identity:['residence','workshop','garden-home'][variant],masterFacade:true,roofProfile:east?'terrace':region==='estonie'?'steep-gable':terracotta?'tile-gable':'gable',balconies:balconies&&floors>1,timberFrame};templates.set(key,geometry);return geometry;
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
 let disposed=false;return{material,house,monument,guardianCourt,setDaylight(value){const day=Math.max(0,Math.min(1,Number(value)||0));night.value=Math.max(0,Math.min(1,(.55-day)/.35))*.85;},surfaces:surfaces.diagnostics,dispose(){if(disposed)return;disposed=true;for(const geometry of geometries)geometry.dispose();for(const g of [box,facadeBox,cylinder,sphere,cone,bud])g.dispose();material.dispose();surfaces.dispose();}};
}
