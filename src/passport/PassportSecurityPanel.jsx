import React,{useEffect,useRef,useState} from 'react';
import {browserOptions,credentialResponse,passkeySupported,passportSecurityRequest} from './security-client.js';
import './passport-security.css';
import {cardQr,cardReferenceUrl,nfcSupported,writeCardNfc} from './card-reference.js';
import {initialPasskeys} from './login-passkey.js';

const scopeLabel={'passport.basic':'Passeport 3B actif','identity.verified':'Résultat de vérification d’identité'};
export default function PassportSecurityPanel({expectedUser=null,requestToken=null,cardReference=null,onAccount=null,onRequestHandled=null}) {
  const currentUser=useRef(expectedUser);currentUser.current=expectedUser;
  const currentRequest=useRef(requestToken);currentRequest.current=requestToken;
  const [owner,setOwner]=useState(expectedUser),[sessionsAvailable,setSessionsAvailable]=useState(false);
  const [ready,setReady]=useState({keys:false,partners:false}),[keys,setKeys]=useState([]),[consents,setConsents]=useState([]);
  const [cards,setCards]=useState([]),[loginKeys,setLoginKeys]=useState([]),[artifact,setArtifact]=useState(null),[cardKind,setCardKind]=useState('digital');
  const [loginKeyError,setLoginKeyError]=useState(''),[loginKeysRead,setLoginKeysRead]=useState(false);
  const loginAbort=useRef(null);
  const nfcAbort=useRef(null);
  const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [agree,setAgree]=useState(false),[label,setLabel]=useState('Ma clé d’accès');
  const call=(service,action,body={})=>passportSecurityRequest(service,action,body,expectedUser);
  const refresh=async()=>{
    const user=expectedUser;
    const [keyResult,consentResult,cardResult,loginResult]=await Promise.all([
      ready.keys?call('passport-passkeys','list'):Promise.resolve({credentials:[]}),
      ready.partners?call('passport-partner','consents'):Promise.resolve({consents:[]}),
      ready.cardService?call('passport-card','list'):Promise.resolve({cards:[]}),
      initialPasskeys.list(user).then(data=>({data,error:null})).catch(error=>({data:null,error}))]);
    if(currentUser.current===user){setKeys(keyResult.credentials);setConsents(consentResult.consents);setCards(cardResult.cards);
      setLoginKeysRead(!loginResult.error);setLoginKeyError(loginResult.error?'La gestion des clés de connexion est indisponible. Réessaie ou utilise ta clé de secours en cas de perte.':'');
      if(loginResult.data)setLoginKeys(loginResult.data);}
  };
  useEffect(()=>{
    let live=true;setOwner(expectedUser);setBusy(false);setSessionsAvailable(false);setPreview(null);setAgree(false);setKeys([]);setConsents([]);setCards([]);setLoginKeys([]);setLoginKeyError('');setLoginKeysRead(false);setArtifact(null);setReady({keys:false,partners:false});
    if(owner!==expectedUser||requestToken){setError('');setNotice('');}
    if(!expectedUser)return()=>{live=false;};
    (async()=>{
      const [keyResult,partnerResult,cardResult,loginResult]=await Promise.allSettled([call('passport-passkeys','readiness'),call('passport-partner','readiness'),call('passport-card','readiness'),initialPasskeys.readiness()]);
      if(!live||currentUser.current!==expectedUser)return;
      setSessionsAvailable(keyResult.status==='fulfilled');
      const active={keys:keyResult.status==='fulfilled'&&keyResult.value.enabled,partners:partnerResult.status==='fulfilled'&&partnerResult.value.enabled,
        cards:cardResult.status==='fulfilled'&&cardResult.value.enabled,cardService:cardResult.status==='fulfilled',login:loginResult.status==='fulfilled'&&loginResult.value.enabled};
      setReady(active);
      const tasks=[];
      if(active.keys)tasks.push(call('passport-passkeys','list').then(data=>{if(live)setKeys(data.credentials);}));
      if(active.partners)tasks.push(call('passport-partner','consents').then(data=>{if(live)setConsents(data.consents);}));
      if(active.cardService)tasks.push(call('passport-card','list').then(data=>{if(live)setCards(data.cards);}));
      tasks.push(initialPasskeys.list(expectedUser).then(data=>{if(live){setLoginKeys(data);setLoginKeysRead(true);setLoginKeyError('');}}).catch(()=>{if(live)setLoginKeyError('La gestion des clés de connexion est indisponible. Réessaie ou utilise ta clé de secours en cas de perte.');}));
      if(cardReference&&active.cardService){
        cardReferenceUrl(cardReference);
        tasks.push(call('passport-card','resolve',{cardReference}).then(async data=>{
          const qr=await cardQr(cardReference);if(live)setArtifact({...qr,reference:cardReference,cardId:data.card.id,owner:expectedUser});
        }));
      }
      if(requestToken) {
        if(!/^[0-9a-f]{64}$/.test(requestToken))throw Error('Ce lien de demande est invalide.');
        if(!active.partners)throw Error('Les échanges partenaires ne sont pas encore ouverts. Aucun accord n’a été donné.');
        tasks.push(call('passport-partner','preview',{requestToken}).then(data=>{if(live&&currentRequest.current===requestToken)setPreview({...data,requestToken});}));
      }
      await Promise.all(tasks);
    })().catch(err=>{if(live)setError(err.message);});
    return()=>{live=false;loginAbort.current?.abort();nfcAbort.current?.abort();};
  },[expectedUser,requestToken,cardReference]);
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
  const issueCard=replaceCardId=>run(async()=>{
    const result=await call('passport-card','issue',{kind:cardKind,label:cardKind==='physical'?'Ma carte physique 3B':'Ma carte numérique 3B',replaceCardId});
    const qr=await cardQr(result.reference);
    if(currentUser.current===expectedUser)setArtifact({...qr,reference:result.reference,cardId:result.cardId,owner:expectedUser});
    await refresh();announce(replaceCardId?'Ancienne carte révoquée. Active la nouvelle carte avant de la présenter.':'Carte créée. Active-la avec ta clé de confirmation avant de la présenter.');
  });
  const activateCard=card=>run(async()=>{
    const stepupToken=await confirm('credential_manage',{cardId:card.id});
    const result=await call('passport-card','activate',{cardId:card.id,stepupToken});if(!result.activated)throw Error('La carte n’a pas été activée.');
    await refresh();announce('Carte activée. Chaque partage nécessite toujours ton accord.');
  });
  const revokeCard=card=>run(async()=>{
    const result=await call('passport-card','revoke',{cardId:card.id});if(!result.revoked)throw Error('La carte n’a pas pu être révoquée.');
    await refresh();announce('Carte révoquée. Les demandes encore ouvertes sur cette carte sont invalidées.');
  });
  const downloadQr=()=>{
    if(!artifact||artifact.owner!==expectedUser||currentUser.current!==expectedUser)return;
    const blob=new Blob([artifact.svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download='3b-carte-qr.svg';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const registerLoginKey=()=>run(async()=>{
    loginAbort.current=new AbortController();await initialPasskeys.register(expectedUser,{signal:loginAbort.current.signal});
    await refresh();announce('Clé de connexion ajoutée à ton compte.');
  });
  const date=value=>value?new Date(value).toLocaleDateString('fr-FR'):'Jamais utilisée';
  const visibleArtifact=artifact?.owner===expectedUser?artifact:null;
  return <section className="passport-security-panel" aria-labelledby="passport-security-title">
    <header className="passport-security-heading"><span className="passport-security-eyebrow">TON PASSEPORT · TES CHOIX</span><h2 id="passport-security-title">Un accès. Sous ton contrôle.</h2><p>Gère tes cartes, tes clés d’accès et les accords que tu donnes.</p></header>
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
      <div className="passport-security-grid"><section className="passport-protection-block" aria-labelledby="passport-cards-title">
      <div className="passport-block-title"><h3 id="passport-cards-title">Mes cartes</h3><span className={'passport-service-state '+(ready.cards?'is-ready':'')}>{ready.cards?'Émission disponible':'En préparation'}</span></div>
      <p>Un QR ou une puce NFC ouvre ta carte. Le partage d’informations demande ensuite ton accord sur ce compte.</p>
      {cardReference&&!expectedUser&&<p>Connecte-toi au compte titulaire pour gérer cette carte.</p>}
      {ready.cards&&<><label>Support <select value={cardKind} onChange={event=>setCardKind(event.target.value)} disabled={busy}><option value="digital">Carte numérique</option><option value="physical">Carte physique · QR / NFC</option></select></label><button type="button" onClick={()=>issueCard()} disabled={busy}>Créer ma carte</button></>}
      {visibleArtifact&&<div className="passport-card-export"><img src={visibleArtifact.png} width="210" height="210" alt="QR de référence de ta carte 3B"/><div><strong>Ton QR prêt à imprimer</strong><p>Conserve ce visuel pour imprimer ou fabriquer ta carte. Il ne contient aucune donnée civile.</p><button type="button" onClick={downloadQr} disabled={busy}>Télécharger le QR</button><button type="button" className="passport-security-secondary" disabled={busy} onClick={()=>run(async()=>{await navigator.clipboard.writeText(visibleArtifact.url);announce('Lien de carte copié.');})}>Copier le lien NFC</button>{nfcSupported()&&<button type="button" className="passport-security-secondary" disabled={busy} onClick={()=>run(async()=>{nfcAbort.current=new AbortController();await writeCardNfc(visibleArtifact.reference,{signal:nfcAbort.current.signal});announce('Lien écrit sur la puce NFC.');})}>Écrire une puce NFC vierge</button>}</div></div>}
      <ul className="passport-security-list">{cards.map(card=>{const expired=Date.parse(card.expiresAt)<=Date.now(),active=card.state==='active'&&!expired;return <li key={card.id}><span><strong>{card.label}</strong><small>{expired?'Expirée':card.state==='issued'?'À activer':active?'Active':'Révoquée'} · Valable jusqu’au {date(card.expiresAt)}</small><small>Dernier contrôle confirmé : {date(card.lastProofAt)}</small></span><div className="passport-row-actions">{card.state==='issued'&&!expired&&<button type="button" disabled={busy||!ready.keys||!keys.length||!ready.cards} onClick={()=>activateCard(card)}>Activer avec ma clé</button>}{card.state!=='revoked'&&<button type="button" className="passport-security-secondary" disabled={busy} onClick={()=>revokeCard(card)}>Révoquer</button>}{card.state==='revoked'&&ready.cards&&<button type="button" className="passport-security-secondary" disabled={busy} onClick={()=>issueCard(card.id)}>Remplacer</button>}</div></li>;})}{!cards.length&&<li>Aucune carte QR/NFC créée.</li>}</ul>
      {ready.cards&&!keys.length&&<p>Ajoute une clé de confirmation pour activer ta carte. Une carte créée reste inactive jusque-là.</p>}
      </section><section className="passport-protection-block" aria-labelledby="passport-login-keys-title">
      <div className="passport-block-title"><h3 id="passport-login-keys-title">Clés de connexion</h3><span className={'passport-service-state '+(ready.login?'is-ready':'')}>{ready.login?'Disponible':'En préparation'}</span></div>
      {ready.login?<><p>Retrouve ton compte avec une clé d’accès, sans saisir de mot de passe. Ton e-mail doit être confirmé.</p><button type="button" onClick={registerLoginKey} disabled={busy||!passkeySupported()}>Ajouter une clé de connexion</button></>:<p>Les nouvelles inscriptions et la connexion par clé s’ouvriront après validation sur le service hébergé. Tu peux toujours retirer une clé déjà enregistrée ci-dessous.</p>}
      {loginKeyError&&<p role="alert" className="passport-security-error">{loginKeyError}<button type="button" className="passport-security-secondary" disabled={busy} onClick={()=>run(refresh)}>Réessayer</button></p>}
      <ul className="passport-security-list">{loginKeys.map(key=><li key={key.id}><span><strong>{key.friendly_name||'Ma clé de connexion'}</strong><small>Dernière connexion : {date(key.last_used_at)}</small></span><button type="button" className="passport-security-secondary" disabled={busy} onClick={()=>run(async()=>{await initialPasskeys.revoke(expectedUser,key.id);await refresh();announce('Clé de connexion révoquée.');})}>Révoquer</button></li>)}{loginKeysRead&&!loginKeys.length&&<li>Aucune clé de connexion enregistrée.</li>}</ul>
      </section></div>
      <section className="passport-protection-block" aria-labelledby="passport-confirm-keys-title"><div className="passport-block-title"><h3 id="passport-confirm-keys-title">Clés de confirmation</h3><span className={'passport-service-state '+(ready.keys?'is-ready':'')}>{ready.keys?'Disponible':'En préparation'}</span></div>
      {ready.keys?<>
        <p>La connexion reste celle de ton compte 3B. Ces clés servent à confirmer les partages et à gérer tes protections. Ton empreinte ou ton visage restent sur ton appareil.</p>
        <label>Nom de la clé <input maxLength={60} value={label} onChange={event=>setLabel(event.target.value)} disabled={busy}/></label>
        <button type="button" onClick={enroll} disabled={busy||!passkeySupported()}>Ajouter une clé de confirmation</button>
        {!keys.length&&<p>Pour la première clé, déconnecte-toi puis reconnecte-toi juste avant de l’ajouter.</p>}
        <ul className="passport-security-list">{keys.map(key=><li key={key.id}><span><strong>{key.label}</strong><small>Dernière confirmation : {date(key.lastUsedAt)}</small></span><button type="button" className="passport-security-secondary" onClick={()=>revokeKey(key)} disabled={busy}>Révoquer</button></li>)}</ul>
      </>:<p>Les clés de confirmation sont en préparation. Aucune clé n’est annoncée comme active.</p>}
      </section><div className="passport-security-grid"><section className="passport-protection-block"><h3>Mes accords partenaires</h3>
      {ready.partners?<ul className="passport-security-list">{consents.filter(consent=>!consent.revoked_at).map(consent=><li key={consent.id}>
        <span>{consent.partner?.display_name||consent.client_id}<small>{consent.scopes.map(scope=>scopeLabel[scope]||scope).join(' · ')}</small></span>
        <button type="button" onClick={()=>revokeConsent(consent.id)} disabled={busy}>Retirer mon accord</button>
      </li>)}{!consents.some(consent=>!consent.revoked_at)&&<li>Aucun accord actif.</li>}</ul>:<p>Les échanges partenaires ne sont pas encore ouverts. Ils nécessitent un partenaire autorisé et ton accord explicite.</p>}
      </section><section className="passport-protection-block"><h3>Appareil perdu</h3>
      <p>Déconnecte les autres appareils. Si tu as perdu toutes tes clés, utilise la récupération par clé de secours depuis ton compte ; elle révoque les anciennes protections une fois le contrôle terminé.</p>
      <button type="button" disabled={busy||!sessionsAvailable} onClick={()=>run(async()=>{const result=await call('passport-passkeys','sessions-revoke');if(!result.sessionsRevoked)throw Error('La déconnexion n’a pas abouti.');announce('Les autres appareils ont été déconnectés.');})}>Déconnecter les autres appareils</button>
      {!sessionsAvailable&&<p>La déconnexion à distance sera disponible après activation du service de protection.</p>}
      <a className="passport-security-account" href="/#membre" onClick={accountClick}>Ouvrir mon compte</a>
      </section></div>
    </>}
    <p className="passport-security-footnote">Passeport 3B est un passeport de membre. La reconnaissance par un service extérieur dépend de son accord. Il n’est pas présenté comme une pièce d’identité officielle ou un portefeuille européen certifié.</p>
  </section>;
}
