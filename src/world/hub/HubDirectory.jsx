import React,{useMemo,useState} from 'react';
import {HUB_PLAN} from './runtime-data.js';
import {hubMissionJournal} from './mission-journal.js';
import {hubDistrictEffects} from './mission-effects.js';
import './hub-directory.css';

const TYPES={hubBuilding:'Bâtiment',hubNpc:'Habitant',hubMission:'Mission',hubTransport:'Transport'};
export default function HubDirectory({save,items,position,onSelect,onJournal}){
 const [selected,setSelected]=useState('heritage_square');
 const district=HUB_PLAN.districts.find(d=>d.id===selected)||HUB_PLAN.districts[0];
 const missions=useMemo(()=>hubMissionJournal(save),[save]);
 const visited=save.hub?.stats?.districtVisits||[];
 const locations=items.filter(i=>i.district===district.id&&TYPES[i.type]&&i.boardable!==false);
 const districtItem=items.find(i=>i.type==='hubDistrict'&&i.district===district.id);
 const distance=item=>Math.round(Math.hypot(item.x-position.x,item.z-position.z));
 return <section className="hub-directory" aria-label="Les dix quartiers de la Cité">
  <header className="hub-directory-intro"><span className="world-kicker">LA CITÉ DES HUIT HÉRITAGES</span><h3>Un quartier, une rencontre.</h3><p>Les habitants préservent les liens que l’Oubli menace. Explore la Cité, retrouve leurs récits et prépare la suite de ton voyage.</p><small>{visited.length} / 10 quartiers visités · {missions.filter(m=>m.claimed).length} / {missions.length} missions accomplies</small></header>
  <div className="hub-directory-layout"><nav aria-label="Choisir un quartier">{HUB_PLAN.districts.map((d,index)=><button key={d.id} aria-pressed={d.id===district.id} onClick={()=>setSelected(d.id)}><span>{String(index+1).padStart(2,'0')}</span><strong>{d.name}</strong>{visited.includes(d.id)&&<small aria-label="Visité">✓</small>}</button>)}</nav>
   <div className="hub-district-detail"><h3>{district.name}</h3><p>{district.purpose}.</p>{districtItem&&<button className="world-primary" onClick={()=>onSelect(districtItem)}>Rejoindre le quartier · {distance(districtItem)} m</button>}
    {hubDistrictEffects(save.hub,district.id).length>0&&<section aria-label="Ce que tu as changé"><h4>Ce que tu as changé</h4>{hubDistrictEffects(save.hub,district.id).map(effect=><article className="hub-district-mission" key={effect.missionId}><strong>{effect.label}</strong><p>{effect.detail}</p></article>)}</section>}
    <h4>Rencontres et lieux</h4><div className="hub-district-locations">{locations.filter(i=>i.type!=='hubMission').map(item=><button key={item.id} onClick={()=>onSelect(item)}><small>{TYPES[item.type]} · {distance(item)} m</small><strong>{item.name}</strong><span>{item.role||item.activity||'Placer un repère'} →</span></button>)}</div>
    <h4>Histoires du quartier</h4>{missions.filter(m=>m.district===district.id).map(m=>{const target=items.find(i=>i.type==='hubMission'&&i.missionId===m.id);return <article className="hub-district-mission" key={m.id}><strong>{m.title}</strong><p>{m.claimed?'Mission accomplie':m.locked?'À poursuivre après : '+m.missingPrerequisites.join(', '):m.status==='active'?m.objectives[m.completedObjectives]:m.status==='completed'?'Retourne chercher ta récompense.':m.objectives[0]}</p><button disabled={!target||m.claimed||m.locked} onClick={()=>onSelect(target)}>{m.claimed?'Accomplie':m.locked?'À débloquer':'Rejoindre la mission'}</button></article>;})}
    <button onClick={onJournal}>Consulter le journal complet</button>
   </div></div>
 </section>;
}
