import { useEffect, useRef, useState } from 'react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import { nexusProgress, enterNexusWorld } from '../passport/nexus-flow.js';

// Preserve the canonical navigation and account-safety added by PR #51.
// The graphic scene neither awards progress nor invents a separate world save.
const worldAPI = async () => {
  const [save, engine] = await Promise.all([import('../world/save.js'), import('../world/engine.js')]);
  return { ...save, applyWorldAction: engine.applyWorldAction };
};
export function useNexusJourney({ open, onClose, goTo }) {
  const account = useLoyalty();
  const uid = account?.user?.id || null, authLoading = account?.loading === true;
  const [world, setWorld] = useState(null), [message, setMessage] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retryTick, setRetryTick] = useState(0);
  const version = useRef(0), inFlight = useRef(false), current = useRef(null);
  current.current = { open, uid, authLoading, onClose, goTo };
  function close() {
    version.current += 1; inFlight.current = false;
    current.current.onClose?.();
  }
  useEffect(() => {
    const ticket = ++version.current;
    inFlight.current = false; setBusy(false); setWorld(null); setError(''); setMessage('');
    if (!open || authLoading) return undefined;
    let cancelled = false;
    worldAPI().then(api => api.loadWorld(uid)).then(result => {
      if (cancelled || ticket !== version.current) return;
      setWorld(result.data); setMessage(result.message || '');
    }).catch(() => {
      if (!cancelled && ticket === version.current) setError('La progression n’a pas pu être chargée. Réessaie ou reprends ton aventure.');
    });
    return () => { cancelled = true; version.current += 1; };
  }, [open, uid, authLoading, retryTick]);
  async function travel(destination = null) {
    if (inFlight.current || current.current.authLoading) return false;
    const ticket = version.current, owner = current.current.uid;
    const valid = () => ticket === version.current && current.current.open &&
      !current.current.authLoading && owner === current.current.uid;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (destination != null) {
        const api = await worldAPI();
        if (!valid()) return false;
        const result = await enterNexusWorld(api, owner, destination, valid);
        if (!result || !valid()) return false;
      }
      if (!valid()) return false;
      const navigate = current.current.goTo;
      close();
      if (navigate) navigate('world3b'); else window.location.hash = 'monde-3b';
      return true;
    } catch (failure) {
      if (valid()) setError(failure instanceof Error ? failure.message : 'Ce passage n’a pas pu être ouvert. Réessaie depuis le Monde 3B.');
      return false;
    } finally {
      if (valid()) { inFlight.current = false; setBusy(false); }
    }
  }
  const progress = nexusProgress(world), encounter = world?.adventure?.encounter;
  const unresolved = !!encounter && !['victory', 'recruited', 'missed', 'defeat'].includes(encounter.result);
  const resumeOrigin = !!encounter?.final && unresolved && !progress.finished;
  return { world, progress, message, error, busy, authLoading, unresolved, resumeOrigin,
    originEnabled: !!world && (progress.originReady || resumeOrigin),
    close, travel, retry: () => setRetryTick(value => value + 1) };
}
