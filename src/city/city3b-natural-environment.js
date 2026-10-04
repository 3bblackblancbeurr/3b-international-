import * as THREE from 'three';
import {createCityPremiumWater} from './city3b-premium-water.js';
const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}float clouds(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.07)*.15;}`;
export function cityRidgeGeometry(half,layer=0){
 const geometry=new THREE.PlaneGeometry(half*5,half*.52,160,10),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),v=(p.getY(i)/ (half*.52)+.5);const ridge=half*(.08+.10*Math.pow(Math.sin(x/half*3.7+layer*.8),2)+.055*Math.sin(x/half*8.4+layer)*Math.sin(x/half*5.1));p.setXYZ(i,x,Math.max(0,ridge)*v,-half*(2.6+layer*.7)+(1-v)*half*.35+Math.sin(x/half*2.2+layer)*half*.05*v);}
 geometry.computeVertexNormals();return geometry;
}
// One atmosphere supplies the sky and the fallback when scene reflections are reduced.
const atmosphere=`vec3 atmosphere(vec3 d,float seconds){
 float h=max(d.y,0.);vec3 color=mix(vec3(.70,.80,.87),vec3(.12,.38,.72),pow(h,.45));
 vec3 sun=normalize(vec3(-100.,170.,80.));float angle=max(dot(d,sun),0.);
 color+=vec3(.28,.22,.12)*pow(angle,32.);color=mix(color,vec3(1.,.96,.86),smoothstep(.9997,.99994,angle));
 vec2 uv=d.xz/max(.12,d.y)*.55+vec2(seconds*.002,0.);
 float field=clouds(uv),fine=noise(uv*8.11)*.035;
 float cloud=smoothstep(.48,.70,field+fine)*smoothstep(.015,.12,d.y);
 float lighting=clouds(uv+vec2(-.06,.04))-field;
 vec3 cloudColor=mix(vec3(.55,.64,.72),vec3(.97,.98,1.),clamp(.55+lighting*3.+field*.35,0.,1.));
 color=mix(color,cloudColor,cloud*.92);
 float high=noise(uv*.4+vec2(seconds*.0007,2.));color=mix(color,vec3(.85,.90,.97),smoothstep(.67,.86,high)*.18*h);
 return color;
}`;
export function createCityNaturalEnvironment({mobile=false}={}){
 const time={value:0},night={value:0},extent={value:500},snow={value:0};
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTime:time,uNight:night},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float uTime,uNight;varying vec3 direction;${noise}
 ${atmosphere}
 void main(){vec3 d=normalize(direction);vec3 color=atmosphere(d,uTime);color=mix(color,color*vec3(.24,.33,.51),uNight);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(2600,32,16),skyMaterial);sky.frustumCulled=false;
 const waterSystem=createCityPremiumWater({noise,atmosphere,time,night,extent,mobile}),water=waterSystem.material;
 const grass=new THREE.MeshStandardMaterial({color:0x648955,roughness:1,metalness:0});
 grass.onBeforeCompile=shader=>{
  shader.uniforms.uSnow=snow;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 grassWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ngrassWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSnow;\nvarying vec3 grassWorld;\n'+noise).replace('#include <color_fragment>',`#include <color_fragment>\nfloat broad=clouds(grassWorld.xz*.06),grain=noise(grassWorld.xz*2.);float detail=1.-smoothstep(.4,2.,max(length(dFdx(grassWorld.xz)),length(dFdy(grassWorld.xz))));vec3 meadow=mix(vec3(.76,.88,.64),vec3(1.06,1.02,.85),broad);float earth=smoothstep(.60,.80,noise(grassWorld.xz*.14+vec2(7.)));meadow=mix(meadow,vec3(.94,.84,.65),earth*.22);diffuseColor.rgb*=meadow*(1.+(grain-.5)*.12*detail);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.85,.89)*(.95+grain*.05),uSnow);`);
 };
 grass.customProgramCacheKey=()=> 'city-grass-natural-v2';
 return {sky,grass,water,waterSystem,time,night,extent,update(seconds,camera,reduced=false){time.value=reduced?0:seconds;sky.position.copy(camera.position);},configure(half,isNight,isSnow=false){snow.value=isSnow?1:0;extent.value=half;night.value=isNight?1:0;},dispose(){sky.geometry.dispose();skyMaterial.dispose();grass.dispose();waterSystem.dispose();}};
}
