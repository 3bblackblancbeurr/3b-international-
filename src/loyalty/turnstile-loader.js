const SCRIPT_ID = 'threeb-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Share one request across form remounts, and allow retry after a failed request.
export function createTurnstileLoader({ window, document, timeoutMs = 15000 }) {
  let pending = null;
  return function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (pending) return pending;
    const request = new Promise((resolve, reject) => {
      let script = document.getElementById(SCRIPT_ID);
      const created = !script;
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;
      }
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        script.removeEventListener('load', ready);
        script.removeEventListener('error', failed);
        if (error) {
          script.remove();
          reject(error);
        } else resolve(window.turnstile);
      };
      const failed = () => finish(new Error('La vérification anti-robot est indisponible. Réessaie.'));
      const ready = () => window.turnstile ? finish() : failed();
      const timer = window.setTimeout(failed, timeoutMs);
      script.addEventListener('load', ready, { once: true });
      script.addEventListener('error', failed, { once: true });
      if (created) document.head.appendChild(script);
    });
    pending = request;
    const clear = () => { if (pending === request) pending = null; };
    request.then(clear, clear);
    return request;
  };
}
