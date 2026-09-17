import {useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {CITY_DISTRICTS,districtPosition,landHalfSize,rotatedFootprint} from './city3b-layout.js';

const BG={day:0x0c1620,night:0x020407,auto:0x06101a};

export default function CityViewport({city,placements=[],buildings=[],preview=null,onGroundPick,interactive=true}){
 const mountRef=useRef(null);
 const buildingMap=useMemo(()=>new Map(buildings.map(b=>[b.code,b])),[buildings]);
 useEffect(()=>{
  const mount=mountRef.current;if(!mount||!city)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color(BG[city.day_mode]??BG.auto);
  if(city.weather==='fog'||city.weather==='rain'||city.weather==='snow'||city.weather==='storm')scene.fog=new THREE.FogExp2(scene.background,city.weather==='fog'?.012:.006);
  const camera=new THREE.PerspectiveCamera(48,1,.1,2200);camera.position.set(130,120,170);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;mount.replaceChildren(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,10,0);controls.minDistance=35;controls.maxDistance=650;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;
  const ambient=new THREE.HemisphereLight(0xbfe8ff,0x101008,1.6);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffefc7,2.1);sun.position.set(90,150,60);sun.castShadow=true;scene.add(sun);
  const half=landHalfSize(city.land_tier);const groundMat=new THREE.MeshStandardMaterial({color:0x0a0e12,roughness:.96,metalness:.04});const ground=new THREE.Mesh(new THREE.PlaneGeometry(half*2,half*2),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(half*2,Math.min(100,Math.max(20,Math.floor(half/4))),0x2acfff,0x263039);grid.position.y=.03;scene.add(grid);
  const civic=new THREE.Mesh(new THREE.CylinderGeometry(24,24,.7,64),new THREE.MeshStandardMaterial({color:0x17140d,metalness:.35,roughness:.55}));civic.position.y=.35;civic.receiveShadow=true;scene.add(civic);
  const ringGroup=new THREE.Group();ringGroup.position.set(0,12,0);for(let i=0;i<8;i++){const geo=new THREE.TorusGeometry(8.5,.55,10,34,Math.PI/4*.72),mat=new THREE.MeshStandardMaterial({color:i%2?0xd7bc78:0x39cff8,emissive:i%2?0x392d10:0x06384b,emissiveIntensity:1.4,metalness:.8,roughness:.2}),m=new THREE.Mesh(geo,mat);m.rotation.z=i*Math.PI/4;m.castShadow=true;ringGroup.add(m)}scene.add(ringGroup);
  const core=new THREE.PointLight(0x46d9ff,35,70,2);core.position.set(0,12,2);scene.add(core);
  Object.keys(CITY_DISTRICTS).forEach(country=>{const pos=districtPosition(country,Math.min(half*.7,150)),marker=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,.8,24),new THREE.MeshStandardMaterial({color:0x181a1d,emissive:0x0b2531,metalness:.45,roughness:.45}));marker.position.set(pos.x,.4,pos.z);scene.add(marker)});
  placements.filter(p=>(p.placement_state||'placed')==='placed').forEach(p=>{const b=buildingMap.get(p.building_code),w=p.footprint_w||rotatedFootprint(b,p.rotation).w,h=p.footprint_h||rotatedFootprint(b,p.rotation).h,height=Math.max(2,Math.min(18,2+Math.sqrt(w*h)*1.8)),mesh=new THREE.Mesh(new THREE.BoxGeometry(w,height,h),new THREE.MeshStandardMaterial({color:b?.country?0x1d2630:0x242118,metalness:.25,roughness:.62}));mesh.position.set(p.x+(w-1)/2,height/2,p.z+(h-1)/2);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh)});
  if(preview?.building){const {w,h}=rotatedFootprint(preview.building,preview.rotation),mesh=new THREE.Mesh(new THREE.BoxGeometry(w,2.5,h),new THREE.MeshStandardMaterial({color:preview.valid?0x29d17d:0xf05454,transparent:true,opacity:.58,emissive:preview.valid?0x073820:0x420d0d,emissiveIntensity:1.1}));mesh.position.set(Number(preview.x)+(w-1)/2,1.25,Number(preview.z)+(h-1)/2);scene.add(mesh)}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();const pick=e=>{if(!interactive||!onGroundPick)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(ground,false)[0];if(hit)onGroundPick({x:Math.round(hit.point.x),z:Math.round(hit.point.z)})};renderer.domElement.addEventListener('dblclick',pick);
  const resize=()=>{const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};const ro=new ResizeObserver(resize);ro.observe(mount);resize();
  let frame=0,last=performance.now();const animate=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;ringGroup.rotation.y+=dt*.08;controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate)};frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);ro.disconnect();renderer.domElement.removeEventListener('dblclick',pick);controls.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose?.())}});renderer.dispose();mount.replaceChildren()};
 },[city,placements,buildingMap,preview,onGroundPick,interactive]);
 return <div className="city3b-viewport" ref={mountRef} aria-label="Vue 3D de la ville 3B"><div className="city3b-viewport-hint">Double-clique le terrain pour choisir une parcelle · glisse pour tourner · molette/pincement pour zoomer</div></div>
}
