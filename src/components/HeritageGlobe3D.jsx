import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {WORLD_REALMS} from './world-living-data.js';
import HeritageSignalNetwork from './HeritageSignalNetwork.jsx';

// Cinematic real-world globe. NASA's Blue Marble texture is kept in our own
// public assets; render only while visible and avoid effects/postprocessing.
const R=Math.PI/180;
function geo(lat,lon,radius=1.026){
 const a=lat*R,b=lon*R;
 return new THREE.Vector3(Math.cos(a)*Math.sin(b)*radius,Math.sin(a)*radius,Math.cos(a)*Math.cos(b)*radius);
}
export default function HeritageGlobe3D({selectedId='france',onSelect,paused=false,zoom=1}){
 const canvas=useRef(null),fallbackSwipe=useRef(null),current=useRef({selectedId,onSelect,paused,zoom,paint:()=>{},refresh:()=>{}});
 const [ready,setReady]=useState(false);
 current.current.onSelect=onSelect;
 useEffect(()=>{current.current.selectedId=selectedId;current.current.paint();},[selectedId]);
 useEffect(()=>{current.current.paused=paused;current.current.paint();current.current.refresh();},[paused]);
 useEffect(()=>{current.current.zoom=zoom;current.current.paint();},[zoom]);
 function selectFallback(direction){
  const index=WORLD_REALMS.findIndex(r=>r.id===current.current.selectedId);
  current.current.onSelect?.(WORLD_REALMS[(index+(direction<0?7:1)+8)%8].id);
 }
 useEffect(()=>{
  const el=canvas.current,host=el?.parentElement;
  if(!el||!host||!THREE.WebGLRenderer)return;
  let renderer;
  try{
   renderer=new THREE.WebGLRenderer({canvas:el,alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
  }catch{return;}
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,80);
  camera.position.z=3.65;
  const root=new THREE.Group();root.rotation.y=.12;root.rotation.x=.07;scene.add(root);
  scene.add(new THREE.AmbientLight(0x598fb4,1.12));
  const sun=new THREE.DirectionalLight(0xffffff,2.45);sun.position.set(-2.5,1.6,4.5);scene.add(sun);
  const rim=new THREE.DirectionalLight(0xe9ad64,.72);rim.position.set(3,-1,-3);scene.add(rim);
  const geoSphere=new THREE.SphereGeometry(1,56,40);
  const material=new THREE.MeshPhongMaterial({color:0xd1eaff,shininess:15,specular:0x123352});
  const earth=new THREE.Mesh(geoSphere,material);root.add(earth);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.085,48,32),new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide,
   uniforms:{glowColor:{value:new THREE.Color(0x3c8de5)}},
   vertexShader:'varying vec3 n; varying vec3 viewNormal; void main(){ vec4 worldPos=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); viewNormal=normalize(-worldPos.xyz); gl_Position=projectionMatrix*worldPos; }',
   fragmentShader:'uniform vec3 glowColor; varying vec3 n; varying vec3 viewNormal; void main(){float fresnel=pow(1.-abs(dot(normalize(n),normalize(viewNormal))),3.);gl_FragColor=vec4(glowColor,clamp(fresnel*.78,0.,.53));}'
  }));
  scene.add(atmosphere);
  const ringMat=new THREE.MeshBasicMaterial({color:0x75b4de,transparent:true,opacity:.24,depthWrite:false});
  const goldRingMat=new THREE.MeshBasicMaterial({color:0xcba267,transparent:true,opacity:.40,depthWrite:false});
  const orbit1=new THREE.Mesh(new THREE.TorusGeometry(1.28,.0028,4,144),ringMat);
  orbit1.rotation.set(1.14,.25,-.19);scene.add(orbit1);
  const orbit2=new THREE.Mesh(new THREE.TorusGeometry(1.36,.0036,4,144),goldRingMat);
  orbit2.rotation.set(.43,.59,.72);scene.add(orbit2);
  const markerGeometry=new THREE.SphereGeometry(.025,10,8);
  const markers=WORLD_REALMS.map(r=>{
   const m=new THREE.Mesh(markerGeometry,new THREE.MeshBasicMaterial({color:0xc2e9ff}));
   m.position.copy(geo(r.lat,r.lon));m.userData.id=r.id;root.add(m);return m;
  });
  const starGeo=new THREE.BufferGeometry(),positions=new Float32Array(240*3);
  for(let i=0;i<240;i++){
   const theta=i*2.39996;const z=1-2*(i+.5)/240;const r=Math.sqrt(1-z*z);
   positions[3*i]=r*Math.cos(theta)*17;
   positions[3*i+1]=r*Math.sin(theta)*17;
   positions[3*i+2]=z*17;
  }
  starGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xbad8ee,size:.022,sizeAttenuation:true,transparent:true,opacity:.72}));scene.add(stars);
  const textureLoader=new THREE.TextureLoader();
  let disposed=false,texture=null;
  textureLoader.load('/art/earth/nasa-bluemarble-2048.png',t=>{
   if(disposed){t.dispose();return;}
   texture=t;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
   material.map=t;material.color.set(0xffffff);material.needsUpdate=true;
   setReady(true);render();
  },undefined,()=>{setReady(false);});
  let width=420,height=420,raf=0,last=0,visible=true,active=true,drag=null;
  const pointerMap=new Map();let pinch=null;
  const prefersMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const coarse=window.matchMedia?.('(pointer: coarse)')?.matches;
  const economical=()=>document.documentElement.dataset.experienceQuality==='economical';
  const reduced=()=>prefersMotion?.matches||document.documentElement.dataset.experienceMotion==='reduced'||document.documentElement.dataset.motion==='reduced';
  const resize=()=>{
   const box=host.getBoundingClientRect();
   width=Math.max(180,Math.round(box.width||420));height=Math.max(180,Math.round(box.height||width));
   const dpr=Math.min(window.devicePixelRatio||1,coarse||economical()?1.15:1.65);
   renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
   camera.aspect=width/height;camera.updateProjectionMatrix();render();
  };
  function render(){
   if(!active)return;
   camera.position.z=3.65/Math.max(.8,Math.min(1.34,current.current.zoom||1));
   const selected=current.current.selectedId;
   markers.forEach(m=>{const active=m.userData.id===selected;m.scale.setScalar(active?1.52:1);m.material.color.setHex(active?0xffd68b:0x7bcdff);});
   renderer.render(scene,camera);
  }
  current.current.paint=render;
  const canAnimate=()=>active&&visible&&!document.hidden&&!reduced()&&!current.current.paused&&!pointerMap.size;
  function animate(time){
   raf=0;if(!canAnimate())return;
   const interval=economical()?105:coarse?72:48;
   if(time-last>=interval){root.rotation.y+=.00105*Math.min(3,(time-last)/48);last=time;render();}
   schedule();
  }
  function schedule(){if(canAnimate()&&!raf)raf=requestAnimationFrame(animate);}
  function refresh(){if(canAnimate())schedule();else if(raf){cancelAnimationFrame(raf);raf=0;}}
  current.current.refresh=refresh;
  const vector=new THREE.Vector3();
  function nearestRealm(x,y){
   const rect=el.getBoundingClientRect(),ndcX=((x-rect.left)/rect.width)*2-1,ndcY=-((y-rect.top)/rect.height)*2+1;
   let best=null,distance=.16;
   root.updateMatrixWorld(true);
   for(const m of markers){
    m.getWorldPosition(vector);if(vector.z<.08)continue;
    const projected=vector.clone().project(camera);
    const delta=Math.hypot(projected.x-ndcX,projected.y-ndcY);
    if(delta<distance){distance=delta;best=m.userData.id;}
   }
   return best;
  }
  function down(e){
   if(e.pointerType==='mouse'&&e.button!==0)return;
   pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY,originalX:e.clientX,originalY:e.clientY});
   try{el.setPointerCapture(e.pointerId);}catch{}
   if(pointerMap.size===2){const [a,b]=[...pointerMap.values()];pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:current.current.zoom||1};}
   refresh();
  }
  function move(e){
   const old=pointerMap.get(e.pointerId);if(!old)return;
   if(pinch&&pointerMap.size===2){
    const points=[...pointerMap.values()].map(p=>p===old?{...p,x:e.clientX,y:e.clientY}:p);
    const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    current.current.zoom=Math.max(.8,Math.min(1.34,pinch.zoom*distance/pinch.distance));render();
   }else{
    root.rotation.y+=(e.clientX-old.x)*.006;
    root.rotation.x=Math.max(-.43,Math.min(.43,root.rotation.x+(e.clientY-old.y)*.003));render();
   }
   old.x=e.clientX;old.y=e.clientY;
  }
  function up(e){
   const p=pointerMap.get(e.pointerId);pointerMap.delete(e.pointerId);refresh();
   if(pinch){if(pointerMap.size<2)pinch=null;return;}
   if(p&&Math.hypot(e.clientX-p.originalX,e.clientY-p.originalY)<11){
    const id=nearestRealm(e.clientX,e.clientY);if(id)current.current.onSelect?.(id);
   }
  }
  function key(e){
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();
    if(e.key==='ArrowLeft')root.rotation.y-=.14;
    if(e.key==='ArrowRight')root.rotation.y+=.14;
    if(e.key==='ArrowUp')root.rotation.x=Math.max(-.43,root.rotation.x-.08);
    if(e.key==='ArrowDown')root.rotation.x=Math.min(.43,root.rotation.x+.08);
    render();
   }
  }
  function onVisible(entries){visible=Boolean(entries[0]?.isIntersecting);if(visible)render();refresh();}
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  const io=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(onVisible):null;
  const onVisibility=()=>{if(!document.hidden)render();refresh();};
  const onMotion=()=>{render();refresh();};
  const onContextLost=event=>{event.preventDefault();setReady(false);};
  const onContextRestored=()=>{setReady(Boolean(texture));render();};
  ro?.observe(host);io?.observe(el);
  prefersMotion?.addEventListener?.('change',onMotion);
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('keydown',key);
  el.addEventListener('webglcontextlost',onContextLost);el.addEventListener('webglcontextrestored',onContextRestored);
  document.addEventListener('visibilitychange',onVisibility);
  resize();schedule();
  return()=>{
   disposed=true;active=false;cancelAnimationFrame(raf);ro?.disconnect();io?.disconnect();
   prefersMotion?.removeEventListener?.('change',onMotion);
   el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);
   el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.removeEventListener('keydown',key);
   document.removeEventListener('visibilitychange',onVisibility);
   el.removeEventListener('webglcontextlost',onContextLost);el.removeEventListener('webglcontextrestored',onContextRestored);
   markerGeometry.dispose();for(const m of markers)m.material.dispose();
   geoSphere.dispose();material.dispose();atmosphere.geometry.dispose();atmosphere.material.dispose();
   orbit1.geometry.dispose();orbit2.geometry.dispose();ringMat.dispose();goldRingMat.dispose();
   starGeo.dispose();stars.material.dispose();texture?.dispose();
   renderer.dispose();renderer.forceContextLoss();current.current.paint=()=>{};current.current.refresh=()=>{};
  };
 },[]);
 return <div className={'th-earth3d'+(ready?' is-ready':'')}>
   <div className="th-earth-fallback" tabIndex={0} role="button" aria-label="Explorer les royaumes terrestres : glisser ou appuyer sur les flèches" style={{transform:`scale(${zoom})`}}
    onPointerDown={event=>{fallbackSwipe.current={x:event.clientX,y:event.clientY};try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}}}
    onPointerUp={event=>{const last=fallbackSwipe.current;fallbackSwipe.current=null;if(last){const delta=event.clientX-last.x;selectFallback(delta>25?-1:1);}}}
    onPointerCancel={()=>{fallbackSwipe.current=null;}}
    onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='Enter'){event.preventDefault();selectFallback(event.key==='ArrowLeft'?-1:1);}}}>
    <img src="/art/earth/nasa-globe-disc-square.jpg" alt="" />
    <HeritageSignalNetwork/>
   </div>
   <canvas ref={canvas} tabIndex={0} aria-label="Globe 3D terrestre interactif des huit royaumes. Glisse pour tourner, pince pour zoomer ou utilise les flèches du clavier."/>
 </div>;
}
