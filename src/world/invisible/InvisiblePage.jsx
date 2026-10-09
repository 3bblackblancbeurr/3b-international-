import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {blankSave} from '../rules.js';
import {loadWorld,saveWorld,recordWorldAction} from '../save.js';
import {getInvisibleEpisode} from './catalog.js';
import {blankInvisibleState,invisibleEpisodeProgress} from './progression.js';
import CampaignExperience from './CampaignExperience.jsx';
import './invisible.css';

export default function InvisiblePage({goTo}){
 const account=useLoyalty();
 return account.loading?<div className="invisible-loading" role="status">Ouverture du Monde Invisible…</div>:<InvisibleSession key={account.user?.id||'guest'} uid={account.user?.id} goTo={goTo}/>;
}

function InvisibleSession({uid,goTo}) {
 const [save,setSave]=useState(blankSave),[loaded,setLoaded]=useState(false),[loadBlocked,setLoadBlocked]=useState(false),[saving,setSaving]=useState(false),[status,setStatus]=useState(null),[saveMessage,setSaveMessage]=useState('Récupération de ton aventure…'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState(()=>getInvisibleEpisode().points[0].id),[answer,setAnswer]=useState('');
 const saveRef=useRef(save),ready=useRef(false),alive=useRef(false),generation=useRef(0),loadTicket=useRef(0),dirty=useRef(false),syncFlight=useRef(null),syncTimer=useRef(null);
 const invisible=save.invisible||blankInvisibleState(),episode=getInvisibleEpisode(invisible.activeEpisode),progress=invisibleEpisodeProgress(invisible,episode.id),solved=progress.solved,point=episode.points.find(item=>item.id===selected)||episode.points[Math.min(solved.length,episode.points.length-1)];
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
   const restored=result.data.invisible||blankInvisibleState(),restoredEpisode=getInvisibleEpisode(restored.activeEpisode),restoredProgress=invisibleEpisodeProgress(restored,restoredEpisode.id);setSelected(restoredEpisode.points[Math.min(restoredProgress.solved.length,restoredEpisode.points.length-1)].id);
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
 function start(){if(act({type:'invisibleStart',episodeId:episode.id})){setNotice(episode.guardian+' t’attend à la première trace.');setSelected(episode.points[0].id);}}
 function submit(event){event.preventDefault();const next=act({type:'invisibleAnswer',episodeId:episode.id,id:point.id,answer});if(!next)return false;setAnswer('');const current=invisibleEpisodeProgress(next.invisible,episode.id),nextPoint=episode.points.find(item=>!current.solved.includes(item.id));setNotice(nextPoint?'Trace retrouvée. Prochaine énigme : '+nextPoint.name+'.':'Les trois traces sont réunies. Tu peux ouvrir le coffre.');if(nextPoint)setSelected(nextPoint.id);return true;}
 function openChest(){const next=act({type:'invisibleChest',episodeId:episode.id});if(next)setNotice(episode.fragment.name+' est conservé dans ton carnet du Monde Invisible.');return !!next;}
 function openPortal(){const next=act({type:'invisiblePortal',episodeId:episode.id});if(next)setNotice('Le passage de '+episode.city+' est ouvert.');return !!next;}
 function selectEpisode(id){const next=act({type:'invisibleSelectEpisode',episodeId:id});if(!next)return;const target=getInvisibleEpisode(id),state=invisibleEpisodeProgress(next.invisible,id);setSelected(target.points[Math.min(state.solved.length,target.points.length-1)].id);setAnswer('');setError('');setNotice('');}
 return <CampaignExperience uid={uid} save={save} loaded={loaded} loadBlocked={loadBlocked} saving={saving} status={status} saveMessage={saveMessage} error={error} notice={notice} selected={selected} answer={answer} onAnswerChange={setAnswer} onSelectPoint={selectPoint} onSelectEpisode={selectEpisode} onStart={start} onSubmit={submit} onChest={openChest} onPortal={openPortal} onMode={mode=>act({type:'invisibleMode',mode})} onMemory={enabled=>act({type:'invisibleMemoryConsent',enabled})} onForget={()=>{if(act({type:'invisibleForget'}))setNotice('Souvenirs supprimés et mémoire désactivée. Ton aventure est conservée.');}} onConverge={answer=>{const next=act({type:'invisibleConvergence',answer});if(next)setNotice('Les huit valeurs sont réunies. La finale est conservée dans ton carnet.');return !!next;}} onSync={sync} onRecover={recover} goTo={goTo}/>;
}
