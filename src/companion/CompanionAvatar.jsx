import { useEffect, useId, useRef, useState } from 'react';
import { STAR_POSITIONS, sanitizeConstellation } from './constellation.js';
import { blendCompanionPose, companionFramePolicy, companionPoseAction, computeCompanionPose } from './companion-pose.js';
import '../styles/companion-avatar.css';

const DEGREES = 180/Math.PI;

function ArticulatedFallback({ id, stars, elementRef }) {
  const metal = `url(#${id}-metal)`;
  const cloth = `url(#${id}-cloth)`;
  const light = `url(#${id}-light)`;
  return <svg ref={elementRef} className="companion3b-articulated-fallback" viewBox="0 0 180 249" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="var(--3b-champagne-highlight)"/><stop offset=".46" stopColor="var(--3b-champagne)"/><stop offset="1" stopColor="var(--3b-muted-soft)"/></linearGradient>
      <linearGradient id={`${id}-cloth`} x1="0" x2="1"><stop stopColor="var(--3b-carbon)"/><stop offset=".48" stopColor="var(--3b-line-quiet)"/><stop offset="1" stopColor="var(--3b-obsidian)"/></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor="var(--3b-white)"/><stop offset=".7" stopColor="var(--3b-champagne-highlight)"/><stop offset="1" stopColor="var(--3b-champagne)"/></radialGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="var(--3b-scrim-medium)"/><stop offset="1" stopColor="transparent"/></radialGradient>
    </defs>
    <ellipse cx="90" cy="239" rx="54" ry="8" fill={`url(#${id}-shadow)`}/>
    <g data-joint="root" transform="translate(90 155)">
      {[-1, 1].map((side) => <g key={side} transform={`translate(${side*14} 0)`}>
        <g data-joint={side < 0 ? 'hipL' : 'hipR'}>
          <path d="M-12-4Q-15 9-12 29L-10 37 11 37 13 9Q13-5 3-5Z" fill={cloth} stroke="var(--3b-muted-soft)" strokeWidth=".6"/>
          <path d={`M${side < 0 ? -12 : 3} 6h10v18h-10z`} fill="var(--3b-carbon)" stroke="var(--3b-muted-soft)" strokeWidth=".7"/>
          <path d={`M${side < 0 ? -12 : 3} 8h10m-4 10v8`} fill="none" stroke="var(--3b-champagne)" strokeWidth=".8"/>
          <g transform="translate(0 35)"><g data-joint={side < 0 ? 'kneeL' : 'kneeR'}>
            <path d="M-10-3Q-13 12-10 29L-8 35 8 35 11 7 10-3Z" fill={cloth} stroke="var(--3b-muted-soft)" strokeWidth=".7"/>
            <path d="M-7 8 7 12M-9 26 1 29 8 25" stroke="var(--3b-muted-soft)" strokeWidth=".8" fill="none"/>
            <g transform="translate(0 34)"><g data-joint={side < 0 ? 'ankleL' : 'ankleR'}>
              <path d="M-8-1H8L12 9 16 13V19H-12V12Z" fill={metal} stroke="var(--3b-obsidian)" strokeWidth="1"/>
              <path d="M-6 0H6L8 8 12 11H-9Z" fill="var(--3b-carbon)"/>
              <path d="M-7 4 7 5M-8 8 8 9" fill="none" stroke="var(--3b-champagne-highlight)" strokeWidth="2.3"/>
              <path d="M-12 16H16" stroke="var(--3b-obsidian)" strokeWidth="1.5"/>
            </g></g>
          </g></g>
        </g>
      </g>)}
      <g data-joint="torso">
        <path d="M-23-54Q-14-64 0-63T23-54L25 4H-25Z" fill="var(--3b-obsidian)" stroke="var(--3b-muted-soft)" strokeWidth="1"/>
        <path d="M-26-57-12-61-10-36-14 8-30 7-27-26ZM26-57 12-61 10-36 14 8 30 7 27-26Z" fill={cloth} stroke="var(--3b-muted-soft)" strokeWidth=".8"/>
        <path d="M-17-59-20-43-12-35M17-59 20-43 12-35M-14-35-15 5M14-35 15 5" fill="none" stroke={metal} strokeWidth="1.35"/>
        <rect x="-11" y="-39" width="22" height="25" rx="4" fill="var(--3b-carbon)" stroke={metal} strokeWidth="2"/>
        <path data-joint="core" d="M0-36 7-26 0-17-7-26Z" fill={light}/>
        <path d="M-12-58Q0-40 12-58" fill="none" stroke={metal} strokeWidth="2.8" strokeDasharray="2 1"/>
        <text x="0" y="-43" fill="var(--3b-champagne-highlight)" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900" textAnchor="middle">3B</text>
        <path d="M-21-1H21" stroke="var(--3b-obsidian)" strokeWidth="7"/>
        <rect x="-4" y="-4" width="8" height="6" rx="1" fill={metal}/>
        {[-1, 1].map((side) => <g key={side} transform={`translate(${side*31} -54)`}>
          <g data-joint={side < 0 ? 'shoulderL' : 'shoulderR'}>
            <path d="M-9-4Q0-11 9-3L10 26 6 31H-7L-11 22Z" fill={cloth} stroke="var(--3b-muted-soft)" strokeWidth=".8"/>
            {side > 0 && <g transform="translate(-7 -1)"><rect width="14" height="15" rx="3" fill="var(--3b-carbon)" stroke={metal} strokeWidth="1"/>
              <polyline points={(stars.length > 1 ? stars : [0, 1, 3, 5, 6]).map(i => `${STAR_POSITIONS[i][0]*.12+1},${STAR_POSITIONS[i][1]*.13+1}`).join(' ')} fill="none" stroke="var(--3b-champagne)" strokeWidth=".45"/>
              {(stars.length ? stars : [0, 1, 3, 5, 6]).map(i => <circle key={i} cx={STAR_POSITIONS[i][0]*.12+1} cy={STAR_POSITIONS[i][1]*.13+1} r=".8" fill="var(--3b-champagne-highlight)"/>)}
            </g>}
            <g transform="translate(0 28)"><g data-joint={side < 0 ? 'elbowL' : 'elbowR'}>
              <path d="M-8-3Q-10 8-7 23H7Q10 9 8-3Z" fill={cloth} stroke="var(--3b-muted-soft)" strokeWidth=".8"/>
              <path d="M-7 5 4 8M-6 12 6 14" fill="none" stroke="var(--3b-muted-soft)" strokeWidth=".8"/>
              <path d="M-7 22H7V27H-7Z" fill={metal}/>
              {side < 0 && <circle cx="1" cy="20" r="4.5" fill="var(--3b-obsidian)" stroke={metal} strokeWidth="1.5"/>}
              <g transform="translate(0 28)"><g data-joint={side < 0 ? 'wristL' : 'wristR'}>
                <rect x="-5" y="0" width="10" height="9" rx="2" fill={metal}/>
                {[-3, -1, 1, 3].map(x => <path key={x} d={`M${x} 8v7`} stroke={metal} strokeWidth="1.5" strokeLinecap="round"/>)}
                <path d={`M${side*5} 3l${side*3} 5`} stroke={metal} strokeWidth="2.5" strokeLinecap="round"/>
                {side > 0 && <g data-joint="object" opacity="0"><ellipse cx="0" cy="21" rx="14" ry="5" fill="none" stroke="var(--3b-matrix)" strokeWidth="1"/><path d="M0 9 7 21 0 32-7 21Z" fill={light}/></g>}
                {side < 0 && <g data-joint="hologram" opacity="0"><circle cx="0" cy="25" r="13" fill="var(--3b-border-matrix)" stroke="var(--3b-matrix)"/><ellipse cx="0" cy="25" rx="6" ry="13" fill="none" stroke="var(--3b-matrix)"/><ellipse cx="0" cy="25" rx="17" ry="5" fill="none" stroke="var(--3b-matrix)"/></g>}
              </g></g>
            </g></g>
          </g>
        </g>)}
        <g data-joint="head" transform="translate(0 -78)">
          <path d="M-9 13H9V27H-9Z" fill="var(--3b-obsidian)" stroke={metal}/>
          <path d="M0-47C25-44 27-20 28-2L34 22 19 25 10 13H-10L-19 25-34 22-28-2C-27-20-25-44 0-47Z" fill={metal} stroke="var(--3b-champagne-highlight)" strokeWidth="1"/>
          <path d="M0-38C17-36 22-21 21-7 20 10 8 19 0 20-8 19-20 10-21-7-22-21-17-36 0-38Z" fill="var(--3b-obsidian)" stroke="var(--3b-carbon)" strokeWidth="3"/>
          <path d="M-18 6-11 15 0 19 11 15 18 6 12 20 0 26-12 20Z" fill={metal}/>
          <ellipse cx="-10" cy="-25" rx="6" ry="3" fill="var(--3b-line-soft)" transform="rotate(-28 -10 -25)"/>
          <g transform="translate(-8 -8)"><ellipse data-joint="eyeL" rx="4.5" ry="6" fill={light} transform="rotate(-12)"/></g>
          <g transform="translate(8 -8)"><ellipse data-joint="eyeR" rx="4.5" ry="6" fill={light} transform="rotate(12)"/></g>
          <g transform="translate(0 7)">{[-2, -1, 0, 1, 2].map(i => <path key={i} data-joint={`mouth${i+2}`} d={`M${i*2.2} -2v4`} stroke="var(--3b-champagne-highlight)" strokeWidth="1" strokeLinecap="round"/>)}</g>
          <path d="M0-45-1-33M-24-8-26 16M24-8 26 16" fill="none" stroke="var(--3b-muted-soft)" strokeWidth=".7"/>
        </g>
      </g>
    </g>
  </svg>;
}

function applyFallbackPose(nodes, pose, time, action) {
  const set = (name, transform) => nodes[name]?.setAttribute('transform', transform);
  const lift = action === 'hang' ? .10 : pose.cameraLift;
  set('root', `translate(${90+pose.rootX*58/pose.cameraScale} ${124.5+(30.5-pose.rootY*58+lift*58)/pose.cameraScale}) scale(${1/pose.cameraScale}) rotate(${-pose.rootZ*DEGREES})`);
  set('torso', `rotate(${-pose.torsoZ*DEGREES})`);
  set('head', `translate(0 -78) rotate(${-pose.headZ*DEGREES+pose.headY*10})`);
  for (const side of ['L', 'R']) {
    set(`shoulder${side}`, `rotate(${-pose[`shoulder${side}Z`]*DEGREES+pose[`shoulder${side}X`]*28})`);
    set(`elbow${side}`, `rotate(${-pose[`elbow${side}`]*34-pose[`elbow${side}Z`]*DEGREES})`);
    set(`wrist${side}`, `rotate(${-pose[`wrist${side}Z`]*DEGREES})`);
    set(`hip${side}`, `rotate(${-pose[`hip${side}Z`]*DEGREES+pose[`hip${side}X`]*46})`);
    set(`knee${side}`, `rotate(${-pose[`knee${side}`]*43})`);
    set(`ankle${side}`, `rotate(${-pose[`ankle${side}`]*36})`);
    set(`eye${side}`, `rotate(${side === 'L' ? -12 : 12}) scale(1 ${pose[`eye${side}`]})`);
  }
  nodes.object?.setAttribute('opacity', pose.object);
  nodes.hologram?.setAttribute('opacity', pose.hologram);
  nodes.core?.setAttribute('opacity', Math.min(1, .5+pose.glow*.3));
  for (let i = 0; i < 5; i++) set(`mouth${i}`, `scale(1 ${Math.max(.12, pose.mouth*(.5+Math.abs(Math.sin(time*15+i*1.4))*.7))})`);
}

/** The canvas and SVG share one clock and pose model; only the active avatar animates. */
export default function CompanionAvatar({ mode = 'idle', interaction = '', bond = [], reduced = false, size = 118, title = 'Compagnon 3B', decorative = false, facing = 1, speaking = false, active = true }) {
  const id = `companion-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const fallbackRef = useRef(null);
  const runtimeRef = useRef(null);
  const failedRef = useRef(false);
  const actionClock = useRef({ action: '', started: 0 });
  const currentPose = useRef(null);
  const frames = useRef(0);
  const gaze = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);
  const [renderer, setRenderer] = useState('svg');
  const [revision, setRevision] = useState(0);
  const action = companionPoseAction(interaction || mode);
  const width = Number.isFinite(size) ? Math.max(56, Math.min(480, size)) : 118;
  const height = Math.round(width*1.38);
  const stars = sanitizeConstellation(bond);
  const bondKey = stars.join(',');
  const propsRef = useRef({});
  propsRef.current = { action, reduced, active, facing, speaking, width, height, stars };

  useEffect(() => {
    const canvas = canvasRef.current;
    const lost = (event) => {
      event.preventDefault();
      cancelAnimationFrame(frameRef.current); frameRef.current = 0;
      failedRef.current = true;
      runtimeRef.current?.dispose({ contextLost: true }); runtimeRef.current = null;
      setRenderer('svg'); setRevision(value => value+1);
    };
    const restored = () => { failedRef.current = false; setRevision(value => value+1); };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      cancelAnimationFrame(frameRef.current); frameRef.current = 0;
      runtimeRef.current?.dispose(); runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active || runtimeRef.current || failedRef.current) return;
    let cancelled = false;
    // The rendering engine is a separate chunk, loaded only when this companion is active.
    import('./companion-rig.js').then(({ createCompanionRenderer }) => {
      if (cancelled || !canvasRef.current) return;
      const props = propsRef.current;
      const policy = companionFramePolicy({ ...props, size: props.width, devicePixelRatio: window.devicePixelRatio });
      const runtime = createCompanionRenderer(canvasRef.current, { width: props.width, height: props.height, dpr: policy.dpr });
      runtime.rig.setBond(props.stars);
      runtimeRef.current = runtime;
      runtime.render(currentPose.current || computeCompanionPose({ ...props, time: 0 }), 0);
      setRenderer('webgl');
    }).catch(() => {
      if (!cancelled) {
        failedRef.current = true;
        runtimeRef.current?.dispose({ contextLost: true }); runtimeRef.current = null;
        setRenderer('svg');
      }
    });
    return () => { cancelled = true; };
  }, [active, revision]);

  useEffect(() => {
    const policy = companionFramePolicy({ size: width, devicePixelRatio: window.devicePixelRatio });
    runtimeRef.current?.resize(width, height, policy.dpr);
    runtimeRef.current?.rig.setBond(stars);
  }, [width, height, bondKey, renderer]);

  useEffect(() => {
    const host = hostRef.current;
    const nodes = Object.fromEntries(Array.from(fallbackRef.current.querySelectorAll('[data-joint]')).map(node => [node.dataset.joint, node]));
    let stopped = false;
    let intersecting = true;
    let lastPaint = 0;
    let hiddenAt = 0;
    let lastPointer = 0;
    const now = performance.now();
    if (actionClock.current.action !== action) actionClock.current = { action, started: now };
    const policy = companionFramePolicy({ active, reduced, action, size: width, devicePixelRatio: window.devicePixelRatio });

    const paint = (timestamp, snap = false) => {
      const props = propsRef.current;
      const time = Math.max(0, (timestamp-actionClock.current.started)/1000);
      const target = computeCompanionPose({ ...props, time, gazeX: gaze.current.x, gazeY: gaze.current.y });
      currentPose.current = blendCompanionPose(currentPose.current, target, lastPaint ? (timestamp-lastPaint)/1000 : 1/30, snap || props.reduced || !currentPose.current);
      lastPaint = timestamp;
      const pose = currentPose.current;
      if (runtimeRef.current && renderer === 'webgl') {
        try {
          const metrics = runtimeRef.current.render(pose, props.reduced ? .6 : time);
          if (metrics) {
            canvasRef.current.dataset.drawCalls = String(metrics.calls);
            canvasRef.current.dataset.triangles = String(metrics.triangles);
            canvasRef.current.dataset.geometries = String(metrics.geometries);
          }
        } catch {
          failedRef.current = true;
          runtimeRef.current?.dispose({ contextLost: true }); runtimeRef.current = null;
          setRenderer('svg');
        }
      } else applyFallbackPose(nodes, pose, props.reduced ? .6 : time, action);
      frames.current += 1;
      host.dataset.frames = String(frames.current);
      host.dataset.jointSample = [pose.hipLX, pose.hipRX, pose.kneeL, pose.kneeR, pose.shoulderLX, pose.shoulderRX].map(value => value.toFixed(3)).join(',');
    };
    const loop = timestamp => {
      frameRef.current = 0;
      if (stopped || !active || document.hidden || !intersecting || !policy.animate) return;
      if (!lastPaint || timestamp-lastPaint >= 1000/policy.fps-.6) paint(timestamp);
      frameRef.current = requestAnimationFrame(loop);
    };
    const resume = () => {
      if (stopped || !active || document.hidden || !intersecting) return;
      if (hiddenAt) { actionClock.current.started += performance.now()-hiddenAt; hiddenAt = 0; }
      if (policy.animate) { if (!frameRef.current) frameRef.current = requestAnimationFrame(loop); }
      else paint(performance.now(), true);
    };
    const visibility = () => {
      if (document.hidden) { hiddenAt = performance.now(); cancelAnimationFrame(frameRef.current); frameRef.current = 0; }
      else resume();
    };
    const pointer = event => {
      const timestamp = performance.now();
      if (event.pointerType === 'touch' || document.hidden || reduced || !active || timestamp-lastPointer < 90) return;
      lastPointer = timestamp;
      const rect = host.getBoundingClientRect();
      gaze.current = { x: Math.max(-1, Math.min(1, (event.clientX-rect.left-rect.width/2)/Math.max(150, window.innerWidth*.32))), y: Math.max(-1, Math.min(1, (event.clientY-rect.top-rect.height*.25)/Math.max(150, window.innerHeight*.35))) };
    };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      intersecting = entries[0]?.isIntersecting !== false;
      if (intersecting) resume();
      else { cancelAnimationFrame(frameRef.current); frameRef.current = 0; }
    }, { rootMargin: '12px' }) : null;
    observer?.observe(host);
    document.addEventListener('visibilitychange', visibility);
    if (active && !reduced) window.addEventListener('pointermove', pointer, { passive: true });
    if (!document.hidden) paint(now, reduced || !currentPose.current);
    resume();
    return () => {
      stopped = true;
      cancelAnimationFrame(frameRef.current); frameRef.current = 0;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointermove', pointer);
    };
  }, [active, reduced, action, speaking, facing, width, renderer, revision]);

  return <span ref={hostRef} className="companion3b-avatar companion3b-avatar-articulated" data-mode={mode} data-interaction={interaction} data-pose={action} data-renderer={renderer} data-reduced={reduced} data-active={active} data-speaking={speaking} style={{ width, height }} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : title} aria-hidden={decorative || undefined}>
    <span className="companion3b-avatar-light" aria-hidden="true"/>
    <ArticulatedFallback id={id} stars={stars} elementRef={fallbackRef}/>
    <canvas ref={canvasRef} className="companion3b-avatar-canvas" width={width} height={height} aria-hidden="true"/>
  </span>;
}
