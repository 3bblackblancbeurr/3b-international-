import React,{useEffect,useRef,useState} from 'react';
import {Button,Progress} from '../../design-system/index.jsx';
import {INVISIBLE_REALMS} from './catalog.js';
import {readInvisibleCooperation,contributeInvisibleEcho} from './guardian-client.js';

export default function CooperationPanel({uid,save}){
 const [savedSnapshot,setSnapshot]=useState(null),[realm,setRealm]=useState('france'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const snapshot=savedSnapshot?.owner===uid?savedSnapshot.value:null;
 const request=useRef(null),generation=useRef(0),owner=useRef(uid);
 if(owner.current!==uid){owner.current=uid;generation.current++;request.current?.abort();}
 async function load(contribute=false,force=false){
  if(!uid||(busy&&!force))return;
  const controller=new AbortController(),ticket=generation.current;request.current?.abort();request.current=controller;
  setBusy(true);setError('');
  try{
   const result=await (contribute?contributeInvisibleEcho(realm,uid,controller.signal):readInvisibleCooperation(uid,controller.signal));
   if(ticket!==generation.current||controller.signal.aborted)return;
   if(!Array.isArray(result.realms)||result.required!==8||!Number.isInteger(result.covered)||result.covered<0||result.covered>8)throw Error('L’état du Cercle est momentanément indisponible.');
   setSnapshot({owner:uid,value:result});
   if(result.contributedRealm)setRealm(result.contributedRealm);
  }catch(e){if(ticket===generation.current&&!controller.signal.aborted){setError(e.message||'Le Cercle est momentanément indisponible.');if(!contribute)setSnapshot(null);}}
  finally{if(ticket===generation.current)setBusy(false);}
 }
 useEffect(()=>{
  setSnapshot(null);setError('');setBusy(false);setRealm('france');
  if(uid)load(false,true);
  return()=>{generation.current++;request.current?.abort();};
 },[uid]);
 // The verified eligibility is reloaded explicitly after account synchronization.
 const fragment=save?.invisible?.chestOpened===true,contributed=snapshot?.contributedRealm;
 return <section className="invisible-cooperation" aria-labelledby="invisible-cooperation-title">
  <div className="invisible-section-heading"><div><span className="invisible-eyebrow">Mission collective · Épisode 001</span><h2 id="invisible-cooperation-title">Les huit échos</h2></div><span className="invisible-pill">Bêta</span></div>
  <p>Après le coffre du Léman, lie ton écho à l’un des huit héritages. Le Cercle résonnera quand huit comptes distincts auront représenté les huit affinités.</p>
  <p className="invisible-muted">Ton choix est une affinité de jeu, jamais une preuve de résidence. Une seule contribution par compte pour cette mission ; ce choix reste lié à ton écho. Aucune identité ni localisation n’est affichée.</p>
  {!uid?<p className="invisible-notice">Connecte-toi à ton Passeport 3B pour consulter et rejoindre cette mission.</p>:<>
   {snapshot&&<>
    <div className="invisible-echo-progress"><strong>{snapshot.awakened?'Le Cercle résonne':'Le Cercle écoute'}</strong><span>{snapshot.covered}/8 affinités · {snapshot.contributors} contribution{snapshot.contributors===1?'':'s'} confirmée{snapshot.contributors===1?'':'s'}</span></div>
    <Progress value={snapshot.covered/8*100} label="Affinités représentées dans les huit échos"/>
    <div className="invisible-echo-realms">{INVISIBLE_REALMS.map(item=>{const row=snapshot.realms.find(row=>row.realm===item.id);return <div className={'invisible-echo-realm '+(row?.contributors>0?'answered':'')} key={item.id}><strong>{item.name}</strong><small>{item.value}</small><span>{row?row.contributors+' écho'+(row.contributors===1?'':'s'):'État indisponible'}</span></div>;})}</div>
    {contributed?<p className="invisible-notice" role="status">Ton écho est lié à {INVISIBLE_REALMS.find(item=>item.id===contributed)?.name||'ton affinité'}.</p>:<>
     <label className="invisible-echo-choice" htmlFor="invisible-echo-realm">Choisir mon affinité<select id="invisible-echo-realm" value={realm} onChange={event=>setRealm(event.target.value)} disabled={busy}>{INVISIBLE_REALMS.map(item=><option key={item.id} value={item.id}>{item.name} · {item.value}</option>)}</select></label>
     <Button className="invisible-button primary" disabled={busy||!snapshot.eligible} onClick={()=>load(true)}>Lier mon écho à {INVISIBLE_REALMS.find(item=>item.id===realm)?.name}</Button>
     {!snapshot.eligible&&<p className="invisible-muted">{fragment?'Attends la synchronisation du coffre avec ton compte, puis actualise le Cercle.':'Retrouve le Fragment de la Justice et synchronise ton aventure pour contribuer.'}</p>}
    </>}
   </>}
   {!snapshot&&!error&&<p className="invisible-muted" role="status">Lecture du Cercle…</p>}
   {error&&<p className="invisible-notice error" role="alert">{error} Les contributions ne peuvent pas être confirmées pour le moment.</p>}
   <Button variant="ghost" className="invisible-button" disabled={busy} onClick={()=>load()}>{busy?'Le Cercle écoute…':'Actualiser le Cercle'}</Button>
  </>}
 </section>;
}
