import React,{useEffect,useRef,useState} from 'react';
import {ArrowUp,Swords,Shield,MoveRight,Zap} from 'lucide-react';
import {PLAY_ACTIONS} from './gameplay-motion.js';
import {pointerStick,joystickProfile} from './motion.js';
import {controlLabel} from './control-bindings.js';
import {loadTouchLayout,normalizeTouchLayout,saveTouchLayout,resetTouchLayout} from './touch-layout.js';
import './gameplay-controls.css';

const icons={jump:ArrowUp,strike:Swords,guard:Shield,dodge:MoveRight,power:Zap};
/** Editing only moves the visual controls; it never sends gameplay actions. */
export default function WorldPlayControls({onAction,onMove,onGuardHeld,controls,combat=false,editMode=false,onSaveLayout,onCancelLayout}){
 const held=useRef(null),heldGuard=useRef(null),drag=useRef(null),root=useRef(null);
 const [stick,setStick]=useState({x:0,z:0}),[positions,setPositions]=useState(loadTouchLayout);
 useEffect(()=>{if(editMode){setPositions(loadTouchLayout());onMove?.({x:0,z:0});releaseGuard();}},[editMode]);
 const releaseGuard=event=>{if(heldGuard.current===null||(event&&heldGuard.current!==event.pointerId))return;heldGuard.current=null;onGuardHeld?.(false);};
 const release=event=>{if(event&&held.current!==event.pointerId)return;held.current=null;setStick({x:0,z:0});onMove?.({x:0,z:0});};
 useEffect(()=>{const cancel=()=>{release();releaseGuard();};window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);return()=>{window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',cancel);onMove?.({x:0,z:0});onGuardHeld?.(false);};},[onMove,onGuardHeld]);
 const place=(event,id)=>{
  const rect=root.current?.getBoundingClientRect();if(!rect||!rect.width||!rect.height)return;
  const x=(event.clientX-rect.left)/rect.width*100,y=(event.clientY-rect.top)/rect.height*100;
  setPositions(previous=>normalizeTouchLayout({...previous,[id]:{x,y}}));
 };
 const startEdit=(event,id)=>{
  if(!editMode||drag.current)return;
  event.preventDefault();event.stopPropagation();
  drag.current={pointerId:event.pointerId,id};
  event.currentTarget.setPointerCapture?.(event.pointerId);place(event,id);
 };
 const moveEdit=event=>{if(editMode&&drag.current?.pointerId===event.pointerId){event.preventDefault();place(event,drag.current.id);}};
 const finishEdit=event=>{if(drag.current?.pointerId!==event.pointerId)return;drag.current=null;event.preventDefault();};
 const down=event=>{if(editMode){startEdit(event,'joystick');return;}if(held.current!==null)return;event.preventDefault();held.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);move(event);};
 const move=event=>{if(held.current!==event.pointerId)return;const box=event.currentTarget.getBoundingClientRect(),profile=joystickProfile(innerWidth,innerHeight,'touch'),next=pointerStick(event.clientX-box.left-box.width/2,event.clientY-box.top-box.height/2,{...profile,maxRadius:box.width*.36});setStick(next);onMove?.(next);};
 const positionFor=id=>({left:positions[id].x+'%',top:positions[id].y+'%'});
 const stopJoystick=event=>{if(editMode)finishEdit(event);else release(event);};
 return <div ref={root} className={'world-play-controls'+(editMode?' editing':'')} aria-label={editMode?'Éditeur de position des touches':'Commandes de jeu'}>
  <div className="world-stick-pad" style={{...positionFor('joystick'),bottom:'auto',transform:'translate(-50%,-50%)'}} role="group" aria-label="Joystick de déplacement" onPointerDown={down} onPointerMove={event=>editMode?moveEdit(event):move(event)} onPointerUp={stopJoystick} onPointerCancel={stopJoystick} onLostPointerCapture={stopJoystick}><span className="stick-ring"/><i style={{transform:editMode?'none':'translate('+(stick.x*30)+'px,'+(stick.z*30)+'px)'}}/><small>Déplacement</small></div>
  {!combat&&<div className="world-action-pad" role="group" aria-label="Actions du voyageur">{Object.entries(PLAY_ACTIONS).map(([id,rule])=>{const Icon=icons[id];return <div key={id} className="world-control-slot" style={positionFor(id)} onPointerDownCapture={editMode?event=>startEdit(event,id):undefined} onPointerMove={moveEdit} onPointerUp={finishEdit} onPointerCancel={finishEdit} onLostPointerCapture={finishEdit}><button className={'world-play-action action-'+id} aria-label={rule.label} title={editMode?'Déplacer '+rule.label:rule.label+' · '+controlLabel(controls,id)} onPointerDown={event=>{if(editMode||event.button>0)return;event.preventDefault();event.currentTarget.focus({preventScroll:true});const accepted=onAction(id);if(id==='guard'&&accepted!==false){heldGuard.current=event.pointerId;event.currentTarget.setPointerCapture?.(event.pointerId);onGuardHeld?.(true);}}} onPointerUp={id==='guard'?releaseGuard:undefined} onPointerCancel={id==='guard'?releaseGuard:undefined} onLostPointerCapture={id==='guard'?releaseGuard:undefined} onClick={event=>{if(!editMode&&event.detail===0)onAction(id);}}><Icon size={21}/><span>{rule.label}</span><kbd>{controlLabel(controls,id)}</kbd></button></div>;})}</div>}
  {editMode&&<div className="world-touch-editor" role="group" aria-label="Personnalisation des commandes"><strong>Glisse chaque touche où tu veux</strong><span>Les positions resteront enregistrées sur cet appareil.</span><div><button type="button" onClick={()=>setPositions(resetTouchLayout())}>Par défaut</button><button type="button" onClick={()=>{drag.current=null;setPositions(loadTouchLayout());onCancelLayout?.();}}>Annuler</button><button type="button" className="touch-editor-save" onClick={()=>{drag.current=null;setPositions(saveTouchLayout(positions));onSaveLayout?.();}}>Enregistrer et jouer</button></div></div>}
 </div>;
}
