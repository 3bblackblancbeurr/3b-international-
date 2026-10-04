/** Reference-led skyline and coastal detail. All decoration stays out of the walkable aisles. */
export function addReferenceCiteDetails({mesh,geo,box,cylinder,sphere,materials,THREE}){
 const {dark,gold,blue,glass,stone,green,wood}=materials;
 // Four tapered spires make the central Nexus legible from every district.
 // Their footprint is entirely inside the existing non-walkable central fountain.
 for(const side of [-1,1])for(const depth of [-1,1]){
  const x=side*5.2,z=depth*5.2,height=depth<0?88:72;
  const footprint=new THREE.Shape();
  const corners=[[-1.35,-1.9],[1.35,-1.9],[1.9,-1.35],[1.9,1.35],[1.35,1.9],[-1.35,1.9],[-1.9,1.35],[-1.9,-1.35]];
  footprint.moveTo(...corners[0]);for(const corner of corners.slice(1))footprint.lineTo(...corner);footprint.closePath();
  const shaft=geo(new THREE.ExtrudeGeometry(footprint,{depth:height,bevelEnabled:false,steps:1}));shaft.rotateX(-Math.PI/2);shaft.translate(0,-height/2,0);
  mesh(shaft,dark,x,height/2,z);
  mesh(box,gold,x+side*1.95,height/2,z,.23,height+3,4);
  mesh(box,glass,x,height/2,z+2,2.8,height-4,.16);
  for(let floor=8;floor<height;floor+=4)mesh(box,gold,x,floor,z+2.15,3.8,.12,.18);
  const profile=[[2.3,0],[2.3,.6],[1.8,1],[1.65,3],[1.2,5.4],[.85,7.4],[.35,10],[0,12]].map(([r,y])=>new THREE.Vector2(r,y));
  mesh(geo(new THREE.LatheGeometry(profile,8)),gold,x,height,z);
  // Ascending ribs and diagonal braces remain entirely within the fountain footprint.
  for(const outward of [-1,1]){
   const rib=Array.from({length:13},(_,i)=>{const t=i/12;return new THREE.Vector3(x+outward*(2.1+Math.sin(t*Math.PI)*.5),8+t*(height-8),z-2.05);});
   mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib),18,.09,5,false)),gold,0,0,0);
  }
  mesh(cylinder,blue,x,height+14,z,.11,6,.11);
 }
 for(const y of [18,44,66]){const collar=mesh(geo(new THREE.TorusGeometry(11,.4,6,64)),gold,0,y,0);collar.rotation.x=-Math.PI/2;}
 // A suspended glazed lantern joins the four shafts above the broken ring.
 mesh(geo(new THREE.CylinderGeometry(2,3.1,34,8)),glass,0,61,0);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(cylinder,gold,Math.cos(a)*2.6,61,Math.sin(a)*2.6,.07,34,.07);}
 for(const y of [44,61,78]){const lantern=mesh(geo(new THREE.TorusGeometry(y===44?3.1:y===61?2.6:2,.12,5,32)),gold,0,y,0);lantern.rotation.x=-Math.PI/2;}
 mesh(sphere,blue,0,83,0,2.2);
 // Rock strata under the coast give the city weight rather than a thin floating disc.
 // Balcony gardens along the edge are bounded by the existing safe perimeter.
 for(let i=0;i<16;i++){
  const a=(i+.5)*Math.PI/8,x=Math.cos(a)*154,z=Math.sin(a)*154;
  mesh(cylinder,dark,x,.07,z,4.8,.14,4.8);
  for(let j=0;j<5;j++){const b=a-Math.PI/2+j*Math.PI/4,px=x+Math.cos(b)*4.2,pz=z+Math.sin(b)*4.2;mesh(box,gold,px,1,pz,.16,2,.16);}
 }
 // Boats are scenery below the protected deck, with hulls, cabins and navigation lights.
 for(let i=0;i<5;i++){
  const x=-38+i*19,z=186+(i%2)*12;
  const hull=mesh(geo(new THREE.CylinderGeometry(1,1,1,6)),dark,x,-17,z,4,2,14);hull.rotation.y=Math.PI/6;
  mesh(box,stone,x,-15.7,z,5,1.2,13);mesh(box,dark,x,-14,z-2,4,2,6);
  mesh(box,glass,x,-13,z-2,3.7,.7,5.7);mesh(box,gold,x,-15,z+4,5,.15,5);
  mesh(sphere,blue,x+2,-14.8,z+5,.16);mesh(sphere,gold,x-2,-14.8,z+5,.16);
 }
 // Low-profile light lines frame the arrival plaza without adding barriers.
 for(const radius of [8,13,18]){const ring=mesh(geo(new THREE.TorusGeometry(radius,.045,4,64)),radius===13?blue:gold,0,.08,35);ring.rotation.x=-Math.PI/2;}
}
