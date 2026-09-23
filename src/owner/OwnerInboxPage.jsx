import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Archive,CheckCircle2,Clock3,Inbox,RefreshCw,Search,Send,ShieldAlert,Users} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {notificationRequest} from '../notifications/client.js';
import './owner-inbox.css';

const CATEGORIES=[
 ['all','Tout'],['accounts','Comptes'],['requests','Demandes'],['community','Communauté'],['moderation','Modération'],
 ['sport','Sport'],['shop','Boutique'],['security','Sécurité'],['secret3b','Secret 3B'],['games','Jeux'],
 ['world','Monde'],['ai','IA'],['privacy','Vie privée'],['marketplace','Échanges'],['system','Système']
];
const SEVERITIES=[['all','Toutes'],['critical','Critique'],['urgent','Urgent'],['important','Important'],['info','Info']];
const STATUS=[['new','À traiter'],['in_progress','En cours'],['done','Terminé'],['archived','Archivé']];
const when=value=>new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});
const profileFor=(profiles,id)=>profiles?.find(p=>p.user_id===id);

export default function OwnerInboxPage({goTo,onChange}){
 const account=useLoyalty(),uid=account.user?.id;
 const[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[tab,setTab]=useState('inbox');
 const[filters,setFilters]=useState({category:'all',severity:'all',status:'new',search:'',unread:false});
 const[selectedRequest,setSelectedRequest]=useState(null),[reply,setReply]=useState('');

 const load=useCallback(async()=>{
  if(!uid)return;
  setBusy(true);
  try{
   const body={
    ...(filters.category!=='all'?{category:filters.category}:{}),
    ...(filters.severity!=='all'?{severity:filters.severity}:{}),
    ...(filters.status!=='all'?{status:filters.status}:{}),
    ...(filters.search.trim()?{search:filters.search.trim()}:{}),
    unread:filters.unread
   };
   setData(await notificationRequest('owner-list',body,uid));setError('');
  }catch(e){setError(e.message);setData(null);}
  finally{setBusy(false);}
 },[uid,filters.category,filters.severity,filters.status,filters.search,filters.unread]);
 useEffect(()=>{const timer=setTimeout(load,filters.search?350:0);return()=>clearTimeout(timer);},[load]);

 async function updateEvent(item,change){
  if(busy)return;setBusy(true);
  try{const result=await notificationRequest('owner-update',{id:item.id,...change},uid);onChange?.(result);await load();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function answerRequest(event){
  event.preventDefault();if(!selectedRequest||busy)return;setBusy(true);
  try{
   await notificationRequest('owner-request-reply',{id:selectedRequest.id,reply},uid);
   setSelectedRequest(null);setReply('');await load();onChange?.();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(!uid)return <section className="owner-page editorial-page"><div className="surface-panel"><h1>Centre propriétaire 3B</h1><p>Connexion propriétaire requise.</p></div></section>;

 const events=data?.events||[],requests=data?.requests||[],stats=data?.stats||{};
 const requestProfiles=data?.profiles||[];
 const selected=selectedRequest&&requests.find(r=>r.id===selectedRequest.id)||selectedRequest;
 const summary=useMemo(()=>[
  ['À surveiller',Number(stats.urgent||0),ShieldAlert],
  ['Signalements',Number(stats.openReports||0),AlertTriangle],
  ['Défis à valider',Number(stats.pendingSport||0),CheckCircle2],
  ['Demandes',Number(stats.openRequests||0),Inbox],
  ['Envois échoués',Number(stats.failedDelivery||0),Clock3]
 ],[stats]);

 return <section className="owner-page editorial-page">
  <header className="owner-hero"><div><p className="eyebrow">ACCÈS PRIVÉ · PROPRIÉTAIRE</p><h1>Centre propriétaire 3B.</h1><p>Tout ce qui demande ton attention dans l’application, centralisé sans mélanger les messages ordinaires et les alertes critiques.</p></div><button className="quiet-button" onClick={load} disabled={busy}><RefreshCw size={17}/>{busy?'Actualisation…':'Actualiser'}</button></header>

  {error&&<p className="surface-notice owner-error" role="alert">{error}</p>}
  {data&&<div className="owner-stat-grid">{summary.map(([label,value,Icon])=><article key={label} className="owner-stat"><Icon size={19}/><strong>{value}</strong><span>{label}</span></article>)}</div>}

  <div className="surface-tabs owner-tabs"><button aria-pressed={tab==='inbox'} onClick={()=>setTab('inbox')}>Boîte de réception</button><button aria-pressed={tab==='requests'} onClick={()=>setTab('requests')}>Demandes membres</button></div>

  {tab==='inbox'&&<>
   <div className="owner-filters surface-panel">
    <label>Catégorie<select value={filters.category} onChange={e=>setFilters(v=>({...v,category:e.target.value}))}>{CATEGORIES.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label>Priorité<select value={filters.severity} onChange={e=>setFilters(v=>({...v,severity:e.target.value}))}>{SEVERITIES.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label>État<select value={filters.status} onChange={e=>setFilters(v=>({...v,status:e.target.value}))}><option value="all">Tous</option>{STATUS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label className="owner-search"><Search size={16}/><input value={filters.search} onChange={e=>setFilters(v=>({...v,search:e.target.value}))} placeholder="Rechercher…"/></label>
    <label className="owner-unread"><input type="checkbox" checked={filters.unread} onChange={e=>setFilters(v=>({...v,unread:e.target.checked}))}/> Non lus uniquement</label>
   </div>
   <div className="owner-event-list">{events.map(item=>{
    const p=profileFor(data?.profiles,item.actor_user_id);
    return <article key={item.id} className={'owner-event '+(!item.read_at?'is-unread':'')} data-severity={item.severity}>
     <header><div><span className="owner-category">{item.category}</span><span className="owner-severity">{item.severity}</span></div><time>{when(item.created_at)}</time></header>
     <h2>{item.title}</h2><p>{item.summary}</p>
     {p&&<p className="owner-actor"><Users size={14}/>{p.name} · @{p.handle} · {p.country}</p>}
     <footer>
      {!item.read_at&&<button className="text-button" disabled={busy} onClick={()=>updateEvent(item,{read:true})}>Marquer lu</button>}
      {item.status!=='in_progress'&&item.status!=='archived'&&<button className="quiet-button" disabled={busy} onClick={()=>updateEvent(item,{read:true,status:'in_progress'})}>Prendre en charge</button>}
      {item.status!=='done'&&item.status!=='archived'&&<button className="quiet-button" disabled={busy} onClick={()=>updateEvent(item,{read:true,status:'done'})}><CheckCircle2 size={15}/> Terminer</button>}
      {item.status!=='archived'&&<button className="text-button" disabled={busy} onClick={()=>updateEvent(item,{read:true,status:'archived'})}><Archive size={15}/> Archiver</button>}
      {(item.category==='community'||item.category==='moderation')&&<button className="text-button" onClick={()=>goTo('community')}>Ouvrir Communauté</button>}
      {item.category==='sport'&&<button className="text-button" onClick={()=>goTo('sport')}>Ouvrir Sport</button>}
      {item.category==='shop'&&<button className="text-button" onClick={()=>goTo('shop')}>Ouvrir Boutique</button>}
     </footer>
    </article>;
   })}
   {!events.length&&!busy&&<div className="surface-panel owner-empty"><CheckCircle2/><h2>Aucun élément dans ce filtre.</h2><p>Les nouveaux événements importants apparaîtront ici automatiquement.</p></div>}</div>
  </>}

  {tab==='requests'&&<div className="owner-request-layout">
   <div className="owner-request-list">{requests.map(request=>{
    const p=profileFor(requestProfiles,request.user_id);
    const who=p?(p.name+' · @'+p.handle):'Membre 3B';
    return <button type="button" key={request.id} className={'owner-request-card '+(selected?.id===request.id?'selected':'')} onClick={()=>{setSelectedRequest(request);setReply(request.owner_reply||'');}}>
     <span>{request.priority} · {request.category}</span><strong>{request.subject}</strong><small>{who} · {when(request.created_at)}</small>
    </button>;
   })}{!requests.length&&<div className="surface-panel owner-empty"><Inbox/><h2>Aucune demande ouverte.</h2></div>}</div>
   {selected&&<form className="surface-panel surface-form owner-reply-panel" onSubmit={answerRequest}>
    <p className="eyebrow">{selected.category} · {selected.status}</p><h2>{selected.subject}</h2>
    <p className="owner-request-message">{selected.message}</p>
    <label>Réponse au membre<textarea required minLength={2} maxLength={4000} rows={8} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Écris la réponse qui sera envoyée dans ses notifications…"/></label>
    <div className="owner-reply-actions"><button className="surface-button" disabled={busy}><Send size={16}/>{busy?'Envoi…':'Répondre'}</button><button type="button" className="quiet-button" onClick={()=>{setSelectedRequest(null);setReply('');}}>Fermer</button></div>
   </form>}
  </div>}
 </section>;
}
