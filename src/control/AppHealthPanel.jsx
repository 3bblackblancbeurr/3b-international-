import {useEffect,useState} from 'react';
import {Activity,Database,HardDrive,MonitorSmartphone,Network,RefreshCw,ShieldCheck} from 'lucide-react';

const fmtBytes=value=>{
 if(!Number.isFinite(value)||value<0)return '—';
 if(value<1024)return Math.round(value)+' o';
 if(value<1024**2)return (value/1024).toFixed(1)+' Ko';
 if(value<1024**3)return (value/1024**2).toFixed(1)+' Mo';
 return (value/1024**3).toFixed(1)+' Go';
};

function age(value){
 if(!value)return 'Jamais';
 const seconds=Math.max(0,Math.round((Date.now()-value)/1000));
 if(seconds<10)return 'À l’instant';
 if(seconds<60)return seconds+' s';
 return Math.round(seconds/60)+' min';
}

export default function AppHealthPanel({pulse,latency,lastSync,dataAvailable,error}){
 const[local,setLocal]=useState({storage:null,persisted:null,serviceWorker:null,standalone:null,checkedAt:0});

 useEffect(()=>{
  let live=true;
  const inspect=async()=>{
   const next={
    storage:null,
    persisted:null,
    serviceWorker:null,
    standalone:window.matchMedia?.('(display-mode: standalone)')?.matches===true||window.navigator.standalone===true,
    checkedAt:Date.now()
   };
   try{
    if(navigator.storage?.estimate)next.storage=await navigator.storage.estimate();
    if(navigator.storage?.persisted)next.persisted=await navigator.storage.persisted();
    if(navigator.serviceWorker){
     const registration=await navigator.serviceWorker.getRegistration();
     next.serviceWorker=Boolean(registration?.active);
    }
   }catch{}
   if(live)setLocal(next);
  };
  inspect();
  const timer=window.setInterval(inspect,60000);
  return()=>{live=false;window.clearInterval(timer);};
 },[]);

 const connection=navigator.connection?.effectiveType||pulse?.connection||'inconnue';
 const used=local.storage?.usage;
 const quota=local.storage?.quota;
 const storageDetail=Number.isFinite(used)&&Number.isFinite(quota)?fmtBytes(used)+' / '+fmtBytes(quota):'Quota non exposé';
 const syncState=error?'Dégradé':dataAvailable?'Normal':'Synchronisation';
 const networkState=pulse?.network?'En ligne':'Hors ligne';

 return <section className="control-section control-health control-hide-in-focus" id="cc-health" aria-label="Santé application 3B">
  <header className="control-section-heading">
   <div><p className="control-kicker"><Activity size={13}/> APPLICATION · OBSERVABILITÉ LOCALE</p><h2>App Health</h2></div>
   <span className={'control-health-badge '+(error?'is-bad':dataAvailable?'is-good':'')}>{syncState}</span>
  </header>

  <div className="control-health-grid">
   <article><Network/><span>RÉSEAU</span><strong>{networkState}</strong><small>{pulse?.network?'Type '+connection:'Dernières données conservées si disponibles'}</small></article>
   <article><RefreshCw/><span>CONTROL API</span><strong>{latency?latency+' ms':'—'}</strong><small>Dernière synchro : {age(lastSync)}</small></article>
   <article><MonitorSmartphone/><span>PWA</span><strong>{local.standalone?'Installée / standalone':'Navigateur'}</strong><small>Service Worker : {local.serviceWorker===true?'actif':local.serviceWorker===false?'non actif':'inconnu'}</small></article>
   <article><HardDrive/><span>STOCKAGE</span><strong>{storageDetail}</strong><small>{local.persisted===true?'Stockage persistant':local.persisted===false?'Persistance non garantie':'Persistance inconnue'}</small></article>
  </div>

  <div className="control-health-row">
   <Database size={15}/><div><strong>État des données propriétaire</strong><small>{error?error:dataAvailable?'Dernier chargement valide conservé par le cockpit.':'En attente de la première réponse valide.'}</small></div>
  </div>
  <p className="control-health-truth"><ShieldCheck size={14}/><span>Aucune mesure CPU/GPU du téléphone n’est inventée : seuls les signaux que le navigateur expose réellement sont affichés.</span></p>
 </section>;
}
