import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createModularVehicleProxy,updateProxyRuntime} from './ModularVehicleProxy.js';
import {INSPECTION_PRESETS,inspectionState} from './vehicleInspection.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export default function VehicleLabPreview({vehicle}){
  const canvas=useRef(null),rendererRef=useRef(null),sceneRef=useRef(null),vehicleRef=useRef(null),cameraRef=useRef(null),rafRef=useRef(0),drag=useRef({active:false,x:0,yaw:0}),[preset,setPreset]=useState('exterior');

  useEffect(()=>{
    const el=canvas.current;if(!el)return;const scene=new THREE.Scene();scene.background=new THREE.Color(0x05070b);scene.fog=new THREE.FogExp2(0x05070b,.025);sceneRef.current=scene;
    const camera=new THREE.PerspectiveCamera(42,1,.1,100);cameraRef.current=camera;
    const renderer=new THREE.WebGLRenderer({canvas:el,antialias:true,powerPreference:'high-performance',alpha:false});rendererRef.current=renderer;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene.add(new THREE.HemisphereLight(0x8bb5ff,0x241707,1.4));const key=new THREE.DirectionalLight(0xffd99a,4.2);key.position.set(-5,7,-4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const rim=new THREE.DirectionalLight(0x3f78ff,2.6);rim.position.set(5,3,3);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.MeshPhysicalMaterial({color:0x0b0d11,metalness:.28,roughness:.23,clearcoat:.8,clearcoatRoughness:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=.02;floor.receiveShadow=true;scene.add(floor);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(3.4,.025,8,96),new THREE.MeshBasicMaterial({color:0xd7b76b,transparent:true,opacity:.45}));ring.rotation.x=Math.PI/2;ring.position.y=.035;scene.add(ring);
    const resize=()=>{const w=el.clientWidth||600,h=el.clientHeight||360;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};const ro=new ResizeObserver(resize);ro.observe(el);resize();
    let start=performance.now();const loop=now=>{const dt=Math.min(.05,(now-start)/1000);start=now;const proxy=vehicleRef.current;if(proxy){updateProxyRuntime(proxy,vehicle,{speedKph:0,time:now/1000});if(!drag.current.active)proxy.rotation.y+=dt*.12;}
      renderer.render(scene,camera);rafRef.current=requestAnimationFrame(loop);};rafRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(rafRef.current);ro.disconnect();scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());}});renderer.dispose();};
  },[]);

  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return;if(vehicleRef.current){scene.remove(vehicleRef.current);vehicleRef.current.traverse(o=>{o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());}});}
    const proxy=createModularVehicleProxy(vehicle);proxy.position.y=.03;proxy.rotation.y=drag.current.yaw;vehicleRef.current=proxy;scene.add(proxy);
  },[vehicle]);

  useEffect(()=>{
    const camera=cameraRef.current,proxy=vehicleRef.current;if(!camera||!proxy)return;const state=inspectionState(vehicle,preset),p=state.preset;
    camera.position.set(...p.camera);camera.fov=p.fov;camera.updateProjectionMatrix();camera.lookAt(new THREE.Vector3(...p.target));
    proxy.userData.inspectionState=state;
  },[preset,vehicle]);

  const pointerDown=e=>{drag.current.active=true;drag.current.x=e.clientX;e.currentTarget.setPointerCapture?.(e.pointerId);};
  const pointerMove=e=>{if(!drag.current.active||!vehicleRef.current)return;const dx=e.clientX-drag.current.x;drag.current.x=e.clientX;drag.current.yaw+=dx*.008;vehicleRef.current.rotation.y=drag.current.yaw;};
  const pointerEnd=()=>{drag.current.active=false;};

  return <section className="u3b-lab-preview" aria-label="Aperçu véhicule modulaire">
    <div className="u3b-lab-stage" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}><canvas ref={canvas}/><span>PROXY MODULAIRE · glisse pour tourner</span></div>
    <div className="u3b-lab-presets">{Object.values(INSPECTION_PRESETS).map(p=><button key={p.id} className={preset===p.id?'active':''} onClick={()=>setPreset(p.id)}>{p.label}</button>)}</div>
  </section>;
}
