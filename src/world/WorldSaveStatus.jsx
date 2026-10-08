import React from 'react';
import {Button} from '../design-system/index.jsx';
import {savePresentation} from './hub/save-presentation.js';
export default function WorldSaveStatus({status,message,onSync,onExport,onAccount,compact=false}){
 const view=savePresentation(status),busy=status?.outcome==='saving';
 // Dismiss only the floating warning, not the pending command journal or the
 // full save panel under Pause and options. A new pending action reopens it.
 const [dismissed,setDismissed]=React.useState(null);
 const count=status?.pendingCount||0;
 React.useEffect(()=>{if(status?.outcome==='synced'||status?.outcome==='local')setDismissed(null);},[status?.outcome]);
 if(compact&&(!view.needsAttention||(dismissed&&dismissed.scope===status?.scope&&count<=dismissed.count)))return null;
 return <section className={'hub-save-card'+(compact?' hub-save-card-compact':'')} data-tone={view.tone} aria-label="Sauvegarde de la progression">
  <div role="status" aria-live="polite" aria-atomic="true"><strong>{view.title}</strong><p>{view.detail}</p>{view.pendingCount>0&&<small>{view.pendingCount} action{view.pendingCount>1?'s':''} en attente</small>}{!compact&&status?.lastSyncedAt&&<small>Dernière confirmation : {new Date(status.lastSyncedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small>}</div>
  {compact&&<button type="button" className="hub-save-dismiss" aria-label="Masquer cet avertissement de sauvegarde" title="Voir la sauvegarde dans Pause et options" onClick={()=>setDismissed({scope:status?.scope,count})}>×</button>}
  <div className="world-actions">{status?.outcome==='auth'?<Button variant="neutral" onClick={onAccount}>Me reconnecter</Button>:<Button variant="neutral" loading={busy} onClick={onSync}>{status?.scope==='device'?'Enregistrer':view.needsAttention?'Réessayer':'Synchroniser'}</Button>}{status?.outcome==='storage'&&<Button variant="neutral" onClick={onExport}>Télécharger une copie</Button>}</div>
  {!compact&&message&&<details><summary>Détail de la sauvegarde</summary><p>{message}</p></details>}
 </section>;
}
