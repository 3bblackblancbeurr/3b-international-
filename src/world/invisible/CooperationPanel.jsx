import React,{useEffect,useRef,useState} from 'react';
import {Button,Progress} from '../../design-system/index.jsx';
import {INVISIBLE_REALMS} from './catalog.js';
import {readInvisibleCooperation,contributeInvisibleEcho,solveInvisibleCollective,readInvisibleEvents,contributeInvisibleEvent,solveInvisibleEvent} from './guardian-client.js';

const date=value=>value?new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'';
const phases={upcoming:'À venir',open:'Ouverte',complete:'Résolue par le collectif',closed:'Terminée'};
function EchoMission({uid,save,seasonal=false}){
 const [stored,setStored]=useState(null),[realm,setRealm]=useState('france'),[answer,setAnswer]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(null),generation=useRef(0),owner=useRef(uid),lock=useRef(false);
 if(owner.current!==uid){owner.current=uid;generation.current++;request.current?.abort();}
 const snapshot=stored?.owner===uid?stored.value:null;
 async function run(action='load',eventOverride=null){
  if(!uid||lock.current)return;
  lock.current=true;const controller=new AbortController(),ticket=++generation.current;request.current?.abort();request.current=controller;
  setBusy(true);setError('');if(action==='load')setStored(null);
  const event=eventOverride||snapshot?.event;
  try{
   let result;
   if(seasonal)result=await (action==='contribute'?contributeInvisibleEvent(event,realm,uid,controller.signal):action==='solve'?solveInvisibleEvent(event,answer,uid,controller.signal):readInvisibleEvents(event,uid,controller.signal));
   else result=await (action==='contribute'?contributeInvisibleEcho(realm,uid,controller.signal):action==='solve'?solveInvisibleCollective(answer,uid,controller.signal):readInvisibleCooperation(uid,controller.signal));
   if(ticket!==generation.current||controller.signal.aborted)return;
   if(!Array.isArray(result.realms)||result.required!==8||!Number.isInteger(result.covered)||result.covered<0||result.covered>8)throw Error('L’état du Cercle est momentanément indisponible.');
   setStored({owner:uid,value:result});if(result.contributedRealm)setRealm(result.contributedRealm);if(action==='solve')setAnswer('');
  }catch(e){if(ticket===generation.current&&!controller.signal.aborted){setError(e.message||'Le Cercle est momentanément indisponible.');if(action==='load')setStored(null);}}
  finally{if(ticket===generation.current){setBusy(false);lock.current=false;}}
 }
 useEffect(()=>{
  setStored(null);setError('');setBusy(false);setRealm('france');setAnswer('');lock.current=false;
  if(uid)run();
  return()=>{generation.current++;request.current?.abort();lock.current=false;};
 },[uid]);
 const contributed=snapshot?.contributedRealm,puzzle=snapshot?.puzzle,participationOpen=!seasonal||snapshot?.participationOpen===true;
 const displayRealms=puzzle?.letters?.length===8?puzzle.letters.map(letter=>INVISIBLE_REALMS.find(item=>item.id===letter.realm)).filter(Boolean):INVISIBLE_REALMS;
 const suffix=seasonal?'season':'permanent';
 return <div className={'invisible-echo-mission '+(seasonal?'invisible-events':'')}>
  <div className="invisible-section-heading"><div><span className="invisible-eyebrow">{seasonal?'Événement mondial · calendrier serveur':'Mission collective permanente'}</span><h3>{seasonal?snapshot?.title||'Les saisons du Lien':'Les huit échos'}</h3></div>{seasonal&&snapshot&&<span className="invisible-pill">{phases[snapshot.phase]||'État indisponible'}</span>}</div>
  <p>{seasonal?'Une nouvelle énigme collective accompagne chaque saison. Le calendrier et les accomplissements sont confirmés par le serveur.':'Après le coffre du Léman, lie ton écho à l’un des huit héritages. Chaque affinité représentée révèle une lettre ; huit comptes distincts sont nécessaires pour reconstituer le mot.'}</p>
  {!uid?<p className="invisible-notice">Connecte-toi à ton Passeport 3B pour consulter et rejoindre cette mission.</p>:<>
   {snapshot&&<>
    {seasonal&&<div className="invisible-event-calendar"><p>Du {date(snapshot.startsAt)} au {date(snapshot.endsAt)} · heure de Paris</p><label htmlFor={'invisible-event-'+suffix}>Calendrier<select id={'invisible-event-'+suffix} value={snapshot.event} disabled={busy} onChange={event=>run('load',event.target.value)}>{snapshot.calendar?.map(item=><option key={item.event} value={item.event}>{item.title} · {phases[item.phase]}</option>)}</select></label>{snapshot.completedAt&&<small>Première résolution collective confirmée le {date(snapshot.completedAt)}.</small>}</div>}
    <div className="invisible-echo-progress"><strong>{snapshot.awakened?'Les huit lettres répondent':'Le Cercle écoute'}</strong><span>{snapshot.covered}/8 affinités · {snapshot.contributors} contribution{snapshot.contributors===1?'':'s'} confirmée{snapshot.contributors===1?'':'s'}</span></div>
    <Progress value={snapshot.covered/8*100} label={'Affinités représentées · '+(seasonal?snapshot.title:'Les huit échos')}/>
    <div className="invisible-echo-realms">{displayRealms.map(item=>{const row=snapshot.realms.find(row=>row.realm===item.id),letter=puzzle?.letters?.find(row=>row.realm===item.id);return <div className={'invisible-echo-realm '+(row?.contributors>0?'answered':'')} key={item.id}><strong>{letter?letter.position+' · ':''}{item.name}</strong><small>{item.value}</small><span>{row?row.contributors+' écho'+(row.contributors===1?'':'s'):'État indisponible'}</span>{letter&&<b className="invisible-echo-letter" aria-label={item.name+': '+(letter.symbol?'lettre '+letter.symbol:'lettre encore masquée')}>{letter.symbol||'◇'}</b>}</div>;})}</div>
    {contributed?<p className="invisible-notice" role="status">Ton écho est lié à {INVISIBLE_REALMS.find(item=>item.id===contributed)?.name||'ton affinité'}.</p>:<>
     <label className="invisible-echo-choice" htmlFor={'invisible-echo-realm-'+suffix}>Choisir mon affinité<select id={'invisible-echo-realm-'+suffix} value={realm} onChange={event=>setRealm(event.target.value)} disabled={busy||!participationOpen}>{INVISIBLE_REALMS.map(item=><option key={item.id} value={item.id}>{item.name} · {item.value}</option>)}</select></label>
     <Button className="invisible-button primary" disabled={busy||!snapshot.eligible||!participationOpen} onClick={()=>run('contribute')}>Lier mon écho à {INVISIBLE_REALMS.find(item=>item.id===realm)?.name}</Button>
     {!snapshot.eligible&&<p className="invisible-muted">{save?.invisible?.chestOpened?'Attends la synchronisation du coffre du Léman avec ton compte, puis actualise le Cercle.':'Retrouve le Fragment de la Justice dans l’épisode du Léman et synchronise ton aventure pour contribuer.'}</p>}
    </>}
    {puzzle&&<div className="invisible-echo-puzzle"><h4>Le mot du Lien</h4><p>{puzzle.clue}</p>{puzzle.solved?<p className="invisible-notice" role="status">Ta finale est accomplie depuis le {date(puzzle.solvedAt)}. Ce souvenir de réussite est conservé sur ton compte.</p>:<>
     {!puzzle.unlocked&&<p className="invisible-muted">Les huit affinités doivent transmettre leur lettre avant de pouvoir valider le mot.</p>}
     <form className="invisible-final-answer" onSubmit={event=>{event.preventDefault();run('solve');}}><label htmlFor={'invisible-final-'+suffix}>Le mot de huit lettres<input id={'invisible-final-'+suffix} value={answer} maxLength={48} autoComplete="off" spellCheck={false} onChange={event=>setAnswer(event.target.value)} disabled={busy||!puzzle.unlocked||!participationOpen}/></label><Button type="submit" disabled={busy||!puzzle.unlocked||!contributed||!participationOpen||!answer.trim()}>Valider ma finale</Button></form>
    </>}</div>}
    {seasonal&&!participationOpen&&<p className="invisible-muted">{snapshot.phase==='upcoming'?'Cette saison ouvrira à la date prévue par le serveur.':'La période de participation est terminée. Les accomplissements déjà validés restent visibles.'}</p>}
   </>}
   {!snapshot&&!error&&<p className="invisible-muted" role="status">Lecture du Cercle…</p>}
   {error&&<p className="invisible-notice error" role="alert">{error} Les contributions et finales attendent une confirmation du serveur.</p>}
   <Button variant="ghost" className="invisible-button" disabled={busy} onClick={()=>run()}>{busy?'Le Cercle écoute…':'Actualiser '+(seasonal?'la saison':'le Cercle')}</Button>
  </>}
 </div>;
}
export default function CooperationPanel({uid,save}){
 return <section className="invisible-cooperation" aria-labelledby="invisible-cooperation-title"><h2 id="invisible-cooperation-title">Transmettre ensemble</h2><p className="invisible-muted">Choisis une affinité de jeu, jamais une preuve de résidence. Une seule contribution par compte pour chaque mission ; ton choix reste lié à cet écho. Aucune identité ni localisation n’est affichée.</p><EchoMission uid={uid} save={save}/><EchoMission uid={uid} save={save} seasonal/></section>;
}
