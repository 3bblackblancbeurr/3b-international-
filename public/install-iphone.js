(() => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = isIOS && /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const status = document.getElementById('device-status');
  const browserAdvice = document.getElementById('browser-advice');
  const installed = document.getElementById('installed-state');
  const copyButton = document.getElementById('copy-link');
  const shareButton = document.getElementById('share-link');
  const copyStatus = document.getElementById('copy-status');
  const nativeLinks = document.getElementById('native-links');
  const installUrl = window.location.origin + '/install-iphone.html';

  if (isStandalone) {
    installed.hidden = false;
    status.textContent = '3B est déjà installé sur cet iPhone.';
    status.dataset.state = 'ready';
  } else if (isIOS && isSafari) {
    status.textContent = 'iPhone détecté · Safari prêt pour l’installation.';
    status.dataset.state = 'ready';
  } else if (isIOS) {
    status.textContent = 'iPhone détecté · ouvre cette page dans Safari.';
    status.dataset.state = 'attention';
    browserAdvice.hidden = false;
  } else {
    status.textContent = 'Cette page est prévue pour iPhone/iPad. Tu peux quand même partager le lien.';
    status.dataset.state = 'neutral';
  }

  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      copyStatus.textContent = 'Lien copié. Ouvre Safari puis colle-le dans la barre d’adresse.';
    } catch {
      copyStatus.textContent = 'Copie cette adresse : ' + installUrl;
    }
  });

  shareButton?.addEventListener('click', async () => {
    if (!navigator.share) {
      copyButton?.click();
      return;
    }
    try {
      await navigator.share({
        title: 'Installer 3B International sur iPhone',
        text: 'Installation officielle 3B International',
        url: installUrl,
      });
      copyStatus.textContent = 'Lien partagé.';
    } catch {}
  });

  fetch('/ios-distribution.json', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .then(config => {
      if (!config) return;
      const candidates = [
        ['App Store', config.appStoreUrl],
        ['TestFlight public', config.testflightUrl],
        ['Installation Apple depuis le web', config.webDistributionUrl],
      ].filter(([, url]) => typeof url === 'string' && /^https:\/\//.test(url));
      if (!candidates.length) return;
      nativeLinks.hidden = false;
      const list = nativeLinks.querySelector('[data-native-list]');
      candidates.forEach(([label, url]) => {
        const a = document.createElement('a');
        a.className = 'native-button';
        a.href = url;
        a.rel = 'noopener';
        a.textContent = label;
        list.appendChild(a);
      });
    })
    .catch(() => {});
})();
