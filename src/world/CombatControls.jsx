import React,{useEffect,useRef,useState} from 'react';
import {Swords,Shield,Zap,MoveRight} from 'lucide-react';

export function CombatControls({encounter:e,act}){
 const until=useRef(0),timer=useRef(),[busy,setBusy]=useState(false),current=useRef({e,act});current.current={e,act};
 function action(kind){const {e,act}=current.current;if(Date.now()<until.current||e.result||e.pact||kind==='power'&&e.focus<2||kind==='dodge'&&e.focus<1)return;until.current=Date.now()+420;setBusy(true);act({type:'battle',action:kind});clearTimeout(timer.current);timer.current=setTimeout(()=>setBusy(false),420);}
 useEffect(()=>{const onKey=event=>{if(event.repeat||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;const kind={j:'strike',k:'guard',l:'power',' ':'dodge'}[event.key.toLowerCase()];if(kind){event.preventDefault();action(kind);}};window.addEventListener('keydown',onKey);return()=>{window.removeEventListener('keydown',onKey);clearTimeout(timer.current);};},[]);
 return <div className="world-actions world-battle-actions combat-direct">
  {[['strike','Frapper',e.opening?'Contre-attaque +45 %':'+1 concentration',Swords,'J'],['guard','Garder','Réduit les dégâts',Shield,'K'],['dodge','Esquiver','1 concentration',MoveRight,'Espace'],['power','Pouvoir','2 concentrations',Zap,'L']].map(([kind,label,hint,Icon,key])=><button key={kind} aria-label={label} disabled={busy||kind==='power'&&e.focus<2||kind==='dodge'&&e.focus<1} className={(kind==='power'?'world-primary':'')+(kind==='strike'&&e.opening?' has-opening':'')} onClick={()=>action(kind)}><Icon size={21}/><span>{label}<small>{hint}</small></span><kbd>{key}</kbd></button>)}
 </div>;
}
