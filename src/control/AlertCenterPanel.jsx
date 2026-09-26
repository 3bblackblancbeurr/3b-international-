import {BellRing,CheckCircle2,Info,ShieldAlert} from 'lucide-react';

function category(alert){
 if(alert.level==='bad'||alert.score>=90)return'URGENT';
 if(alert.level==='warn'||alert.score>=60)return'IMPORTANT';
 return'INFORMATION';
}

export default function AlertCenterPanel({alerts,events}){
 const rows=Array.isArray(alerts)?alerts:[];
 const urgent=rows.filter(alert=>category(alert)==='URGENT').length;
 const important=rows.filter(alert=>category(alert)==='IMPORTANT').length;
 const recentEvents=Array.isArray(events)?events.slice(0,3):[];

 return <section className="control-section control-alert-center control-hide-in-focus" id="cc-alerts" aria-label="Centre de notifications 3B">
  <header className="control-section-heading">
   <div><p className="control-kicker"><BellRing size={13}/> NOTIFICATIONS · PRIORITÉS</p><h2>Centre d’attention</h2></div>
   <span className={'control-alert-count '+(urgent?'is-bad':important?'is-warn':'is-good')}>{rows.length}</span>
  </header>

  <div className="control-alert-counters">
   <article><ShieldAlert/><span>URGENT</span><strong>{urgent}</strong></article>
   <article><BellRing/><span>IMPORTANT</span><strong>{important}</strong></article>
   <article><Info/><span>INFORMATION</span><strong>{Math.max(0,rows.length-urgent-important)}</strong></article>
  </div>

  <div className="control-alert-list">
   {rows.length?rows.map(alert=><article key={alert.key||alert.title} data-level={alert.level}>
    <span>{category(alert)}</span>
    <strong>{alert.title}</strong>
    <small>Priorité {alert.score||0}</small>
   </article>):<div className="control-alert-calm"><CheckCircle2/><div><strong>Tout est calme.</strong><small>Aucune alerte réelle ne nécessite ton attention maintenant.</small></div></div>}
  </div>

  {recentEvents.length>0&&<footer className="control-alert-events">
   <span>DERNIERS ÉVÉNEMENTS AUDITÉS</span>
   <small>{recentEvents.length} événement{recentEvents.length>1?'s':''} récent{recentEvents.length>1?'s':''} chargé{recentEvents.length>1?'s':''}</small>
  </footer>}
 </section>;
}
