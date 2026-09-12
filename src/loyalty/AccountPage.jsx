import React,{useState} from 'react';
import {ArrowUpRight,Download,KeyRound,LogOut,ShieldCheck} from 'lucide-react';
import {COUNTRIES,accountEmail,validateAccount} from '../../shared/loyalty.js';
import {authClient,memberRequest} from './client.js';
import {useLoyalty} from './LoyaltyContext.jsx';
import BoutiqueCard from './BoutiqueCard.jsx';
import './boutique-loyalty.css';
import {RewardStats} from './LoyaltyPage.jsx';
import {OPTION_LABELS} from '../lib/member.js';
import './loyalty.css';
export default function AccountPage({legacy,options,toggleOption,goTo}){
 const account=useLoyalty(),{profile}=account;
 const[mode,setMode]=useState(()=>{try{return sessionStorage.getItem('3b-auth-intent')==='register'?'register':'login';}catch{return 'login';}}),[fields,setFields]=useState({handle:'',password:'',name:legacy?.name||'',country:legacy?.originCountry||'France',recovery:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState('');
 const field=(key,value)=>{setFields(f=>({...f,[key]:value}));setError('');};
 const submit=async event=>{
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const input=validateAccount(fields);
   if(mode==='register'){const result=await memberRequest('register',input);setRecovery(result.recovery);}
   if(mode==='recover'){
    const result=await memberRequest('recover',{...input,recovery:fields.recovery});setRecovery(result.recovery);
    const {error:sessionError}=await authClient.auth.setSession(result.session);if(sessionError)throw sessionError;
   }else{
    const {error:loginError}=await authClient.auth.signInWithPassword({email:accountEmail(input.handle),password:input.password});
    if(loginError)throw Error(mode==='register'?'Ton compte est créé. Conserve ta clé puis réessaie de te connecter.':'Identifiant ou mot de passe incorrect.');
   }
   setFields(f=>({...f,password:'',recovery:''}));
  }catch(e){setError(e.message||'Connexion indisponible. Réessaie.');}finally{setBusy(false);}
 };
 const downloadRecovery=()=>{const url=URL.createObjectURL(new Blob(['CLÉ DE SECOURS 3B — À CONSERVER EN PRIVÉ\nIdentifiant : '+(profile?.handle||fields.handle)+'\nClé : '+recovery+'\n\nCette clé permet de remplacer ton mot de passe. Ne la partage avec personne.\nhttps://3b-international.vercel.app/#membre'],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='3b-cle-de-secours.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const logout=async()=>{setError('');const{error}=await authClient.auth.signOut();if(error)setError('La déconnexion a échoué. Réessaie.');else setRecovery('');};
 return <section className="loyalty-page account-page"><header className="loyalty-intro"><span className="loyalty-eyebrow">3B INTERNATIONAL / MON COMPTE</span><button onClick={()=>goTo('loyalty')}>Mes cartes <ArrowUpRight size={16}/></button></header>
  <h1>{profile?'Bienvenue, '+profile.name+'.':'Entre dans le Cercle.'}</h1><p className="account-lead">Un compte pour tes cartes, tes jeux et tes avantages. Retrouve ta progression sur tes appareils.</p>
  {recovery&&<section className="recovery-panel" aria-label="Clé de secours"><KeyRound/><div><h2>Conserve ta clé de secours.</h2><p>Elle permet de retrouver ton compte si tu oublies ton mot de passe. Télécharge-la et garde-la en privé. Elle ne sera plus affichée après le rechargement de cette page.</p><code>{recovery}</code><button className="loyalty-primary" onClick={downloadRecovery}><Download size={17}/> Télécharger ma clé</button></div></section>}
  {(error||account.error)&&<p className="loyalty-notice" role="alert">{error||account.error}{account.error&&<button onClick={account.refresh}>Réessayer</button>}</p>}
  {account.loading?<p role="status">Ouverture de ton compte…</p>:account.user&&!profile?<div className="loyalty-empty"><p>Synchronisation de ton compte…</p><button onClick={account.refresh}>Réessayer</button><button onClick={logout}>Se déconnecter</button></div>:profile?<>
   {(()=>{try{return sessionStorage.getItem('3b-community-intent')==='chat';}catch{return false;}})()&&<button className="surface-button account-community-return" onClick={()=>{try{sessionStorage.removeItem('3b-auth-intent');}catch{}goTo('community');}}>Continuer vers la communauté <ArrowUpRight size={17}/></button>}
   <div className="account-dashboard"><div><BoutiqueCard profile={profile}/><p className="account-boutique-label">Ta carte de fidélité boutique · vêtements et accessoires</p><RewardStats profile={profile}/></div><article className="account-summary"><span className="loyalty-eyebrow">MEMBRE DU CERCLE</span><h2>@{profile.handle}</h2><div className="loyalty-numbers"><div><span>EXPÉRIENCE</span><strong>{profile.xp} <small>XP</small></strong></div><div><span>FIDÉLITÉ</span><strong>{profile.points} <small>points</small></strong></div></div><p><ShieldCheck size={16}/> Compte synchronisé en ligne</p><p>{profile.country} · Depuis le {new Date(profile.created_at).toLocaleDateString('fr-FR')}</p><p className="account-id">N° membre : {profile.user_id.toUpperCase()}</p><button className="loyalty-primary" onClick={()=>goTo('loyalty')}>Mes cartes et avantages <ArrowUpRight size={16}/></button><button onClick={()=>goTo('games')}>Jouer et gagner de l’XP</button><button onClick={()=>goTo('passport')}>Voir mon passeport</button><button className="account-logout" onClick={logout}><LogOut size={16}/> Se déconnecter</button><a className="account-delete-link" href="/delete-account.html">Supprimer mon compte et mes données</a></article></div>
  </>:<div className="account-entry"><div className="account-form-panel"><div className="account-tabs" role="group" aria-label="Accéder au compte"><button aria-pressed={mode==='login'} onClick={()=>{setMode('login');setError('');}}>Connexion</button><button aria-pressed={mode==='register'} onClick={()=>{setMode('register');setError('');}}>Créer un compte</button></div><h2>{mode==='register'?'Ta prochaine aventure commence ici.':mode==='recover'?'Retrouver mon compte':'Heureux de te retrouver.'}</h2><form onSubmit={submit}>
   <label>Identifiant 3B<input name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-z0-9][a-z0-9._\-]{2,23}" autoCapitalize="none" spellCheck="false" placeholder="Exemple : kais3b" value={fields.handle} onChange={e=>field('handle',e.target.value.toLowerCase())}/><small>3 à 24 lettres minuscules, chiffres, points ou tirets.</small></label>
   {mode==='register'&&<><label>Nom sur ta carte<input name="nickname" autoComplete="nickname" required minLength={2} maxLength={80} placeholder="Ton nom affiché" value={fields.name} onChange={e=>field('name',e.target.value)}/></label><label>Pays d’origine<select value={fields.country} onChange={e=>field('country',e.target.value)}>{COUNTRIES.map(c=><option key={c}>{c}</option>)}</select></label></>}
   {mode==='recover'&&<label>Clé de secours<textarea required autoComplete="off" spellCheck="false" value={fields.recovery} onChange={e=>field('recovery',e.target.value)} placeholder="La clé téléchargée à la création de ton compte"/></label>}
   <label>{mode==='recover'?'Nouveau mot de passe':'Mot de passe'}<input type="password" name="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={12} maxLength={128} value={fields.password} onChange={e=>field('password',e.target.value)}/><small>Au moins 12 caractères.</small></label>
   <button type="submit" className="loyalty-primary" disabled={busy}>{busy?'Connexion en cours…':mode==='register'?'Créer mon compte gratuit':mode==='recover'?'Récupérer mon compte':'Me connecter'} <ArrowUpRight size={17}/></button>
  </form><button className="account-recover" onClick={()=>{setMode(mode==='recover'?'login':'recover');setError('');}}>{mode==='recover'?'Retour à la connexion':'Mot de passe oublié ?'}</button></div><div className="account-promise"><BoutiqueCard/><h2>Ton compte, ton identité 3B.</h2><p>Un identifiant et un mot de passe suffisent. Une clé de secours te permettra de récupérer ton compte sans dépendre d’un e-mail.</p>{legacy?.isRegistered&&<p>Ton ancien profil reste sur cet appareil. Son nom et son pays sont préremplis à l’inscription. Tes sauvegardes de jeux seront reprises lors de ta première ouverture des jeux avec le compte.</p>}<p>Les jeux restent accessibles sans connexion. Connecte-toi pour cumuler tes nouvelles récompenses et retrouver tes sauvegardes sur un autre appareil.</p><button onClick={()=>goTo('games')}>Continuer à jouer librement</button></div></div>}
  <section className="account-options"><h2>À ta façon.</h2><p>Réglages d’affichage sur cet appareil.</p><div>{Object.entries(options).map(([key,value])=><button key={key} aria-pressed={value} onClick={()=>toggleOption(key)}>{OPTION_LABELS[key]} <strong>{value?'Activé':'Désactivé'}</strong></button>)}</div></section>
 </section>;
}
