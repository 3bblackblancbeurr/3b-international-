import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { shotFromGesture } from './core.js';
import { createAdaptiveAiShot, createTrainingMemory, predictTrainingKeeper, rememberKeeperMove, rememberTrainingShot } from './training-ai.js';
import { unlockPenaltyAudio } from './audio.js';
import {
  coalescedPointerSample, createTechniqueTracker, detectJoystickTechnique, keyboardVector,
  penaltyInputMode, pointerAim, shapeJoystick,
} from './joystick.js';

const Arena = lazy(() => import('./PenaltyRushArena3D.jsx'));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const start = role => ({
  attacker: 0, keeper: 1, phase: 'training', positions: { attacker: { x: role === 'keeper' ? .75 : .35, y: 0 }, keeper: { x:0, y: 0 } },
  score: [0, 0], energy: [100, 100], flow: [0, 0], lastEvent: null,
});

export default function PenaltyTraining({ role, profile, onExit }) {
  const [state, setState] = useState(() => start(role));
  const [round, setRound] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState(role === 'keeper' ? 'Lis le tireur. Déplace-toi librement puis plonge.' : 'Déplace ton joueur, vise et tire.');
  const [inputMode] = useState(() => penaltyInputMode());
  const desktop = inputMode === 'desktop';
  const controlRef = useRef({ x: 0, y: 0, intensity: 0, active: false, keeper: { direction: 0, forward:0, intensity: 0, active: false } });
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
    controlRef.current = { x: 0, y: 0, intensity: 0, active: false, keeper: { direction: 0, forward:0, intensity: 0, active: false } };
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
    const keeperDepth = clamp(Number(current.positions?.keeper?.x || 0), 0, .82) / .82;
    const saved = !isFrame && Math.abs(target - keeper) < (ai ? .31 : .25 + keeperDepth * .075);
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
      setState(previous => ({ ...previous, positions: { attacker: { x: ai ? .75 : .35, y: 0 }, keeper: { x:0, y: 0 } }, lastEvent: null }));
      setRound(n => n + 1);
      busy.current = false;
      keeperIntent.current = 0;
      controlRef.current.keeper = { direction: 0, forward:0, intensity: 0, active: false };
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
  const trainingTechnique = useRef(createTechniqueTracker());
  const actionTouch = useRef(null);
  const chargeFrame = useRef(0);
  const pitchRef = useRef(null);
  const desktopKeys = useRef(new Set());
  const desktopFrame = useRef(0);
  const desktopAim = useRef({x:0,y:.42});
  const desktopShot = useRef(null);
  const desktopLastSync = useRef(0);

  useEffect(() => () => {
    cancelAnimationFrame(chargeFrame.current);
    cancelAnimationFrame(desktopFrame.current);
  }, []);

  useEffect(() => {
    if (!desktop) return undefined;
    const codes = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight']);
    const onDown = event => {
      if (codes.has(event.code)) event.preventDefault();
      desktopKeys.current.add(event.code);
      if (event.repeat) return;
      if (role === 'attacker') {
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') trainingSkill('accelerate', 1, 'BOOST 3B · changement de rythme.');
        else if (event.code === 'KeyQ') trainingSkill('feint', -1, 'FEINTE · petit pas et changement d’appui.');
        else if (event.code === 'KeyE') trainingSkill('cut', 1, 'CROCHET · sortie rapide.');
        else if (event.code === 'Space') trainingSkill('rhythm', desktopAim.current.x || 1, 'ROULETTE · garde le ballon près du pied.');
      } else {
        if (event.code === 'Space') trainingKeeperAction('high-claim');
        else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') trainingKeeperAction('close-angle');
      }
    };
    const onUp = event => desktopKeys.current.delete(event.code);
    const clear = () => desktopKeys.current.clear();
    window.addEventListener('keydown', onDown, {passive:false});
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(.05, Math.max(.001, (now-last)/1000));
      last = now;
      const input = keyboardVector(desktopKeys.current);
      if (role === 'attacker') {
        controlRef.current = {...controlRef.current,x:input.x,y:input.y,intensity:input.intensity,active:input.active};
      } else {
        controlRef.current.keeper={direction:input.x,forward:-input.y,intensity:input.intensity,active:input.active};
      }
      if (input.active && now-desktopLastSync.current>=48) {
        desktopLastSync.current=now;
        setState(previous => {
          if (role === 'attacker') {
            const attacker=previous.positions.attacker;
            return {...previous,positions:{...previous.positions,attacker:{
              x:clamp(attacker.x-input.y*.52*dt*3.2,.08,.94),
              y:clamp(attacker.y+input.x*.68*dt*3.2,-.95,.95),
            }}};
          }
          const keeper=previous.positions.keeper || {x:0,y:0};
          return {...previous,positions:{...previous.positions,keeper:{
            x:clamp((keeper.x||0)+(-input.y)*.72*dt*3.2,0,.82),
            y:clamp((keeper.y||0)+input.x*.9*dt*3.2,-.95,.95),
          }}};
        });
        setRound(n=>n+1);
      }
      desktopFrame.current=requestAnimationFrame(tick);
    };
    desktopFrame.current=requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(desktopFrame.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
      desktopKeys.current.clear();
    };
  }, [desktop, role]);

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
    if (busy.current || event.button !== 0) return;
    const position = role === 'attacker' ? stateRef.current.positions.attacker : stateRef.current.positions.keeper;
    moveTouch.current = {
      id:event.pointerId,
      x:event.clientX,
      y:event.clientY,
      progress:Number(position.x || 0),
      lateral:Number(position.y || 0),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.active = 'true';
  }

  function moveDrag(event) {
    const gesture = moveTouch.current;
    if (!gesture || gesture.id !== event.pointerId || busy.current) return;
    const sample=coalescedPointerSample(event)||event;
    const radius=Math.max(66,Math.min(94,(event.currentTarget?.clientWidth||170)*.52));
    const input = shapeJoystick(sample.clientX - gesture.x, sample.clientY - gesture.y,{deadZone:7,radius});
    let lateral = clamp(gesture.lateral + input.x * input.intensity * .32, -.95, .95);
    let progress = role==='attacker'
      ? clamp(gesture.progress - input.y * input.intensity * .3, .08, .94)
      : clamp(gesture.progress - input.y * input.intensity * .3, 0, .82);
    const technique = role==='attacker' ? detectJoystickTechnique(trainingTechnique.current, input, performance.now()) : null;
    if (technique?.type === 'cut' || technique?.type === 'feint') {
      lateral = clamp(lateral + technique.direction * .08, -.95, .95);
      trainingSkill(technique.type,technique.direction,technique.type === 'cut' ? 'CROCHET · changement d’appui.' : 'FEINTE · puis repars vers le but.');
    } else if (technique?.type === 'rhythm') {
      trainingSkill('rhythm',technique.direction,'ROULETTE · garde le ballon près du pied.');
    }
    if(role==='attacker'){
      controlRef.current = { ...controlRef.current, x:input.x, y:input.y, intensity:input.intensity, active:input.active };
      setState(previous => ({ ...previous, positions:{ ...previous.positions, attacker:{ x:progress, y:lateral } } }));
    }else{
      controlRef.current.keeper={direction:input.x,forward:-input.y,intensity:input.intensity,active:input.active};
      setState(previous => ({...previous,positions:{...previous.positions,keeper:{x:progress,y:lateral}}}));
    }
    setRound(n => n + 1);

    const pad=event.currentTarget;
    pad.style.setProperty('--stick-x', (input.x * input.visual).toFixed(1)+'px');
    pad.style.setProperty('--stick-y', (input.y * input.visual).toFixed(1)+'px');
    pad.style.setProperty('--stick-power', input.intensity.toFixed(3));
    if (technique) {
      pad.setAttribute('data-technique', technique.label);
      window.setTimeout(() => pad.removeAttribute('data-technique'), 420);
    }
  }

  function moveEnd(event) {
    const gesture=moveTouch.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    moveTouch.current=null;
    trainingTechnique.current=createTechniqueTracker();
    if(role==='keeper')controlRef.current.keeper={direction:0,forward:0,intensity:0,active:false};
    else controlRef.current={...controlRef.current,x:0,y:0,intensity:0,active:false};
    const pad=event.currentTarget;
    pad.dataset.active='false';
    pad.style.setProperty('--stick-x','0px');
    pad.style.setProperty('--stick-y','0px');
  }

  function dive(direction, intensity = 1) {
    if (role !== 'keeper' || busy.current) return;
    keeperIntent.current = clamp(direction, -1, 1);
    aiMemory.current = rememberKeeperMove(aiMemory.current, keeperIntent.current);
    controlRef.current.keeper = { direction:keeperIntent.current, forward:0, intensity:clamp(intensity, .25, 1), active:true };
    setState(previous => ({ ...previous, positions:{ ...previous.positions, keeper:{ ...(previous.positions.keeper||{x:0}), y:keeperIntent.current } } }));
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
      controlRef.current.keeper={direction:0,forward:0,intensity:0,active:true};
    }
  }

  function actionMove(event) {
    const gesture=actionTouch.current;
    if(!gesture||gesture.id!==event.pointerId||busy.current)return;
    const sample=coalescedPointerSample(event)||event;
    gesture.path.push({x:sample.clientX,y:sample.clientY});
    if(gesture.path.length>24)gesture.path.shift();
    const dx=sample.clientX-gesture.x,dy=sample.clientY-gesture.y;
    const distance=Math.hypot(dx,dy);
    const pad=event.currentTarget;
    pad.style.setProperty('--gesture-angle',(Math.atan2(dy,dx)*180/Math.PI).toFixed(1)+'deg');
    pad.style.setProperty('--gesture-power',String(Math.max(.18,Math.min(1,distance/105))));

    if(role==='keeper'){
      const effectiveDistance=Math.max(0,distance-9);
      const direction=effectiveDistance?clamp(dx/115,-1,1):0;
      const intensity=clamp(effectiveDistance/95,0,1);
      keeperIntent.current=direction;
      const forward=clamp(-dy/115,-1,1);
      controlRef.current.keeper={direction,forward,intensity,active:effectiveDistance>0};
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
      timers.current.push(setTimeout(()=>{controlRef.current.keeper={direction:0,forward:0,intensity:0,active:false};},360));
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
    controlRef.current.keeper={direction:0,forward:0,intensity:0,active:false};
  }

  function trainingSkill(type,direction=1,text='Technique 3B') {
    const at=performance.now();
    setMessage(text);
    setState(previous=>({...previous,lastEvent:{type,text,visual:{at,direction,intensity:.88}}}));
    setRound(n=>n+1);
  }

  function trainingKeeperAction(type){
    if(role!=='keeper'||busy.current)return;
    if(type==='high-claim'){
      setState(previous=>({...previous,positions:{...previous.positions,keeper:{...(previous.positions.keeper||{x:0,y:0}),x:clamp((previous.positions.keeper?.x||0)+.07,0,.82)}},lastEvent:{type:'keeper',text:'SORTIE HAUTE',visual:{at:performance.now(),type:'high-claim',direction:0,intensity:.9}}}));
      setMessage('SORTIE HAUTE · attaque la trajectoire.');
    }else{
      setState(previous=>({...previous,positions:{...previous.positions,keeper:{...(previous.positions.keeper||{x:0,y:0}),x:clamp((previous.positions.keeper?.x||0)+.12,0,.82)}},lastEvent:{type:'keeper',text:'ANGLE FERMÉ',visual:{at:performance.now(),type:'close-angle',direction:0,intensity:.78}}}));
      setMessage('FERMETURE D’ANGLE · avance sans te jeter.');
    }
    setRound(n=>n+1);
  }

  function trainingFace(type){
    unlockPenaltyAudio().catch(()=>{});
    try{navigator.vibrate?.(8);}catch{}
    if(role==='keeper'){
      if(type==='left')return dive(-1,.92);
      if(type==='right')return dive(1,.92);
      if(type==='top')return trainingKeeperAction('high-claim');
      return trainingKeeperAction('close-angle');
    }
    if(type==='top'){
      setState(previous=>({...previous,positions:{...previous.positions,attacker:{...previous.positions.attacker,x:clamp(previous.positions.attacker.x+.12,.08,.94)}}}));
      trainingSkill('accelerate',1,'BOOST 3B · changement de rythme.');
      return;
    }
    const lateral=type==='left'?-0.18:0.18;
    setState(previous=>({...previous,positions:{...previous.positions,attacker:{...previous.positions.attacker,y:clamp(previous.positions.attacker.y+lateral,-.95,.95)}}}));
    trainingSkill(type==='left'?'feint':'cut',type==='left'?-1:1,type==='left'?'FEINTE NOIRE · décale le gardien.':'CROCHET BLANC · ouvre l’angle.');
  }

  function updateDesktopAim(event){
    if(!desktop||!pitchRef.current)return;
    const sample=coalescedPointerSample(event)||event;
    desktopAim.current=pointerAim(sample,pitchRef.current);
    pitchRef.current.style.setProperty('--pc-aim-x',((desktopAim.current.x+1)*50).toFixed(2)+'%');
    pitchRef.current.style.setProperty('--pc-aim-y',((1-desktopAim.current.y)*72+8).toFixed(2)+'%');
  }

  function desktopPointerDown(event){
    if(!desktop||busy.current)return;
    updateDesktopAim(event);
    if(event.button===2){event.preventDefault();role==='keeper'?trainingKeeperAction('close-angle'):trainingSkill(Math.abs(desktopAim.current.x)>.42?'cut':'feint',desktopAim.current.x<0?-1:1,'Technique 3B');return;}
    if(event.button!==0)return;
    unlockPenaltyAudio().catch(()=>{});
    if(role==='keeper'){
      const aim=desktopAim.current;
      if(aim.y>.76)trainingKeeperAction('high-claim');
      else dive(Math.abs(aim.x)<.08?(aim.x<0?-1:1):aim.x,.94);
      return;
    }
    desktopShot.current={at:performance.now(),x:event.clientX};
    event.currentTarget.dataset.pcCharging='true';
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function desktopPointerUp(event){
    if(!desktop||role!=='attacker'||event.button!==0||!desktopShot.current)return;
    updateDesktopAim(event);
    const startShot=desktopShot.current;desktopShot.current=null;
    event.currentTarget.dataset.pcCharging='false';
    const heldMs=clamp(performance.now()-startShot.at,330,1200);
    const rect=pitchRef.current?.getBoundingClientRect?.();
    const curve=rect?clamp((event.clientX-startShot.x)/Math.max(80,rect.width*.34),-.62,.62):0;
    const aim=desktopAim.current;
    resolveShot(shotFromGesture({dx:aim.x*125,dy:-aim.y*135,heldMs,durationMs:heldMs,curve}),false);
  }

  function desktopPointerCancel(event){desktopShot.current=null;if(event.currentTarget)event.currentTarget.dataset.pcCharging='false';}

  return <main className="penalty-match penalty-training" data-role={role}>
    <div className="penalty-match-hud"><div className="penalty-hud-player"><b>{room.players[0].name}</b></div><div className="penalty-score"><span>{state.score[0]}</span><div><small>ENTRAÎNEMENT</small><b>{attempts} tirs</b></div><span>{state.score[1]}</span></div><div className="penalty-hud-player right"><b>{room.players[1].name}</b></div></div>
    <div className="penalty-meter-line"><strong>{role === 'keeper' ? 'GARDIEN CONTRE TIREUR IA' : 'ATTAQUANT CONTRE GARDIEN IA'}</strong></div>
    <section ref={pitchRef} className="penalty-pitch penalty-pitch-3d" data-input={inputMode} data-pc-charging="false" onPointerMove={desktop?updateDesktopAim:undefined} onPointerDown={desktop?desktopPointerDown:undefined} onPointerUp={desktop?desktopPointerUp:undefined} onPointerCancel={desktop?desktopPointerCancel:undefined} onContextMenu={desktop?(e)=>e.preventDefault():undefined}><Suspense fallback={<div className="penalty-arena3d-fallback">Chargement du terrain…</div>}><Arena room={room} profile={profile} selfIndex={role === 'attacker' ? 0 : 1} controlRef={controlRef}/></Suspense>
      {!desktop && <div className="penalty-touch-left" data-active="false" aria-label={role==='keeper'?'Déplacement libre du gardien':'Déplacement de l’attaquant'} onPointerDown={moveStart} onPointerMove={moveDrag} onPointerUp={moveEnd} onPointerCancel={moveEnd} onLostPointerCapture={moveEnd}><span /></div>}
      {!desktop && <div className="penalty-face-cluster" data-role={role} aria-label="Commandes d’entraînement 3B">
        <button className="penalty-face penalty-face-top" data-tone="3b" onPointerDown={()=>trainingFace('top')}><b>3B</b><small>{role==='keeper'?'HAUT':'BOOST'}</small></button>
        <button className="penalty-face penalty-face-left" data-tone="black" onPointerDown={()=>trainingFace('left')}><b>N</b><small>{role==='keeper'?'GAUCHE':'FEINTE'}</small></button>
        <button className="penalty-face penalty-face-right" data-tone="white" onPointerDown={()=>trainingFace('right')}><b>B</b><small>{role==='keeper'?'DROITE':'CROCHET'}</small></button>
        {role==='attacker'
          ? <div className="penalty-face penalty-face-bottom penalty-face-shot" data-tone="beur" data-active="false" data-charging="false" aria-label="Frappe Beur or" onPointerDown={actionStart} onPointerMove={actionMove} onPointerUp={actionEnd} onPointerCancel={actionCancel} onLostPointerCapture={actionCancel}><b>OR</b><small>FRAPPE</small><i className="penalty-shot-charge" aria-hidden="true"><b /></i></div>
          : <button className="penalty-face penalty-face-bottom" data-tone="beur" onPointerDown={()=>trainingFace('bottom')}><b>O</b><small>ANGLE</small></button>}
      </div>}
      {desktop && <><span className="penalty-pc-reticle" aria-hidden="true"/><div className="penalty-pc-controls" aria-hidden="true">{role==='keeper'?'FLÈCHES / WASD = DÉPLACEMENT LIBRE · CLIC = PLONGEON · ESPACE = SORTIE HAUTE · SHIFT = FERMER L’ANGLE':'FLÈCHES / WASD · SHIFT BOOST · Q FEINTE · E CROCHET · ESPACE ROULETTE · CLIC MAINTENU = TIR'}</div></>}
      <div className="penalty-last-event" role="status">{message}</div>
    </section>
    <div className="penalty-training-actions"><button className="penalty-secondary" onClick={reset}>Recommencer</button><button className="penalty-secondary" onClick={onExit}>Quitter l’entraînement</button></div>
  </main>;
}
