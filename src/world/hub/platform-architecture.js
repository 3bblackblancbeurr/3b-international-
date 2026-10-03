/** Low-cost authored silhouettes. Public rooms keep the same ground-level doors. */
export function addPlatformArchitecture({mesh,geo,box,cylinder,sphere,materials,buildings,sign,THREE}){
 const {dark,gold,blue,glass,stone,green,wood}=materials;
 for(const b of buildings){
  const x=b.buildingX,z=b.buildingZ,w=b.width,d=b.depth,h=b.height;
  // Raised rear towers leave the playable room and its cutaway roof unobstructed.
  const height=b.buildingId==='memory_archives'?30:b.buildingId==='tower_circle'?34:b.district==='innovation'?26:b.district==='community'?20:14;
  const rear=z-d/2-4;
  mesh(box,dark,x,h+height/2,rear,w*.72,height,4);
  for(let floor=0;floor<Math.floor(height/3);floor++){
   mesh(box,glass,x,h+2+floor*3,rear+2.12,w*.62,1.75,.18);
   mesh(box,gold,x,h+3+floor*3,rear+2.3,w*.76,.12,.2);
  }
  for(const side of [-1,1])mesh(box,gold,x+side*w*.38,h+height/2,rear,.3,height+3,4.3);
  mesh(box,gold,x,h+height+.2,rear,w*.86,.4,5);mesh(sphere,blue,x,h+height+2,rear,.7);
  // Foundations belong to the visible rear tower, so people cannot pass through it.
  mesh(box,dark,x,h/2,rear,w*.74,h,4);
  if(b.buildingId==='arena_3b'){
   for(let tier=0;tier<3;tier++){
    const ring=mesh(geo(new THREE.TorusGeometry(w*.62+tier,.22,5,56,Math.PI)),gold,x,5+tier*2,z);
    ring.rotation.set(-Math.PI/2,0,Math.PI);
   }
   for(const side of [-1,1]){mesh(cylinder,dark,x+side*(w/2+3),8,z,2,16,2);mesh(cylinder,blue,x+side*(w/2+3),16.2,z,1.3,.3,1.3);}
  }
  if(['house_3b','ai_textile_lab','mode3_studio'].includes(b.buildingId)){
   const arch=mesh(geo(new THREE.TorusGeometry(w*.55,.2,5,40,Math.PI)),blue,x,3,z+d/2+.7);arch.rotation.z=0;
   mesh(box,stone,x,h-1,z+d/2+2,w+4,.35,4);
  }
  if(['central_marina','train_station','community_house'].includes(b.buildingId)){
   for(let i=0;i<4;i++)mesh(box,gold,x-w*.4+i*w*.27,h+1+i*.35,z,w*.2,.25,d+5);
  }
  // Rooftop planted terraces add human life to the skyline without extra textures.
  for(const side of [-1,1]){mesh(box,stone,x+side*w*.3,h+.5,z,w*.22,.6,d*.6);mesh(sphere,green,x+side*w*.3,h+1.5,z,w*.13,1,d*.24);}
 }
 // Eight residential clusters sit between the gate axes, leaving the ring promenade open.
 for(let i=0;i<8;i++){
  const a=(i+.5)*Math.PI/4,x=Math.cos(a)*132,z=Math.sin(a)*132,h=16+(i%3)*7;
  for(const side of [-1,1]){
   const tx=x+Math.cos(a+Math.PI/2)*side*6,tz=z+Math.sin(a+Math.PI/2)*side*6;
   mesh(box,dark,tx,h/2,tz,8,h,9);
   for(let f=0;f<Math.floor(h/3);f++){mesh(box,glass,tx,2+f*3,tz+4.6,6,1.7,.15);mesh(box,gold,tx,3+f*3,tz+4.8,8.4,.15,.2);}
   mesh(box,gold,tx,h+.3,tz,9,.6,10);mesh(sphere,green,tx,h+1.7,tz,2.8,1.3,3);
  }
  sign('RÉSIDENCES · ACCÈS PRIVÉ',x,3,z+8,12);
 }
 // Side gardens fill the walk between districts; their spacing protects the eight axes.
 for(let i=0;i<32;i++){
  const a=(i+.5)*Math.PI/16,r=105+(i%2)*25,x=Math.cos(a)*r,z=Math.sin(a)*r;
  mesh(cylinder,wood,x,2.3,z,.3,4.6,.3);mesh(sphere,green,x,5.4,z,2.6,3.2,2.6);
 }
}
