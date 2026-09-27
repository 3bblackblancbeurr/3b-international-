import {useEffect,useRef,useState} from 'react';
import {commandAIRequest} from './integrations-client.js';
import {parseAlbertLocal,validateAlbertActions} from './albert-model.js';
import './albert-workspace.css';

const CHAPTERS=[
 ['01 / ÉVEIL','Une idée. Tout un univers.','Votre espace, votre intention.'],
 ['02 / INTENTION','Donnez forme à vos projets.','Albert adapte les modules à votre demande.'],
 ['03 / ACTION','Votre prochain mouvement.','Revenez au cockpit et commencez.']
];
export default function AlbertWorkspace({onActions,onUndo,canUndo,online,deviceKnown,runtime,privacyMode,reduced,ready,theme}){
 const[prompt,setPrompt]=useState(''),[reply,setReply]=useState('Demandez une synthèse ou composez votre interface.'),[busy,setBusy]=useState(false),[failure,setFailure]=useState(false);
 const[film,setFilm]=useState(false),[chapter,setChapter]=useState(0),[replay,setReplay]=useState(0),[visible,setVisible]=useState(!document.hidden);
 const[systemReduced,setSystemReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const dialog=useRef(null),trigger=useRef(null),requestId=useRef(0),locked=useRef(false);
 const noMotion=reduced||systemReduced;
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setSystemReduced(media.matches);media.addEventListener('change',change);const visibility=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);requestId.current++;};},[]);
 useEffect(()=>{if(film){dialog.current?.showModal();setChapter(noMotion?2:0);}else dialog.current?.close();},[film,noMotion,replay]);
 useEffect(()=>{if(!film||noMotion||!visible)return;const timer=setInterval(()=>setChapter(c=>Math.min(c+1,2)),6000);return()=>clearInterval(timer);},[film,noMotion,visible,replay]);
 async function run(text=prompt){
  const value=text.trim();if(!value||locked.current||!ready)return;
  setFailure(false);
  if(/^cin[eé]matique$/i.test(value)){setFilm(true);setPrompt('');return;}
  const local=parseAlbertLocal(value);
  if(local){onActions(local);setReply('Interface mise à jour. Vous pouvez annuler cette modification.');setPrompt('');return;}
  locked.current=true;setBusy(true);setReply('Albert analyse votre demande…');const id=++requestId.current;
  try{
   const result=await commandAIRequest(value,'albert');
   if(id!==requestId.current)return;
   const actions=validateAlbertActions(result.answer?.actions);
   if(actions.length)onActions(actions);
   setReply((result.answer?.text||'Aucune réponse.')+(actions.length?' · Modifications appliquées.':''));
   setPrompt('');
  }catch(e){if(id===requestId.current){setFailure(true);setReply(e.message||'Albert est momentanément indisponible.');}}
  finally{if(id===requestId.current){locked.current=false;setBusy(false);}}
 }
 function closeFilm(){setFilm(false);trigger.current?.focus();}
 const number=value=>Number.isFinite(Number(value))&&value!==null&&value!==undefined?Number(value).toLocaleString('fr-FR',{maximumFractionDigits:1}):'—';
 return <section className={'albert-workspace theme-'+theme+(noMotion?' motion-off':'')+(!visible?' is-paused':'')} aria-label="Albert, assistant personnel">
  <div className="albert-scene">
   <div className="albert-grid" aria-hidden="true"/>
   <div className="albert-portrait" aria-hidden="true"><img src="/albert/command-center.png" alt=""/><i/></div>
   <div className="albert-orbit one" aria-hidden="true"/><div className="albert-orbit two" aria-hidden="true"/>
   <div className="albert-scene-copy"><p className="albert-eyebrow">ALBERT / VOTRE UNIVERS</p><h2>Une intention.<br/>Tout devient possible.</h2><p>Composez votre cockpit.<br/>Concentrez-vous sur ce qui compte.</p>
    <button ref={trigger} type="button" onClick={()=>setFilm(true)}>Découvrir l’expérience ↗</button>
   </div>
   <div className="albert-name">A L B E R T<small>COMMAND INTELLIGENCE</small></div>
  </div>
  <div className="albert-telemetry" aria-label="Dernière télémétrie reçue">
   <div><span>AGENT PC</span><strong>{online?'Connecté':deviceKnown?'Hors ligne':'Non appairé'}</strong><small>{online?'Dernières mesures reçues':'Mesures actuelles indisponibles'}</small></div>
   {online&&!privacyMode&&runtime?<><div><span>VOLUMES</span><strong>{number(runtime.storage_free_gb)} Go libres</strong><small>{Array.isArray(runtime.drives)?runtime.drives.map(d=>d.letter+' '+number(d.free_gb)+' / '+number(d.total_gb)+' Go').join(' · '):'Inventaire non disponible'}</small></div><div><span>GPU</span><strong>{runtime.gpu_name||'Non disponible'}</strong><small>VRAM {number(runtime.gpu_memory_used_mb)} / {number(runtime.gpu_memory_total_mb)} Mo</small></div><div><span>RAM</span><strong>{number(runtime.memory_free_gb)} Go libres</strong><small>Sur {number(runtime.memory_total_gb)} Go</small></div></>:<p>{privacyMode?'Mesures masquées en mode privé.':'Les données seront affichées après réception de mesures par l’agent.'}</p>}
  </div>
  <form className="albert-prompt" onSubmit={e=>{e.preventDefault();run();}}><label htmlFor="albert-input">✧ <span className="albert-sr">Demande à Albert</span></label><input id="albert-input" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={4000} placeholder="Albert, affiche les projets et passe en violet…" disabled={busy||!ready}/><button type="submit" disabled={busy||!ready||!prompt.trim()}>{busy?'Analyse…':'Envoyer ↗'}</button></form>
  <p className={'albert-answer'+(failure?' error':'')} role="status" aria-live="polite">{ready?reply:'Connexion propriétaire requise pour utiliser Albert.'}</p>
  <div className="albert-hints"><button disabled={!ready||busy} onClick={()=>run('mode focus')}>Mode focus</button><button disabled={!ready||busy} onClick={()=>run('affiche tout')}>Tous les modules</button><button disabled={!ready||busy} onClick={()=>run('ambiance violet')}>Ambiance violet</button><button disabled={!canUndo||busy} onClick={onUndo}>Annuler</button></div>
  <p className="albert-disclosure">Commandes d’interface locales et IA propriétaire côté serveur. Les connexions manquantes sont signalées ; aucune action PC n’est exécutée par une réponse IA.</p>
  <dialog className={'albert-film'+(noMotion?' motion-off':'')+(!visible?' is-paused':'')} ref={dialog} onCancel={e=>{e.preventDefault();closeFilm();}}>
   <button className="albert-film-close" onClick={closeFilm}>Retour au cockpit ×</button>
   {film&&<><div className="albert-film-portrait" key={replay} aria-hidden="true"><img src="/albert/command-center.png" alt=""/></div><div className="albert-film-copy" key={'chapter'+chapter}><p className="albert-eyebrow">{CHAPTERS[chapter][0]}</p><h2>{CHAPTERS[chapter][1]}</h2><p>{CHAPTERS[chapter][2]}</p></div><div className="albert-film-footer"><span>ALBERT · EXPÉRIENCE VISUELLE</span><button onClick={()=>setReplay(v=>v+1)}>Rejouer ↻</button></div></>}
  </dialog>
 </section>;
}
