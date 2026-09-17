import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';

export const skyCloudOctaves=(memory=4,cores=4)=>Number(memory)<=3||Number(cores)<=4?2:4;

// One background draw: a continuous horizon, broad cloud banks and a soft sun.
// No texture download beyond the existing 1K HDR, volumetric ray march or extra pass.
export function createWorldSky(renderer,onEnvironment){
 let stopped=false,photograph=null,environment=null;
 const memory=typeof navigator!=='undefined'?Number(navigator.deviceMemory)||4:4,cores=typeof navigator!=='undefined'?Number(navigator.hardwareConcurrency)||4:4,octaves=skyCloudOctaves(memory,cores);
 const uniforms={skyPhoto:{value:null},photoReady:{value:0},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},zenith:{value:new THREE.Color('#628fac')},horizon:{value:new THREE.Color('#d6ddcd')},time:{value:0}};
 const cloudFunction=octaves===2?'float cloud(vec2 p){return noise(p)*.68+noise(p*2.07)*.32;}':'float cloud(vec2 p){return noise(p)*.55+noise(p*2.07)*.27+noise(p*4.13)*.13+noise(p*8.31)*.05;}';
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,vertexShader:'varying vec2 skyUV;void main(){skyUV=uv;gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:`
  varying vec2 skyUV;uniform mat4 inverseProjection,cameraWorld;uniform vec3 zenith,horizon;uniform float time;uniform sampler2D skyPhoto;uniform float photoReady;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  ${cloudFunction}
  void main(){
   vec4 view=inverseProjection*vec4(skyUV*2.-1.,1.,1.);vec3 ray=normalize((cameraWorld*vec4(view.xyz,0.)).xyz);float up=max(0.,ray.y);
   vec3 color=mix(horizon,zenith,pow(up,.52));
   float horizonBand=1.-smoothstep(.015,.25,abs(ray.y));
   color=mix(color,horizon*1.055,horizonBand*.34);
   vec2 p=ray.xz/(up+.28)*2.8+vec2(time*.00125,0.);float n=cloud(p),cover=smoothstep(.48,.68,n)*smoothstep(.015,.16,up);
   vec3 white=mix(vec3(.57,.68,.79),vec3(1.,.965,.88),smoothstep(.48,.8,n));color=mix(color,white,cover*.82);
   vec3 sun=normalize(vec3(-38.,54.,35.));float light=max(0.,dot(ray,sun));
   color+=vec3(.10,.072,.032)*pow(light,7.)+vec3(.31,.22,.10)*pow(light,32.)+vec3(.62,.52,.34)*pow(light,950.);
   if(photoReady>.5){
    vec2 uv=vec2(atan(ray.z,ray.x)/6.2831853+.5,asin(clamp(ray.y,-1.,1.))/3.14159265+.5);vec3 photo=texture2D(skyPhoto,uv).rgb;
    photo=mix(photo,photo*vec3(.94,.98,1.04),smoothstep(.15,.8,up));
    vec3 graded=mix(photo*.80,color,0.20+horizonBand*.18);
    color=mix(color,graded,smoothstep(-.035,.12,ray.y));
   }
   color=mix(color,color*vec3(.92,.96,1.03),smoothstep(.38,1.,up)*.22);
   gl_FragColor=vec4(color,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const geometry=new THREE.PlaneGeometry(2,2),root=new THREE.Mesh(geometry,material);root.renderOrder=-1000;root.frustumCulled=false;
 if(renderer)new HDRLoader().load('/world/environment/kloppenheim_06_1k.hdr',texture=>{
  if(stopped){texture.dispose();return;}photograph=texture;texture.mapping=THREE.EquirectangularReflectionMapping;uniforms.skyPhoto.value=texture;uniforms.photoReady.value=1;
  const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromEquirectangular(texture);pmrem.dispose();onEnvironment?.(environment.texture);
 },undefined,()=>{/* The cinematic procedural sky remains available offline. */});
 return{root,get environment(){return environment?.texture;},setRegion(biome){uniforms.horizon.value.set(biome.haze).lerp(new THREE.Color('#b8cee0'),.70);uniforms.zenith.value.set(biome.sky).lerp(new THREE.Color('#245d98'),.77);},update(camera,time){camera.updateMatrixWorld();uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.time.value=time;},dispose(){stopped=true;photograph?.dispose();environment?.dispose();material.dispose();geometry.dispose();}};
}
