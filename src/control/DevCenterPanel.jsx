import {GitBranch,GitPullRequest,RefreshCw,Rocket,ShieldCheck} from 'lucide-react';

function stateLabel(value){
 if(value==='success')return 'Vert';
 if(value==='running')return 'En cours';
 if(value==='failure'||value==='timed_out')return 'Échec';
 if(value==='cancelled')return 'Annulé';
 return value||'Inconnu';
}

function time(value){
 if(!value)return '—';
 return new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}

export default function DevCenterPanel({pulse}){
 const deploymentKnown=Boolean(pulse?.deploymentAt||pulse?.deploymentStatus||pulse?.deploymentEnvironment);
 return <section className="control-section control-dev-center control-hide-in-focus" id="cc-dev" aria-label="Centre développement 3B">
  <header className="control-section-heading">
   <div><p className="control-kicker"><GitBranch size={13}/> DÉVELOPPEMENT · SOURCE GITHUB</p><h2>Dev Center</h2></div>
   <span className={'control-dev-badge '+(pulse?.github===true?'is-good':pulse?.github===false?'is-bad':'')}>{pulse?.github===true?'LIVE':pulse?.github===false?'INDISPONIBLE':'SYNC'}</span>
  </header>

  <div className="control-dev-grid">
   <article><GitBranch/><span>BRANCHE</span><strong>main</strong><small>{pulse?.commitSha||'SHA non chargé'}</small></article>
   <article><RefreshCw/><span>CI</span><strong>{stateLabel(pulse?.ci)}</strong><small>{pulse?.workflow||'Workflow non chargé'}</small></article>
   <article><GitPullRequest/><span>PR OUVERTES</span><strong>{Number.isFinite(pulse?.openPrCount)?pulse.openPrCount:'—'}</strong><small>{Number.isFinite(pulse?.openPrCount)?'Comptage GitHub réel':'Donnée indisponible'}</small></article>
   <article><Rocket/><span>DÉPLOIEMENT</span><strong>{deploymentKnown?(pulse?.deploymentStatus||pulse?.deploymentEnvironment||'Détecté'):'Non exposé'}</strong><small>{deploymentKnown?time(pulse?.deploymentAt):'Aucun déploiement GitHub public détecté'}</small></article>
  </div>

  <div className="control-dev-release">
   <div><span>DERNIER COMMIT MAIN</span><strong>{pulse?.commit||'Aucun commit chargé.'}</strong></div>
   <small>{pulse?.checkedAt?'Vérifié '+time(pulse.checkedAt):'GitHub pas encore vérifié'}</small>
  </div>

  <p className="control-dev-truth"><ShieldCheck size={14}/><span>Ce panneau ne transforme pas l’état GitHub en faux état Vercel : l’API Vercel complète reste distincte tant qu’elle n’est pas connectée.</span></p>
 </section>;
}
