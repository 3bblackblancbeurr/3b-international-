import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export function cinematicPostBudget(mode='auto',memory=4,cores=4){
 const weak=(Number(memory)||4)<=3||(Number(cores)||4)<=4;
 if(mode==='fluid')return{enabled:true,scale:weak?.36:.46,flare:.42,grain:.32};
 if(mode==='detail')return{enabled:true,scale:1,flare:1,grain:.72};
 return{enabled:true,scale:weak?.48:.74,flare:weak?.5:.78,grain:weak?.38:.56};
}

const CinematicGradeShader={
 uniforms:{
  tDiffuse:{value:null},
  resolution:{value:new THREE.Vector2(1,1)},
  time:{value:0},
  intensity:{value:0},
  flare:{value:.75},
  grain:{value:.5},
  accent:{value:new THREE.Color('#58d1ff')},
  secondary:{value:new THREE.Color('#e0c486')},
 },
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float time,intensity,flare,grain;
  uniform vec3 accent,secondary;
  float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
  void main(){
   vec2 uv=vUv,px=1./max(resolution,vec2(1.));
   vec3 base=texture2D(tDiffuse,uv).rgb;
   vec3 left=texture2D(tDiffuse,uv-vec2(px.x*2.2,0.)).rgb;
   vec3 right=texture2D(tDiffuse,uv+vec2(px.x*2.2,0.)).rgb;
   float y=luma(base),shadow=1.-smoothstep(.12,.60,y),high=smoothstep(.52,.95,y);
   vec3 color=base;
   color+=accent*shadow*.025*intensity;
   color+=secondary*high*.018*intensity;
   color.r=mix(color.r,right.r,.012*intensity);
   color.b=mix(color.b,left.b,.012*intensity);
   float streak=(max(0.,luma(left)-.74)+max(0.,luma(right)-.74))*.5;
   color+=mix(accent,secondary,.58)*streak*.055*flare*intensity;
   vec2 centered=uv-.5;
   float vig=(1.-smoothstep(.28,.86,length(centered*vec2(1.08,.88))));
   color*=mix(.87+vig*.13,1.,1.-intensity*.42);
   float g=(hash(floor(uv*resolution)+floor(time*29.))-0.5)*.0105*grain*intensity;
   color+=g;
   gl_FragColor=vec4(max(color,0.),1.);
  }`,
};

// Reuse the visible scene's depth: no second geometry/normal render. During
// cinematics a single lightweight grading pass is allowed even in fluid mode;
// outside cinematics fluid mode still uses direct rendering.
export function createWorldPost(renderer,scene,camera){
 let composer,ao,grade,output,enabled=false,aoEnabled=false,cinematicActive=false;
 let width=1,height=1,ratio=1,mode='auto',clock=0;
 const memory=typeof navigator!=='undefined'?Number(navigator.deviceMemory)||4:4;
 const cores=typeof navigator!=='undefined'?Number(navigator.hardwareConcurrency)||4:4;

 function build(){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
  target.depthTexture=new THREE.DepthTexture(1,1);target.samples=2;
  composer=new EffectComposer(renderer,target);composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene,camera));

  ao=new GTAOPass(scene,camera,1,1,undefined,{radius:1.35,thickness:.86,distanceFallOff:1.08,scale:.66,samples:5,screenSpaceRadius:false},{radius:2.6,samples:5,rings:2});
  const setSize=ao.setSize.bind(ao);ao.setSize=(w,h)=>setSize(Math.max(1,Math.ceil(w*.42)),Math.max(1,Math.ceil(h*.42)));
  const render=ao.render.bind(ao);ao.render=(r,write,read)=>{if(ao.depthTexture!==read.depthTexture)ao.setGBuffer(read.depthTexture);render(r,write,read);};
  ao.blendIntensity=.46;composer.addPass(ao);

  grade=new ShaderPass(CinematicGradeShader);grade.enabled=false;composer.addPass(grade);
  output=new OutputPass();composer.addPass(output);
 }

 function applyState(){
  enabled=aoEnabled||cinematicActive;
  if(!enabled)return;
  if(!composer)build();
  ao.enabled=aoEnabled;
  grade.enabled=cinematicActive;
  composer.setSize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));
  grade.uniforms.resolution.value.set(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));
 }

 return{
  resize(nextWidth,nextHeight,nextRatio,nextMode){
   width=nextWidth;height=nextHeight;ratio=nextRatio;mode=nextMode;
   aoEnabled=mode==='detail'||mode==='auto'&&width>=760&&ratio>=.96;
   applyState();
  },
  setCinematic(profile=null){
   cinematicActive=!!profile?.active;
   if(cinematicActive){
    const budget=cinematicPostBudget(mode,memory,cores);
    if(!composer)build();
    grade.uniforms.intensity.value=Math.max(0,Math.min(1.2,(profile.intensity??.75)*budget.scale));
    grade.uniforms.flare.value=budget.flare;
    grade.uniforms.grain.value=budget.grain;
    if(profile.accent)grade.uniforms.accent.value.set(profile.accent);
    if(profile.secondary)grade.uniforms.secondary.value.set(profile.secondary);
   }
   applyState();
  },
  render(dt){
   clock+=Math.min(.1,Math.max(0,dt||0));
   if(enabled){if(grade)grade.uniforms.time.value=clock;composer.render(dt);}
   else renderer.render(scene,camera);
  },
  get enabled(){return enabled;},
  get cinematic(){return cinematicActive;},
  dispose(){ao?.dispose();grade?.dispose?.();output?.dispose();composer?.dispose();},
 };
}
