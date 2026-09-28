import {useEffect,useState} from 'react';
import {Fingerprint,KeyRound,LogOut,RefreshCw,ShieldCheck,Trash2} from 'lucide-react';
import {authClient,PASSKEYS_ENABLED,register3BPasskey,list3BPasskeys,delete3BPasskey} from './client.js';
import {Button} from '../design-system/index.jsx';

const date=value=>value?new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'}):'—';
const verificationLabel=status=>({
 verified:'Vérifiée',
 pending:'Vérification en cours',
 review_required:'Contrôle complémentaire requis',
 rejected:'Non validée',
 expired:'À renouveler',
 revoked:'Révoquée',
 unverified:'Non vérifiée',
}[status]||'Non vérifiée');

export default function AccountSecurityPanel({passport,emailVerified=false}){
 const[passkeys,setPasskeys]=useState([]);
 const[busy,setBusy]=useState('');
 const[notice,setNotice]=useState('');
 const[error,setError]=useState('');

 const refresh=async()=>{
  if(!PASSKEYS_ENABLED){setPasskeys([]);return;}
  setBusy('list');setError('');
  try{setPasskeys(await list3BPasskeys());}
  catch(e){setError(e.message||'Impossible de charger les passkeys.');}
  finally{setBusy('');}
 };

 useEffect(()=>{refresh();},[]);

 const revokeOthers=async()=>{
  if(busy)return;
  setBusy('sessions');setNotice('');setError('');
  try{
   const{error:signOutError}=await authClient.auth.signOut({scope:'others'});
   if(signOutError)throw signOutError;
   setNotice('Les autres sessions 3B ont été déconnectées. Cet appareil reste connecté.');
  }catch(e){setError(e.message||'Impossible de révoquer les autres sessions.');}
  finally{setBusy('');}
 };

 const addPasskey=async()=>{
  if(busy||!PASSKEYS_ENABLED)return;
  setBusy('add');setNotice('');setError('');
  try{await register3BPasskey();setNotice('Passkey 3B ajoutée à ton compte.');await refresh();}
  catch(e){setError(e.message||'Création de la passkey annulée ou indisponible.');setBusy('');}
 };

 const removePasskey=async id=>{
  if(busy||!PASSKEYS_ENABLED)return;
  setBusy(id);setNotice('');setError('');
  try{await delete3BPasskey(id);setNotice('Passkey supprimée.');await refresh();}
  catch(e){setError(e.message||'Impossible de supprimer cette passkey.');setBusy('');}
 };

 const identityStatus=passport?.identityVerificationStatus||'unverified';

 return <section className="account-command-center" aria-labelledby="account-security-title">
  <div className="account-command-heading">
   <div><span className="loyalty-eyebrow">SÉCURITÉ DU PASSEPORT</span><h2 id="account-security-title">Preuves & accès</h2></div>
   <ShieldCheck size={28}/>
  </div>
  <div className="account-summary">
   <p><ShieldCheck size={16}/> E-mail : <strong>{emailVerified?'vérifié':'non vérifié'}</strong></p>
   <p><ShieldCheck size={16}/> Passeport : <strong>{passport?.passportState==='active'?'actif':passport?.passportState||'indisponible'}</strong></p>
   <p><ShieldCheck size={16}/> Identité civile : <strong>{verificationLabel(identityStatus)}</strong></p>
   {passport?.civilIdentityVerified&&<p>Preuve d’identité civile valide · niveau {passport.identityAssuranceLevel||'document'}.</p>}
   {!passport?.civilIdentityVerified&&<p>Le nom du profil n’est pas une preuve d’identité. Le statut ne deviendra « Vérifiée » qu’après un contrôle d’identité réel par un service de vérification configuré.</p>}
  </div>
  <div className="member-actions">
   <Button variant="champagne" className="surface-button" onClick={revokeOthers} disabled={!!busy}>
    <LogOut size={17}/>{busy==='sessions'?'Révocation…':'Déconnecter les autres appareils'}
   </Button>
   {PASSKEYS_ENABLED&&<Button variant="ghost" className="surface-button" onClick={addPasskey} disabled={!!busy}>
    <Fingerprint size={17}/>{busy==='add'?'Création…':'Ajouter une passkey'}
   </Button>}
   {PASSKEYS_ENABLED&&<Button variant="ghost" className="quiet-button" onClick={refresh} disabled={!!busy}><RefreshCw size={16}/>Actualiser</Button>}
  </div>
  {!PASSKEYS_ENABLED&&<p className="muted-copy"><KeyRound size={15}/> Les passkeys sont préparées mais désactivées tant que le domaine WebAuthn 3B permanent n’est pas verrouillé.</p>}
  {PASSKEYS_ENABLED&&<div className="account-passkey-list">
   {passkeys.length?passkeys.map(item=><article key={item.id}>
    <div><strong>{item.friendly_name||'Passkey 3B'}</strong><small>Créée {date(item.created_at)}{item.last_used_at?' · utilisée '+date(item.last_used_at):''}</small></div>
    <Button variant="ghost" className="quiet-button" aria-label="Supprimer cette passkey" onClick={()=>removePasskey(item.id)} disabled={!!busy}><Trash2 size={16}/></Button>
   </article>):<p>Aucune passkey enregistrée.</p>}
  </div>}
  {notice&&<p className="account-success" role="status">{notice}</p>}
  {error&&<p className="loyalty-notice" role="alert">{error}</p>}
 </section>;
}
