import {useEffect,useRef,useState} from 'react';
// Procedural articulated digital sculpture; no external model or biometric data.
export default function AlbertAvatar3D({busy=false,speaking=false,listening=false,reduced=false,paused=false,cinematic=false}){
 const host=useRef(null),state=useRef({}),[failed,setFailed]=useState(false);state.current={busy,speaking,listening,reduced,paused,cinematic};
 useEffect(()=>{
  let disposed=false,cleanup=()=>{};
  import('three').then(T=>{
   if(disposed)return;
   const el=host.current;let renderer;
   try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFailed(true);return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;el.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,40);camera.position.set(0,.35,6);
   const body=new T.Group();scene.add(body);body.rotation.y=-.16;
   const materials=[],geometries=[];
   const mat=(color,emissive=0)=>{const m=new T.MeshPhysicalMaterial({color,metalness:.72,roughness:.28,clearcoat:1,emissive,emissiveIntensity:1.1});materials.push(m);return m;};
   const shell=mat(0x173b57),edge=mat(0x2b95bc,0x125473),dark=mat(0x030b18),light=mat(0x9ceaff,0x36bfff),ivory=mat(0x93bacb);
   function mesh(geo,material,parent,x,y,z,sx=1,sy=1,sz=1){geometries.push(geo);const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
   const ball=(material,parent,x,y,z,sx,sy,sz)=>mesh(new T.SphereGeometry(1,32,24),material,parent,x,y,z,sx,sy,sz);
   ball(shell,body,0,-.95,0,.88,.52,.39);
   mesh(new T.TorusGeometry(.21,.018,8,50),light,body,0,-.88,.395);
   mesh(new T.CylinderGeometry(.14,.19,.38,24),edge,body,0,-.42,0);
   const head=new T.Group();head.position.y=.35;body.add(head);
   ball(shell,head,0,.03,0,.48,.67,.4);
   ball(ivory,head,0,-.10,.23,.395,.49,.235);
   ball(dark,head,0,.12,.414,.355,.16,.06);
   const eyeL=ball(light,head,-.155,.14,.467,.079,.033,.023),eyeR=ball(light,head,.155,.14,.467,.079,.033,.023);
   ball(edge,head,0,-.04,.469,.049,.108,.05);
   const mouth=ball(dark,head,0,-.25,.448,.105,.016,.02);
   mesh(new T.TorusGeometry(.45,.012,8,70),light,head,0,.1,-.12,1,1.38,1);
   for(const sign of [-1,1]){
    ball(dark,head,sign*.463,.05,0,.055,.18,.16);
    ball(edge,head,sign*.5,.05,.02,.035,.12,.105);
    const arm=new T.Group();arm.position.set(sign*.78,-.72,0);body.add(arm);
    ball(edge,arm,0,0,0,.23,.22,.23);
    const upper=mesh(new T.CapsuleGeometry(.14,.38,6,16),shell,arm,sign*.13,-.36,.015);upper.rotation.z=sign*.24;
    ball(edge,arm,sign*.2,-.64,.02,.145,.145,.145);
    const lower=mesh(new T.CapsuleGeometry(.115,.31,6,16),shell,arm,sign*.23,-.89,.12);lower.rotation.x=-.35;
    ball(ivory,arm,sign*.25,-1.15,.2,.12,.15,.09);
    arm.userData.sign=sign;arm.name='arm';
   }
   const orbit=new T.Group();scene.add(orbit);
   for(let i=0;i<3;i++){const ring=mesh(new T.TorusGeometry(1.3+i*.18,.006,6,100),edge,orbit,0,-.75,0);ring.rotation.x=Math.PI/2+(i-1)*.15;ring.rotation.z=i*.2;}
   const positions=new Float32Array(600);for(let i=0;i<600;i+=3){positions[i]=(Math.random()-.5)*4;positions[i+1]=(Math.random()-.5)*4;positions[i+2]=(Math.random()-.5)*2;}
   const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(positions,3));geometries.push(pg);const pm=new T.PointsMaterial({color:0x72d8ff,size:.018,transparent:true,opacity:.55});materials.push(pm);const particles=new T.Points(pg,pm);scene.add(particles);
   scene.add(new T.HemisphereLight(0xa4dfff,0x050810,2));const key=new T.DirectionalLight(0xc2efff,5);key.position.set(-3,4,5);scene.add(key);const rim=new T.DirectionalLight(0x627bff,4);rim.position.set(3,0,-3);scene.add(rim);
   let onScreen=true,raf=0,last=0,time=0,renderedReduced=false,contextLost=false;const pointer={x:0,y:0};
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);};
   const observer=new ResizeObserver(resize);observer.observe(el);
   const intersection=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;});intersection.observe(el);
   const move=e=>{const rect=el.getBoundingClientRect();pointer.x=(e.clientX-rect.left)/rect.width-.5;pointer.y=(e.clientY-rect.top)/rect.height-.5;};el.addEventListener('pointermove',move);
   const lost=e=>{e.preventDefault();contextLost=true;setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
   function draw(now){
    raf=requestAnimationFrame(draw);const props=state.current;
    if(disposed||contextLost||document.hidden||!onScreen||props.paused||now-last<33)return;
    if(props.reduced&&renderedReduced)return;renderedReduced=props.reduced;
    const dt=Math.min((now-last)/1000,.06);last=now;
    if(!props.reduced){
     time+=dt;body.position.y=Math.sin(time*1.4)*.025;
     head.rotation.y+=(pointer.x*.4+(props.listening ? .13 : Math.sin(time*.4)*.04)-head.rotation.y)*.07;
     head.rotation.x+=(-pointer.y*.15+(props.busy?-.05:0)-head.rotation.x)*.06;
     const blink=Math.sin(time*1.2)>.996 ? .15 : 1;eyeL.scale.y=eyeR.scale.y=.033*blink;
     mouth.scale.y=props.speaking ? .025+Math.abs(Math.sin(time*12))*.04 : .016;
     for(const arm of body.children.filter(x=>x.name==='arm'))arm.rotation.z=Math.sin(time*1.2)*.025*arm.userData.sign+(props.speaking ? .08*arm.userData.sign : 0);
     orbit.rotation.y=time*(props.busy ? .23 : .06);particles.rotation.y=time*.015;
     if(props.cinematic){camera.position.z=6.3-Math.min(time/18,1)*1.1;camera.position.x=Math.sin(time*.14)*.5;camera.lookAt(0,-.25,0);}
    }
    renderer.render(scene,camera);
   }
   resize();raf=requestAnimationFrame(draw);
   cleanup=()=>{cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();el.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>{if(!disposed)setFailed(true);});
  return()=>{disposed=true;cleanup();};
 },[]);
 return failed?<div className="albert-portrait is-fallback" aria-label="Portrait de remplacement : rendu 3D indisponible"><img src="/albert/command-center.png" alt="Albert holographique"/></div>:<div ref={host} className="albert-avatar3d" role="img" aria-label="Albert, avatar 3D stylisé articulé"/>;
}
