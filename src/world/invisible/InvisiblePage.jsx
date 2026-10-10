import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {blankSave} from '../rules.js';
import {loadWorld,saveWorld,recordWorldAction} from '../save.js';
import {assertHiddenWorldAction} from './platform.js';
import {readInvisibleView,invisibleViewHref} from './navigation.js';
import CampaignExperience from './CampaignExperience.jsx';

export default function InvisiblePage({goTo}){
 const account=useLoyalty();
 return account.loading?<div className="invisible-loading" role="status">Ouverture du Monde caché…</div>:<InvisibleSession key={account.user?.id||'guest'} uid={account.user?.id} goTo={goTo}/>;
}

function InvisibleSession({uid,goTo}) {
 const [view,setView]=useState(()=>readInvisibleView(window.location));
 useEffect(()=>{const restore=()=>setView(readInvisibleView(window.location));window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);return()=>{window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};},[]);
 function navigateView(next){const href=invisibleViewHref(next,window.location);if(new URL(href,window.location.href).href!==window.location.href)window.history.pushState(null,'',href);setView(readInvisibleView(window.location));}
 const [save,setSave]=useState(blankSave),[loaded,setLoaded]=useState(false),[loadBlocked,setLoadBlocked]=useState(false),[saving,setSaving]=useState(false),[status,setStatus]=useState(null),[saveMessage,setSaveMessage]=useState('Récupération de ton aventure…'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const saveRef=useRef(save),ready=useRef(false),alive=useRef(false),generation=useRef(0),loadTicket=useRef(0),dirty=useRef(false),syncFlight=useRef(null),syncTimer=useRef(null);
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
   assertHiddenWorldAction(command);
   const next=recordWorldAction(uid,saveRef.current,command);saveRef.current=next;generation.current++;setSave(next);dirty.current=true;setError('');setStatus(current=>({...current,outcome:uid?'pending':'local'}));setSaveMessage(uid?'Progression conservée sur cet appareil · synchronisation à venir.':'Progression sauvegardée sur cet appareil.');
   clearTimeout(syncTimer.current);syncTimer.current=setTimeout(sync,800);
   return next;
  }catch(err){setError(err.message||'Cette action ne peut pas être enregistrée.');setNotice('');return null;}
 },[uid,sync]);
 return <CampaignExperience view={view} onViewChange={navigateView} save={save} loaded={loaded} loadBlocked={loadBlocked} saving={saving} status={status} saveMessage={saveMessage} error={error} notice={notice} onForget={()=>{if(act({type:'invisibleForget'}))setNotice('Souvenirs supprimés. Ta sauvegarde est conservée.');}} onSync={sync} onRecover={recover} goTo={goTo}/>;
}
