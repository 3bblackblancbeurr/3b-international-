import { useCallback, useEffect, useRef, useState } from 'react';
import { blankHealth, createStepDetector, HEALTH_STORAGE_KEY, localDay, normalizeHealth, readHealth } from './model.js';
import { HEALTH_VAULT_KEY, createHealthVault, openHealthVault, sealHealthVault } from './secureVault.js';

export function useToday() {
  const [today, setToday] = useState(localDay());
  useEffect(() => {
    const update = () => setToday(localDay());
    const timer = setInterval(update, 15000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return today;
}

export function useHealth() {
  const initial = useRef(null);
  if (!initial.current) {
    try {
      const vaultPresent = Boolean(window.localStorage.getItem(HEALTH_VAULT_KEY));
      const legacy = vaultPresent
        ? { data: blankHealth(), saved: false, error: false }
        : readHealth(window.localStorage);
      initial.current = {
        ...legacy,
        mode: vaultPresent ? 'locked' : legacy.saved ? 'legacy' : 'temporary',
      };
    } catch {
      initial.current = { data: blankHealth(), saved: false, error: true, mode: 'temporary' };
    }
  }
  const [data, setData] = useState(initial.current.data);
  const [saved, setSaved] = useState(initial.current.saved);
  const [vaultMode, setVaultMode] = useState(initial.current.mode);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(initial.current.error
    ? 'Sauvegarde indisponible : le journal reste temporaire pour cette visite.'
    : initial.current.mode === 'legacy'
      ? 'Ancienne sauvegarde Santé non chiffrée : protège-la depuis Mon journal & mes données.'
      : '');
  const keyRef = useRef(null);
  const saltRef = useRef('');
  const revisionRef = useRef(0);

  useEffect(() => {
    if (!saved) return;
    if (vaultMode === 'legacy') {
      // Compatibilité : ne jamais effacer silencieusement les données des membres existants.
      try { localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(normalizeHealth(data))); }
      catch { setSaved(false); setNotice('Sauvegarde impossible : tes saisies restent temporaires. Exporte-les avant de quitter.'); }
      return;
    }
    if (vaultMode !== 'unlocked' || !keyRef.current) return;
    const revision = ++revisionRef.current;
    setSaving(true);
    void sealHealthVault(normalizeHealth(data), keyRef.current, saltRef.current)
      .then(envelope => {
        if (revisionRef.current !== revision) return;
        localStorage.setItem(HEALTH_VAULT_KEY, JSON.stringify(envelope));
        setSaving(false);
      })
      .catch(() => {
        if (revisionRef.current !== revision) return;
        setSaving(false);
        setNotice('Le coffre n’a pas pu être actualisé. Ne ferme pas la page : vérifie le stockage ou exporte tes données.');
      });
  }, [data, saved, vaultMode]);

  async function enableSecureSave(passphrase) {
    if (vaultMode === 'locked') throw new Error('Déverrouille le coffre existant avant de créer une sauvegarde.');
    const snapshot = normalizeHealth(data);
    const revision = ++revisionRef.current;
    const { envelope, key } = await createHealthVault(snapshot, passphrase);
    if (revisionRef.current !== revision) throw new Error('Le journal a changé. Recommence la sauvegarde.');
    const storage = window.localStorage;
    storage.setItem(HEALTH_VAULT_KEY, JSON.stringify(envelope));
    try {
      // Suppression de l'ancienne copie seulement une fois le coffre écrit.
      storage.removeItem(HEALTH_STORAGE_KEY);
    } catch {
      try { storage.removeItem(HEALTH_VAULT_KEY); } catch { /* avertir, sans effacer l'original */ }
      throw new Error('Ancienne copie non chiffrée non effacée. Vérifie les données du navigateur.');
    }
    keyRef.current = key;
    saltRef.current = envelope.salt;
    setVaultMode('unlocked');
    setSaved(true);
    setNotice('Coffre Santé chiffré sur cet appareil. Garde ta phrase secrète en lieu sûr.');
    return true;
  }

  async function unlockSecureSave(passphrase) {
    const raw = window.localStorage.getItem(HEALTH_VAULT_KEY);
    if (!raw) throw new Error('Aucun coffre chiffré trouvé sur cet appareil.');
    let envelope;
    try { envelope = JSON.parse(raw); }
    catch { throw new Error('Coffre illisible. Aucune donnée n’a été effacée.'); }
    const { data: decrypted, key } = await openHealthVault(envelope, passphrase);
    ++revisionRef.current;
    keyRef.current = key;
    saltRef.current = envelope.salt;
    setData(normalizeHealth(decrypted));
    setSaved(true);
    setVaultMode('unlocked');
    setNotice('Coffre Santé déverrouillé. Tes données restent sur cet appareil.');
    return true;
  }

  async function importEncryptedVault(raw, passphrase) {
    if (vaultMode !== 'temporary') throw new Error('Protège ou supprime le journal actuel avant de restaurer un autre coffre.');
    let envelope;
    try { envelope = JSON.parse(raw); } catch { throw new Error('Fichier de coffre invalide.'); }
    const { data: restored, key } = await openHealthVault(envelope, passphrase);
    const storage = window.localStorage;
    if (storage.getItem(HEALTH_STORAGE_KEY) || storage.getItem(HEALTH_VAULT_KEY)) {
      throw new Error('Un ancien coffre est déjà présent. Aucune donnée n’a été remplacée.');
    }
    storage.setItem(HEALTH_VAULT_KEY, JSON.stringify(envelope));
    ++revisionRef.current;
    keyRef.current = key;
    saltRef.current = envelope.salt;
    setData(normalizeHealth(restored));
    setVaultMode('unlocked');
    setSaved(true);
    setNotice('Coffre chiffré restauré localement. Aucun fichier envoyé à 3B.');
    return true;
  }

  async function lockSecureSave() {
    if (vaultMode !== 'unlocked' || !keyRef.current) return false;
    const revision = ++revisionRef.current; // annule les écritures asynchrones plus anciennes
    setSaving(true);
    try {
      const envelope = await sealHealthVault(normalizeHealth(data), keyRef.current, saltRef.current);
      if (revision !== revisionRef.current) throw new Error('La session a changé.');
      window.localStorage.setItem(HEALTH_VAULT_KEY, JSON.stringify(envelope));
      keyRef.current = null;
      saltRef.current = '';
      setSaved(false);
      setData(blankHealth());
      setVaultMode('locked');
      setNotice('');
      return true;
    } finally { setSaving(false); }
  }

  const updateDay = (date, patch) => setData(current => normalizeHealth({ ...current, days: { ...current.days, [date]: { ...current.days[date], ...patch } } }));
  const favorite = id => setData(current => ({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter(item => item !== id) : [...current.favorites, id] }));
  const clear = () => {
    ++revisionRef.current;
    keyRef.current = null;
    saltRef.current = '';
    setSaved(false);
    setSaving(false);
    setData(blankHealth());
    try {
      window.localStorage.removeItem(HEALTH_STORAGE_KEY);
      window.localStorage.removeItem(HEALTH_VAULT_KEY);
      if (window.localStorage.getItem(HEALTH_STORAGE_KEY) || window.localStorage.getItem(HEALTH_VAULT_KEY)) {
        throw new Error('Deletion not confirmed');
      }
    } catch {
      setVaultMode('locked');
      setNotice('Journal temporaire vidé, mais suppression du stockage non confirmée. Efface les données du site dans les réglages du navigateur.');
      return false;
    }
    setVaultMode('temporary');
    setNotice('Journal et coffre local effacés sur cet appareil.');
    return true;
  };
  return {
    data, setData, saved, vaultMode, saving, notice, setNotice, updateDay, favorite, clear,
    enableSecureSave, unlockSecureSave, lockSecureSave, importEncryptedVault,
  };
}

export function useStepSession() {
  const [status, setStatus] = useState('idle');
  const [steps, setSteps] = useState(0);
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(localDay());
  const cleanup = useRef(() => {});
  const running = useRef(false);
  const stop = useCallback(() => { running.current = false; cleanup.current(); setStatus('paused'); }, []);
  useEffect(() => {
    const hidden = () => { if (document.hidden && running.current) { stop(); setMessage('Session mise en pause : le compteur web nécessite un écran ouvert.'); } };
    document.addEventListener('visibilitychange', hidden);
    return () => { running.current = false; cleanup.current(); document.removeEventListener('visibilitychange', hidden); };
  }, [stop]);
  async function start() {
    if (running.current) return;
    if (steps > 0 && date !== localDay()) { setMessage('Une nouvelle journée a commencé. Enregistre ou efface la session précédente avant de recommencer.'); return; }
    if (!window.isSecureContext || typeof window.DeviceMotionEvent === 'undefined') { setStatus('unavailable'); setMessage('Capteur indisponible ici. Tu peux reporter le total de ton téléphone dans la saisie manuelle.'); return; }
    running.current = true; setStatus('requesting'); setMessage('');
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function' && await DeviceMotionEvent.requestPermission() !== 'granted') {
        running.current = false; setStatus('denied'); setMessage('Accès aux mouvements refusé. La saisie manuelle reste disponible.'); return;
      }
      if (!running.current || document.hidden) { running.current = false; setStatus('paused'); return; }
      cleanup.current(); if (steps === 0) setDate(localDay()); setStatus('listening');
      const sessionDate = steps === 0 ? localDay() : date;
      const detector = createStepDetector(); let gotData = false;
      const onMotion = event => {
        if (localDay() !== sessionDate) { stop(); setMessage('Nouvelle journée : session mise en pause. Enregistre ces pas pour la journée précédente avant de recommencer.'); return; }
        const value = event.accelerationIncludingGravity;
        if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) return;
        gotData = true; setStatus('active');
        if (detector(value.x, value.y, value.z, performance.now())) setSteps(current => current + 1);
      };
      window.addEventListener('devicemotion', onMotion, { passive: true });
      const timeout = window.setTimeout(() => {
        if (!gotData) { stop(); setStatus('unavailable'); setMessage('Aucune donnée de mouvement reçue. Utilise la saisie manuelle ou vérifie les permissions du navigateur.'); }
      }, 6000);
      cleanup.current = () => { window.removeEventListener('devicemotion', onMotion); clearTimeout(timeout); };
    } catch { running.current = false; setStatus('unavailable'); setMessage('Le navigateur ne permet pas cette mesure. La saisie manuelle reste disponible.'); }
  }
  const reset = () => { stop(); setSteps(0); setStatus('idle'); setMessage(''); };
  return { status, steps, message, date, start, stop, reset, running: ['requesting','listening','active'].includes(status) };
}
