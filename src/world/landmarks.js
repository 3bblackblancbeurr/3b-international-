import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surfaceTexture} from './surfaces.js';
import {HERITAGE} from './heritage.js';

// Authored silhouettes, hollow arches and real structural members. Each material
// is merged once: detail adds triangles, not hundreds of independent draw calls.
export function createLandmark(region,occlusion){
 const root=new THREE.Group(),lights=new THREE.Group(),owned=[],materials=new Map();root.name=HERITAGE[region].name;root.add(lights);
 const geo=g=>(owned.push(g),g),box=geo(new THREE.BoxGeometry(1,1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,20)),sphere=geo(new THREE.SphereGeometry(1,20,12)),cone=geo(new THREE.ConeGeometry(1,1,24));
 const texture=surfaceTexture('stone');if(texture)owned.push(texture);
 const palette={stone:region==='tunisie'?'#c9a574':'#ddd1b6',trim:'#f2e6cd',dark:'#3d4b50',gold:'#c5a66c',roof:'#54796e',glass:'#456774'};
 const mat=key=>{if(!materials.has(key)){const m=new THREE.MeshStandardMaterial({color:palette[key]||key,map:['stone','trim'].includes(key)?texture:null,bumpMap:key==='stone'?texture:null,bumpScale:.065,roughness:key==='gold'?.38:.78,metalness:key==='gold'?.6:key==='dark'?.3:0});occlusion?.apply(m);materials.set(key,m);owned.push(m);}return materials.get(key);};
 const add=(geometry,key,x,y,z,sx=1,sy=sx,sz=sx,parent=root)=>{const m=new THREE.Mesh(geometry,mat(key));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const b=(key,x,y,z,w,h,d,parent=root)=>add(box,key,x,y,z,w,h,d,parent);
 const rod=(a,c,r=.12,key='dark',parent=root)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...c),delta=to.clone().sub(from);const m=add(cylinder,key,...from.add(to).multiplyScalar(.5).toArray(),r,delta.length(),r,parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;};
 function arc(key,x,y,z,w,h,thick=.32,depth=.65,parent=root){
  const s=new THREE.Shape(),r=w/2;s.absarc(0,0,r,0,Math.PI,false);s.lineTo(-r+thick,0);s.absarc(0,0,r-thick,Math.PI,0,true);s.closePath();
  const g=geo(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:12}));
  add(g,key,x,y+h-r,z-depth/2,1,1,1,parent);
  for(const side of [-1,1])b(key,x+side*(r-thick/2),y+(h-r)/2,z,thick,h-r,depth,parent);
 }
 const ring=(key,r,y,t=.14,parent=root)=>{const g=geo(new THREE.TorusGeometry(r,t,5,64));g.rotateX(-Math.PI/2);return add(g,key,0,y,0,1,1,1,parent);};
 const cross=(x,y,z,s=1)=>{rod([x,y,z],[x,y+2.3*s,z],.085*s,'gold');rod([x-.65*s,y+1.5*s,z],[x+.65*s,y+1.5*s,z],.085*s,'gold');};
 function onion(x,y,z,r,h){
  add(cylinder,'trim',x,y-1.8,z,r*.71,3.6,r*.71);
  const profile=[[.72,0],[.95,.12],[1,.32],[.86,.53],[.53,.76],[.16,.93],[0,1]].map(([a,b])=>new THREE.Vector2(a*r,b*h));
  add(geo(new THREE.LatheGeometry(profile,28)),'dark',x,y,z);cross(x,y+h,z,.6);
  for(let i=0;i<12;i++){const a=i*Math.PI/6,g=new THREE.Group();g.position.set(x,y-3,z);g.rotation.y=a;root.add(g);arc('stone',0,0,r*.72,1,2.5,.16,.18,g);}
 }
 function amphitheatre(broken){
  const count=36,rx=19,rz=14.2;
  for(let level=0;level<3;level++)for(let i=0;i<count;i++){
   // El Jem's broken sector keeps its interior visible from the forecourt.
   if(broken&&level>0&&i>2&&i<8)continue;
   const a=i/count*Math.PI*2,g=new THREE.Group();g.position.set(Math.sin(a)*rx,level*6.2+.2,Math.cos(a)*rz);g.rotation.y=Math.atan2(Math.sin(a)/rx,Math.cos(a)/rz);root.add(g);
   const w=2*Math.PI*Math.sqrt((rx*rx+rz*rz)/2)/count;
   arc('stone',0,0,0,w,5.8,.43,1.7,g);b('trim',0,6,0,w+.18,.42,1.95,g);
   for(const side of [-1,1]){add(cylinder,'trim',side*(w/2-.2),2.3,1,.18,4.3,.18,g);b('trim',side*(w/2-.2),4.6,1,.55,.28,.45,g);}
   if(!broken&&level===2)b('stone',0,20-level*6.2,0,w+.15,2.8,1.8,g);
  }
  // Elliptical stepped seating, open arena; no flat cylinder filling the arches.
  for(let j=0;j<4;j++){
   const g=geo(new THREE.RingGeometry(10+j*1.4,11.5+j*1.4,72));g.rotateX(-Math.PI/2);add(g,'stone',0,.3+j*.7,0,1,1,.73);
  }
 }
 if(region==='france'){
  const levels=[[0,9.5,1.65],[13,5.8,1.05],[27,3,.7],[47,1.25,.43],[57,.45,.22]];
  for(const sx of [-1,1])for(const sz of [-1,1]){
   b('stone',sx*9.5,.35,sz*9.5,4,.7,4);
   for(let k=1;k<levels.length;k++){
    const [y0,r0,w0]=levels[k-1],[y1,r1,w1]=levels[k];
    for(const side of [-1,1])for(const face of [-1,1])rod([sx*r0+side*w0,y0,sz*r0+face*w0],[sx*r1+side*w1,y1,sz*r1+face*w1],.16,'gold');
    for(let j=0;j<5;j++){
     const t=j/5,u=(j+1)/5,ra=r0+(r1-r0)*t,rb=r0+(r1-r0)*u,wa=w0+(w1-w0)*t,wb=w0+(w1-w0)*u,ya=y0+(y1-y0)*t,yb=y0+(y1-y0)*u;
     for(const face of [-1,1]){rod([sx*ra-wa,ya,sz*ra+face*wa],[sx*rb+wb,yb,sz*rb+face*wb],.07,'dark');rod([sx*ra+wa,ya,sz*ra+face*wa],[sx*rb-wb,yb,sz*rb+face*wb],.07,'dark');}
    }
   }
  }
  for(const [y,r] of [[13,7.7],[27,4.4],[48,2.2]]){
   for(const side of [-1,1]){b('dark',0,y,side*r,2*r,.55,.6);b('dark',side*r,y,0,.6,.55,2*r);b('gold',0,y+.7,side*r,2*r,.16,.2);b('gold',side*r,y+.7,0,.2,.16,2*r);}
  }
  for(let face=0;face<4;face++){const g=new THREE.Group();g.rotation.y=face*Math.PI/2;root.add(g);arc('dark',0,0,9.5,15.4,11,.35,.4,g);}
  rod([0,47,0],[0,64,0],.18,'gold');
 }else if(region==='italie'||region==='tunisie')amphitheatre(region==='tunisie');
 else if(region==='estonie'){
  b('stone',0,5.4,0,19,10.8,14);b('trim',0,10.8,0,20,.6,15);b('stone',0,12.5,0,10,4,10);
  onion(0,19,0,4.2,7.2);for(const x of [-7,7])for(const z of [-5,5])onion(x,13.6,z,2.45,4.5);
  for(const z of [-7.2,7.2]){const g=new THREE.Group();g.rotation.y=z<0?Math.PI:0;root.add(g);for(const x of [-6,-3,0,3,6]){b('dark',x,4.6,7.25,1.7,5,.12,g);arc('trim',x,1.9,7.4,2.4,6,.3,.45,g);}arc('trim',0,0,8.4,5.2,7.5,.6,1.8,g);}
 }else if(region==='turquie'){
  add(cylinder,'stone',0,12,0,7.8,24,7.8);add(cylinder,'trim',0,24,0,8.7,.7,8.7);add(cylinder,'dark',0,27,0,6.9,5.7,6.9);add(cone,'dark',0,35,0,8.4,11,8.4);rod([0,40,0],[0,43,0],.1,'gold');
  for(const y of [7,14,21,24.5])ring('trim',y===24.5?8.7:7.85,y,.13);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2,g=new THREE.Group();g.rotation.y=a;root.add(g);for(const y of [3,11,18]){b('dark',0,y+1,7.82,1.1,2.4,.12,g);arc('trim',0,y-.2,7.88,1.6,3,.17,.14,g);}add(cylinder,'trim',0,27,7.15,.18,5,.18,g);b('gold',0,25.4,8.1,2.9,.16,.2,g);}
 }else if(region==='algerie'){
  for(let n=0;n<3;n++){
   const g=new THREE.Group();g.rotation.y=n*Math.PI*2/3;root.add(g);
   const outline=new THREE.Shape();outline.moveTo(15,0);outline.bezierCurveTo(8,9,5,18,3.1,31);outline.lineTo(3.1,43);outline.lineTo(1,43);outline.lineTo(1.5,30);outline.bezierCurveTo(2.4,17,4.2,8,8.8,0);outline.closePath();
   const geometry=geo(new THREE.ExtrudeGeometry(outline,{depth:2.2,bevelEnabled:true,bevelThickness:.15,bevelSize:.15,bevelSegments:1,curveSegments:28}));add(geometry,'stone',0,0,-1.1,1,1,1,g);
   for(const offset of [-.65,.65]){const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(13,1,offset),new THREE.Vector3(5,13,offset),new THREE.Vector3(2.5,23,offset),new THREE.Vector3(2.15,42,offset));add(geo(new THREE.TubeGeometry(curve,30,.08,5,false)),'gold',0,0,0,1,1,1,g);}
  }
  add(cylinder,'stone',0,36,0,2.6,11,2.6);add(cone,'gold',0,43,0,2.5,3,2.5);ring('gold',5,.25,.2);
 }else if(region==='maroc'){
  b('stone',0,5,-2,29,10,19);const roof=add(geo(new THREE.CylinderGeometry(.7,1,1,4)),'roof',0,12,-2,22,4,15);roof.rotation.y=Math.PI/4;
  for(let face=0;face<2;face++){const g=new THREE.Group();g.rotation.y=face*Math.PI;root.add(g);for(let i=-4;i<=4;i++){b('dark',i*3,3.1,7.57,2.1,5.7,.1,g);arc('trim',i*3,.3,7.7,2.7,7,.27,.5,g);}b('gold',0,9,7.8,28,.18,.2,g);}
  b('stone',0,22,10,5.3,44,5.3);b('roof',0,37,10,5.6,3,5.6);b('trim',0,41.1,10,6.2,.8,6.2);b('stone',0,44,10,3.3,4.5,3.3);add(cone,'gold',0,47.4,10,1.9,2.1,1.9);
  for(let face=0;face<4;face++){const g=new THREE.Group();g.position.z=10;g.rotation.y=face*Math.PI/2;root.add(g);for(const x of [-1.4,1.4])b('trim',x,21,2.73,.2,34,.2,g);for(const y of [12,21,30]){arc('roof',0,y,2.8,2.2,5.6,.2,.2,g);for(let j=0;j<4;j++){const tile=b('roof',0,y+j*.85,2.86,.75,.75,.12,g);tile.rotation.z=Math.PI/4;}}}
  for(let i=0;i<3;i++)add(sphere,'gold',0,49+i*1.1,10,.7-i*.18);
 }else if(region==='espagne'){
  b('stone',0,6,0,20,12,22);
  for(const side of [-1,1])for(let i=-2;i<=2;i++){
   const z=i*4.4;b('dark',side*10.07,7,z,.16,7,1.6);rod([side*12,.2,z],[side*10,11,z],.35,'trim');rod([side*10,11,z],[side*7,16,z],.27,'stone');add(cone,'stone',side*10,14,z,.7,4,.7);
  }
  const towers=[[-7,9,27],[-2.4,9,31],[2.4,9,31],[7,9,27],[-7,-9,25],[-2.4,-9,29],[2.4,-9,29],[7,-9,25],[-4,0,36],[4,0,36],[0,0,47]];
  for(const [x,z,h] of towers){
   add(geo(new THREE.CylinderGeometry(.65,1.75,h-8,16)),'stone',x,(h+8)/2,z);add(cone,'gold',x,h+1.3,z,.9,2.6,.9);
   for(let y=13;y<h-1;y+=3.3)for(let face=0;face<6;face++){const a=face*Math.PI/3,r=1.75-(y-8)/(h-8)*1.1;const slit=b('dark',x+Math.sin(a)*r,y,z+Math.cos(a)*r,.34,1.4,.06);slit.rotation.y=a;}
  }
  for(const x of [-6,0,6]){b('dark',x,3.4,11.12,3.8,6.8,.1);arc('trim',x,0,11.35,5.2,9,.6,.6);add(cone,'stone',x,12,11.2,2.4,5,1);}
  cross(0,49,0,1.1);
 }
 // Only the 3B forecourt is restored. The real monument remains recognizable
 // before the quest; no invented destroyed religious building or giant logo.
 const lampMat=new THREE.MeshStandardMaterial({color:'#ffe3a3',emissive:'#ffd187',emissiveIntensity:.75,roughness:.35});owned.push(lampMat);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const lamp=add(box,'dark',Math.sin(a)*22,.65,Math.cos(a)*22,.35,1.3,.35,lights);const bulb=new THREE.Mesh(sphere,lampMat);bulb.position.copy(lamp.position);bulb.position.y=1.35;bulb.scale.setScalar(.21);lights.add(bulb);}
 function merge(parent){parent.updateMatrixWorld(true);const groups=new Map(),inverse=new THREE.Matrix4().copy(parent.matrixWorld).invert();parent.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});for(const meshes of groups.values()){const parts=meshes.map(m=>{const p=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return p.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));});const merged=geo(mergeGeometries(parts));parts.forEach(g=>g.dispose());const m=new THREE.Mesh(merged,meshes[0].material);m.castShadow=m.receiveShadow=true;meshes.forEach(m=>m.removeFromParent());parent.add(m);}}
 lights.removeFromParent();merge(root);merge(lights);root.add(lights);
 return{root,update(stage){lights.visible=stage>=3;},dispose(){owned.forEach(v=>v.dispose());}};
}
