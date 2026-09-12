import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ArenaStage} from '../arena/ArenaStage.jsx';
import {AVATAR_PATHS} from './avatar-rules.js';
import {TRAVEL_GEAR} from './wardrobe.js';
import {characterSequence, frameAt} from './cinematic-script.js';
import './cinematics.css';

/** Runs inside the existing character dialog: the world remains paused. */
export function AvatarCinematic({avatar, onDone, sequence: suppliedSequence}) {
  const sequence = useMemo(() => suppliedSequence || characterSequence({avatar, power: AVATAR_PATHS[avatar.path], gear: TRAVEL_GEAR[avatar.travelGear]}), [avatar, suppliedSequence]);
  const [elapsed, setElapsed] = useState(0), [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const done = useRef(false), callback = useRef(onDone), skip = useRef(null), root = useRef(null);
  callback.current = onDone;
  const frame = frameAt(sequence, elapsed);
  const finish = () => {if (!done.current) {done.current = true; callback.current?.();}};
  useEffect(() => {root.current?.closest('dialog')?.scrollTo({top: 0}); skip.current?.focus({preventScroll: true});}, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    // Read mode is manual: no moving camera and no automatic disappearance of captions.
    if (paused || reduced || done.current) return;
    let raf, last = performance.now(), pending = 0;
    const tick = now => {
      const delta = Math.min(100, Math.max(0, now - last)); last = now;
      if (!document.hidden) pending += delta;
      if (pending >= 100) {const deltaTime = pending; pending = 0; setElapsed(value => value + deltaTime);}
      if (!done.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, reduced]);
  useEffect(() => {if (frame.done) finish();}, [frame.done]);
  const next = () => {
    if (frame.index === frame.count - 1) {finish(); return;}
    setElapsed(sequence.shots.slice(0, frame.index + 1).reduce((sum, shot) => sum + shot.duration, 0));
  };
  return <section ref={root} className="avatar-cinematic" aria-label={sequence.title} onKeyDownCapture={event => {
    if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); finish();}
  }}>
    <div className="cinema-viewport"><ArenaStage avatar={avatar} cinematic={{...frame, reduced, paused}}/><div className="cinema-shade" aria-hidden="true"/></div>
    <header className="cinema-header"><span>3B ORIGINS</span><p>{sequence.title}</p></header>
    <div className="cinema-caption" aria-live="polite" aria-atomic="true" key={frame.id}>
      <span className="cinema-chapter">{String(frame.index + 1).padStart(2, '0')} / {String(frame.count).padStart(2, '0')}</span>
      <h3>{frame.title}</h3><p>{frame.line}</p>
    </div>
    <div className="cinema-progress" aria-hidden="true"><i style={{transform: `scaleX(${frame.totalProgress})`}}/></div>
    <footer className="cinema-controls">
      <button type="button" ref={skip} onClick={finish}>Passer la cinématique</button>
      <button type="button" onClick={() => setReduced(value => !value)} aria-pressed={reduced}>{reduced ? 'Reprendre l’animation' : 'Mode lecture'}</button>
      {reduced ? <button type="button" onClick={next}>{frame.index === frame.count - 1 ? 'Entrer dans le monde' : 'Suite'}</button> : <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? 'Reprendre' : 'Pause'}</button>}
    </footer>
    <p className="cinema-saved">Personnage enregistré. Passer cette scène ne modifie ni ta progression ni tes récompenses.</p>
  </section>;
}
