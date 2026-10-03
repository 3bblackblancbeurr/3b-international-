(() => {
  let prompt = null;
  let busy = false;
  let installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const status = document.getElementById('install-status');
  const buttons = [...document.querySelectorAll('[data-install]')];
  window.addEventListener('beforeinstallprompt', event => {
    if (typeof event.prompt !== 'function') return;
    event.preventDefault();
    prompt = event;
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    prompt = null;
    status.textContent = '3B est installé. Ouvre son icône.';
  });
  buttons.forEach(button => button.addEventListener('click', async () => {
    if (busy) return;
    if (installed) { window.location.assign('/'); return; }
    const platform = button.dataset.install;
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const matching = platform === 'android' ? android : !ios && !android;
    if (!matching) {
      status.textContent = platform === 'pc' ? 'Ouvre 3B sur ton PC pour l’installer.' : 'Ouvre 3B sur ton téléphone Android pour l’installer.';
      return;
    }
    if (!prompt) {
      status.textContent = platform === 'pc'
        ? 'Dans Chrome ou Edge : menu ⋮ → Installer 3B (ou Installer cette page en tant qu’application).'
        : 'Dans Chrome ou Samsung Internet : menu ⋮ → Installer l’application / Ajouter à l’écran d’accueil.';
      return;
    }
    const request = prompt;
    prompt = null;
    busy = true;
    buttons.forEach(item => { item.disabled = true; });
    try {
      await request.prompt();
      const choice = await request.userChoice;
      status.textContent = choice?.outcome === 'accepted' ? 'Installation demandée. Confirme dans la fenêtre du navigateur.' : 'Installation annulée. Tu peux continuer sur le site.';
    } catch {
      status.textContent = 'Utilise le menu de ton navigateur → Installer l’application.';
    } finally {
      busy = false;
      buttons.forEach(item => { item.disabled = false; });
    }
  }));
})();
