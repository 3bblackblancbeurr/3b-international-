import React,{useState} from 'react';
import {ArenaStage} from '../arena/ArenaStage.jsx';
import {COUNTRIES} from './catalog.js';
import {normalizeAvatar,SKINS,OUTFITS,AVATAR_PATHS} from './avatar-rules.js';
import '../arena/arena.css';
export function AvatarPanel({save,act,onDone}){
 const [draft,setDraft]=useState(()=>normalizeAvatar(save.adventure.avatar)),[message,setMessage]=useState('');
 const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
 return <div className="avatar-editor"><div className="avatar-preview"><ArenaStage avatar={draft}/><span>Glisse pour tourner</span></div><form className="avatar-fields" onSubmit={e=>{e.preventDefault();if(act({type:'avatar',avatar:draft})){setMessage('Ton personnage est enregistré.');onDone?.();}}}>
  <label>Nom du personnage<input maxLength={20} required value={draft.name} onChange={e=>set('name',e.target.value)}/></label>
  <fieldset><legend>Silhouette</legend><div className="world-actions">{['homme','femme'].map(body=><button type="button" key={body} aria-pressed={draft.body===body} onClick={()=>set('body',body)}>{body==='homme'?'Homme':'Femme'}</button>)}</div></fieldset>
  <label>Morphologie<select value={draft.shape} onChange={e=>set('shape',e.target.value)}><option value="equilibre">Équilibrée</option><option value="elance">Élancée</option><option value="solide">Solide</option></select></label>
  <fieldset><legend>Teint</legend><div className="avatar-swatches">{SKINS.map((s,i)=><button type="button" key={s} aria-label={'Teint '+(i+1)} aria-pressed={draft.skin===i} onClick={()=>set('skin',i)} style={{background:s}}/>)}</div></fieldset>
  <div className="avatar-pair"><label>Coiffure<select value={draft.hair} onChange={e=>set('hair',Number(e.target.value))}>{['Rasé','Coupe courte','Chignons','Raie souple','Cheveux longs','Court texturé','Barbe et crâne rasé'].map((name,i)=><option key={name} value={i}>{name}</option>)}</select></label><label>Couleur des cheveux<input type="color" value={draft.hairColor} onChange={e=>set('hairColor',e.target.value)}/></label></div>
  <fieldset><legend>Visage</legend>{[['face','Largeur du visage'],['jaw','Mâchoire'],['nose','Nez']].map(([key,label])=><label className="avatar-range" key={key}>{label}<input type="range" min="-1" max="1" step=".1" value={draft[key]} onChange={e=>set(key,Number(e.target.value))}/></label>)}</fieldset>
  <label>Tenue<select value={draft.style} onChange={e=>set('style',e.target.value)}><option value="voyageur">Voyage · tenue légère</option><option value="sentinelle">Sentinelle · manteau de garde</option><option value="mystique">Résonance · cape d’exploration</option></select></label>
  <fieldset><legend>Couleur de la tenue</legend><div className="avatar-swatches">{OUTFITS.map((s,i)=><button type="button" key={s} aria-label={'Couleur '+(i+1)} aria-pressed={draft.color===i} onClick={()=>set('color',i)} style={{background:s}}/>)}</div></fieldset>
  <label>Chaussures<select value={draft.boots} onChange={e=>set('boots',Number(e.target.value))}><option value="0">Chaussures de voyage</option><option value="1">Bottes d’exploration</option><option value="2">Bottes de garde</option></select></label>
  <label>Origines personnelles · tous les pays<input maxLength={50} placeholder="Pays ou origines de ton choix" value={draft.nationality} onChange={e=>set('nationality',e.target.value)}/></label>
  <label>Pays de cœur dans le Monde 3B<select value={draft.origin} onChange={e=>set('origin',e.target.value)}><option value="3b">L’Union des huit portes</option>{COUNTRIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label>Voie de pouvoir<select value={draft.path} onChange={e=>set('path',e.target.value)}>{Object.entries(AVATAR_PATHS).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select></label><p>{AVATAR_PATHS[draft.path].description}</p><small>Ton apparence et tes origines restent libres. La voie influence l’aventure ; les duels de l’arène utilisent les statistiques équilibrées des cartes.</small>
  <button className="world-primary" type="submit">{save.adventure.avatar.created?'Enregistrer mon personnage':'Commencer mon voyage'}</button><p role="status">{message}</p>
 </form></div>;
}
