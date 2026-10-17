import React,{useEffect,useRef} from 'react';
import {Button} from '../design-system/index.jsx';
import {franceFieldInteraction,franceCollectedEvidence} from './france-field-interaction.js';
import './france-field-interaction.css';

/** A local conversation/inspection leaves the camera and walking available.
 * Moving out of range closes it, so a stale open card cannot advance a quest. */
export function FranceFieldInteraction({current,position,objective,onAction,onClose,onNavigate,onCompanionGuard}){
 const card=franceFieldInteraction(current,position,objective),heading=useRef(null);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[objective]);
 if(!card)return null;
 const evidence=franceCollectedEvidence(current.inventory);
 const choices=current.choices||[],actions=current.actions||[];
 return <aside className="france-field-interaction" aria-label="Enquête sur place" onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
 }}>
  <header><span>{card.place}</span><Button variant="ghost" type="button" aria-label="Reprendre la marche" onClick={onClose}>×</Button></header>
  <h3 ref={heading} tabIndex={-1}>{current.name}</h3>
  <p className="france-field-speaker">{card.speaker}</p>
  <p>{current.dialogue}</p>
  {card.clue&&<blockquote>{card.clue}</blockquote>}
  {card.message&&<p className="france-field-response" role="status">{card.message}</p>}
  {!!evidence.length&&<details><summary>Traces recueillies · {evidence.length}</summary><ul>{evidence.map(item=><li key={item.id}>{item.label}</li>)}</ul></details>}
  <div className="france-field-actions">
   {current.integrity<=0?<Button onClick={()=>onAction('retry')}>Reprendre l’étape</Button>:<>
    {choices.map(choice=><Button variant="neutral" key={choice.id} disabled={!card.ready} onClick={()=>onAction(card.operation,choice.id)}>{choice.label}</Button>)}
    {!choices.length&&!(current.started&&current.mode==='relay')&&actions.map(action=><Button key={action.operation} disabled={!card.ready} onClick={()=>onAction(action.operation)}>{card.actionLabel||action.label}</Button>)}
    {current.mode==='relay'&&<Button variant="neutral" onClick={onCompanionGuard}>Compagnon au premier plateau</Button>}
   </>}
   {current.started&&current.mode==='relay'&&<Button onClick={()=>{onNavigate({id:'france:second-plateau',name:'Second plateau',...current.target});onClose();}}>Rejoindre le second plateau</Button>}
   <Button variant="ghost" onClick={onClose}>Reprendre la marche</Button>
  </div>
 </aside>;
}
