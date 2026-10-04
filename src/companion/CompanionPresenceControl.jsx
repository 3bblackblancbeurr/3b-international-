import { useId } from 'react';
import { Button } from '../design-system/index.jsx';
import { companionPreferences } from './companion-preferences.js';
import { companionNativePresence, useCompanionNativePresence, useCompanionPreferences } from './useCompanionPreferences.js';
import '../styles/companion-controls.css';

export default function CompanionPresenceControl({ action = 'enable', onDisable }) {
  const prefs = useCompanionPreferences();
  const native = useCompanionNativePresence();
  const descriptionId = useId();
  const disabling = action === 'disable';
  return <div className="companion3b-presence-control" data-companion-avoid>
    <label className="companion3b-presence-choice">
      <span><strong>{disabling ? 'Désactiver le compagnon' : 'Activer le compagnon'}</strong>
        <small id={descriptionId}>{disabling ? 'Retrouve-le dans Menu → Paramètres.' : prefs.enabled ? 'Il t’accompagne dans 3B.' : 'Sa personnalité, sa voix et votre lien sont conservés.'}</small>
      </span>
      <input type="checkbox" aria-describedby={descriptionId} checked={disabling ? !prefs.enabled : prefs.enabled} onChange={event => {
        const enabled = disabling ? !event.target.checked : event.target.checked;
        if (!enabled && onDisable) onDisable();
        else companionPreferences.update({ enabled });
      }}/>
    </label>
    {(native.stopPending || native.stopFailed) && <p className="companion3b-presence-notice" role="status" aria-live="polite">{native.status}</p>}
    {native.stopFailed && <Button variant="ghost" className="companion3b-presence-retry" disabled={native.busy} onClick={() => { void companionNativePresence.requestStop(); }}>Réessayer l’arrêt hors de l’app</Button>}
  </div>;
}
