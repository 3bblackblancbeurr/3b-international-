import React from 'react';
import {hubBuildingService} from './building-services.js';
import {hubInteriorSpec} from './interiors.js';
import './hub-building.css';

export default function HubBuildingPanel({save,item,onPanel,onEnter,goTo,onClose}){
 const service=hubBuildingService(item,save);
 if(!service)return <div className="hub-building-panel"><p>Ce lieu n’est pas disponible.</p><button type="button" onClick={onClose}>Revenir dans la Cité</button></div>;
 return <article className="hub-building-panel" aria-label={service.name}>
  <header><span className="world-kicker">{service.district}</span><h3>{service.name}</h3><p>{service.purpose}</p></header>
  <section className="hub-building-invitation"><h4>Dans ce lieu</h4><p>{service.hook}</p></section>
  {onEnter&&hubInteriorSpec(item,save)&&<div className="hub-building-actions"><button type="button" className="world-primary" onClick={onEnter}>Entrer dans {service.name}<span aria-hidden="true">→</span></button><p className="hub-building-cell-note">Explore le lieu à pied et utilise ses postes. La sortie te ramène à ton point d’entrée dans la Cité.</p></div>}
  {service.missions.length>0&&<section aria-label="Missions liées"><h4>Fils de l’histoire</h4><ul className="hub-building-missions">{service.missions.map(mission=><li key={mission.id}><strong>{mission.title}</strong><span>{mission.status}</span></li>)}</ul></section>}
  <div className="hub-building-actions">{service.actions.map((action,index)=><button type="button" key={action.kind+':'+action.target} className={index===0?'world-primary':''} onClick={()=>{if(action.kind==='route'){onClose();goTo(action.target);}else onPanel(action.target);}}>{action.label}<span aria-hidden="true">↗</span></button>)}</div>
  {service.unavailable.length>0&&<section className="hub-building-dormant"><h4>Services non ouverts</h4><ul>{service.unavailable.map(label=><li key={label}>{label}</li>)}</ul></section>}
  <button type="button" className="hub-building-return" onClick={onClose}>Revenir dans la Cité</button>
 </article>;
}
