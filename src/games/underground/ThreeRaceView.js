import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CinematicPremiumWorld} from './CinematicPremiumWorld.js';
import {createModularVehicleProxy,updateProxyRuntime} from './ModularVehicleProxy.js';
import {upgradeVehicleProxyV7} from './VehicleProxyV7.js';
import {attachVehicleCinematicFX,updateVehicleCinematicFX} from './VehicleCinematicFX.js';
import {hasProductionVehicleAsset,loadProductionVehicle,updateProductionVehicleRuntime} from './ProductionVehicleLoader.js';
import {cameraFov,chooseQuality,internalPixelRatio,QUALITY_PROFILES} from './visualConfig.js';
import './visual-premium.css';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function randomFrom(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function trackCurve(event){const rnd=randomFrom(hash(event.id));const pts=[],n=18,country=event.countryId||'france';for(let i=0;i<n;i++){const a=i/n*Math.PI*2,regional=country==='france'&&i>11?1.18:1,r=(130+(rnd()-.5)*58)*regional;pts.push(new THREE.Vector3(Math.cos(a)*r,(rnd()-.5)*(country==='france'&&i>11?9:4),Math.sin(a)*r*.74));}return new THREE.CatmullRomCurve3(pts,true,'catmullrom',.25);}
function hardwareProfile(canvas){const nav=typeof navigator!=='undefined'?navigator:{};return chooseQuality({width:canvas.clientWidth||1280,height:canvas.clientHeight||720,dpr:window.devicePixelRatio||1,memoryGb:nav.deviceMemory||8,cores:nav.hardwareConcurrency||8});}
function disposeObject(root){root?.traverse?.(o=>{o.geometry?.dispose?.();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose?.());}});root?.userData?.disposeProductionAsset?.();}
function addPoliceLightbar(root,index=0){
  const bar=new THREE.Group();bar.name='U3B_PoliceLightbar';bar.position.set(0,1.42,.05);
  const red=new THREE.Mesh(new THREE.BoxGeometry(.42,.08,.18),new THREE.MeshPhysicalMaterial({color:0x430007,emissive:0xff1738,emissiveIntensity:4,metalness:.35,roughness:.18}));
  const blue=new THREE.Mesh(new THREE.BoxGeometry(.42,.08,.18),new THREE.MeshPhysicalMaterial({color:0x041947,emissive:0x2878ff,emissiveIntensity:4,metalness:.35,roughness:.18}));
  red.position.x=-.24;blue.position.x=.24;bar.add(red,blue);bar.userData.red=red.material;bar.userData.blue=blue.material;bar.userData.phase=index*.7;root.add(bar);root.userData.policeLightbar=bar;return root;
}

export class ThreeRaceView{
  constructor(canvas,event,vehicle,options={}){
    this.canvas=canvas;this.event=event;this.vehicle=vehicle;this.cameraMode=['close','medium','far'].includes(options.cameraMode)?options.cameraMode:'medium';const cameraShake=Number(options.cameraShake);this.cameraShake=Number.isFinite(cameraShake)?clamp(cameraShake,0,1):.18;this.fpsTarget=String(options.fpsTarget||'auto');this.targetFrameMs=this.fpsTarget==='30'?1000/30:1000/60;this.curve=trackCurve(event);const requestedQuality=String(options.graphicsQuality||'auto');this.profile=QUALITY_PROFILES[requestedQuality]?requestedQuality:hardwareProfile(canvas);this.profileData=QUALITY_PROFILES[this.profile];this.frameEma=this.targetFrameMs;this.adaptTimer=0;this.elapsed=0;this.fxPressure=0;this.disposed=false;this.playerIsProduction=false;this.playerAssetState=hasProductionVehicleAsset(vehicle)?'loading':'proxy';
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(64,1,.1,1250);this.camera.position.set(0,4,-8);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false,stencil:false});this.maxPixelRatio=internalPixelRatio(this.profile,window.devicePixelRatio||1);this.pixelRatio=this.maxPixelRatio;this.renderer.setPixelRatio(this.pixelRatio);this.renderer.shadowMap.enabled=this.profile!=='low';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.sortObjects=true;
    this.pmrem=new THREE.PMREMGenerator(this.renderer);const envScene=new RoomEnvironment();this.environmentTarget=this.pmrem.fromScene(envScene,.035);envScene.dispose?.();this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=this.profile==='ultra'?1.18:1.0;
    this.postFxEnabled=this.profile==='high'||this.profile==='ultra';this.buildWorld();this.setupPostFX();this.resize();this.loadFinalPlayerAsset();
  }
  buildWorld(){
    this.world=new CinematicPremiumWorld(this.scene,this.curve,this.event,{quality:this.profile,shadowMap:this.profileData.shadowMap});
    this.player=upgradeVehicleProxyV7(createModularVehicleProxy(this.vehicle));this.player.name='U3B_PlayerVehicle_Proxy';attachVehicleCinematicFX(this.player,{accent:'#ff203c'});this.scene.add(this.player);
    this.aiCars=Array.from({length:8},(_,i)=>{const accent=i%2?'#3f78ff':'#e64444',m=upgradeVehicleProxyV7(createModularVehicleProxy(undefined,{ai:true,accentOverride:accent}),{ai:true});m.name=`U3B_AI_${i+1}`;m.scale.multiplyScalar(.96);attachVehicleCinematicFX(m,{ai:true,accent});this.scene.add(m);return m;});
    this.policeEnabled=this.event?.verticalSlice===true;this.policeCars=this.policeEnabled?Array.from({length:3},(_,i)=>{const m=addPoliceLightbar(upgradeVehicleProxyV7(createModularVehicleProxy(undefined,{ai:true,accentOverride:'#10151d'}),{ai:true}),i);m.name=`U3B_POLICE_${i+1}`;m.scale.multiplyScalar(.98);attachVehicleCinematicFX(m,{ai:true,accent:i%2?'#2878ff':'#ff1738'});this.scene.add(m);return m;}):[];
  }
  async loadFinalPlayerAsset(){
    if(!hasProductionVehicleAsset(this.vehicle))return null;
    const requested=this.vehicle.modelAsset;
    try{
      const finalModel=await loadProductionVehicle(this.vehicle);
      if(!finalModel||this.disposed||this.vehicle?.modelAsset!==requested){disposeObject(finalModel);return null;}
      const previous=this.player,position=previous.position.clone(),rotation=previous.rotation.clone(),scale=previous.scale.clone();
      finalModel.position.copy(position);finalModel.rotation.copy(rotation);finalModel.scale.multiply(scale);finalModel.name='U3B_PlayerVehicle_Final';attachVehicleCinematicFX(finalModel,{accent:'#ff203c'});
      this.scene.add(finalModel);this.scene.remove(previous);disposeObject(previous);this.player=finalModel;this.playerIsProduction=true;this.playerAssetState='ready';return finalModel;
    }catch(error){console.warn('[3B Underground] final vehicle asset failed, proxy retained',requested,error);this.playerAssetState='failed';return null;}
  }
  setupPostFX(){if(!this.postFxEnabled)return;this.composer=new EffectComposer(this.renderer);this.renderPass=new RenderPass(this.scene,this.camera);this.composer.addPass(this.renderPass);const ultra=this.profile==='ultra';this.ssao=new SSAOPass(this.scene,this.camera,Math.max(320,this.canvas.clientWidth||960),Math.max(180,this.canvas.clientHeight||540));this.ssao.kernelRadius=ultra?8:5;this.ssao.minDistance=.0025;this.ssao.maxDistance=.08;this.ssao.enabled=true;this.composer.addPass(this.ssao);this.bloomBase=ultra?.42:.28;this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),this.bloomBase,ultra?.30:.20,ultra?.90:.94);this.composer.addPass(this.bloom);this.outputPass=new OutputPass();this.composer.addPass(this.outputPass);}
  resize(){const w=this.canvas.clientWidth||1,h=this.canvas.clientHeight||1;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);if(this.composer){this.composer.setPixelRatio?.(this.pixelRatio);this.composer.setSize(w,h);this.ssao?.setSize?.(w,h);}}
  place(mesh,distance,total,lane=0){const u=((distance/Math.max(1,total))%1+1)%1,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();mesh.position.copy(p).addScaledVector(side,lane*4.25);mesh.position.y+=.38;mesh.rotation.y=Math.atan2(t.x,t.z);return {u,p,t,side};}
  applyFxPressure(level){this.fxPressure=level;if(this.bloom)this.bloom.enabled=level<2;if(this.ssao)this.ssao.enabled=level<2;const cinematic=this.world?.cinematic;if(cinematic?.stars)cinematic.stars.visible=level<2;if(cinematic?.shafts)cinematic.shafts.forEach(s=>s.visible=level<1);if(this.world?.speedAtmosphere?.lines)this.world.speedAtmosphere.lines.visible=level<2||this.frameEma<26;if(this.world?.key&&this.profile!=='ultra')this.world.key.castShadow=level<2;}
  adaptResolution(dt){const ms=dt*1000;this.frameEma=this.frameEma*.94+ms*.06;this.adaptTimer+=dt;if(this.adaptTimer<1.6)return;this.adaptTimer=0;let next=this.pixelRatio;const target=this.targetFrameMs,heavy=target*(this.postFxEnabled?1.11:1.16),light=target*.80;if(this.frameEma>heavy)next=Math.max(.66,next-.1);else if(this.frameEma<light)next=Math.min(this.maxPixelRatio,next+.08);const pressure=this.frameEma>target*1.62?2:this.frameEma>target*1.28?1:this.frameEma<target*1.03?0:this.fxPressure;if(pressure!==this.fxPressure)this.applyFxPressure(pressure);if(Math.abs(next-this.pixelRatio)>.02){this.pixelRatio=next;this.renderer.setPixelRatio(this.pixelRatio);this.resize();}}
  setCameraMode(mode){if(['close','medium','far'].includes(mode))this.cameraMode=mode;return this.cameraMode;}
  cycleCameraMode(){const modes=['close','medium','far'];this.cameraMode=modes[(modes.indexOf(this.cameraMode)+1)%modes.length];return this.cameraMode;}
  render(session,dt=.016){
    this.elapsed+=dt;const total=session.totalDistanceM,{u,p,t,side}=this.place(this.player,session.player.distanceM,total,session.player.lane),speed=session.player.state.speedMps*3.6,steerVisual=clamp((session.player.state.yaw||0)*.35,-1,1);
    if(this.playerIsProduction)updateProductionVehicleRuntime(this.player,{speedKph:speed,time:this.elapsed,steer:steerVisual});else updateProxyRuntime(this.player,this.vehicle,{speedKph:speed,time:this.elapsed,brake:session.player.brake||0,steer:steerVisual});updateVehicleCinematicFX(this.player,{speedKph:speed,wetness:this.visualState?.wetness??.7,brake:session.player.brake||0,time:this.elapsed});
    session.ai.forEach((ai,i)=>{if(this.aiCars[i]){const car=this.aiCars[i],aiSpeed=(ai.state?.speedMps||session.player.state.speedMps*.92)*3.6;car.visible=true;this.place(car,ai.distanceM,total,ai.lane);updateProxyRuntime(car,undefined,{speedKph:aiSpeed,time:this.elapsed+i*.13});updateVehicleCinematicFX(car,{speedKph:aiSpeed,wetness:this.visualState?.wetness??.7,time:this.elapsed+i*.17});}});for(let i=session.ai.length;i<this.aiCars.length;i++)this.aiCars[i].visible=false;
    if(this.policeEnabled)this.policeCars.forEach((car,i)=>{const gap=22+i*18+Math.sin(this.elapsed*.7+i)*5,policeDistance=Math.max(0,session.player.distanceM-gap),lane=i===0?-.8:i===1?.8:0;this.place(car,policeDistance,total,lane);const policeSpeed=Math.max(80,speed+8-i*3);updateProxyRuntime(car,undefined,{speedKph:policeSpeed,time:this.elapsed+i*.21});updateVehicleCinematicFX(car,{speedKph:policeSpeed,wetness:this.visualState?.wetness??.7,time:this.elapsed+i*.19});const bar=car.userData.policeLightbar;if(bar){const pulse=Math.sin(this.elapsed*10+bar.userData.phase)>0;bar.userData.red.emissiveIntensity=pulse?7:1.2;bar.userData.blue.emissiveIntensity=pulse?1.2:7;}});
    const speedT=clamp(speed/300,0,1),cameraPreset={close:{back:7.35,height:2.88,look:10.4},medium:{back:9.1,height:3.45,look:12.5},far:{back:11.7,height:4.22,look:15.2}}[this.cameraMode]||{back:9.1,height:3.45,look:12.5},back=cameraPreset.back+clamp(speed*.0115,0,this.cameraMode==='far'?3.0:4.0),height=cameraPreset.height+speedT*(this.cameraMode==='close'?.46:.78),target=p.clone().add(new THREE.Vector3(0,.90,0)),bob=Math.sin(this.elapsed*4.2)*.009*speedT*this.cameraShake,cam=target.clone().addScaledVector(t,-back).add(new THREE.Vector3(0,height+bob,0)).addScaledVector(side,session.player.lane*.17);
    this.camera.position.lerp(cam,1-Math.pow(.0025,dt));const look=target.clone().addScaledVector(t,cameraPreset.look+speed*.031).addScaledVector(side,(session.player.state.yaw||0)*.13);this.camera.lookAt(look);const desiredRoll=clamp((-(session.player.state.yaw||0)*.010-session.player.lane*.0038)*this.cameraShake,-.024,.024);this.camera.rotation.z=THREE.MathUtils.lerp(this.camera.rotation.z,desiredRoll,1-Math.pow(.045,dt));
    const fov=cameraFov(speed);if(Math.abs(this.camera.fov-fov)>.05){this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,1-Math.pow(.02,dt));this.camera.updateProjectionMatrix();}
    const visual=this.world.update({progress:u,playerPosition:p,playerTangent:t,speedKph:speed,dt,puddleDepth:.42});this.visualState={...visual,quality:this.profile,pixelRatio:this.pixelRatio,frameMs:this.frameEma,postFx:this.postFxEnabled,fxPressure:this.fxPressure,vehicleAssetState:this.playerAssetState};this.renderer.toneMappingExposure=THREE.MathUtils.lerp(this.renderer.toneMappingExposure,visual.exposure,1-Math.pow(.02,dt));if(this.bloom&&this.bloom.enabled)this.bloom.strength=this.bloomBase*(.74+.25*visual.wetness+.05*Math.sin(this.elapsed*.6));this.adaptResolution(dt);
    if(this.composer)this.composer.render(dt);else this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.disposed=true;this.composer?.dispose?.();this.world?.surfaceV7?.dispose?.();this.environmentTarget?.dispose?.();this.pmrem?.dispose?.();this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose?.());}o.userData?.contactShadowTexture?.dispose?.();});this.renderer.dispose();}
}
