import {Activity,BellRing,CheckCircle2,Clock3,Laptop,RefreshCw} from 'lucide-react';

const startOfToday=()=>{
 const now=new Date();
 return new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
};

const sinceToday=value=>{
 const time=value?new Date(value).getTime():0;
 return Number.isFinite(time)&&time>=startOfToday();
};

function age(value){
 if(!value)return 'jamais';
 const seconds=Math.max(0,Math.round((Date.now()-value)/1000));
 if(seconds<60)return seconds+' s';
 const minutes=Math.round(seconds/60);
 if(minutes<60)return minutes+' min';
 return Math.round(minutes/60)+' h';
}

export default function DailyBriefPanel({pulse,alerts,events,commands,primaryDevice,primaryOnline,lastSync}){
 const todayEvents=(events||[]).filter(event=>sinceToday(event.created_at));
 const todayCommands=(commands||[]).filter(command=>sinceToday(command.issued_at));
 const failed=todayCommands.filter(command=>command.status==='failed').length;
 const succeeded=todayCommands.filter(command=>command.status==='succeeded').length;
 const urgent=(alerts||[]).filter(alert=>alert.level==='bad'||alert.score>=90).length;
 const production=pulse?.production===true?'En ligne':pulse?.production===false?'À vérifier':'Inconnue';
 const ci=pulse?.ci==='success'?'Verte':pulse?.ci==='running'?'En cours':pulse?.ci?'À vérifier':'Inconnue';

 return <section className="control-section control-daily-brief control-hide-in-focus" id="cc-brief" aria-label="Brief quotidien Command OS">
  <header className="control-section-heading">
   <div><p className="control-kicker"><Clock3 size={13}/> AUJOURD’HUI · DONNÉES CHARGÉES</p><h2>Command Brief quotidien</h2></div>
   <span className="control-brief-sync"><RefreshCw size={13}/> {lastSync?'il y a '+age(lastSync):'sync'}</span>
  </header>

  <div className="control-brief-grid">
   <article><BellRing/><span>ALERTES</span><strong>{alerts?.length||0}</strong><small>{urgent?urgent+' urgente'+(urgent>1?'s':''):'aucune urgente'}</small></article>
   <article><Activity/><span>ÉVÉNEMENTS</span><strong>{todayEvents.length}</strong><small>chargés depuis minuit</small></article>
   <article><CheckCircle2/><span>COMMANDES</span><strong>{todayCommands.length}</strong><small>{succeeded} réussie{(succeeded>1||succeeded===0)?'s':''} · {failed} échec{failed>1?'s':''}</small></article>
   <article><Laptop/><span>PC</span><strong>{primaryOnline?'En ligne':primaryDevice?'Hors ligne':'Non appairé'}</strong><small>{primaryDevice?'source agent 3B':'aucun appareil connu'}</small></article>
  </div>

  <div className="control-brief-summary">
   <p><strong>Production :</strong> {production}</p>
   <p><strong>CI :</strong> {ci}</p>
   <p><strong>Priorité :</strong> {alerts?.[0]?.title||'Aucune alerte réelle ne demande d’action.'}</p>
  </div>

  <p className="control-brief-note">Ce brief utilise uniquement les événements, commandes et états actuellement chargés. Une source non connectée n’est jamais estimée.</p>
 </section>;
}