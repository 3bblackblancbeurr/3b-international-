import {useCallback,useEffect,useMemo,useState} from 'react';
import {
 Activity,BarChart3,Clock3,Eye,Layers3,RefreshCw,Radar,Smartphone,
 TrendingDown,TrendingUp,UsersRound,WifiOff
} from 'lucide-react';
import {authClient} from '../loyalty/client.js';

const PAGE_LABELS={
 intro:'Entrée 3B',home:'Accueil',guide:'Guide & XP',passport:'Passeport 3B',
 member:'Espace membre',loyalty:'Fidélité',manga:'Manga 3B',world3b:'Monde du 3B',
 arena:'Arène 3B',nosbloc:'Nosbloc du 3B',games:'Jeux 3B',game:'Partie 3B',
 religion:'Religion',community:'Communauté',secret:'Secret 3B',sport:'Sport 3B',
 ia:'Espace IA','ia-textile':'IA textile','ia-trio':'Mode 3 IA',shop:'Boutique',
 control:'3B Command OS'
};
const numberFormat=new Intl.NumberFormat('fr-FR');

const n=value=>Math.max(0,Number(value)||0);
const sum=rows=>rows.reduce((total,row)=>total+n(row.sessions),0);
const pageLabel=value=>PAGE_LABELS[value]||String(value||'Inconnu')
 .replace(/[-_]+/g,' ')
 .replace(/\b\w/g,letter=>letter.toUpperCase());

function clock(value){
 if(!value)return '—';
 return new Date(value).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function fillDays(rows){
 const source=new Map((rows||[]).map(row=>[String(row.bucket),n(row.sessions)]));
 const now=new Date();
 return Array.from({length:14},(_,index)=>{
  const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(13-index));
  const bucket=String(date.getDate()).padStart(2,'0')+'/'+String(date.getMonth()+1).padStart(2,'0');
  return {bucket,label:index===13?'Auj.':bucket,sessions:source.get(bucket)||0};
 });
}

function fillMonths(rows){
 const source=new Map((rows||[]).map(row=>[String(row.bucket),n(row.sessions)]));
 const now=new Date();
 return Array.from({length:12},(_,index)=>{
  const date=new Date(now.getFullYear(),now.getMonth()-(11-index),1);
  const bucket=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  const label=new Intl.DateTimeFormat('fr-FR',{month:'short'}).format(date).replace('.','');
  return {bucket,label,sessions:source.get(bucket)||0};
 });
}

function TrafficBars({rows,label,compact=false}){
 const[selected,setSelected]=useState(null);
 const max=Math.max(1,...rows.map(row=>n(row.sessions)));
 const selectedRow=selected===null?null:rows[selected]||null;
 return <div className="control-traffic-chart-interactive">
  <div className={'control-traffic-bars'+(compact?' is-compact':'')} role="group" aria-label={label}>
   {rows.map((row,index)=>{
    const value=n(row.sessions);
    const height=value?Math.max(8,Math.round(value/max*100)):3;
    const active=selected===index;
    return <button
     type="button"
     className={'control-traffic-bar'+(active?' is-selected':'')}
     key={row.bucket}
     title={row.label+' · '+numberFormat.format(value)+' sessions'}
     aria-label={row.label+' : '+numberFormat.format(value)+' sessions'}
     aria-pressed={active}
     onClick={()=>setSelected(active?null:index)}
    >
     <div className="control-traffic-bar-track"><i style={{height:height+'%'}}/></div>
     <span>{row.label}</span>
     {(!compact||index===rows.length-1)&&<b>{numberFormat.format(value)}</b>}
    </button>;
   })}
  </div>
  <div className="control-traffic-exact" aria-live="polite">
   {selectedRow?<><strong>{selectedRow.label}</strong><span>{numberFormat.format(n(selectedRow.sessions))} sessions</span></>:<span>Touche une barre pour afficher sa valeur exacte.</span>}
  </div>
 </div>;
}

export default function DirectorTraffic(){
 const[rows,setRows]=useState([]);
 const[summary,setSummary]=useState(null);
 const[daily,setDaily]=useState([]);
 const[monthly,setMonthly]=useState([]);
 const[refreshing,setRefreshing]=useState(false);
 const[error,setError]=useState('');
 const[updatedAt,setUpdatedAt]=useState(0);
 const[view,setView]=useState('overview');

 const load=useCallback(async({silent=false}={})=>{
  if(typeof document!=='undefined'&&document.hidden&&silent)return;
  if(typeof navigator!=='undefined'&&!navigator.onLine){
   setError('Appareil hors ligne · dernière mesure conservée.');
   return;
  }
  if(!silent)setRefreshing(true);
  const calls=[
   authClient.rpc('app_director_traffic'),
   authClient.rpc('app_director_traffic_summary'),
   authClient.rpc('app_director_traffic_timeline',{p_period:'day'}),
   authClient.rpc('app_director_traffic_timeline',{p_period:'month'})
  ];
  try{
   const settled=await Promise.allSettled(calls);
   const values=settled.map(result=>result.status==='fulfilled'&&!result.value?.error?result.value?.data:null);
   let success=0;
   if(values[0]!==null){setRows(Array.isArray(values[0])?values[0]:[]);success++;}
   if(values[1]!==null){setSummary(Array.isArray(values[1])?values[1][0]||null:values[1]||null);success++;}
   if(values[2]!==null){setDaily(Array.isArray(values[2])?values[2]:[]);success++;}
   if(values[3]!==null){setMonthly(Array.isArray(values[3])?values[3]:[]);success++;}
   if(success){
    setUpdatedAt(Date.now());
    setError(success<4?'Une source répond partiellement · les autres mesures restent disponibles.':'');
   }else{
    setError('Radar de fréquentation momentanément indisponible.');
   }
  }catch{
   setError('Radar de fréquentation momentanément indisponible.');
  }finally{
   if(!silent)setRefreshing(false);
  }
 },[]);

 useEffect(()=>{
  let disposed=false;
  const refresh=()=>{if(!disposed)load({silent:true});};
  load();
  const timer=window.setInterval(refresh,30000);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',visible);
  window.addEventListener('online',refresh);
  return()=>{
   disposed=true;
   window.clearInterval(timer);
   document.removeEventListener('visibilitychange',visible);
   window.removeEventListener('online',refresh);
  };
 },[load]);

 const dailySeries=useMemo(()=>fillDays(daily),[daily]);
 const monthlySeries=useMemo(()=>fillMonths(monthly),[monthly]);
 const onlineNow=n(summary?.app_online)+n(summary?.site_online);
 const active15=n(summary?.active_15m);
 const totalSessions=n(summary?.visits);
 const installs=n(summary?.unique_installs);
 const current7=sum(dailySeries.slice(-7));
 const previous7=sum(dailySeries.slice(0,7));
 const delta=previous7?Math.round((current7-previous7)/previous7*100):current7>0?100:0;
 const topPage=useMemo(()=>[...rows].sort((a,b)=>n(b.visits)-n(a.visits))[0]||null,[rows]);
 const activePages=useMemo(()=>rows
  .filter(row=>n(row.active_now)>0)
  .sort((a,b)=>n(b.active_now)-n(a.active_now)||n(b.visits)-n(a.visits)),[rows]);
 const topLive=activePages[0]||null;
 const maxPageSessions=Math.max(1,...rows.map(row=>n(row.visits)));
 const peakDay=useMemo(()=>dailySeries.reduce((best,row)=>n(row.sessions)>n(best.sessions)?row:best,dailySeries[0]||{label:'—',sessions:0}),[dailySeries]);
 const rowTotal=rows.reduce((total,row)=>total+n(row.visits),0);
 const appSessions=rows.filter(row=>row.platform==='app').reduce((total,row)=>total+n(row.visits),0);
 const appShare=rowTotal?Math.round(appSessions/rowTotal*100):0;

 return <section className="control-section control-traffic control-hide-in-focus" id="cc-traffic" aria-label="Fréquentation 3B privée">
  <header className="control-section-heading control-traffic-heading">
   <div>
    <p className="control-kicker"><Radar size={13}/> INTELLIGENCE · FRÉQUENTATION</p>
    <h2>Radar 3B</h2>
   </div>
   <button className="control-traffic-refresh" onClick={()=>load()} disabled={refreshing} aria-label="Actualiser la fréquentation 3B">
    <RefreshCw className={refreshing?'is-spinning':''} size={16}/>
    <span>{updatedAt?clock(updatedAt):'SYNC'}</span>
   </button>
  </header>

  <div className="control-traffic-hero">
   <div className="control-traffic-orb" data-live={onlineNow>0?'true':'false'}>
    <span><Activity size={15}/> EN DIRECT</span>
    <strong>{numberFormat.format(onlineNow)}</strong>
    <small>{onlineNow===1?'session active':'sessions actives'}</small>
   </div>
   <div className="control-traffic-platforms">
    <div><Smartphone size={15}/><span>APPLICATION</span><strong>{numberFormat.format(n(summary?.app_online))}</strong><small>{appShare}% des sessions suivies</small></div>
    <div><Layers3 size={15}/><span>SITE</span><strong>{numberFormat.format(n(summary?.site_online))}</strong><small>{Math.max(0,100-appShare)}% des sessions suivies</small></div>
   </div>
  </div>

  {error&&<div className="control-traffic-warning" role="status"><WifiOff size={15}/><span>{error}</span></div>}

  <div className="control-traffic-metrics">
   <article><Clock3/><span>ACTIFS 15 MIN</span><strong>{numberFormat.format(active15)}</strong><small>activité récente</small></article>
   <article><UsersRound/><span>APPAREILS UNIQUES</span><strong>{numberFormat.format(installs)}</strong><small>installations connues</small></article>
   <article><Eye/><span>SESSIONS</span><strong>{numberFormat.format(totalSessions)}</strong><small>sessions enregistrées</small></article>
   <article><BarChart3/><span>7 JOURS</span><strong>{numberFormat.format(current7)}</strong><small className={delta>0?'is-up':delta<0?'is-down':''}>{delta>0?'+':''}{delta}% vs 7j précédents</small></article>
  </div>

  <div className="control-traffic-tabs" role="tablist" aria-label="Vues fréquentation 3B">
   <button className={view==='overview'?'is-active':''} onClick={()=>setView('overview')} aria-pressed={view==='overview'}><Radar size={14}/>Vue</button>
   <button className={view==='live'?'is-active':''} onClick={()=>setView('live')} aria-pressed={view==='live'}><Activity size={14}/>Direct</button>
   <button className={view==='history'?'is-active':''} onClick={()=>setView('history')} aria-pressed={view==='history'}><BarChart3 size={14}/>12 mois</button>
  </div>

  {view==='overview'&&<div className="control-traffic-panel">
   <div className="control-traffic-intel">
    <article>
     {delta>=0?<TrendingUp size={17}/>:<TrendingDown size={17}/>}
     <span>TENDANCE 7J</span>
     <strong>{delta>0?'+':''}{delta}%</strong>
     <small>{numberFormat.format(current7)} sessions sur les 7 derniers jours</small>
    </article>
    <article>
     <Eye size={17}/>
     <span>ZONE N°1</span>
     <strong>{topPage?pageLabel(topPage.page):'—'}</strong>
     <small>{topPage?numberFormat.format(n(topPage.visits))+' sessions '+(topPage.platform==='app'?'app':'site'):'Aucune donnée'}</small>
    </article>
    <article>
     <Activity size={17}/>
     <span>LIVE N°1</span>
     <strong>{topLive?pageLabel(topLive.page):'—'}</strong>
     <small>{topLive?numberFormat.format(n(topLive.active_now))+' en ligne maintenant':'Aucune zone active'}</small>
    </article>
    <article>
     <BarChart3 size={17}/>
     <span>PIC 14J</span>
     <strong>{peakDay?.label||'—'}</strong>
     <small>{numberFormat.format(n(peakDay?.sessions))} sessions</small>
    </article>
   </div>
   <div className="control-traffic-chart-card">
    <div className="control-traffic-chart-title"><div><span>14 DERNIERS JOURS</span><strong>Rythme de fréquentation</strong></div><b>{numberFormat.format(sum(dailySeries))}</b></div>
    <TrafficBars rows={dailySeries} label="Fréquentation des 14 derniers jours"/>
   </div>
  </div>}

  {view==='live'&&<div className="control-traffic-panel">
   <div className="control-traffic-live-head">
    <div><span className={onlineNow?'control-live-dot':'control-live-dot offline'}/><strong>{onlineNow?'Présence détectée':'Aucune présence maintenant'}</strong></div>
    <small>mise à jour auto · 30 s</small>
   </div>
   <div className="control-traffic-page-list">
    {rows.length?[...rows].sort((a,b)=>n(b.active_now)-n(a.active_now)||n(b.visits)-n(a.visits)).slice(0,12).map(row=>{
     const width=Math.max(4,Math.round(n(row.visits)/maxPageSessions*100));
     return <article key={row.platform+'-'+row.page}>
      <div className="control-traffic-page-main">
       <span>{row.platform==='app'?'APP':'SITE'}</span>
       <div><strong>{pageLabel(row.page)}</strong><small>{numberFormat.format(n(row.visits))} sessions suivies</small></div>
       <b>{numberFormat.format(n(row.active_now))}<small> live</small></b>
      </div>
      <div className="control-traffic-page-progress"><i style={{width:width+'%'}}/></div>
     </article>;
    }):<div className="control-empty-inline"><Activity/><span>Les premières sessions apparaîtront ici.</span></div>}
   </div>
  </div>}

  {view==='history'&&<div className="control-traffic-panel">
   <div className="control-traffic-history-summary">
    <article><span>12 MOIS</span><strong>{numberFormat.format(sum(monthlySeries))}</strong><small>sessions historisées</small></article>
    <article><span>MOIS ACTUEL</span><strong>{numberFormat.format(n(monthlySeries.at(-1)?.sessions))}</strong><small>{monthlySeries.at(-1)?.label||'—'}</small></article>
   </div>
   <div className="control-traffic-chart-card">
    <div className="control-traffic-chart-title"><div><span>HISTORIQUE</span><strong>12 derniers mois</strong></div><BarChart3 size={18}/></div>
    <TrafficBars rows={monthlySeries} label="Fréquentation des 12 derniers mois" compact/>
   </div>
  </div>}

  <footer className="control-traffic-foot">
   <span><Radar size={13}/> PRIVÉ · DIRECTEUR</span>
   <p>Données agrégées et anonymes. Aucun nom, e-mail ou adresse IP n’est affiché dans ce cockpit.</p>
  </footer>
 </section>;
}
