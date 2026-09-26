import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
 Activity,ArrowLeft,BellRing,CheckCircle2,ChevronRight,Cloud,Cpu,GitBranch,Gauge,
 KeyRound,Laptop,RefreshCw,Rocket,Server,ShieldCheck,Sparkles,
 TerminalSquare,Unplug,Wifi,WifiOff,Zap
} from 'lucide-react';
import {controlCenterRequest} from './client.js';
import DirectorTraffic from '../components/DirectorTraffic.jsx';
import CommandNexus from './CommandNexus.jsx';
import DevCenterPanel from './DevCenterPanel.jsx';
import AppHealthPanel from './AppHealthPanel.jsx';
import SecurityCenterPanel from './SecurityCenterPanel.jsx';
import ModuleBoundary from './ModuleBoundary.jsx';
import AlertCenterPanel from './AlertCenterPanel.jsx';
import ProjectsCenterPanel from './ProjectsCenterPanel.jsx';
import CommandSettingsPanel from './CommandSettingsPanel.jsx';
import './control-center.css';

const ACTIONS=[
 {id:'system_status',label:'État du PC',detail:'Mémoire, système et disponibilité'},
 {id:'open_3b',label:'Ouvrir 3B',detail:'Lancer l’application sur le PC'},
 {id:'open_unreal',label:'Ouvrir Unreal',detail:'Lancer le projet ThreeBWorld'},
 {id:'unreal_health',label:'Vérifier Unreal',detail:'Tester le Remote Control local'},
 {id:'open_repo',label:'Ouvrir le projet',detail:'Afficher le dépôt local 3B'},
 {id:'open_github',label:'Ouvrir GitHub',detail:'Accéder au dépôt distant'},
 {id:'open_supabase',label:'Ouvrir Supabase',detail:'Accéder au backend 3B'},
 {id:'ping',label:'Ping PC',detail:'Tester la liaison téléphone ↔ PC'}
];

const COMMAND_LABELS=Object.fromEntries(ACTIONS.map(action=>[action.id,action.label]));
const NATURAL_COMMANDS=[
 {id:'system_status',re:/\b(état|etat|status|pc|mémoire|memoire|cpu|système|systeme)\b/i},
 {id:'open_github',re:/\b(github|git)\b/i},
 {id:'open_supabase',re:/\b(supabase|base de données|database)\b/i},
 {id:'unreal_health',re:/\b(vérifie unreal|verifie unreal|unreal.*état|unreal.*etat)\b/i},
 {id:'open_unreal',re:/\b(ouvre unreal|lance unreal|unreal)\b/i},
 {id:'open_repo',re:/\b(dépôt|depot|repo|projet local)\b/i},
 {id:'open_3b',re:/\b(ouvre 3b|lance 3b|application 3b)\b/i},
 {id:'ping',re:/\b(ping|liaison|connexion pc)\b/i}
];

const NAVIGATION_COMMANDS=[
 {re:/\b(radar|trafic|fréquentation|frequentation|visites?)\b/i,target:'cc-traffic',feedback:'Radar 3B ouvert.'},
 {re:/\b(nexus|services?|connexions?)\b/i,target:'cc-nexus',feedback:'Nexus 3B ouvert.'},
 {re:/\b(dev|développement|developpement|commit|ci|pull request|pr ouvertes?|déploiement|deploiement)\b/i,target:'cc-dev',feedback:'Dev Center ouvert.'},
 {re:/\b(projets?|passeport|monde du 3b|origins|nosbloc|guardians|stylcam|boutique|sport 3b)\b/i,target:'cc-projects',feedback:'Projects Center ouvert.'},
 {re:/\b(réglages?|reglages?|paramètres?|parametres?|compact|mouvements?|personnalisation)\b/i,target:'cc-settings',feedback:'Réglages Command OS ouverts.'},
 {re:/\b(app health|santé app|sante app|pwa|service worker|stockage|réseau app|reseau app)\b/i,target:'cc-health',feedback:'App Health ouvert.'},
 {re:/\b(appareils?|pc appairé|pc appaire|liaison pc)\b/i,target:'cc-devices',feedback:'Centre des appareils ouvert.'},
 {re:/\b(alertes?|notifications?|attention|urgent)\b/i,target:'cc-alerts',feedback:'Centre d’attention ouvert.'},
 {re:/\b(sécurité|securite|permissions?|allowlist|propriétaire|proprietaire)\b/i,target:'cc-security',feedback:'Security Center ouvert.'},
 {re:/\b(journal|historique|audit)\b/i,target:'cc-log',feedback:'Journal de contrôle ouvert.'},
 {re:/\b(accueil|état général|etat general|maintenant)\b/i,target:'cc-now',feedback:'État général ouvert.'},
 {re:/\b(email|e-mail|mail|réseaux sociaux|reseaux sociaux|tiktok|youtube|instagram|finance|banque|agenda|calendrier)\b/i,target:'cc-nexus',feedback:'Cette source apparaît dans le Nexus avec son état réel de connexion.'}
];

const EVENT_LABELS={
 'pairing.created':'Code d’appairage créé',
 'device.paired':'Nouveau PC appairé',
 'device.revoked':'Appareil révoqué',
 'command.issued':'Commande envoyée',
 'command.succeeded':'Commande réussie',
 'command.failed':'Commande en échec',
 'command.cancelled':'Commande annulée'
};

const statusLabel=status=>({
 pending:'En attente',claimed:'Reçue',succeeded:'Réussie',failed:'Échec',
 cancelled:'Annulée',expired:'Expirée'
}[status]||status);

function isPhoneClient(){
 if(typeof window==='undefined')return false;
 const native=Boolean(window.Capacitor?.isNativePlatform?.());
 const mobileUa=navigator.userAgentData?.mobile===true||/android|iphone|ipod|mobile/i.test(navigator.userAgent||'');
 const compact=window.matchMedia('(max-width: 820px) and (pointer: coarse)').matches;
 return native||mobileUa||compact;
}

function formatClock(value){
 return value.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function relativeTime(value,now=Date.now()){
 const stamp=value?new Date(value).getTime():0;
 if(!stamp)return 'jamais';
 const seconds=Math.max(0,Math.round((now-stamp)/1000));
 if(seconds<8)return 'à l’instant';
 if(seconds<60)return 'il y a '+seconds+' s';
 const minutes=Math.round(seconds/60);
 if(minutes<60)return 'il y a '+minutes+' min';
 const hours=Math.round(minutes/60);
 if(hours<24)return 'il y a '+hours+' h';
 return new Date(stamp).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
}

function ciText(value){
 if(!value)return 'Inconnu';
 if(value==='running')return 'En cours';
 if(value==='success')return 'Vert';
 if(value==='failure'||value==='timed_out')return 'Échec';
 if(value==='cancelled')return 'Annulé';
 return value;
}

function ciState(value){
 if(value==='success')return 'good';
 if(value==='running')return 'warn';
 if(['failure','timed_out','cancelled'].includes(value))return 'bad';
 return 'idle';
}

function StatusCard({Icon,label,value,detail,state='idle'}){
 return <article className={'control-status-card is-'+state}>
  <div className="control-status-icon"><Icon size={18}/></div>
  <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
 </article>;
}

async function timedFetch(url,options={},timeout=8000){
 const controller=new AbortController();
 const timer=window.setTimeout(()=>controller.abort(),timeout);
 try{return await fetch(url,{...options,signal:controller.signal});}
 finally{window.clearTimeout(timer);}
}

async function safeTimedFetch(url,options={},timeout=8000){
 try{return await timedFetch(url,options,timeout);}catch{return null;}
}

export default function ControlCenterPage({goTo}){
 const[phone,setPhone]=useState(isPhoneClient);
 const[data,setData]=useState(null);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState('');
 const[pairing,setPairing]=useState(null);
 const[syncing,setSyncing]=useState(false);
 const[lastSync,setLastSync]=useState(0);
 const[latency,setLatency]=useState(null);
 const[clock,setClock]=useState(()=>new Date());
 const[focus,setFocus]=useState(false);
 const[privacyMode,setPrivacyMode]=useState(()=>{
  try{return sessionStorage.getItem('3b-command-privacy')==='1';}catch{return false;}
 });
 const[compactMode,setCompactMode]=useState(()=>{
  try{return localStorage.getItem('3b-command-compact')==='1';}catch{return false;}
 });
 const[reducedLocal,setReducedLocal]=useState(()=>{
  try{return localStorage.getItem('3b-command-reduced')==='1';}catch{return false;}
 });
 const[commandText,setCommandText]=useState('');
 const[commandFeedback,setCommandFeedback]=useState('');
 const[pulse,setPulse]=useState(()=>({
  network:typeof navigator==='undefined'?true:navigator.onLine,
  connection:'',
  production:null,
  github:null,
  ci:null,
  commit:null,
  commitSha:'',
  workflow:'',
  openPrCount:null,
  deploymentEnvironment:'',
  deploymentStatus:'',
  deploymentAt:'',
  deploymentSha:'',
  checkedAt:0
 }));

 useEffect(()=>{
  const media=window.matchMedia('(max-width: 820px)');
  const coarse=window.matchMedia('(pointer: coarse)');
  const apply=()=>setPhone(isPhoneClient());
  media.addEventListener?.('change',apply);
  coarse.addEventListener?.('change',apply);
  window.addEventListener('orientationchange',apply,{passive:true});
  apply();
  return()=>{
   media.removeEventListener?.('change',apply);
   coarse.removeEventListener?.('change',apply);
   window.removeEventListener('orientationchange',apply);
  };
 },[]);

 useEffect(()=>{
  const timer=window.setInterval(()=>setClock(new Date()),1000);
  return()=>window.clearInterval(timer);
 },[]);

 useEffect(()=>{
  try{sessionStorage.setItem('3b-command-privacy',privacyMode?'1':'0');}catch{}
 },[privacyMode]);

 useEffect(()=>{
  try{localStorage.setItem('3b-command-compact',compactMode?'1':'0');}catch{}
 },[compactMode]);

 useEffect(()=>{
  try{localStorage.setItem('3b-command-reduced',reducedLocal?'1':'0');}catch{}
 },[reducedLocal]);

 const refresh=useCallback(async()=>{
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
   setError('Réseau indisponible · dernières données valides conservées.');
   return false;
  }
  const started=performance.now();
  setSyncing(true);
  try{
   const next=await controlCenterRequest('status');
   setData(next);
   setError('');
   setLatency(Math.max(1,Math.round(performance.now()-started)));
   setLastSync(Date.now());
   return true;
  }catch(e){
   setError(e.message||'Centre de commande indisponible.');
   return false;
  }finally{
   setSyncing(false);
  }
 },[]);

 useEffect(()=>{
  let stopped=false;
  let timer=0;
  let failures=0;
  let running=false;
  const tick=async()=>{
   if(stopped||running)return;
   running=true;
   const ok=await refresh();
   running=false;
   failures=ok?0:Math.min(5,failures+1);
   if(stopped)return;
   const visible=document.visibilityState==='visible';
   const delay=visible?(ok?4000:Math.min(60000,4000*(2**failures))):15000;
   timer=window.setTimeout(tick,delay);
  };
  const wake=()=>{
   failures=0;
   window.clearTimeout(timer);
   if(!stopped&&!running)tick();
  };
  tick();
  document.addEventListener('visibilitychange',wake);
  window.addEventListener('online',wake);
  return()=>{
   stopped=true;
   window.clearTimeout(timer);
   document.removeEventListener('visibilitychange',wake);
   window.removeEventListener('online',wake);
  };
 },[refresh]);

 useEffect(()=>{
  let active=true;
  let lastGithub=0;

  const update=async(forceGithub=false)=>{
   const network=navigator.onLine;
   const connection=navigator.connection?.effectiveType||'';
   setPulse(current=>({...current,network,connection}));
   if(!network){
    setPulse(current=>({...current,network:false}));
    return;
   }

   try{
    const response=await timedFetch('/robots.txt?command-os='+Date.now(),{cache:'no-store'},6500);
    if(active)setPulse(current=>({...current,production:response.ok}));
   }catch{
    if(active)setPulse(current=>({...current,production:false}));
   }

   if(!forceGithub&&Date.now()-lastGithub<600000)return;
   lastGithub=Date.now();
   try{
    const headers={Accept:'application/vnd.github+json'};
    const [commitResponse,runsResponse,prsResponse,deploymentsResponse]=await Promise.all([
     safeTimedFetch('https://api.github.com/repos/3bblackblancbeurr/3b-international-/commits/main',{headers,cache:'no-store'},9000),
     safeTimedFetch('https://api.github.com/repos/3bblackblancbeurr/3b-international-/actions/runs?branch=main&per_page=3',{headers,cache:'no-store'},9000),
     safeTimedFetch('https://api.github.com/search/issues?q=repo%3A3bblackblancbeurr%2F3b-international-%20is%3Apr%20is%3Aopen&per_page=1',{headers,cache:'no-store'},9000),
     safeTimedFetch('https://api.github.com/repos/3bblackblancbeurr/3b-international-/deployments?per_page=3',{headers,cache:'no-store'},9000)
    ]);
    if(!active)return;
    const next={github:Boolean(commitResponse?.ok&&runsResponse?.ok),checkedAt:Date.now()};
    if(commitResponse?.ok){
     const commit=await commitResponse.json();
     next.commit=String(commit?.commit?.message||'').split('\n')[0]||'Commit main';
     next.commitSha=String(commit?.sha||'').slice(0,7);
    }
    if(runsResponse?.ok){
     const payload=await runsResponse.json();
     const runs=Array.isArray(payload?.workflow_runs)?payload.workflow_runs:[];
     const running=runs.find(run=>!run.conclusion&&['queued','in_progress','waiting','requested','pending'].includes(run.status));
     const latest=running||runs[0];
     next.ci=running?'running':latest?.conclusion||latest?.status||null;
     next.workflow=latest?.name||'';
    }
    if(prsResponse?.ok){
     const payload=await prsResponse.json();
     next.openPrCount=Number.isFinite(Number(payload?.total_count))?Number(payload.total_count):null;
    }
    if(deploymentsResponse?.ok){
     const deployments=await deploymentsResponse.json();
     const latestDeployment=Array.isArray(deployments)?deployments[0]:null;
     if(latestDeployment){
      next.deploymentEnvironment=String(latestDeployment.environment||'');
      next.deploymentAt=latestDeployment.updated_at||latestDeployment.created_at||'';
      next.deploymentSha=String(latestDeployment.sha||'').slice(0,7);
      if(latestDeployment.statuses_url){
       try{
        const statusResponse=await safeTimedFetch(latestDeployment.statuses_url,{headers,cache:'no-store'},7000);
        if(statusResponse?.ok){
         const statuses=await statusResponse.json();
         next.deploymentStatus=Array.isArray(statuses)?String(statuses[0]?.state||''):'';
        }
       }catch{}
      }
     }
    }
    setPulse(current=>({...current,...next}));
   }catch{
    if(active)setPulse(current=>({...current,github:false,checkedAt:Date.now()}));
   }
  };

  const online=()=>update(true);
  const fast=window.setInterval(()=>update(false),30000);
  const slow=window.setInterval(()=>update(true),600000);
  window.addEventListener('online',online);
  window.addEventListener('offline',online);
  update(true);

  return()=>{
   active=false;
   window.clearInterval(fast);
   window.clearInterval(slow);
   window.removeEventListener('online',online);
   window.removeEventListener('offline',online);
  };
 },[]);

 const devices=useMemo(()=>data?.devices||[],[data]);
 const commands=useMemo(()=>data?.commands||[],[data]);
 const events=useMemo(()=>data?.events||[],[data]);
 const activeDevices=useMemo(()=>devices.filter(device=>!device.revoked_at),[devices]);
 const onlineDevices=useMemo(()=>activeDevices.filter(device=>{
  const last=device.last_seen_at?new Date(device.last_seen_at).getTime():0;
  return Date.now()-last<16000;
 }),[activeDevices,lastSync]);
 const primaryDevice=onlineDevices[0]||activeDevices[0]||null;
 const primaryOnline=Boolean(primaryDevice&&onlineDevices.some(device=>device.id===primaryDevice.id));
 const latestSystem=commands.find(command=>command.command_type==='system_status'&&command.status==='succeeded'&&command.result);
 const runtime=primaryDevice?.capabilities?._runtime||latestSystem?.result||null;
 const memoryUsed=runtime?.memory_total_gb
  ?Math.max(0,Math.min(100,Math.round((1-Number(runtime.memory_free_gb||0)/Number(runtime.memory_total_gb))*100)))
  :null;

 const recentFailures=commands.filter(command=>command.status==='failed'&&Date.now()-new Date(command.completed_at||command.issued_at).getTime()<3600000);
 const alerts=useMemo(()=>{
  const rows=new Map();
  const add=(key,level,title,score)=>{
   const current=rows.get(key);
   if(!current||score>current.score)rows.set(key,{key,level,title,score});
  };
  if(error&&!/^Réseau indisponible/i.test(error))add('control-api','bad',error,100);
  if(!pulse.network)add('device-network','bad','Cet appareil est hors ligne.',98);
  if(pulse.production===false)add('production','bad','La production 3B ne répond pas au contrôle.',95);
  if(['failure','timed_out','cancelled'].includes(pulse.ci))add('github-ci','bad','Le dernier workflow GitHub demande une vérification.',92);
  if(primaryDevice&&!primaryOnline)add('pc-offline','warn','Le PC appairé est actuellement hors ligne.',82);
  if(recentFailures.length)add('commands-failed','warn',recentFailures.length+' commande'+(recentFailures.length>1?'s':'')+' en échec sur la dernière heure.',78);
  if(primaryOnline&&primaryDevice?.capabilities?.autostart!==true)add('pc-autostart','warn','Démarrage automatique du 3B Control Agent à activer sur le PC.',65);
  if(data&&lastSync&&clock.getTime()-lastSync>60000)add('stale-control','warn','Les données du Control Center n’ont pas été actualisées depuis plus d’une minute.',60);
  return[...rows.values()].sort((a,b)=>b.score-a.score);
 },[error,pulse.network,pulse.production,pulse.ci,primaryDevice,primaryOnline,recentFailures.length,data,lastSync,clock]);

 const health=useMemo(()=>{
  const ciHealthy=pulse.ci?(!['failure','timed_out','cancelled'].includes(pulse.ci)):null;
  const values=[pulse.network,pulse.production,data?true:null,pulse.github,ciHealthy].filter(value=>typeof value==='boolean');
  return{healthy:values.filter(Boolean).length,known:values.length};
 },[pulse.network,pulse.production,pulse.github,pulse.ci,data]);

 const createPairing=async()=>{
  setBusy('pair');setError('');setCommandFeedback('');
  try{
   const next=await controlCenterRequest('create-pairing');
   setPairing(next);
   navigator.vibrate?.(18);
   await refresh();
  }catch(e){setError(e.message);}
  finally{setBusy('');}
 };

 const issue=async(deviceId,command)=>{
  const target=deviceId||primaryDevice?.id;
  if(!target||!onlineDevices.some(device=>device.id===target)){
   setCommandFeedback('PC hors ligne : la commande n’a pas été envoyée.');
   return;
  }
  setBusy(command);setError('');setCommandFeedback('');
  try{
   await controlCenterRequest('issue',{device_id:target,command_type:command});
   navigator.vibrate?.(12);
   setCommandFeedback((COMMAND_LABELS[command]||command)+' · commande envoyée');
   await refresh();
  }catch(e){setError(e.message);}
  finally{setBusy('');}
 };

 const revoke=async deviceId=>{
  if(!window.confirm('Révoquer cet appareil ? Il ne recevra plus aucune commande 3B.'))return;
  setBusy('revoke'+deviceId);
  try{
   await controlCenterRequest('revoke-device',{device_id:deviceId});
   setPairing(null);
   navigator.vibrate?.([20,30,20]);
   await refresh();
  }catch(e){setError(e.message);}
  finally{setBusy('');}
 };

 const cancelCommand=async commandId=>{
  setBusy('cancel'+commandId);setError('');
  try{
   await controlCenterRequest('cancel',{command_id:commandId});
   navigator.vibrate?.(8);
   setCommandFeedback('Commande en attente annulée.');
   await refresh();
  }catch(e){setError(e.message);}
  finally{setBusy('');}
 };

 const submitNaturalCommand=async event=>{
  event.preventDefault();
  const value=commandText.trim();
  if(!value)return;
  if(/\b(actualise|actualiser|rafraîchis|rafraichis|refresh)\b/i.test(value)){
   setCommandText('');
   setCommandFeedback('Synchronisation demandée.');
   await refresh();
   return;
  }
  const navigation=NAVIGATION_COMMANDS.find(item=>item.re.test(value));
  if(navigation){
   setCommandText('');
   jumpTo(navigation.target);
   setCommandFeedback(navigation.feedback);
   return;
  }
  const match=NATURAL_COMMANDS.find(item=>item.re.test(value));
  if(!match){
   setCommandFeedback('Commande non reconnue. Essaie « radar », « nexus », « état du PC » ou « ouvre GitHub ».');
   return;
  }
  setCommandText('');
  await issue(primaryDevice?.id,match.id);
 };

 const jumpTo=id=>{
  document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  navigator.vibrate?.(6);
 };

 if(error&&error.includes('réservé au propriétaire'))return <section className="control-page control-device-gate">
  <div className="control-device-gate-card"><ShieldCheck/><h1>Centre de commande privé</h1><p>Cette zone est réservée au propriétaire 3B. Pas de terminal distant libre : seules les actions 3B autorisées peuvent être envoyées.</p><button onClick={()=>goTo('home')}>Retour</button></div>
 </section>;

 const heroStatus=syncing&&!data?'Synchronisation du système…':alerts.length?alerts[0].title:'Tout est opérationnel.';
 const productionState=pulse.production===true?'good':pulse.production===false?'bad':'idle';
 const apiState=data&&!error?'good':error?'bad':'warn';
 const pcState=primaryOnline?'good':primaryDevice?'warn':'idle';

 return <section className={'control-page'+(phone?' is-phone':' is-desktop')+(focus?' is-focus':'')+(compactMode?' is-compact':'')+(reducedLocal?' is-local-reduced':'')} aria-label="3B Command OS">
  <div className="control-ambient" aria-hidden="true"><i/><i/><i/></div>

  <header className="control-topbar">
   <button className="control-icon-button" onClick={()=>goTo('home')} aria-label="Retour à 3B"><ArrowLeft size={19}/></button>
   <div className="control-brand"><span>3B</span><div><strong>COMMAND OS</strong><small>{phone?'OWNER · MOBILE FIRST':'OWNER · DESKTOP'}</small></div></div>
   <div className="control-top-status">
    <span className={pulse.network?'control-live-dot':'control-live-dot offline'}/>
    <div><strong>{formatClock(clock)}</strong><small>{pulse.network?'EN LIGNE':'HORS LIGNE'}</small></div>
   </div>
  </header>

  <main className="control-os-main">
   <section className="control-stage" id="cc-now">
    <div className="control-stage-copy">
     <p className="control-kicker"><Sparkles size={13}/> POSTE DE COMMANDE PRIVÉ</p>
     <h1>TON UNIVERS.<br/><span>SOUS CONTRÔLE.</span></h1>
     <p className={'control-hero-status'+(alerts.length?' has-alert':'')}><span/>{heroStatus}</p>
     <div className="control-stage-buttons">
      <button onClick={refresh} disabled={syncing}><RefreshCw className={syncing?'is-spinning':''} size={17}/>{syncing?'Synchronisation…':'Actualiser'}</button>
      <button className={focus?'is-active':''} onClick={()=>setFocus(value=>!value)}><Zap size={17}/>{focus?'Quitter Focus':'Mode Focus'}</button>
     </div>
    </div>

    <div className="control-core-shell" aria-label={health.known?health.healthy+' signaux sur '+health.known+' au vert':'État en cours de vérification'}>
     <div className="control-orbit orbit-a"/><div className="control-orbit orbit-b"/><div className="control-orbit orbit-c"/>
     <div className="control-core">
      <span>3B</span>
      <strong>{health.known?health.healthy+'/'+health.known:'—'}</strong>
      <small>SIGNAUX</small>
     </div>
    </div>

    <div className="control-stage-foot">
     <span>Synchro {lastSync?relativeTime(lastSync):'en cours'}</span>
     <span>{latency?latency+' ms':'—'}</span>
    </div>
   </section>

   {alerts.length>0&&<section className="control-alert-strip" aria-live="polite">
    <BellRing size={17}/><div><strong>{alerts.length} point{alerts.length>1?'s':''} à surveiller</strong><span>{alerts[0].title}</span></div><ChevronRight size={17}/>
   </section>}

   {focus&&<section className="control-focus-panel" aria-label="Mode Focus">
    <div><span>OBJECTIF ACTUEL</span><strong>{alerts[0]?.title||'Aucune urgence détectée.'}</strong></div>
    <div><span>PROCHAINE ACTION</span><strong>{primaryDevice&&!primaryOnline?'Rétablir la liaison avec le PC':alerts.length?'Vérifier le point prioritaire':'Aucune action urgente'}</strong></div>
    <div><span>TEMPS DISPONIBLE</span><strong>Agenda non connecté</strong></div>
   </section>}

   <section className="control-status-grid" aria-label="État réel des services">
    <StatusCard Icon={Cloud} label="PRODUCTION" value={pulse.production===true?'En ligne':pulse.production===false?'Indisponible':'Contrôle…'} detail="3b-international.vercel.app" state={productionState}/>
    <StatusCard Icon={Server} label="SUPABASE" value={data&&!error?'Connecté':error?'Erreur':'Synchro…'} detail={latency?latency+' ms API':'Control Center'} state={apiState}/>
    <StatusCard Icon={GitBranch} label="GITHUB ACTIONS" value={ciText(pulse.ci)} detail={pulse.workflow||pulse.commit||'main'} state={ciState(pulse.ci)}/>
    <StatusCard Icon={Cpu} label="PC AGENT" value={primaryOnline?'En ligne':primaryDevice?'Hors ligne':'Non appairé'} detail={primaryDevice?((privacyMode?'Appareil masqué':primaryDevice.name)+(primaryDevice.capabilities?.autostart===true?' · AUTO':' · MANUEL')):'Aucun appareil'} state={pcState}/>
   </section>

   <ModuleBoundary label="Centre de notifications momentanément indisponible"><AlertCenterPanel alerts={alerts} events={events}/></ModuleBoundary>

   <ModuleBoundary label="Nexus 3B momentanément indisponible">
    <CommandNexus
     pulse={pulse}
     dataAvailable={Boolean(data)}
     error={error}
     primaryDevice={primaryDevice}
     primaryOnline={primaryOnline}
     alerts={alerts}
     lastSync={lastSync}
     privacyMode={privacyMode}
     onPrivacyChange={value=>{setPrivacyMode(value);navigator.vibrate?.(7);}}
     onJump={jumpTo}
    />
   </ModuleBoundary>

   <ModuleBoundary label="Radar 3B momentanément indisponible"><DirectorTraffic /></ModuleBoundary>

   <ModuleBoundary label="Dev Center momentanément indisponible"><DevCenterPanel pulse={pulse}/></ModuleBoundary>

   <ModuleBoundary label="App Health momentanément indisponible"><AppHealthPanel pulse={pulse} latency={latency} lastSync={lastSync} dataAvailable={Boolean(data)} error={error}/></ModuleBoundary>

   <ModuleBoundary label="Security Center momentanément indisponible">
    <SecurityCenterPanel dataAvailable={Boolean(data)} error={error} devices={devices} commands={commands} events={events} allowedCommands={data?.allowed_commands}/>
   </ModuleBoundary>

   <ModuleBoundary label="Projects Center momentanément indisponible"><ProjectsCenterPanel pulse={pulse}/></ModuleBoundary>

   <ModuleBoundary label="Réglages Command OS momentanément indisponibles">
    <CommandSettingsPanel
     privacyMode={privacyMode}
     onPrivacyChange={value=>{setPrivacyMode(value);navigator.vibrate?.(7);}}
     focus={focus}
     onFocusChange={value=>{setFocus(value);navigator.vibrate?.(7);}}
     compact={compactMode}
     onCompactChange={value=>{setCompactMode(value);navigator.vibrate?.(7);}}
     reduced={reducedLocal}
     onReducedChange={value=>{setReducedLocal(value);navigator.vibrate?.(7);}}
    />
   </ModuleBoundary>

   <section className="control-section" id="cc-actions">
    <header className="control-section-heading"><div><p className="control-kicker">ACTION IMMÉDIATE</p><h2>Pilote ton PC</h2></div><TerminalSquare size={20}/></header>

    <form className="control-command-bar" onSubmit={submitNaturalCommand}>
     <Zap size={18}/>
     <input value={commandText} onChange={event=>setCommandText(event.target.value)} placeholder="Rechercher ou commander : radar, GitHub, agenda…" aria-label="Recherche et Command Palette 3B"/>
     <button type="submit" disabled={!!busy}>GO</button>
    </form>
    {commandFeedback&&<p className="control-command-feedback" aria-live="polite">{commandFeedback}</p>}

    <div className="control-actions">
     {ACTIONS.map(action=><button key={action.id} disabled={!primaryOnline||!!busy} onClick={()=>issue(primaryDevice?.id,action.id)}>
      <span><TerminalSquare size={17}/></span>
      <strong>{action.label}</strong>
      <small>{action.detail}</small>
      <ChevronRight size={16}/>
     </button>)}
    </div>

    {runtime&&<div className="control-runtime">
     <div><span>PC</span><strong>{privacyMode?'••••••':runtime.hostname||primaryDevice?.name||'3B'}</strong><small>{runtime.platform||primaryDevice?.platform||'système'}</small></div>
     <div><span>MÉMOIRE</span><strong>{memoryUsed===null?'—':memoryUsed+'%'}</strong><small>{runtime.memory_free_gb!==undefined?runtime.memory_free_gb+' Go libres':'télémétrie live'}</small></div>
     <div><span>UPTIME</span><strong>{runtime.uptime_seconds?Math.floor(runtime.uptime_seconds/3600)+' h':'—'}</strong><small>agent {runtime.agent_version||primaryDevice?.agent_version||'—'}</small></div>
    </div>}
   </section>

   <section className="control-section control-hide-in-focus" id="cc-live">
    <header className="control-section-heading"><div><p className="control-kicker">TEMPS RÉEL</p><h2>Flux vivant 3B</h2></div><Activity size={20}/></header>
    <div className="control-feed">
     {events.length?events.slice(0,10).map(event=><div className="control-feed-row" key={event.id}>
      <span className={event.event_type==='command.failed'?'is-bad':event.event_type==='command.succeeded'?'is-good':''}><Activity size={14}/></span>
      <div><strong>{EVENT_LABELS[event.event_type]||event.event_type}</strong><small>{event.detail?.command_type?COMMAND_LABELS[event.detail.command_type]||event.detail.command_type:'Système 3B'}</small></div>
      <time>{relativeTime(event.created_at)}</time>
     </div>):commands.slice(0,8).map(command=><div className="control-feed-row" key={command.id}>
      <span className={command.status==='failed'?'is-bad':command.status==='succeeded'?'is-good':''}><Activity size={14}/></span>
      <div><strong>{COMMAND_LABELS[command.command_type]||command.command_type}</strong><small>{statusLabel(command.status)}</small></div>
      <time>{relativeTime(command.issued_at)}</time>
     </div>)}
     {!events.length&&!commands.length&&<div className="control-empty-inline"><Activity/><span>Le flux apparaîtra ici dès la première activité.</span></div>}
    </div>
   </section>

   <section className="control-section control-hide-in-focus" id="cc-devices">
    <header className="control-section-heading"><div><p className="control-kicker">LIAISON SÉCURISÉE</p><h2>Appareils</h2></div><button className="control-mini-action" onClick={createPairing} disabled={!!busy}><KeyRound size={15}/>{busy==='pair'?'Création…':'Appairer'}</button></header>

    {pairing&&<div className="control-pairing">
     <span>CODE TEMPORAIRE</span><strong>{privacyMode?'••••••••••':pairing.code}</strong>
     <small>Sur le PC : lance <b>scripts/pair-3b-control-agent.cmd</b>, saisis le code, puis démarre <b>start-3b-control-agent.cmd</b>.</small>
    </div>}

    <div className="control-device-list">
     {activeDevices.length===0?<div className="control-empty-inline"><Laptop/><span>Aucun PC appairé. Crée un code depuis cet appareil.</span></div>:activeDevices.map(device=>{
      const online=onlineDevices.some(item=>item.id===device.id);
      return <article className="control-device-card" key={device.id}>
       <div className={online?'control-device-orb online':'control-device-orb'}><Laptop size={18}/></div>
       <div><strong>{privacyMode?'Appareil masqué':device.name}</strong><span>{device.platform} · agent {device.agent_version} · {device.capabilities?.autostart===true?'démarrage auto':'démarrage manuel'}</span><small>{online?'Actif '+relativeTime(device.last_seen_at):'Dernière liaison '+relativeTime(device.last_seen_at)}</small></div>
       <button onClick={()=>revoke(device.id)} disabled={!!busy} aria-label={privacyMode?'Révoquer appareil':'Révoquer '+device.name}><Unplug size={16}/></button>
      </article>;
     })}
    </div>
   </section>

   <section className="control-section control-hide-in-focus" id="cc-log">
    <header className="control-section-heading"><div><p className="control-kicker">JOURNAL</p><h2>Dernières commandes</h2></div><CheckCircle2 size={20}/></header>
    <div className="control-history">
     {commands.length===0?<div className="control-empty-inline"><TerminalSquare/><span>Aucune commande envoyée.</span></div>:commands.slice(0,15).map(command=><div key={command.id}>
      <span className="control-history-icon"><TerminalSquare size={15}/></span>
      <div><strong>{COMMAND_LABELS[command.command_type]||command.command_type}</strong><small>{new Date(command.issued_at).toLocaleString('fr-FR')}</small>{command.error_message&&<em>{command.error_message}</em>}</div>
      {command.status==='pending'?<button type="button" className="control-cancel-command" disabled={!!busy} onClick={()=>cancelCommand(command.id)}>Annuler</button>:<b data-status={command.status}>{statusLabel(command.status)}</b>}
     </div>)}
    </div>
   </section>

   {pulse.commit&&<section className="control-release control-hide-in-focus">
    <Rocket size={18}/><div><span>MAIN · {pulse.commitSha||'—'}</span><strong>{pulse.commit}</strong><small>{pulse.checkedAt?'Vérifié '+relativeTime(pulse.checkedAt):'GitHub'}</small></div>
   </section>}

   <section className="control-security-note control-hide-in-focus">
    <ShieldCheck size={17}/><p><strong>Propriétaire seulement.</strong> Autorisation serveur par compte propriétaire, commandes fixes, journalisation, expiration rapide et révocation des appareils.</p>
   </section>
  </main>

  <nav className="control-dock" aria-label="Navigation 3B Command OS">
   <button onClick={()=>jumpTo('cc-now')}><Gauge size={18}/><span>État</span></button>
   <button onClick={()=>jumpTo('cc-traffic')}><Activity size={18}/><span>Trafic</span></button>
   <button className="is-main" onClick={()=>jumpTo('cc-actions')}><Zap size={20}/><span>Action</span></button>
   <button onClick={()=>jumpTo('cc-devices')} disabled={focus}><Laptop size={18}/><span>PC</span></button>
   <button onClick={()=>jumpTo('cc-log')} disabled={focus}>{pulse.network?<Wifi size={18}/>:<WifiOff size={18}/>}<span>Journal</span></button>
  </nav>
 </section>;
}
