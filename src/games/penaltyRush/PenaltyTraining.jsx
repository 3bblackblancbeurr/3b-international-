import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { shotFromGesture } from './core.js';
import { createAdaptiveAiShot, createTrainingMemory, predictTrainingKeeper, rememberKeeperMove, rememberTrainingShot } from './training-ai.js';
import { unlockPenaltyAudio } from './audio.js';

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
  const aiMemory = useRef(createTrainingMemory());
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
    const keeper = ai ? keeperIntent.current : predictTrainingKeeper(aiMemory.current, shot, attempts);
    const isFrame = Math.abs(target) > .95 && shot.power > .77 || shot.targetY > .95;
    const saved = !isFrame && Math.abs(target - keeper) < (ai ? .31 : .25);
    const type = isFrame ? 'frame' : saved ? 'save' : 'goal';
    const text = type === 'goal' ? 'BUT !' : type === 'save' ? 'ARRÊT !' : 'HORS CADRE';
    aiMemory.current = rememberTrainingShot(aiMemory.current, shot, type);
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
      resolveShot(createAdaptiveAiShot(aiMemory.current, attempts), true);
    }, 3400);
    return () => clearInterval(timer);
  }, [role, attempts]);

  const moveTouch = useRef(null);
  const actionTouch = useRef(null);
  const chargeFrame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(chargeFrame.current), []);

  function stopCharge(pad) {
    cancelAnimationFrame(chargeFrame.current);
    chargeFrame.current = 0;
    if (!pad) return;
    pad.dataset.active = 'false';
    pad.dataset.charging = 'false';
    pad.style.setProperty('--charge', '0');
    pad.style.setProperty('--gesture-power', '.18');
    pad.style.setProperty('--gesture-opacity', '.28');
  }

  function moveStart(event) {
    if (role !== 'attacker' || busy.current || event.button !== 0) return;
    const attacker = stateRef.current.positions.attacker;
    moveTouch.current = {
      id:event.pointerId,
      x:event.clientX,
      y:event.clientY,
      progress:attacker.x,
      lateral:attacker.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.active = 'true';
  }

  function moveDrag(event) {
    const gesture = moveTouch.current;
    if (!gesture || gesture.id !== event.pointerId || busy.current) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const deadX = Math.abs(dx) < 8 ? 0 : dx - Math.sign(dx) * 8;
    const deadY = Math.abs(dy) < 8 ? 0 : dy - Math.sign(dy) * 8;
    const lateral = clamp(gesture.lateral + deadX / 420, -.95, .95);
    const progress = clamp(gesture.progress - deadY / 360, .08, .94);
    const length = Math.hypot(deadX, deadY);
    const xx = length ? deadX / length : 0;
    const yy = length ? -deadY / length : 0;
    controlRef.current = { ...controlRef.current, x:xx, y:yy, intensity:clamp(length / 120, 0, 1), active:false };
    setState(previous => ({ ...previous, positions:{ ...previous.positions, attacker:{ x:progress, y:lateral } } }));
    setRound(n => n + 1);

    const pad=event.currentTarget;
    const visualX=clamp(deadX, -44, 44),visualY=clamp(deadY, -44, 44);
    pad.style.setProperty('--stick-x', visualX.toFixed(1)+'px');
    pad.style.setProperty('--stick-y', visualY.toFixed(1)+'px');
  }

  function moveEnd(event) {
    const gesture=moveTouch.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    moveTouch.current=null;
    controlRef.current={...controlRef.current,x:0,y:0,intensity:0,active:false};
    const pad=event.currentTarget;
    pad.dataset.active='false';
    pad.style.setProperty('--stick-x','0px');
    pad.style.setProperty('--stick-y','0px');
  }

  function dive(direction, intensity = 1) {
    if (role !== 'keeper' || busy.current) return;
    keeperIntent.current = clamp(direction, -1, 1);
    aiMemory.current = rememberKeeperMove(aiMemory.current, keeperIntent.current);
    controlRef.current.keeper = { direction:keeperIntent.current, intensity:clamp(intensity, .25, 1), active:true };
    setState(previous => ({ ...previous, positions:{ ...previous.positions, keeper:{ y:keeperIntent.current } } }));
    setRound(n => n + 1);
  }

  function actionStart(event) {
    if (busy.current || event.button !== 0) return;
    unlockPenaltyAudio().catch(() => {});
    actionTouch.current={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),path:[{x:event.clientX,y:event.clientY}]};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.active='true';
    event.currentTarget.dataset.charging=role==='attacker'?'true':'false';
    event.currentTarget.style.setProperty('--gesture-opacity','.92');
    event.currentTarget.style.setProperty('--charge',role==='attacker'?'.1':'0');

    if(role==='attacker'){
      const pad=event.currentTarget;
      const tick=now=>{
        const gesture=actionTouch.current;
        if(!gesture||gesture.id!==event.pointerId)return;
        const charge=clamp((now-gesture.at)/950,.1,1);
        pad.style.setProperty('--charge',charge.toFixed(3));
        pad.style.setProperty('--gesture-power',String(Math.max(.18,charge)));
        chargeFrame.current=requestAnimationFrame(tick);
      };
      chargeFrame.current=requestAnimationFrame(tick);
    }else{
      controlRef.current.keeper={direction:0,intensity:0,active:true};
    }
  }

  function actionMove(event) {
    const gesture=actionTouch.current;
    if(!gesture||gesture.id!==event.pointerId||busy.current)return;
    gesture.path.push({x:event.clientX,y:event.clientY});
    if(gesture.path.length>24)gesture.path.shift();
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    const distance=Math.hypot(dx,dy);
    const pad=event.currentTarget;
    pad.style.setProperty('--gesture-angle',(Math.atan2(dy,dx)*180/Math.PI).toFixed(1)+'deg');
    pad.style.setProperty('--gesture-power',String(Math.max(.18,Math.min(1,distance/105))));

    if(role==='keeper'){
      const effectiveDistance=Math.max(0,distance-9);
      const direction=effectiveDistance?clamp(dx/115,-1,1):0;
      const intensity=clamp(effectiveDistance/95,0,1);
      keeperIntent.current=direction;
      controlRef.current.keeper={direction,intensity,active:effectiveDistance>0};
      pad.style.setProperty('--charge',intensity.toFixed(3));
    }
  }

  function actionEnd(event) {
    const gesture=actionTouch.current;
    if(!gesture||gesture.id!==event.pointerId)return;
    actionTouch.current=null;
    const pad=event.currentTarget;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    const heldMs=performance.now()-gesture.at;
    stopCharge(pad);

    if(role==='keeper'){
      const intensity=clamp(Math.hypot(dx,dy)/95,.25,1);
      dive(dx===0?keeperIntent.current:clamp(dx/105,-1,1),intensity);
      timers.current.push(setTimeout(()=>{controlRef.current.keeper={direction:0,intensity:0,active:false};},360));
      return;
    }

    if(heldMs<300){
      setMessage('Maintiens la gâchette pour charger ta frappe.');
      return;
    }
    const curve=gesture.path.length>2
      ? clamp((gesture.path[Math.floor(gesture.path.length/2)].x-(gesture.x+dx/2))/48,-1,1)
      : 0;
    resolveShot(shotFromGesture({dx,dy,heldMs,durationMs:heldMs,curve}),false);
  }

  function actionCancel(event) {
    if(!actionTouch.current||actionTouch.current.id!==event.pointerId)return;
    actionTouch.current=null;
    stopCharge(event.currentTarget);
    controlRef.current.keeper={direction:0,intensity:0,active:false};
  }

  function trainingFace(type){
    unlockPenaltyAudio().catch(()=>{});
    try{navigator.vibrate?.(8);}catch{}
    if(role==='keeper'){
      if(type==='left')return dive(-1,.92);
      if(type==='right')return dive(1,.92);
      if(type==='top'){
        controlRef.current.keeper={direction:0,intensity:.9,active:true};
        setMessage('SORTIE HAUTE · garde le centre de la cage.');
        return;
      }
      setMessage('FERMETURE D’ANGLE · reste prêt à plonger.');
      return;
    }
    if(type==='top'){
      setState(previous=>({...previous,positions:{...previous.positions,attacker:{...previous.positions.attacker,x:clamp(previous.positions.attacker.x+.12,.08,.94)}}}));
      setMessage('BOOST 3B · changement de rythme.');
      setRound(n=>n+1);return;
    }
    const lateral=type==='left'?-0.18:0.18;
    setState(previous=>({...previous,positions:{...previous.positions,attacker:{...previous.positions.attacker,y:clamp(previous.positions.attacker.y+lateral,-.95,.95)}}}));
    setMessage(type==='left'?'FEINTE NOIRE · décale le gardien.':'CROCHET BLANC · ouvre l’angle.');
    setRound(n=>n+1);
  }

  return <main className="penalty-match penalty-training" data-role={role}>
    <div className="penalty-match-hud"><div className="penalty-hud-player"><b>{room.players[0].name}</b></div><div className="penalty-score"><span>{state.score[0]}</span><div><small>ENTRAÎNEMENT</small><b>{attempts} tirs</b></div><span>{state.score[1]}</span></div><div className="penalty-hud-player right"><b>{room.players[1].name}</b></div></div>
    <div className="penalty-meter-line"><strong>{role === 'keeper' ? 'GARDIEN CONTRE TIREUR IA' : 'ATTAQUANT CONTRE GARDIEN IA'}</strong></div>
    <section className="penalty-pitch penalty-pitch-3d"><Suspense fallback={<div className="penalty-arena3d-fallback">Chargement du terrain…</div>}><Arena room={room} profile={profile} selfIndex={role === 'attacker' ? 0 : 1} controlRef={controlRef}/></Suspense>
      {role === 'attacker' && <div className="penalty-touch-left" data-active="false" aria-label="Déplacement de l’attaquant" onPointerDown={moveStart} onPointerMove={moveDrag} onPointerUp={moveEnd} onPointerCancel={moveEnd} onLostPointerCapture={moveEnd}><span /></div>}
      <div className="penalty-face-cluster" data-role={role} aria-label="Commandes d’entraînement 3B">
        <button className="penalty-face penalty-face-top" data-tone="3b" onPointerDown={()=>trainingFace('top')}><b>3B</b><small>{role==='keeper'?'HAUT':'BOOST'}</small></button>
        <button className="penalty-face penalty-face-left" data-tone="black" onPointerDown={()=>trainingFace('left')}><b>N</b><small>{role==='keeper'?'GAUCHE':'FEINTE'}</small></button>
        <button className="penalty-face penalty-face-right" data-tone="white" onPointerDown={()=>trainingFace('right')}><b>B</b><small>{role==='keeper'?'DROITE':'CROCHET'}</small></button>
        {role==='attacker'
          ? <div className="penalty-face penalty-face-bottom penalty-face-shot" data-tone="beur" data-active="false" data-charging="false" aria-label="Frappe Beur or" onPointerDown={actionStart} onPointerMove={actionMove} onPointerUp={actionEnd} onPointerCancel={actionCancel} onLostPointerCapture={actionCancel}><b>OR</b><small>FRAPPE</small><i className="penalty-shot-charge" aria-hidden="true"><b /></i></div>
          : <button className="penalty-face penalty-face-bottom" data-tone="beur" onPointerDown={()=>trainingFace('bottom')}><b>O</b><small>ANGLE</small></button>}
      </div>
      <div className="penalty-last-event" role="status">{message}</div>
    </section>
    <div className="penalty-training-actions"><button className="penalty-secondary" onClick={reset}>Recommencer</button><button className="penalty-secondary" onClick={onExit}>Quitter l’entraînement</button></div>
  </main>;
}
