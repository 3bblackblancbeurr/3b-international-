import React from 'react';
import {BUILDINGS,RESOURCE_SITES,frontierState,buildCost,masteryLevel} from './frontier.js';
import {cardById} from './catalog.js';

export function FrontierPanel({save,act,onNavigate}){
 const home=frontierState(save);
 return <div className="frontier-panel"><small>TON LIEU DANS CE PAYS</small><h3>Construire. Protéger. Grandir.</h3><p>Développe ton refuge à ton rythme. Les expéditions se renouvellent ; ton groupe conserve son expérience.</p>
  <div className="frontier-stock"><span>Bois <b>{home.wood}</b></span><span>Pierre <b>{home.stone}</b></span><span>Provisions <b>{home.food}</b></span></div>
  <div className="frontier-buildings">{Object.entries(BUILDINGS).map(([id,b])=>{const cost=buildCost(home,id);return <article key={id}><div><h4>{b.name} <small>{home[id]}/8</small></h4><p>{b.detail}</p></div><button disabled={home[id]>=8||home.wood<cost.wood||home.stone<cost.stone} onClick={()=>act({type:'build',building:id})}>{home[id]>=8?'Rang maximal':home[id]?'Améliorer':'Construire'}<small>{home[id]<8?`${cost.wood} bois · ${cost.stone} pierre`:''}</small></button></article>;})}</div>
  <h4>Prochaine sortie</h4><div className="frontier-gather">{RESOURCE_SITES.map(p=><button disabled={home.harvest.includes(p.id)} key={p.id} onClick={()=>onNavigate(save.region+':resource:'+p.id)}>{home.harvest.includes(p.id)?'✓ Récolté':p.name}<small>{home.harvest.includes(p.id)?'Revient après une victoire':'Repérer dans la campagne'}</small></button>)}</div>
  <button className="world-primary" disabled={!home.food} onClick={()=>onNavigate(save.region+':patrol')}>Protéger les environs · 1 provision</button>
  {!home.food&&<button onClick={()=>act({type:'recover'})}>Préparer une ration de secours</button>}
  <p className="frontier-note">Victoire : +35 XP monde, +8 éclats, +30 expérience pour chaque membre du groupe et retour des ressources. Un repli coûte la provision engagée, sans perdre tes constructions. Rien ne se dégrade hors connexion.</p>
  <h4>Ton groupe s’entraîne</h4><div className="frontier-mastery">{[save.leader,...save.team].map(id=><div key={id}><span>{cardById[id].name}</span><b>Maîtrise {masteryLevel(save.adventure.mastery?.[id])}</b><small>{save.adventure.mastery?.[id]||0} expérience</small></div>)}</div>
 </div>;
}
