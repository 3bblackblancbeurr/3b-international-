import { useEffect, useRef, useState } from 'react';

// Keep the browser's one-use prompt at App level, including while visiting games.
export function useAppInstallation() {
  const prompt = useRef(null);
  const pending = useRef(false);
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    function ready(event) {
      if (typeof event.prompt !== 'function') return;
      event.preventDefault();
      prompt.current = event;
      setAvailable(true);
      setMessage('');
    }
    function completed() {
      prompt.current = null;
      setAvailable(false);
      setInstalled(true);
    }
    function displayChanged() {
      setInstalled(display.matches || window.navigator.standalone === true);
    }
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', completed);
    display.addEventListener('change', displayChanged);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', completed);
      display.removeEventListener('change', displayChanged);
    };
  }, []);

  async function install() {
    if (pending.current || !prompt.current) return;
    const request = prompt.current;
    prompt.current = null;
    pending.current = true;
    setAvailable(false);
    setBusy(true);
    setMessage('');
    try {
      // Call within the button gesture; the browser still asks for confirmation.
      await request.prompt();
      const choice = await request.userChoice;
      setMessage(choice?.outcome === 'accepted'
        ? 'Installation demandée. Termine les étapes affichées par ton navigateur.'
        : 'Installation annulée. Tu peux continuer à utiliser 3B ici.');
    } catch {
      setMessage('La fenêtre d’installation n’a pas pu s’ouvrir. Utilise l’aide ci-dessous ou le menu de ton navigateur.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { available, installed, busy, message, install };
}
