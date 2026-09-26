import {useEffect,useMemo,useState} from 'react';
import {QrCode,RefreshCw,ShieldCheck,X} from 'lucide-react';
import {passportVerificationRequest} from '../loyalty/client.js';
import './passport-verification.css';

const remainingSeconds=expiresAt=>Math.max(0,Math.ceil((Date.parse(expiresAt||0)-Date.now())/1000));

export default function PassportVerification({identity}){
 const[open,setOpen]=useState(false);
 const[proof,setProof]=useState(null);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 const[remaining,setRemaining]=useState(0);
 const canProve=Boolean(identity?.userId&&identity?.passportPublicId&&identity?.passportState==='active');

 const generate=async()=>{
  if(!canProve||busy)return;
  setBusy(true);setError('');
  try{
   const next=await passportVerificationRequest(identity.userId);
   setProof(next);
   setRemaining(remainingSeconds(next.expiresAt));
  }catch(e){setProof(null);setError(e?.message||'Preuve indisponible.');}
  finally{setBusy(false);}
 };

 useEffect(()=>{
  if(!open||!proof?.expiresAt)return;
  const update=()=>setRemaining(remainingSeconds(proof.expiresAt));
  update();
  const timer=setInterval(update,1000);
  return()=>clearInterval(timer);
 },[open,proof?.expiresAt]);

 useEffect(()=>{setProof(null);setError('');setOpen(false);},[identity?.passportPublicId]);

 const status=useMemo(()=>{
  if(!canProve)return identity?.passportState==='revoked'?'Passeport révoqué':identity?.passportState==='suspended'?'Passeport suspendu':'Passeport en préparation';
  return 'Preuve serveur à usage unique';
 },[canProve,identity?.passportState]);

 const show=async()=>{
  setOpen(true);
  if(!proof||remainingSeconds(proof.expiresAt)<=0)await generate();
 };

 return <>
  <button type="button" className="passport-proof-trigger" onClick={show} disabled={!canProve}>
   <QrCode size={18}/><span><strong>Prouver mon Passeport</strong><small>{status}</small></span>
  </button>
  {open&&<div className="passport-proof-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <section className="passport-proof-dialog" role="dialog" aria-modal="true" aria-labelledby="passport-proof-title">
    <button type="button" className="passport-proof-close" onClick={()=>setOpen(false)} aria-label="Fermer"><X size={19}/></button>
    <span className="passport-proof-kicker"><ShieldCheck size={15}/> PREUVE D’IDENTITÉ 3B</span>
    <h2 id="passport-proof-title">Présente ce QR.</h2>
    <p>Le QR ne contient ni ton mot de passe, ni ton UUID de compte, ni ton Wallet. Il ouvre uniquement une vérification 3B à usage unique.</p>
    {busy&&<div className="passport-proof-loading"><RefreshCw size={26}/><span>Création de la preuve…</span></div>}
    {!busy&&error&&<div className="passport-proof-error" role="alert">{error}<button type="button" onClick={generate}>Réessayer</button></div>}
    {!busy&&proof&&<>
     <div className="passport-proof-qr">
      <img src={proof.qrDataUrl} alt="QR temporaire de vérification du Passeport 3B"/>
      <span aria-hidden="true">3B</span>
     </div>
     <strong className="passport-proof-number">{proof.passportNumber}</strong>
     <div className="passport-proof-expiry" data-expired={remaining<=0}>
      {remaining>0?<>Expire dans <b>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</b></>:<>Ce QR a expiré.</>}
     </div>
     <button type="button" className="passport-proof-refresh" onClick={generate} disabled={busy}><RefreshCw size={16}/> Nouveau QR</button>
    </>}
    <footer>Identité privée 3B · ce Passeport n’est pas un document d’identité gouvernemental ou de voyage.</footer>
   </section>
  </div>}
 </>;
}
