import { useEffect, useId, useRef, useState } from 'react';
import { STAR_POSITIONS, sanitizeConstellation } from './constellation.js';
import { companionPoseAction } from './companion-pose.js';
import { COMPANION_ORIGINAL_ART, COMPANION_ART_ATLASES, companionArtSources, companionArtFrame, computeCoutureMotion, coutureFramePolicy } from './companion-art.js';
import '../styles/companion-avatar.css';

const assetLoads = new Map();
function loadArtwork(kind) {
  if (assetLoads.has(kind)) return assetLoads.get(kind);
  const sheet = COMPANION_ART_ATLASES[kind];
  const pending = new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img.naturalWidth === sheet.width && img.naturalHeight === sheet.height);
    img.onerror = () => { assetLoads.delete(kind); resolve(false); };
    img.src = sheet.src;
  });
  assetLoads.set(kind, pending);
  return pending;
}

/** The approved couture character and its authored poses share one light renderer. */
export default function CompanionAvatar({ mode = 'idle', interaction = '', bond = [], reduced = false, size = 118, title = 'Compagnon 3B', decorative = false, facing = 1, speaking = false, active = true }) {
  const id = `couture-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hostRef = useRef(null);
  const bodyRef = useRef(null);
  const cropRef = useRef(null);
  const imageRef = useRef(null);
  const detailRef = useRef(null);
  const shadowRef = useRef(null);
  const clockRef = useRef({ action: '', elapsed: 0 });
  const gazeRef = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState({});
  const width = Number.isFinite(size) ? Math.max(56, Math.min(480, size)) : 118;
  const height = Math.round(width * 1.38);
  const action = companionPoseAction(interaction || mode);
  const stars = sanitizeConstellation(bond);
  const current = useRef({});
  current.current = { action, reduced, active, facing, speaking, ready, size: width };
  const readyKey = Object.keys(ready).filter(key => ready[key]).sort().join(',');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const request = () => {
      if (document.hidden) return;
      // Atlases load only when needed. Shell and portrait reuse the same URLs.
      for (const kind of companionArtSources(action)) {
        if (!ready[kind]) loadArtwork(kind).then(loaded => {
          if (!cancelled && loaded) setReady(value => value[kind] ? value : { ...value, [kind]: true });
        });
      }
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', request); };
  }, [action, active, readyKey]);

  useEffect(() => {
    const host = hostRef.current;
    const body = bodyRef.current;
    const crop = cropRef.current;
    const artwork = imageRef.current;
    if (!host || !body || !crop || !artwork) return;
    let frame = 0;
    let stopped = false;
    let intersects = true;
    let lastTick = 0;
    let lastPaint = 0;
    let artKey = '';
    let sample = null;
    const policy = coutureFramePolicy(current.current);
    if (clockRef.current.action !== action) clockRef.current = { action, elapsed: 0 };

    const paint = (timestamp, snap = false) => {
      const props = current.current;
      const delta = lastTick ? Math.min(.075, Math.max(0, (timestamp-lastTick)/1000)) : 0;
      lastTick = timestamp;
      if (props.active && !props.reduced) clockRef.current.elapsed += delta;
      const time = clockRef.current.elapsed;
      const next = computeCoutureMotion({ ...props, time, gazeX:gazeRef.current.x, gazeY:gazeRef.current.y });
      const blend = snap || !sample || props.reduced ? 1 : 1-Math.exp(-delta*11);
      sample = Object.fromEntries(Object.entries(next).map(([key,value]) => [key,(sample?.[key] ?? value)+(value-(sample?.[key] ?? value))*blend]));
      body.style.transform = `perspective(650px) translate3d(${sample.x.toFixed(3)}%,${sample.y.toFixed(3)}%,0) rotate(${sample.rotation.toFixed(3)}deg) rotateY(${sample.yaw.toFixed(3)}deg) rotateX(${sample.pitch.toFixed(3)}deg) scale(${sample.scaleX.toFixed(4)},${sample.scaleY.toFixed(4)})`;
      body.style.setProperty('--couture-brightness',sample.brightness.toFixed(3));
      body.style.setProperty('--couture-core',sample.core.toFixed(3));
      body.style.setProperty('--couture-eye',sample.eye.toFixed(3));
      body.style.setProperty('--couture-glint',sample.glint.toFixed(3));
      shadowRef.current?.setAttribute('transform',`translate(512 1488) scale(${sample.shadowScale.toFixed(3)} 1)`);
      const image = companionArtFrame({ ...props,time });
      const key = `${image.atlas}:${image.index}`;
      if (key !== artKey) {
        artKey = key;
        const [x,y,w,h] = image.target;
        crop.setAttribute('x',x); crop.setAttribute('y',y);
        crop.setAttribute('width',w); crop.setAttribute('height',h);
        crop.setAttribute('viewBox',image.crop.join(' '));
        artwork.setAttribute('href',image.source);
        artwork.setAttribute('width',image.sourceWidth); artwork.setAttribute('height',image.sourceHeight);
        host.dataset.artFrame = key;
        // Coordinate-specific light effects belong only to the original pose.
        detailRef.current?.setAttribute('opacity',image.atlas === 'original' ? '1' : '0');
      }
      host.dataset.frames = String((Number(host.dataset.frames)||0)+1);
      lastPaint = timestamp;
    };
    const loop = timestamp => {
      frame = 0;
      if (stopped || !active || reduced || document.hidden || !intersects) return;
      if (!lastPaint || timestamp-lastPaint >= 1000/policy.fps-.5) paint(timestamp);
      frame = requestAnimationFrame(loop);
    };
    const resume = () => {
      lastTick = 0;
      if (stopped || document.hidden || !intersects) return;
      paint(performance.now(),true);
      if (policy.animate && !frame) frame = requestAnimationFrame(loop);
    };
    const pause = () => { cancelAnimationFrame(frame); frame = 0; lastTick = 0; };
    const visibility = () => { if (document.hidden) pause(); else resume(); };
    let lastPointer = 0;
    const pointer = event => {
      if (!active || reduced || document.hidden || !intersects || event.pointerType === 'touch') return;
      const now = performance.now();
      if (now-lastPointer < 70) return;
      lastPointer = now;
      const bounds = host.getBoundingClientRect();
      gazeRef.current = {
        x:Math.max(-1,Math.min(1,(event.clientX-bounds.left-bounds.width/2)/Math.max(180,window.innerWidth*.4))),
        y:Math.max(-1,Math.min(1,(event.clientY-bounds.top-bounds.height*.2)/Math.max(180,window.innerHeight*.4))),
      };
    };
    const resetGaze = () => { gazeRef.current = { x:0,y:0 }; };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      const next = entries[0]?.isIntersecting !== false;
      if (next === intersects) return;
      intersects = next;
      if (intersects) resume(); else pause();
    },{ rootMargin:'12px' }) : null;
    observer?.observe(host);
    document.addEventListener('visibilitychange',visibility);
    if (active && !reduced) {
      window.addEventListener('pointermove',pointer,{ passive:true });
      window.addEventListener('blur',resetGaze);
      document.addEventListener('pointerleave',resetGaze);
    }
    resume();
    return () => {
      stopped = true; pause(); observer?.disconnect();
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pointermove',pointer);
      window.removeEventListener('blur',resetGaze);
      document.removeEventListener('pointerleave',resetGaze);
    };
  },[active,reduced,action,speaking,facing,width,readyKey]);

  return <span ref={hostRef} className="companion3b-avatar companion3b-avatar-couture" data-mode={mode} data-interaction={interaction} data-pose={action} data-renderer="couture" data-reduced={reduced} data-active={active} data-speaking={speaking} style={{ width,height }} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : title} aria-hidden={decorative || undefined}>
    <svg className="companion3b-couture-ground" viewBox="0 0 1024 1536" aria-hidden="true">
      <defs><radialGradient id={`${id}-ground`}><stop stopColor="var(--3b-scrim-medium)"/><stop offset="1" stopColor="transparent"/></radialGradient></defs>
      <g ref={shadowRef} transform="translate(512 1488)"><ellipse rx="290" ry="36" fill={`url(#${id}-ground)`}/></g>
    </svg>
    <span ref={bodyRef} className="companion3b-couture-body">
      <svg className="companion3b-couture-art" viewBox="0 0 1024 1536" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-core`}><stop stopColor="var(--3b-champagne-highlight)"/><stop offset=".32" stopColor="var(--3b-champagne)" stopOpacity=".4"/><stop offset="1" stopColor="transparent"/></radialGradient>
          <radialGradient id={`${id}-eye`}><stop stopColor="var(--3b-white)"/><stop offset=".5" stopColor="var(--3b-champagne-highlight)" stopOpacity=".5"/><stop offset="1" stopColor="transparent"/></radialGradient>
        </defs>
        <svg ref={cropRef} x="0" y="0" width="1024" height="1536" viewBox="0 0 1024 1536" overflow="hidden">
          <image ref={imageRef} href={COMPANION_ORIGINAL_ART} x="0" y="0" width="1024" height="1536" preserveAspectRatio="none"/>
        </svg>
        <g ref={detailRef}>
          <ellipse className="companion3b-couture-core" cx="460" cy="422" rx="46" ry="62" fill={`url(#${id}-core)`}/>
          <g className="companion3b-couture-eyes" fill={`url(#${id}-eye)`}>
            <ellipse cx="496.3" cy="125.5" rx="14" ry="8.4" transform="rotate(37 496.3 125.5)"/>
            <ellipse cx="558.7" cy="139.1" rx="10.5" ry="6.1" transform="rotate(-45 558.7 139.1)"/>
          </g>
          <g className="companion3b-couture-constellation" transform="translate(650 240) scale(.72 .78)">
            {stars.length > 1 && <polyline points={stars.map(index => STAR_POSITIONS[index].join(',')).join(' ')} fill="none" stroke="var(--3b-champagne-highlight)" strokeWidth="1.25"/>}
            {stars.map(index => <circle key={index} cx={STAR_POSITIONS[index][0]} cy={STAR_POSITIONS[index][1]} r="2.3" fill="var(--3b-champagne-highlight)"/>)}
          </g>
          <path className="companion3b-couture-glint" d="M679 613v20m-10-10h20" fill="none" stroke="var(--3b-champagne-highlight)" strokeWidth="2" strokeLinecap="round"/>
        </g>
      </svg>
      <span className="companion3b-couture-voice" aria-hidden="true"/>
    </span>
  </span>;
}
