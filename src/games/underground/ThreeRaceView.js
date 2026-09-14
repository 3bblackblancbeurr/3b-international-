import * as THREE from 'three';
import {PremiumWorld} from './PremiumWorld.js';
import {createModularVehicleProxy,updateProxyRuntime} from './ModularVehicleProxy.js';
import {cameraFov,chooseQuality,internalPixelRatio,QUALITY_PROFILES} from './visualConfig.js';
import './visual-premium.css';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function randomFrom(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

function trackCurve(event){
  const rnd=randomFrom(hash(event.id));const pts=[],n=18,country=event.countryId||'france';
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,regional=country==='france'&&i>11?1.18:1,r=(130+(rnd()-.5)*58)*regional;pts.push(new THREE.Vector3(Math.cos(a)*r,(rnd()-.5)*(country==='france'&&i>11?9:4),Math.sin(a)*r*.74));}
  return new THREE.CatmullRomCurve3(pts,true,'catmullrom',.25);
}

function hardwareProfile(canvas){const nav=typeof navigator!=='undefined'?navigator:{};return chooseQuality({width:canvas.clientWidth||1280,height:canvas.clientHeight||720,dpr:window.devicePixelRatio||1,memoryGb:nav.deviceMemory||8,cores:nav.hardwareConcurrency||8});}

export class ThreeRaceView{
  constructor(canvas,event,vehicle){
    this.canvas=canvas;this.event=event;this.vehicle=vehicle;this.curve=trackCurve(event);this.profile=hardwareProfile(canvas);this.profileData=QUALITY_PROFILES[this.profile];this.frameEma=16.67;this.adaptTimer=0;this.elapsed=0;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(64,1,.1,1100);this.camera.position.set(0,4,-8);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false,stencil:false});this.maxPixelRatio=internalPixelRatio(this.profile,window.devicePixelRatio||1);this.pixelRatio=this.maxPixelRatio;this.renderer.setPixelRatio(this.pixelRatio);this.renderer.shadowMap.enabled=this.profile!=='low';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.buildWorld();this.resize();
  }
  buildWorld(){
    this.world=new PremiumWorld(this.scene,this.curve,this.event,{quality:this.profile,shadowMap:this.profileData.shadowMap});
    this.player=createModularVehicleProxy(this.vehicle);this.scene.add(this.player);
    this.aiCars=Array.from({length:8},(_,i)=>{const m=createModularVehicleProxy(undefined,{ai:true,accentOverride:i%2?'#3f78ff':'#e64444'});m.scale.multiplyScalar(.96);this.scene.add(m);return m;});
  }
  resize(){const w=this.canvas.clientWidth||1,h=this.canvas.clientHeight||1;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  place(mesh,distance,total,lane=0){const u=((distance/Math.max(1,total))%1+1)%1,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();mesh.position.copy(p).addScaledVector(side,lane*4.25);mesh.position.y+=.38;mesh.rotation.y=Math.atan2(t.x,t.z);return {u,p,t,side};}
  adaptResolution(dt){const ms=dt*1000;this.frameEma=this.frameEma*.94+ms*.06;this.adaptTimer+=dt;if(this.adaptTimer<1.8)return;this.adaptTimer=0;let next=this.pixelRatio;if(this.frameEma>19.2)next=Math.max(.75,next-.1);else if(this.frameEma<13.8)next=Math.min(this.maxPixelRatio,next+.08);if(Math.abs(next-this.pixelRatio)>.02){this.pixelRatio=next;this.renderer.setPixelRatio(this.pixelRatio);this.resize();}}
  render(session,dt=.016){
    this.elapsed+=dt;const total=session.totalDistanceM,{u,p,t,side}=this.place(this.player,session.player.distanceM,total,session.player.lane),speed=session.player.state.speedMps*3.6;updateProxyRuntime(this.player,this.vehicle,{speedKph:speed,time:this.elapsed});
    session.ai.forEach((ai,i)=>{if(this.aiCars[i]){this.aiCars[i].visible=true;this.place(this.aiCars[i],ai.distanceM,total,ai.lane);}});for(let i=session.ai.length;i<this.aiCars.length;i++)this.aiCars[i].visible=false;
    const back=9.8+clamp(speed*.012,0,3.8),height=3.85+clamp(speed/300,0,.75),target=p.clone().add(new THREE.Vector3(0,1,0)),cam=target.clone().addScaledVector(t,-back).add(new THREE.Vector3(0,height,0)).addScaledVector(side,session.player.lane*.22);this.camera.position.lerp(cam,1-Math.pow(.0025,dt));const look=target.clone().addScaledVector(t,11+speed*.026);this.camera.lookAt(look);this.camera.rotation.z=THREE.MathUtils.lerp(this.camera.rotation.z,-session.player.lane*.006,1-Math.pow(.05,dt));
    const fov=cameraFov(speed);if(Math.abs(this.camera.fov-fov)>.05){this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,1-Math.pow(.02,dt));this.camera.updateProjectionMatrix();}
    const visual=this.world.update({progress:u,playerPosition:p,playerTangent:t,speedKph:speed,dt,puddleDepth:.38});this.visualState={...visual,quality:this.profile,pixelRatio:this.pixelRatio};this.renderer.toneMappingExposure=THREE.MathUtils.lerp(this.renderer.toneMappingExposure,visual.exposure,1-Math.pow(.02,dt));this.adaptResolution(dt);this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose?.());}});this.renderer.dispose();}
}
