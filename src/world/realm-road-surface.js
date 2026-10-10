import * as THREE from 'three';
import {worldRealmArt} from '../design-system/tokens.js';

export function createRealmRoadMaterial(region){
 const palette=worldRealmArt[region]||worldRealmArt.france;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const uniforms={roadStone:{value:new THREE.Color(palette.stone).lerp(new THREE.Color(palette.ground),.27)},roadEarth:{value:new THREE.Color(palette.ground).lerp(new THREE.Color(palette.stone),.43)}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='attribute vec2 roadProfile;varying vec2 roadSurfaceProfile;varying vec2 roadMetricUv;varying vec2 roadWorldXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nroadSurfaceProfile=roadProfile;roadMetricUv=uv;roadWorldXZ=(modelMatrix*vec4(position,1.)).xz;');
  shader.fragmentShader=`varying vec2 roadSurfaceProfile;varying vec2 roadMetricUv;varying vec2 roadWorldXZ;uniform vec3 roadStone;uniform vec3 roadEarth;
   float roadHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float roadNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(roadHash(i),roadHash(i+vec2(1,0)),f.x),mix(roadHash(i+vec2(0,1)),roadHash(i+vec2(1,1)),f.x),f.y);}
  `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float roadMacro=roadNoise(roadWorldXZ*.18),roadGrain=roadNoise(roadWorldXZ*2.8);
   vec2 pave=roadMetricUv/vec2(.72,1.08);pave.x+=mod(floor(pave.y),2.)*.5;
   vec2 cell=fract(pave);float jointDistance=min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y));
   float jointWidth=max(.018,fwidth(jointDistance)*.65);
   float pavingJoint=1.-smoothstep(.012,.012+jointWidth,jointDistance);
   float slab=roadHash(floor(pave));
   vec3 mineral=mix(roadEarth,roadStone,roadSurfaceProfile.y)*( .88+roadMacro*.12+(roadGrain-.5)*.035 );
   mineral*=1.+roadSurfaceProfile.y*((slab-.5)*.12-pavingJoint*.13);
   float shoulder=smoothstep(.80,1.22,abs(roadSurfaceProfile.x)+(roadMacro-.5)*.10);
   diffuseColor.rgb=mix(mineral,diffuseColor.rgb,shoulder);
   float roadRelief=(roadMacro-.5)*.008+(roadGrain-.5)*.003-pavingJoint*.006*roadSurfaceProfile.y;
  `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.98,.87,roadSurfaceProfile.y)*(1.-pavingJoint*.04);').replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 roadDx=dFdx(-vViewPosition),roadDy=dFdy(-vViewPosition);
   vec3 roadSigmaX=cross(roadDy,normal),roadSigmaY=cross(normal,roadDx);
   float roadDet=dot(roadDx,roadSigmaX);
   if(abs(roadDet)>.00000001)normal=normalize(abs(roadDet)*normal-sign(roadDet)*(dFdx(roadRelief)*roadSigmaX+dFdy(roadRelief)*roadSigmaY));
  `);
 };
 material.customProgramCacheKey=()=> '3b-realm-road-master-1';return material;
}

/** All country strips, village streets and walks share one opaque draw.
 * Shoulders sample the existing terrain and carry its continuous vertex tint. */
export function createRealmRoadGeometry(field,segments,sites){
 const p=[],indices=[],uv=[],color=[],profiles=[],low=new THREE.Color(field.biome.low),high=new THREE.Color(field.biome.high),tint=new THREE.Color();
 function strip(a,b,width,paving=0,lift=.065){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.01)return;
  const steps=Math.max(1,Math.ceil(length/10)),start=p.length/3,half=width/2;
  for(let i=0;i<=steps;i++){
   const t=i/steps;
   for(const across of [-1.22,-.88,.88,1.22]){
    const x=a.x+dx*t-dz/length*half*across,z=a.z+dz*t+dx/length*half*across;
    p.push(x,field.height(x,z)+lift,z);uv.push(half*across,t*length);profiles.push(across,paving);
    const m=.48+.12*Math.sin(x*.017)*Math.cos(z*.019)+.06*Math.sin(x*.13-z*.08);tint.copy(low).lerp(high,Math.max(0,Math.min(1,m)));color.push(tint.r,tint.g,tint.b);
   }
   if(i){const n=start+i*4;for(let lane=0;lane<3;lane++)indices.push(n-4+lane,n-3+lane,n+lane,n-3+lane,n+1+lane,n+lane);}
  }
 }
 for(const segment of segments)strip(segment.a,segment.b,segment.road.width);
 for(const site of sites){
  // A settlement's real circulation continues beyond its arrival relay.
  // Two side walks connect the facades and mission positions to that street.
  strip({x:site.x,z:site.z-51},{x:site.x,z:site.z+54},18,1,.085);
  for(const side of [-1,1]){
   strip({x:site.x+side*21,z:site.z-49},{x:site.x+side*21,z:site.z+47},3.4,1,.085);
   for(const z of [-30,-8,28])strip({x:site.x+side*8,z:site.z+z},{x:site.x+side*22,z:site.z+z},2.8,1,.105);
  }
 }
 if(!p.length)return null;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));geometry.setAttribute('roadProfile',new THREE.Float32BufferAttribute(profiles,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
