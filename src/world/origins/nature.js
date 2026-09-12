import * as T from 'three';
import {createMeadowGeometry,createMeadowMaterial} from '../vegetation.js';
import {randomFor,segmentDistance} from '../terrain.js';
import {BUILDINGS,ROOMS,ROADS,EIFFEL_SITE} from './data.js';
import {inside} from './space.js';
export function createGroundCover(root,zone,quality){
 const rng=randomFor(zone==='france'?381:187),cells=new Map(),geo=createMeadowGeometry(),{material,time}=createMeadowMaterial('#829467'),dummy=new T.Object3D(),color=new T.Color(),meshes=[];
 const roads=ROADS.map(points=>new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z))).getPoints(points.length*18).map(p=>({x:p.x,z:p.z})));
 const allowed=(x,z)=>zone==='sanctuary'?Math.hypot(x,z)>40:!BUILDINGS.some(b=>inside({x,z},{...b,w:b.width,d:b.depth,angle:b.angle},2))&&!ROOMS.some(b=>inside({x,z},{...b},1.5))&&Math.hypot(x-EIFFEL_SITE.x,z-EIFFEL_SITE.z)>21&&Math.hypot(x,z+14)>16&&!(Math.abs(x)<20&&Math.abs(z+34)<4)&&roads.every(r=>r.slice(1).every((b,i)=>segmentDistance(x,z,r[i],b)>3.8));
 for(let i=0;i<13000;i++){const x=-104+rng()*170,z=-142+rng()*180;if(!allowed(x,z)||Math.sin(x*.3)+Math.cos(z*.22)<-.3)continue;const key=Math.floor(x/24)+':'+Math.floor(z/24);if(!cells.has(key))cells.set(key,[]);cells.get(key).push({x,z,scale:.28+rng()*.5,angle:rng()*6.28,tint:.85+rng()*.3});}
 for(const points of cells.values()){const m=new T.InstancedMesh(geo,material,points.length);points.forEach((p,i)=>{dummy.position.set(p.x,-.025,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);color.setRGB(p.tint,p.tint,p.tint);m.setColorAt(i,color);});m.computeBoundingSphere();m.receiveShadow=true;m.count=Math.ceil(points.length*(quality==='light'?.5:1));root.add(m);meshes.push(m);}
 const rockGeo=new T.IcosahedronGeometry(1,0),rockMat=new T.MeshStandardMaterial({color:'#9a9587',roughness:1}),rocks=new T.InstancedMesh(rockGeo,rockMat,180);let count=0;
 for(let i=0;i<600&&count<180;i++){const x=-100+rng()*165,z=-140+rng()*178;if(!allowed(x,z))continue;const r=.06+rng()*.13;dummy.position.set(x,-r*.22,z);dummy.rotation.set(rng(),rng()*6.28,rng());dummy.scale.set(r,r*.65,r*(.6+rng()*.7));dummy.updateMatrix();rocks.setMatrixAt(count++,dummy.matrix);}rocks.count=count;rocks.computeBoundingSphere();rocks.receiveShadow=true;root.add(rocks);
 return {update(t,p){time.value=t;for(const m of meshes){const b=m.boundingSphere;m.visible=Math.hypot(p.x-b.center.x,p.z-b.center.z)<65+b.radius;}},dispose(){for(const m of meshes){m.removeFromParent();m.dispose();}rocks.removeFromParent();rocks.dispose();geo.dispose();material.dispose();rockGeo.dispose();rockMat.dispose();}};
}
