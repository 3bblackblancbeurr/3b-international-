import {createLandmark} from '../landmarks.js';
import {randomFor} from '../terrain.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createNaturalGround,GROUND_STYLE} from '../natural-ground.js';
import {createFlora} from '../flora.js';
import {surfaceTexture} from '../surfaces.js';
import {COUNTRIES,countryLayout} from './countries.js';
export function createCountryEnvironment(scene,zone,{quality='high',onError=()=>{},occlusion}={}){
 const c=COUNTRIES[zone],layout=countryLayout(zone),root=new T.Group(),memory=new T.Group(),assets=[],materials=new Set(),geometries=new Set(),textures=new Set(),instances=[];root.name=c.name+' · '+c.district;root.add(memory);scene.add(root);let dead=false;
 const mat=(color,roughness=.9,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.add(m);return m;};
 const stone=mat(c.stone),dark=mat('#283a3e',.6,.3),gold=mat('#b4a17b',.5,.5),wood=mat('#735a42'),blue=mat('#65c2d4',.4,.25);blue.emissive.set('#1c586d');blue.emissiveIntensity=.5;
 const box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,20);geometries.add(box);geometries.add(cylinder);
 function mesh(g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 const natural=createNaturalGround(zone);natural.material.vertexColors=false;natural.material.color.set(GROUND_STYLE[zone].grass);materials.add(natural.material);textures.add(natural.texture);const land=new T.PlaneGeometry(700,700);land.rotateX(-Math.PI/2);geometries.add(land);mesh(land,natural.material,0,-.025,0).castShadow=false;
 const paving=mat(c.paving);paving.side=T.DoubleSide;const surface=surfaceTexture('stone');if(surface){textures.add(surface);paving.map=surface;paving.bumpMap=surface;paving.bumpScale=.02;}
 // Coplanar paths and plaza; no artificial walking-height changes.
 function road(points,width){const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.012,z))),pos=[],uv=[],ix=[];for(let i=0;i<=96;i++){const p=curve.getPoint(i/96),t=curve.getTangent(i/96);for(const sign of [-1,1]){const x=p.x-t.z*sign*width/2,z=p.z+t.x*sign*width/2;pos.push(x,.012,z);uv.push(x/3,z/3);}if(i<96){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();geometries.add(g);mesh(g,paving,0,0,0).castShadow=false;}
 layout.roads.forEach(r=>road(r,4.5));const plaza=new T.CircleGeometry(c.layout==='plaza'?15:11,48);plaza.rotateX(-Math.PI/2);geometries.add(plaza);const pos=plaza.attributes.position,uv=plaza.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+layout.centre.x)/3,(pos.getZ(i)+layout.centre.z)/3);mesh(plaza,paving,layout.centre.x,.016,layout.centre.z).castShadow=false;
 // Gate with an actual opening and a symbolic broken ring.
 for(const x of [-3.2,3.2]){mesh(box,stone,x,2.7,32,1.1,5.4,1.3);mesh(box,gold,x,5.3,32,1.35,.18,1.5);}mesh(box,stone,0,5.65,32,7.5,.6,1.4);
 const ring=new T.TorusGeometry(2.05,.12,8,40,Math.PI*1.76);geometries.add(ring);mesh(ring,blue,0,3,32);mesh(cylinder,stone,0,.06,30,5,.12,5).castShadow=false;
 // Civic services occupy distinct local anchors, with real restoration stages.
 const at=id=>layout.points.find(p=>p.id===id),centre=layout.centre;
 mesh(cylinder,stone,centre.x,.35,centre.z-6,2,.7,2);mesh(cylinder,mat('#559ea4',.2,.2),centre.x,.72,centre.z-6,1.7,.04,1.7);
 for(const [id,roof] of [['atelier',wood],['refuge',stone]]){const p=at(id);for(const side of [-1,1])for(const back of [2,6])mesh(box,stone,p.x+side*3,1.7,p.z-back,.3,3.4,.3);mesh(box,roof,p.x,3.5,p.z-4,7,.25,5);mesh(box,wood,p.x,.8,p.z-2,2,.14,.8);for(const side of [-1,1])mesh(box,dark,p.x+side*.8,.4,p.z-2,.1,.8,.6);}
 for(const side of [-1,1]){mesh(box,wood,centre.x+side*12,.5,centre.z+8,2,.12,.65);mesh(box,wood,centre.x+side*12,.94,centre.z+7.7,2,.6,.08);}
 const stages=[];for(let i=0;i<3;i++){const g=new T.Group();root.add(g);const x=layout.garden.x+(i-1)*4,z=layout.garden.z-3;for(const [dx,dz,w,d] of [[0,-1.3,3.7,.2],[0,1.3,3.7,.2],[-1.8,0,.2,2.6],[1.8,0,.2,2.6]]){const m=mesh(box,stone,x+dx,.25,z+dz,w,.5,d);g.attach(m);}stages.push(g);}
 const monument=createLandmark(zone);monument.root.position.set(layout.landmark.x,0,layout.landmark.z);root.add(monument.root);
 const court=new T.CircleGeometry(27,64);court.rotateX(-Math.PI/2);const cp=court.attributes.position,cu=court.attributes.uv;for(let i=0;i<cp.count;i++)cu.setXY(i,(cp.getX(i)+layout.landmark.x)/3,(cp.getZ(i)+layout.landmark.z)/3);geometries.add(court);mesh(court,paving,layout.landmark.x,.012,layout.landmark.z).castShadow=false;
 road([[50,-49],[50,-52]],5);
 const hills=mat(new T.Color(c.stone).lerp(new T.Color(GROUND_STYLE[zone].grass),.65)),hillGeometry=new T.SphereGeometry(1,24,16);geometries.add(hillGeometry);for(let i=0;i<18;i++){const a=i/18*Math.PI*2,x=Math.sin(a)*220,z=Math.cos(a)*220;mesh(hillGeometry,hills,x,-14,z,70,18+(i+c.seed)%5*5,60).castShadow=false;}
 // Reuse the authored regional GLB family. Three batches per architecture level.
 const wallTexture=new T.TextureLoader().load('/world/paris/textures/plastered_wall_02_Diffuse.jpg');wallTexture.colorSpace=T.SRGBColorSpace;wallTexture.wrapS=wallTexture.wrapT=T.RepeatWrapping;textures.add(wallTexture);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const ready=(async()=>{for(const level of [1,2,3]){const a=await loader.loadAsync(`/world/districts/${zone}-${level}-lod.glb`);assets.push(a);if(dead)continue;a.scene.updateMatrixWorld(true);const sites=layout.buildings.filter(b=>b.level===level);a.scene.traverse(o=>{if(!o.isMesh)return;const m=o.material.clone();materials.add(m);if(/Masonry|Dressed stone/.test(m.name)){m.map=wallTexture;m.roughness=.92;}occlusion?.apply(m);const inst=new T.InstancedMesh(o.geometry,m,sites.length),dummy=new T.Object3D();sites.forEach((b,i)=>{dummy.position.set(b.x,0,b.z);dummy.rotation.y=b.angle;dummy.scale.set(b.width/12,1,b.depth/10);dummy.updateMatrix();inst.setMatrixAt(i,new T.Matrix4().multiplyMatrices(dummy.matrix,o.matrixWorld));});inst.computeBoundingSphere();inst.castShadow=quality!=='light';inst.receiveShadow=true;root.add(inst);instances.push(inst);});}})().catch(e=>{if(!dead)onError('Quartier '+c.name+' : '+e.message);throw e;});
 const flora=createFlora(zone,c.seed,occlusion),rng=randomFor(c.seed),treeGroups=new Map();
 const roadSamples=layout.roads.flatMap(points=>new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z))).getPoints(96));
 function plants(parent,type,x,z,size,angle){flora.plant(type,x,0,z,size,angle,parent);}
 for(let i=0;i<230;i++){const x=-100+rng()*195,z=-112+rng()*145;if(roadSamples.some(p=>Math.hypot(p.x-x,p.z-z)<4)||Math.hypot(x-layout.landmark.x,z-layout.landmark.z)<30||Math.hypot(x-layout.encounter.x,z-layout.encounter.z)<15||layout.buildings.some(b=>Math.abs(x-b.x)<8&&Math.abs(z-b.z)<7)||layout.points.some(p=>Math.hypot(x-p.x,z-p.z)<7))continue;const key=Math.floor(x/32)+':'+Math.floor(z/32);if(!treeGroups.has(key)){const g=new T.Group();root.add(g);treeGroups.set(key,g);}plants(treeGroups.get(key),i%3?c.tree:'Shrub',x,z,.4+rng()*.48,rng()*6.28);}
 stages.forEach((g,i)=>{for(let k=0;k<8;k++)plants(g,'Shrub',layout.garden.x+(i-1)*4+(k%4-.5)*.7-1,layout.garden.z-3+Math.floor(k/4)*.8-.4,.2,k);});flora.finish();
 return{root,memory,ready,update(s,vision,p,time){flora.tick(time);stages.forEach((g,i)=>g.visible=(s.regions?.[zone]?.restored||0)>i);monument.update(0);},dispose(){dead=true;root.removeFromParent();flora.dispose();monument.dispose();instances.forEach(m=>m.dispose());ready.catch(()=>{}).finally(()=>{for(const a of assets)a.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t?.dispose());});}};
}
