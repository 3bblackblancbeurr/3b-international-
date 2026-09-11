import React,{useEffect} from 'react';
import {CombatControls} from './CombatControls.jsx';
import {cardById,countryById} from './catalog.js';
import {INTENTS} from './engine.js';

export function FieldEncounter({save,act,onRetreat,onPause,snapshot}){
 const e=save.adventure.encounter,f=e.field,windup=f.phase==='windup'?1-f.windup/(e.expert?750:1000):0;
 useEffect(()=>{const key=event=>{if(event.key==='Escape'){event.preventDefault();onPause();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onPause]);
 return <section className="field-combat" aria-label="Combat en déplacement libre">
  <div className="field-status"><span>{countryById[e.region]?.name.toUpperCase()} · {f.phase==='recovery'?'OUVERTURE':'RENCONTRE'}</span><h2>{cardById[e.card]?.name}</h2>
   <div className="world-health"><label>Ton groupe <b>{e.hp}/{e.maxHP}</b></label><progress value={e.hp} max={e.maxHP}/><label>Adversaire <b>{e.enemy}/{e.enemyMax}</b></label><progress className="enemy" value={e.enemy} max={e.enemyMax}/></div>
   <p>{INTENTS[e.intent]?.split(' · ')[0]}<span>{f.phase==='windup'?'Sors de la zone au sol':f.phase==='recovery'?'Sa défense est ouverte':'Cherche une ouverture'}</span></p><div className="enemy-windup"><i style={{transform:`scaleX(${windup})`}}/></div>
  </div>
  <div className="field-top-actions"><button onClick={onPause} aria-label="Suspendre le combat">Ⅱ</button><button className="combat-retreat" onClick={onRetreat}>Se replier <kbd>R</kbd></button></div>
  <div className="field-actions"><div className="field-focus">{'◆'.repeat(e.focus)}{'◇'.repeat(3-e.focus)} · Endurance {Math.round(f.stamina)}{f.combo===2?' · Prochaine frappe renforcée':''}</div><CombatControls encounter={e} act={act} onRetreat={onRetreat}/></div>
  <p className="field-movement">{Math.hypot(f.enemy.x-f.p.x,f.enemy.z-f.p.z)>7.2?'Rapproche-toi pour frapper · ton pouvoir porte plus loin':'Bouge pendant le combat · esquive hors de la trajectoire'}</p>
 </section>;
}
