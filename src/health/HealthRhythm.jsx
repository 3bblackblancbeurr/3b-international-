import React from 'react';
import { ArrowRight, ChartNoAxesColumnIncreasing, Footprints, ShieldCheck, Sparkles } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { displayNumber } from './model.js';
import { healthRhythm, STEP_TARGET_CHOICES } from './rhythm.js';
import './health-rhythm.css';

const shortDay = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(new Date(date + 'T12:00:00'));

export default function HealthRhythm({ data, date, onSetTarget, onOpenSteps, onOpenHistory }) {
  const rhythm = healthRhythm(data, date);
  const { today, target, percent, week, known, average, max } = rhythm;
  const source = today.value === null ? 'Aucun total renseigné' : today.estimated ? 'Estimation web · indicative' : 'Source : ' + today.label;
  const description = today.value === null
    ? 'Aucun pas enregistré pour ce jour.'
    : target === null
      ? displayNumber(today.value) + ' pas. Aucun objectif personnel défini.'
      : displayNumber(today.value) + ' pas sur un repère personnel de ' + displayNumber(target) + ', soit ' + percent + ' %.';
  return <section className="h-rhythm" aria-labelledby="h-rhythm-title">
    <header className="h-rhythm-header">
      <div><span className="h-eyebrow">3B SANTÉ · MON RYTHME</span><h2 id="h-rhythm-title">Chaque pas a sa place.</h2><p>Un tableau de marche personnel. Ni compétition, ni objectif imposé.</p></div>
      <span className="h-rhythm-emblem" aria-hidden="true"><Sparkles size={22}/></span>
    </header>
    <div className="h-rhythm-main">
      <div className="h-rhythm-dial" role="img" aria-label={description}>
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <defs><linearGradient id="h-rhythm-gold" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6de0b5"/><stop offset="57%" stopColor="#c6e2bb"/><stop offset="100%" stopColor="#e6c998"/></linearGradient></defs>
          <circle cx="120" cy="120" r="110" className="h-rhythm-halo"/>
          <circle cx="120" cy="120" r="91" className="h-rhythm-track"/>
          <circle cx="120" cy="120" r="91" className="h-rhythm-progress" pathLength="100" strokeDasharray={(percent ?? 0) + ' 100'} transform="rotate(-90 120 120)"/>
          <circle cx="120" cy="120" r="76" className="h-rhythm-inner"/>
        </svg>
        <div className="h-rhythm-reading" aria-hidden="true"><Footprints size={21}/><strong>{displayNumber(today.value)}</strong><span>PAS RENSEIGNÉS</span>{percent !== null && <small>{percent} % du repère</small>}</div>
      </div>
      <div className="h-rhythm-control">
        <span className="h-rhythm-kicker">MON REPÈRE FACULTATIF</span>
        <strong className="h-rhythm-target">{target === null ? 'À ton rythme' : displayNumber(target) + ' pas'}</strong>
        <p>{target === null ? 'Choisis un repère si cela t’aide, ou garde simplement ton total quotidien.' : today.value === null ? 'Le cercle progressera lorsque tu auras un total pour ce jour.' : 'Ce cercle compare ton total au repère que tu as choisi, sans juger ta santé.'}</p>
        <div className="h-rhythm-choices" role="group" aria-label="Choisir un repère personnel de pas">
          {STEP_TARGET_CHOICES.map(value => <HealthButton variant="health" type="button" key={value} aria-pressed={target === value} onClick={() => onSetTarget(value)}>{displayNumber(value)}</HealthButton>)}
        </div>
        <div className="h-rhythm-actions">
          {target !== null && <HealthButton variant="health" type="button" className="h-rhythm-clear" onClick={() => onSetTarget(null)}>Retirer ce repère</HealthButton>}
          <HealthButton variant="health" type="button" className="h-rhythm-open" onClick={onOpenSteps}><Footprints size={16}/> Mes pas <ArrowRight size={16}/></HealthButton>
        </div>
        <p className="h-rhythm-source"><ShieldCheck size={14} aria-hidden="true"/>{source}. {today.value === null ? 'Une absence de mesure ne vaut pas zéro.' : 'Les sources ne sont jamais additionnées.'}</p>
      </div>
    </div>
    <div className="h-rhythm-week">
      <div className="h-rhythm-week-heading">
        <div><ChartNoAxesColumnIncreasing size={17} aria-hidden="true"/><strong>La semaine en perspective</strong><small>{known ? displayNumber(average) + ' pas en moyenne · ' + known + ' jour(s) renseigné(s)' : 'Aucune mesure pour ces sept jours'}</small></div>
        <HealthButton variant="health" type="button" onClick={onOpenHistory}>Historique <ArrowRight size={15}/></HealthButton>
      </div>
      <div className="h-rhythm-week-chart" role="list" aria-label="Pas sur sept jours">
        {week.map(item => <div role="listitem" key={item.date} className={'h-rhythm-week-day' + (item.date === date ? ' is-selected' : '')} aria-label={item.date + ' : ' + (item.value === null ? 'non renseigné' : displayNumber(item.value) + ' pas · ' + item.label)}>
          <span className="h-rhythm-bar-track"><span className={'h-rhythm-bar' + (item.estimated ? ' is-estimated' : '') + (item.value === null ? ' is-missing' : '')} style={{ height: item.value === null ? '3px' : Math.max(4, Math.round(item.value / max * 100)) + '%' }}/></span>
          <small>{shortDay(item.date)}</small>
        </div>)}
      </div>
      <p className="h-rhythm-foot">Total du téléphone prioritaire, sinon saisie manuelle, sinon estimation clairement signalée. Un jour vide n’entre pas dans la moyenne. Le repère est conservé uniquement avec ton journal local.</p>
    </div>
  </section>;
}
