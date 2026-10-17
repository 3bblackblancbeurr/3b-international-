import {useEffect,useState} from 'react';
import {ArrowUpRight,CalendarDays,Check,CheckCircle2,Clock3,Plus,ShieldCheck,Sparkles,Trash2} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {RouteLink} from './AppNavigation.jsx';
import {
 ALBERT_PLAN_MAX_ITEMS,ALBERT_PLAN_MAX_TEXT,ALBERT_PLAN_ROUTES,
 ALBERT_PLAN_SUGGESTIONS,albertLocalDayKey,createAlbertPlanEntry,
 normalizeAlbertPlan,readAlbertPlan,persistAlbertPlan
} from './albert-local-plan.js';
import '../styles/albert-daily-timeline.css';

function localStorageOrNull(){
 try{return typeof window!=='undefined'?window.localStorage:null;}catch{return null;}
}

function makeEntryId(){
 if(typeof globalThis!=='undefined'&&globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 return 'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
}

function routeLabel(route){
 return ALBERT_PLAN_ROUTES.find(item=>item.id===route)?.label||'Activité personnelle';
}

export default function AlbertDailyTimeline({goTo}){
 const [day,setDay]=useState(()=>albertLocalDayKey());
 const [entries,setEntries]=useState(()=>readAlbertPlan(localStorageOrNull(),albertLocalDayKey()));
 const [title,setTitle]=useState('');
 const [time,setTime]=useState('');
 const [route,setRoute]=useState('');
 const [notice,setNotice]=useState('');
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{
  const sync=()=>{
   const current=albertLocalDayKey();
   if(current!==day){
    setDay(current);
    setEntries(readAlbertPlan(localStorageOrNull(),current));
    setNotice('');
   }
  };
  const onStorage=event=>{
   if(event.key==='threeb-albert-local-plan-v1' || event.key===null){
    setEntries(readAlbertPlan(localStorageOrNull(),albertLocalDayKey()));
   }
  };
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('focus',sync);
  window.addEventListener('storage',onStorage);
  return()=>{
   document.removeEventListener('visibilitychange',sync);
   window.removeEventListener('focus',sync);
   window.removeEventListener('storage',onStorage);
  };
 },[day]);
 const progress=entries.filter(entry=>entry.done).length;
 const sorted=[...entries].sort((a,b)=>{
  if(a.time&&b.time)return a.time.localeCompare(b.time);
  if(a.time)return -1;
  if(b.time)return 1;
  return 0;
 });
 function write(next){
  const clean=normalizeAlbertPlan(next);
  setEntries(clean);
  setNotice(persistAlbertPlan(localStorageOrNull(),clean,day)
   ?'Enregistré uniquement sur cet appareil.'
   :'Activité modifiée pour cette session, mais le stockage du navigateur est indisponible.');
 }
 function addActivity(label,targetRoute=null,targetTime=''){
  const value=String(label||'').trim().slice(0,ALBERT_PLAN_MAX_TEXT);
  if(!value){setNotice('Écris une activité avant de l’ajouter.');return;}
  if(entries.length>=ALBERT_PLAN_MAX_ITEMS){setNotice('Ta journée contient déjà 12 activités.');return;}
  const next=createAlbertPlanEntry({title:value,route:targetRoute,time:targetTime},makeEntryId());
  if(!next){setNotice('Impossible d’ajouter cette activité.');return;}
  write([...entries,next]);
  setTitle('');setTime('');setRoute('');
  setExpanded(false);
 }
 function complete(id){
  write(entries.map(entry=>entry.id===id?{...entry,done:!entry.done}:entry));
 }
 function remove(id){
  write(entries.filter(entry=>entry.id!==id));
 }
 return <section className="albert3b-daily" aria-labelledby="albert3b-daily-title">
   <div className="albert3b-daily-header">
    <div>
     <span className="world3b-eyebrow"><CalendarDays size={14} aria-hidden="true"/> TON PARCOURS DU JOUR</span>
     <h2 id="albert3b-daily-title">Votre timeline <em>vivante</em></h2>
     <p>Un programme que tu choisis, sans rendez-vous inventés.</p>
    </div>
    <span className="albert3b-daily-count" aria-label={progress+' activités terminées sur '+entries.length}>{progress}<small> / {entries.length}</small></span>
   </div>
   {entries.length>0&&<div className="albert3b-daily-progress" role="progressbar" aria-valuemin={0} aria-valuemax={entries.length} aria-valuenow={progress} aria-label="Progression des activités personnelles"><span style={{width:(progress/entries.length*100)+'%'}}/></div>}
   {sorted.length>0?<ol className="albert3b-daily-list">
    {sorted.map(entry=><li key={entry.id} className={'albert3b-daily-item'+(entry.done?' is-done':'')}>
     <Button variant="ghost" type="button" className="albert3b-daily-complete" aria-label={(entry.done?'Marquer comme non terminée : ':'Terminer : ')+entry.title} aria-pressed={entry.done} onClick={()=>complete(entry.id)}>{entry.done?<CheckCircle2 size={23}/>:<span className="albert3b-daily-empty-check"/>}</Button>
     <div className="albert3b-daily-item-copy"><strong>{entry.title}</strong><span>{entry.time&&<><Clock3 size={12} aria-hidden="true"/> {entry.time} · </>}{routeLabel(entry.route)}</span></div>
     {entry.route&&<RouteLink page={entry.route} goTo={goTo} className="albert3b-daily-open" aria-label={'Ouvrir '+routeLabel(entry.route)}><ArrowUpRight size={19}/></RouteLink>}
     <Button type="button" variant="ghost" className="albert3b-daily-delete" aria-label={'Supprimer : '+entry.title} onClick={()=>remove(entry.id)}><Trash2 size={17}/></Button>
    </li>)}
   </ol>:<p className="albert3b-daily-empty"><Sparkles size={21} aria-hidden="true"/> Ta journée t’appartient. Choisis une première activité parmi les suggestions ou crée la tienne.</p>}
   <div className="albert3b-daily-quick">
    {ALBERT_PLAN_SUGGESTIONS.map(suggestion=>{
     const exists=entries.some(item=>item.title===suggestion.title);
     return <Button variant="ghost" type="button" key={suggestion.id} disabled={exists||entries.length>=ALBERT_PLAN_MAX_ITEMS}
      onClick={()=>addActivity(suggestion.title,suggestion.id)} aria-label={'Ajouter à ma journée : '+suggestion.title}>
       {exists?<Check size={15} aria-hidden="true"/>:<Plus size={15} aria-hidden="true"/>}
       <span>{suggestion.title}</span>
      </Button>;
    })}
   </div>
   <Button variant="ghost" type="button" className="albert3b-daily-add-toggle" aria-expanded={expanded} aria-controls="albert3b-daily-editor" onClick={()=>setExpanded(value=>!value)}><Plus size={17}/> {expanded?'Fermer le planning':'Créer mon activité'}</Button>
   {expanded&&<form id="albert3b-daily-editor" className="albert3b-daily-editor" onSubmit={event=>{event.preventDefault();addActivity(title,route||null,time);}}>
    <label htmlFor="albert3b-daily-title-input">Mon activité</label>
    <input id="albert3b-daily-title-input" value={title} onChange={event=>setTitle(event.target.value.slice(0,ALBERT_PLAN_MAX_TEXT))} maxLength={ALBERT_PLAN_MAX_TEXT} placeholder="Ex. Découvrir un nouveau jeu 3B" required/>
    <div className="albert3b-daily-input-row">
     <div><label htmlFor="albert3b-daily-time">Heure (facultative)</label><input id="albert3b-daily-time" type="time" value={time} onChange={event=>setTime(event.target.value)}/></div>
     <div><label htmlFor="albert3b-daily-route">Rubrique (facultative)</label><select id="albert3b-daily-route" value={route} onChange={event=>setRoute(event.target.value)}><option value="">Aucune</option>{ALBERT_PLAN_ROUTES.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select></div>
    </div>
    <Button variant="ghost" type="submit" disabled={!title.trim()||entries.length>=ALBERT_PLAN_MAX_ITEMS} className="albert3b-daily-save">Ajouter à ma journée <Plus size={17}/></Button>
   </form>}
   {notice&&<p className="albert3b-daily-notice" role="status">{notice}</p>}
   <p className="albert3b-daily-privacy"><ShieldCheck size={14} aria-hidden="true"/> Sauvegarde sur cet appareil uniquement · aucune synchronisation, notification ni action automatique. N’y note pas de données sensibles.</p>
 </section>;
}
