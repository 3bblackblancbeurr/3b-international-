import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {DICE_FACE_LAYOUT,diceFaceLayout,normalizeDiceValue} from './dada3b/dice.js';

const PIPS=Object.freeze({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]});

function makeFaceTexture(value,{champagne=false,country='#5bd9ef'}={}){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,256,256);
  const pipColor=champagne?'#f5c85d':'#72e8f8';
  const edge=champagne?'rgba(255,226,158,.65)':'rgba(119,234,248,.55)';
  ctx.strokeStyle=edge;ctx.lineWidth=5;ctx.shadowBlur=14;ctx.shadowColor=pipColor;
  ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(22,22,212,212,36);else ctx.rect(22,22,212,212);ctx.stroke();ctx.shadowBlur=0;
  ctx.globalAlpha=.16;ctx.font='900 84px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=country;ctx.fillText('3B',128,128);ctx.globalAlpha=1;
  for(const slot of PIPS[value]){
    const row=Math.floor((slot-1)/3),col=(slot-1)%3,x=65+col*63,y=65+row*63;
    const g=ctx.createRadialGradient(x-4,y-5,2,x,y,17);
    g.addColorStop(0,'#ffffff');g.addColorStop(.2,champagne?'#fff1bc':'#d9fbff');g.addColorStop(.55,pipColor);g.addColorStop(1,champagne?'#7c5713':'#0f4953');
    ctx.fillStyle=g;ctx.shadowBlur=22;ctx.shadowColor=pipColor;ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowBlur=0;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;return texture;
}

function disposeObject(root){
  root.traverse(object=>{
    object.geometry?.dispose?.();
    const mats=Array.isArray(object.material)?object.material:[object.material];
    mats.filter(Boolean).forEach(material=>{
      Object.values(material).forEach(value=>value?.isTexture&&value.dispose?.());
      material.dispose?.();
    });
  });
}

function setTargetQuaternion(runtime,value){
  const e=diceFaceLayout(value).targetRotation;
  const base=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.18,.28,.03,'XYZ'));
  const face=new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0],e[1],e[2],'XYZ'));
  runtime.target.copy(base).multiply(face).normalize();
}

export default function DadaDice3D({value=1,rolling=false,skin='DADA_DICE_CORE',country='#5bd9ef',onReady,onUnsupported}){
  const hostRef=useRef(null),runtimeRef=useRef(null);
  const propsRef=useRef({value,rolling,skin,country});propsRef.current={value,rolling,skin,country};

  useEffect(()=>{
    const host=hostRef.current;if(!host)return;
    let renderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',stencil:false});}
    catch(error){onUnsupported?.(error);return;}

    const mobile=window.matchMedia('(max-width:700px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.25:1.7));
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    renderer.setClearColor(0x000000,0);
    renderer.domElement.className='dada3b-die-webgl-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(30,1,.1,20);camera.position.set(0,1.9,5.1);camera.lookAt(0,.05,0);
    scene.add(new THREE.HemisphereLight(0xeafcff,0x261a0a,2.1));
    const key=new THREE.DirectionalLight(0xffe3a5,5.2);key.position.set(-3,4.2,5);scene.add(key);
    const cyan=new THREE.PointLight(0x5ee9ff,11,8,2);cyan.position.set(2.7,1.4,2.8);scene.add(cyan);
    const gold=new THREE.PointLight(0xe6b85a,8,7,2);gold.position.set(-2.8,2.1,1.7);scene.add(gold);

    const root=new THREE.Group();root.position.y=.06;scene.add(root);
    const champagne=propsRef.current.skin==='DADA_DICE_CHAMPAGNE';
    const bodyMaterial=new THREE.MeshPhysicalMaterial({
      color:new THREE.Color(champagne?'#6b532c':'#1a292b'),
      metalness:champagne ? .72 : .62,roughness:champagne ? .18 : .22,
      clearcoat:1,clearcoatRoughness:.08,
      emissive:new THREE.Color(champagne?'#6b4d18':propsRef.current.country),emissiveIntensity:champagne ? .15 : .1,
    });
    const body=new THREE.Mesh(new RoundedBoxGeometry(1.58,1.58,1.58,7,.18),bodyMaterial);root.add(body);

    const edgeMaterial=new THREE.LineBasicMaterial({color:new THREE.Color(champagne?'#f4ce7b':'#9cecf5'),transparent:true,opacity:.74});
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedBoxGeometry(1.6,1.6,1.6,4,.18)),edgeMaterial);root.add(edges);

    for(const spec of DICE_FACE_LAYOUT){
      const texture=makeFaceTexture(spec.value,{champagne,country:propsRef.current.country});
      const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.34,1.34),mat);plane.position.set(...spec.position);plane.rotation.set(...spec.planeRotation);root.add(plane);
    }

    const pedestalMat=new THREE.MeshPhysicalMaterial({color:new THREE.Color('#111819'),metalness:.9,roughness:.2,clearcoat:.9,emissive:new THREE.Color(champagne?'#8a6526':'#164b54'),emissiveIntensity:.16});
    const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.32,1.5,.16,48),pedestalMat);pedestal.position.y=-1.08;scene.add(pedestal);
    const ringMat=new THREE.MeshBasicMaterial({color:new THREE.Color(champagne?'#f2c665':'#69e5f6'),transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.26,.035,8,64),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=-.97;scene.add(ring);
    const sparkGeo=new THREE.BufferGeometry(),sparkCount=28,sparkPositions=new Float32Array(sparkCount*3);
    for(let i=0;i<sparkCount;i++){const a=i/sparkCount*Math.PI*2,r=1.35+(i%4)*.08;sparkPositions[i*3]=Math.cos(a)*r;sparkPositions[i*3+1]=-.3+(i%7)*.17;sparkPositions[i*3+2]=Math.sin(a)*r;}
    sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));
    const sparkMat=new THREE.PointsMaterial({color:new THREE.Color(champagne?'#f2c665':propsRef.current.country),size:.055,transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending});
    const sparks=new THREE.Points(sparkGeo,sparkMat);scene.add(sparks);

    const runtime={renderer,scene,camera,root,bodyMaterial,edgeMaterial,ring,ringMat,sparks,sparkMat,cyan,gold,target:new THREE.Quaternion(),settleFrom:new THREE.Quaternion(),settleStartedAt:0,settling:false,lastRolling:false,lastValue:normalizeDiceValue(propsRef.current.value),spin:new THREE.Vector3(4.4,6.2,3.7),contextLost:false,contextLossTimer:null,readySent:false,disposed:false};
    runtimeRef.current=runtime;setTargetQuaternion(runtime,runtime.lastValue);root.quaternion.copy(runtime.target);runtime.settleFrom.copy(runtime.target);

    const resize=()=>{
      const rect=host.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    };
    resize();const ro=new ResizeObserver(resize);ro.observe(host);

    const contextLost=e=>{
      e.preventDefault();runtime.contextLost=true;
      if(runtime.contextLossTimer)clearTimeout(runtime.contextLossTimer);
      runtime.contextLossTimer=setTimeout(()=>{if(runtime.contextLost&&!runtime.disposed)onUnsupported?.(new Error('Contexte WebGL du dé indisponible.'));},1200);
    };
    const contextRestored=()=>{
      runtime.contextLost=false;
      if(runtime.contextLossTimer){clearTimeout(runtime.contextLossTimer);runtime.contextLossTimer=null;}
      runtime.lastValue=normalizeDiceValue(propsRef.current.value);setTargetQuaternion(runtime,runtime.lastValue);runtime.root.quaternion.copy(runtime.target);runtime.settling=false;
    };
    renderer.domElement.addEventListener('webglcontextlost',contextLost,false);
    renderer.domElement.addEventListener('webglcontextrestored',contextRestored,false);
    const clock=new THREE.Clock();let frame=0;
    const animate=()=>{
      if(runtime.disposed)return;frame=requestAnimationFrame(animate);
      const dt=Math.min(clock.getDelta(),.033),t=clock.elapsedTime,p=propsRef.current,currentValue=normalizeDiceValue(p.value),now=performance.now();
      const champagneNow=p.skin==='DADA_DICE_CHAMPAGNE';
      runtime.cyan.color.set(p.country||'#5bd9ef');runtime.cyan.intensity=9+Math.sin(t*3.2)*2.3;
      runtime.gold.intensity=champagneNow?11:7;
      const six=!p.rolling&&currentValue===6;
      runtime.ringMat.color.set(champagneNow?'#f2c665':p.country||'#69e5f6');runtime.ringMat.opacity=(six ? .68 : .42)+Math.sin(t*4)*(six ? .19 : .13);runtime.ring.rotation.z+=dt*(six?1.45:.7);
      runtime.sparkMat.color.set(champagneNow?'#f2c665':p.country||'#69e5f6');runtime.sparkMat.opacity=p.rolling ? .52 : six ? .48 : .13;runtime.sparks.rotation.y+=dt*(p.rolling?2.6:six?1.3:.35);runtime.sparks.rotation.z+=dt*.18;
      runtime.bodyMaterial.color.set(champagneNow?'#6b532c':'#1a292b');
      runtime.bodyMaterial.metalness=champagneNow ? .72 : .62;runtime.bodyMaterial.roughness=champagneNow ? .18 : .22;
      runtime.bodyMaterial.emissive.set(champagneNow?'#6b4d18':p.country||'#173c42');
      runtime.bodyMaterial.emissiveIntensity=champagneNow ? .18 : .11;
      runtime.edgeMaterial.color.set(champagneNow?'#f4ce7b':'#9cecf5');

      if(p.rolling){
        runtime.settling=false;
        runtime.root.rotation.x+=runtime.spin.x*dt;runtime.root.rotation.y+=runtime.spin.y*dt;runtime.root.rotation.z+=runtime.spin.z*dt;
        runtime.root.position.y=.06+Math.abs(Math.sin(t*10))*.25;
        runtime.root.scale.setScalar(1+Math.sin(t*13)*.025);
      }else{
        if(runtime.lastRolling||runtime.lastValue!==currentValue){
          runtime.lastValue=currentValue;runtime.settleFrom.copy(runtime.root.quaternion);setTargetQuaternion(runtime,currentValue);runtime.settleStartedAt=now;runtime.settling=true;
        }
        let settleLift=0;
        if(runtime.settling){
          const progress=Math.min(1,(now-runtime.settleStartedAt)/320),eased=1-Math.pow(1-progress,3);
          runtime.root.quaternion.slerpQuaternions(runtime.settleFrom,runtime.target,eased);settleLift=Math.sin(Math.PI*progress)*.10;
          if(progress>=1){runtime.root.quaternion.copy(runtime.target);runtime.settling=false;settleLift=0;}
        }else runtime.root.quaternion.copy(runtime.target);
        runtime.root.position.y=THREE.MathUtils.lerp(runtime.root.position.y,.06+settleLift,1-Math.pow(.002,dt));
        const pulse=1+Math.sin(t*3.3)*.008;runtime.root.scale.setScalar(pulse);
      }
      runtime.lastRolling=p.rolling;
      if(!runtime.contextLost){renderer.render(scene,camera);if(!runtime.readySent){runtime.readySent=true;onReady?.();}}
    };
    animate();

    return()=>{
      runtime.disposed=true;cancelAnimationFrame(frame);ro.disconnect();if(runtime.contextLossTimer)clearTimeout(runtime.contextLossTimer);renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);
      disposeObject(scene);renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();runtimeRef.current=null;
    };
  },[]);

  return <span ref={hostRef} className="dada3b-die-webgl" aria-hidden="true"/>;
}
