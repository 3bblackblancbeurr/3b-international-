import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

// Reuse the visible scene's depth: no second geometry/normal render, and faded
// walls cannot cast phantom AO over the avatar. AO stays optional because on a
// phone stable frame pacing is more valuable than a costly full-screen effect.
export function createWorldPost(renderer,scene,camera){
 let composer,ao,output,enabled=false;
 function build(){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});target.depthTexture=new THREE.DepthTexture(1,1);target.samples=2;
  composer=new EffectComposer(renderer,target);composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene,camera));
  ao=new GTAOPass(scene,camera,1,1,undefined,{radius:1.65,thickness:1,distanceFallOff:1,scale:.7,samples:6,screenSpaceRadius:false},{radius:3,samples:6,rings:2});
  const setSize=ao.setSize.bind(ao);ao.setSize=(w,h)=>setSize(Math.max(1,Math.ceil(w*.45)),Math.max(1,Math.ceil(h*.45)));
  const render=ao.render.bind(ao);ao.render=(r,write,read)=>{if(ao.depthTexture!==read.depthTexture)ao.setGBuffer(read.depthTexture);render(r,write,read);};
  ao.blendIntensity=.58;composer.addPass(ao);output=new OutputPass();composer.addPass(output);
 }
 return{
  resize(width,height,ratio,mode){
   // Auto only pays for GTAO when adaptive resolution says the device still has
   // enough GPU headroom. Fluid is always direct rendering; Detail stays opt-in.
   enabled=mode==='detail'||mode==='auto'&&width>=760&&ratio>=.96;
   if(enabled){if(!composer)build();composer.setSize(Math.round(width*ratio),Math.round(height*ratio));}
  },
  render(dt){if(enabled)composer.render(dt);else renderer.render(scene,camera);},
  get enabled(){return enabled;},
  dispose(){ao?.dispose();output?.dispose();composer?.dispose();},
 };
}
