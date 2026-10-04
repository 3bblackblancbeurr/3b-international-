/** Additional authored architectural layers, bounded by the existing room footprints. */
export function addLandmarkCraft({mesh,geo,box,cylinder,materials,buildings,THREE}){
 const {dark,gold,glass,stone,blue}=materials;
 function tube(points,r,material){return mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,r,6,false)),material,0,0,0);}
 for(const b of buildings){
  const x=b.buildingX,z=b.buildingZ,w=b.width,d=b.depth,h=b.height,rear=z-d/2-4;
  // A recessed entry canopy, with curved ribs and a daylight opening.
  for(const side of [-1,1]){
   const points=Array.from({length:9},(_,i)=>{const t=i/8;return new THREE.Vector3(x+side*w*.34,4.8+Math.sin(t*Math.PI)*1.8,z+d/2-1+t*5);});tube(points,.09,gold);
  }
  // Curved glazing joins the existing ribs into a usable entrance canopy.
  const canopy=new THREE.PlaneGeometry(1,1,4,8),cp=canopy.attributes.position,cu=canopy.attributes.uv;
  for(let i=0;i<cp.count;i++){
   const across=cu.getX(i)*2-1,t=cu.getY(i);
   cp.setXYZ(i,x+across*w*.34,4.8+Math.sin(t*Math.PI)*1.8,z+d/2-1+t*5);
  }
  for(let i=0;i<canopy.index.count;i+=3){const b=canopy.index.getX(i+1);canopy.index.setX(i+1,canopy.index.getX(i+2));canopy.index.setX(i+2,b);}
  canopy.computeVertexNormals();mesh(geo(canopy),glass,0,0,0).castShadow=false;
  // Panelled stone soffits and metal corner mouldings break up large flat walls.
  for(let k=0;k<4;k++)for(const side of [-1,1])mesh(box,gold,x+side*(w/2+.08),1.3+k*1.5,z-d*.12,.12,.12,d*.72);
  for(const side of [-1,1]){
   const rail=mesh(box,gold,x+side*w*.3,h+1,z,w*.25,.08,d*.65);
   rail.position.z+=d*.32;
   for(let j=0;j<4;j++)mesh(box,gold,x+side*w*.3-w*.12+j*w*.08,h+.7,z+d*.32,.05,.6,.05);
  }
  if(b.buildingId==='memory_archives'){
   // A raised octagonal reading lantern above the archive spine.
   mesh(geo(new THREE.CylinderGeometry(5.4,5.4,5,8)),glass,x,h+29,rear);
   mesh(geo(new THREE.CylinderGeometry(6.3,5.4,1.1,8)),gold,x,h+32,rear);
   mesh(geo(new THREE.SphereGeometry(5.4,24,12,0,Math.PI*2,0,Math.PI/2)),dark,x,h+32.5,rear);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(cylinder,gold,x+Math.cos(a)*5.45,h+29,rear+Math.sin(a)*5.45,.11,6,.11);}
  }
  if(b.district==='innovation'){
   // Observatory crown and a distinct gyroscopic Matrix sculpture.
   const centerY=h+29,r=w*.36;
   mesh(geo(new THREE.SphereGeometry(r,24,12,0,Math.PI*2,0,Math.PI/2)),glass,x,centerY,rear);
   for(const tilt of [-.48,.48]){const ring=mesh(geo(new THREE.TorusGeometry(r+1.2,.12,6,48)),gold,x,centerY+2,rear);ring.rotation.set(Math.PI/2,tilt,.3);}
   mesh(cylinder,blue,x,centerY+2,rear,.1,9,.1);
  }
  if(b.buildingId==='arena_3b'){
   // The upper stands follow the back half of the oval and keep the door open.
   for(let tier=0;tier<3;tier++)for(let i=0;i<14;i++){
    const a=Math.PI+(i+.5)*Math.PI/14,r=w*.6+tier*.9,seat=mesh(box,tier%2?dark:stone,x+Math.cos(a)*r,4.7+tier*1.8,z+Math.sin(a)*r,2.4,.4,1.6);seat.rotation.y=-a+Math.PI/2;
   }
  }
  if(b.district==='city3b_portal'){
   // An elevated civic crown echoes the doorway to each player's own city.
   const pts=Array.from({length:17},(_,i)=>{const a=i*Math.PI/16;return new THREE.Vector3(x+Math.cos(a)*w*.55,h+9+Math.sin(a)*w*.55,rear);});tube(pts,.4,gold);
   for(const side of [-1,1])mesh(box,dark,x+side*w*.55,h+4.5,rear,1,9,1.5);
  }
 }
}
