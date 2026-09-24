import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { shotFromGesture } from './core.js';

const Arena = lazy(() => import('./PenaltyRushArena3D.jsx'));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const start = role => ({
  attacker: 0, keeper: 1, phase: 'training', positions: { attacker: { x: role === 'keeper' ? .75 : .35, y: 0 }, keeper: { y: 0 } },
  score: [0, 0], energy: [100, 100], flow: [0, 0], lastEvent: null,
});

export default function PenaltyTraining({ role, profile, onExit }) {
  const [state, setState] = useState(() => start(role));
  const [round, setRound] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState(role === 'keeper' ? 'Lis le tireur. Glisse ou touche la cage pour plonger.' : 'Déplace ton joueur, vise et tire.');
  const controlRef = useRef({ x: 0, y: 0, intensity: 0, active: false, keeper: { direction: 0, intensity: 0, active: false } });
  const stateRef = useRef(state);
  const keeperIntent = useRef(0);
  const touch = useRef(null);
  const busy = useRef(false);
  const timers = useRef([]);
  const room = { revision: round, state, players: [
    { name: role === 'attacker' ? profile.displayName : 'Tireur IA', countryId: profile.countryId, isSelf: role === 'attacker' },
    { name: role === 'keeper' ? profile.displayName : 'Gardien IA', countryId: profile.countryId, isSelf: role === 'keeper' },
  ] };
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    busy.current = false;
    keeperIntent.current = 0;
    controlRef.current = { x: 0, y: 0, intensity: 0, active: false, keeper: { direction: 0, intensity: 0, active: false } };
    setState(start(role)); setAttempts(0); setRound(n => n + 1);
    setMessage(role === 'keeper' ? 'Prêt pour le prochain tir.' : 'Reprends ta course vers le but.');
  }

  function resolveShot(shot, ai = false) {
    if (busy.current) return;
    busy.current = true;
    const current = stateRef.current;
    const target = clamp(shot.targetX, -1, 1);
    const keeper = ai ? keeperIntent.current : clamp(target * .7 + (Math.random() - .5) * .6, -.9, .9);
    const isFrame = Math.abs(target) > .95 && shot.power > .77 || shot.targetY > .95;
    const saved = !isFrame && Math.abs(target - keeper) < (ai ? .31 : .25);
    const type = isFrame ? 'frame' : saved ? 'save' : 'goal';
    const text = type === 'goal' ? 'BUT !' : type === 'save' ? 'ARRÊT !' : 'HORS CADRE';
    setAttempts(n => n + 1);
    setMessage(text);
    setState(previous => ({ ...previous,
      score: [previous.score[0] + (type === 'goal' ? 1 : 0), previous.score[1] + (type === 'save' ? 1 : 0)],
      positions: { ...previous.positions, keeper: { y: keeper } },
      lastEvent: { type, text, visual: { attacker: current.positions.attacker, direction: Math.sign(target - keeper) || 1,
        result: { target, keeperCenter: keeper }, shot } },
    }));
    setRound(n => n + 1);
    timers.current.push(setTimeout(() => {
      setState(previous => ({ ...previous, positions: { attacker: { x: ai ? .75 : .35, y: 0 }, keeper: { y: 0 } }, lastEvent: null }));
      setRound(n => n + 1);
      busy.current = false;
      keeperIntent.current = 0;
      controlRef.current.keeper = { direction: 0, intensity: 0, active: false };
    }, 1500));
  }

  useEffect(() => {
    if (role !== 'keeper') return;
    const timer = setInterval(() => {
      if (document.hidden || busy.current) return;
      resolveShot({ type: 'shot', power: .5 + Math.random() * .35, targetX: (Math.random() - .5) * 1.75, targetY: .25 + Math.random() * .55 }, true);
    }, 3400);
    return () => clearInterval(timer);
  }, [role]);

  function move(x, y) {
    if (role !== 'attacker' || busy.current) return;
    const xx = clamp(x, -1, 1), yy = clamp(y, -1, 1);
    controlRef.current = { ...controlRef.current, x: xx, y: yy, intensity: 1, active: true };
    setState(previous => ({ ...previous, positions: { ...previous.positions, attacker: {
      x: clamp(previous.positions.attacker.x + .055, 0, .94), y: clamp(previous.positions.attacker.y + xx * .12, -.95, .95),
    } } }));
    setRound(n => n + 1);
  }

  function dive(direction) {
    if (role !== 'keeper' || busy.current) return;
    keeperIntent.current = clamp(direction, -1, 1);
    controlRef.current.keeper = { direction: keeperIntent.current, intensity: 1, active: true };
    setState(previous => ({ ...previous, positions: { ...previous.positions, keeper: { y: keeperIntent.current } } }));
    setRound(n => n + 1);
  }

  function pointerDown(e) { touch.current = { x: e.clientX, y: e.clientY, at: performance.now() }; e.currentTarget.setPointerCapture(e.pointerId); }
  function pointerMove(e) { if (touch.current && role === 'attacker') move((e.clientX - touch.current.x) / 90, (touch.current.y - e.clientY) / 90); }
  function pointerUp(e) {
    if (!touch.current) return;
    const dx = e.clientX - touch.current.x, dy = e.clientY - touch.current.y;
    if (role === 'keeper') dive(dx === 0 ? 0 : clamp(dx / 95, -1, 1));
    else resolveShot(shotFromGesture({ dx, dy, heldMs: performance.now() - touch.current.at, durationMs: performance.now() - touch.current.at }), false);
    touch.current = null;
  }

  return <main className="penalty-match penalty-training" data-role={role}>
    <div className="penalty-match-hud"><div className="penalty-hud-player"><b>{room.players[0].name}</b></div><div className="penalty-score"><span>{state.score[0]}</span><div><small>ENTRAÎNEMENT</small><b>{attempts} tirs</b></div><span>{state.score[1]}</span></div><div className="penalty-hud-player right"><b>{room.players[1].name}</b></div></div>
    <div className="penalty-meter-line"><strong>{role === 'keeper' ? 'GARDIEN CONTRE TIREUR IA' : 'ATTAQUANT CONTRE GARDIEN IA'}</strong></div>
    <section className="penalty-pitch penalty-pitch-3d"><Suspense fallback={<div className="penalty-arena3d-fallback">Chargement du terrain…</div>}><Arena room={room} profile={profile} selfIndex={role === 'attacker' ? 0 : 1} controlRef={controlRef}/></Suspense>
      {role === 'attacker' && <div className="penalty-touch-left" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { touch.current = null; }} onPointerCancel={() => { touch.current = null; }}><span>GLISSE POUR COURIR</span></div>}
      <div className="penalty-touch-right" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { touch.current = null; }}><span>{role === 'keeper' ? 'GLISSE POUR PLONGER' : 'GLISSE POUR VISER ET FRAPPER'}</span></div>
      <div className="penalty-last-event" role="status">{message}</div>
    </section>
    <div className="penalty-training-actions"><button className="penalty-secondary" onClick={reset}>Recommencer</button><button className="penalty-secondary" onClick={onExit}>Quitter l’entraînement</button></div>
  </main>;
}
