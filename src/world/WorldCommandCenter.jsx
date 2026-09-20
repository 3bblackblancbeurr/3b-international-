import React,{useState} from 'react';
import {Play,Map as MapIcon,Users,Swords,Footprints,BookOpen,Sparkles,Settings,Maximize,Compass,ArrowLeft,RotateCcw,Download,Volume2,VolumeX} from 'lucide-react';
import {CHARACTERS,countryById} from './catalog.js';
import {levelFor} from './rules.js';
import {getWeapon} from './arsenal.js';
import {weaponDisplayName} from './weapon-art.js';
import './command-center.css';

const TABS=[
 ['play','JOUER',Play],
 ['world','MONDE',MapIcon],
 ['character','PERSONNAGE',Sparkles],
 ['system','SYSTÈME',Settings],
];

function Action({icon:Icon,title,detail,onClick,primary=false}){
 return <button type="button" className={'command-action '+(primary?'is-primary':'')} onClick={onClick}><Icon size={20}/><span><strong>{title}</strong>{detail&&<small>{detail}</small>}</span></button>;
}

export default function WorldCommandCenter({save,snapshot,uid,sound,audioMix,quality,saveMessage,rewardMessage,onPanel,onResume,onFullscreen,onToggleCamera,onExit,onToggleSound,onSync,onExportSave,onImportSave,onAccount,onQuality,onDifficulty,onCameraFollow,onAudioMix}){
 const [tab,setTab]=useState('play'),country=countryById[snapshot.region],weapon=getWeapon(save.adventure.avatar.weapon),level=levelFor(save.xp),owned=CHARACTERS.filter(person=>save.collection[person.id]).length;
 return <section className="command-center" aria-label="Centre de commande du Monde 3B">
  <header className="command-summary">
   <div className="command-avatar">{(save.adventure.avatar.name||'V').slice(0,1).toUpperCase()}</div>
   <div><span className="world-kicker">MONDE DU 3B · SESSION ACTIVE</span><h3>{save.adventure.avatar.name||'Voyageur'} <small>NIV. {level}</small></h3><p>{country?.name||'Cité des Huit Héritages'} · {snapshot.district||'Exploration'} · {weaponDisplayName(weapon)}</p></div>
   <div className="command-counters"><span><b>{save.xp}</b>XP</span><span><b>{save.shards}</b>Éclats</span><span><b>{owned}</b>Alliés</span></div>
  </header>

  <nav className="command-tabs" aria-label="Rubriques du centre de commande">
   {TABS.map(([id,label,Icon])=><button type="button" key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}><Icon size={19}/><span>{label}</span></button>)}
  </nav>

  <div className="command-body">
   {tab==='play'&&<section className="command-pane">
    <div className="command-hero"><span>REPRENDRE L’EXPLORATION</span><h4>{snapshot.district||country?.name||'Cité des Huit Héritages'}</h4><p>{snapshot.waypoint?'Repère actif : '+snapshot.waypoint.name+' · '+snapshot.remaining+' m':'Le monde continue là où tu l’as laissé.'}</p><button type="button" onClick={onResume}><Play size={21}/> Reprendre maintenant</button></div>
    <div className="command-grid"><Action icon={BookOpen} title="Missions & chapitres" detail="Objectifs, progression, Cité" onClick={()=>onPanel('journal')}/><Action icon={Users} title="Mon équipe" detail="Leader, alliés, pouvoirs" onClick={()=>onPanel('team')}/><Action icon={Swords} title="Arène 3B" detail="Combat et entraînement" onClick={()=>onPanel('arena')}/><Action icon={Users} title="Compagnons" detail={owned+' / '+CHARACTERS.length+' rencontrés'} onClick={()=>onPanel('collection')}/></div>
   </section>}

   {tab==='world'&&<section className="command-pane"><div className="command-section-title"><span>EXPLORATION</span><h4>Le monde autour de toi</h4></div><div className="command-grid"><Action icon={MapIcon} title="Atlas des 8 portes" detail="Pays, repères et itinéraires" onClick={()=>onPanel('atlas')} primary/><Action icon={Footprints} title="Mode dehors" detail="GPS et échos du monde" onClick={()=>onPanel('gps')}/><Action icon={BookOpen} title="Histoire & Cité" detail="Chapitres, souvenirs, progression" onClick={()=>onPanel('journal')}/><Action icon={Sparkles} title="Ville 3B" detail="Construction et progression personnelle" onClick={()=>onPanel('city3b')}/></div></section>}

   {tab==='character'&&<section className="command-pane"><div className="command-character-card"><div className="command-character-mark">{(save.adventure.avatar.name||'V').slice(0,1).toUpperCase()}</div><div><span>ÉQUIPEMENT ACTIF</span><h4>{weaponDisplayName(weapon)}</h4><p>{weapon.kind} · forme {(save.adventure.avatar.weaponForm||0)+1} · {save.adventure.avatar.style}</p></div></div><div className="command-grid"><Action icon={Sparkles} title="Personnage & armes" detail="Apparence, textile, 16 armes" onClick={()=>onPanel('avatar')} primary/><Action icon={Users} title="Compagnons" detail="Collection et aptitudes" onClick={()=>onPanel('collection')}/><Action icon={Users} title="Équipe" detail="Leader et trois alliés" onClick={()=>onPanel('team')}/><Action icon={BookOpen} title="Style du voyageur" detail="Tenues et récompenses" onClick={()=>onPanel('wardrobe')}/></div></section>}

   {tab==='system'&&<section className="command-pane"><div className="command-grid command-system-actions"><Action icon={Maximize} title="Plein écran" onClick={onFullscreen}/><Action icon={Compass} title="Changer de vue" onClick={onToggleCamera}/><Action icon={sound?Volume2:VolumeX} title={'Sons '+(sound?'activés':'désactivés')} onClick={onToggleSound}/><Action icon={RotateCcw} title="Synchroniser" detail={saveMessage} onClick={onSync}/><Action icon={Download} title="Sauvegarde locale" detail="Exporter une copie JSON" onClick={onExportSave}/><Action icon={Users} title={uid?'Mon compte 3B':'Jouer avec mon compte'} onClick={onAccount}/></div>
    <details className="command-settings"><summary>Réglages avancés</summary>
     <div className="command-selects"><label>Difficulté<select value={save.adventure.difficulty} onChange={event=>onDifficulty(event.target.value)}><option value="adventure">Aventure</option><option value="expert">Expert</option></select></label><label>Caméra<select value={snapshot.camera?.follow===false?'free':'follow'} onChange={event=>onCameraFollow(event.target.value==='follow')}><option value="follow">Suivi automatique</option><option value="free">Angle libre</option></select></label><label>Qualité<select value={quality} onChange={event=>onQuality(event.target.value)}><option value="auto">Automatique</option><option value="fluid">Fluidité</option><option value="detail">Détails</option></select></label></div>
     <div className="command-audio">{[['master','Général'],['music','Musique'],['ambience','Ambiance'],['sfx','Effets'],['voice','Voix']].map(([key,label])=><label key={key}><span>{label}<b>{Math.round(audioMix[key]*100)}%</b></span><input type="range" min="0" max="1" step=".01" value={audioMix[key]} onChange={event=>onAudioMix(key,event.target.value)}/></label>)}</div>
     {!uid&&<label className="command-import">Restaurer une copie invitée<input type="file" accept=".json,application/json" onChange={onImportSave}/></label>}
     <p className="command-status">{rewardMessage}</p>
    </details>
    <button type="button" className="command-exit" onClick={onExit}><ArrowLeft size={18}/> Quitter le Monde du 3B</button>
   </section>}
  </div>
 </section>;
}
