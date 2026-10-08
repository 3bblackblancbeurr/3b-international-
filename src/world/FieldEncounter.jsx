import React,{useEffect} from 'react';
import {CombatControls} from './CombatControls.jsx';
import {cardById,countryById} from './catalog.js';
import {INTENTS} from './engine.js';
import {guardianCombatStatus} from './guardian-combat.js';
import {finalCircleStatus} from './final-circle.js';

export function FieldEncounter({save,act,onRetreat,onPause,snapshot,onFieldAction,onJump,controls}){
 const e=save.adventure.encounter,f=e.field,windup=f.phase==='windup'?1-f.windup/(e.expert?750:1000):0,finalStatus=e.final?finalCircleStatus(e):null,mechanic=finalStatus||(e.boss?guardianCombatStatus(e):null),mechanicRegion=finalStatus?.region||e.region,signalHidden=mechanicRegion==='turquie'&&e.guardianFlag&&f.phase==='windup';
 useEffect(()=>{const key=event=>{if(event.key==='Escape'){event.preventDefault();onPause();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onPause]);
 return <section className="field-combat" aria-label="Combat en déplacement libre">
  <div className="field-status"><span>{e.final?'CERCLE FINAL':countryById[e.region]?.name.toUpperCase()} · {f.phase==='recovery'?'OUVERTURE':'RENCONTRE'}</span><h2>{cardById[e.card]?.name}</h2>
   <div className="world-health"><label>Ton groupe <b>{e.hp}/{e.maxHP}</b></label><progress value={e.hp} max={e.maxHP}/><label>{e.boss?'Gardien':'Adversaire'} <b>{mechanic?.vitality?.current??e.enemy}/{mechanic?.vitality?.max??e.enemyMax}</b></label><progress className="enemy" value={e.enemy} max={e.enemyMax}/></div>
   <p>{signalHidden?'Signal brouillé · lis la forme au sol':INTENTS[e.intent]?.split(' · ')[0]}<span>{f.phase==='windup'?'Sors de la zone au sol':f.phase==='recovery'?'Sa défense est ouverte':'Cherche une ouverture'}</span></p><div className="enemy-windup"><i style={{transform:`scaleX(${windup})`}}/></div>{mechanic&&<aside className="guardian-mechanic" aria-live="polite"><strong>{mechanic.label}</strong><span>{mechanic.status}</span>{finalStatus&&<small>{finalStatus.link} · Kaïs relie les huit interventions sans posséder leurs valeurs.</small>}</aside>}
  </div>
  {mechanic?.phase&&<div className="realm-boss-phase"><span>PHASE {mechanic.phase.index} / 3</span><strong>{mechanic.phase.title}</strong>{mechanicRegion==='espagne'&&<progress value={e.guardianMeter||0} max="100" aria-label="Intensité"/>}{mechanicRegion==='maroc'&&<progress value={e.guardianMeter||0} max="100" aria-label="Intégrité de l’héritage"/>}{mechanicRegion==='italie'&&<progress value={e.guardianShield||0} max="40" aria-label="Défense reconstruite"/>}</div>}
  <div className="field-top-actions"><button onClick={onPause} aria-label="Suspendre le combat">Ⅱ</button><button className="combat-retreat" onClick={onRetreat}>Se replier <kbd>R</kbd></button></div>
  <div className="field-actions"><div className="field-focus">{'◆'.repeat(e.focus)}{'◇'.repeat(3-e.focus)} · Endurance {Math.round(f.stamina)}{f.combo===2?' · Prochaine frappe renforcée':''}</div><CombatControls controls={controls} encounter={e} act={act} onRetreat={onRetreat} onFieldAction={onFieldAction}/></div>
  <button className="world-play-action field-jump" aria-label="Sauter" onClick={onJump}>↑<span>Sauter</span></button>
  <p className="field-movement">{Math.hypot(f.enemy.x-f.p.x,f.enemy.z-f.p.z)>7.2?'Rapproche-toi pour frapper · ton pouvoir porte plus loin':'Bouge pendant le combat · esquive hors de la trajectoire'}</p>
 </section>;
}
