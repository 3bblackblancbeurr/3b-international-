import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createModularVehicleProxy,updateProxyRuntime} from './ModularVehicleProxy.js';
import {upgradeVehicleProxyV7} from './VehicleProxyV7.js';
import {hasProductionVehicleAsset,loadProductionVehicle,updateProductionVehicleRuntime} from './ProductionVehicleLoader.js';
import {INSPECTION_PRESETS,inspectionState} from './vehicleInspection.js';
import './vehicle-lab.css';

function disposeObject(root){root?.userData?.disposeProductionAsset?.();root?.traverse?.(o=>{o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());}});}

export default function VehicleLabPreview({vehicle}){
  const canvas=useRef(null),sceneRef=useRef(null),vehicleRef=useRef(null),cameraRef=useRef(null),rafRef=useRef(0),drag=useRef({active:false,x:0,yaw:0}),requestRef=useRef(0),[preset,setPreset]=useState('exterior'),[assetState,setAssetState]=useState('proxy');
  useEffect(()=>{
    const el=canvas.current;if(!el)return;const scene=new THREE.Scene();scene.background=new THREE.Color(0x05070b);scene.fog=new THREE.FogExp2(0x05070b,.025);sceneRef.current=scene;const camera=new THREE.PerspectiveCamera(42,1,.1,100);cameraRef.current=camera;
    const renderer=new THREE.WebGLRenderer({canvas:el,antialias:true,powerPreference:'high-performance',alpha:false});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene.add(new THREE.HemisphereLight(0x8bb5ff,0x241707,1.35));const key=new THREE.DirectionalLight(0xffd99a,4.1);key.position.set(-5,7,-4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const rim=new THREE.DirectionalLight(0x3f78ff,2.4);rim.position.set(5,3,3);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.MeshPhysicalMaterial({color:0x0b0d11,metalness:.28,roughness:.23,clearcoat:.8,clearcoatRoughness:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=.02;floor.receiveShadow=true;scene.add(floor);const ring=new THREE.Mesh(new THREE.TorusGeometry(3.4,.025,8,96),new THREE.MeshBasicMaterial({color:0xd7b76b,transparent:true,opacity:.38}));ring.rotation.x=Math.PI/2;ring.position.y=.035;scene.add(ring);
    const resize=()=>{const w=el.clientWidth||600,h=el.clientHeight||360;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};const ro=new ResizeObserver(resize);ro.observe(el);resize();let start=performance.now();const loop=now=>{const dt=Math.min(.05,(now-start)/1000);start=now;const model=vehicleRef.current;if(model){if(model.userData?.productionVehicle)updateProductionVehicleRuntime(model,{speedKph:0,time:now/1000});else updateProxyRuntime(model,vehicle,{speedKph:0,time:now/1000});if(!drag.current.active)model.rotation.y+=dt*.12;}renderer.render(scene,camera);rafRef.current=requestAnimationFrame(loop);};rafRef.current=requestAnimationFrame(loop);
    return()=>{requestRef.current++;cancelAnimationFrame(rafRef.current);ro.disconnect();disposeObject(vehicleRef.current);scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());}});renderer.dispose();};
  },[]);
  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return;const request=++requestRef.current;
    if(vehicleRef.current){scene.remove(vehicleRef.current);disposeObject(vehicleRef.current);}
    const proxy=upgradeVehicleProxyV7(createModularVehicleProxy(vehicle));proxy.position.y=.03;proxy.rotation.y=drag.current.yaw;vehicleRef.current=proxy;scene.add(proxy);setAssetState(hasProductionVehicleAsset(vehicle)?'loading':'proxy');
    if(hasProductionVehicleAsset(vehicle))loadProductionVehicle(vehicle).then(finalModel=>{if(!finalModel||request!==requestRef.current){disposeObject(finalModel);return;}scene.remove(proxy);disposeObject(proxy);finalModel.position.y=.03;finalModel.rotation.y=drag.current.yaw;vehicleRef.current=finalModel;scene.add(finalModel);setAssetState('ready');}).catch(()=>{if(request===requestRef.current)setAssetState('failed');});
  },[vehicle]);
  useEffect(()=>{const camera=cameraRef.current,model=vehicleRef.current;if(!camera||!model)return;const state=inspectionState(vehicle,preset),p=state.preset;camera.position.set(...p.camera);camera.fov=p.fov;camera.updateProjectionMatrix();camera.lookAt(new THREE.Vector3(...p.target));model.userData.inspectionState=state;},[preset,vehicle,assetState]);
  const pointerDown=e=>{drag.current.active=true;drag.current.x=e.clientX;e.currentTarget.setPointerCapture?.(e.pointerId);};const pointerMove=e=>{if(!drag.current.active||!vehicleRef.current)return;const dx=e.clientX-drag.current.x;drag.current.x=e.clientX;drag.current.yaw+=dx*.008;vehicleRef.current.rotation.y=drag.current.yaw;};const pointerEnd=()=>{drag.current.active=false;};
  const stateLabel=assetState==='ready'?'MODÈLE 3D GOLD MASTER':assetState==='loading'?'CHARGEMENT MODÈLE 3D…':assetState==='failed'?'ASSET INDISPONIBLE · PROXY V7':'PROXY V7 SCULPTÉ';
  return <section className="u3b-lab-preview" aria-label="Aperçu véhicule modulaire"><div className="u3b-lab-stage" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}><canvas ref={canvas}/><span>{stateLabel} · glisse pour tourner</span></div><div className="u3b-lab-presets">{Object.values(INSPECTION_PRESETS).map(p=><button key={p.id} className={preset===p.id?'active':''} onClick={()=>setPreset(p.id)}>{p.label}</button>)}</div></section>;
}
