import {useEffect,useRef} from 'react';
import {WORLD_REALMS} from './world-living-data.js';

// 21 simplified Natural Earth/GSHHS land rings, quantized to one tenth of a degree.
// Unlike a screenshot, this globe is projected and repainted from actual geographic outlines.
const LAND_RINGS_PACKED='vgAIB4sC1waHAvYGhAL/Bm8CZAZYAlMGRAJiBjICHwb9ARgGNwJ1BnECQgZeAkQGbAIfBmcCEAZQApEFUAJIBSUChgUVAnwF6gFHBbMBJgWxAfsEjQELBV8B8QRXAe8EWgHoBI0BuwSDAcMEmgGZBIcBqARzAcsEdgGoBF4BwwQ9AbEEQAHDBDUBsQQuAcQEJAGNBOUAbgTnAE8EygBIBNoAKgTSACAEvQBBBJgAQgRyABgEWADoA4UA4ANdABMEDgD1AxwA1wNSANEDpgCuA6AAkgPkAHAD3gAjA50AHwNnAAcDUQDfAqEA2QLfAMQCzwCxAt8AwALmAJkCAAEZAgsB6QEwAd0BJgEBAvMANQIIAVYC3gAmAqoAswF/AF4BJwFWARUBRgErAWoBcAESAW8BBQGLAU0BpAGeAZ4BbgHEAYkB2QFgAdEBbgHGAVQBvAFFAcYBUAHOAS0B0AERAagBIgGaAeIAlQHxAH4B6ABsAcQAogGHAMoBfAC6AbkAkQGpAJQBoQB7AZ0AkAFXALwBIQCxAev/bwHI/2gBof+EAaP/rwHw/7IB9f/PAdD/5QFiABcCVgA7AmsAQQJeACQCbQAcAsIAHgLZAEAC9AA8AusAUAIvAVgC1gBeAtMAdAL/AIoC4gCTArEAdgKsAF8CvwBVAqIASgKeADECgAAqAmwAVwI5AEoCRwBdAjIAYgJHAGECTQBkAjMAbgJuAHoCXwB8ArUAtwL2AMYCngGfAj8BnwJ2AX4CcAGMArkBlAKxAa8C0QGpAsEBogLMAZwCGwKyAlYCqwJgArsCqwKpArUCsQKbAscCzALZAuACrAKzApoC0QKWAusCsAL+ArICAwOmAhQDowIJA7EC9wK1AuICtALaAsoC7ALYAvkCyAJBA80CNAPCAkQDuQJFA8wCJQPgAhEECQNzBPYCYwT2AnAE8AIuBOACHwTXAtwE4gIIBdwCHgXDAnkFygJvBdMCgQXZAjUGxQJLBrQC4Qa7AggHsgIIB4sCcQC5/HEA5fxZANz8SACn/GMAlvyGAPX7twCC+z8BufvoAJ77+ABq+00BK/uFASH75AEz+9YBN/voAQL7AAIK+w8C5/ogAu/6JgLt+i8C1vosArf6UwKp+kYCSfpjAhP6UAIs+mcCxPksAp75JALg+U4Cq/lKAqr5WgKD+WcCuPmHAm/5kQK++ZkC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';

function decodeLand(){
 const bytes=Uint8Array.from(atob(LAND_RINGS_PACKED),ch=>ch.charCodeAt(0));
 const view=new DataView(bytes.buffer);const rings=[];let i=0;
 while(i+2<=bytes.length){
  const count=view.getUint16(i,true);i+=2;
  if(count<3||i+count*4>bytes.length)break;
  const ring=[];for(let n=0;n<count;n++){ring.push([view.getInt16(i,true)/10,view.getInt16(i+2,true)/10]);i+=4;}
  rings.push(ring);
 }
 return rings;
}
const LAND=typeof atob==='function'?decodeLand():[];
const RAD=Math.PI/180,TAU=Math.PI*2;
function project(lon,lat,centerLon,centerLat,cx,cy,r){
 const lambda=lon*RAD-centerLon,phi=lat*RAD,clat=Math.cos(phi),slat=Math.sin(phi);
 const z=slat*Math.sin(centerLat)+clat*Math.cos(centerLat)*Math.cos(lambda);
 return {x:cx+r*clat*Math.sin(lambda),y:cy-r*(slat*Math.cos(centerLat)-clat*Math.cos(lambda)*Math.sin(centerLat)),z};
}

export default function LivingWorldGlobe({selectedId='france',onSelect}){
 const ref=useRef(null),control=useRef({angle:10*RAD,lat:23*RAD,draw:()=>{},selectedId,onSelect,drag:null});
 control.current.onSelect=onSelect;
 useEffect(()=>{
  const item=WORLD_REALMS.find(r=>r.id===selectedId);
  control.current.selectedId=selectedId;
  if(item){control.current.angle=item.lon*RAD;control.current.lat=Math.max(-5,Math.min(48,item.lat*.42))*RAD;}
  control.current.draw();
 },[selectedId]);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d',{alpha:true});
  if(!ctx)return;
  const state=control.current;
  let width=320,raf=0,last=0,visible=true,menuOpen=false,active=true;
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced=()=>media?.matches||document.documentElement.dataset.motion==='reduced';
  function resize(){
   width=Math.max(220,Math.min(660,Math.round(canvas.getBoundingClientRect().width||320)));
   const dpr=Math.min(window.devicePixelRatio||1,1.5);
   const target=Math.round(width*dpr);
   if(canvas.width!==target||canvas.height!==target){canvas.width=target;canvas.height=target;canvas.style.height=width+'px';}
   ctx.setTransform(dpr,0,0,dpr,0,0);
   draw();
  }
  function draw(){
   const size=width,cx=size/2,cy=size/2,r=size*.431;
   ctx.clearRect(0,0,size,size);
   const halo=ctx.createRadialGradient(cx,cy,r*.4,cx,cy,r*1.15);
   halo.addColorStop(0,'rgba(44,149,245,.02)');halo.addColorStop(.78,'rgba(34,134,255,.045)');halo.addColorStop(.96,'rgba(54,171,255,.35)');halo.addColorStop(1,'rgba(52,159,255,0)');
   ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,r*1.15,0,TAU);ctx.fill();
   ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();
   const ocean=ctx.createRadialGradient(cx-r*.36,cy-r*.45,r*.08,cx,cy,r*1.35);
   ocean.addColorStop(0,'#135b9a');ocean.addColorStop(.36,'#073a74');ocean.addColorStop(.78,'#04182e');ocean.addColorStop(1,'#02070f');
   ctx.fillStyle=ocean;ctx.fillRect(cx-r,cy-r,r*2,r*2);
   ctx.strokeStyle='rgba(78,174,245,.13)';ctx.lineWidth=.85;
   for(let lat=-75;lat<=75;lat+=15){
    ctx.beginPath();let started=false;
    for(let lon=-180;lon<=180;lon+=3){const p=project(lon,lat,state.angle,state.lat,cx,cy,r);if(p.z>0){if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}else started=false;}
    ctx.stroke();
   }
   for(let lon=-180;lon<180;lon+=20){
    ctx.beginPath();let started=false;
    for(let lat=-85;lat<=85;lat+=3){const p=project(lon,lat,state.angle,state.lat,cx,cy,r);if(p.z>0){if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}else started=false;}
    ctx.stroke();
   }
   // Clipped orthographic polygons: land genuinely rotates with the sphere.
   for(const ring of LAND){
    let started=false;ctx.beginPath();
    for(let k=0;k<ring.length;k++){
     const [lon,lat]=ring[k],p=project(lon,lat,state.angle,state.lat,cx,cy,r);
     if(p.z>.012){if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}
     else if(started){ctx.closePath();started=false;}
    }
    ctx.closePath();ctx.fillStyle='rgba(22,69,99,.94)';ctx.fill();
    ctx.strokeStyle='rgba(209,174,100,.67)';ctx.lineWidth=.68;ctx.stroke();
   }
   const light=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);
   light.addColorStop(0,'rgba(105,198,255,.20)');light.addColorStop(.37,'transparent');light.addColorStop(1,'rgba(2,4,9,.72)');
   ctx.fillStyle=light;ctx.fillRect(cx-r,cy-r,r*2,r*2);
   const dots=WORLD_REALMS.map(item=>({...item,...project(item.lon,item.lat,state.angle,state.lat,cx,cy,r)})).filter(item=>item.z>.03);
   // Connections are links between fictional 3B realms, not claimed live network traffic.
   ctx.lineWidth=1;ctx.strokeStyle='rgba(92,184,255,.57)';
   for(let i=0;i<dots.length;i++)for(let j=i+1;j<dots.length;j++){
    if((i+j)%3===0){ctx.beginPath();ctx.moveTo(dots[i].x,dots[i].y);ctx.quadraticCurveTo((dots[i].x+dots[j].x)/2,Math.min(dots[i].y,dots[j].y)-16,dots[j].x,dots[j].y);ctx.stroke();}
   }
   for(const dot of dots){
    const selected=dot.id===state.selectedId;
    ctx.beginPath();ctx.arc(dot.x,dot.y,selected?7:4.4,0,TAU);ctx.fillStyle=selected?'#ffe5a8':'#66c7ff';ctx.shadowColor=selected?'#f2b94b':'#0a9afa';ctx.shadowBlur=selected?17:9;ctx.fill();ctx.shadowBlur=0;
    if(selected){ctx.beginPath();ctx.arc(dot.x,dot.y,13,0,TAU);ctx.strokeStyle='#f8d393';ctx.lineWidth=1.8;ctx.stroke();}
   }
   ctx.restore();
   ctx.beginPath();ctx.arc(cx,cy,r+1,0,TAU);
   ctx.strokeStyle='rgba(104,198,255,.67)';ctx.lineWidth=1.9;ctx.stroke();
   ctx.beginPath();ctx.ellipse(cx,cy,r*1.09,r*.29,-.18,0,TAU);
   ctx.strokeStyle='rgba(236,192,110,.40)';ctx.lineWidth=1.4;ctx.stroke();
   ctx.beginPath();ctx.arc(cx,cy,r*1.087,Math.PI*.15,Math.PI*.68);
   ctx.strokeStyle='rgba(255,204,118,.8)';ctx.lineWidth=2.4;ctx.stroke();
  }
  state.draw=draw;
  function tick(time){
   if(!active)return;
   if(visible&&!menuOpen&&!document.hidden&&time-last>34){
    if(!reduced()&&!state.drag)state.angle+=.000008*Math.min(70,time-last||34);
    draw();last=time;
   }
   raf=requestAnimationFrame(tick);
  }
  const onVisibility=()=>{if(!document.hidden)draw();};
  const onMenu=event=>{menuOpen=!!event.detail?.open;};
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting;if(visible)draw();},{threshold:.05}):null;
  observer?.observe(canvas);
  const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  resizeObserver?.observe(canvas);
  window.addEventListener('resize',resize);
  window.addEventListener('threeb:app-menu-state',onMenu);
  document.addEventListener('visibilitychange',onVisibility);
  resize();raf=requestAnimationFrame(tick);
  return()=>{active=false;cancelAnimationFrame(raf);observer?.disconnect();resizeObserver?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('threeb:app-menu-state',onMenu);document.removeEventListener('visibilitychange',onVisibility);state.draw=()=>{};};
 },[]);
 function onPointerDown(event){
  if(event.button!==0)return;
  control.current.drag={x:event.clientX,y:event.clientY,origX:event.clientX,origY:event.clientY};
  event.currentTarget.setPointerCapture?.(event.pointerId);
 }
 function onPointerMove(event){
  const d=control.current.drag;if(!d)return;
  control.current.angle-=(event.clientX-d.x)*.009;
  control.current.lat=Math.max(-.8,Math.min(1.1,control.current.lat+(event.clientY-d.y)*.004));
  d.x=event.clientX;d.y=event.clientY;control.current.draw();
 }
 function onPointerUp(event){
  const d=control.current.drag;control.current.drag=null;if(!d)return;
  if(Math.hypot(event.clientX-d.origX,event.clientY-d.origY)>12)return;
  const rect=event.currentTarget.getBoundingClientRect(),size=rect.width,cx=size/2,cy=rect.height/2,r=size*.431;
  const x=event.clientX-rect.left,y=event.clientY-rect.top;
  const hits=WORLD_REALMS.map(item=>({...item,...project(item.lon,item.lat,control.current.angle,control.current.lat,cx,cy,r)})).filter(p=>p.z>.02);
  const hit=hits.sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];
  if(hit&&Math.hypot(x-hit.x,y-hit.y)<26)control.current.onSelect?.(hit.id);
 }
 function onKeyDown(event){
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();control.current.angle+=(event.key==='ArrowLeft'?-1:1)*.22;control.current.draw();}
 }
 return <canvas ref={ref} className="world-living-globe-canvas" width="480" height="480"
  aria-label="Globe interactif des huit royaumes du Monde du 3B. Glissez pour le faire tourner, utilisez les flèches ou choisissez un pays dans la liste."
  role="img" tabIndex={0} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={()=>{control.current.drag=null;}}/>;
}
