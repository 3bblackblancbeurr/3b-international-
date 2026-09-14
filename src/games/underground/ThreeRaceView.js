import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {CinematicPremiumWorld} from './CinematicPremiumWorld.js';
import {createModularVehicleProxy,updateProxyRuntime} from './ModularVehicleProxy.js';
import {attachVehicleCinematicFX,updateVehicleCinematicFX} from './VehicleCinematicFX.js';
import {cameraFov,chooseQuality,internalPixelRatio,QUALITY_PROFILES} from './visualConfig.js';
import './visual-premium.css';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function randomFrom(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

function trackCurve(event){
  const rnd=randomFrom(hash(event.id));const pts=[],n=18,country=event.countryId||'france';
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,regional=country==='france'&&i>11?1.18:1,r=(130+(rnd()-.5)*58)*regional;
    pts.push(new THREE.Vector3(Math.cos(a)*r,(rnd()-.5)*(country==='france'&&i>11?9:4),Math.sin(a)*r*.74));
  }
  return new THREE.CatmullRomCurve3(pts,true,'catmullrom',.25);
}
function hardwareProfile(canvas){const nav=typeof navigator!=='undefined'?navigator:{};return chooseQuality({width:canvas.clientWidth||1280,height:canvas.clientHeight||720,dpr:window.devicePixelRatio||1,memoryGb:nav.deviceMemory||8,cores:nav.hardwareConcurrency||8});}

export class ThreeRaceView{
  constructor(canvas,event,vehicle){
    this.canvas=canvas;this.event=event;this.vehicle=vehicle;this.curve=trackCurve(event);this.profile=hardwareProfile(canvas);this.profileData=QUALITY_PROFILES[this.profile];this.frameEma=16.67;this.adaptTimer=0;this.elapsed=0;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(64,1,.1,1250);this.camera.position.set(0,4,-8);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false,stencil:false});
    this.maxPixelRatio=internalPixelRatio(this.profile,window.devicePixelRatio||1);this.pixelRatio=this.maxPixelRatio;this.renderer.setPixelRatio(this.pixelRatio);this.renderer.shadowMap.enabled=this.profile!=='low';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.sortObjects=true;this.postFxEnabled=this.profile==='high'||this.profile==='ultra';this.buildWorld();this.setupPostFX();this.resize();
  }
  buildWorld(){
    this.world=new CinematicPremiumWorld(this.scene,this.curve,this.event,{quality:this.profile,shadowMap:this.profileData.shadowMap});
    this.player=createModularVehicleProxy(this.vehicle);this.player.name='U3B_PlayerVehicle';attachVehicleCinematicFX(this.player,{accent:'#ff203c'});this.scene.add(this.player);
    this.aiCars=Array.from({length:8},(_,i)=>{const accent=i%2?'#3f78ff':'#e64444',m=createModularVehicleProxy(undefined,{ai:true,accentOverride:accent});m.name=`U3B_AI_${i+1}`;m.scale.multiplyScalar(.96);attachVehicleCinematicFX(m,{ai:true,accent});this.scene.add(m);return m;});
  }
  setupPostFX(){
    if(!this.postFxEnabled)return;
    this.composer=new EffectComposer(this.renderer);this.renderPass=new RenderPass(this.scene,this.camera);this.composer.addPass(this.renderPass);
    const ultra=this.profile==='ultra';this.bloomBase=ultra?.48:.34;this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),this.bloomBase,ultra?.34:.24,ultra?.86:.92);this.composer.addPass(this.bloom);this.outputPass=new OutputPass();this.composer.addPass(this.outputPass);
  }
  resize(){const w=this.canvas.clientWidth||1,h=this.canvas.clientHeight||1;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);if(this.composer){this.composer.setPixelRatio?.(this.pixelRatio);this.composer.setSize(w,h);}}
  place(mesh,distance,total,lane=0){const u=((distance/Math.max(1,total))%1+1)%1,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();mesh.position.copy(p).addScaledVector(side,lane*4.25);mesh.position.y+=.38;mesh.rotation.y=Math.atan2(t.x,t.z);return {u,p,t,side};}
  adaptResolution(dt){
    const ms=dt*1000;this.frameEma=this.frameEma*.94+ms*.06;this.adaptTimer+=dt;if(this.adaptTimer<1.8)return;this.adaptTimer=0;let next=this.pixelRatio;
    const heavy=this.postFxEnabled?18.6:19.2,light=this.postFxEnabled?13.2:13.8;if(this.frameEma>heavy)next=Math.max(.72,next-.1);else if(this.frameEma<light)next=Math.min(this.maxPixelRatio,next+.08);
    if(Math.abs(next-this.pixelRatio)>.02){this.pixelRatio=next;this.renderer.setPixelRatio(this.pixelRatio);this.resize();}
  }
  render(session,dt=.016){
    this.elapsed+=dt;const total=session.totalDistanceM,{u,p,t,side}=this.place(this.player,session.player.distanceM,total,session.player.lane),speed=session.player.state.speedMps*3.6;
    updateProxyRuntime(this.player,this.vehicle,{speedKph:speed,time:this.elapsed,brake:session.player.brake||0,steer:session.player.lane||0});updateVehicleCinematicFX(this.player,{speedKph:speed,wetness:this.visualState?.wetness??.7,brake:session.player.brake||0,time:this.elapsed});
    session.ai.forEach((ai,i)=>{if(this.aiCars[i]){const car=this.aiCars[i],aiSpeed=(ai.state?.speedMps||session.player.state.speedMps*.92)*3.6;car.visible=true;this.place(car,ai.distanceM,total,ai.lane);updateProxyRuntime(car,undefined,{speedKph:aiSpeed,time:this.elapsed+i*.13});updateVehicleCinematicFX(car,{speedKph:aiSpeed,wetness:this.visualState?.wetness??.7,time:this.elapsed+i*.17});}});for(let i=session.ai.length;i<this.aiCars.length;i++)this.aiCars[i].visible=false;
    const speedT=clamp(speed/300,0,1),back=9.5+clamp(speed*.0135,0,4.25),height=3.7+speedT*.9,target=p.clone().add(new THREE.Vector3(0,1.0,0)),bob=Math.sin(this.elapsed*4.2)*.012*speedT,cam=target.clone().addScaledVector(t,-back).add(new THREE.Vector3(0,height+bob,0)).addScaledVector(side,session.player.lane*.20);
    this.camera.position.lerp(cam,1-Math.pow(.0025,dt));const look=target.clone().addScaledVector(t,11+speed*.029).addScaledVector(side,(session.player.state.yaw||0)*.16);this.camera.lookAt(look);
    const desiredRoll=clamp(-(session.player.state.yaw||0)*.012-session.player.lane*.0045,-.028,.028);this.camera.rotation.z=THREE.MathUtils.lerp(this.camera.rotation.z,desiredRoll,1-Math.pow(.045,dt));
    const fov=cameraFov(speed);if(Math.abs(this.camera.fov-fov)>.05){this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,1-Math.pow(.02,dt));this.camera.updateProjectionMatrix();}
    const visual=this.world.update({progress:u,playerPosition:p,playerTangent:t,speedKph:speed,dt,puddleDepth:.42});this.visualState={...visual,quality:this.profile,pixelRatio:this.pixelRatio,frameMs:this.frameEma,postFx:this.postFxEnabled};
    this.renderer.toneMappingExposure=THREE.MathUtils.lerp(this.renderer.toneMappingExposure,visual.exposure,1-Math.pow(.02,dt));if(this.bloom)this.bloom.strength=this.bloomBase*(.78+.32*visual.wetness+.08*Math.sin(this.elapsed*.6));this.adaptResolution(dt);
    if(this.composer)this.composer.render(dt);else this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.composer?.dispose?.();this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose?.());}});this.renderer.dispose();}
}
