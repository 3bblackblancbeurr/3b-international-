// Perspective tunnel rendered in a single canvas. No React updates per frame.
// Hard caps: DPR 1.5, 16 structural rings, 72 light particles, 56 wall glyphs.
export function mountNexusTunnel(canvas, { reducedMotion = false } = {}) {
  if (!canvas?.getContext) return () => {};
  let ctx;
  try { ctx = canvas.getContext('2d', { alpha: false }); } catch { return () => {}; }
  if (!ctx) return () => {};
  const win = canvas.ownerDocument.defaultView;
  const doc = canvas.ownerDocument;
  let width = 1, height = 1, frame = 0, disposed = false, elapsed = 0, previous = 0;
  const glyphs = '3B0101HERITAGE';
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    const dpr = Math.min(win.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reducedMotion) draw(0);
  }
  function draw(time) {
    const cx = width*.5, cy = height*.46, lens = Math.max(width,height)*.7;
    const project = (angle,z,r=2.65) => [cx+Math.cos(angle)*r*lens/z,cy+Math.sin(angle)*r*lens/z];
    ctx.fillStyle = '#03070e'; ctx.fillRect(0,0,width,height);
    const light = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(width,height)*.55);
    light.addColorStop(0,'#245174'); light.addColorStop(.075,'#102b46'); light.addColorStop(.34,'#07111e'); light.addColorStop(1,'#02050a');
    ctx.fillStyle = light; ctx.fillRect(0,0,width,height);
    // Longitudinal edges anchor the perspective; only the camera advances.
    for(let side=0;side<16;side++) {
      const a=side*Math.PI/8;
      const far=project(a,24),near=project(a,1.1);
      const beam=ctx.createLinearGradient(...far,...near);
      beam.addColorStop(0,'rgba(121,195,226,.025)');beam.addColorStop(.42,side%4===0?'rgba(176,158,120,.42)':'rgba(75,140,191,.23)');beam.addColorStop(1,'rgba(42,102,151,0)');
      ctx.strokeStyle=beam;ctx.lineWidth=side%4===0?1.4:.7;ctx.beginPath();ctx.moveTo(...far);ctx.lineTo(...near);ctx.stroke();
    }
    for(let ring=0;ring<16;ring++) {
      const z=1.2+((ring*1.45-time*3.8)%23.2+23.2)%23.2;
      const alpha=Math.min(.56,z/6,(25-z)/10);
      ctx.strokeStyle=ring%4===0?`rgba(204,182,140,${alpha})`:`rgba(102,179,223,${alpha*.75})`;
      ctx.lineWidth=ring%4===0?1.3:.75;ctx.beginPath();
      for(let s=0;s<=16;s++){const p=project(s*Math.PI/8,z);if(!s)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.stroke();
      // Architectural ribs, deliberately not a spinning vortex or a flashing ring.
      if(ring%2===0){ctx.strokeStyle=`rgba(63,99,128,${alpha*.5})`;ctx.lineWidth=6/z;ctx.beginPath();for(let s=0;s<=16;s++){const p=project(s*Math.PI/8,z,2.72);if(!s)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.stroke();}
    }
    for(let i=0;i<56;i++) {
      const z=2.2+((i*1.31-time*3.8)%21+21)%21;
      const a=(i%14)*Math.PI/7+.045;
      const [x,y]=project(a,z,2.53);
      if(x<0||x>width||y<0||y>height)continue;
      const size=Math.min(22,Math.max(6,70/z));ctx.font=`${size}px monospace`;
      ctx.fillStyle=`rgba(108,190,226,${Math.min(.5,z/10,(24-z)/8)})`;
      ctx.fillText(glyphs[i%glyphs.length],x,y);
    }
    for(let i=0;i<72;i++) {
      const z=.8+((i*.87-time*4.5)%24+24)%24;
      const a=i*2.39996,r=.35+(i%13)*.17;
      const p=project(a,z,r),tail=project(a,z+.06+(i%5)*.025,r);
      ctx.strokeStyle=i%7===0?'rgba(216,198,160,.48)':'rgba(132,193,234,.38)';ctx.lineWidth=i%5===0?1.25:.7;
      ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...tail);ctx.stroke();
    }
    const vignette=ctx.createRadialGradient(cx,cy,Math.min(width,height)*.1,cx,cy,Math.max(width,height)*.7);
    vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.55,'rgba(0,0,0,.12)');vignette.addColorStop(1,'rgba(0,0,0,.86)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  }
  function tick(now) {
    frame=0;if(disposed||doc.hidden)return;
    elapsed+=previous?Math.min((now-previous)/1000,.04):0;previous=now;
    draw(elapsed);frame=win.requestAnimationFrame(tick);
  }
  function visibility() {
    if(frame)win.cancelAnimationFrame(frame);frame=0;previous=0;
    if(!disposed&&!doc.hidden&&!reducedMotion)frame=win.requestAnimationFrame(tick);
  }
  resize();draw(0);
  const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;
  if(observer)observer.observe(canvas);else win.addEventListener('resize',resize);
  doc.addEventListener('visibilitychange',visibility);
  if(!reducedMotion&&!doc.hidden)frame=win.requestAnimationFrame(tick);
  return () => {disposed=true;if(frame)win.cancelAnimationFrame(frame);observer?.disconnect();win.removeEventListener('resize',resize);doc.removeEventListener('visibilitychange',visibility);};
}
