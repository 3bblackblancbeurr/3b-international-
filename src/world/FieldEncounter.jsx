import React,{useEffect,useRef,useState} from 'react';
import {CombatControls} from './CombatControls.jsx';
import {cardById} from './catalog.js';
import {INTENTS} from './engine.js';

export const ENEMY_DELAY=3200;
export function FieldEncounter({save,act,onRetreat,onPause,snapshot}){
 const e=save.adventure.encounter,current=useRef({e,act,snapshot,onPause}),deadline=useRef(performance.now()+ENEMY_DELAY),[windup,setWindup]=useState(0);
 current.current={e,act,snapshot,onPause};
 useEffect(()=>{deadline.current=performance.now()+ENEMY_DELAY;setWindup(0);},[e.turn]);
 useEffect(()=>{
  const visibility=()=>{deadline.current=performance.now()+ENEMY_DELAY;setWindup(0);};
  const timer=setInterval(()=>{const {e,act,snapshot}=current.current;if(document.hidden||e.result)return;
   if(!snapshot.combat||snapshot.combat.distance>7.5){deadline.current=performance.now()+ENEMY_DELAY;setWindup(0);return;}
   const remaining=deadline.current-performance.now();setWindup(Math.max(0,1-remaining/ENEMY_DELAY));
   if(remaining<=0){deadline.current=performance.now()+ENEMY_DELAY;act({type:'battle',action:'wait'});}
  },80);
  document.addEventListener('visibilitychange',visibility);
  const key=event=>{if(event.key==='Escape'){event.preventDefault();current.current.onPause();}};window.addEventListener('keydown',key);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('keydown',key);};
 },[]);
 return <section className="field-combat" aria-label="Combat en déplacement libre">
  <div className="field-status"><span>LES ENVIRONS DE PARIS</span><h2>{cardById[e.card]?.name}</h2>
   <div className="world-health"><label>Ton groupe <b>{e.hp}/{e.maxHP}</b></label><progress value={e.hp} max={e.maxHP}/><label>Adversaire <b>{e.enemy}/{e.enemyMax}</b></label><progress className="enemy" value={e.enemy} max={e.enemyMax}/></div>
   <p>{INTENTS[e.intent]?.split(' · ')[0]}<span>{snapshot.combat?.distance>7.5?'Approche en cours':windup>.65?'Impact imminent':'Prépare sa riposte'}</span></p><div className="enemy-windup"><i style={{transform:`scaleX(${windup})`}}/></div>
  </div>
  <div className="field-top-actions"><button onClick={onPause} aria-label="Suspendre le combat">Ⅱ</button><button className="combat-retreat" onClick={onRetreat}>Se replier <kbd>R</kbd></button></div>
  <div className="field-actions"><div className="field-focus">{'◆'.repeat(e.focus)}{'◇'.repeat(3-e.focus)} · {e.opening?'Frappe renforcée':'Concentration'}</div><CombatControls encounter={e} act={act} onRetreat={onRetreat}/></div>
  <p className="field-movement">Déplace-toi librement · garde et esquive ouvrent une riposte</p>
 </section>;
}
