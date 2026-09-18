import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {GARAGE_LIGHTING,createGarageShowroom,addGarageLighting} from './GarageShowroomV2.js';

export const GARAGE_VIEWS=Object.freeze({
  exterior:{id:'exterior',label:'3/4 avant',camera:[-3.8,2.15,-5.8],target:[0,.78,0],fov:38},
  front:{id:'front',label:'Avant',camera:[0,1.65,-6.6],target:[0,.72,-.2],fov:38},
  rear:{id:'rear',label:'Arrière',camera:[-3.5,2.05,5.8],target:[0,.75,.15],fov:38},
  profile:{id:'profile',label:'Profil',camera:[-7,1.85,0],target:[0,.75,0],fov:38},
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function garageBrightness(value){return clamp(Number.isFinite(Number(value))?Number(value):1,.9,1.45);}
export function garagePixelRatio(dpr=1,coarse=false){return clamp(Number.isFinite(dpr)?dpr:1,.75,coarse?1.25:1.65);}
export function garageZoom(distance,factor){return clamp(distance*factor,2.4,7.2);}
export function disposeGarageVehicle(root){
  if(!root)return;
  if(root.userData?.disposeProductionAsset){root.userData.disposeProductionAsset();return;}
  const geometry=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

export class GarageStageV2{
  constructor(canvas,{onError=()=>{},onInteract=()=>{}}={}){
    this.canvas=canvas;this.onError=onError;this.onInteract=onInteract;this.disposed=false;
    this.dirty=true;this.visible=true;this.raf=0;this.last=0;this.lastRender=0;this.model=null;this.transition=null;
    this.renderFrame=this.renderFrame.bind(this);this.request=this.request.bind(this);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x3e4a5b);this.scene.fog=new THREE.Fog(0x3e4a5b,13,29);
    this.camera=new THREE.PerspectiveCamera(38,1,.06,60);this.camera.position.set(...GARAGE_VIEWS.exterior.camera);
    try{
      RectAreaLightUniformsLib.init();
      const coarse=window.matchMedia?.('(pointer:coarse)').matches||false;
      this.renderer=new THREE.WebGLRenderer({canvas,antialias:!coarse,alpha:false,powerPreference:'high-performance'});
      this.renderer.setPixelRatio(garagePixelRatio(globalThis.devicePixelRatio||1,coarse));
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure=GARAGE_LIGHTING.exposure;
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      this.pmrem=new THREE.PMREMGenerator(this.renderer);
      const room=new RoomEnvironment();
      try{this.environment=this.pmrem.fromScene(room,.045);}finally{room.dispose();}
      this.scene.environment=this.environment.texture;this.scene.environmentIntensity=GARAGE_LIGHTING.environmentIntensity;
      this.showroom=createGarageShowroom();this.scene.add(this.showroom);this.lights=addGarageLighting(this.scene);
      this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(...GARAGE_VIEWS.exterior.target);
      this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.enablePan=false;
      this.controls.minDistance=2.4;this.controls.maxDistance=7.2;
      this.controls.minPolarAngle=.42;this.controls.maxPolarAngle=Math.PI*.485;
      this.controls.rotateSpeed=.6;this.controls.zoomSpeed=.65;this.controls.autoRotate=false;this.controls.autoRotateSpeed=.55;
      this.controls.update();
      this.change=()=>{this.dirty=true;this.request();};
      this.start=()=>{this.transition=null;this.controls.autoRotate=false;this.onInteract();this.change();};
      this.controls.addEventListener('change',this.change);this.controls.addEventListener('start',this.start);
      this.contextLost=e=>{e.preventDefault();this.failed=true;cancelAnimationFrame(this.raf);this.raf=0;this.onError('Le rendu 3D a été interrompu. Relance le garage.');};
      canvas.addEventListener('webglcontextlost',this.contextLost);
      this.visibility=()=>{this.last=0;if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0;}else this.request();};
      document.addEventListener('visibilitychange',this.visibility);
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
      if(typeof IntersectionObserver!=='undefined'){
        this.intersectionObserver=new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting!==false;this.last=0;if(!this.visible){cancelAnimationFrame(this.raf);this.raf=0;}else this.request();});
        this.intersectionObserver.observe(canvas);
      }
      canvas.dataset.garageVersion='modern-showroom-v2';canvas.dataset.environment='pmrem-studio';
      this.resize();this.request();
    }catch(error){this.dispose();throw error;}
  }
  resize(){
    if(this.disposed||!this.renderer)return;
    const width=Math.max(1,this.canvas.clientWidth),height=Math.max(1,this.canvas.clientHeight);
    this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false);this.dirty=true;this.request();
  }
  request(){if(!this.disposed&&!this.failed&&!this.raf&&this.visible&&!document.hidden)this.raf=requestAnimationFrame(this.renderFrame);}
  setModel(model){
    if(this.disposed){disposeGarageVehicle(model);return;}
    const old=this.model;if(old){this.scene.remove(old);disposeGarageVehicle(old);}
    this.model=model;model.position.y+=.025;this.scene.add(model);model.updateMatrixWorld(true);this.dirty=true;this.request();
  }
  selectView(preset,{immediate=false}={}){
    if(!preset||this.disposed)return;
    this.controls.autoRotate=false;this.onInteract();
    const closeup=['cockpit','seats','multimedia','engineBay','trunkAudio','wheels'].includes(preset.id);
    this.controls.minDistance=closeup?.65:2.4;
    this.transition={position:new THREE.Vector3(...preset.camera),target:new THREE.Vector3(...preset.target),fov:preset.fov||38};
    if(immediate){this.camera.position.copy(this.transition.position);this.controls.target.copy(this.transition.target);this.camera.fov=this.transition.fov;this.camera.updateProjectionMatrix();this.transition=null;}
    this.dirty=true;this.request();
  }
  zoom(factor){
    this.controls.autoRotate=false;this.onInteract();
    const offset=this.camera.position.clone().sub(this.controls.target),distance=offset.length();
    offset.setLength(garageZoom(distance,factor));
    this.transition={position:this.controls.target.clone().add(offset),target:this.controls.target.clone(),fov:this.camera.fov};this.request();
  }
  setAutoRotate(enabled){this.controls.autoRotate=Boolean(enabled);this.request();}
  setBrightness(value){if(this.renderer){this.renderer.toneMappingExposure=GARAGE_LIGHTING.exposure*garageBrightness(value);this.dirty=true;this.request();}}
  renderFrame(now){
    this.raf=0;if(this.disposed||this.failed||!this.visible||document.hidden)return;
    const dt=this.last?Math.min(.05,(now-this.last)/1000):1/60;this.last=now;
    if(this.transition){
      const t=this.transition,a=1-Math.exp(-9*dt);this.camera.position.lerp(t.position,a);this.controls.target.lerp(t.target,a);
      this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,t.fov,a);this.camera.updateProjectionMatrix();this.dirty=true;
      if(this.camera.position.distanceToSquared(t.position)<.00002&&this.controls.target.distanceToSquared(t.target)<.00002&&Math.abs(this.camera.fov-t.fov)<.02){this.camera.position.copy(t.position);this.controls.target.copy(t.target);this.camera.fov=t.fov;this.camera.updateProjectionMatrix();this.transition=null;}
    }
    this.controls.update(dt);
    try{if((this.dirty||this.controls.autoRotate)&&now-this.lastRender>=1000/60-.5){this.renderer.render(this.scene,this.camera);this.lastRender=now;this.dirty=false;}}
    catch(error){this.failed=true;this.onError(error.message||'Rendu 3D indisponible.');return;}
    // No GPU draw when the car/camera is idle; no RAF while off-screen or hidden.
    this.request();
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.raf);this.raf=0;
    this.resizeObserver?.disconnect();this.intersectionObserver?.disconnect();
    if(this.visibility)document.removeEventListener('visibilitychange',this.visibility);
    if(this.contextLost)this.canvas.removeEventListener('webglcontextlost',this.contextLost);
    this.controls?.dispose();disposeGarageVehicle(this.model);this.model=null;
    this.showroom?.userData.dispose?.();this.lights?.traverse(o=>{o.shadow?.dispose?.();});
    this.environment?.dispose();this.pmrem?.dispose();this.renderer?.dispose();
    if(this.canvas?.dataset){delete this.canvas.dataset.garageVersion;delete this.canvas.dataset.environment;}
  }
}
