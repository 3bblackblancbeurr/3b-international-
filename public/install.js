(() => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const box = document.getElementById('device-recommendation');
  const title = document.getElementById('device-title');
  const copy = document.getElementById('device-copy');
  const link = document.getElementById('device-link');
  if (!box || !title || !copy || !link) return;

  if (isIOS) {
    box.hidden = false;
    box.dataset.platform = 'ios';
    title.textContent = 'iPhone / iPad détecté';
    copy.textContent = 'Le chemin le plus simple est prêt : Safari → Sur l’écran d’accueil → Ouvrir comme app web.';
    link.href = '/iphone';
    link.textContent = 'Continuer sur iPhone';
  } else if (isAndroid) {
    box.hidden = false;
    box.dataset.platform = 'android';
    title.textContent = 'Android détecté';
    copy.textContent = 'Ouvre le guide Android pour installer 3B depuis Chrome ou Samsung Internet.';
    link.href = '/android';
    link.textContent = 'Continuer sur Android';
  }
})();
