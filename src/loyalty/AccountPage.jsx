import React,{useMemo,useReducer,useState} from 'react';
import {ArrowUpRight,CheckCircle2,Download,Eye,EyeOff,Fingerprint,Gamepad2,Globe2,KeyRound,LogOut,Mail,ShieldCheck,WalletCards} from 'lucide-react';
import {
 ACCOUNT_TERMS_VERSION,COUNTRIES,normalizeBirthDate,normalizeCivilName,normalizeEmail,passwordRequirements,
 validateRegistration,validateStrongPassword
} from '../../shared/loyalty.js';
import {authClient,memberRequest} from './client.js';
import {useLoyalty} from './LoyaltyContext.jsx';
import BoutiqueCard from './BoutiqueCard.jsx';
import PublicIdentityBadge from '../components/PublicIdentityBadge.jsx';
import PassportAppearanceSettings from '../passport/PassportAppearance.jsx';
import './boutique-loyalty.css';
import {RewardStats} from './LoyaltyPage.jsx';
import {OPTION_LABELS} from '../lib/member.js';
import TurnstileField from './TurnstileField.jsx';
import {Button} from '../design-system/index.jsx';
import {captchaChallengeReducer} from './captcha-state.js';
import './loyalty.css';

function initialMode(){
 try{
  if(new URLSearchParams(window.location.search).get('reset')==='1')return'reset-password';
  return sessionStorage.getItem('3b-auth-intent')==='register'?'register':'login';
 }catch{return'login';}
}

export default function AccountPage({legacy,options,toggleOption,goTo}){
 const account=useLoyalty(),{profile}=account,economy=account.economy,inventory=account.inventory||[],entitlements=account.entitlements||[];
 const[mode,setMode]=useState(initialMode);
 const[fields,setFields]=useState({
  identifier:'',handle:'',email:'',emailConfirm:'',password:'',passwordConfirm:'',
  name:legacy?.name||'',country:legacy?.originCountry||'France',recovery:'',
  legalGivenNames:'',legalFamilyName:'',birthDate:'',
  termsAccepted:false,privacyAccepted:false,identityConsent:false,marketingOptIn:false,website:''
 });
 const[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const[prestigeBusy,setPrestigeBusy]=useState(false),[identityBusy,setIdentityBusy]=useState(false),[recovery,setRecovery]=useState('');
 const[pendingEmail,setPendingEmail]=useState('');
 const[{attempt:captchaAttempt,token:captchaToken},dispatchCaptcha]=useReducer(captchaChallengeReducer,{attempt:0,token:''});
 const setCaptchaToken=token=>dispatchCaptcha({type:'token',attempt:captchaAttempt,token});
 const resetCaptcha=()=>dispatchCaptcha({type:'reset'});
 const[showPassword,setShowPassword]=useState(false);

 const field=(key,value)=>{setFields(f=>({...f,[key]:value}));setError('');setNotice('');};
 const passwordRules=useMemo(()=>passwordRequirements(fields.password),[fields.password]);
 const realEmail=account.user?.email&&!String(account.user.email).endsWith('@accounts.3b.invalid')?account.user.email:'';
 const emailVerified=!!realEmail&&!!account.user?.email_confirmed_at;

 const setSession=async session=>{
  const{error:sessionError}=await authClient.auth.setSession(session);
  if(sessionError)throw sessionError;
 };

 const submit=async event=>{
  event.preventDefault();if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   if(mode==='login'){
    const result=await memberRequest('login',{identifier:fields.identifier,password:fields.password,captchaToken});
    await setSession(result.session);
    setFields(f=>({...f,password:''}));
   }else if(mode==='register'){
    validateRegistration(fields);
    const result=await memberRequest('register-v2',{...fields,captchaToken});
    setRecovery(result.recovery||'');
    setPendingEmail(fields.email.trim().toLowerCase());
    if(result.session){
     await setSession(result.session);
     setNotice('Compte créé et connecté.');
    }else{
     setNotice('Compte créé. Vérifie maintenant ta boîte e-mail pour activer la connexion.');
    }
    setFields(f=>({...f,password:'',passwordConfirm:''}));
   }else if(mode==='recover'){
    validateStrongPassword(fields.password);
    if(fields.password!==fields.passwordConfirm)throw Error('Les deux mots de passe ne correspondent pas.');
    const result=await memberRequest('recover-v2',{
     handle:fields.handle,password:fields.password,passwordConfirm:fields.passwordConfirm,
     recovery:fields.recovery,captchaToken
    });
    setRecovery(result.recovery||'');
    await setSession(result.session);
    setNotice('Mot de passe remplacé. Une nouvelle clé de secours a été créée.');
    setFields(f=>({...f,password:'',passwordConfirm:'',recovery:''}));
   }else if(mode==='reset-request'){
    normalizeEmail(fields.email);
    const result=await memberRequest('reset-request',{email:fields.email,captchaToken});
    setNotice(result.message);
   }else if(mode==='reset-password'){
    validateStrongPassword(fields.password);
    if(fields.password!==fields.passwordConfirm)throw Error('Les deux mots de passe ne correspondent pas.');
    const{error:updateError}=await authClient.auth.updateUser({password:fields.password});
    if(updateError)throw updateError;
    await authClient.auth.signOut({scope:'others'}).catch(()=>{});
    setMode('login');
    try{
     const url=new URL(window.location.href);url.searchParams.delete('reset');
     history.replaceState(history.state,'',url.pathname+url.search+'#membre');
    }catch{}
    setNotice('Ton nouveau mot de passe est enregistré.');
    setFields(f=>({...f,password:'',passwordConfirm:''}));
   }
  }catch(e){setError(e.message||'Connexion indisponible. Réessaie.');}
  finally{setBusy(false);resetCaptcha();}
 };

 const resendConfirmation=async()=>{
  if(!pendingEmail||busy)return;
  setBusy(true);setError('');
  try{
   const result=await memberRequest('resend-confirmation',{email:pendingEmail,captchaToken});
   setNotice(result.message);
  }catch(e){setError(e.message||'Impossible de renvoyer le message.');}
  finally{setBusy(false);resetCaptcha();}
 };

 const downloadRecovery=()=>{
  const url=URL.createObjectURL(new Blob([
   'CLÉ DE SECOURS 3B — À CONSERVER EN PRIVÉ\nIdentifiant : '+(profile?.handle||fields.handle)+
   '\nClé : '+recovery+
   '\n\nCette clé permet de remplacer ton mot de passe. Ne la partage avec personne.\nhttps://3b-international.vercel.app/#membre'
  ],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='3b-cle-de-secours.txt';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };

 const logout=async()=>{
  setError('');const{error:logoutError}=await authClient.auth.signOut();
  if(logoutError)setError('La déconnexion a échoué. Réessaie.');else{setRecovery('');setPendingEmail('');}
 };

 const saveIdentityClaim=async()=>{
  if(identityBusy||account.identityClaimsComplete)return;
  setIdentityBusy(true);setError('');setNotice('');
  try{
   const legalGivenNames=normalizeCivilName(fields.legalGivenNames,'ton ou tes prénoms officiels');
   const legalFamilyName=normalizeCivilName(fields.legalFamilyName,'ton nom de famille officiel');
   const birthDate=normalizeBirthDate(fields.birthDate);
   if(fields.identityConsent!==true)throw Error('Accepte le traitement de tes informations d’identité pour continuer.');
   const result=await memberRequest('identity-claim',{
    legalGivenNames,legalFamilyName,birthDate,identityConsent:true
   },account.user?.id);
   account.accept(result);
   setFields(f=>({...f,legalGivenNames:'',legalFamilyName:'',birthDate:'',identityConsent:false}));
   setNotice('Tes informations civiles privées sont enregistrées. Elles ne sont pas encore une identité vérifiée.');
  }catch(e){setError(e.message||'Impossible d’enregistrer ton identité pour le moment.');}
  finally{setIdentityBusy(false);}
 };

 const unlockPrestige=async()=>{
  if(prestigeBusy)return;
  setPrestigeBusy(true);setError('');
  try{await memberRequest('prestige',{},account.user?.id);await account.refresh();}
  catch(e){setError(e.message||'Le Prestige ne peut pas être débloqué pour le moment.');}
  finally{setPrestigeBusy(false);}
 };

 const switchMode=next=>{setMode(next);setError('');setNotice('');resetCaptcha();};

 return <section className="loyalty-page account-page">
  <header className="loyalty-intro">
   <span className="loyalty-eyebrow">3B INTERNATIONAL / MON COMPTE</span>
   <button onClick={()=>goTo('loyalty')}>Mes cartes <ArrowUpRight size={16}/></button>
  </header>

  <h1>{profile?'Bienvenue, '+profile.name+'.':'Entre dans le Cercle.'}</h1>
  <p className="account-lead">Un seul compte sécurisé pour ton Passeport, tes jeux, le Monde du 3B, tes récompenses et tes appareils.</p>

  {recovery&&<section className="recovery-panel" aria-label="Clé de secours">
   <KeyRound/><div>
    <h2>Conserve ta clé de secours.</h2>
    <p>Elle reste ton deuxième moyen de récupération. Télécharge-la et garde-la hors ligne. Elle ne sera plus affichée après le rechargement.</p>
    <code>{recovery}</code>
    <button className="loyalty-primary" onClick={downloadRecovery}><Download size={17}/> Télécharger ma clé</button>
   </div>
  </section>}

  {pendingEmail&&!profile&&<section className="account-confirmation-panel" aria-live="polite">
   <Mail/><div>
    <h2>Confirme ton e-mail.</h2>
    <p>Un message d’activation a été demandé pour <strong>{pendingEmail}</strong>. Après confirmation, reviens ici et connecte-toi.</p>
    <button onClick={resendConfirmation} disabled={busy}>Renvoyer le message</button>
   </div>
  </section>}

  {(error||account.error)&&<p className="loyalty-notice" role="alert">{error||account.error}{account.error&&<button onClick={account.refresh}>Réessayer</button>}</p>}
  {notice&&<p className="account-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}

  {account.loading?<p role="status">Ouverture de ton compte…</p>
  :account.user&&!profile?<div className="loyalty-empty"><p>Synchronisation de ton compte…</p><button onClick={account.refresh}>Réessayer</button><button onClick={logout}>Se déconnecter</button></div>
  :profile&&mode!=='reset-password'?<>
   {(()=>{try{return sessionStorage.getItem('3b-community-intent')==='chat';}catch{return false;}})()&&
    <button className="surface-button account-community-return" onClick={()=>{try{sessionStorage.removeItem('3b-auth-intent');}catch{}goTo('community');}}>Continuer vers la communauté <ArrowUpRight size={17}/></button>}

   <div className="account-dashboard">
    <div><BoutiqueCard profile={profile}/><p className="account-boutique-label">Ta carte de fidélité boutique · vêtements et accessoires</p><RewardStats profile={profile}/></div>
    <article className="account-summary">
     <span className="loyalty-eyebrow">MEMBRE DU CERCLE</span><h2>@{profile.handle}</h2><PublicIdentityBadge profile={profile}/>
     <div className="loyalty-numbers">
      <div><span>NIVEAU GLOBAL</span><strong>{economy?.global_level??'—'} <small>/ 150</small></strong></div>
      <div><span>EXPÉRIENCE</span><strong>{economy?.xp??profile.xp} <small>XP</small></strong></div>
      <div><span>COINS 3B</span><strong>{economy?.coins??'—'} <small>Coins</small></strong></div>
      <div><span>FIDÉLITÉ</span><strong>{profile.points} <small>points</small></strong></div>
     </div>
     {economy?.title&&<p className="account-progress-title"><strong>{economy.title}</strong>{Number(economy.prestige_level)>0?<> · Prestige {['','I','II','III'][Math.min(3,Number(economy.prestige_level))]}</>:null}</p>}
     {economy?.season&&<p className="account-progress-season">Saison active : <strong>{economy.season.label}</strong></p>}
     {economy?.prestige_eligible&&Number(economy?.prestige_level||0)<3&&<button className="loyalty-primary account-prestige-unlock" onClick={unlockPrestige} disabled={prestigeBusy}>{prestigeBusy?'Validation du Prestige…':'Débloquer Prestige '+['I','II','III'][Number(economy?.prestige_level||0)]}</button>}
     {economy?.next_level_xp!=null&&<p className="account-progress-next">Prochain niveau : {economy.next_level_xp} XP · Courbe {economy.xp_curve_version||'globale'}</p>}
     <p><ShieldCheck size={16}/> Compte synchronisé en ligne</p>
     <p>{realEmail?<>E-mail {emailVerified?'vérifié':'en attente'} · {realEmail}</>:<>Compte historique 3B · récupération par clé active</>}</p>
     <p>{profile.country} · Depuis le {new Date(profile.created_at).toLocaleDateString('fr-FR')}</p>
     <p className="account-id">N° membre : {profile.user_id.toUpperCase()}</p>
     <button className="loyalty-primary" onClick={()=>goTo('loyalty')}>Mes cartes et avantages <ArrowUpRight size={16}/></button>
     <button onClick={()=>goTo('games')}>Jouer et gagner de l’XP</button>
     <button onClick={()=>goTo('passport')}>Voir mon passeport</button>
     <button className="account-logout" onClick={logout}><LogOut size={16}/> Se déconnecter</button>
    </article>
   </div>

   {!account.identityClaimsComplete&&<section className="account-command-center" aria-labelledby="identity-claim-title">
    <div className="account-command-heading">
     <div><span className="loyalty-eyebrow">PASSEPORT 3B / IDENTITÉ PRIVÉE</span><h2 id="identity-claim-title">Compléter mon identité civile</h2></div>
     <p>Réservé aux anciens comptes qui n’ont pas encore fourni leurs données civiles. Ces informations restent privées et leur saisie ne signifie pas que l’identité est vérifiée.</p>
    </div>
    <div className="account-form-panel">
     <div className="account-field-pair">
      <label>Prénom(s) officiel(s)
       <input autoComplete="given-name" required maxLength={120} placeholder="Comme sur ta pièce d’identité" value={fields.legalGivenNames} onChange={e=>field('legalGivenNames',e.target.value)}/>
      </label>
      <label>Nom de famille officiel
       <input autoComplete="family-name" required maxLength={120} placeholder="Comme sur ta pièce d’identité" value={fields.legalFamilyName} onChange={e=>field('legalFamilyName',e.target.value)}/>
      </label>
     </div>
     <label>Date de naissance
      <input type="date" autoComplete="bday" required min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={fields.birthDate} onChange={e=>field('birthDate',e.target.value)}/>
     </label>
     <label className="account-check"><input type="checkbox" checked={fields.identityConsent} onChange={e=>field('identityConsent',e.target.checked)}/><span>J’accepte le traitement privé de ces données afin de préparer la vérification de mon Passeport 3B.</span></label>
     <Button className="loyalty-primary" onClick={saveIdentityClaim} loading={identityBusy} disabled={identityBusy}>{'Enregistrer mon identité privée'} <ArrowUpRight size={17}/></Button>
    </div>
   </section>}

   {account.identityClaimsComplete&&<section className="account-command-center" aria-label="État du dossier identité">
    <div className="account-command-heading">
     <div><span className="loyalty-eyebrow">PASSEPORT 3B / DOSSIER IDENTITÉ</span><h2>Données civiles privées enregistrées</h2></div>
     <p>{profile.identity_verification_state==='verified'?'Identité civile vérifiée.':profile.identity_verification_state==='pending'?'Vérification d’identité en cours.':'Dossier prêt pour une future vérification externe. Aucune identité civile n’est considérée vérifiée sans preuve externe.'}</p>
    </div>
   </section>}

   <section className="account-command-center" aria-labelledby="inventory-center-title">
    <div className="account-command-heading">
     <div><span className="loyalty-eyebrow">INVENTAIRE 3B / COMPTE SERVEUR</span><h2 id="inventory-center-title">Tes objets suivent ton Passeport.</h2></div>
     <p>Les quantités viennent du serveur 3B. Les achats numériques actifs sont reliés au même compte et ne sont jamais calculés depuis le navigateur.</p>
    </div>
    <div className="loyalty-numbers">
     <div><span>OBJETS</span><strong>{account.inventoryAvailable?inventory.reduce((sum,item)=>sum+Math.max(0,Number(item.quantity)||0),0):'—'}</strong></div>
     <div><span>RÉFÉRENCES</span><strong>{account.inventoryAvailable?inventory.length:'—'}</strong></div>
     <div><span>DROITS ACTIFS</span><strong>{account.entitlementsAvailable?entitlements.length:'—'}</strong></div>
     <div><span>PASSEPORT</span><strong>{profile.passport_state==='active'?'ACTIF':'—'}</strong></div>
    </div>
    {(!account.inventoryAvailable||!account.entitlementsAvailable)&&<p role="status">Inventaire momentanément indisponible. Tes objets restent liés à ton compte. Réessaie la synchronisation.</p>}
    {account.inventoryAvailable&&inventory.length>0&&<p className="account-progress-next">Derniers objets : {inventory.slice(0,5).map(item=>item.item_code+' ×'+item.quantity).join(' · ')}</p>}
   </section>

   <section className="account-command-center" aria-labelledby="member-center-title">
    <div className="account-command-heading">
     <div><span className="loyalty-eyebrow">MON ESPACE 3B</span><h2 id="member-center-title">Mon compte & mes avantages</h2></div>
    </div>
    <div className="account-command-grid">
     <button type="button" onClick={()=>goTo('passport')}><Fingerprint size={21}/><span><strong>Mon Passeport</strong><small>Identité, origine et portrait</small></span><ArrowUpRight size={16}/></button>
     <button type="button" onClick={()=>goTo('world3b')}><Globe2 size={21}/><span><strong>Monde du 3B</strong><small>Portes, missions et progression</small></span><ArrowUpRight size={16}/></button>
     <button type="button" onClick={()=>goTo('games')}><Gamepad2 size={21}/><span><strong>Mes jeux 3B</strong><small>Jouer et faire progresser le compte</small></span><ArrowUpRight size={16}/></button>
     <Button variant="ghost" onClick={()=>goTo('loyalty')}><WalletCards size={21}/><span><strong>Ma carte de fidélité</strong><small>Points, avantages et récompenses</small></span><ArrowUpRight size={16}/></Button>
    </div>
   </section>

   {account.passport&&<PassportAppearanceSettings identity={account.passport} compact/>}
  </>
  :<div className="account-entry">
   <div className="account-form-panel">
    {mode!=='reset-password'&&<div className="account-tabs" role="group" aria-label="Accéder au compte">
     <button aria-pressed={mode==='login'} onClick={()=>switchMode('login')}>Connexion</button>
     <button aria-pressed={mode==='register'} onClick={()=>switchMode('register')}>Créer un compte</button>
    </div>}

    <h2>{
     mode==='register'?'Créer mon identité 3B':
     mode==='recover'?'Récupération par clé':
     mode==='reset-request'?'Récupération par e-mail':
     mode==='reset-password'?'Nouveau mot de passe':
     'Heureux de te retrouver.'
    }</h2>

    <form onSubmit={submit}>
     {mode==='login'&&<>
      <label>Identifiant 3B ou e-mail
       <input name="username" autoComplete="username" required maxLength={254} autoCapitalize="none" spellCheck="false" placeholder="kais3b ou nom@email.fr" value={fields.identifier} onChange={e=>field('identifier',e.target.value.toLowerCase())}/>
      </label>
     </>}

     {mode==='register'&&<>
      <label>Identifiant 3B
       <input name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-z0-9][a-z0-9._\-]{2,23}" autoCapitalize="none" spellCheck="false" placeholder="Exemple : kais3b" value={fields.handle} onChange={e=>field('handle',e.target.value.toLowerCase())}/>
       <small>3 à 24 lettres minuscules, chiffres, points ou tirets.</small>
      </label>
      <div className="account-field-pair">
       <label>Adresse e-mail
        <input type="email" name="email" autoComplete="email" required maxLength={254} placeholder="ton@email.fr" value={fields.email} onChange={e=>field('email',e.target.value)}/>
       </label>
       <label>Confirmer l’e-mail
        <input type="email" name="email-confirm" autoComplete="email" required maxLength={254} placeholder="Retape ton e-mail" value={fields.emailConfirm} onChange={e=>field('emailConfirm',e.target.value)}/>
       </label>
      </div>
      <label>Nom public sur ta carte
       <input name="nickname" autoComplete="nickname" required minLength={2} maxLength={80} placeholder="Ton nom affiché" value={fields.name} onChange={e=>field('name',e.target.value)}/>
       <small>Ce nom est public dans l’univers 3B. Il peut être différent de ton identité civile.</small>
      </label>
      <div className="account-field-pair">
       <label>Prénom(s) officiel(s)
        <input name="given-name" autoComplete="given-name" required maxLength={120} placeholder="Comme sur ta pièce d’identité" value={fields.legalGivenNames} onChange={e=>field('legalGivenNames',e.target.value)}/>
       </label>
       <label>Nom de famille officiel
        <input name="family-name" autoComplete="family-name" required maxLength={120} placeholder="Comme sur ta pièce d’identité" value={fields.legalFamilyName} onChange={e=>field('legalFamilyName',e.target.value)}/>
       </label>
      </div>
      <label>Date de naissance
       <input type="date" name="birth-date" autoComplete="bday" required min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={fields.birthDate} onChange={e=>field('birthDate',e.target.value)}/>
       <small>Donnée privée. Elle prépare la future vérification d’identité et n’apparaît pas sur ton profil public.</small>
      </label>
      <label>Pays d’origine
       <select value={fields.country} onChange={e=>field('country',e.target.value)}>{COUNTRIES.map(c=><option key={c}>{c}</option>)}</select>
      </label>
      <label className="account-honeypot" aria-hidden="true">Site web
       <input tabIndex={-1} autoComplete="off" value={fields.website} onChange={e=>field('website',e.target.value)}/>
      </label>
     </>}

     {mode==='recover'&&<>
      <label>Identifiant 3B
       <input required minLength={3} maxLength={24} autoCapitalize="none" spellCheck="false" value={fields.handle} onChange={e=>field('handle',e.target.value.toLowerCase())}/>
      </label>
      <label>Clé de secours
       <textarea required autoComplete="off" spellCheck="false" value={fields.recovery} onChange={e=>field('recovery',e.target.value)} placeholder="La clé téléchargée lors de la création du compte"/>
      </label>
     </>}

     {mode==='reset-request'&&<label>Adresse e-mail du compte
      <input type="email" autoComplete="email" required maxLength={254} placeholder="ton@email.fr" value={fields.email} onChange={e=>field('email',e.target.value)}/>
      <small>Pour les anciens comptes sans e-mail, utilise ta clé de secours.</small>
     </label>}

     {['login','register','recover','reset-password'].includes(mode)&&<label>{mode==='login'?'Mot de passe':mode==='reset-password'||mode==='recover'?'Nouveau mot de passe':'Mot de passe'}
      <div className="account-password-wrap">
       <input type={showPassword?'text':'password'} name="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128} value={fields.password} onChange={e=>field('password',e.target.value)}/>
       <button type="button" className="account-password-toggle" aria-label={showPassword?'Masquer le mot de passe':'Afficher le mot de passe'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
      </div>
     </label>}

     {['register','recover','reset-password'].includes(mode)&&<>
      <label>Confirmer le mot de passe
       <input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={fields.passwordConfirm} onChange={e=>field('passwordConfirm',e.target.value)}/>
      </label>
      <div className="password-checklist" aria-label="Exigences du mot de passe">
       <span data-ok={passwordRules.length}>12 caractères</span>
       <span data-ok={passwordRules.lower}>minuscule</span>
       <span data-ok={passwordRules.upper}>majuscule</span>
       <span data-ok={passwordRules.digit}>chiffre</span>
       <span data-ok={passwordRules.symbol}>symbole</span>
      </div>
     </>}

     {mode==='register'&&<div className="account-consents">
      <label className="account-check"><input type="checkbox" checked={fields.termsAccepted} onChange={e=>field('termsAccepted',e.target.checked)}/><span>J’accepte les <a href="/account-terms.html" target="_blank" rel="noreferrer">conditions du compte 3B</a> (version {ACCOUNT_TERMS_VERSION}).</span></label>
      <label className="account-check"><input type="checkbox" checked={fields.privacyAccepted} onChange={e=>field('privacyAccepted',e.target.checked)}/><span>J’ai pris connaissance de la <a href="/privacy-policy.html" target="_blank" rel="noreferrer">politique de confidentialité</a>.</span></label>
      <label className="account-check"><input type="checkbox" checked={fields.identityConsent} onChange={e=>field('identityConsent',e.target.checked)}/><span>Je demande la création de mon Passeport 3B et j’accepte le traitement de mes informations civiles privées pour préparer leur vérification. Une saisie de nom ou de date de naissance ne vaut pas identité vérifiée.</span></label>
      <label className="account-check optional"><input type="checkbox" checked={fields.marketingOptIn} onChange={e=>field('marketingOptIn',e.target.checked)}/><span>Je souhaite recevoir les nouveautés 3B. Facultatif.</span></label>
     </div>}

     <TurnstileField key={captchaAttempt} onToken={setCaptchaToken}/>

     <button type="submit" className="loyalty-primary" disabled={busy}>{
      busy?'Validation en cours…':
      mode==='register'?'Créer mon compte sécurisé':
      mode==='recover'?'Récupérer avec ma clé':
      mode==='reset-request'?'Envoyer le lien de récupération':
      mode==='reset-password'?'Enregistrer mon nouveau mot de passe':
      'Me connecter'
     } <ArrowUpRight size={17}/></button>
    </form>

    {mode==='login'&&<div className="account-recovery-actions">
     <button className="account-recover" onClick={()=>switchMode('reset-request')}>Mot de passe oublié ?</button>
     <button className="account-recover" onClick={()=>switchMode('recover')}>J’ai une clé de secours</button>
    </div>}
    {!['login','register'].includes(mode)&&<button className="account-recover" onClick={()=>switchMode('login')}>← Retour à la connexion</button>}
   </div>

   <div className="account-promise">
    <BoutiqueCard/>
    <h2>Ton compte, ton identité 3B.</h2>
    <p><strong>Vrai e-mail + identité déclarée privée.</strong> Ton e-mail confirme le compte ; tes prénom(s), nom et date de naissance restent privés et serviront ensuite au contrôle d’identité.</p>
    <p><strong>Déclaré ne veut pas dire vérifié.</strong> Le Passeport n’affichera “identité vérifiée” qu’après une vraie preuve externe acceptée.</p>
    <p><strong>Deux voies de récupération.</strong> E-mail pour les nouveaux comptes et clé de secours indépendante à conserver hors ligne.</p>
    <p><strong>Protection anti-abus.</strong> Limites de tentatives côté serveur, CAPTCHA activable, journal sécurité minimal et sessions Supabase.</p>
    {legacy?.isRegistered&&<p>Ton ancien profil local reste sur cet appareil et pourra être repris sans effacer tes sauvegardes.</p>}
    <p>Un Passeport actif donne accès aux jeux et au Monde du 3B. Ton compte garde ta progression et tes récompenses au même endroit.</p>
    <button onClick={()=>goTo('passport')}>Découvrir mon Passeport</button>
   </div>
  </div>}

  <section className="account-options">
   <h2>À ta façon.</h2><p>Réglages d’affichage sur cet appareil.</p>
   <div>{Object.entries(options).map(([key,value])=><button key={key} aria-pressed={value} onClick={()=>toggleOption(key)}>{OPTION_LABELS[key]} <strong>{value?'Activé':'Désactivé'}</strong></button>)}</div>
  </section>
 </section>;
}
