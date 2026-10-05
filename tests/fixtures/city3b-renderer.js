// GPU boundary only: the scene, OrbitControls, water and render budget are real.
export * from 'three';
import {Vector4} from 'three';
export const renderers=[];
export class WebGLRenderer{
 constructor(){
  this.domElement=document.createElement('canvas');this.shadowMap={enabled:false,autoUpdate:true};this.xr={enabled:false};
  this.extensions={has:()=>false};this.state={buffers:{depth:{setMask(){}}}};this.autoClear=true;
  this.target=null;this.viewport=new Vector4(0,0,800,600);this.scissor=this.viewport.clone();this.pixelRatios=[];this.frames=[];this.reflections=[];
  renderers.push(this);
 }
 setPixelRatio(value){this.pixelRatio=value;this.pixelRatios.push(value);}
 setSize(width,height){this.width=width;this.height=height;}
 getRenderTarget(){return this.target;}
 setRenderTarget(value){this.target=value;}
 getViewport(value){return value.copy(this.viewport);}
 setViewport(value){this.viewport.copy(value);}
 getScissor(value){return value.copy(this.scissor);}
 setScissor(value){this.scissor.copy(value);}
 getScissorTest(){return false;}
 setScissorTest(){}
 render(scene,camera){
  scene.updateMatrixWorld();
  if(this.target){this.reflections.push(this.target);return;}
  this.scene=scene;this.camera=camera;
  this.frames.push({pixelRatio:this.pixelRatio,shadows:this.shadowMap.enabled});
 }
 dispose(){this.disposed=true;}
}
