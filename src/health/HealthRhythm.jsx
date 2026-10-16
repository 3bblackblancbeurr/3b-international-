import React from 'react';
import { ArrowRight, Footprints, RefreshCw, ShieldCheck, Smartphone, TrendingUp } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { displayNumber, localDay, previousDays, normalizeNativeSteps } from './model.js';
import './health-steps-modern.css';

const dayLabel=date=>new Intl.DateTimeFormat('fr-FR',{weekday:'short'}).format(new Date(date+'T12:00:00'));
const shortTime=iso=>{
  if(!iso)return null;
  const d=new Date(iso);
  return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(d):null;
};
export function autoStepWeek(data,date) {
  return previousDays(7,new Date(date+'T12:00:00')).map(d=>{
    const steps=normalizeNativeSteps(data.days?.[d]?.nativeSteps);
    return {date:d,value:steps?.steps??null};
  });
}
export default function HealthRhythm({ data, date=localDay(), native, onOpenSteps, onOpenHistory }) {
  const selected=normalizeNativeSteps(data.days?.[date]?.nativeSteps);
  const value=selected?.steps??null;
  const week=autoStepWeek(data,date);
  const known=week.filter(d=>d.value!==null);
  const max=Math.max(1,...known.map(d=>d.value));
  const provider=native?.status?.platform==='ios'?'Apple Santé':'Health Connect';
  const connected=Boolean(native?.connected && native?.status?.available);
  const update=shortTime(selected?.syncedAt||native?.lastSync);
  const today=date===localDay();
  const indicator=native?.busy?'Synchronisation…':connected?(update?'Synchronisé à '+update:'Synchronisation active'):native?.status?.platform==='web'?'Version web · lecture impossible':'Connexion au téléphone requise';
  return <section className="h-steps-master" aria-labelledby="h-steps-heading">
    <div className="h-steps-master-head">
      <span className="h-eyebrow">3B SANTÉ · PAS AUTOMATIQUES</span>
      <h2 id="h-steps-heading">Tes pas. <em>Sans rien saisir.</em></h2>
      <p>Le téléphone les mesure. 3B affiche les totaux autorisés, sans choisir d’objectif.</p>
    </div>
    <div className="h-steps-master-main">
      <div className="h-steps-master-orb" role="img" aria-label={value===null?'Aucun nombre de pas disponible pour ce jour':displayNumber(value)+' pas mesurés par '+provider}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs><linearGradient id="h-step-auto-ring" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#548e75"/><stop offset=".55" stopColor="#b6e0be"/><stop offset="1" stopColor="#e6cda4"/></linearGradient></defs>
          <circle cx="100" cy="100" r="86" fill="none" stroke="#bbdab817" strokeWidth="1"/>
          <circle className="h-steps-orb-ring" cx="100" cy="100" r="79" fill="none" stroke="url(#h-step-auto-ring)" strokeWidth="5" strokeLinecap="round" strokeDasharray="85 18 24 18 70 280" transform="rotate(-90 100 100)"/>
          <circle cx="100" cy="100" r="64" fill="#0f2820" stroke="#bae2ba19" strokeWidth="1.5"/>
        </svg>
        <div><Footprints size={20}/><strong>{displayNumber(value)}</strong><span>PAS {value===null?'EN ATTENTE':'ENREGISTRÉS'}</span></div>
      </div>
      <div className="h-steps-master-reading">
        <span className={'h-steps-live'+(connected?' is-connected':'')}><i aria-hidden="true"/>{indicator}</span>
        <strong>{value===null?'Ton compteur attend les pas du téléphone.':displayNumber(value)+' pas '+(today?'aujourd’hui':'ce jour-là')+'.'}</strong>
        <p>{connected?'La lecture se met à jour à l’ouverture, au retour dans l’app et environ chaque minute tant qu’elle est visible. Le système peut enregistrer les pas avec un léger délai.':native?.status?.platform==='web'?'La version navigateur ne peut pas lire Health Connect ou Apple Santé. Pour des pas automatiques, ouvre la version native 3B et autorise uniquement la lecture des pas.':'Autorise une seule fois la lecture des pas sur ton téléphone. Ensuite, aucune saisie manuelle n’est nécessaire.'}</p>
        <div className="h-steps-master-actions">
          {connected && <HealthButton variant="health" type="button" disabled={native?.busy} onClick={native?.refresh} aria-label="Actualiser le nombre de pas"><RefreshCw size={17} className={native?.busy?'is-syncing':''}/> Actualiser</HealthButton>}
          {!connected && native?.status?.available && <HealthButton variant="health" type="button" disabled={native?.busy} className="is-connect" onClick={native?.connect}><Smartphone size={17}/> {native?.busy?'Autorisation…':'Activer le suivi automatique'}</HealthButton>}
          <HealthButton variant="health" type="button" onClick={onOpenSteps}>{connected?'Gérer la connexion':'Comment l’activer ?'} <ArrowRight size={16}/></HealthButton>
        </div>
      </div>
    </div>
    <div className="h-steps-master-week">
      <div className="h-steps-master-week-heading"><div><TrendingUp size={16}/><strong>7 jours</strong><small>{known.length?displayNumber(Math.round(known.reduce((sum,d)=>sum+d.value,0)/known.length))+' pas / jour mesuré':'Dès que le téléphone aura des données'}</small></div><HealthButton variant="health" onClick={onOpenHistory}>Historique <ArrowRight size={15}/></HealthButton></div>
      <div className="h-steps-mini-bars" role="list" aria-label="Nombre de pas automatiques des sept derniers jours">
        {week.map(d=><div role="listitem" key={d.date} className={d.date===date?'is-today':''} aria-label={d.date+' : '+(d.value===null?'pas de mesure':displayNumber(d.value)+' pas')}>
          <span><i style={{height:d.value===null?'3px':Math.max(4,d.value/max*100)+'%'}} className={d.value===null?'is-empty':''}/></span>
          <small>{dayLabel(d.date)}</small>
        </div>)}
      </div>
      <span className="h-steps-master-privacy"><ShieldCheck size={14}/> Pas de faux comptage, pas de total inventé, lecture locale avec permission.</span>
    </div>
  </section>;
}
