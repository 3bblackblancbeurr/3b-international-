import * as THREE from 'three';

/** Bevelled, profiled civic shaft. Stations, archives and observatories keep
 * their authored silhouette while hidden underside caps are omitted. */
export function civicShaftGeometry(width,depth,height,profile){
 const vertices=[],indices=[],corners=[[-.78,-1],[.78,-1],[1,-.78],[1,.78],[.78,1],[-.78,1],[-1,.78],[-1,-.78]];
 for(const [y,scale] of profile)for(const [x,z] of corners)vertices.push(x*width/2*scale,y*height,z*depth/2*scale);
 for(let row=0;row<profile.length-1;row++)for(let i=0;i<8;i++){const a=row*8+i,b=row*8+(i+1)%8,c=a+8,d=b+8;indices.push(a,c,b,b,c,d);}
 // All shafts sit on a plinth or roof: only the visible upper cap is required.
 const end=(profile.length-1)*8;
 for(let i=1;i<7;i++)indices.push(end,end+i+1,end+i);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[vertices[i]/2.4,vertices[i+1]/2.4]:[]),2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function scaleAt(profile,t){
 for(let i=1;i<profile.length;i++)if(t<=profile[i][0]){const [a,sa]=profile[i-1],[b,sb]=profile[i];return b===a?sb:sa+(sb-sa)*(t-a)/(b-a);}
 return profile.at(-1)[1];
}
/** Four real corners follow the shaft taper; upper windows never hover beyond
 * a narrowing facade or straddle a horizontal setback. */
export function civicGlazingGeometry(width,depth,height,profile,level,side,axis='z',fraction=.78,panelHeight=1.65){
 const bottom=level-panelHeight/2,top=level+panelHeight/2;
 if(profile.some(([y],i)=>i>0&&y===profile[i-1][0]&&y*height>bottom&&y*height<top))return null;
 const lo=scaleAt(profile,bottom/height),hi=scaleAt(profile,top/height),vertices=[];
 for(const [s,y,left] of [[lo,bottom,-1],[lo,bottom,1],[hi,top,1],[hi,top,-1]]){
  if(axis==='z')vertices.push(left*width/2*s*fraction,y,side*(depth/2*s+.075));
  else vertices.push(side*(width/2*s+.075),y,left*depth/2*s*fraction);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
 const reverse=axis==='z'?side<0:side>0;geometry.setIndex(reverse?[0,2,1,0,3,2]:[0,1,2,0,2,3]);geometry.computeVertexNormals();return geometry;
}

/** A continuous bronze reveal and central mullion follow the actual tapered
 * glass corners. They merge into the city's existing gold batch, including a
 * real thickness; no new material, transparent overlay or independent draw. */
export function civicGlazingFrameGeometry(pane,{width=.065,depth=.075,mullion=true}={}){
 const position=pane.attributes.position,points=Array.from({length:4},(_,i)=>new THREE.Vector3().fromBufferAttribute(position,i)),normal=new THREE.Vector3().fromBufferAttribute(pane.attributes.normal,0).normalize();
 const vertices=[],indices=[],unit=new THREE.BoxGeometry(1,1,1),direction=new THREE.Vector3(),cross=new THREE.Vector3(),centre=new THREE.Vector3(),basis=new THREE.Matrix4(),matrix=new THREE.Matrix4();
 const beam=(a,b)=>{
  direction.subVectors(b,a);const length=direction.length();direction.normalize();cross.crossVectors(normal,direction).normalize();centre.addVectors(a,b).multiplyScalar(.5).addScaledVector(normal,depth*.5+.008);
  basis.makeBasis(direction,cross,normal);matrix.copy(basis).scale(new THREE.Vector3(length,width,depth)).setPosition(centre);
  const part=unit.clone().applyMatrix4(matrix),offset=vertices.length/3;for(const n of part.attributes.position.array)vertices.push(n);for(const n of part.index.array)indices.push(n+offset);part.dispose();
 };
 for(let i=0;i<4;i++)beam(points[i],points[(i+1)%4]);
 if(mullion)beam(points[0].clone().lerp(points[1],.5),points[3].clone().lerp(points[2],.5));
 unit.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[vertices[i],vertices[i+1]]:[]),2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function identity(b){
 if(b.buildingId==='memory_archives')return {height:30,profile:[[0,1],[.56,1],[.56,.88],[.79,.88],[.79,.73],[1,.73]],style:'archive-lantern'};
 if(b.buildingId==='tower_circle')return {height:34,profile:[[0,1],[.5,.94],[.82,.79],[1,.66]],style:'tower-hall'};
 if(b.district==='innovation')return {height:26,profile:[[0,1],[.16,.98],[.62,.9],[.86,.68],[1,.62]],style:'observatory'};
 if(b.district==='community')return {height:20,profile:[[0,1],[.34,1],[.34,.83],[.67,.83],[.67,.62],[1,.62]],style:'community-terrace'};
 if(['central_marina','shipyard_3b','train_station'].includes(b.buildingId))return{height:14,profile:[[0,1],[.22,1],[.77,.8],[1,.6]],style:'harbour-crown'};
 if(['city_planning_office','city_gallery'].includes(b.buildingId))return{height:18,profile:[[0,1],[.42,1],[.42,.82],[.77,.82],[.77,.63],[1,.63]],style:'civic-steps'};
 return{height:14,profile:[[0,1],[.56,1],[.84,.86],[1,.7]],style:b.district==='arena'?'arena-beacon':'civic-lantern'};
}

/** Authored civic silhouettes. Room doors, paths and foundation bounds retain
 * their canonical navigation footprints; repeated facade detail is concentrated
 * into strong storey bands so the complete city remains mobile-safe. */
export function addPlatformArchitecture({mesh,geo,box,cylinder,sphere,materials,buildings,collisions,cameraSolids=[],sign}){
 const {dark,gold,blue,glass,stone,green}=materials,windowGlass=materials.windowGlass||glass,mapSites=[];
 for(const b of buildings){
  const x=b.buildingX,z=b.buildingZ,w=b.width,d=b.depth,h=b.height,rear=z-d/2-4;
  const {height,profile,style}=identity(b),shaftW=w*.72,shaftD=4;
  // Stone normal/roughness texture already owned by the Hub: more solid
  // readable civic towers with no extra draw call, network asset or collision.
  mesh(geo(civicShaftGeometry(shaftW,shaftD,height,profile)),stone,x,h,rear);
  // Three luminous glazing bands keep the inhabited reading; one structural
  // belt carries the silhouette and removes repeated hidden geometry.
  const floorCount=Math.max(2,Math.min(3,Math.round(height/10)));
  for(let floor=0;floor<floorCount;floor++){
   const level=floorCount===1?height*.5:2+floor*Math.max(1,height-4)/(floorCount-1),s=scaleAt(profile,level/height),span=shaftW*s,depth=shaftD*s;
   for(const side of [-1,1]){
    const front=civicGlazingGeometry(shaftW,shaftD,height,profile,level,side,'z',.72,1.8);
    if(front){mesh(geo(front),windowGlass,x,h,rear);mesh(geo(civicGlazingFrameGeometry(front)),gold,x,h,rear);}
   }
   if(floor===Math.floor(floorCount/2))mesh(geo(civicShaftGeometry(span+.24,depth+.24,.12,[[0,1],[1,1]])),gold,x,h+level+.88,rear);
  }
  for(let tier=1;tier<profile.length;tier++){
   const [fraction,span]=profile[tier],previous=profile[tier-1];
   if(fraction!==previous[0]&&tier<profile.length-1)continue;
   mesh(geo(civicShaftGeometry(shaftW*span+.3,shaftD*span+.3,.2,[[0,1],[1,1]])),gold,x,h+height*fraction,rear);
  }
  // The solid base meets its tower, with bevelled stone corners and full footing.
  mesh(geo(civicShaftGeometry(w*.74,4,h,[[0,1],[1,1]])),dark,x,0,rear);collisions.push({x,z:rear,width:w*.74,depth:4});cameraSolids.push({id:'civic-shaft-'+b.buildingId,x,z:rear,width:w*.74,depth:4,bottom:0,top:h+height+4});
  for(const side of [-1,1])mesh(box,gold,x+side*shaftW*.4,h+1.6,rear+2.05,.16,3.2,.18);
  mapSites.push({id:'civic-rear-'+b.buildingId,x,z:rear,width:w*.74,depth:4,height:h+height,kind:'monument',style,name:b.name});
  if(['archives','innovation','broken_circle_tower'].includes(b.district))mesh(cylinder,blue,x,h+height+3,rear,.1,5,.1);
  if(b.buildingId==='arena_3b'){
   for(let tier=0;tier<3;tier++){
    const ring=mesh(geo(new THREE.TorusGeometry(w*.62+tier,.22,3,10,Math.PI)),gold,x,5+tier*2,z);ring.rotation.set(-Math.PI/2,0,Math.PI);
   }
   for(const side of [-1,1]){mesh(cylinder,dark,x+side*(w/2+3),8,z,2,16,2);mesh(cylinder,blue,x+side*(w/2+3),16.2,z,1.3,.3,1.3);collisions.push({x:x+side*(w/2+3),z,r:2});}
  }
  if(['house_3b','ai_textile_lab','mode3_studio'].includes(b.buildingId)){
   const arch=mesh(geo(new THREE.TorusGeometry(w*.55,.2,3,8,Math.PI)),blue,x,3,z+d/2+.7);arch.rotation.z=0;
   mesh(box,stone,x,h-1,z+d/2+2,w+4,.35,4);
  }
  if(['central_marina','train_station','community_house'].includes(b.buildingId)){
   for(let i=0;i<3;i++)mesh(box,gold,x-w*.34+i*w*.34,h+1+i*.4,z,w*.22,.25,d+5);
  }
  // One broad garden roof reads from the cable cars without four tiny layers.
  mesh(box,stone,x,h+.5,z,w*.5,.6,d*.6);mesh(box,green,x,h+1.02,z,w*.43,.42,d*.52);
 }
 // Residential footprints keep their addresses and clear the public lookout aisles.
 for(let i=0;i<8;i++){
  const a=(i+.5)*Math.PI/4,x=Math.cos(a)*132,z=Math.sin(a)*132,h=16+(i%3)*7;
  for(const side of [-1,1]){
   const tx=x+Math.cos(a+Math.PI/2)*side*10,tz=z+Math.sin(a+Math.PI/2)*side*10,profile=i%2?[[0,1],[.56,1],[.78,.88],[1,.71]]:[[0,1],[.68,1],[.68,.82],[1,.82]];
   mesh(geo(civicShaftGeometry(8,9,h,profile)),i%3===0?stone:dark,tx,0,tz);collisions.push({x:tx,z:tz,width:8,depth:9});cameraSolids.push({id:`residence-solid-${i}-${side}`,x:tx,z:tz,width:8,depth:9,bottom:0,top:h+7});
   const floorCount=3;
   for(let f=0;f<floorCount;f++){
    const y=2+f*Math.max(1,h-4)/(floorCount-1),s=scaleAt(profile,y/h);
    for(const face of [-1,1]){const glazing=civicGlazingGeometry(8,9,h,profile,y,face,'z',.72,1.8);if(glazing){mesh(geo(glazing),windowGlass,tx,0,tz);mesh(geo(civicGlazingFrameGeometry(glazing)),gold,tx,0,tz);}}
    if(f===1)mesh(geo(civicShaftGeometry(8*s+.22,9*s+.22,.12,[[0,1],[1,1]])),gold,tx,y+.9,tz);
   }
   const top=profile.at(-1)[1];mesh(geo(civicShaftGeometry(8*top+.5,9*top+.5,.32,[[0,1],[1,1]])),gold,tx,h,tz);
   const crownH=2.5+(i%3)*1.5;
   mesh(geo(civicShaftGeometry(5*top,6*top,crownH,[[0,1],[.72,.92],[1,.75]])),glass,tx,h+.32,tz);
   mesh(box,dark,tx,h+.55+crownH,tz,5*top,.22,6*top);
   mesh(box,stone,tx,h+.75,tz,2.7*top,.5,5.4*top);mesh(box,green,tx,h+1.12,tz,2.35*top,.24,4.9*top);
   mapSites.push({id:`residence-${i}-${side}`,x:tx,z:tz,width:8,depth:9,height:h+crownH,kind:'residence',name:'Résidence des Héritages'});
  }
  sign('RÉSIDENCES · ACCÈS PRIVÉ',x,3,z+8,12);
 }
 return{mapSites};
}
