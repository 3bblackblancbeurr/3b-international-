import React,{useEffect,useRef,useState} from 'react';
import {Swords,Shield,Zap,MoveRight,Heart,ScanLine} from 'lucide-react';

export function CombatControls({encounter:e,act}){
 const until=useRef(0),timer=useRef(),[busy,setBusy]=useState(false),current=useRef({e,act});current.current={e,act};
 function action(kind){const {e,act}=current.current;if(Date.now()<until.current||e.result||e.pact||kind==='power'&&e.focus<2||kind==='dodge'&&e.focus<1||kind==='trap'&&!e.traps||kind==='support'&&!e.support)return;until.current=Date.now()+650;setBusy(true);act({type:'battle',action:kind});clearTimeout(timer.current);timer.current=setTimeout(()=>setBusy(false),650);}
 useEffect(()=>{const onKey=event=>{if(event.repeat||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;const kind={j:'strike',k:'guard',l:'power',' ':'dodge'}[event.key.toLowerCase()];if(kind){event.preventDefault();action(kind);}};window.addEventListener('keydown',onKey);return()=>{window.removeEventListener('keydown',onKey);clearTimeout(timer.current);};},[]);
 return <div className={"world-actions world-battle-actions combat-direct"+(e.traps||e.support?" has-tools":"")}>
  {[['strike','Frapper',e.opening?'Contre-attaque +45 %':'+1 concentration',Swords,'J'],['guard','Garder',(e.recoveries??2)>0?`${e.recoveries??2} reprises de souffle`:'Protection sans soin',Shield,'K'],['dodge','Esquiver','1 concentration',MoveRight,'Espace'],['power','Pouvoir','2 concentrations',Zap,'L'],...(e.traps?[['trap','Piège',e.traps+' restants · interrompt',ScanLine,'']]:[]),...(e.support?[['support','Soutien','+32 vitalité avant riposte',Heart,'']]:[])].map(([kind,label,hint,Icon,key])=><button key={kind} aria-label={label} disabled={busy||kind==='power'&&e.focus<2||kind==='dodge'&&e.focus<1} className={(kind==='power'?'world-primary':'')+(kind==='strike'&&e.opening?' has-opening':'')} onClick={()=>action(kind)}><Icon size={21}/><span>{label}<small>{hint}</small></span>{key&&<kbd>{key}</kbd>}</button>)}
 </div>;
}
