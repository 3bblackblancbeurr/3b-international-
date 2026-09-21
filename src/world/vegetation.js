import * as THREE from 'three';
import {roadDistance,randomFor} from './terrain.js';
import {obstacleDistance} from './collision.js';
import {GROUND_STYLE} from './natural-ground.js';

export function plantingAllowed(field,x,z,pad=0){
 if(Math.hypot(x-field.lake.x,z-field.lake.z)<field.lake.r+4+pad||roadDistance(x,z,field.roads)<1.1+pad)return false;
 if(field.squares.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+pad))return false;
 if([...(field.paris||[]),...field.civic,...field.buildings].some(b=>obstacleDistance({x,z},b)<1.2+pad))return false;
 if(field.anchors.some(a=>Math.hypot(x-a.x,z-a.z)<(a.type==='camp'?24:a.type==='portal'?7:4.5)+pad))return false;
 if(field.fields.some(f=>!['forest','olive','orchard'].includes(f.kind)&&obstacleDistance({x,z},{...f,width:f.w,depth:f.h})<pad))return false;
 return true;
}

export function meadowPlacements(field,region){
 const rng=randomFor(field.biome.seed+703),style=GROUND_STYLE[region]||GROUND_STYLE.hub,points=[];
 for(let i=0;i<style.count*6&&points.length<style.count;i++){
  const range=i%3===0?field.radius*2:250,x=(rng()-.5)*range,z=(rng()-.5)*range;
  const patch=Math.sin(x*.13+Math.sin(z*.08)*2)+Math.cos(z*.16+x*.035);
  if(patch<-.35+style.dry*.8||Math.hypot(x,z)>field.radius||!plantingAllowed(field,x,z,.2))continue;
  const y=field.height(x,z);if(y>13||y<-.4)continue;
  const scale=.52+rng()*.78;points.push({x,y,z,scale,width:.72+rng()*.52,height:.78+rng()*.52,rotation:rng()*Math.PI*2,tint:.78+rng()*.34});
 }
 return points;
}

function edgeGrowthPlacements(field,region){
 const rng=randomFor(field.biome.seed+1703),points=[];
 for(const road of field.roads||[]){
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len,steps=Math.max(1,Math.floor(len/9));
   for(let step=1;step<steps;step++){
    if(rng()<.34)continue;
    const t=step/steps,baseX=a.x+dx*t,baseZ=a.z+dz*t;
    for(const side of [-1,1]){
     if(rng()<.38)continue;
     const offset=(road.width||4)/2+.45+rng()*1.25,x=baseX+nx*offset*side,z=baseZ+nz*offset*side;
     if(Math.hypot(x-field.lake.x,z-field.lake.z)<field.lake.r+2.4||field.buildings.some(b=>obstacleDistance({x,z},b)<1.4))continue;
     const y=field.height(x,z);if(y>13||y<-.35)continue;
     points.push({x,y,z,scale:.28+rng()*.42,width:.55+rng()*.42,height:.75+rng()*.72,rotation:rng()*Math.PI*2,tint:.68+rng()*.28,edge:true});
    }
   }
  }
 }
 return points.slice(0,region==='hub'?1600:1100);
}

export function addMeadow(field,root,owned,region){
 const style=GROUND_STYLE[region]||GROUND_STYLE.hub,{material,time}=createMeadowMaterial(style.grass),geometry=createMeadowGeometry(),cells=new Map(),dummy=new THREE.Object3D(),tint=new THREE.Color(),baseTint=new THREE.Color(style.grass);owned.push(material,geometry);
 for(const p of [...meadowPlacements(field,region),...edgeGrowthPlacements(field,region)]){const key=Math.floor((p.x+field.radius)/(field.radius/2))+':'+Math.floor((p.z+field.radius)/(field.radius/2));if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
 const meshes=[];
 for(const points of cells.values()){
  const m=new THREE.InstancedMesh(geometry,material,points.length);m.name='meadow-patch';
  points.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(p.scale*p.width,p.scale*p.height,p.scale*p.width);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);tint.copy(baseTint).offsetHSL((p.tint-.85)*.035,(p.edge?.05:0),p.tint-.88);m.setColorAt(i,tint);});
  m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;m.computeBoundingSphere();m.boundingSphere.radius+=.5;m.receiveShadow=true;root.add(m);owned.push(m);meshes.push({mesh:m,count:points.length});
 }
 return {tick(t,position){time.value=t;if(position)for(const {mesh} of meshes){const b=mesh.boundingSphere;mesh.visible=Math.hypot(position.x-b.center.x,position.z-b.center.z)<76+b.radius;}},setQuality(mode){for(const {mesh,count} of meshes)mesh.count=Math.round(count*(mode==='fluid'?.48:mode==='detail'?1:.82));},meshes};
}

export function createMeadowMaterial(color){
 const material=new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,vertexColors:true}),time={value:0};
 material.onBeforeCompile=shader=>{shader.uniforms.meadowTime=time;shader.vertexShader='uniform float meadowTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
   vec3 grassWorld=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
   float visibility=1.-smoothstep(42.,76.,distance(cameraPosition,grassWorld));
   float bend=position.y*position.y;
   float gust=sin(meadowTime*1.5+instanceMatrix[3].x*.3+instanceMatrix[3].z*.21);
   transformed.x+=gust*bend*.24;
   transformed.z+=cos(meadowTime+instanceMatrix[3].z*.35)*bend*.13;
   transformed*=visibility;
  #endif`);};
 material.customProgramCacheKey=()=> '3b-meadow-clumps-2';
 return {material,time};
}
export function createMeadowGeometry(){
 const vertices=[],colors=[],indices=[];
 for(let blade=0;blade<5;blade++){
  const a=blade*2.399,dx=Math.cos(a),dz=Math.sin(a),start=vertices.length/3;
  for(let row=0;row<3;row++){
   const t=row/2,w=(1-t)*(.038+blade*.005),h=t*(.42+blade*.075),bend=t*t*.23;
   for(const side of [-1,1]){vertices.push(dx*(bend+.07)-dz*w*side,h,dz*(bend+.07)+dx*w*side);colors.push(.48+t*.48,.57+t*.41,.34+t*.47);}
   if(row<2){const i=start+row*2;indices.push(i,i+2,i+1,i+1,i+2,i+3);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
