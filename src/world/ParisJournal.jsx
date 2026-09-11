import React from 'react';
import {parisActivity} from './paris-journey.js';
import {frontierState} from './frontier.js';
export function ParisJournal({save,onNavigate,onPanel}){
 const activity=parisActivity(save),home=frontierState(save,'france');
 return <div className="paris-journal"><span className="world-kicker">PARIS · LES VERRIÈRES</span><h3>Faire vivre les liens</h3><p>Tu t’installes dans un quartier touché par l’Oubli. Ses habitants, ses créatures et ses ateliers peuvent retrouver leur place grâce à tes actions.</p>
  <article><small>UNE PISTE POUR TA PROCHAINE SORTIE</small><h4>{activity.title}</h4><p>{activity.detail}</p><button className="world-primary" onClick={()=>onNavigate(activity.target)}>Repérer ce lieu</button></article>
  <div className="paris-activities">{[
   ['Café des Liens','Échange 6 éclats contre trois provisions avant de partir.','france:cafe'],
   ['Atelier des Verrières','Entre par la grande porte. Change ta tenue et prépare ton style.','france:atelier'],
   ['Refuge des Liens',`Refuge ${home.camp}/8 · atelier ${home.forge}/8 · jardin ${home.garden}/8. Récolte et investis tes matériaux pour renforcer ton groupe.`,'france:camp'],
   ['Les environs','Des rencontres renouvelées après chaque victoire. Repli possible, sans récompense.','france:patrol'],
   ['L’histoire du quartier','Retrouve Léa et les souvenirs pour reconstruire les lieux communs.','france:story'],
   ['Le patrimoine','La Tour Eiffel reste accessible pendant toute ton exploration.','france:landmark'],
  ].map(([name,detail,target])=><button key={name} onClick={()=>onNavigate(target)}><strong>{name}</strong><span>{detail}</span></button>)}</div>
  <button onClick={()=>onPanel('collection')}>Mes personnages et créatures</button><p className="paris-freedom">Ces pistes sont libres. Les expéditions et la vie du monde continuent après la reconstruction.</p>
 </div>;
}
