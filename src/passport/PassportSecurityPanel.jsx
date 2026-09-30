import React,{useEffect,useRef,useState} from 'react';
import {browserOptions,credentialResponse,passkeySupported,passportSecurityRequest} from './security-client.js';
import './passport-security.css';

const scopeLabel={'passport.basic':'Passeport 3B actif','identity.verified':'Résultat de vérification d’identité'};
export default function PassportSecurityPanel({expectedUser=null,requestToken=null,onAccount=null,onRequestHandled=null}) {
  const currentUser=useRef(expectedUser);currentUser.current=expectedUser;
  const currentRequest=useRef(requestToken);currentRequest.current=requestToken;
  const [owner,setOwner]=useState(expectedUser),[sessionsAvailable,setSessionsAvailable]=useState(false);
  const [ready,setReady]=useState({keys:false,partners:false}),[keys,setKeys]=useState([]),[consents,setConsents]=useState([]);
  const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [agree,setAgree]=useState(false),[label,setLabel]=useState('Ma clé d’accès');
  const call=(service,action,body={})=>passportSecurityRequest(service,action,body,expectedUser);
  const refresh=async()=>{
    const user=expectedUser;
    const [keyResult,consentResult]=await Promise.all([
      ready.keys?call('passport-passkeys','list'):Promise.resolve({credentials:[]}),
      ready.partners?call('passport-partner','consents'):Promise.resolve({consents:[]})]);
    if(currentUser.current===user){setKeys(keyResult.credentials);setConsents(consentResult.consents);}
  };
  useEffect(()=>{
    let live=true;setOwner(expectedUser);setBusy(false);setSessionsAvailable(false);setPreview(null);setAgree(false);setKeys([]);setConsents([]);setReady({keys:false,partners:false});
    if(owner!==expectedUser||requestToken){setError('');setNotice('');}
    if(!expectedUser)return()=>{live=false;};
    (async()=>{
      const [keyResult,partnerResult]=await Promise.allSettled([call('passport-passkeys','readiness'),call('passport-partner','readiness')]);
      if(!live||currentUser.current!==expectedUser)return;
      setSessionsAvailable(keyResult.status==='fulfilled');
      const active={keys:keyResult.status==='fulfilled'&&keyResult.value.enabled,partners:partnerResult.status==='fulfilled'&&partnerResult.value.enabled};
      setReady(active);
      const tasks=[];
      if(active.keys)tasks.push(call('passport-passkeys','list').then(data=>{if(live)setKeys(data.credentials);}));
      if(active.partners)tasks.push(call('passport-partner','consents').then(data=>{if(live)setConsents(data.consents);}));
      if(requestToken) {
        if(!/^[0-9a-f]{64}$/.test(requestToken))throw Error('Ce lien de demande est invalide.');
        if(!active.partners)throw Error('Les échanges partenaires ne sont pas encore ouverts. Aucun accord n’a été donné.');
        tasks.push(call('passport-partner','preview',{requestToken}).then(data=>{if(live&&currentRequest.current===requestToken)setPreview({...data,requestToken});}));
      }
      await Promise.all(tasks);
    })().catch(err=>{if(live)setError(err.message);});
    return()=>{live=false;};
  },[expectedUser,requestToken]);
  const run=async operation=>{
    const user=expectedUser;
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{await operation();}catch(err){if(currentUser.current===user)setError(err.name==='NotAllowedError'?'Confirmation annulée ou expirée. Tu peux recommencer.':err.message);}
    finally{if(currentUser.current===user)setBusy(false);}
  };
  const announce=message=>{if(currentUser.current===expectedUser)setNotice(message);};
  const accountClick=event=>{if(onAccount&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onAccount();}};
  const handled=()=>{if(currentUser.current===expectedUser&&currentRequest.current===requestToken)onRequestHandled?.(requestToken,expectedUser);};
  const confirm=async(purpose,extra={})=>{
    if(!passkeySupported())throw Error('Ouvre cette page dans un navigateur HTTPS compatible avec les clés d’accès.');
    const request=await call('passport-passkeys','authenticate-options',{purpose,...extra});
    const credential=await navigator.credentials.get(browserOptions(request.options));
    const result=await call('passport-passkeys','authenticate-finish',{purpose,challengeId:request.challengeId,response:credentialResponse(credential)});
    return result.stepupToken;
  };
  const enroll=()=>run(async()=>{
    if(!passkeySupported())throw Error('Ouvre cette page dans un navigateur HTTPS compatible avec les clés d’accès.');
    const request=await call('passport-passkeys','register-options');
    const credential=await navigator.credentials.create(browserOptions(request.options,true));
    const stepupToken=request.existingCredentialRequired?await confirm('credential_manage'):undefined;
    await call('passport-passkeys','register-finish',{challengeId:request.challengeId,response:credentialResponse(credential),label,stepupToken});
    await refresh();announce('Clé de confirmation ajoutée.');
  });
  const approve=()=>run(async()=>{
    if(!agree||!preview||preview.requestToken!==requestToken)throw Error('Lis la demande puis coche ton accord.');
    const stepupToken=await confirm('partner_approve',{requestToken});
    await call('passport-partner','approve',{requestToken,scopes:preview.scopes,consent:true,stepupToken});
    if(currentUser.current===expectedUser&&currentRequest.current===requestToken){setPreview(null);setAgree(false);announce('Accord enregistré. Le partenaire peut récupérer cette preuve une seule fois avant son expiration.');handled();}await refresh();
  });
  const decline=()=>run(async()=>{
    const result=await call('passport-partner','decline',{requestToken});
    if(!result.declined)throw Error('Cette demande a déjà expiré ou a été traitée.');
    if(currentUser.current===expectedUser&&currentRequest.current===requestToken){setPreview(null);setAgree(false);announce('Demande refusée. Aucune information n’a été partagée.');handled();}
  });
  const revokeKey=key=>run(async()=>{
    const stepupToken=await confirm('credential_manage',{credentialId:key.id});
    const result=await call('passport-passkeys','revoke',{credentialId:key.id,stepupToken});
    if(!result.revoked)throw Error('Cette clé n’a pas pu être révoquée.');
    await refresh();announce('Clé révoquée. Elle ne peut plus confirmer de demande.');
  });
  const revokeConsent=id=>run(async()=>{
    const result=await call('passport-partner','revoke',{consentId:id});
    if(!result.revoked)throw Error('Cet accord n’a pas pu être révoqué.');
    await refresh();announce('Accord révoqué. Les demandes en attente ne peuvent plus être utilisées.');
  });
  return <section className="passport-security-panel" aria-labelledby="passport-security-title">
    <h2 id="passport-security-title">Protéger mon Passeport</h2>
    <p>Tu choisis les informations partagées. Les confirmations sensibles peuvent être protégées par une clé d’accès sur ton appareil.</p>
    {!expectedUser?<p><a href="/#membre" onClick={accountClick}>Connecte-toi</a> pour gérer tes protections et tes accords.</p>:owner!==expectedUser?<p>Chargement des protections de ton compte…</p>:<>
      {error&&<p role="alert" className="passport-security-error">{error}</p>}
      {notice&&<p role="status" className="passport-security-notice">{notice}</p>}
      {preview&&preview.requestToken===requestToken&&<section className="passport-consent-card" aria-labelledby="passport-consent-title">
        <h3 id="passport-consent-title">Demande de {preview.partner.name}</h3>
        <p>{preview.partner.purpose}</p><p>Destinataire : <strong>{preview.partner.audience}</strong></p>
        <ul>{preview.scopes.map(scope=><li key={scope}>{scopeLabel[scope]||scope}</li>)}</ul>
        <p>{preview.disclosure}</p><p>Cette demande expire à {new Date(preview.expiresAt).toLocaleTimeString('fr-FR')}.</p>
        <label className="passport-security-agree"><input type="checkbox" checked={agree} onChange={event=>setAgree(event.target.checked)} disabled={busy}/> J’autorise ce partage précis avec ce partenaire.</label>
        <button type="button" onClick={approve} disabled={busy||!agree||!ready.keys||!keys.length}>Confirmer avec ma clé d’accès</button>
        {!keys.length&&<p>Ajoute d’abord une clé de confirmation ci-dessous. Le partage restera fermé jusqu’à ta confirmation.</p>}
        <button type="button" className="passport-security-secondary" onClick={decline} disabled={busy}>Refuser cette demande</button>
      </section>}
      <h3>Clés de confirmation</h3>
      {ready.keys?<>
        <p>La connexion reste celle de ton compte 3B. Ces clés servent à confirmer les partages et à gérer tes protections. Ton empreinte ou ton visage restent sur ton appareil.</p>
        <label>Nom de la clé <input maxLength={60} value={label} onChange={event=>setLabel(event.target.value)} disabled={busy}/></label>
        <button type="button" onClick={enroll} disabled={busy||!passkeySupported()}>Ajouter une clé de confirmation</button>
        {!keys.length&&<p>Pour la première clé, déconnecte-toi puis reconnecte-toi juste avant de l’ajouter.</p>}
        <ul className="passport-security-list">{keys.map(key=><li key={key.id}><span>{key.label}</span><button type="button" onClick={()=>revokeKey(key)} disabled={busy}>Révoquer</button></li>)}</ul>
      </>:<p>Les clés de confirmation sont en préparation. Aucune clé n’est annoncée comme active.</p>}
      <h3>Mes accords partenaires</h3>
      {ready.partners?<ul className="passport-security-list">{consents.filter(consent=>!consent.revoked_at).map(consent=><li key={consent.id}>
        <span>{consent.partner?.display_name||consent.client_id}<small>{consent.scopes.map(scope=>scopeLabel[scope]||scope).join(' · ')}</small></span>
        <button type="button" onClick={()=>revokeConsent(consent.id)} disabled={busy}>Retirer mon accord</button>
      </li>)}{!consents.some(consent=>!consent.revoked_at)&&<li>Aucun accord actif.</li>}</ul>:<p>Les échanges partenaires ne sont pas encore ouverts. Ils nécessitent un partenaire autorisé et ton accord explicite.</p>}
      <h3>Appareil perdu</h3>
      <p>Déconnecte les autres appareils. Si tu as perdu toutes tes clés, utilise la récupération par clé de secours depuis ton compte ; elle révoque les anciennes protections une fois le contrôle terminé.</p>
      <button type="button" disabled={busy||!sessionsAvailable} onClick={()=>run(async()=>{const result=await call('passport-passkeys','sessions-revoke');if(!result.sessionsRevoked)throw Error('La déconnexion n’a pas abouti.');announce('Les autres appareils ont été déconnectés.');})}>Déconnecter les autres appareils</button>
      {!sessionsAvailable&&<p>La déconnexion à distance sera disponible après activation du service de protection.</p>}
      <a className="passport-security-account" href="/#membre" onClick={accountClick}>Ouvrir mon compte</a>
    </>}
    <p className="passport-security-footnote">Passeport 3B est un passeport de membre. La reconnaissance par un service extérieur dépend de son accord. Il n’est pas présenté comme une pièce d’identité officielle ou un portefeuille européen certifié.</p>
  </section>;
}
