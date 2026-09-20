import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';

// One background draw: continuous horizon, layered cloud banks, controlled
// night depth and weather variation without volumetric ray marching.
export function createWorldSky(renderer,onEnvironment){
 let stopped=false,photograph=null,environment=null;
 const uniforms={
  skyPhoto:{value:null},photoReady:{value:0},
  inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},
  zenith:{value:new THREE.Color('#628fac')},horizon:{value:new THREE.Color('#d6ddcd')},
  time:{value:0},daylight:{value:1},cloudiness:{value:.28},storminess:{value:0},mistiness:{value:0},
 };
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,vertexShader:'varying vec2 skyUV;void main(){skyUV=uv;gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:`
  varying vec2 skyUV;uniform mat4 inverseProjection,cameraWorld;uniform vec3 zenith,horizon;uniform float time,daylight,cloudiness,storminess,mistiness;uniform sampler2D skyPhoto;uniform float photoReady;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float cloud(vec2 p){return noise(p)*.50+noise(p*2.07)*.27+noise(p*4.13)*.15+noise(p*8.31)*.08;}
  void main(){
   vec4 view=inverseProjection*vec4(skyUV*2.-1.,1.,1.);vec3 ray=normalize((cameraWorld*vec4(view.xyz,0.)).xyz);float up=max(0.,ray.y),day=clamp(daylight,0.,1.);
   vec3 dayBase=mix(horizon,zenith,pow(up,.48));
   vec3 nightBase=mix(vec3(.018,.028,.052),vec3(.008,.015,.032),pow(up,.42));
   vec3 color=mix(nightBase,dayBase,day);
   vec2 p=ray.xz/(up+.28)*2.8+vec2(time*.0015,time*.00035);
   float n=cloud(p),threshold=mix(.66,.43,cloudiness),cover=smoothstep(threshold,threshold+.16,n)*smoothstep(.012,.18,up);
   vec3 cloudDay=mix(vec3(.58,.69,.78),vec3(1.,.97,.90),smoothstep(.48,.82,n));
   vec3 cloudNight=mix(vec3(.035,.055,.082),vec3(.11,.14,.17),smoothstep(.5,.82,n));
   vec3 cloudColor=mix(cloudNight,cloudDay,day)*(1.-storminess*.42);
   color=mix(color,cloudColor,cover*mix(.58,.96,cloudiness));
   vec3 sun=normalize(vec3(-38.,54.,35.));float light=max(0.,dot(ray,sun));
   color+=vec3(.34,.24,.11)*pow(light,32.)*day+vec3(.65,.56,.38)*pow(light,950.)*day;
   float horizonMist=exp(-max(ray.y,0.)*15.)*mistiness;
   color=mix(color,mix(vec3(.08,.13,.17),horizon*.55,day),horizonMist*.48);
   if(photoReady>.5){vec2 uv=vec2(atan(ray.z,ray.x)/6.2831853+.5,asin(clamp(ray.y,-1.,1.))/3.14159265+.5);vec3 photo=texture2D(skyPhoto,uv).rgb;color=mix(color,photo*.82,smoothstep(-.035,.12,ray.y)*day*(1.-cloudiness*.65));}
   float starCell=hash(floor((ray.xz/(abs(ray.y)+.23))*155.));
   float stars=step(.9974,starCell)*(1.-smoothstep(.05,.33,day))*(1.-cloudiness)*smoothstep(.08,.42,up);
   color+=vec3(.64,.78,1.)*stars*(.45+.55*hash(floor(ray.xz*390.)));
   color*=1.-storminess*.17;
   gl_FragColor=vec4(max(color,0.),1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const geometry=new THREE.PlaneGeometry(2,2),root=new THREE.Mesh(geometry,material);root.renderOrder=-1000;root.frustumCulled=false;
 if(renderer)new HDRLoader().load('/world/environment/kloppenheim_06_1k.hdr',texture=>{
  if(stopped){texture.dispose();return;}photograph=texture;texture.mapping=THREE.EquirectangularReflectionMapping;uniforms.skyPhoto.value=texture;uniforms.photoReady.value=uniforms.photoReady.regional?0:1;
  const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromEquirectangular(texture);pmrem.dispose();onEnvironment?.(environment.texture);
 },undefined,()=>{/* The procedural sky remains available offline. */});
 return{
  root,
  get environment(){return environment?.texture;},
  setRegion(biome){uniforms.photoReady.regional=!!biome.district;uniforms.photoReady.value=photograph&&!biome.district?1:0;uniforms.horizon.value.set(biome.haze).lerp(new THREE.Color('#adcfe9'),biome.district?.15:.78);uniforms.zenith.value.set(biome.sky).lerp(new THREE.Color('#2369bb'),biome.district?.15:.85);},
  setAtmosphere({daylight=1,weather='clear'}={}){uniforms.daylight.value=Math.max(0,Math.min(1,daylight));uniforms.cloudiness.value=({clear:.22,rain:.72,heavy_rain:.88,fog:.74,snow:.66,storm:.98})[weather]??.28;uniforms.storminess.value=weather==='storm'?1:weather==='heavy_rain'?.46:weather==='rain'?.18:0;uniforms.mistiness.value=weather==='fog'?1:weather==='heavy_rain'?.52:weather==='rain'?.25:weather==='snow'?.34:.10;},
  update(camera,time){camera.updateMatrixWorld();uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.time.value=time;},
  dispose(){stopped=true;photograph?.dispose();environment?.dispose();material.dispose();geometry.dispose();}
 };
}
