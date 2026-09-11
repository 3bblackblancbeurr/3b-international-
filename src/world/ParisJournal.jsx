import {DISTRICT_JOBS} from './district-jobs.js';
import {countryById} from './catalog.js';
import {CHAPTERS} from './chapters.js';
import {HERITAGE} from './heritage.js';
import React from 'react';
import {parisActivity} from './paris-journey.js';
import {frontierState} from './frontier.js';
export function ParisJournal({save,onNavigate,onPanel,act}){
 const activity=parisActivity(save),home=frontierState(save),region=save.region;
 return <div className="paris-journal"><span className="world-kicker">{countryById[region]?.name.toUpperCase()} · LES LIENS</span><h3>Faire vivre les liens</h3><p>Tu t’installes dans un quartier touché par l’Oubli. Ses habitants, ses créatures et ses ateliers peuvent retrouver leur place grâce à tes actions.</p>
  <article><small>UNE PISTE POUR TA PROCHAINE SORTIE</small><h4>{activity.title}</h4><p>{activity.detail}</p><button className="world-primary" onClick={()=>onNavigate(activity.target)}>Repérer ce lieu</button></article>
  <div className="paris-activities">{[
   ...(region==='france'?[['Café des Liens','Échange 6 éclats contre trois provisions avant de partir.','france:cafe']]:[]),
   [region==='france'?'Atelier des Verrières':'L’atelier du quartier','Retrouve les artisans, change ta tenue et prépare ton style.',region+':atelier'],
   ['Refuge des Liens',`Refuge ${home.camp}/8 · atelier ${home.forge}/8 · jardin ${home.garden}/8. Récolte et investis tes matériaux pour renforcer ton groupe.`,region+':camp'],
   ['Les environs','Des rencontres renouvelées après chaque victoire. Repli possible, sans récompense.',region+':patrol'],
   ['L’histoire du quartier','Retrouve '+CHAPTERS[region]?.resident+' et les souvenirs du quartier.',region+':story'],
   ['Le patrimoine',HERITAGE[region]?.name+' reste accessible pendant toute ton exploration.',region+':landmark'],
  ].map(([name,detail,target])=><button key={name} onClick={()=>onNavigate(target)}><strong>{name}</strong><span>{detail}</span></button>)}</div>
  <h3>Les habitants ont besoin de toi</h3><div className="paris-activities">{Object.entries(DISTRICT_JOBS).map(([id,job])=><article key={id}><h4>{job.title}</h4><p>{job.detail}</p>{home.activeJob===id?<button onClick={()=>onNavigate(region+':job:'+id)}>Rejoindre la livraison</button>:<button disabled={!!home.activeJob||home.jobs?.includes(id)||home.food<job.cost} onClick={()=>act({type:'jobAccept',id})}>{home.jobs?.includes(id)?'Merci pour ton aide':'Partir · 1 provision'}</button>}</article>)}</div>
  <button onClick={()=>onPanel('party')}>Construire avec mon groupe</button>
  <button onClick={()=>onPanel('collection')}>Mes personnages et créatures</button><p className="paris-freedom">Ces pistes sont libres. Les expéditions et la vie du monde continuent après la reconstruction.</p>
 </div>;
}
