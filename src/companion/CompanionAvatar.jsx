import { useEffect, useId, useRef, useState } from 'react';
import { STAR_POSITIONS, sanitizeConstellation } from './constellation.js';
import { companionPoseAction } from './companion-pose.js';
import {
  COMPANION_ORIGINAL_ART, COMPANION_ART_ATLASES, COUTURE_JOINT_BANDS,
  companionArtSources, companionArtFrame, originalCompanionFrame, companionGaitPhase,
  computeCoutureMotion, coutureFramePolicy, coutureJointMatrices, coutureTransitionDuration,
} from './companion-art.js';
import '../styles/companion-avatar.css';

const assetLoads = new Map();
function loadArtwork(kind) {
  if (assetLoads.has(kind)) return assetLoads.get(kind);
  const sheet = COMPANION_ART_ATLASES[kind];
  const pending = new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    const fail = () => { assetLoads.delete(kind); resolve(false); };
    img.onload = async () => {
      if (img.naturalWidth !== sheet.width || img.naturalHeight !== sheet.height) { fail(); return; }
      // Readiness means decoded pixels, so a new pose cannot expose an empty frame.
      try { await img.decode?.(); } catch { fail(); return; }
      resolve(true);
    };
    img.onerror = fail;
    img.src = sheet.src;
  });
  assetLoads.set(kind, pending);
  return pending;
}

const artKey = art => `${art.atlas}:${art.index}`;
const newLayer = () => ({ root:null, crop:null, image:null, detail:null, bands:[], art:originalCompanionFrame(), key:'original:0' });

/** The approved couture character, authored poses and continuous local articulation. */
export default function CompanionAvatar({ mode = 'idle', interaction = '', bond = [], reduced = false, size = 118, title = 'Compagnon 3B', decorative = false, facing = 1, speaking = false, active = true, locomotion }) {
  const id = `couture-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hostRef = useRef(null);
  const bodyRef = useRef(null);
  const layersRef = useRef([newLayer(),newLayer()]);
  const shadowRef = useRef(null);
  const driverRef = useRef(null);
  const clockRef = useRef({ action:'', elapsed:0, alive:0 });
  const gazeRef = useRef({ x:0, y:0 });
  const [ready, setReady] = useState({});
  const width = Number.isFinite(size) ? Math.max(56,Math.min(480,size)) : 118;
  const height = Math.round(width*1.38);
  const action = companionPoseAction(interaction || mode);
  const stars = sanitizeConstellation(bond);
  const current = useRef({});
  current.current = { action,reduced,active,facing,speaking,ready,size:width,locomotion };
  const readyKey = Object.keys(ready).filter(key => ready[key]).sort().join(',');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const request = () => {
      if (document.hidden) return;
      // Shell and portrait reuse the same decoded URLs; idle downloads no atlas.
      for (const kind of companionArtSources(action)) {
        if (!ready[kind]) loadArtwork(kind).then(loaded => {
          if (!cancelled && loaded) setReady(value => value[kind] ? value : { ...value,[kind]:true });
        });
      }
    };
    request();
    document.addEventListener('visibilitychange',request);
    return () => { cancelled = true; document.removeEventListener('visibilitychange',request); };
  },[action,active,readyKey]);

  useEffect(() => {
    const host = hostRef.current;
    const body = bodyRef.current;
    const layers = layersRef.current;
    if (!host || !body || layers.some(layer => !layer.root || !layer.crop || !layer.image)) return;
    let frame = 0;
    let stopped = false;
    let intersects = true;
    let lastTick = null;
    let lastPaint = null;
    let sample = null;
    let front = 0;
    let transition = null;

    const setLayer = (index, art) => {
      const layer = layers[index];
      if (layer.key !== artKey(art)) {
        const [x,y,w,h] = art.target;
        layer.crop.setAttribute('x',x); layer.crop.setAttribute('y',y);
        layer.crop.setAttribute('width',w); layer.crop.setAttribute('height',h);
        layer.crop.setAttribute('viewBox',art.crop.join(' '));
        layer.image.setAttribute('href',art.source);
        layer.image.setAttribute('width',art.sourceWidth); layer.image.setAttribute('height',art.sourceHeight);
        layer.detail?.setAttribute('opacity',art.atlas === 'original' ? '1' : '0');
        layer.art = art;
        layer.key = artKey(art);
      }
    };
    const finishTransition = () => {
      if (!transition) return;
      front = transition.to;
      layers[front].root.setAttribute('opacity','1');
      layers[1-front].root.setAttribute('opacity','0');
      transition = null;
      host.dataset.transitioning = 'false';
    };
    const updateArtwork = (art, props, delta) => {
      const key = artKey(art);
      const destination = transition ? transition.to : front;
      if (layers[destination].key !== key) {
        if (transition) {
          // A rapid new gesture keeps the dominant pose; no invisible double swap.
          front = transition.elapsed/transition.duration >= .5 ? transition.to : transition.from;
          layers[front].root.setAttribute('opacity','1');
          layers[1-front].root.setAttribute('opacity','0');
          transition = null;
        }
        const next = 1-front;
        const duration = coutureTransitionDuration(layers[front].art,art,props);
        setLayer(next,art);
        if (duration) {
          transition = { from:front,to:next,elapsed:0,duration };
          host.dataset.transitioning = 'true';
        } else {
          layers[next].root.setAttribute('opacity','1');
          layers[front].root.setAttribute('opacity','0');
          front = next;
          host.dataset.transitioning = 'false';
        }
      }
      if (transition) {
        if (props.reduced || !props.active) finishTransition();
        else {
          transition.elapsed += delta;
          const progress = Math.min(1,transition.elapsed/transition.duration);
          const mix = progress*progress*(3-2*progress);
          layers[transition.from].root.setAttribute('opacity',(1-mix).toFixed(4));
          layers[transition.to].root.setAttribute('opacity',mix.toFixed(4));
          if (progress === 1) finishTransition();
        }
      }
      host.dataset.artFrame = key;
    };
    const paint = timestamp => {
      const props = current.current;
      const delta = lastTick == null ? 0 : Math.min(.05,Math.max(0,(timestamp-lastTick)/1000));
      lastTick = timestamp;
      // Only an actual action restarts action time. Direction, speech, image
      // decoding and React updates retain the interpolated body and life clock.
      if (clockRef.current.action !== props.action) {
        clockRef.current.action = props.action;
        clockRef.current.elapsed = 0;
      } else if (props.active && !props.reduced) clockRef.current.elapsed += delta;
      if (props.active && !props.reduced) clockRef.current.alive += delta;
      const time = clockRef.current.elapsed;
      const gait = companionGaitPhase(props.locomotion?.current,props.size);
      const next = computeCoutureMotion({ ...props,time,motionTime:clockRef.current.alive,gait,gazeX:gazeRef.current.x,gazeY:gazeRef.current.y });
      const blend = !sample || props.reduced ? 1 : 1-Math.exp(-delta*12);
      sample = Object.fromEntries(Object.entries(next).map(([key,value]) => [key,(sample?.[key] ?? value)+(value-(sample?.[key] ?? value))*blend]));
      body.style.transform = `perspective(650px) translate3d(${sample.x.toFixed(3)}%,${sample.y.toFixed(3)}%,0) rotate(${sample.rotation.toFixed(3)}deg) rotateY(${sample.yaw.toFixed(3)}deg) rotateX(${sample.pitch.toFixed(3)}deg) scale(${sample.scaleX.toFixed(4)},${sample.scaleY.toFixed(4)})`;
      body.style.setProperty('--couture-brightness',sample.brightness.toFixed(3));
      body.style.setProperty('--couture-core',sample.core.toFixed(3));
      body.style.setProperty('--couture-eye',sample.eye.toFixed(3));
      body.style.setProperty('--couture-glint',sample.glint.toFixed(3));
      shadowRef.current?.setAttribute('transform',`translate(512 1488) scale(${sample.shadowScale.toFixed(3)} 1)`);
      shadowRef.current?.setAttribute('opacity',sample.shadowOpacity.toFixed(3));
      updateArtwork(companionArtFrame({ ...props,time,gait }),props,delta);
      for (let index = 0; index < layers.length; index++) {
        if (!transition && index !== front) continue;
        const layer = layers[index];
        const standing = layer.art.atlas === 'walk' || (layer.art.atlas === 'actions' && [0,1,3].includes(layer.art.index));
        const strength = layer.art.atlas === 'original' ? 1 : standing ? .45 : 0;
        coutureJointMatrices(sample,strength).forEach((matrix,band) => {
          layer.bands[band]?.setAttribute('transform',`matrix(${matrix.map(value => value.toFixed(6)).join(' ')})`);
        });
      }
      host.dataset.frames = String((Number(host.dataset.frames)||0)+1);
      host.dataset.actionTime = time.toFixed(3);
      lastPaint = timestamp;
    };
    const canRun = () => !stopped && !document.hidden && intersects;
    const loop = timestamp => {
      frame = 0;
      const policy = coutureFramePolicy(current.current);
      if (!canRun() || !policy.animate) return;
      const fps = transition ? 60 : policy.fps;
      if (lastPaint == null || timestamp-lastPaint >= 1000/fps-.5) paint(timestamp);
      frame = requestAnimationFrame(loop);
    };
    const pause = () => { cancelAnimationFrame(frame); frame = 0; lastTick = null; lastPaint = null; };
    const refresh = () => {
      if (!canRun()) { pause(); return; }
      const policy = coutureFramePolicy(current.current);
      if (!policy.animate) pause();
      paint(performance.now());
      if (policy.animate && !frame) frame = requestAnimationFrame(loop);
    };
    driverRef.current = { refresh };
    const visibility = () => { if (document.hidden) pause(); else refresh(); };
    let lastPointer = 0;
    const pointer = event => {
      const props = current.current;
      if (!props.active || props.reduced || !canRun() || event.pointerType === 'touch') return;
      const now = performance.now();
      if (now-lastPointer < 45) return;
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
      if (intersects) refresh(); else pause();
    },{ rootMargin:'12px' }) : null;
    observer?.observe(host);
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pointermove',pointer,{ passive:true });
    window.addEventListener('blur',resetGaze);
    document.addEventListener('pointerleave',resetGaze);
    refresh();
    return () => {
      stopped = true; pause(); observer?.disconnect(); driverRef.current = null;
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pointermove',pointer);
      window.removeEventListener('blur',resetGaze);
      document.removeEventListener('pointerleave',resetGaze);
    };
  },[]);

  // Prop changes repaint the existing driver; they never destroy the animation.
  useEffect(() => { driverRef.current?.refresh(); },[active,reduced,action,speaking,facing,width,readyKey,locomotion]);

  return <span ref={hostRef} className="companion3b-avatar companion3b-avatar-couture" data-mode={mode} data-interaction={interaction} data-pose={action} data-renderer="couture" data-reduced={reduced} data-active={active} data-speaking={speaking} style={{ width,height }} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : title} aria-hidden={decorative || undefined}>
    <svg className="companion3b-couture-ground" viewBox="0 0 1024 1536" aria-hidden="true" focusable="false">
      <defs><radialGradient id={`${id}-ground`}><stop stopColor="var(--3b-scrim-medium)"/><stop offset="1" stopColor="transparent"/></radialGradient></defs>
      <g ref={shadowRef} transform="translate(512 1488)"><ellipse rx="290" ry="36" fill={`url(#${id}-ground)`}/></g>
    </svg>
    <span ref={bodyRef} className="companion3b-couture-body">
      <svg className="companion3b-couture-art" viewBox="0 0 1024 1536" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-core`}><stop stopColor="var(--3b-champagne-highlight)"/><stop offset=".32" stopColor="var(--3b-champagne)" stopOpacity=".4"/><stop offset="1" stopColor="transparent"/></radialGradient>
          <radialGradient id={`${id}-eye`}><stop stopColor="var(--3b-white)"/><stop offset=".5" stopColor="var(--3b-champagne-highlight)" stopOpacity=".5"/><stop offset="1" stopColor="transparent"/></radialGradient>
          {COUTURE_JOINT_BANDS.slice(0,-1).map((y,index) => <clipPath key={index} id={`${id}-band-${index}`} clipPathUnits="userSpaceOnUse"><rect x="-512" y={y-1} width="2048" height={COUTURE_JOINT_BANDS[index+1]-y+2}/></clipPath>)}
        </defs>
        {[0,1].map(layer => <g key={layer} ref={node => { layersRef.current[layer].root = node; }} className="companion3b-couture-pose" opacity={layer === 0 ? 1 : 0}>
          <defs>
            <g id={`${id}-pose-${layer}`}>
            <svg ref={node => { layersRef.current[layer].crop = node; }} x="0" y="0" width="1024" height="1536" viewBox="0 0 1024 1536" overflow="hidden">
              <image ref={node => { layersRef.current[layer].image = node; }} href={COMPANION_ORIGINAL_ART} x="0" y="0" width="1024" height="1536" preserveAspectRatio="none"/>
              <g ref={node => { layersRef.current[layer].detail = node; }}>
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
            </g>
          </defs>
          {COUTURE_JOINT_BANDS.slice(0,-1).map((_,band) => <g key={band} ref={node => { layersRef.current[layer].bands[band] = node; }} className="companion3b-couture-joint"><use href={`#${id}-pose-${layer}`} clipPath={`url(#${id}-band-${band})`}/></g>)}
        </g>)}
      </svg>
      <span className="companion3b-couture-voice" aria-hidden="true"/>
    </span>
  </span>;
}
