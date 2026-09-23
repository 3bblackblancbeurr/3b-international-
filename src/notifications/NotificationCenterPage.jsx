import {useCallback,useEffect,useState} from 'react';
import {Bell,CheckCheck,ChevronRight,Inbox,Send,ShieldCheck} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {notificationRequest} from './client.js';
import './notifications.css';

const REQUESTS=[
 ['account','Compte'],['sport','Sport'],['shop','Boutique'],['creator','Créateur'],
 ['partnership','Partenariat'],['event','Événement'],['press','Presse'],
 ['technical','Problème technique'],['privacy','Vie privée'],['other','Autre']
];
const when=value=>new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});
const severityLabel={info:'Info',important:'Important',urgent:'Urgent',critical:'Critique'};

export default function NotificationCenterPage({goTo,onChange}){
 const account=useLoyalty(),uid=account.user?.id;
 const[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[view,setView]=useState('notifications');
 const[form,setForm]=useState({category:'account',subject:'',message:''}),[notice,setNotice]=useState('');

 const load=useCallback(async()=>{
  if(!uid)return;
  try{setData(await notificationRequest('member-list',{},uid));setError('');}
  catch(e){setError(e.message);}
 },[uid]);
 useEffect(()=>{load();},[load]);

 async function mark(id){
  if(busy)return;setBusy(true);
  try{
   const result=await notificationRequest('member-read',id?{id}:{all:true},uid);
   onChange?.(result);await load();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function submit(event){
  event.preventDefault();if(busy)return;setBusy(true);setNotice('');setError('');
  try{
   await notificationRequest('request-submit',form,uid);
   setForm({category:form.category,subject:'',message:''});
   setNotice('Ta demande a été transmise à 3B.');
   setView('requests');await load();onChange?.();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(!uid)return <section className="notification-page editorial-page"><div className="surface-panel"><h1>Notifications 3B</h1><p>Connecte-toi pour retrouver tes notifications et tes demandes.</p><button className="surface-button" onClick={()=>goTo('member')}>Connexion</button></div></section>;

 const notifications=data?.notifications||[],requests=data?.requests||[],unread=notifications.filter(item=>!item.read_at).length;
 return <section className="notification-page editorial-page">
  <header className="notification-hero">
   <div><p className="eyebrow">CENTRE PERSONNEL 3B</p><h1>Mes notifications.</h1><p>Un seul endroit pour suivre ce qui te concerne dans l’univers 3B.</p></div>
   <div className="notification-count" aria-label={unread+' notifications non lues'}><Bell/><strong>{unread}</strong><span>non lues</span></div>
  </header>

  <div className="surface-tabs notification-tabs" role="tablist">
   <button aria-pressed={view==='notifications'} onClick={()=>setView('notifications')}>Notifications</button>
   <button aria-pressed={view==='requests'} onClick={()=>setView('requests')}>Mes demandes</button>
   <button aria-pressed={view==='contact'} onClick={()=>setView('contact')}>Contacter 3B</button>
  </div>
  {error&&<p className="surface-notice" role="alert">{error} <button className="text-button" onClick={load}>Réessayer</button></p>}
  {notice&&<p className="surface-notice" role="status">{notice}</p>}

  {view==='notifications'&&<>
   <div className="notification-toolbar"><p>{notifications.length} notification{notifications.length>1?'s':''}</p>{unread>0&&<button className="quiet-button" disabled={busy} onClick={()=>mark(null)}><CheckCheck size={17}/> Tout marquer comme lu</button>}</div>
   <div className="notification-list">
    {notifications.map(item=><article key={item.id} className={'notification-item '+(!item.read_at?'is-unread':'')} data-severity={item.severity}>
     <div className="notification-icon"><Bell size={19}/></div>
     <div className="notification-copy"><div className="notification-meta"><span>{severityLabel[item.severity]||item.severity}</span><time>{when(item.created_at)}</time></div><h2>{item.title}</h2>{item.body&&<p>{item.body}</p>}
      <div className="notification-actions">{item.route&&<button className="text-button" onClick={()=>{if(!item.read_at)mark(item.id);goTo(item.route);}}>Ouvrir <ChevronRight size={15}/></button>}{!item.read_at&&<button className="text-button" disabled={busy} onClick={()=>mark(item.id)}>Marquer comme lu</button>}</div>
     </div>
    </article>)}
    {!notifications.length&&<div className="surface-panel notification-empty"><ShieldCheck/><h2>Tout est calme.</h2><p>Les informations importantes liées à ton compte apparaîtront ici.</p></div>}
   </div>
  </>}

  {view==='requests'&&<div className="notification-list">
   {requests.map(request=><article key={request.id} className="notification-item request-item">
    <div className="notification-icon"><Inbox size={19}/></div><div className="notification-copy">
     <div className="notification-meta"><span>{request.category}</span><time>{when(request.created_at)}</time></div>
     <h2>{request.subject}</h2><p>{request.message}</p><span className="request-status">Statut · {request.status}</span>
     {request.owner_reply&&<div className="owner-reply"><strong>Réponse 3B</strong><p>{request.owner_reply}</p></div>}
    </div>
   </article>)}
   {!requests.length&&<div className="surface-panel notification-empty"><Inbox/><h2>Aucune demande.</h2><p>Tu peux contacter 3B directement depuis cette page, sans publier ton message dans la Communauté.</p><button className="surface-button" onClick={()=>setView('contact')}>Envoyer une demande</button></div>}
  </div>}

  {view==='contact'&&<form className="surface-panel surface-form notification-contact" onSubmit={submit}>
   <p className="eyebrow">MESSAGE PRIVÉ À 3B</p><h2>Envoyer une demande.</h2>
   <p>Ce message n’est pas publié dans la Communauté. Il est envoyé au Centre propriétaire 3B.</p>
   <label>Catégorie<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>{REQUESTS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>Objet<input required minLength={3} maxLength={140} value={form.subject} onChange={e=>setForm(v=>({...v,subject:e.target.value}))} placeholder="Ex. Problème avec mon compte"/></label>
   <label>Message<textarea required minLength={10} maxLength={4000} rows={7} value={form.message} onChange={e=>setForm(v=>({...v,message:e.target.value}))} placeholder="Explique ta demande le plus clairement possible…"/></label>
   <button className="surface-button" disabled={busy}><Send size={17}/>{busy?'Envoi…':'Envoyer à 3B'}</button>
  </form>}
 </section>;
}
