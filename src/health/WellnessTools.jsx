import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Footprints, Moon, Pause, Play, RotateCcw, SkipForward, Sun } from 'lucide-react';
import {
  DAILY_ROUTINES, MOBILITY_SESSIONS, WELLNESS_SOURCES, freshMobilityTimer,
  mobilityActiveMinutes, mobilityTimeLabel, mobilityTimerAction, normalizeRoutineIds, toggleRoutine,
} from './wellness-content.js';
import './wellness-tools.css';

function WellnessSources({ ids }) {
  return <details className="h-wellness-sources"><summary>Repères et sources</summary><p>Séquences 3B inspirées de repères publics. Les durées sont des fenêtres de pratique, à raccourcir selon ton confort.</p>{ids.map(id => <a key={id} href={WELLNESS_SOURCES[id].url} target="_blank" rel="noopener noreferrer">{WELLNESS_SOURCES[id].label} ↗</a>)}</details>;
}

export function MobilitySessions({ onComplete }) {
  const [selected, setSelected] = useState(MOBILITY_SESSIONS[0].id);
  const session = MOBILITY_SESSIONS.find(item => item.id === selected);
  const [timer, setTimer] = useState(freshMobilityTimer);
  const timerRef = useRef(timer);
  const send = useCallback(action => {
    const next = mobilityTimerAction(timerRef.current, session, action, performance.now());
    timerRef.current = next;
    setTimer(next);
    return next;
  }, [session]);

  useEffect(() => {
    if (timer.status !== 'running') return undefined;
    const interval = setInterval(() => send('tick'), 200);
    const pauseWhenHidden = () => { if (document.hidden) send('pause'); };
    const pauseOnLeave = () => send('pause');
    document.addEventListener('visibilitychange', pauseWhenHidden);
    window.addEventListener('pagehide', pauseOnLeave);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      window.removeEventListener('pagehide', pauseOnLeave);
    };
  }, [timer.status, send]);

  const choose = id => { setSelected(id); const next = freshMobilityTimer(); timerRef.current = next; setTimer(next); };
  const completed = timer.status === 'complete';
  const step = session.steps[Math.min(timer.index, session.steps.length - 1)];
  const remaining = completed ? 0 : step.seconds * 1000 - timer.elapsedMs;
  const progress = completed ? 1 : timer.elapsedMs / (step.seconds * 1000);
  const minutes = mobilityActiveMinutes(timer);
  const record = () => {
    const current = timerRef.current;
    if (current.status !== 'complete' || current.recorded || mobilityActiveMinutes(current) <= 0 || !onComplete) return;
    const next = send('record');
    if (next.recorded) onComplete({ id: session.id, minutes: mobilityActiveMinutes(next), completedAt: new Date().toISOString() });
  };

  return <section className="h-mobility" aria-labelledby="h-mobility-title">
    <div className="h-section-heading"><div><span className="h-eyebrow">QUELQUES MINUTES POUR BOUGER</span><h2 id="h-mobility-title">Ton mouvement du moment.</h2></div><Footprints size={25} aria-hidden="true"/></div>
    <div className="h-mobility-choices" role="group" aria-label="Choisir une séance douce">
      {MOBILITY_SESSIONS.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} disabled={timer.status === 'running'} onClick={() => choose(item.id)}>
        <img src={`/health/photos/${item.photo}.webp`} alt="" loading="lazy" width="180" height="140"/>
        <span><small>{item.minutes} MIN ENVIRON</small><strong>{item.name}</strong></span>{selected === item.id && <Check size={16} aria-hidden="true"/>}
      </button>)}
    </div>
    <div className={`h-mobility-stage ${completed ? 'is-complete' : ''}`}>
      <img className="h-mobility-backdrop" src={`/health/photos/${session.photo}.webp`} alt="" width="900" height="600" loading="lazy"/>
      <div className="h-mobility-stage-copy"><span className="h-eyebrow">{completed ? 'SÉANCE TERMINÉE' : `${session.tag} · ${timer.index + 1}/${session.steps.length}`}</span>
        <h3>{completed ? 'Un moment pour toi.' : step.title}</h3>
        <p>{completed ? 'Valide seulement si tu as réellement fait les mouvements. Le temps de préparation et les pauses sont exclus.' : step.text}</p>
        {!completed && <span className="h-mobility-kind">{step.kind === 'move' ? 'Mouvement · à ton rythme' : step.kind === 'rest' ? 'Repos · non compté comme activité' : 'Préparation · non comptée comme activité'}</span>}
      </div>
      <div className="h-mobility-clock" aria-hidden="true">
        <svg viewBox="0 0 112 112"><circle className="h-clock-track" cx="56" cy="56" r="49"/><circle className="h-clock-progress" cx="56" cy="56" r="49" pathLength="100" strokeDasharray={`${progress * 100} 100`}/></svg>
        <span>{completed ? <CheckCircle2 size={32}/> : <><strong>{mobilityTimeLabel(remaining)}</strong><small>{timer.status === 'paused' ? 'EN PAUSE' : 'CETTE ÉTAPE'}</small></>}</span>
      </div>
    </div>
    <span className="h-sr" role="timer" aria-live="off">{completed ? 'Séance terminée' : `${mobilityTimeLabel(remaining)} restantes pour cette étape`}</span>
    <div className="h-mobility-steps" aria-hidden="true">{session.steps.map((item, index) => <span key={index} className={index < timer.index ? 'is-done' : index === timer.index ? 'is-current' : ''} title={item.title}/>)}</div>
    <p className="h-mobility-status" role="status" aria-live="polite">{completed ? timer.recorded ? 'Temps ajouté au journal.' : `${String(minutes).replace('.', ',')} min de mouvement chronométrées${timer.skipped ? ` · ${timer.skipped} étape(s) passée(s)` : ''}.` : timer.interrupted ? 'Le minuteur a été interrompu. Aucun temps pendant cette interruption n’a été ajouté.' : timer.status === 'paused' ? 'En pause. Reprends quand tu es prêt.' : timer.status === 'running' ? `Étape ${timer.index + 1} : ${step.title}.` : 'À toi de démarrer. Les durées restent des repères.'}</p>
    <div className="h-mobility-actions">
      {completed ? <>
        {onComplete && <button type="button" className="h-primary" onClick={record} disabled={timer.recorded || minutes <= 0}><Check size={17}/>{timer.recorded ? 'Ajouté au journal' : `Confirmer ${String(minutes).replace('.', ',')} min réalisées`}</button>}
        <button type="button" className="h-secondary" onClick={() => send('reset')}><RotateCcw size={16}/> Recommencer</button>
      </> : <>
        <button type="button" className="h-primary" onClick={() => send(timer.status === 'running' ? 'pause' : 'start')}>{timer.status === 'running' ? <Pause size={17}/> : <Play size={17}/>} {timer.status === 'running' ? 'Pause' : timer.status === 'paused' ? 'Reprendre' : 'Commencer'}</button>
        <button type="button" className="h-secondary" onClick={() => send('finish')} disabled={timer.elapsedMs === 0}><Check size={17}/> Fait, continuer</button>
        <button type="button" className="h-link" onClick={() => send('skip')}><SkipForward size={16}/> Passer</button>
        {(timer.index > 0 || timer.elapsedMs > 0) && <button type="button" className="h-link h-mobility-reset" onClick={() => send('reset')} aria-label="Recommencer la séance depuis le début"><RotateCcw size={16}/> Recommencer</button>}
      </>}
    </div>
    {!completed && step.tip && <p className="h-mobility-tip">{step.tip}</p>}
    <details className="h-mobility-help"><summary>Avant de commencer</summary>
      <p>Mouvements doux pour adultes, à adapter à tes capacités. Arrête en cas de douleur, vertige ou malaise. En cas de doute, de blessure ou de problème de santé, demande un avis professionnel.</p>
      <p>Le minuteur compte le temps des étapes de mouvement, pas tes gestes. « Fait, continuer » conserve le temps écoulé ; « Passer » exclut toute l’étape. Une page masquée ou quittée met fin au suivi en cours. Tu dois reprendre la séance après une pause.</p>
      <p>Garde l’écran ouvert pour le minuteur, sans le regarder en marchant. Une séance interrompue n’est jamais ajoutée automatiquement au journal.</p>
      <ol>{session.steps.map((item, index) => <li key={index}><strong>{item.title}</strong><span>{item.seconds} s · {item.kind === 'move' ? 'mouvement' : 'hors temps actif'}</span></li>)}</ol>
    </details>
    <WellnessSources ids={session.sourceIds}/>
  </section>;
}

export function DailyRoutines({ date, day = {}, onUpdate, onNavigate }) {
  const [period, setPeriod] = useState('wake');
  const checked = normalizeRoutineIds(day.routines);
  const items = DAILY_ROUTINES[period];
  const completed = items.filter(item => checked.includes(item.id)).length;
  return <section className="h-routines" aria-labelledby="h-routines-title">
    <div className="h-routines-heading"><div><span className="h-eyebrow">TES PETITS REPÈRES</span><h2 id="h-routines-title">Un rythme qui te ressemble.</h2><p>Au réveil ou avant le repos, même en horaires décalés.</p></div><img src="/health/photos/rest.webp" alt="" loading="lazy" width="160" height="160"/></div>
    <div className="h-routines-bar"><div className="h-pills" role="group" aria-label="Moment de la routine"><button type="button" aria-pressed={period === 'wake'} onClick={() => setPeriod('wake')}><Sun size={15}/> Au réveil</button><button type="button" aria-pressed={period === 'rest'} onClick={() => setPeriod('rest')}><Moon size={15}/> Avant le repos</button></div><span aria-label={`${completed} gestes cochés sur ${items.length}`}>{completed}/{items.length}</span></div>
    <div className="h-routine-list">{items.map(item => <div key={item.id} className={checked.includes(item.id) ? 'is-checked' : ''}>
      <label><input type="checkbox" checked={checked.includes(item.id)} onChange={() => onUpdate?.({ routines: toggleRoutine(day.routines, item.id) })}/><span><strong>{item.title}</strong><small>{item.detail}</small></span></label>
      {onNavigate && <button type="button" onClick={() => onNavigate(item.route)} aria-label={`Ouvrir l’outil : ${item.title}`}><ArrowRight size={18}/></button>}
    </div>)}</div>
    <div className="h-routines-foot"><small>Pour le {date ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`)) : 'jour choisi'}. À cocher selon ce que tu fais, sans obligation.</small><span role="status">{completed === items.length ? <><Check size={14}/> Tes repères sont cochés.</> : null}</span></div>
    {period === 'rest' && <WellnessSources ids={['sleep', 'teeth']}/>}
  </section>;
}
