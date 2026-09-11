import * as THREE from 'three';

// One background draw: a continuous horizon, broad cloud banks and a soft sun.
// No texture download, volumetric ray march or per-frame allocations.
export function createWorldSky(){
 const uniforms={inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},zenith:{value:new THREE.Color('#628fac')},horizon:{value:new THREE.Color('#d6ddcd')},time:{value:0}};
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,vertexShader:'varying vec2 skyUV;void main(){skyUV=uv;gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:`
  varying vec2 skyUV;uniform mat4 inverseProjection,cameraWorld;uniform vec3 zenith,horizon;uniform float time;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float cloud(vec2 p){return noise(p)*.55+noise(p*2.07)*.27+noise(p*4.13)*.13+noise(p*8.31)*.05;}
  void main(){vec4 view=inverseProjection*vec4(skyUV*2.-1.,1.,1.);vec3 ray=normalize((cameraWorld*vec4(view.xyz,0.)).xyz);float up=max(0.,ray.y);vec3 color=mix(horizon,zenith,pow(up,.48));
   vec2 p=ray.xz/(up+.28)*2.8+vec2(time*.0015,0.);float n=cloud(p),cover=smoothstep(.50,.75,n)*smoothstep(.015,.16,up);vec3 white=mix(vec3(.69,.76,.77),vec3(.96,.95,.87),smoothstep(.48,.8,n));color=mix(color,white,cover*.8);
   vec3 sun=normalize(vec3(-24.,65.,24.));float light=max(0.,dot(ray,sun));color+=vec3(.34,.24,.11)*pow(light,32.)+vec3(.65,.56,.38)*pow(light,950.);
   gl_FragColor=vec4(color,1.);
   #include <colorspace_fragment>
  }`});
 const geometry=new THREE.PlaneGeometry(2,2),root=new THREE.Mesh(geometry,material);root.renderOrder=-1000;root.frustumCulled=false;
 return{root,setRegion(biome){uniforms.horizon.value.set(biome.haze).lerp(new THREE.Color('#adcfe9'),.78);uniforms.zenith.value.set(biome.sky).lerp(new THREE.Color('#3479c3'),.85);},update(camera,time){camera.updateMatrixWorld();uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.time.value=time;},dispose(){material.dispose();geometry.dispose();}};
}
