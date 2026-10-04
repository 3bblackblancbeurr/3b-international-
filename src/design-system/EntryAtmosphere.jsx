import { useEffect, useRef } from 'react';

/** One bounded canvas, no network assets, and no animation work in hidden tabs. */
export default function EntryAtmosphere({ policy }) {
  const canvas = useRef(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !policy.animate || policy.economical) return;
    const ctx = element.getContext('2d', { alpha: true });
    if (!ctx) return;
    const host = element.closest('.intro3b');
    let width=0, height=0, frame=0, last=0, time=0;
    const pointer={x:.5,y:.5}, eased={x:.5,y:.5};
    let ripple=null;
    const root=getComputedStyle(document.documentElement);
    const gold=root.getPropertyValue('--3b-champagne').trim(), blue=root.getPropertyValue('--3b-matrix').trim();
    const particles=Array.from({length:36},(_,i)=>({x:(i*0.61803398875)%1,y:(i*.41421356237)%1,r:1+(i%3)*.5,phase:i*2.3}));
    const resize=()=>{
      const rect=host.getBoundingClientRect(); width=rect.width; height=rect.height;
      const dpr=Math.min(window.devicePixelRatio||1,1.5);
      element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    const move=event=>{const rect=host.getBoundingClientRect();pointer.x=Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)));pointer.y=Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)));};
    const leave=()=>{pointer.x=.5;pointer.y=.5;};
    const press=event=>{move(event);ripple={x:pointer.x*width,y:pointer.y*height,age:0};};
    const draw=now=>{
      frame=requestAnimationFrame(draw);
      if(now-last<33)return;
      const dt=Math.min((now-last)||33,50); last=now; time+=dt;
      eased.x+=(pointer.x-eased.x)*.05;eased.y+=(pointer.y-eased.y)*.05;
      ctx.clearRect(0,0,width,height);
      const cx=width*.5+(eased.x-.5)*32,cy=height*.43+(eased.y-.5)*24;
      const radius=Math.min(width*.66,height*.54,520);
      const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
      glow.addColorStop(0,blue);glow.addColorStop(1,'transparent');
      ctx.globalAlpha=.065;ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      for(let ring=0;ring<4;ring++){
        ctx.save();ctx.translate(cx,cy);ctx.rotate(-.36+ring*.13+Math.sin(time/12000)*.025);
        ctx.strokeStyle=ring%2?blue:gold;ctx.globalAlpha=.12-ring*.018;ctx.lineWidth=ring===0?1.2:.7;
        ctx.beginPath();ctx.ellipse(0,0,radius*(.73+ring*.12),radius*(.35+ring*.055),0,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      const points=particles.map(p=>({x:p.x*width+(eased.x-.5)*18+Math.sin(time/9000+p.phase)*12,y:p.y*height+(eased.y-.5)*14+Math.cos(time/11000+p.phase)*10,r:p.r}));
      points.forEach((p,i)=>{
        ctx.fillStyle=i%3?gold:blue;ctx.globalAlpha=.25+.15*Math.sin(time/2400+i);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
        const distance=Math.hypot(p.x-eased.x*width,p.y-eased.y*height);
        if(distance<140){ctx.globalAlpha=(1-distance/140)*.17;ctx.strokeStyle=blue;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(eased.x*width,eased.y*height);ctx.stroke();}
      });
      if(ripple){ripple.age+=dt;ctx.strokeStyle=gold;ctx.globalAlpha=Math.max(0,1-ripple.age/1200)*.24;ctx.lineWidth=1;ctx.beginPath();ctx.arc(ripple.x,ripple.y,12+ripple.age*.12,0,Math.PI*2);ctx.stroke();if(ripple.age>=1200)ripple=null;}
      ctx.globalAlpha=1;
    };
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;last=0;if(!document.hidden)frame=requestAnimationFrame(draw);};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();visibility();
    host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);host.addEventListener('pointerdown',press,{passive:true});document.addEventListener('visibilitychange',visibility);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerdown',press);document.removeEventListener('visibilitychange',visibility);};
  },[policy.animate,policy.economical]);
  return <div className="entry-atmosphere" aria-hidden="true"><div className="entry-atmosphere-aura"/><canvas ref={canvas} className="entry-atmosphere-canvas"/><div className="entry-atmosphere-vignette"/></div>;
}
