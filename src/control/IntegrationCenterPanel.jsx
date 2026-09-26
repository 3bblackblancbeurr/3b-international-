import {useCallback,useEffect,useMemo,useState} from 'react';
import {
 BrainCircuit,CalendarDays,Database,Github,Mail,Monitor,Radar,RefreshCw,Share2,
 ShieldCheck,WalletCards,Workflow
} from 'lucide-react';
import {commandIntegrationsStatus} from './integrations-client.js';

const LABELS={
 connected:'Connecté',available:'Disponible',partial:'Partiel',checking:'Contrôle…',
 degraded:'Dégradé',offline:'Hors ligne',disconnected:'Non connecté',
 live:'LIVE',test:'TEST',configured:'Configuré',setup_required:'À connecter',error:'Erreur'
};

function stateClass(value){
 if(['connected','available','live','configured'].includes(value))return'good';
 if(['partial','test','checking'].includes(value))return'warn';
 if(['degraded','offline','error'].includes(value))return'bad';
 return'idle';
}

function Row({Icon,label,state,detail,next,children}){
 return <article className={'control-integration-row is-'+stateClass(state)}>
  <span className="control-integration-icon"><Icon size={17}/></span>
  <div><strong>{label}</strong><small>{detail}</small>{next&&<em>{next}</em>}{children}</div>
  <b className={'is-'+state}>{LABELS[state]||state}</b>
 </article>;
}

function amountText(row,privacy){
 if(privacy)return '••••';
 const currency=String(row?.currency||'').toUpperCase();
 const amount=Number(row?.amount);
 if(!Number.isFinite(amount))return '—';
 if(currency==='EUR')return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount/100);
 return amount+' '+(currency||'unités');
}

function age(value){
 if(!value)return 'jamais';
 const seconds=Math.max(0,Math.round((Date.now()-value)/1000));
 if(seconds<60)return seconds+' s';
 return Math.round(seconds/60)+' min';
}

export default function IntegrationCenterPanel({pulse,dataAvailable,primaryDevice,primaryOnline,privacyMode=false}){
 const[remote,setRemote]=useState(null);
 const[error,setError]=useState('');
 const[loading,setLoading]=useState(false);
 const[checkedAt,setCheckedAt]=useState(0);

 const load=useCallback(async({silent=false}={})=>{
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
   setError('Hors ligne · derniers états conservés.');
   return;
  }
  if(!silent)setLoading(true);
  try{
   const next=await commandIntegrationsStatus();
   setRemote(next?.providers||null);
   setCheckedAt(Date.now());
   setError('');
  }catch(e){setError(e.message||'Intégrations indisponibles.');}
  finally{if(!silent)setLoading(false);}
 },[]);

 useEffect(()=>{
  let dead=false;
  const refresh=()=>{if(!dead)load({silent:true});};
  load();
  const timer=window.setInterval(refresh,60000);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',visible);
  window.addEventListener('online',refresh);
  return()=>{dead=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',refresh);};
 },[load]);

 const internal=useMemo(()=>({
  supabase:dataAvailable?'connected':'checking',
  github:pulse?.github===true?'connected':pulse?.github===false?'degraded':'checking',
  pc:primaryOnline?'connected':primaryDevice?'offline':'disconnected'
 }),[dataAvailable,pulse?.github,primaryDevice,primaryOnline]);

 const google=remote?.google;
 const gmail=google?.gmail;
 const calendar=google?.calendar;
 const metricool=remote?.metricool;
 const stripe=remote?.stripe;
 const vercel=remote?.vercel;
 const openai=remote?.openai;
 const nextEvent=calendar?.events?.[0];
 const availableMoney=stripe?.available?.[0];
 const pendingMoney=stripe?.pending?.[0];

 const rows=[
  {Icon:Database,label:'Supabase / Control Center',state:internal.supabase,detail:'Session propriétaire + données privées du cockpit.',next:'Actif dans Command OS.'},
  {Icon:Github,label:'GitHub / Actions',state:internal.github,detail:'Commits, CI, PR et déploiements GitHub publics.',next:'Actif dans Dev Center.'},
  {Icon:Monitor,label:'PC 3B',state:internal.pc,detail:primaryDevice?'Agent appairé connu.':'Aucun agent appairé.',next:primaryDevice?'Relancer l’agent si nécessaire.':'Appairer depuis le centre Appareils.'},
  {Icon:Radar,label:'Radar 3B',state:'available',detail:'Fréquentation agrégée via RPC Supabase.',next:'Actif dans Radar 3B.'}
 ];

 const external=[
  {
   Icon:Mail,label:'Gmail',state:gmail?.state||google?.state||'checking',
   detail:gmail?.state==='live'?`${gmail.unread||0} message${gmail.unread===1?'':'s'} non lu${gmail.unread===1?'':'s'} prioritaire${gmail.unread===1?'':'s'}`:google?.detail||'Vérification serveur…',
   next:google?.state==='setup_required'?'Autorisation Google Workspace serveur requise.':null
  },
  {
   Icon:CalendarDays,label:'Google Agenda',state:calendar?.state||google?.state||'checking',
   detail:calendar?.state==='live'?`${calendar.upcoming||0} événement${calendar.upcoming===1?'':'s'} à venir`:google?.detail||'Vérification serveur…',
   next:nextEvent?(privacyMode?'Prochain événement masqué':`${nextEvent.title||'Événement'} · ${nextEvent.start?new Date(nextEvent.start).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'date inconnue'}`):null
  },
  {
   Icon:Share2,label:'Réseaux sociaux · Metricool',state:metricool?.state||'checking',
   detail:metricool?.state==='live'?(metricool.brand||'Marque 3B'):(metricool?.detail||'Vérification serveur…'),
   next:Array.isArray(metricool?.networks)&&metricool.networks.length?'Connectés : '+metricool.networks.join(' · '):metricool?.state==='setup_required'?'Jeton API Metricool serveur requis.':null
  },
  {
   Icon:WalletCards,label:'Finances · Stripe',state:stripe?.state||'checking',
   detail:stripe?.detail||'Vérification serveur…',
   next:stripe?.state==='live'||stripe?.state==='test'?`Disponible ${amountText(availableMoney,privacyMode)} · En attente ${amountText(pendingMoney,privacyMode)}`:stripe?.state==='setup_required'?'Clé Stripe serveur requise.':null
  },
  {
   Icon:Workflow,label:'Vercel',state:vercel?.state||'checking',
   detail:vercel?.state==='live'?`${vercel.deployments||0} déploiement${vercel.deployments===1?'':'s'} récent${vercel.deployments===1?'':'s'} chargé${vercel.deployments===1?'':'s'}`:vercel?.detail||'Vérification serveur…',
   next:vercel?.latest?`Dernier : ${vercel.latest.state||'inconnu'}${vercel.latest.target?' · '+vercel.latest.target:''}`:vercel?.state==='setup_required'?'Jeton Vercel serveur requis.':null
  },
  {
   Icon:BrainCircuit,label:'3B IA Command',state:openai?.state||'checking',
   detail:openai?.detail||'Vérification serveur…',
   next:openai?.state==='configured'?`Modèle : ${openai.model||'configuré'}`:openai?.state==='setup_required'?'Clé OpenAI + modèle serveur requis.':null
  },
  {Icon:ShieldCheck,label:'Sécurité',state:'available',detail:'Garde propriétaire, allowlist et journal d’audit actifs.',next:'Les secrets restent uniquement côté serveur.'}
 ];

 const connected=[...rows,...external].filter(row=>['connected','available','live','configured','test'].includes(row.state)).length;
 const total=rows.length+external.length;

 return <section className="control-section control-integrations control-hide-in-focus" id="cc-integrations" aria-label="Centre des intégrations Command OS">
  <header className="control-section-heading">
   <div><p className="control-kicker"><Workflow size={13}/> SOURCES · CONTRATS RÉELS</p><h2>Centre d’intégrations</h2></div>
   <button className="control-integrations-refresh" type="button" onClick={()=>load()} disabled={loading}>
    <RefreshCw className={loading?'is-spinning':''} size={14}/><span>{checkedAt?'il y a '+age(checkedAt):'SYNC'}</span>
   </button>
  </header>

  {error&&<div className="control-integrations-warning" role="status">{error}</div>}

  <div className="control-integrations-summary"><strong>{connected}/{total}</strong><span>sources disponibles ou configurées</span></div>
  <div className="control-integration-list">
   {[...rows,...external].map(row=><Row key={row.label} {...row}/>)}
  </div>
  <p className="control-integrations-note">Les jetons Google, Metricool, Stripe, Vercel et OpenAI ne sont jamais envoyés au navigateur. Un service sans secret applicatif valide reste « À connecter ».</p>
 </section>;
}
