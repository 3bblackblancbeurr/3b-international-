import React,{useRef,useState} from 'react';
import {partyRequest} from './cooperation.js';
import {countryById} from './catalog.js';
import {frontierState} from './frontier.js';
export function PartyPanel({uid,state,save,connection,onState,onRefreshWorld,onFlush,onLocate,onLogin,onSignal}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false),contribution=useRef(null),locked=useRef(false);
 async function command(kind,payload={}){if(locked.current)return;locked.current=true;setBusy(true);setError('');try{if(kind==='contribute'){await onFlush();contribution.current ||= crypto.randomUUID();payload.request=contribution.current;}const data=await partyRequest(kind,payload);onState(data);if(kind==='contribute'){await onRefreshWorld();contribution.current=null;}}catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}}
 if(!uid)return <div className="party-panel"><h3>Explorer ensemble</h3><p>Crée un groupe privé de quatre voyageurs. Retrouvez-vous dans un pays et bâtissez un refuge commun avec vos ressources.</p><button className="world-primary" onClick={onLogin}>Me connecter à mon compte 3B</button><p>Ton exploration en invité reste disponible.</p></div>;
 const party=state?.party,home=frontierState(save),camp=party?.camps?.[save.region]||{rank:0,wood:0,stone:0};
 return <div className="party-panel">
  <p className="party-intro">Un monde à partager, jusqu’à quatre. Chaque membre garde son personnage et sa progression.</p>
  {!party?<><button disabled={busy} className="world-primary" onClick={()=>command('create')}>Créer mon groupe</button><form onSubmit={e=>{e.preventDefault();command('join',{code});}}><label htmlFor="party-code">Code d’un groupe</label><div><input id="party-code" autoComplete="off" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g,'').slice(0,12))} placeholder="12 caractères"/><button disabled={busy||code.length!==12}>Rejoindre</button></div></form></>:<>
   <div className="party-code"><span>Ton groupe · {state.members.length}/4</span><strong>{party.code}</strong><button onClick={async()=>{try{await navigator.clipboard.writeText(party.code);setCopied(true);}catch{setError('Sélectionne le code pour le copier.');}}}>{copied?'Code copié':'Copier le code'}</button></div>
   <p className="party-connection" role="status">{connection==='connected'?'● En ligne':connection==='reconnecting'?'Reconnexion en cours…':'Connexion au groupe…'}</p>
   <ul className="party-members">{state.members.map(m=><li key={m.id}><span>{m.avatar?.name||'Voyageur'}{m.id===uid?' · toi':''}</span><small>{countryById[m.region]?.name||'Nexus'}</small><button disabled={m.id===uid} onClick={()=>onLocate(m)}>Rejoindre</button></li>)}</ul>
   <div className="party-signals"><button onClick={()=>onSignal('hello')}>Saluer</button><button onClick={()=>onSignal('follow')}>Suivez-moi</button><button onClick={()=>onSignal('help')}>Besoin d’aide</button></div>
   {save.region!=='hub'&&<div className="party-project"><span>NOTRE REFUGE · {countryById[save.region]?.name}</span><h3>{camp.rank?'Rang '+camp.rank:'Un lieu à bâtir ensemble'}</h3><p>{camp.rank>=8?'Votre refuge commun a atteint son dernier agrandissement.':`${camp.wood}/${6*(camp.rank+1)} bois · ${camp.stone}/${3*(camp.rank+1)} pierre pour le prochain rang.`}</p><button disabled={busy||home.wood<2||home.stone<1||camp.rank>=8||!!save.adventure.encounter&&!save.adventure.encounter.result} onClick={()=>command('contribute')}>Contribuer · 2 bois + 1 pierre</button><button onClick={()=>onLocate({camp:true})}>Voir notre chantier</button><small>Ces matériaux seront retirés de tes réserves de ce pays. Le refuge appartient au groupe ; conserve son code pour le retrouver.</small></div>}
   <button disabled={busy} onClick={()=>command('leave')}>Quitter ce groupe</button>
  </>}
  {error&&<p role="alert" className="party-error">{error}</p>}
 </div>;
}
