import React,{useEffect,useRef,useState} from 'react';
import {ArrowUp,Swords,Shield,MoveRight,Zap} from 'lucide-react';
import {PLAY_ACTIONS} from './gameplay-motion.js';
import {pointerStick,joystickProfile} from './motion.js';
import {controlLabel} from './control-bindings.js';
import './gameplay-controls.css';

const icons={jump:ArrowUp,strike:Swords,guard:Shield,dodge:MoveRight,power:Zap};
export default function WorldPlayControls({onAction,onMove,controls,combat=false}){
 const held=useRef(null),[stick,setStick]=useState({x:0,z:0});
 const release=event=>{if(event&&held.current!==event.pointerId)return;held.current=null;setStick({x:0,z:0});onMove?.({x:0,z:0});};
 useEffect(()=>{const cancel=()=>release();window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);return()=>{window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',cancel);onMove?.({x:0,z:0});};},[onMove]);
 const down=event=>{if(held.current!==null)return;event.preventDefault();held.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);move(event);};
 const move=event=>{if(held.current!==event.pointerId)return;const box=event.currentTarget.getBoundingClientRect(),profile=joystickProfile(innerWidth,innerHeight,'touch'),next=pointerStick(event.clientX-box.left-box.width/2,event.clientY-box.top-box.height/2,{...profile,maxRadius:box.width*.36});setStick(next);onMove?.(next);};
 return <div className="world-play-controls" aria-label="Commandes de jeu">
  <div className="world-stick-pad" role="group" aria-label="Joystick de déplacement" onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}><span className="stick-ring"/><i style={{transform:`translate(${stick.x*30}px,${stick.z*30}px)`}}/><small>Déplacement</small></div>
  {!combat&&<div className="world-action-pad" role="group" aria-label="Actions du voyageur">{Object.entries(PLAY_ACTIONS).map(([id,rule])=>{const Icon=icons[id];return <button key={id} className={'world-play-action action-'+id} aria-label={rule.label} title={rule.label+' · '+controlLabel(controls,id)} onPointerDown={event=>{if(event.button>0)return;event.preventDefault();event.currentTarget.focus({preventScroll:true});onAction(id);}} onClick={event=>{if(event.detail===0)onAction(id);}}><Icon size={21}/><span>{rule.label}</span><kbd>{controlLabel(controls,id)}</kbd></button>;})}</div>}
 </div>;
}
