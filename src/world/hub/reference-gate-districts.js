import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {COUNTRIES} from '../catalog.js';
import {HUB_SCALE,platformPortal} from './platform-layout.js';
import {CITE_GATE_SITES} from './platform-topology.js';
import {facadeArchGeometry,mansardRoofGeometry} from './facade-craft.js';
import {gateCrownGeometry} from './gate-craft.js';

export const REFERENCE_GATE_DISTRICT_STYLES=Object.freeze({
 france:{name:'Mont des Savoirs',style:'spire',wall:'#8d9898',roof:'#334c61',trim:'#cbb47c',accent:'#36516f',height:14}, // gold-master-allow: reviewed France pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
 espagne:{name:'Place del Sol',style:'plaza',wall:'#a48968',roof:'#7b5543',trim:'#cdb786',accent:'#795449',height:10}, // gold-master-allow: reviewed Spain pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
 maroc:{name:'Souks du Monde',style:'souk',wall:'#947c62',roof:'#5b716c',trim:'#bfb087',accent:'#47717a',height:10}, // gold-master-allow: reviewed Morocco pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
 italie:{name:'Jardins de la Dolce Vita',style:'loggia',wall:'#aca98d',roof:'#7a6650',trim:'#c9bd94',accent:'#597766',height:11}, // gold-master-allow: reviewed Italy pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
 turquie:{name:'Falaises d’Orient',style:'dome',wall:'#8b8d91',roof:'#38576b',trim:'#d1b681',accent:'#485b76',height:12}, // gold-master-allow: reviewed Turkey pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
 tunisie:{name:'Rives du Soleil',style:'coast',wall:'#bebaa0',roof:'#416f82',trim:'#c5ae7c',accent:'#577da2',height:9}, // gold-master-allow: reviewed Tunisia pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
 algerie:{name:'Terrasses de l’Oasis',style:'terrace',wall:'#aca188',roof:'#6e7f6a',trim:'#c6b48a',accent:'#496b62',height:10}, // gold-master-allow: reviewed Algeria pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
 estonie:{name:'Porte de l’Innovation',style:'forest',wall:'#526b71',roof:'#243f52',trim:'#aab4a0',accent:'#41616f',height:15}, // gold-master-allow: reviewed Estonia pavilion wall/roof/trim/accent palette; docs/hub-reference-art-exceptions.md#gate-palettes.
});

/** Pure construction layout. Every rendered footprint is also emitted for collision/cartography.
 * The open radial axis, at least sixteen layout units wide, reaches the actual portal. */
export function referenceGateDistrictLayout(gates=COUNTRIES.map((country,index)=>{
 const p=platformPortal(index),site=CITE_GATE_SITES.find(s=>s.name===country.id);return{country:country.id,x:p.x/HUB_SCALE,z:p.z/HUB_SCALE,radius:site?.r||40,baseY:site?.baseY||0};
})){
 return gates.map((gate,index)=>{
  const country=typeof gate.country==='string'?gate.country:gate.country?.id||COUNTRIES[index].id,profile=REFERENCE_GATE_DISTRICT_STYLES[country];
  const angle=gate.yaw??Math.atan2(gate.x,gate.z),radius=gate.radius??40,scale=Math.max(.7,Math.min(1.25,radius/40));
  const positions=[[-19,-16],[-19,0],[-19,16],[19,-16],[19,0],[19,16],[-30,4],[30,-4],[-11.5,-29],[11.5,-29],[-11.5,29],[11.5,29]];
  const buildings=positions.map(([xx,zz],i)=>{
   // The Moroccan forecourt is closest to the transit promenade. Its two
   // front pavilions step toward the gate so the public circular route stays open.
   const localX=xx*scale,localZ=(country==='maroc'&&(i===8||i===9)?-21:zz)*scale,width=(i>=8?5.2:i>5?6.5:7.1+(i%3)*.9)*scale,depth=(i>=8?5.8:i>5?7:7.4+(i%2)*1.1)*scale;
   return{id:`gate-district:${country}:${i}`,country,style:profile.style,name:profile.name+' · '+(i+1),x:gate.x+Math.cos(angle)*localX+Math.sin(angle)*localZ,z:gate.z-Math.sin(angle)*localX+Math.cos(angle)*localZ,
    localX,localZ,width,depth,height:profile.height*(i>=8?.48+(i%2)*.14:.76+(i%4)*.12),rotation:angle,baseY:gate.baseY||0,index:i};
  });
  return{country,profile,x:gate.x,z:gate.z,angle,radius,scale,baseY:gate.baseY||0,buildings};
 });
}

export function addReferenceGateDistricts({root,owned,box,collisions=[],cameraSolids=[],gates,materials={}}){
 const layout=referenceGateDistrictLayout(gates),layers=new Map(),mapSites=[],anchors=[],obstacles=[],craftSites=[],dummy=new THREE.Object3D(),paint=new THREE.Color();
 const g=geometry=>(owned.push(geometry),geometry);
 const geo={box:box||g(new THREE.BoxGeometry(1,1,1)),body:g(new RoundedBoxGeometry(1,1,1,2,.035)),cylinder:g(new THREE.CylinderGeometry(1,1,1,16)),cone:g(new THREE.ConeGeometry(1,1,16)),dome:g(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2)),arch:g(facadeArchGeometry()),mansard:g(mansardRoofGeometry())};
 const stone=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.81,metalness:.04,envMapIntensity:.13}); // gold-master-allow: neutral base preserves per-instance stone colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
 const roof=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.66,metalness:.18,envMapIntensity:.13}); // gold-master-allow: neutral base preserves per-instance roof colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
 const gold=materials.gold||new THREE.MeshStandardMaterial({color:'#c5a56a',roughness:.34,metalness:.82}); // gold-master-allow: reviewed pavilion metal albedo fallback; docs/hub-reference-art-exceptions.md#gate-materials.
 const glass=new THREE.MeshPhysicalMaterial({color:'#254a5b',roughness:.28,metalness:.09,clearcoat:.8,envMapIntensity:.18}); // gold-master-allow: reviewed blue pavilion glazing albedo; docs/hub-reference-art-exceptions.md#gate-materials.
 const wood=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.8,metalness:.01,envMapIntensity:.12}); // gold-master-allow: neutral base preserves per-instance timber colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
 const leaves=new THREE.MeshStandardMaterial({color:'#355a42',roughness:.98,metalness:0}); // gold-master-allow: reviewed pavilion garden foliage albedo; docs/hub-reference-art-exceptions.md#gate-materials.
 // The existing metal albedo supplies a restrained warm lamp; no point lights
 // or transparent glow planes are submitted for these 192 façade lanterns.
 const lantern=new THREE.MeshStandardMaterial({color:gold.color,emissive:gold.color,emissiveIntensity:0,roughness:.45,metalness:.18});
 owned.push(stone,roof,glass,wood,leaves,lantern);if(!materials.gold)owned.push(gold);
 const day={value:1};
 glass.onBeforeCompile=shader=>{
  shader.uniforms.gateDistrictDay=day;
  shader.vertexShader='varying vec2 gateWindowUv;varying float gateOccupied;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   gateWindowUv=uv;vec3 p=position;
   #ifdef USE_INSTANCING
   p=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
   #endif
   gateOccupied=step(.51,fract(sin(dot(p,vec3(17.41,73.6,91.9)))*43758.3));`);
  shader.fragmentShader='varying vec2 gateWindowUv;varying float gateOccupied;uniform float gateDistrictDay;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float reveal=smoothstep(.025,.13,min(min(gateWindowUv.x,1.-gateWindowUv.x),min(gateWindowUv.y,1.-gateWindowUv.y)));
   float furnishing=mix(.28,1.,step(.26,gateWindowUv.y));
   totalEmissiveRadiance+=vec3(.69,.42,.19)*gateOccupied*pow(1.-gateDistrictDay,1.6)*.20*reveal*furnishing;`);
 };glass.customProgramCacheKey=()=> '3b-gate-homes-occupied-v1';
 // Fine mortar follows actual building dimensions rather than a painted screen grid.
 stone.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 gateStoneP;varying vec3 gateStoneN;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   gateStoneP=position;gateStoneN=normal;
   #ifdef USE_INSTANCING
   // Masonry remains horizontal on a rotated pavilion. Column lengths recover
   // its physical local dimensions without the district's yaw/translation.
   gateStoneP=position*vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
   #endif`);
  shader.fragmentShader='varying vec3 gateStoneP;varying vec3 gateStoneN;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float across=mix(gateStoneP.x,gateStoneP.z,step(.5,abs(gateStoneN.x)));float row=floor(gateStoneP.y/.55);
   vec2 joint=abs(fract(vec2(across/1.18+mod(row,2.)*.5,gateStoneP.y/.55))-.5);
   float edge=max(joint.x,joint.y),pixel=max(fwidth(edge),.003);
   float seam=smoothstep(.468-pixel,.488+pixel,edge);
   float mineral=fract(sin(dot(floor(vec2(across/1.18,row)),vec2(41.7,289.1)))*43758.5);
   diffuseColor.rgb*=mix(.97+mineral*.06,.82,seam);`);
 };stone.customProgramCacheKey=()=> '3b-gate-mineral-mortar-local-v2';
 function piece(geometry,material,name,x,y,z,sx,sy,sz,yaw=0,color,detail=false){
  const key=geometry.uuid+material.uuid+(detail?'detail':'mass');if(!layers.has(key))layers.set(key,{geometry,material,name,detail,poses:[]});
  layers.get(key).poses.push({x,y,z,sx,sy,sz,yaw,color});
 }
 function transform(region,x,z){return{x:region.x+Math.cos(region.angle)*x+Math.sin(region.angle)*z,z:region.z-Math.sin(region.angle)*x+Math.cos(region.angle)*z};}
 function solid(b,x,z,width,depth,top,kind='building'){
  const item={id:b.id+(kind==='building'?'':':'+kind+':'+obstacles.length),kind,name:b.name,country:b.country,x,z,width,depth,rotation:b.rotation,bottom:b.baseY,top:b.baseY+top};
  obstacles.push(item);collisions.push({...item});cameraSolids.push({...item});mapSites.push({...item,height:top});
 }
 const crowns=new Map();
 for(const region of layout){
  const profile=region.profile;
  for(const b of region.buildings){
   const {x,z,width:w,depth:d,height:h,rotation:a,baseY:y,index:i}=b;
   const place=(geometry,material,name,dx,yy,dz,sx,sy,sz,color,detail=false)=>piece(geometry,material,name,x+Math.cos(a)*dx+Math.sin(a)*dz,y+yy,z-Math.sin(a)*dx+Math.cos(a)*dz,sx,sy,sz,a,color,detail);
   // Wide mineral bases, inset floors and strong corner joints read as inhabited construction.
   place(geo.body,stone,'Socles des huit héritages',0,.26,0,w+.3,.52,d+.3,profile.wall);
   place(geo.body,stone,'Maisons des huit héritages',0,h/2+.50,0,w,h,d,profile.wall);
   const roofHeight=profile.style==='spire'?9.5:profile.style==='dome'?1.89+Math.min(w,d)*.47*.93+.65:profile.style==='coast'?1.89+Math.min(w,d)*.47*.73+.65:profile.style==='forest'?6.14:['terrace','souk'].includes(profile.style)?4.72:2.62;
   solid(b,x,z,w+.8,d+.8,h+roofHeight);
   for(const yy of [.60,3.35,h+.6])place(geo.box,gold,'Bandeaux des héritages',0,yy,0,w+.25,.14,d+.25);
   for(const dx of [-1,1])for(const dz of [-1,1]){
    place(geo.box,stone,'Chaînages des maisons',dx*(w/2-.15),h/2+.48,dz*(d/2-.15),.34,h+.10,.34,profile.trim);
    place(geo.box,gold,'Bases des chaînages',dx*(w/2-.15),.47,dz*(d/2-.15),.46,.19,.46);
   }
   // Deep sill / glass / jamb assemblies on all four faces, with windows tied to floor heights.
   for(let floor=4.6;floor<h-.55;floor+=3.15)for(let face=0;face<4;face++){
    const fa=face*Math.PI/2,front=(face%2?w:d)/2+.02,across=(face%2?d:w)*.24;
    for(const side of [-1,1]){
     const dx=Math.cos(fa)*side*across+Math.sin(fa)*front,dz=-Math.sin(fa)*side*across+Math.cos(fa)*front;
     const xx=x+Math.cos(a)*dx+Math.sin(a)*dz,zz=z-Math.sin(a)*dx+Math.cos(a)*dz,yaw=a+fa;
     piece(geo.box,glass,'Baies des héritages',xx,y+floor,zz,1.30,1.73,.09,yaw,undefined,true);
     piece(geo.box,stone,'Tableaux des héritages',xx,y+floor-.97,zz,1.60,.13,.35,yaw,profile.trim,true);
     piece(geo.box,gold,'Corniches des baies',xx,y+floor+.98,zz,1.58,.11,.28,yaw,undefined,true);
     for(const edge of [-1,1])piece(geo.box,stone,'Montants sculptés des baies',xx+Math.cos(yaw)*edge*.74,y+floor,zz-Math.sin(yaw)*edge*.74,.09,1.9,.25,yaw,profile.trim,true);
     piece(geo.box,gold,'Meneaux des héritages',xx,y+floor,zz,.04,1.74,.16,yaw,undefined,true);
    }
   }
   // Human-scale door joinery; raised heads have visible solid stone thickness.
   place(geo.box,glass,'Entrées des héritages',0,1.94,d/2+.06,1.72,2.85,.1,undefined,true);
   place(geo.arch,stone,'Arcades des huit héritages',0,.50,d/2+.17,1.08,1.19,1.0,profile.trim,true);
   for(const side of [-1,1])place(geo.box,gold,'Poignées des huit héritages',side*.29,1.95,d/2+.16,.04,.39,.04,undefined,true);
   // Every frontage has a flush threshold, a two-leaf door, a numbered civic
   // plaque and paired lanterns. All stay within the existing solid envelope.
   place(geo.box,stone,'Seuils des maisons',0,.045,d/2+.18,1.82,.09,.31,profile.trim,true);
   place(geo.box,gold,'Battements des portes',0,1.94,d/2+.12,.045,2.8,.075,undefined,true);
   place(geo.box,wood,'Plaques des pavillons',1.24,2.50,d/2+.10,.56,.52,.09,profile.accent,true);
   place(geo.box,gold,'Filets des plaques',1.24,2.79,d/2+.15,.61,.045,.04,undefined,true);
   // A physical house number uses a small, readable rhythm of metal studs;
   // the country title remains the authored gate sign above the public axis.
   for(let stud=0;stud<1+i%4;stud++)place(geo.box,gold,'Repères des adresses',1.09+stud*.10,2.50,d/2+.16,.035,.21,.025,undefined,true);
   for(const side of [-1,1]){
    const lampX=side*1.26;
    place(geo.box,gold,'Consoles des lanternes',lampX,3.04,d/2+.17,.09,.48,.16,undefined,true);
    place(geo.box,lantern,'Lanternes des façades',lampX,3.07,d/2+.30,.20,.31,.14,undefined,true);
    for(const yy of [2.87,3.28])place(geo.box,gold,'Chapeaux des lanternes',lampX,yy,d/2+.30,.29,.065,.19,undefined,true);
   }
   // Drainpipes meet a real shoe at the base; upper vents and rain caps keep
   // the roofs inhabited when seen from the cable cars or the observatory.
   for(const side of [-1,1]){
    const pipeX=side*(w/2-.25),pipeZ=-d/2-.13;
    place(geo.box,wood,'Descentes des pavillons',pipeX,h/2+.46,pipeZ,.13,h-.1,.13,profile.roof,true);
    for(const yy of [.83,3.38,h-.15])place(geo.box,gold,'Colliers des descentes',pipeX,yy,pipeZ,.20,.07,.15,undefined,true);
    place(geo.box,wood,'Sabots des descentes',pipeX,.25,pipeZ,.15,.50,.19,profile.roof,true);
   }
   const ventX=w*.25,ventZ=-d*.24,ventY=h+1.62;
   place(geo.box,stone,'Souches de ventilation',ventX,ventY,ventZ,.74,2.08,.67,profile.wall,true);
   place(geo.box,wood,'Chaperons de ventilation',ventX,ventY+1.12,ventZ,.91,.17,.81,profile.roof,true);
   for(const side of [-1,1])place(geo.box,glass,'Ouïes de ventilation',ventX+side*.38,ventY+.59,ventZ,.035,.28,.43,undefined,true);
   // Ground-level shutters deliberately vary with the address, while high
   // masonry, roofs, entrances and collision footprints retain their identity.
   for(const side of [-1,1]){
    const xx=side*w*.30;
    place(geo.box,glass,'Baies des rez-de-chaussée',xx,2.1,d/2+.03,1.10,1.57,.08,undefined,true);
    place(geo.box,stone,'Appuis des commerces',xx,1.27,d/2+.12,1.33,.13,.25,profile.trim,true);
    if((i+side+1)%3===0)for(const edge of [-1,1]){
     place(geo.box,wood,'Volets des pavillons',xx+edge*.64,2.1,d/2+.11,.18,1.67,.09,profile.accent,true);
     for(let slat=0;slat<6;slat++)place(geo.box,gold,'Lames des volets',xx+edge*.64,1.46+slat*.25,d/2+.17,.13,.025,.025,undefined,true);
    }
   }
   craftSites.push({id:b.id,threshold:{x:x+Math.sin(a)*(d/2+.18),z:z+Math.cos(a)*(d/2+.18),y:y+.045},lanterns:2,downpipes:2,ventilation:1,groundFloorWindows:2});
   // Different construction families produce actual distinct skyline silhouettes.
   if(profile.style==='spire'){
    place(geo.mansard,roof,'Mansardes françaises',0,h+.72,0,w+1.1,2.5,d+1.1,profile.roof);
    place(geo.cylinder,stone,'Clochers de la culture',0,h+3.75,0,1.42,1.53,1.42,profile.wall);
    if(!crowns.has('france'))crowns.set('france',g(gateCrownGeometry('france')));
    place(crowns.get('france'),gold,'Flèches de la culture',0,h+4.58,0,.93,.82,.93);
    for(const side of [-1,1])place(geo.box,stone,'Contreforts français',side*(w/2-.55),h*.35, d/2+.23,.32,h*.63,.59,profile.trim);
   }else if(profile.style==='dome'||profile.style==='coast'){
    const radius=Math.min(w,d)*.47;
    place(geo.cylinder,stone,'Tambours des coupoles',0,h+1.34,0,radius*.88,1.12,radius*.88,profile.trim);
    place(geo.dome,roof,'Coupoles d’Orient',0,h+1.89,0,radius,profile.style==='coast'?radius*.73:radius*.93,radius,profile.roof);
    place(geo.cone,gold,'Finials des coupoles',0,h+1.89+radius*(profile.style==='coast'?.73:.93)+.32,0,.18,.65,.18);
    if(profile.style==='dome')for(const side of [-1,1]){
     place(geo.cylinder,stone,'Tourelles d’Orient',side*(w/2-.25),h+.74,d/2-.5,.58,2.8,.58,profile.wall);
     place(geo.cone,gold,'Pointes des tourelles',side*(w/2-.25),h+2.7,d/2-.5,.72,1.18,.72);
    }
   }else if(profile.style==='terrace'||profile.style==='souk'){
    // Set-back upper rooms have their own walls, windows, parapets and roof gardens.
    const upH=2.7+(i%2)*1.25;
    place(geo.body,stone,'Étage des terrasses',-w*.12,h+.61+upH/2,-d*.10,w*.61,upH,d*.65,profile.wall);
    place(geo.box,gold,'Corniches des terrasses',-w*.12,h+.61+upH,-d*.10,w*.64,.15,d*.68);
    for(const side of [-1,1]){
     place(geo.box,stone,'Parapets des terrasses',side*(w/2-.19),h+1.08,0,.24,.74,d-.1,profile.trim);
     place(geo.box,stone,'Jardinières des terrasses',side*w*.35,h+.92,-d*.26,.70,.42,d*.35,profile.trim);
     place(geo.box,leaves,'Verdures des terrasses',side*w*.35,h+1.24,-d*.26,.65,.32,d*.34);
    }
    place(geo.box,glass,'Fenêtres des attiques',-w*.12,h+1.95,d*.225+.05,w*.38,1.51,.07,undefined,true);
    if(profile.style==='souk'){
     // Timber lattice screens and a real sloping canvas over the shop threshold.
     for(let k=0;k<9;k++)place(geo.box,wood,'Moucharabiehs des souks',-w*.28+k*w*.07,5.30,d/2+.25,.06,1.88,.08,profile.accent,true);
     for(let k=0;k<4;k++)place(geo.box,wood,'Traverses des souks',0,4.52+k*.5,d/2+.28,w*.7,.055,.08,profile.accent,true);
     place(geo.mansard,roof,'Auvents des souks',0,3.54,d/2+.35,w*.87,.5,1.32,profile.roof);
    }
   }else if(profile.style==='loggia'||profile.style==='plaza'){
    place(geo.mansard,roof,profile.style==='loggia'?'Toits des villas':'Toits de la plaza',0,h+.72,0,w+.83,profile.style==='loggia'?1.9:1.5,d+.83,profile.roof);
    // An external colonnade is built from individual supports, never a fake opaque arcade.
    const level=profile.style==='loggia'?4.15:3.68,front=d/2+.66;
    for(let k=0;k<4;k++){
     const dx=(k-1.5)*w*.24;
     place(geo.cylinder,stone,'Colonnes des loggias',dx,level/2+.51,front,.13,level,.13,profile.trim);
     place(geo.cylinder,gold,'Chapiteaux des loggias',dx,level+.48,front,.23,.13,.23);
     place(geo.cylinder,stone,'Bases des loggias',dx,.59,front,.23,.19,.23,profile.trim);
     const columnX=x+Math.cos(a)*dx+Math.sin(a)*front,columnZ=z-Math.sin(a)*dx+Math.cos(a)*front;
     solid(b,columnX,columnZ,.46,.46,level+.69,'column');
    }
    place(geo.box,stone,'Entablements des loggias',0,level+.62,front,w+.22,.25,.54,profile.trim);
    place(geo.box,stone,'Balcons des loggias',0,level+.82,front,w+.54,.14,1.57,profile.wall);
    place(geo.box,gold,'Balustrades des loggias',0,level+1.72,front+.59,w+.34,.06,.06);
    for(let k=0;k<12;k++)place(geo.box,stone,'Balustres des loggias',(k-5.5)*(w+.2)/11,level+1.29,front+.59,.075,.87,.075,profile.trim,true);
   }else if(profile.style==='forest'){
    place(geo.mansard,roof,'Toits de la pinède',0,h+.75,0,w+.9,3.8,d+.9,profile.roof);
    for(const side of [-1,1]){
     place(geo.box,wood,'Nervures de la pinède',side*(w/2+.08),h/2+.51,0,.18,h+.15,d+.20,'#445c5c'); // gold-master-allow: reviewed Estonian pavilion timber inlays; docs/hub-reference-art-exceptions.md#gate-materials.
     place(geo.box,gold,'Traits d’innovation',side*(w/2+.20),h/2+.51,0,.05,h+.6,.09);
    }
    place(geo.cylinder,glass,'Balises de l’innovation',0,h+4.9,0,.43,1.25,.43);
    place(geo.cone,gold,'Couronnes de l’innovation',0,h+5.78,0,.57,.72,.57);
   }
  }
  // Two open market/garden structures have an actual sheltered floor and visible goods.
  for(const side of [-1,1]){
   const lx=side*11.7*region.scale,lz=-5.5*region.scale,p=transform(region,lx,lz),a=region.angle;
   const stand=(geometry,material,name,dx,y,dz,sx,sy,sz,color)=>piece(geometry,material,name,p.x+Math.cos(a)*dx+Math.sin(a)*dz,region.baseY+y,p.z-Math.sin(a)*dx+Math.cos(a)*dz,sx,sy,sz,a,color,true);
   stand(geo.box,stone,'Comptoirs des héritages',0,.74,0,2.7,1.48,1.08,profile.wall);
   stand(geo.box,gold,'Plateaux des héritages',0,1.53,0,2.86,.13,1.21);
   for(const dx of [-1.48,1.48])stand(geo.box,wood,'Poteaux des marchés',dx,2.19,0,.14,4.38,.14,profile.roof);
   stand(geo.mansard,roof,'Abris des marchés',0,4.39,0,3.75,.74,2.51,profile.accent);
   for(let k=0;k<5;k++){
    const hh=.14+(k%3)*.12;
    stand(k%2?geo.cylinder:geo.box,k%2?gold:wood,'Étalages des héritages',(k-2)*.46,1.68+hh/2,0,k%2?.16:.30,hh,k%2?.16:.35,k%2?undefined:profile.accent);
   }
   const item={id:'gate-market:'+region.country+':'+side,name:'Comptoir · '+profile.name,kind:'market',country:region.country,x:p.x,z:p.z,width:3.12,depth:1.3,rotation:a,bottom:region.baseY,top:region.baseY+5.13};
   obstacles.push(item);collisions.push({...item});cameraSolids.push({...item});mapSites.push({...item,height:5.13});
   const approach=transform(region,lx-side*2.45,lz);
   anchors.push({id:'hub:life:gate:'+region.country+':'+side,type:'hubLifeObject',kind:'examine',country:region.country,x:approach.x,z:approach.z,heading:a+side*Math.PI/2,name:'Examiner · '+profile.name,detail:'Objets, étoffes et maquettes des '+profile.name.toLocaleLowerCase('fr'),range:3.3});
  }
 }
 const group=new THREE.Group();group.name='3B · huit ensembles des portes';root.add(group);const detailBatches=[];
 for(const layer of layers.values()){
  const mesh=new THREE.InstancedMesh(layer.geometry,layer.material,layer.poses.length);mesh.name=layer.name;mesh.castShadow=mesh.receiveShadow=true;
  for(const [i,p] of layer.poses.entries()){
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(layer.material===stone||layer.material===roof||layer.material===wood)mesh.setColorAt(i,paint.set(p.color||'#ffffff')); // gold-master-allow: neutral fallback preserves unpainted instance colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);owned.push(mesh);if(layer.detail)detailBatches.push({mesh,poses:layer.poses});
 }
 let quality='detail',lastView=null;const view=new THREE.Vector3();
 function updateView(camera){
  camera.getWorldPosition(view);group.worldToLocal(view);if(lastView&&lastView.distanceToSquared(view)<16)return;lastView=view.clone();
  const radius=quality==='fluid'?100:195,r2=radius*radius;
  for(const {mesh,poses} of detailBatches){let count=0;for(const p of poses){
   if((p.x-view.x)**2+(p.y-view.y)**2+(p.z-view.z)**2>r2)continue;
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);if(mesh.instanceColor)mesh.setColorAt(count,paint.set(p.color||'#ffffff'));count++; // gold-master-allow: neutral fallback preserves distance-compacted instance colors; docs/hub-reference-art-exceptions.md#neutral-multipliers.
  }mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 // A colonnade contributes collision solids, not additional houses on the atlas.
 const worldMapSites=mapSites.map(p=>({...p,x:p.x*HUB_SCALE,z:p.z*HUB_SCALE,width:p.width*HUB_SCALE,depth:p.depth*HUB_SCALE,height:p.height*1.5,bottom:p.bottom*1.5,top:p.top*1.5,units:'world'}));
 return{count:layout.reduce((n,r)=>n+r.buildings.length,0),districts:layout.length,layout,mapSites,worldMapSites,anchors,obstacles,craftSites,group,
  diagnostics:{drawBatches:group.children.length,authoredInstances:group.children.reduce((sum,mesh)=>sum+mesh.count,0),authoredTriangles:group.children.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*mesh.count,0),lanterns:craftSites.length*2,downpipes:craftSites.length*2,ventilationStacks:craftSites.length,accessibleThresholds:craftSites.length},
  updateView,setDaylight(value){day.value=Math.max(0,Math.min(1,Number.isFinite(value)?value:1));lantern.emissiveIntensity=Math.pow(1-day.value,1.4)*.75;},setQuality(mode){quality=mode;lastView=null;group.children.forEach(o=>o.castShadow=mode!=='fluid');}};
}
