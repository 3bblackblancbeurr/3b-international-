import React,{useEffect,useState} from 'react';
import {ArrowUpRight,CalendarDays,MapPin,RefreshCw,ShieldCheck} from 'lucide-react';
import './french-events.css';
function displayDate(local){
  if(typeof local!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(local))return 'Date non renseignée';
  const day=new Date(local.slice(0,10)+'T12:00:00Z');
  const date=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(day);
  return date+' · '+local.slice(11,16);
}
function publishedAt(value) {
  const d=new Date(value||'');
  return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(d):'date de publication non renseignée';
}
export default function FrenchEvents(){
  const [events,setEvents]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  const [visible,setVisible]=useState(5);
  useEffect(()=>{
    const ctrl=new AbortController();setLoading(true);setError('');setEvents([]);setVisible(5);
    fetch('/api/member-events',{signal:ctrl.signal,credentials:'omit'})
    .then(async res=>{
      const json=await res.json();
      if(!res.ok||!Array.isArray(json.items))throw new Error(json.error||'Agenda indisponible.');
      if(!ctrl.signal.aborted)setEvents(json.items);
    })
    .catch(e=>{if(!ctrl.signal.aborted)setError(e.message||'Impossible de charger les événements.');})
    .finally(()=>{if(!ctrl.signal.aborted)setLoading(false);});
    return ()=>ctrl.abort();
  },[refresh]);
  return <section className="mx-events" aria-labelledby="mx-events-title">
    <header><span className="mx-eyebrow"><CalendarDays size={15}/> ÉVÉNEMENTS PUBLIÉS</span>
      <h4 id="mx-events-title">La culture en mouvement.</h4>
      <p>Prochains événements publiés sur l’agenda national du Ministère de la Culture. Les dates et horaires viennent des organisateurs et peuvent changer.</p>
    </header>
    {loading&&<p className="mx-status" role="status">Actualisation des événements officiels…</p>}
    {error&&<p role="status" className="mx-events-status">La programmation ne peut pas être récupérée actuellement. <button type="button" onClick={()=>setRefresh(v=>v+1)}><RefreshCw size={15}/> Réessayer</button></p>}
    {!loading&&!error&&!events.length&&<p className="mx-events-status" role="status">Aucun événement à venir disponible dans ce flux pour le moment.</p>}
    {!!events.length&&<ol className="mx-events-list">{events.slice(0,visible).map(event=><li key={event.link}>
      <div className="mx-events-when"><span>{displayDate(event.starts_local)}</span><small>Heure locale du lieu</small></div>
      <div className="mx-events-detail"><strong>{event.title}</strong>{event.location&&<span><MapPin size={14}/> {event.location}</span>}
        <small>Publié par {event.source} · {publishedAt(event.published)}</small>
        <a href={event.link} target="_blank" rel="noopener noreferrer">Voir les détails et confirmer la date <ArrowUpRight size={16}/></a>
      </div>
    </li>)}</ol>}
    {events.length>visible&&<button type="button" className="mx-events-more" onClick={()=>setVisible(n=>Math.min(events.length,n+5))}>Voir les {Math.min(5,events.length-visible)} événements suivants</button>}
    <p className="mx-honesty"><ShieldCheck size={16}/> Données ouvertes du Ministère de la Culture via OpenAgenda · Licence Ouverte 2.0. Sélection non exhaustive. Événements annulés, complets ou modifiés : vérifier l’annonce originale avant de se déplacer.</p>
  </section>;
}
