import React,{useState} from 'react';
import {Button} from '../design-system/index.jsx';
import {COUNTRIES,countryById} from './catalog.js';
import {activeCampaignSnapshot,campaignSnapshot,campaignObjectives} from './campaign-runtime.js';
import {realmDimensions,realmTravelItems} from './realm-layout.js';
import {GUARDIAN_MASTER_SPEC} from './realm-master-spec.js';
import {realmTravelDestinations,realmRelayAvailable} from './realm-navigation.js';
import './realm-journey.css';
const guardianReference=new URL('./media/guardians-master-reference.png',import.meta.url).href;

export function CampaignDialog({save,onAction,onContinue}){
 const current=activeCampaignSnapshot(save);
 if(!current||current.finished)return <p>Cette étape est terminée. Rejoins le prochain repère dans le royaume.</p>;
 return <div className="realm-dialogue">
  <span className="world-kicker">{countryById[current.region]?.name} · {current.title}</span>
  <h3>{current.name}</h3><p>{current.dialogue}</p>
  {current.instruction!==current.dialogue&&<p className="realm-consequence">{current.instruction}</p>}
  <div className="world-actions">
   {current.integrity<=0?<Button onClick={()=>onAction('retry')}>Reprendre cette étape</Button>:<>
    {current.choices.map(choice=><Button variant="neutral" key={choice.id} disabled={current.actionReady===false} onClick={()=>onAction(current.mode==='rebuild'?'repair':'interact',choice.id)}><strong>{choice.label}</strong>{choice.consequence&&<small>{choice.consequence}</small>}</Button>)}
    {!current.choices.length&&current.actions.filter(action=>!current.started||!['escort','relay','rhythm','defend'].includes(current.mode)).map(action=><Button key={action.operation} onClick={()=>onAction(action.operation)}>{action.label}</Button>)}
   </>}
   <Button variant="ghost" onClick={onContinue}>Reprendre dans le monde</Button>
  </div>
  {current.started&&<small>Tu peux suspendre cette épreuve et la reprendre au même endroit.</small>}
 </div>;
}

export function CampaignChallenge({current,onAction,onPlay,onJournal,onNavigate,onCompanionGuard}){
 const [collapsed,setCollapsed]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-height:520px)').matches);
 if(!current?.started||current.finished)return null;
 const cycle=current.clock%current.period,percent=cycle/current.period*100,from=current.window[0]/current.period*100,to=current.window[1]/current.period*100;
 return <aside className={'realm-challenge'+(collapsed?' is-collapsed':'')} aria-label="Épreuve en cours">
  <header><button onClick={()=>setCollapsed(false)}>{current.name}</button><button aria-label={collapsed?'Afficher l’épreuve':'Réduire l’épreuve'} onClick={()=>setCollapsed(v=>!v)}>{collapsed?'+':'−'}</button></header>
  {!collapsed&&<div className="realm-challenge-body">
   <p>{current.instruction}</p>
   {['rhythm','hazard'].includes(current.mode)&&<div className="realm-timing" aria-label={current.safe?'Fenêtre d’action ouverte':'Attendre la fenêtre d’action'}><i style={{left:from+'%',width:(to-from)+'%'}}/><b style={{left:percent+'%'}}/><span>{current.safe?'AGIR':'OBSERVER'}</span></div>}
   <div className="realm-challenge-meters"><label>Étapes {Math.min(current.trial,current.trialCount)}/{current.trialCount}<progress value={current.trial} max={current.trialCount}/></label><label>Intégrité {current.integrity} %<progress value={current.integrity} max="100"/></label></div>
   {current.mode==='rhythm'&&<label>Intensité {current.intensity} / 100<progress value={current.intensity} max="100"/></label>}
   <div className="realm-challenge-actions">
    {current.integrity<=0?<Button onClick={()=>onAction('retry')}>Reprendre</Button>:current.mode==='relay'?<Button onClick={onCompanionGuard}>Compagnon en garde</Button>:current.mode==='rhythm'?<><Button disabled={current.actionReady===false} onClick={()=>onPlay('strike')}>Frapper</Button><Button disabled={current.actionReady===false} onClick={()=>onPlay('guard')}>Garder</Button></>:current.mode==='defend'?<Button disabled={current.actionReady===false} onClick={()=>onPlay('guard')}>Protéger</Button>:['hazard','route'].includes(current.mode)?<Button disabled={current.actionReady===false} onClick={()=>onAction('interact')}>{current.mode==='hazard'?'Traverser':'Confirmer le repère'}</Button>:current.mode==='rebuild'?<Button onClick={onJournal}>Choisir la réparation</Button>:null}
    <Button variant="ghost" onClick={()=>onNavigate(current.escortGoal||current.target)}>Repère</Button>
   </div>
  </div>}
 </aside>;
}

export function RealmJournal({save,onNavigate,onOpenAtlas}){
 const [reference,setReference]=useState(false);
 return <section className="realm-journal">
  <span className="world-kicker">Le Porteur du Lien</span><h3>Huit héritages, un horizon commun</h3>
  <p>Kaïs accompagne les peuples et relie leurs valeurs. Chaque royaume garde ses choix, ses blessures et son Gardien.</p>
  <div className="realm-journal-grid">{COUNTRIES.map(country=>{
   const journey=campaignSnapshot(save,country.id),dimensions=realmDimensions(country.id),guardian=GUARDIAN_MASTER_SPEC[country.id],visited=save.visited.includes(country.id),current=save.region===country.id||save.region==='hub'&&journey?.phaseId==='homecoming';
   const objective=campaignObjectives(save,save.region).find(item=>item.region===country.id);
   return <article key={country.id} style={{'--realm-color':country.color}}>
    <span>{country.name} · {Math.round(dimensions.diameter/100)/10} km à traverser</span><h4>{visited?journey?.title:'Au-delà de la Porte'}</h4>
    <p>{visited?journey?.finished?'L’héritage est retrouvé. Les habitants poursuivent leur vie.':journey?.dialogue:'Traverse la Porte dans la Cité pour rencontrer ce peuple.'}</p>
    {visited&&<progress value={journey?.progress||0} max="1" aria-label={'Progression en '+country.name}/>}
    <small>{save.seals.includes(country.id)?guardian.name+' · '+guardian.resonance+' transmise':visited?'Trois Souvenirs à retrouver · une valeur à traverser':'Un royaume à découvrir'}</small>
    {current&&objective&&<Button variant="neutral" onClick={()=>onNavigate(objective)}>Rejoindre l’étape</Button>}
   </article>;
  })}</div>
  <div className="world-actions"><Button variant="neutral" onClick={onOpenAtlas}>Explorer l’Atlas</Button><Button variant="ghost" aria-expanded={reference} onClick={()=>setReference(v=>!v)}>{reference?'Fermer':'Ouvrir'} la référence des huit Gardiens</Button></div>
  {reference&&<figure className="realm-master-reference"><img src={guardianReference} loading="lazy" alt="Les huit Gardiens du Monde 3B : apparences, armes, valeurs et résonances"/><figcaption>Référence artistique des huit Gardiens.</figcaption></figure>}
 </section>;
}

export function RealmTravelPanel({save,origin,onTravel,onNavigate}){
 const destinations=[...realmTravelDestinations(save).filter(item=>item.id.endsWith(':core')),...realmTravelItems(save.region)];
 return <section className="realm-relays"><span className="world-kicker">{countryById[save.region]?.name} · Relais des voyageurs</span><h3>{origin?.name||'Le réseau du royaume'}</h3><p>Les relais des provinces restent accessibles. Découvre les relais des villages sur place pour les ajouter à tes voyages.</p>
  <div className="realm-relay-list">{destinations.map(destination=>{
   const known=realmRelayAvailable(save,save.region,destination.id),same=destination.id===origin?.id;
   return <article key={destination.id}><div><strong>{destination.name}</strong><small>{same?'Tu es ici':known?'Relais ouvert':'À découvrir sur place'}</small></div>
    {known&&origin?<Button variant="neutral" disabled={same} onClick={()=>onTravel(destination)}>Voyager</Button>:<Button variant="ghost" onClick={()=>onNavigate(destination)}>Repérer</Button>}
   </article>;
  })}</div>
 </section>;
}
