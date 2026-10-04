/** Low-cost authored silhouettes. Public rooms keep the same ground-level doors. */
export function addPlatformArchitecture({mesh,geo,box,cylinder,sphere,materials,buildings,collisions,sign,THREE}){
 const {dark,gold,blue,glass,stone,green,wood}=materials;
 for(const b of buildings){
  const x=b.buildingX,z=b.buildingZ,w=b.width,d=b.depth,h=b.height;
  // Raised rear towers leave the playable room and its cutaway roof unobstructed.
  const height=b.buildingId==='memory_archives'?30:b.buildingId==='tower_circle'?34:b.district==='innovation'?26:b.district==='community'?20:14;
  const rear=z-d/2-4;
  const stepped=['community_house','central_marina','shipyard_3b','city_planning_office','city_gallery'].includes(b.buildingId);
  if(stepped){
   for(let tier=0;tier<3;tier++){
    const span=w*(.72-tier*.15),y=h+height*(tier+.5)/3;
    mesh(box,dark,x,y,rear,span,height/3,4);
    mesh(box,gold,x,h+height*(tier+1)/3,rear,span+.45,.2,4.5);
   }
  }else mesh(box,dark,x,h+height/2,rear,w*.72,height,4);
  for(let floor=0;floor<Math.floor(height/3);floor++){
   const tier=stepped?Math.min(2,Math.floor((2+floor*3)/(height/3))):0,span=w*(.62-tier*.15);
   mesh(box,glass,x,h+2+floor*3,rear+2.12,span,1.75,.18);
   mesh(box,gold,x,h+3+floor*3,rear+2.3,span+.3,.12,.2);
  }
  for(const side of [-1,1])mesh(box,gold,x+side*w*.38,h+(stepped?height/6:height/2),rear,.3,(stepped?height/3:height)+1,4.3);
  mesh(box,gold,x,h+height+.2,rear,w*(stepped?.44:.86),.4,5);
  if(['archives','innovation','broken_circle_tower'].includes(b.district))mesh(cylinder,blue,x,h+height+3,rear,.12,5,.12);
  // Foundations belong to the visible rear tower, so people cannot pass through it.
  mesh(box,dark,x,h/2,rear,w*.74,h,4);collisions.push({x,z:rear,width:w*.74,depth:4});
  if(b.buildingId==='arena_3b'){
   for(let tier=0;tier<3;tier++){
    const ring=mesh(geo(new THREE.TorusGeometry(w*.62+tier,.22,5,56,Math.PI)),gold,x,5+tier*2,z);
    ring.rotation.set(-Math.PI/2,0,Math.PI);
   }
   for(const side of [-1,1]){mesh(cylinder,dark,x+side*(w/2+3),8,z,2,16,2);mesh(cylinder,blue,x+side*(w/2+3),16.2,z,1.3,.3,1.3);collisions.push({x:x+side*(w/2+3),z,r:2});}
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
   const tx=x+Math.cos(a+Math.PI/2)*side*10,tz=z+Math.sin(a+Math.PI/2)*side*10;
   mesh(box,dark,tx,h/2,tz,8,h,9);collisions.push({x:tx,z:tz,width:8,depth:9});
   for(let f=0;f<Math.floor(h/3);f++){mesh(box,glass,tx,2+f*3,tz+4.6,6,1.7,.15);mesh(box,gold,tx,3+f*3,tz+4.8,8.4,.15,.2);}
   mesh(box,gold,tx,h+.3,tz,9,.6,10);
   // Recessed penthouses, service crowns and planted roof beds vary the silhouette.
   const crownH=2.5+(i%3)*1.5;
   mesh(box,glass,tx,h+.6+crownH/2,tz,5,crownH,6);
   mesh(box,dark,tx,h+.65+crownH,tz,6,.25,7);
   for(const edge of [-1,1]){mesh(box,stone,tx+edge*3.2,h+.85,tz,.75,.6,7);mesh(box,green,tx+edge*3.2,h+1.4,tz,.65,.6,6.8);}
  }
  sign('RÉSIDENCES · ACCÈS PRIVÉ',x,3,z+8,12);
 }
}
