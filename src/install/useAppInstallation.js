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
      setMessage('3B International est installée sur cet appareil.');
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
      const choice = await request.prompt();
      setMessage(choice?.outcome === 'accepted'
        ? 'Installation acceptée. L’icône 3B va apparaître avec tes applications.'
        : 'Installation annulée. Tu peux réessayer quand tu veux.');
    } catch {
      setMessage('La validation système n’a pas pu s’ouvrir. Utilise la page d’installation 3B.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { available, installed, busy, message, install };
}
