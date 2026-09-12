import {AvatarCinematic} from './AvatarCinematic.jsx';
import React,{useState} from 'react';
import {ArenaStage} from '../arena/ArenaStage.jsx';
import {LOOKS,TRAVEL_GEAR} from './wardrobe.js';
import {COUNTRIES} from './catalog.js';
import {normalizeAvatar,SKINS,OUTFITS,AVATAR_PATHS} from './avatar-rules.js';
import '../arena/arena.css';
export function AvatarPanel({save,act,onDone}){
 const [draft,setDraft]=useState(()=>normalizeAvatar(save.adventure.avatar)),[message,setMessage]=useState(''),[revealed,setRevealed]=useState(false);
 const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
 if(revealed)return <AvatarCinematic avatar={save.adventure.avatar} onDone={()=>{setRevealed(false);onDone?.();}}/>;
 return <div className="avatar-editor"><div className="avatar-preview"><ArenaStage avatar={draft}/><span>Glisse pour tourner</span></div><form className="avatar-fields" onSubmit={e=>{e.preventDefault();if(act({type:'avatar',avatar:draft})){setMessage('Ton personnage est enregistré.');setRevealed(true);}}}>
  <label>Nom du personnage<input maxLength={20} required value={draft.name} onChange={e=>set('name',e.target.value)}/></label>
  <fieldset><legend>Silhouette</legend><div className="world-actions">{['homme','femme'].map(body=><button type="button" key={body} aria-pressed={draft.body===body} onClick={()=>set('body',body)}>{body==='homme'?'Homme':'Femme'}</button>)}</div></fieldset>
  <label>Morphologie<select value={draft.shape} onChange={e=>set('shape',e.target.value)}><option value="equilibre">Équilibrée</option><option value="elance">Élancée</option><option value="solide">Solide</option></select></label>
  <fieldset><legend>Teint</legend><div className="avatar-swatches">{SKINS.map((s,i)=><button type="button" key={s} aria-label={'Teint '+(i+1)} aria-pressed={draft.skin===i} onClick={()=>set('skin',i)} style={{background:s}}/>)}</div></fieldset>
  <div className="avatar-pair"><label>Coiffure<select value={draft.hair} onChange={e=>set('hair',Number(e.target.value))}>{['Rasé','Coupe courte','Chignons','Raie souple','Cheveux longs','Court texturé','Barbe et crâne rasé'].map((name,i)=><option key={name} value={i}>{name}</option>)}</select></label><label>Couleur des cheveux<input type="color" value={draft.hairColor} onChange={e=>set('hairColor',e.target.value)}/></label></div>
  <fieldset><legend>Visage</legend>{[['face','Largeur du visage'],['jaw','Mâchoire'],['nose','Nez']].map(([key,label])=><label className="avatar-range" key={key}>{label}<input type="range" min="-1" max="1" step=".1" value={draft[key]} onChange={e=>set(key,Number(e.target.value))}/></label>)}</fieldset>
  <fieldset className="avatar-looks"><legend>Looks complets · personnalise ensuite chaque détail</legend><div>{LOOKS.map(look=><button type="button" key={look.id} onClick={()=>{const {id,name,...changes}=look;setDraft(d=>({...d,...changes}));}}><i style={{background:look.fabricColor,borderColor:look.accentColor}}/><span>{look.name}</span></button>)}</div></fieldset>
  <label>Coupe de la tenue<select value={draft.style} onChange={e=>set('style',e.target.value)}><option value="voyageur">Voyage · tenue légère</option><option value="sentinelle">Sentinelle · manteau de garde</option><option value="mystique">Résonance · cape d’exploration</option></select></label>
  <fieldset><legend>Couleur de la tenue</legend><div className="avatar-swatches">{OUTFITS.map((s,i)=><button type="button" key={s} aria-label={'Couleur '+(i+1)} aria-pressed={draft.color===i} onClick={()=>setDraft(d=>({...d,color:i,fabricColor:null}))} style={{background:s}}/>)}</div></fieldset>
  <div className="avatar-colors">{[['fabricColor','Tissu'],['accentColor','Détails'],['trouserColor','Pantalon'],['bootColor','Chaussures']].map(([key,label])=><label key={key}>{label}<input type="color" value={draft[key]||OUTFITS[draft.color]} onChange={e=>set(key,e.target.value)}/></label>)}</div>
  <label>Motif<select value={draft.pattern} onChange={e=>set('pattern',e.target.value)}>{[['uni','Uni'],['bandes','Rayures'],['damier','Damier'],['insigne','Signature 3B'],['broderie','Broderie géométrique']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  <div className="avatar-pair"><label>Couvre-chef<select value={draft.headwear} onChange={e=>set('headwear',e.target.value)}><option value="none">Aucun</option><option value="beret">Béret</option><option value="brim">Chapeau de voyage</option><option value="hood">Capuche</option></select></label><label>Accessoire<select value={draft.outer} onChange={e=>set('outer',e.target.value)}><option value="none">Aucun</option><option value="cape">Cape</option><option value="scarf">Écharpe</option><option value="apron">Tablier d’artisan</option></select></label></div>
  <label className="avatar-check"><input type="checkbox" checked={draft.bag} onChange={e=>set('bag',e.target.checked)}/> Sac de voyage</label>
  <label>Équipement de voyage<select value={draft.travelGear} onChange={e=>set('travelGear',e.target.value)}>{Object.entries(TRAVEL_GEAR).map(([id,g])=><option key={id} value={id}>{g.name}</option>)}</select></label><p>{TRAVEL_GEAR[draft.travelGear].description} Sans effet dans l’arène.</p>
  <label>Chaussures<select value={draft.boots} onChange={e=>set('boots',Number(e.target.value))}><option value="0">Chaussures de voyage</option><option value="1">Bottes d’exploration</option><option value="2">Bottes de garde</option></select></label>
  <label>Origines personnelles · tous les pays<input maxLength={50} placeholder="Pays ou origines de ton choix" value={draft.nationality} onChange={e=>set('nationality',e.target.value)}/></label>
  <label>Pays de cœur dans le Monde 3B<select value={draft.origin} onChange={e=>set('origin',e.target.value)}><option value="3b">L’Union des huit portes</option>{COUNTRIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label>Voie de pouvoir<select value={draft.path} onChange={e=>set('path',e.target.value)}>{Object.entries(AVATAR_PATHS).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select></label><p>{AVATAR_PATHS[draft.path].description}</p><small>Ton apparence et tes origines restent libres. La voie influence l’aventure ; les duels de l’arène utilisent les statistiques équilibrées des personnages.</small>
  <button className="world-primary" type="submit">{save.adventure.avatar.created?'Enregistrer mon personnage':'Commencer mon voyage'}</button><p role="status">{message}</p>
 </form></div>;
}
