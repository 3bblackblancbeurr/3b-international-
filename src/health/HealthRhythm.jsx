import React from 'react';
import { ArrowRight, ChartNoAxesColumnIncreasing, Footprints, RefreshCw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { displayNumber } from './model.js';
import { healthRhythm, STEP_TARGET_CHOICES } from './rhythm.js';
import './health-rhythm.css';

const shortDay = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(new Date(date + 'T12:00:00'));

export default function HealthRhythm({ data, date, native, onSetTarget, onOpenSteps, onOpenHistory }) {
  const rhythm = healthRhythm(data, date);
  const { today, target, percent, week, known, average, max } = rhythm;
  const connected = native?.connected === true;
  const canConnect = native?.status?.available === true;
  const provider = native?.status?.platform === 'ios' ? 'Apple Santé' : 'Health Connect';
  const source = today.value === null
    ? connected ? 'Synchronisation automatique active' : 'Compteur automatique non activé'
    : provider + ' · automatique';
  const description = today.value === null
    ? 'Aucun pas automatique disponible pour ce jour.'
    : target === null
      ? displayNumber(today.value) + ' pas automatiques.'
      : displayNumber(today.value) + ' pas sur un repère personnel de ' + displayNumber(target) + ', soit ' + percent + ' %.';

  return <section className="h-rhythm" aria-labelledby="h-rhythm-title">
    <header className="h-rhythm-header">
      <div>
        <span className="h-eyebrow">3B SANTÉ · MOUVEMENT</span>
        <h2 id="h-rhythm-title">Tes pas. Sans rien saisir.</h2>
        <p>Le téléphone compte. 3B transforme le total en un tableau de bord vivant.</p>
      </div>
      <span className={'h-rhythm-live' + (connected ? ' is-live' : '')}>
        <i aria-hidden="true"/>{connected ? 'AUTO' : 'À ACTIVER'}
      </span>
    </header>

    <div className="h-rhythm-main">
      <div className="h-rhythm-dial" role="img" aria-label={description}>
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <defs>
            <linearGradient id="h-rhythm-gold" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#61e4b2"/>
              <stop offset="52%" stopColor="#c8e8c4"/>
              <stop offset="100%" stopColor="#efca82"/>
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="110" className="h-rhythm-halo"/>
          <circle cx="120" cy="120" r="91" className="h-rhythm-track"/>
          <circle cx="120" cy="120" r="91" className="h-rhythm-progress" pathLength="100" strokeDasharray={(percent ?? 0) + ' 100'} transform="rotate(-90 120 120)"/>
          <circle cx="120" cy="120" r="76" className="h-rhythm-inner"/>
        </svg>
        <div className="h-rhythm-reading" aria-hidden="true">
          <Footprints size={21}/>
          <strong>{displayNumber(today.value)}</strong>
          <span>PAS AUJOURD’HUI</span>
          {percent !== null && <small>{percent} % de ton repère</small>}
        </div>
        {connected && <span className="h-rhythm-orbit" aria-hidden="true"><i/></span>}
      </div>

      <div className="h-rhythm-control">
        <span className="h-rhythm-kicker">{connected ? 'COMPTEUR AUTOMATIQUE ACTIF' : 'AUCUNE SAISIE MANUELLE'}</span>
        <strong className="h-rhythm-target">{target === null ? 'À ton rythme' : displayNumber(target) + ' pas'}</strong>
        <p>{connected
          ? 'Le total vient du téléphone. 3B le réactualise automatiquement quand Santé est ouverte et au retour dans l’application.'
          : 'Active une fois la connexion au téléphone. Ensuite, tu n’as plus de nombre de pas à taper.'}</p>

        {!connected && canConnect && <HealthButton variant="health" type="button" className="h-rhythm-connect" onClick={native?.connect} disabled={native?.busy}>
          <Smartphone size={17}/>{native?.busy ? 'Connexion…' : 'Activer le compteur automatique'}
        </HealthButton>}
        {!connected && !canConnect && <HealthButton variant="health" type="button" className="h-rhythm-connect h-rhythm-learn" onClick={onOpenSteps}>
          <Smartphone size={17}/> Voir comment activer les pas
        </HealthButton>}

        {connected && <HealthButton variant="health" type="button" className="h-rhythm-sync" onClick={native?.refresh} disabled={native?.busy}>
          <RefreshCw size={15}/>{native?.busy ? 'Synchronisation…' : 'Synchroniser maintenant'}
        </HealthButton>}

        <div className="h-rhythm-target-block">
          <span className="h-rhythm-kicker">MON REPÈRE FACULTATIF</span>
          <div className="h-rhythm-choices" role="group" aria-label="Choisir un repère personnel de pas">
            {STEP_TARGET_CHOICES.map(value => <HealthButton variant="health" type="button" key={value} aria-pressed={target === value} onClick={() => onSetTarget(value)}>{displayNumber(value)}</HealthButton>)}
          </div>
        </div>

        <div className="h-rhythm-actions">
          {target !== null && <HealthButton variant="health" type="button" className="h-rhythm-clear" onClick={() => onSetTarget(null)}>Retirer ce repère</HealthButton>}
          <HealthButton variant="health" type="button" className="h-rhythm-open" onClick={onOpenSteps}><Footprints size={16}/> Détails des pas <ArrowRight size={16}/></HealthButton>
        </div>
        <p className="h-rhythm-source"><ShieldCheck size={14} aria-hidden="true"/>{source}. Aucun pas manuel ni estimation web n’entre dans ce total.</p>
      </div>
    </div>

    <div className="h-rhythm-week">
      <div className="h-rhythm-week-heading">
        <div><ChartNoAxesColumnIncreasing size={17} aria-hidden="true"/><strong>Les 7 derniers jours</strong><small>{known ? displayNumber(average) + ' pas en moyenne · ' + known + ' jour(s) mesuré(s)' : 'Aucune mesure automatique sur ces sept jours'}</small></div>
        <HealthButton variant="health" type="button" onClick={onOpenHistory}>Historique <ArrowRight size={15}/></HealthButton>
      </div>
      <div className="h-rhythm-week-chart" role="list" aria-label="Pas automatiques sur sept jours">
        {week.map(item => <div role="listitem" key={item.date} className={'h-rhythm-week-day' + (item.date === date ? ' is-selected' : '')} aria-label={item.date + ' : ' + (item.value === null ? 'aucune donnée' : displayNumber(item.value) + ' pas · ' + item.label)}>
          <span className="h-rhythm-bar-track"><span className={'h-rhythm-bar' + (item.value === null ? ' is-missing' : '')} style={{ height: item.value === null ? '3px' : Math.max(4, Math.round(item.value / max * 100)) + '%' }}/></span>
          <small>{shortDay(item.date)}</small>
        </div>)}
      </div>
      <p className="h-rhythm-foot">Pas du téléphone uniquement. Un jour sans mesure reste vide et n’entre pas dans la moyenne. Le repère est personnel et facultatif.</p>
    </div>
  </section>;
}
