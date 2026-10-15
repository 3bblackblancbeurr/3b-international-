import { useCallback, useEffect, useRef, useState } from 'react';
import { blankHealth, createStepDetector, HEALTH_STORAGE_KEY, localDay, normalizeHealth, readHealth } from './model.js';

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
    try { initial.current = readHealth(window.localStorage); }
    catch { initial.current = { data: blankHealth(), saved: false, error: true }; }
  }
  const [data, setData] = useState(initial.current.data);
  const [saved, setSaved] = useState(initial.current.saved);
  const [notice, setNotice] = useState(initial.current.error ? 'La sauvegarde est indisponible. Le journal fonctionne pour cette visite.' : '');
  useEffect(() => {
    if (!saved) return;
    try { localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(normalizeHealth(data))); }
    catch { setSaved(false); setNotice('Sauvegarde impossible : tes nouvelles saisies restent seulement pour cette visite. Exporte-les avant de quitter.'); }
  }, [data, saved]);
  const updateDay = (date, patch) => setData(current => normalizeHealth({ ...current, days: { ...current.days, [date]: { ...current.days[date], ...patch } } }));
  const favorite = id => setData(current => ({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter(item => item !== id) : [...current.favorites, id] }));
  const clear = () => {
    setSaved(false); setData(blankHealth());
    try { localStorage.removeItem(HEALTH_STORAGE_KEY); }
    catch { setNotice('Journal temporaire vidé. Impossible d’effacer la copie persistante de ce navigateur : supprime les données du site dans ses réglages avant de revenir.'); return false; }
    setNotice('Journal effacé sur cet appareil.'); return true;
  };
  return { data, setData, saved, setSaved, notice, setNotice, updateDay, favorite, clear };
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
