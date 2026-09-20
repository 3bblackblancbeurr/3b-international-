import * as THREE from 'three';

function hash(input){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(id){let h=hash(id);return()=>{h=(Math.imul(h,1664525)+1013904223)>>>0;return h/4294967296;};}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function localSlope(field,x,z,sample=1.35){
 const y=field.height(x,z);
 return Math.max(
  Math.abs(field.height(x+sample,z)-y),
  Math.abs(field.height(x-sample,z)-y),
  Math.abs(field.height(x,z+sample)-y),
  Math.abs(field.height(x,z-sample)-y),
 )/sample;
}

function instanced(root,owned,name,geometry,material,transforms){
 if(!transforms.length)return null;
 const mesh=new THREE.InstancedMesh(geometry,material,transforms.length),dummy=new THREE.Object3D();
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 transforms.forEach((t,i)=>{dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(t.rx||0,t.ry||0,t.rz||0);dummy.scale.set(t.sx||1,t.sy||1,t.sz||1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
 mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);owned.push(mesh);return mesh;
}

export function addPremiumMicroDetails({region,field,root,owned}){
 const geometries={
  box:new THREE.BoxGeometry(1,1,1),
  cylinder:new THREE.CylinderGeometry(1,1,1,10),
  cover:new THREE.CylinderGeometry(1,1,1,16),
  puddle:new THREE.CircleGeometry(1,20),
 };
 geometries.puddle.rotateX(-Math.PI/2);
 Object.values(geometries).forEach(g=>owned.push(g));
 const materials={
  iron:new THREE.MeshStandardMaterial({color:'#161d22',roughness:.48,metalness:.62}),
  paint:new THREE.MeshStandardMaterial({color:'#d6b46a',roughness:.42,metalness:.34}),
  utility:new THREE.MeshStandardMaterial({color:'#29343a',roughness:.74,metalness:.32}),
  drain:new THREE.MeshStandardMaterial({color:'#252c30',roughness:.68,metalness:.58}),
  litter:new THREE.MeshStandardMaterial({color:'#49423a',roughness:.92,metalness:.02}),
  puddle:new THREE.MeshPhysicalMaterial({color:'#071118',roughness:.12,metalness:.02,clearcoat:.85,clearcoatRoughness:.08,transparent:true,opacity:.08,depthWrite:false}),
 };
 Object.values(materials).forEach(m=>owned.push(m));

 const bollards=[],drains=[],utility=[],litter=[],puddles=[],crates=[],signs=[],bins=[];
 for(const road of field.roads||[]){
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len,heading=Math.atan2(dx,dz),rng=seeded(region+':road:'+road.id+':'+i);
   const baseStep=region==='hub'?28:36,spacing=baseStep*(.78+rng()*.55),count=Math.floor(len/spacing),activity=.18+rng()*.72;
   for(let n=1;n<=count;n++){
    const t=clamp((n+(rng()-.5)*.34)/(count+1),.05,.95),cx=a.x+dx*t,cz=a.z+dz*t,side=rng()>.5?1:-1,roadHalf=(road.width||5)/2,edge=roadHalf+.75+rng()*.7,x=cx+nx*edge*side,z=cz+nz*edge*side,y=field.height(x,z);
    if(field.buildings.some(s=>Math.hypot(s.x-x,s.z-z)<Math.hypot(s.width,s.depth)/2+2.5))continue;
    if(rng()>.38+(1-activity)*.18)bollards.push({x,y:y+.42,z,sx:.10,sy:.82,sz:.10});

    const drainOffset=Math.max(.15,roadHalf-.28),leftX=cx+nx*drainOffset,leftZ=cz+nz*drainOffset,rightX=cx-nx*drainOffset,rightZ=cz-nz*drainOffset;
    const drainSide=field.height(leftX,leftZ)<=field.height(rightX,rightZ)?1:-1,drainX=cx+nx*drainOffset*drainSide,drainZ=cz+nz*drainOffset*drainSide;
    drains.push({x:drainX,y:field.height(drainX,drainZ)+.075,z:drainZ,sx:.34,sy:.035,sz:.58,ry:heading});

    const slope=localSlope(field,cx,cz);
    if(slope<.12&&rng()>.66+(1-activity)*.18){
     const puddleOffset=Math.max(.35,roadHalf*.42),px=cx+nx*puddleOffset*drainSide,pz=cz+nz*puddleOffset*drainSide;
     puddles.push({x:px,y:field.height(px,pz)+.085,z:pz,sx:.8+rng()*1.7,sy:1,sz:.42+rng()*.75,ry:heading+(rng()-.5)*.5});
    }
    if(activity>.46&&rng()>.90)litter.push({x:x+nx*side*.4,y:y+.045,z:z+nz*side*.4,sx:.10+rng()*.15,sy:.025,sz:.14+rng()*.22,ry:rng()*Math.PI});
    if(rng()>.82-activity*.12)bins.push({x:x-nx*side*.55,y:y+.48,z:z-nz*side*.55,sx:.34,sy:.82,sz:.34,ry:heading});
    if(rng()>.91-activity*.08)signs.push({x:x+nx*side*.95,y:y+1.45,z:z+nz*side*.95,sx:.08,sy:2.2,sz:.08,ry:heading});
   }
  }
 }

 for(const [i,b] of (field.buildings||[]).entries()){
  const rng=seeded(region+':building:'+i),r=Math.max(b.width,b.depth)/2+1.05,a=(b.rotation||0)+Math.PI/2,x=b.x+Math.sin(a)*r,z=b.z+Math.cos(a)*r,y=field.height(x,z);
  if(i%2===0)utility.push({x,y:y+.68,z,sx:.55+rng()*.35,sy:1.15+rng()*.45,sz:.42+rng()*.28,ry:b.rotation||0});
  if(i%3===0)for(let k=0;k<2;k++)crates.push({x:x+(k-.5)*1.2,y:y+.35,z:z+.7,sx:.55,sy:.62,sz:.55,ry:(b.rotation||0)+k*.15});
 }

 // Waterfront gets a few deliberate service objects without turning into clutter.
 if(region==='hub'){
  const toCity=Math.atan2(-field.lake.z,-field.lake.x),rng=seeded(region+':waterfront-service'),count=11;
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,a=toCity-1.05+t*2.1+(rng()-.5)*.14,r=field.lake.r+8.4+rng()*4.8,x=field.lake.x+Math.cos(a)*r,z=field.lake.z+Math.sin(a)*r,y=Math.max(-.75,field.height(x,z));
   if(rng()>.62)utility.push({x,y:y+.62,z,sx:.62+rng()*.18,sy:1+rng()*.25,sz:.46+rng()*.16,ry:-a+(rng()-.5)*.12});
   if(rng()>.48)crates.push({x:x+Math.sin(a)*(1.1+rng()),y:y+.32,z:z-Math.cos(a)*(1.1+rng()),sx:.54+rng()*.16,sy:.5+rng()*.16,sz:.54+rng()*.16,ry:a+(rng()-.5)*.25});
  }
 }

 const meshes=[
  instanced(root,owned,'micro-bollards',geometries.cylinder,materials.iron,bollards),
  instanced(root,owned,'micro-drains',geometries.box,materials.drain,drains),
  instanced(root,owned,'micro-utility',geometries.box,materials.utility,utility),
  instanced(root,owned,'micro-litter',geometries.box,materials.litter,litter),
  instanced(root,owned,'micro-crates',geometries.box,materials.paint,crates),
  instanced(root,owned,'micro-bins',geometries.box,materials.utility,bins),
  instanced(root,owned,'micro-sign-posts',geometries.box,materials.iron,signs),
  instanced(root,owned,'micro-puddles',geometries.puddle,materials.puddle,puddles),
 ].filter(Boolean);
 const counts=meshes.map(m=>m.count);
 const signFaces=signs.slice(0,Math.min(signs.length,80)).map((s,i)=>({x:s.x,y:s.y+.62,z:s.z,sx:.62,sy:.32,sz:.04,ry:s.ry,rz:(i%3-1)*.025}));
 const signFaceMat=new THREE.MeshStandardMaterial({color:'#17242c',roughness:.38,metalness:.28,emissive:'#00a8ff',emissiveIntensity:.08});owned.push(signFaceMat);
 const signFacesMesh=instanced(root,owned,'micro-sign-faces',geometries.box,signFaceMat,signFaces);
 if(signFacesMesh){meshes.push(signFacesMesh);counts.push(signFacesMesh.count);}

 // Sparse overhead service cables establish urban scale with one line draw.
 const cablePoints=[];
 for(const road of (field.roads||[]).slice(0,region==='hub'?8:4)){
  if(road.points.length<2)continue;const a=road.points[0],b=road.points.at(-1),len=Math.hypot(b.x-a.x,b.z-a.z);if(len<30)continue;
  const dx=(b.x-a.x)/len,dz=(b.z-a.z)/len,nx=-dz,nz=dx;
  const ax=a.x+nx*((road.width||5)/2+2.6),az=a.z+nz*((road.width||5)/2+2.6),bx=b.x+nx*((road.width||5)/2+2.6),bz=b.z+nz*((road.width||5)/2+2.6);
  cablePoints.push(ax,field.height(ax,az)+5.8,az,bx,field.height(bx,bz)+5.8,bz);
 }
 let cable=null;
 if(cablePoints.length){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(cablePoints,3));const m=new THREE.LineBasicMaterial({color:'#11171c',transparent:true,opacity:.58});cable=new THREE.LineSegments(g,m);root.add(cable);owned.push(g,m);
 }

 return{
  setWeather(weather){materials.puddle.opacity=weather==='storm'?.46:weather==='heavy_rain'?.38:weather==='rain'?.28:weather==='fog'?.16:.06;materials.puddle.needsUpdate=true;},
  setDaylight(daylight){materials.paint.emissive?.set?.('#000000');materials.puddle.clearcoat=Math.max(.58,.92-(Number(daylight)||0)*.08);},
  setQuality(mode){const factor=mode==='fluid'?.45:mode==='detail'?1:.76;meshes.forEach((mesh,i)=>mesh.count=Math.max(0,Math.round(counts[i]*factor)));if(cable)cable.visible=mode!=='fluid';},
 };
}
