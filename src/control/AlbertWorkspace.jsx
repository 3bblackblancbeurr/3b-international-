import {useEffect,useRef,useState} from 'react';
import {albertRequest} from './integrations-client.js';
import {useAlbertSpaces} from './AlbertSpacesContext.jsx';
import {useAlbertApex} from './AlbertApexContext.jsx';
import AlbertAvatar3D from './AlbertAvatar3D.jsx';
import {parseAlbertLocal,validateAlbertActions} from './albert-model.js';
import './albert-workspace.css';
import './albert-cinematic.css';

const CHAPTERS=[
 ['01 / ÉVEIL','Une idée. Tout un univers.','Votre espace, votre intention.'],
 ['02 / INTENTION','Donnez forme à vos projets.','Albert adapte les modules à votre demande.'],
 ['03 / ACTION','Votre prochain mouvement.','Revenez au cockpit et commencez.']
];
export default function AlbertWorkspace({onActions,onUndo,canUndo,online,deviceKnown,runtime,privacyMode,reduced,ready,theme}){
 const spaces=useAlbertSpaces();
 const apex=useAlbertApex();
 const activeTask=useRef(null);
 const[memory,setMemory]=useState(true),[listening,setListening]=useState(false),[speaking,setSpeaking]=useState(false);
 const abort=useRef(null),recognition=useRef(null);
 const[prompt,setPrompt]=useState(''),[reply,setReply]=useState('Demandez une synthèse ou composez votre interface.'),[busy,setBusy]=useState(false),[failure,setFailure]=useState(false);
 const[film,setFilm]=useState(false),[chapter,setChapter]=useState(0),[replay,setReplay]=useState(0),[visible,setVisible]=useState(!document.hidden);
 const[systemReduced,setSystemReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const dialog=useRef(null),trigger=useRef(null),requestId=useRef(0),locked=useRef(false);
 const noMotion=reduced||systemReduced;
 function stop(reason='Interrompu par l’utilisateur'){requestId.current++;abort.current?.abort();locked.current=false;setBusy(false);recognition.current?.abort();window.speechSynthesis?.cancel();setListening(false);setSpeaking(false);if(activeTask.current){apex.cancelTask(activeTask.current,reason);activeTask.current=null;}}
 useEffect(()=>{stop();return()=>{requestId.current++;abort.current?.abort();recognition.current?.abort();window.speechSynthesis?.cancel();};},[spaces.owner,privacyMode]);
 function dictate(){
  if(listening){recognition.current?.stop();return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition)return;
  const mic=new Recognition();recognition.current=mic;mic.lang='fr-FR';mic.interimResults=true;mic.continuous=false;
  mic.onresult=e=>{if(recognition.current===mic)setPrompt(Array.from(e.results).map(r=>r[0].transcript).join(' ').slice(0,4000));};
  mic.onend=()=>setListening(false);mic.onerror=()=>{setListening(false);setReply('Dictée indisponible ou permission refusée. Vous pouvez écrire votre demande.');};
  window.speechSynthesis?.cancel();try{mic.start();setListening(true);}catch{setListening(false);}
 }
 function readReply(){
  if(speaking){window.speechSynthesis?.cancel();setSpeaking(false);return;}
  if(!window.speechSynthesis)return;const utterance=new SpeechSynthesisUtterance(reply);utterance.lang='fr-FR';utterance.onstart=()=>setSpeaking(true);utterance.onend=utterance.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(utterance);
 }
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setSystemReduced(media.matches);media.addEventListener('change',change);const visibility=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);requestId.current++;};},[]);
 useEffect(()=>{if(film){dialog.current?.showModal();setChapter(noMotion?2:0);}else dialog.current?.close();},[film,noMotion,replay]);
 useEffect(()=>{if(!film||noMotion||!visible)return;const timer=setInterval(()=>setChapter(c=>Math.min(c+1,2)),6000);return()=>clearInterval(timer);},[film,noMotion,visible,replay]);
 async function run(text=prompt){
  const value=text.trim();if(!value||locked.current||!ready)return;
  setFailure(false);
  if(/^cin[eé]matique$/i.test(value)){setFilm(true);setPrompt('');return;}
  if(apex.state.killSwitch){setFailure(true);setReply('STOP ALBERT est actif. Réarmez le core APEX pour lancer une nouvelle tâche.');return;}
  const taskId=apex.beginTask(value,{project:'3B Command OS'});activeTask.current=taskId;
  apex.progressTask(taskId,'Analyse de l’intention et de la stratégie','INTENT');
  let local;
  try{local=parseAlbertLocal(value,spaces.state);}
  catch(e){apex.failTask(taskId,e);activeTask.current=null;setFailure(true);setReply(e.message);return;}
  if(local){
   try{
    apex.progressTask(taskId,'Validation et application de la commande locale','EXECUTE');
    onActions(local);
    apex.completeTask(taskId,{tests:['Validation locale du contrat d’action'],verified:true,tested:true,reversible:true,documented:true,notes:'Commande locale appliquée par le client après validation structurée.'});
    activeTask.current=null;
    setReply('Interface mise à jour. Vous pouvez annuler cette modification.');
    setPrompt('');
   }catch(e){apex.failTask(taskId,e);activeTask.current=null;setFailure(true);setReply(e.message);}
   return;
  }
  if(apex.state.mode==='LOCAL'){
   apex.cancelTask(taskId,'Mode LOCAL : aucune route distante autorisée pour cette demande.');activeTask.current=null;
   setFailure(true);setReply('Mode LOCAL actif : cette demande nécessite actuellement le moteur serveur. Passez en AUTO, HYBRID ou INTERNET, ou utilisez une commande locale.');
   return;
  }
  recognition.current?.abort();window.speechSynthesis?.cancel();setSpeaking(false);
  locked.current=true;setBusy(true);setReply('Albert analyse votre demande…');const id=++requestId.current;abort.current=new AbortController();
  try{
   apex.progressTask(taskId,'Préparation du contexte autorisé','ASSESS');
   const active=spaces.state.spaces.find(s=>s.id===spaces.state.active);
   const result=await albertRequest({action:'albert',stream:true,prompt:value,messages:memory&&!privacyMode?spaces.state.messages:[],workspace:privacyMode?null:{active:active.id,spaces:[active]},apex:{mode:apex.state.mode,resource_profile:apex.state.resourceProfile}},{signal:abort.current.signal,onText:text=>{if(id===requestId.current&&text)setReply(text);},onStatus:text=>{if(id===requestId.current){setReply(text);apex.progressTask(taskId,text,'EXECUTE');}}});
   if(id!==requestId.current)return;
   const actions=validateAlbertActions(result.answer?.actions);
   if(actions.length)onActions(actions);
   const answer=result.answer?.text||'Aucune réponse.';
   setReply(answer+(actions.length?' · Modifications appliquées.':''));
   if(memory&&!privacyMode)spaces.remember(value,answer);
   apex.completeTask(taskId,{tests:['Validation du schéma de réponse','Filtrage des actions autorisées'],verified:true,tested:true,reversible:true,documented:true,notes:actions.length?'Réponse serveur validée et actions UI appliquées.':'Réponse serveur validée sans action externe.'});
   activeTask.current=null;
   setPrompt('');
  }catch(e){if(id===requestId.current){apex.failTask(taskId,e);activeTask.current=null;setFailure(true);setReply(e.message||'Albert est momentanément indisponible.');}}
  finally{if(id===requestId.current){locked.current=false;setBusy(false);}}
 }
 function closeFilm(){setFilm(false);trigger.current?.focus();}
 const number=value=>Number.isFinite(Number(value))&&value!==null&&value!==undefined?Number(value).toLocaleString('fr-FR',{maximumFractionDigits:1}):'—';
 return <section className={'albert-workspace theme-'+theme+(noMotion?' motion-off':'')+(!visible?' is-paused':'')} aria-label="Albert, assistant personnel">
  <div className="albert-scene">
   <div className="albert-grid" aria-hidden="true"/>
   <AlbertAvatar3D busy={busy} speaking={speaking} listening={listening} reduced={noMotion} paused={film||!visible}/>
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
  <div className="albert-conversation-tools"><span className="albert-apex-mode">APEX {apex.state.mode} · {apex.state.resourceProfile}{apex.state.killSwitch?' · STOP':''}</span>
   {busy&&<button onClick={()=>{stop('Interruption explicite depuis le cockpit.');setReply('Demande interrompue. Aucune action de cette réponse appliquée.');}}>Interrompre</button>}
   <label><input type="checkbox" checked={memory&&!privacyMode} disabled={busy||privacyMode} onChange={e=>setMemory(e.target.checked)}/> Mémoire de conversation</label>
   <details><summary>Voix et confidentialité</summary><p className="albert-voice-note">La dictée dépend du navigateur et peut transmettre votre voix à son fournisseur. Le texte est à vérifier avant d’appuyer sur Envoyer. La mémoire activée transmet les derniers échanges à Albert ; l’espace actif est transmis hors mode privé.</p>
    {(window.SpeechRecognition||window.webkitSpeechRecognition)?<button disabled={!ready||busy||privacyMode} onClick={dictate}>{listening?'Arrêter la dictée':'Dicter une demande'}</button>:<span>Dictée non disponible dans ce navigateur.</span>}
    {!!window.speechSynthesis&&<button disabled={busy||privacyMode||!ready} onClick={readReply}>{speaking?'Arrêter la lecture':'Écouter la réponse'}</button>}
   </details>
  </div>
  <div className="albert-hints"><button disabled={!ready||busy} onClick={()=>run('mode focus')}>Mode focus</button><button disabled={!ready||busy} onClick={()=>run('affiche tout')}>Tous les modules</button><button disabled={!ready||busy} onClick={()=>run('ambiance violet')}>Ambiance violet</button><button disabled={!canUndo||busy} onClick={onUndo}>Annuler</button></div>
  <p className="albert-disclosure">Sans attendre l’IA : « agrandis le planning », « réduis les notes », « duplique le budget », « mets en premier les documents ». Vous pouvez utiliser le titre exact de vos panneaux.</p>
  <p className="albert-disclosure">Commandes d’interface locales et IA propriétaire côté serveur. Les connexions manquantes sont signalées ; aucune action PC n’est exécutée par une réponse IA.</p>
  <dialog className={'albert-film'+(noMotion?' motion-off':'')+(!visible?' is-paused':'')} ref={dialog} onCancel={e=>{e.preventDefault();closeFilm();}}>
   <button className="albert-film-close" onClick={closeFilm}>Retour au cockpit ×</button>
   {film&&<><AlbertAvatar3D key={replay} cinematic reduced={noMotion} paused={!visible}/><div className="albert-film-copy" key={'chapter'+chapter}><p className="albert-eyebrow">{CHAPTERS[chapter][0]}</p><h2>{CHAPTERS[chapter][1]}</h2><p>{CHAPTERS[chapter][2]}</p></div><div className="albert-film-footer"><span>ALBERT · EXPÉRIENCE VISUELLE</span><button onClick={()=>setReplay(v=>v+1)}>Rejouer ↻</button></div></>}
  </dialog>
 </section>;
}
