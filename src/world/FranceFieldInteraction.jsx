import React,{useEffect,useRef} from 'react';
import {Button} from '../design-system/index.jsx';
import {localCampaignInteraction} from './france-field-interaction.js';
import {fieldCampaignEvidence} from './realm-story-field.js';
import './france-field-interaction.css';

/** A local conversation/inspection leaves the camera and walking available.
 * Moving out of range closes it, so a stale open card cannot advance a quest. */
export function FranceFieldInteraction({current,position,objective,onAction,onClose,onNavigate,onCompanionGuard}){
 const card=localCampaignInteraction(current,position,objective),heading=useRef(null);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[objective]);
 if(!card)return null;
 const evidence=fieldCampaignEvidence(current);
 const choices=current.choices||[],actions=current.actions||[];
 return <aside className="france-field-interaction" aria-label={current.region==='france'?'Enquête sur place':'Étape sur place'} onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
 }}>
  <header><span>{card.place}</span><Button variant="ghost" type="button" aria-label="Reprendre la marche" onClick={onClose}>×</Button></header>
  <h3 ref={heading} tabIndex={-1}>{current.name}</h3>
  <p className="france-field-speaker">{card.speaker}</p>
  <p>{current.dialogue}</p>
  {card.clue&&card.clue!==current.dialogue&&<blockquote>{card.clue}</blockquote>}
  {card.message&&<p className="france-field-response" role="status">{card.message}</p>}
  {current.started&&['rhythm','hazard'].includes(current.mode)&&<div className="realm-timing" aria-label={current.safe?'Fenêtre d’action ouverte':'Attendre la fenêtre d’action'}><i style={{left:current.window[0]/current.period*100+'%',width:(current.window[1]-current.window[0])/current.period*100+'%'}}/><b style={{left:current.clock%current.period/current.period*100+'%'}}/><span>{current.safe?'AGIR':'OBSERVER'}</span></div>}
  {!!evidence.length&&<details><summary>Traces recueillies · {evidence.length}</summary><ul>{evidence.map(item=><li key={item.id}>{item.label}</li>)}</ul></details>}
  <div className="france-field-actions">
   {current.integrity<=0?<Button onClick={()=>onAction('retry')}>Reprendre l’étape</Button>:<>
    {choices.map(choice=><Button variant="neutral" key={choice.id} disabled={!card.ready} onClick={()=>onAction(card.operation,choice.id)}>{choice.consequence?<><strong>{choice.label}</strong><small>{choice.consequence}</small></>:choice.label}</Button>)}
    {!choices.length&&!(current.started&&['relay','escort'].includes(current.mode))&&actions.map(action=><Button key={action.operation} disabled={!card.ready} onClick={()=>onAction(action.operation)}>{actions.length===1?card.actionLabel||action.label:action.label}</Button>)}
    {current.mode==='relay'&&<Button variant="neutral" onClick={onCompanionGuard}>Compagnon au premier plateau</Button>}
   </>}
   {current.started&&current.mode==='relay'&&<Button onClick={()=>{onNavigate({id:current.region+':second-plateau',name:'Second plateau',...current.target});onClose();}}>Rejoindre le second plateau</Button>}
   <Button variant="ghost" onClick={onClose}>Reprendre la marche</Button>
  </div>
 </aside>;
}
