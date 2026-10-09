import React, {Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowUpRight, BookOpen, Check, Compass, Gem, Globe2, KeyRound, LockKeyhole, MapPin, RefreshCw, ShieldCheck, Sparkles, Trash2} from 'lucide-react';
import {Button, Progress} from '../../design-system/index.jsx';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {blankSave} from '../rules.js';
import {loadWorld, saveWorld, recordWorldAction} from '../save.js';
import {INVISIBLE_EPISODE, INVISIBLE_REALMS} from './catalog.js';
import {blankInvisibleState} from './progression.js';
import InvisibleMap from './InvisibleMap.jsx';
import WalkCheck from './WalkCheck.jsx';
import GuardianPanel from './GuardianPanel.jsx';
import CooperationPanel from './CooperationPanel.jsx';
import './invisible.css';

const InvisiblePortal=React.lazy(()=>import('./InvisiblePortal.jsx'));
const EPISODE=INVISIBLE_EPISODE;

export default function InvisiblePage({goTo}) {
 const account=useLoyalty();
 return account.loading?<div className="invisible-loading" role="status">Ouverture du Monde Invisible…</div>:<InvisibleSession key={account.user?.id||'guest'} uid={account.user?.id} goTo={goTo}/>;
}

function InvisibleSession({uid,goTo}) {
 const [save,setSave]=useState(blankSave),[loaded,setLoaded]=useState(false),[loadBlocked,setLoadBlocked]=useState(false),[saving,setSaving]=useState(false),[status,setStatus]=useState(null),[saveMessage,setSaveMessage]=useState('Récupération de ton aventure…'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState(EPISODE.points[0].id),[answer,setAnswer]=useState('');
 const saveRef=useRef(save),ready=useRef(false),alive=useRef(false),generation=useRef(0),loadTicket=useRef(0),dirty=useRef(false),syncFlight=useRef(null),syncTimer=useRef(null);
 const invisible=save.invisible||blankInvisibleState(),solved=invisible.solved,point=EPISODE.points.find(item=>item.id===selected)||EPISODE.points[0],pointIndex=EPISODE.points.findIndex(item=>item.id===point.id),pointDone=solved.includes(point.id),allSolved=solved.length===EPISODE.points.length;
 const sync=useCallback(()=>{
  if(!ready.current)return Promise.resolve();
  if(syncFlight.current)return syncFlight.current;
  const through=generation.current;setSaving(true);
  const flight=saveWorld(uid,saveRef.current).then(result=>{
   if(!alive.current)return result;
   // A network response may belong to an earlier action. Keep the visible
   // current state until a subsequent sync reconciles that generation.
   const changed=through!==generation.current;
   if(result.data&&!changed){saveRef.current=result.data;setSave(result.data);}
   dirty.current=!!result.pending||changed;
   setStatus(changed&&result.status?.outcome==='synced'?{...result.status,outcome:'pending'}:result.status);
   setSaveMessage(changed&&result.status?.outcome==='synced'?'Dernières découvertes conservées sur cet appareil · synchronisation à venir.':result.message);
   return result;
  }).catch(err=>{if(alive.current){dirty.current=true;setSaveMessage(err.message||'Synchronisation indisponible. La copie locale est conservée.');}}).finally(()=>{syncFlight.current=null;if(alive.current)setSaving(false);});
  syncFlight.current=flight;return flight;
 },[uid]);
 const recover=useCallback(()=>{
  const ticket=++loadTicket.current;
  ready.current=false;setLoaded(false);setLoadBlocked(false);setError('');setSaveMessage('Récupération de ton aventure…');
  return loadWorld(uid).then(result=>{
   if(!alive.current||ticket!==loadTicket.current)return;
   setStatus(result.status);setSaveMessage(result.message);
   if(uid&&['offline','auth','receipt','storage'].includes(result.status?.outcome)&&!result.status?.hasLocalCopy){setLoadBlocked(true);return;}
   saveRef.current=result.data;setSave(result.data);dirty.current=!!result.needsSave;ready.current=true;setLoaded(true);setStatus(result.status);setSaveMessage(result.message);
   const progress=result.data.invisible||blankInvisibleState();setSelected(EPISODE.points[Math.min(progress.solved.length,EPISODE.points.length-1)].id);
   if(result.needsSave)syncTimer.current=setTimeout(sync,800);
  }).catch(err=>{if(alive.current&&ticket===loadTicket.current){setLoadBlocked(true);setSaveMessage(err.message||'Impossible de récupérer ton aventure.');}});
 },[uid,sync]);
 useEffect(()=>{
  alive.current=true;recover();
  const online=()=>{if(dirty.current)sync();};window.addEventListener('online',online);
  const timer=setInterval(()=>{if(dirty.current&&!document.hidden)sync();},30000);
  return()=>{alive.current=false;ready.current=false;loadTicket.current++;clearTimeout(syncTimer.current);clearInterval(timer);window.removeEventListener('online',online);};
 },[recover,sync]);
 const act=useCallback(command=>{
  if(!ready.current)return null;
  try{
   const next=recordWorldAction(uid,saveRef.current,command);saveRef.current=next;generation.current++;setSave(next);dirty.current=true;setError('');setStatus(current=>({...current,outcome:uid?'pending':'local'}));setSaveMessage(uid?'Progression conservée sur cet appareil · synchronisation à venir.':'Progression sauvegardée sur cet appareil.');
   clearTimeout(syncTimer.current);syncTimer.current=setTimeout(sync,800);
   return next;
  }catch(err){setError(err.message||'Cette action ne peut pas être enregistrée.');setNotice('');return null;}
 },[uid,sync]);
 function selectPoint(id){setSelected(id);setAnswer('');setError('');setNotice('');}
 function start(){if(act({type:'invisibleStart'})){setNotice(`${EPISODE.guardian} t’attend au premier écho.`);setSelected(EPISODE.points[0].id);}}
 function submit(event){event.preventDefault();const next=act({type:'invisibleAnswer',id:point.id,answer});if(!next)return;setAnswer('');const nextPoint=EPISODE.points.find(item=>!next.invisible.solved.includes(item.id));setNotice(nextPoint?'Écho retrouvé. Prochaine énigme : '+nextPoint.name+'.':'Les trois échos sont réunis. Tu peux ouvrir le coffre.');if(nextPoint)setSelected(nextPoint.id);}
 function openChest(){if(act({type:'invisibleChest'}))setNotice('Le Fragment de la Justice est conservé dans ton carnet du Monde Invisible.');}
 function openPortal(){if(act({type:'invisiblePortal'}))setNotice('Le passage vers le Monde 3B est ouvert.');}
 const saveLabel=loadBlocked?'Compte à récupérer':saving?'Synchronisation…':status?.outcome==='synced'?'Compte synchronisé':status?.outcome==='local'||status?.outcome==='new'?'Sauvegarde sur cet appareil':status?.outcome==='pending'?'Synchronisation en attente':loaded?'Copie locale · connexion à vérifier':'Chargement…';
 const completeSteps=solved.length+(invisible.chestOpened?1:0)+(invisible.portalOpened?1:0);
 return <section className="invisible-page" data-testid="invisible-page" aria-label="Le Monde Invisible">
  <div className="invisible-topbar"><Button variant="ghost" onClick={()=>goTo('world3b')}><ArrowLeft size={16} aria-hidden="true"/>Monde 3B</Button><span className="invisible-top-signature">3B / EXPÉRIENCES</span><div className="invisible-save"><span className={'invisible-save-dot'+(status?.outcome==='synced'||!uid?' is-ready':'')} aria-hidden="true"/><span>{saveLabel}</span>{uid&&<Button variant="ghost" size="sm" onClick={sync} disabled={!loaded||saving} aria-label="Synchroniser l’aventure"><RefreshCw size={14} aria-hidden="true"/></Button>}</div></div>
  <header className="invisible-hero">
   <div className="invisible-hero-copy"><p className="invisible-eyebrow"><span/>LE MONDE INVISIBLE</p><h1>Le monde cache<br/><em>une autre histoire.</em></h1><p>Les villes deviennent des portes. Les secrets deviennent des liens. La première trace t’attend au bord du Léman.</p><div className="invisible-hero-meta"><span><MapPin size={15} aria-hidden="true"/>Thonon-les-Bains · France</span><span><Compass size={15} aria-hidden="true"/>3 énigmes · 1 fragment</span></div></div>
   <div className="invisible-hero-emblem" aria-hidden="true"><div className="invisible-orbit orbit-one"/><div className="invisible-orbit orbit-two"/><div className="invisible-emblem-core"><Gem size={64} strokeWidth={.9}/></div><span>JUSTICE</span><small>FRAGMENT 001</small></div>
  </header>
  <section className="invisible-adventure-head" aria-labelledby="invisible-episode-title"><div><p className="invisible-eyebrow">ÉPISODE 001 / LE SECRET DU LÉMAN</p><h2 id="invisible-episode-title">{EPISODE.title}</h2><p>Un signal traverse le lac. {EPISODE.guardian}, Gardienne de la Justice, te confie trois traces à relier pour réveiller un portail.</p></div><div className="invisible-progress-summary"><span>{completeSteps} / 5 découvertes</span><Progress value={completeSteps/5*100} label="Progression du secret du Léman"/><small>{invisible.portalOpened?'Le premier passage est ouvert':invisible.chestOpened?'Le fragment a été retrouvé':allSolved?'Le coffre attend ta clé':'Suis les trois échos dans l’ordre'}</small></div></section>
  {loadBlocked&&<div className="invisible-recovery" role="alert"><p>{saveMessage}</p><p>Ton compte doit être récupéré avant de commencer. {status?.outcome==='auth'?'Reconnecte ton Passeport pour retrouver ton aventure.':'Vérifie ta connexion, puis réessaie.'}</p><div className="invisible-actions"><Button onClick={recover}>Réessayer le chargement</Button>{status?.outcome==='auth'&&<Button variant="ghost" onClick={()=>goTo('member')}>Ouvrir mon Passeport</Button>}</div></div>}
  <div className="invisible-mode-row" role="group" aria-label="Choisir la manière de jouer"><Button data-testid="mode-remote" variant={invisible.mode==='remote'?'champagne':'ghost'} aria-pressed={invisible.mode==='remote'} disabled={!loaded} onClick={()=>act({type:'invisibleMode',mode:'remote'})}><Globe2 size={16} aria-hidden="true"/>À distance</Button><Button data-testid="mode-walk" variant={invisible.mode==='walk'?'champagne':'ghost'} aria-pressed={invisible.mode==='walk'} disabled={!loaded} onClick={()=>act({type:'invisibleMode',mode:'walk'})}><MapPin size={16} aria-hidden="true"/>En balade</Button><span>{invisible.mode==='remote'?'Toute l’aventure est jouable ici, sans déplacement.':'Même aventure, mêmes récompenses. Le GPS reste facultatif.'}</span></div>
  {invisible.mode==='walk'&&<WalkCheck onRemote={()=>act({type:'invisibleMode',mode:'remote'})}/>}
  <div className="invisible-play-grid">
   <section className="invisible-atlas" aria-labelledby="invisible-atlas-title"><div className="invisible-panel-heading"><h3 id="invisible-atlas-title"><Compass size={17} aria-hidden="true"/>Atlas du Léman</h3><span>LES TROIS ÉCHOS</span></div><InvisibleMap points={EPISODE.points} solved={solved} selected={selected} started={invisible.started} onSelect={selectPoint}/></section>
   <section className="invisible-riddle" aria-labelledby="invisible-riddle-title">
    {!invisible.started?<><span className="invisible-story-icon" aria-hidden="true"><KeyRound size={28}/></span><p className="invisible-eyebrow">UNE INVITATION DE {EPISODE.guardian.toUpperCase()}</p><h3 id="invisible-riddle-title">Quelque chose t’a reconnu.</h3><blockquote>« Ce qui a disparu n’est pas perdu. Apprends à regarder, à écouter et à vérifier. La première porte s’ouvrira. »</blockquote><p>Lis les indices, relie les trois traces et ouvre un coffre entièrement virtuel.</p><Button data-testid="invisible-start" onClick={start} disabled={!loaded}><Sparkles size={17} aria-hidden="true"/>Commencer l’aventure</Button></>:<>
     <div className="invisible-riddle-top"><span className="invisible-eyebrow">ÉCHO {pointIndex+1} / 3</span><span className="invisible-status-pill">{pointDone?<><Check size={13} aria-hidden="true"/>Retrouvé</>:<>À déchiffrer</>}</span></div><h3 id="invisible-riddle-title">{point.name}</h3><p className="invisible-small">{point.description}</p>
     {pointDone?<div className="invisible-story-reveal"><Gem size={23} aria-hidden="true"/><p>{point.story}</p>{!allSolved&&<Button variant="ghost" onClick={()=>selectPoint(EPISODE.points[solved.length].id)}>Poursuivre vers l’écho suivant <ArrowUpRight size={16} aria-hidden="true"/></Button>}</div>:<form onSubmit={submit} className="invisible-riddle-form"><p className="invisible-question">{point.riddle.question}</p><label htmlFor="invisible-answer">Ta réponse</label><input id="invisible-answer" data-testid="riddle-answer" value={answer} onChange={event=>setAnswer(event.target.value)} placeholder="Un mot suffit…" autoComplete="off" maxLength={100} required disabled={!loaded}/><div className="invisible-riddle-actions"><Button type="submit" data-testid="riddle-submit" disabled={!loaded||!answer.trim()}>Révéler l’écho <ArrowUpRight size={16} aria-hidden="true"/></Button><details><summary>Besoin d’un indice ?</summary><p>{point.riddle.clue}</p></details></div></form>}
    </>}
    {error&&<p className="invisible-feedback is-error" role="alert">{error}</p>}{notice&&<p className="invisible-feedback" role="status">{notice}</p>}
   </section>
  </div>
  {allSolved&&<section className="invisible-reward" aria-labelledby="invisible-chest-title"><div className="invisible-chest-art" aria-hidden="true"><div className={invisible.chestOpened?'is-opened':''}><Gem size={38} strokeWidth={1}/></div></div><div><p className="invisible-eyebrow">{invisible.chestOpened?'CARNET / FRAGMENT RETROUVÉ':'LES TROIS TRACES SONT RÉUNIES'}</p><h2 id="invisible-chest-title">{invisible.chestOpened?EPISODE.fragment.name:'Le coffre du Léman'}</h2><p>{invisible.chestOpened?'La Justice écoute, vérifie et répare. Ce fragment est désormais conservé dans ta sauvegarde du Monde 3B.':'La clé est complète. Une lumière attend au cœur de ce coffre virtuel.'}</p><div className="invisible-reward-meta"><span>+{EPISODE.rewards.xp} XP monde</span><span>+{EPISODE.rewards.shards} éclats</span><span>Récompense unique</span></div>{!invisible.chestOpened&&<Button data-testid="chest-open" onClick={openChest}><KeyRound size={16} aria-hidden="true"/>Ouvrir le coffre</Button>}</div></section>}
  {invisible.chestOpened&&<section className="invisible-portal-section" aria-labelledby="invisible-portal-title"><Suspense fallback={<div className="invisible-portal-stage invisible-loading" role="status">Le portail prend forme…</div>}><InvisiblePortal opened={invisible.portalOpened}/></Suspense><div className="invisible-portal-copy"><p className="invisible-eyebrow">UNE PORTE VERS TON UNIVERS</p><h2 id="invisible-portal-title">Le passage de la Justice</h2><p>Le secret du Léman rejoint ton aventure du Monde 3B. Ton fragment et tes gains voyagent avec ta sauvegarde.</p>{!invisible.portalOpened?<Button data-testid="portal-open" onClick={openPortal}>Activer le portail <ArrowUpRight size={17} aria-hidden="true"/></Button>:<Button data-testid="portal-enter" onClick={()=>goTo('world3b')}>Entrer dans le Monde 3B <ArrowUpRight size={17} aria-hidden="true"/></Button>}<small>{uid?'Ton aventure est liée à ton compte. Vérifie la synchronisation avant de changer d’appareil.':'Partie invitée conservée sur cet appareil. Connecte ton Passeport pour les prochaines aventures.'}</small></div></section>}
  <div className="invisible-bottom-grid"><section className="invisible-journal" aria-labelledby="invisible-journal-title"><div className="invisible-panel-heading"><h3 id="invisible-journal-title"><BookOpen size={17} aria-hidden="true"/>Ton journal</h3><span>{solved.length} / 3 TRACES</span></div>{!invisible.started?<p>Ton histoire commence à la première rencontre.</p>:<ol><li><span className="invisible-journal-dot"/><div><strong>L’appel du Léman</strong><p>{EPISODE.guardian} t’a confié la recherche du Fragment de la Justice.</p></div></li>{EPISODE.points.filter(item=>solved.includes(item.id)).map(item=><li key={item.id}><span className="invisible-journal-dot"/><div><strong>{item.name}</strong><p>{item.story}</p></div></li>)}{invisible.chestOpened&&<li><span className="invisible-journal-dot"/><div><strong>Le Fragment de la Justice</strong><p>Le coffre virtuel est ouvert. Ton fragment est conservé dans ton carnet du Monde Invisible.</p></div></li>}{invisible.portalOpened&&<li><span className="invisible-journal-dot"/><div><strong>La porte de France</strong><p>Le passage vers le Monde 3B est activé.</p></div></li>}</ol>}</section><section className="invisible-guardian-zone" aria-label="Rencontre avec la Gardienne"><GuardianPanel save={save}/><div className="invisible-memory"><label><input type="checkbox" data-testid="invisible-memory-consent" checked={invisible.memoryConsent} disabled={!loaded} onChange={event=>act({type:'invisibleMemoryConsent',enabled:event.target.checked})}/><span><strong>Autoriser le souvenir de mes prochaines découvertes</strong><small>Uniquement des résumés de fiction. Les échanges du dialogue, les images et la position ne sont pas mémorisés.</small></span></label>{invisible.memoryConsent&&<p className="invisible-small">{invisible.memory.length} souvenir{invisible.memory.length!==1?'s':''} conservé{invisible.memory.length!==1?'s':''} avec ton aventure.</p>}<Button data-testid="forget-memory" variant="ghost" size="sm" disabled={!loaded||(!invisible.memoryConsent&&!invisible.memory.length)} onClick={()=>{if(act({type:'invisibleForget'}))setNotice('Souvenirs supprimés et mémoire désactivée. Ton aventure est conservée.');}}><Trash2 size={14} aria-hidden="true"/>Supprimer les souvenirs</Button></div></section></div>
  <section className="invisible-realms" aria-labelledby="invisible-realms-title"><div className="invisible-adventure-head"><div><p className="invisible-eyebrow">UN MÊME PASSEPORT / HUIT ROYAUMES</p><h2 id="invisible-realms-title">Une première porte. Un monde à relier.</h2><p>Le Léman ouvre ce nouveau chapitre du 3B. Les aventures des autres royaumes et les missions communes se préparent.</p></div><Globe2 size={48} strokeWidth={1} aria-hidden="true"/></div><ul>{INVISIBLE_REALMS.map((realm,index)=><li key={realm.id} className={realm.id==='france'?'is-available':''}><span className="invisible-realm-number">0{index+1}</span><div><strong>{realm.name}</strong><small>{realm.value}</small></div><span className="invisible-realm-state">{realm.id==='france'?'Épisode 001':<><LockKeyhole size={12} aria-hidden="true"/>À venir</>}</span></li>)}</ul></section>
  <CooperationPanel uid={uid} save={save}/>
  <footer className="invisible-footer"><div><ShieldCheck size={19} aria-hidden="true"/><div><strong>Explore à ton rythme et en sécurité.</strong><p>{EPISODE.safety}</p></div></div><details><summary>À propos de cette aventure et de la sauvegarde</summary><p>{EPISODE.fiction}</p><p>{saveMessage}</p><p>Le journal décrit ta progression ; les souvenirs facultatifs du Gardien sont une mémoire distincte, supprimable sans perdre tes énigmes ou ton fragment.</p></details></footer>
 </section>;
}
