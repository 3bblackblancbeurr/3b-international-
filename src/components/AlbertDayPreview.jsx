import {useEffect,useState} from 'react';
import {ArrowRight,CalendarDays,CheckCircle2,Clock3} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {albertLocalDayKey,readAlbertPlan} from './albert-local-plan.js';

function loadDay(){
 try{return readAlbertPlan(window.localStorage,albertLocalDayKey());}
 catch{return [];}
}
// Only the visitor's real, locally entered activities appear here; never
// generate fictional meetings, inferred preferences or artificial times.
export default function AlbertDayPreview({active=false,onOpen}){
 const [entries,setEntries]=useState(()=>typeof window==='undefined'?[]:loadDay());
 useEffect(()=>{
  const update=()=>setEntries(loadDay());
  if(active)update();
  window.addEventListener('focus',update);
  window.addEventListener('storage',update);
  window.addEventListener('threeb:albert-plan-updated',update);
  return()=>{
   window.removeEventListener('focus',update);
   window.removeEventListener('storage',update);
   window.removeEventListener('threeb:albert-plan-updated',update);
  };
 },[active]);
 const done=entries.filter(x=>x.done).length;
 const sorted=[...entries].sort((a,b)=>{
  if(a.time&&b.time)return a.time.localeCompare(b.time);
  if(a.time)return -1;
  if(b.time)return 1;
  return 0;
 });
 return <section className="th-albert-day-preview" aria-label="Aperçu de ma journée personnelle">
  <div className="th-albert-day-preview-head">
   <span><CalendarDays size={15} aria-hidden="true"/> TON PARCOURS</span>
   <strong>{entries.length?done+' / '+entries.length+' terminées':'À construire'}</strong>
  </div>
  <h3>Ta journée, <em>à ton rythme.</em></h3>
  {sorted.length>0?<ol className="th-albert-day-preview-list">
   {sorted.slice(0,3).map((x,i)=><li key={x.id}>
    <span className="th-albert-day-preview-time">{x.time||'0'+(i+1)}</span>
    <span className="th-albert-day-preview-dot" aria-hidden="true"/>
    <span className="th-albert-day-preview-title">{x.title}</span>
    {x.done&&<CheckCircle2 size={16} aria-label="Terminée"/>}
   </li>)}
  </ol>:<p className="th-albert-day-preview-empty"><Clock3 size={17} aria-hidden="true"/> Aucun rendez-vous inventé : ajoute tes vraies activités pour créer ta timeline.</p>}
  <Button variant="ghost" type="button" className="th-albert-day-preview-action" onClick={onOpen}>Ouvrir ma timeline <ArrowRight size={17}/></Button>
 </section>;
}
