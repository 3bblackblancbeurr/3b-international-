import React,{useEffect,useRef} from 'react';
import {Crown,LockKeyhole,ShieldCheck,ArrowRight} from 'lucide-react';
import './director.css';

export function DestinAccess({owner,access,onPassport,onStudio}) {
  const ready=access?.allowed===true;
  if(owner)return <aside className="destin-director-access" aria-label="Accès Directeur"><Crown size={25} aria-hidden="true"/><div><span className="destin-kicker">DIRECTEUR · FONDATEUR 3B</span><h2>Ton Studio. Tous les chemins.</h2><p>Crée, importe et prévisualise toutes les scènes. Cet espace privé ne crée aucun parcours spectateur, vote ou gain.</p></div><button className="destin-primary" onClick={onStudio}>Ouvrir mon Studio<ArrowRight size={17}/></button></aside>;
  return <aside className={`destin-passport-access ${ready?'is-ready':''}`} aria-label="Lien avec mon Passeport">{ready?<ShieldCheck size={24} aria-hidden="true"/>:<LockKeyhole size={24} aria-hidden="true"/>}<div><strong>{ready?'Ton Passeport est prêt. Ton histoire sera unique.':'Ton Passeport, ton seul destin.'}</strong><p>{ready?'Chaque décision est confirmée, puis conservée. Tu peux quitter et reprendre, mais pas changer de chemin.':access?.message || 'Le statut de ton Passeport doit être confirmé avant un parcours réel.'}</p></div><button className="destin-secondary" onClick={onPassport}>Mon Passeport<ArrowRight size={16}/></button></aside>;
}
export function DestinConfirmation({choice,onCancel,onConfirm}) {
  const dialog=useRef(null),cancel=useRef(null);
  useEffect(()=>{
    const el=dialog.current,previous=document.activeElement;
    el?.showModal();cancel.current?.focus();
    return()=>{el?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  return <dialog ref={dialog} className="destin-confirm" aria-labelledby="destin-confirm-title" aria-describedby="destin-confirm-detail" onCancel={event=>{event.preventDefault();onCancel();}}>
    <div className="destin-confirm-seal"><LockKeyhole size={28} aria-hidden="true"/></div><span className="destin-kicker">UN CHOIX. UNE HISTOIRE.</span><h2 id="destin-confirm-title">Tu confirmes ce destin ?</h2><p className="destin-confirm-choice">{choice.label}</p><p id="destin-confirm-detail">Une fois enregistré, ce choix est définitif. L’autre chemin restera fermé pour cette histoire, même sur un autre appareil.</p><div className="destin-actions"><button ref={cancel} className="destin-secondary" onClick={onCancel}>Réfléchir encore</button><button className="destin-primary" onClick={onConfirm}>Confirmer mon destin</button></div>
  </dialog>;
}
