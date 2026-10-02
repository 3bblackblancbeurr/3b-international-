import {DISTRICT_JOBS,jobAvailableInContext} from './district-jobs.js';
import {countryById} from './catalog.js';
import {CHAPTERS} from './chapters.js';
import {HERITAGE} from './heritage.js';
import React from 'react';
import {parisActivity} from './paris-journey.js';
import {frontierState} from './frontier.js';
import {FRANCE_RESIDENTS,franceResidentState,franceDistrictState} from './france-life.js';

export function ParisJournal({save,onNavigate,onPanel,act,residentId=null}){
 const activity=parisActivity(save),home=frontierState(save),region=save.region;
 const district=region==='france'?franceDistrictState(home):null;
 const resident=region==='france'?franceResidentState(residentId,home,new Date().getHours()):null;
 const jobs=Object.entries(DISTRICT_JOBS).filter(([id,job])=>jobAvailableInContext(job,region,save.seals)&&(!resident||resident.jobs.includes(id)||home.activeJob===id));
 return <div className="paris-journal"><span className="world-kicker">{countryById[region]?.name.toUpperCase()} · LES LIENS</span><h3>{resident?resident.name+' · '+resident.role:'Faire vivre les liens'}</h3>
  <p>{resident?resident.text:'Les habitants, les créatures et les ateliers du quartier retrouvent leur place grâce à tes actions.'}</p>
  {resident&&<p>{resident.activityLabel}. Tu peux accepter un contrat ou repartir librement.</p>}
  <article><small>TA PROCHAINE ACTION</small><h4>{activity.title}</h4><p>{activity.detail}</p><button className="world-primary" onClick={()=>onNavigate(activity.target)}>Repérer ce lieu</button></article>
  {home.activeJob&&<article><h4>Contrat en cours · {DISTRICT_JOBS[home.activeJob].title}</h4><p>Tu peux l’abandonner. Les provisions engagées restent consommées ; aucune récompense n’est attribuée.</p><button onClick={()=>act({type:'jobAbandon',id:home.activeJob})}>Abandonner ce contrat</button></article>}
  {district&&<article><h4>Le quartier se souvient</h4><p>{district.gardenRestored?'Récoltes rétablies · panier du café à 4 éclats.':'Panier du café à 6 éclats · les jardiniers ont besoin d’aide.'}</p><p>{district.sourceRestored?'Source dégagée · +1 provision par récolte.':'La source reste encombrée.'}</p><p>{district.peopleRescued?'Les personnes recherchées ont été secourues.':'Le refuge organise les recherches.'}</p><p>{district.routeRestored?'Le passage a été réparé et vérifié.':'Le passage a besoin de réparations.'}</p></article>}
  {region==='france'&&<><h3>Rencontrer les habitants</h3><div className="paris-activities">{FRANCE_RESIDENTS.map(npc=><button key={npc.id} onClick={()=>onNavigate('france:resident:'+npc.id)}><strong>{npc.name} · {npc.role}</strong><span>{franceResidentState(npc.id,home,new Date().getHours()).activityLabel}</span></button>)}</div></>}
  <div className="paris-activities">{[
   ...(region==='france'?[['Café des Liens',`Trois provisions pour ${district.basketPrice} éclats.`,'france:cafe']]:[]),
   [region==='france'?'Atelier des Verrières':'L’atelier du quartier','Retrouve les artisans et prépare ton style.',region+':atelier'],
   ['Refuge des Liens',`Refuge ${home.camp}/8 · atelier ${home.forge}/8 · jardin ${home.garden}/8. Investis tes matériaux pour renforcer ton groupe.`,region+':camp'],
   ['Les environs','Une victoire renouvelle les récoltes et les contrats. Le quartier garde le souvenir de ton aide.',region+':patrol'],
   ['L’histoire du quartier','Retrouve '+CHAPTERS[region]?.resident+' et les souvenirs du quartier.',region+':story'],
   ['Le patrimoine',HERITAGE[region]?.name,region+':landmark'],
  ].map(([name,detail,target])=><button key={name} onClick={()=>onNavigate(target)}><strong>{name}</strong><span>{detail}</span></button>)}</div>
  <h3>{resident?'Les demandes de '+resident.name:'Les habitants ont besoin de toi'}</h3><div className="paris-activities">{jobs.map(([id,job])=><article key={id}><h4>{job.title}</h4><p>{job.detail}</p><p>{job.xp} XP · {job.shards} éclats · {Object.entries(job.reward).map(([key,value])=>value+' '+({wood:'bois',stone:'pierres',food:'provisions'}[key]||key)).join(', ')}</p>{home.activeJob===id?<button onClick={()=>onNavigate(activity.target)}>Rejoindre la prochaine étape</button>:<button disabled={!!home.activeJob||home.jobs?.includes(id)||home.food<job.cost} onClick={()=>act({type:'jobAccept',id})}>{home.jobs?.includes(id)?'Merci pour ton aide':job.cost?'Accepter · '+job.cost+' provision':'Accepter · sans provision'}</button>}</article>)}</div>
  {resident&&<button onClick={()=>onPanel(null)}>Pas maintenant · reprendre l’exploration</button>}
  <button onClick={()=>onPanel('party')}>Construire avec mon groupe</button><button onClick={()=>onPanel('collection')}>Mes personnages et créatures</button>
 </div>;
}
