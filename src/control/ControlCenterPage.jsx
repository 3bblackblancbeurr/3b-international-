import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,KeyRound,Laptop,RefreshCw,ShieldCheck,Smartphone,TerminalSquare,Unplug} from 'lucide-react';
import {controlCenterRequest} from './client.js';
import './control-center.css';

const ACTIONS=[
 ['system_status','État du PC'],
 ['open_3b','Ouvrir 3B'],
 ['open_unreal','Ouvrir Unreal'],
 ['unreal_health','Vérifier Unreal'],
 ['open_repo','Ouvrir le projet'],
 ['open_github','Ouvrir GitHub'],
 ['open_supabase','Ouvrir Supabase'],
 ['ping','Ping']
];

const statusLabel=status=>({
 pending:'En attente',claimed:'Reçue',succeeded:'Réussie',failed:'Échec',
 cancelled:'Annulée',expired:'Expirée'
}[status]||status);

export default function ControlCenterPage({goTo}){
 const[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[pairing,setPairing]=useState(null);
 const refresh=useCallback(async()=>{
  try{setData(await controlCenterRequest('status'));setError('');}
  catch(e){setError(e.message||'Centre de commande indisponible.');}
 },[]);

 useEffect(()=>{refresh();const id=setInterval(refresh,5000);return()=>clearInterval(id);},[refresh]);

 const devices=useMemo(()=>data?.devices||[],[data]);
 const commands=useMemo(()=>data?.commands||[],[data]);

 const createPairing=async()=>{
  setBusy('pair');setError('');
  try{setPairing(await controlCenterRequest('create-pairing'));await refresh();}
  catch(e){setError(e.message);}
  finally{setBusy('');}
 };

 const issue=async(deviceId,command)=>{
  setBusy(deviceId+command);setError('');
  try{await controlCenterRequest('issue',{device_id:deviceId,command_type:command});await refresh();}
  catch(e){setError(e.message);}
  finally{setBusy('');}
 };

 const revoke=async deviceId=>{
  if(!window.confirm('Révoquer cet appareil ? Il ne recevra plus aucune commande 3B.'))return;
  setBusy('revoke'+deviceId);
  try{await controlCenterRequest('revoke-device',{device_id:deviceId});setPairing(null);await refresh();}
  catch(e){setError(e.message);}
  finally{setBusy('');}
 };

 if(error&&error.includes('réservé au propriétaire'))return <section className="control-page">
  <button className="ghost-button" onClick={()=>goTo('home')}>← Retour</button>
  <div className="control-denied"><ShieldCheck/><h1>Centre de commande privé</h1><p>Cette zone est réservée au propriétaire 3B.</p></div>
 </section>;

 return <section className="control-page">
  <header className="control-header">
   <div><p className="eyebrow">3B INTERNATIONAL / OWNER</p><h1>Centre de commande</h1><p>Ton PC, Unreal et les outils 3B depuis ton téléphone ou ton ordinateur.</p></div>
   <div className="control-header-actions"><button onClick={()=>goTo('home')}>← Accueil</button><button onClick={refresh}><RefreshCw size={16}/> Actualiser</button></div>
  </header>

  {error&&<p className="control-error" role="alert">{error}</p>}

  <section className="control-security">
   <ShieldCheck/><div><strong>Mode sécurisé</strong><span>Pas de terminal distant libre. Chaque action est autorisée, journalisée, expire rapidement et l’appareil peut être révoqué.</span></div>
  </section>

  <div className="control-grid">
   <article className="control-panel">
    <div className="control-panel-title"><Laptop/><div><span>APPAREILS</span><h2>PC appairés</h2></div></div>
    <p>{devices.filter(d=>!d.revoked_at).length} / {data?.max_devices??3} appareils actifs</p>
    <button className="control-primary" onClick={createPairing} disabled={!!busy}><KeyRound size={16}/> {busy==='pair'?'Création…':'Appairer un PC'}</button>
    {pairing&&<div className="control-pairing">
     <span>CODE TEMPORAIRE</span><strong>{pairing.code}</strong>
     <small>Sur le PC, double-clique <strong>scripts/pair-3b-control-agent.cmd</strong> et saisis ce code. Ensuite lance <strong>start-3b-control-agent.cmd</strong>. Le code expire automatiquement.</small>
    </div>}
   </article>

   <article className="control-panel">
    <div className="control-panel-title"><Activity/><div><span>SYNCHRONISATION</span><h2>État global</h2></div></div>
    <dl><div><dt>Serveur</dt><dd>Connecté</dd></div><div><dt>Commandes</dt><dd>{commands.length}</dd></div><div><dt>Actualisation</dt><dd>5 s</dd></div></dl>
   </article>
  </div>

  <section className="control-devices">
   {devices.filter(d=>!d.revoked_at).length===0?<div className="control-empty"><Smartphone/><h2>Aucun PC appairé</h2><p>Crée un code puis lance l’agent 3B sur ton PC pour le relier à ton téléphone.</p></div>:
   devices.filter(d=>!d.revoked_at).map(device=>{
    const last=device.last_seen_at?new Date(device.last_seen_at).getTime():0;
    const online=Date.now()-last<20000;
    return <article className="control-device" key={device.id}>
     <header><div className={online?'control-dot online':'control-dot'}/><div><h2>{device.name}</h2><p>{device.platform} · agent {device.agent_version} · {online?'en ligne':'hors ligne'}</p></div><button className="control-revoke" onClick={()=>revoke(device.id)} disabled={!!busy}><Unplug size={15}/> Révoquer</button></header>
     <div className="control-actions">{ACTIONS.map(([id,label])=><button key={id} disabled={!online||!!busy} onClick={()=>issue(device.id,id)}><TerminalSquare size={15}/>{label}</button>)}</div>
     {device.capabilities&&<p className="control-capabilities">Capacités : {Object.entries(device.capabilities).filter(([,v])=>v).map(([k])=>k).join(' · ')||'agent de base'}</p>}
    </article>;
   })}
  </section>

  <section className="control-history">
   <h2>Dernières commandes</h2>
   {commands.length===0?<p>Aucune commande envoyée.</p>:commands.slice(0,15).map(command=><div key={command.id}>
    <span><strong>{command.command_type}</strong><small>{new Date(command.issued_at).toLocaleString('fr-FR')}</small></span>
    <b data-status={command.status}>{statusLabel(command.status)}</b>
    {command.error_message&&<small>{command.error_message}</small>}
   </div>)}
  </section>
 </section>;
}
