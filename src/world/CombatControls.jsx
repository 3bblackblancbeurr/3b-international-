import React,{useEffect,useRef,useState} from 'react';
import {Swords,Shield,Zap,MoveRight,Heart,ScanLine} from 'lucide-react';
import {ATTACK_RANGE} from './field-combat.js';
const outOfRange=(e,kind)=>!!e.field&&['strike','power'].includes(kind)&&Math.hypot(e.field.enemy.x-e.field.p.x,e.field.enemy.z-e.field.p.z)>(kind==='power'?23:ATTACK_RANGE);

export function CombatControls({encounter:e,act,onRetreat}){
 const until=useRef(0),timer=useRef(),[busy,setBusy]=useState(false),current=useRef({e,act,onRetreat});current.current={e,act,onRetreat};
 function action(kind){const {e,act,onRetreat}=current.current;if(Date.now()<until.current||e.field?.cooldown||outOfRange(e,kind)||e.result||e.pact||kind==='power'&&e.focus<2||kind==='dodge'&&(e.field?e.field.stamina<32:e.focus<1)||kind==='trap'&&!e.traps||kind==='support'&&!e.support)return;until.current=Date.now()+650;setBusy(true);act({type:'battle',action:kind});clearTimeout(timer.current);timer.current=setTimeout(()=>setBusy(false),650);}
 useEffect(()=>{const onKey=event=>{if(event.repeat||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if(event.key.toLowerCase()==='r'){event.preventDefault();current.current.onRetreat?.();return;}const kind={j:'strike',k:'guard',l:'power',' ':'dodge'}[event.key.toLowerCase()];if(kind){event.preventDefault();action(kind);}};window.addEventListener('keydown',onKey);return()=>{window.removeEventListener('keydown',onKey);clearTimeout(timer.current);};},[]);
 return <div className={"world-actions world-battle-actions combat-direct"+(e.traps||e.support?" has-tools":"")}>
  {[['strike','Frapper',e.opening?(e.field?'Ouverture +35 %':'Contre-attaque +45 %'):'+1 concentration',Swords,'J'],['guard','Garder',e.field?'Protection pendant 1 seconde':(e.recoveries??2)>0?`${e.recoveries??2} reprises de souffle`:'Protection sans soin',Shield,'K'],['dodge','Esquiver',e.field?'32 endurance':'1 concentration',MoveRight,'Espace'],['power','Pouvoir','2 concentrations',Zap,'L'],...(e.traps?[['trap','Piège',e.traps+' restants · interrompt',ScanLine,'']]:[]),...(e.support?[['support','Soutien','+32 vitalité',Heart,'']]:[])].map(([kind,label,hint,Icon,key])=><button key={kind} aria-label={label} disabled={busy||!!e.field?.cooldown||outOfRange(e,kind)||kind==='power'&&e.focus<2||kind==='dodge'&&(e.field?e.field.stamina<32:e.focus<1)} className={(kind==='power'?'world-primary':'')+(kind==='strike'&&e.opening?' has-opening':'')} onClick={()=>action(kind)}><Icon size={21}/><span>{label}<small>{hint}</small></span>{key&&<kbd>{key}</kbd>}</button>)}
 </div>;
}
