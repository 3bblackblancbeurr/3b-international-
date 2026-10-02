import {worldArtMaterials} from '../design-system/tokens.js';
import * as THREE from 'three';
import {architecturalBudget,REALM_ART} from './art-direction.js';

// A pair of bounded draws gives the environment scale: airborne motes and birds.
// Vertices move on the GPU; no per-frame allocations, textures or point lights.
export function createAmbientLife(region='hub',{reducedMotion=false}={}){
 const root=new THREE.Group();root.name='Atmosphère vivante · '+region;
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(160*3),seeds=new Float32Array(160);
 let seed=region.split('').reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),71)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<160;i++){positions.set([(random()-.5)*82,random()*22,(random()-.5)*82],i*3);seeds[i]=random();}
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const uniforms={time:{value:0},day:{value:1},wind:{value:.2},origin:{value:new THREE.Vector3()},tint:{value:new THREE.Color(REALM_ART[region]?.sun||worldArtMaterials.dust)}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms,
  vertexShader:`attribute float seed;uniform float time,day,wind;uniform vec3 origin;varying float alpha;
   void main(){vec3 p=position;p.x=mod(p.x+time*(.18+wind*.5)+41.,82.)-41.;p.y+=sin(time*.35+seed*20.)*.8;
   p+=origin;vec4 view=modelViewMatrix*vec4(p,1.);float distanceFade=1.-smoothstep(20.,70.,length(view.xyz));
   alpha=distanceFade*(.08+(1.-day)*.32)*(.5+.5*sin(seed*34.+time*.7));
   gl_PointSize=clamp((1.2+seed)*110./max(1.,-view.z),1.,5.);gl_Position=projectionMatrix*view;}`,
  fragmentShader:`uniform vec3 tint;varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.12,1.,r))*alpha;if(a<.006)discard;gl_FragColor=vec4(tint,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`,});
 const motes=new THREE.Points(geometry,material);motes.frustumCulled=false;root.add(motes);
 const birdGeometry=new THREE.BufferGeometry();birdGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-1.6,.06,-.42,-.65,0,.38,0,0,0,.65,0,.38,1.6,.06,-.42],3));birdGeometry.computeVertexNormals();
 const birdMat=new THREE.MeshStandardMaterial({color:worldArtMaterials.bird,roughness:1,side:THREE.DoubleSide});
 birdMat.onBeforeCompile=shader=>{shader.uniforms.flightTime=uniforms.time;shader.vertexShader='uniform float flightTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(flightTime*3.4+instanceMatrix[3].x*.08)*abs(position.x)*.38;');};birdMat.customProgramCacheKey=()=> '3b-flock-wings-v1';
 const birds=new THREE.InstancedMesh(birdGeometry,birdMat,24),dummy=new THREE.Object3D();birds.castShadow=false;root.add(birds);
 const paths=Array.from({length:24},(_,i)=>({angle:random()*Math.PI*2,radius:52+random()*100,y:38+random()*27,speed:.012+random()*.014,scale:.45+random()*.35,phase:i*.27}));
 let lastTick=-Infinity,mode='auto',dead=false,currentWeather='clear';
 const setQuality=value=>{mode=value;const b=architecturalBudget(mode);geometry.setDrawRange(0,b.atmosphere);birds.count=b.birds;};setQuality(mode);
 return {root,setQuality,setAtmosphere({daylight=uniforms.day.value,wind=uniforms.wind.value,weather=currentWeather}={}){currentWeather=weather;uniforms.day.value=daylight;uniforms.wind.value=wind;birds.visible=!reducedMotion&&!['storm','heavy_rain'].includes(weather);motes.visible=!reducedMotion&&weather!=='storm';},
  tick(time,position){uniforms.time.value=reducedMotion?0:time;uniforms.origin.value.set(position.x,0,position.z);
   if(time-lastTick<.08)return;lastTick=time;
   for(let i=0;i<birds.count;i++){const p=paths[i],a=p.angle+(reducedMotion?0:time*p.speed);dummy.position.set(Math.cos(a)*p.radius,p.y+Math.sin(a*2+p.phase)*3,Math.sin(a)*p.radius);dummy.rotation.set(0,-a,Math.sin(a)*.08);dummy.scale.setScalar(p.scale);dummy.updateMatrix();birds.setMatrixAt(i,dummy.matrix);}birds.instanceMatrix.needsUpdate=true;birds.computeBoundingSphere();},
  dispose(){if(dead)return;dead=true;root.removeFromParent();birds.dispose();geometry.dispose();material.dispose();birdGeometry.dispose();birdMat.dispose();}};
}
