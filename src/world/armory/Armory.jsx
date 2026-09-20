import React,{useMemo,useState} from 'react';
import {WEAPONS,getWeapon,weaponAction} from '../arsenal.js';
import {EVOLUTION_XP,FORM_RULES,formName,unlockedForm} from '../arsenal-progression.js';
import {WEAPON_ART_ATLAS,weaponArtStyle,weaponDisplayName,weaponStats} from '../weapon-art.js';
import {ACTIONS} from './actions.js';
import {styleFor} from './weapon-styles.js';
import '../weapon-customizer.css';

const FILTERS=[['all','Toutes'],['signature','8 signatures'],['3b','Voyageur 3B']];

function WeaponArt({weapon,hero=false}){
 const style={'--weapon-atlas':'url("'+WEAPON_ART_ATLAS+'")',...weaponArtStyle(weapon.id)};
 return <span className={'weapon-art '+(hero?'weapon-hero-art':'weapon-card-art')} style={style} role="img" aria-label={'Illustration de '+weaponDisplayName(weapon)}/>;
}
function Stat({label,value}){return <div className="weapon-stat"><span>{label}</span><i className="weapon-stat-track"><b className="weapon-stat-fill" style={{'--value':value}}/></i><strong>{value}</strong></div>;}

export default function Armory({draft,change,xp=0}){
 const [filter,setFilter]=useState('all'),weapon=getWeapon(draft.weapon),tier=unlockedForm(draft.weaponForm,xp),stats=weaponStats(weapon),special=styleFor(draft);
 const light=weaponAction(ACTIONS.light,draft,xp),heavy=weaponAction(ACTIONS.heavy,draft,xp);
 const filtered=useMemo(()=>WEAPONS.filter(item=>filter==='all'||(filter==='signature'?item.country!=='3b':item.country==='3b')),[filter]);
 return <section className="avatar-weapon-studio" aria-label="Armurerie premium 3B">
  <header className="weapon-studio-header"><span className="weapon-studio-kicker">ARSENAL 3B · 16 ARMES CANONIQUES</span><h2>{weaponDisplayName(weapon)}</h2></header>
  <div className="weapon-stage">
   <div className="weapon-stage-art"><WeaponArt weapon={weapon} hero/></div>
   <div className="weapon-hero-info">
    <span className="weapon-type-pill">{weapon.country.toUpperCase()} · {weapon.kind} · FORME {tier+1}</span>
    <h3>{weaponDisplayName(weapon)}</h3><p>{weapon.description}</p>{special&&<p>{special.name} · {special.description}</p>}
    <Stat label="Puissance" value={stats.power}/><Stat label="Vitesse" value={stats.speed}/><Stat label="Portée" value={stats.range}/>
    <div className="weapon-runtime-stats"><span>Rapide <b>{light.damage.toFixed(1)}</b></span><span>Lourde <b>{heavy.damage.toFixed(1)}</b></span><span>Endurance <b>{heavy.cost}</b></span><span>Protection <b>{Math.round(weapon.defense*100)}%</b></span></div>
   </div>
  </div>
  <div className="weapon-gallery-label"><span>Choisir une arme</span><small>{filtered.length} affichées</small></div>
  <div className="weapon-studio-tabs" role="group" aria-label="Filtres de l’armurerie">{FILTERS.map(([id,label])=><button type="button" key={id} className={'weapon-studio-tab '+(filter===id?'is-active':'')} onClick={()=>setFilter(id)}>{label}</button>)}</div>
  <div className="weapon-gallery">{filtered.map(item=><button type="button" className="weapon-card" key={item.id} aria-pressed={weapon.id===item.id} onClick={()=>change({weapon:item.id,weaponForm:0})}><WeaponArt weapon={item}/><strong>{weaponDisplayName(item)}</strong><small>{item.country.toUpperCase()} · {item.kind}</small></button>)}</div>
  <div className="weapon-evolution-label"><span>Évolution de l’arme</span><small>4 formes · déblocage XP Monde</small></div>
  <div className="weapon-evolution-grid">{EVOLUTION_XP.map((required,index)=>{const rule=FORM_RULES[index],locked=xp<required,selected=tier===index;return <button type="button" className="weapon-form-button" key={index} disabled={locked} aria-pressed={selected} onClick={()=>change({weaponForm:index})}><b>FORME {index+1}</b><span>{formName(weapon,index)}</span><small>{locked?(required-Math.floor(xp))+' XP restants':selected?'Équipée':Math.round(rule.damage*100)+'% dégâts · '+Math.round(rule.range*100)+'% portée'}</small></button>;})}</div>
  <p className="weapon-equipped-note">Arme active : {weaponDisplayName(weapon)} · forme {tier+1}. Sauvegardée avec ton personnage.</p>
 </section>;
}
