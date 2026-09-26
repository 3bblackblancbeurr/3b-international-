import {Activity,KeyRound,LockKeyhole,ShieldCheck,Unplug} from 'lucide-react';

export default function SecurityCenterPanel({dataAvailable,error,devices,commands,events,allowedCommands}){
 const active=(devices||[]).filter(device=>!device.revoked_at);
 const failed=(commands||[]).filter(command=>command.status==='failed');
 const allowCount=Array.isArray(allowedCommands)?allowedCommands.length:0;
 return <section className="control-section control-security-center control-hide-in-focus" id="cc-security" aria-label="Centre sécurité 3B">
  <header className="control-section-heading">
   <div><p className="control-kicker"><ShieldCheck size={13}/> SÉCURITÉ · PROPRIÉTAIRE</p><h2>Security Center</h2></div>
   <span className={'control-security-badge '+(dataAvailable&&!error?'is-good':error?'is-bad':'')}>{dataAvailable&&!error?'ACTIF':error?'DÉGRADÉ':'SYNC'}</span>
  </header>

  <div className="control-security-grid">
   <article><LockKeyhole/><span>AUTORISATION</span><strong>{dataAvailable&&!error?'Serveur actif':'À vérifier'}</strong><small>Session propriétaire contrôlée côté serveur</small></article>
   <article><KeyRound/><span>ALLOWLIST</span><strong>{allowCount||'—'}</strong><small>{allowCount?'commandes distantes fixes':'Liste non chargée'}</small></article>
   <article><Activity/><span>AUDIT</span><strong>{Array.isArray(events)?events.length:'—'}</strong><small>événements récents chargés</small></article>
   <article><Unplug/><span>APPAREILS</span><strong>{active.length}</strong><small>{failed.length?failed.length+' commandes en échec chargées':'aucun échec chargé'}</small></article>
  </div>

  <div className="control-security-guard">
   <ShieldCheck size={16}/>
   <div><strong>Barrière propriétaire</strong><small>Aucun accès ne repose sur un simple affichage frontend. Le cockpit dépend de la session propriétaire validée par le backend.</small></div>
  </div>
 </section>;
}
