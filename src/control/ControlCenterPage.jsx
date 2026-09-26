import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
 Activity,ArrowLeft,BellRing,CheckCircle2,ChevronRight,Cloud,Cpu,GitBranch,Gauge,
 KeyRound,Laptop,RefreshCw,Rocket,Server,ShieldCheck,Smartphone,Sparkles,
 TerminalSquare,Unplug,Wifi,WifiOff,Zap
} from 'lucide-react';
import {controlCenterRequest} from './client.js';
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

 const refresh=useCallback(async()=>{
  if(!phone)return;
  const started=performance.now();
  setSyncing(true);
  try{
   const next=await controlCenterRequest('status');
   setData(next);
   setError('');
   setLatency(Math.max(1,Math.round(performance.now()-started)));
   setLastSync(Date.now());
  }catch(e){
   setError(e.message||'Centre de commande indisponible.');
  }finally{
   setSyncing(false);
  }
 },[phone]);

 useEffect(()=>{
  if(!phone)return;
  let stopped=false;
  let timer=0;
  const tick=async()=>{
   await refresh();
   if(!stopped)timer=window.setTimeout(tick,document.visibilityState==='visible'?4000:15000);
  };
  const wake=()=>{
   window.clearTimeout(timer);
   if(!stopped)tick();
  };
  tick();
  document.addEventListener('visibilitychange',wake);
  return()=>{
   stopped=true;
   window.clearTimeout(timer);
   document.removeEventListener('visibilitychange',wake);
  };
 },[phone,refresh]);

 useEffect(()=>{
  if(!phone)return;
  let active=true;
  let lastGithub=0;

  const update=async(forceGithub=false)=>{
   const network=navigator.onLine;
   const connection=navigator.connection?.effectiveType||'';
   setPulse(current=>({...current,network,connection}));
   if(!network){
    setPulse(current=>({...current,network:false,production:false}));
    return;
   }

   try{
    const response=await timedFetch('/robots.txt?command-os='+Date.now(),{cache:'no-store'},6500);
    if(active)setPulse(current=>({...current,production:response.ok}));
   }catch{
    if(active)setPulse(current=>({...current,production:false}));
   }

   if(!forceGithub&&Date.now()-lastGithub<240000)return;
   lastGithub=Date.now();
   try{
    const headers={Accept:'application/vnd.github+json'};
    const [commitResponse,runsResponse]=await Promise.all([
     timedFetch('https://api.github.com/repos/3bblackblancbeurr/3b-international-/commits/main',{headers,cache:'no-store'},9000),
     timedFetch('https://api.github.com/repos/3bblackblancbeurr/3b-international-/actions/runs?branch=main&per_page=3',{headers,cache:'no-store'},9000)
    ]);
    if(!active)return;
    const next={github:commitResponse.ok&&runsResponse.ok,checkedAt:Date.now()};
    if(commitResponse.ok){
     const commit=await commitResponse.json();
     next.commit=String(commit?.commit?.message||'').split('\n')[0]||'Commit main';
     next.commitSha=String(commit?.sha||'').slice(0,7);
    }
    if(runsResponse.ok){
     const payload=await runsResponse.json();
     const runs=Array.isArray(payload?.workflow_runs)?payload.workflow_runs:[];
     const running=runs.find(run=>!run.conclusion&&['queued','in_progress','waiting','requested','pending'].includes(run.status));
     const latest=running||runs[0];
     next.ci=running?'running':latest?.conclusion||latest?.status||null;
     next.workflow=latest?.name||'';
    }
    setPulse(current=>({...current,...next}));
   }catch{
    if(active)setPulse(current=>({...current,github:false,checkedAt:Date.now()}));
   }
  };

  const online=()=>update(true);
  const fast=window.setInterval(()=>update(false),30000);
  const slow=window.setInterval(()=>update(true),300000);
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
 },[phone]);

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
  const rows=[];
  if(error)rows.push({level:'bad',title:error});
  if(!pulse.network)rows.push({level:'bad',title:'Le téléphone est hors ligne.'});
  if(pulse.production===false)rows.push({level:'bad',title:'La production 3B ne répond pas au contrôle.'});
  if(['failure','timed_out','cancelled'].includes(pulse.ci))rows.push({level:'bad',title:'Le dernier workflow GitHub demande une vérification.'});
  if(primaryDevice&&!primaryOnline)rows.push({level:'warn',title:'Le PC appairé est actuellement hors ligne.'});
  if(recentFailures.length)rows.push({level:'warn',title:recentFailures.length+' commande'+(recentFailures.length>1?'s':'')+' en échec sur la dernière heure.'});
  return rows;
 },[error,pulse.network,pulse.production,pulse.ci,primaryDevice,primaryOnline,recentFailures.length]);

 const score=useMemo(()=>{
  const ciHealthy=pulse.ci?(!['failure','timed_out','cancelled'].includes(pulse.ci)):null;
  const values=[pulse.network,pulse.production,data?true:null,pulse.github,ciHealthy].filter(value=>typeof value==='boolean');
  if(!values.length)return 0;
  return Math.round(values.filter(Boolean).length/values.length*100);
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
  const match=NATURAL_COMMANDS.find(item=>item.re.test(value));
  if(!match){
   setCommandFeedback('Commande non reconnue. Essaie « état du PC », « ouvre GitHub » ou « vérifie Unreal ».');
   return;
  }
  setCommandText('');
  await issue(primaryDevice?.id,match.id);
 };

 const jumpTo=id=>{
  document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  navigator.vibrate?.(6);
 };

 if(!phone)return <section className="control-page control-device-gate">
  <div className="control-device-gate-card">
   <div className="control-gate-mark">3B</div>
   <Smartphone/>
   <p className="control-kicker">3B COMMAND OS</p>
   <h1>Version téléphone uniquement</h1>
   <p>Le cockpit propriétaire premium est volontairement réservé à ton téléphone. Le PC reste l’agent exécutant, pas l’interface de pilotage.</p>
   <button onClick={()=>goTo('home')}><ArrowLeft size={17}/> Retour à 3B</button>
  </div>
 </section>;

 if(error&&error.includes('réservé au propriétaire'))return <section className="control-page control-device-gate">
  <div className="control-device-gate-card"><ShieldCheck/><h1>Centre privé</h1><p>Cette zone est réservée au propriétaire 3B.</p><button onClick={()=>goTo('home')}>Retour</button></div>
 </section>;

 const heroStatus=syncing&&!data?'Synchronisation du système…':alerts.length?alerts[0].title:'Tout est sous contrôle';
 const productionState=pulse.production===true?'good':pulse.production===false?'bad':'idle';
 const apiState=data&&!error?'good':error?'bad':'warn';
 const pcState=primaryOnline?'good':primaryDevice?'warn':'idle';

 return <section className={'control-page'+(focus?' is-focus':'')} aria-label="3B Command OS">
  <div className="control-ambient" aria-hidden="true"><i/><i/><i/></div>

  <header className="control-topbar">
   <button className="control-icon-button" onClick={()=>goTo('home')} aria-label="Retour à 3B"><ArrowLeft size={19}/></button>
   <div className="control-brand"><span>3B</span><div><strong>COMMAND OS</strong><small>OWNER · MOBILE</small></div></div>
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

    <div className="control-core-shell" aria-label={'État global '+score+' pour cent'}>
     <div className="control-orbit orbit-a"/><div className="control-orbit orbit-b"/><div className="control-orbit orbit-c"/>
     <div className="control-core">
      <span>3B</span>
      <strong>{score}%</strong>
      <small>SYSTÈME</small>
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

   <section className="control-status-grid" aria-label="État réel des services">
    <StatusCard Icon={Cloud} label="PRODUCTION" value={pulse.production===true?'En ligne':pulse.production===false?'Indisponible':'Contrôle…'} detail="3b-international.vercel.app" state={productionState}/>
    <StatusCard Icon={Server} label="SUPABASE" value={data&&!error?'Connecté':error?'Erreur':'Synchro…'} detail={latency?latency+' ms API':'Control Center'} state={apiState}/>
    <StatusCard Icon={GitBranch} label="GITHUB ACTIONS" value={ciText(pulse.ci)} detail={pulse.workflow||pulse.commit||'main'} state={ciState(pulse.ci)}/>
    <StatusCard Icon={Cpu} label="PC AGENT" value={primaryOnline?'En ligne':primaryDevice?'Hors ligne':'Non appairé'} detail={primaryDevice?primaryDevice.name:'Aucun appareil'} state={pcState}/>
   </section>

   <section className="control-section" id="cc-actions">
    <header className="control-section-heading"><div><p className="control-kicker">ACTION IMMÉDIATE</p><h2>Pilote ton PC</h2></div><TerminalSquare size={20}/></header>

    <form className="control-command-bar" onSubmit={submitNaturalCommand}>
     <Zap size={18}/>
     <input value={commandText} onChange={event=>setCommandText(event.target.value)} placeholder="Ex. ouvre GitHub, état du PC…" aria-label="Commande rapide 3B"/>
     <button type="submit" disabled={!primaryOnline||!!busy}>GO</button>
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
     <div><span>PC</span><strong>{runtime.hostname||primaryDevice?.name||'3B'}</strong><small>{runtime.platform||primaryDevice?.platform||'système'}</small></div>
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
     <span>CODE TEMPORAIRE</span><strong>{pairing.code}</strong>
     <small>Sur le PC : lance <b>scripts/pair-3b-control-agent.cmd</b>, saisis le code, puis démarre <b>start-3b-control-agent.cmd</b>.</small>
    </div>}

    <div className="control-device-list">
     {activeDevices.length===0?<div className="control-empty-inline"><Laptop/><span>Aucun PC appairé. Crée un code depuis ce téléphone.</span></div>:activeDevices.map(device=>{
      const online=onlineDevices.some(item=>item.id===device.id);
      return <article className="control-device-card" key={device.id}>
       <div className={online?'control-device-orb online':'control-device-orb'}><Laptop size={18}/></div>
       <div><strong>{device.name}</strong><span>{device.platform} · agent {device.agent_version}</span><small>{online?'Actif '+relativeTime(device.last_seen_at):'Dernière liaison '+relativeTime(device.last_seen_at)}</small></div>
       <button onClick={()=>revoke(device.id)} disabled={!!busy} aria-label={'Révoquer '+device.name}><Unplug size={16}/></button>
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
      <b data-status={command.status}>{statusLabel(command.status)}</b>
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
   <button onClick={()=>jumpTo('cc-live')} disabled={focus}><Activity size={18}/><span>Live</span></button>
   <button className="is-main" onClick={()=>jumpTo('cc-actions')}><Zap size={20}/><span>Action</span></button>
   <button onClick={()=>jumpTo('cc-devices')} disabled={focus}><Laptop size={18}/><span>PC</span></button>
   <button onClick={()=>jumpTo('cc-log')} disabled={focus}>{pulse.network?<Wifi size={18}/>:<WifiOff size={18}/>}<span>Journal</span></button>
  </nav>
 </section>;
}
