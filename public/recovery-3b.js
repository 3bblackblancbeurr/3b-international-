(() => {
  const button = document.getElementById("repair");
  const status = document.getElementById("status");
  if (!button || !status) return;

  async function repair() {
    button.disabled = true;
    status.textContent = "Vérification de l’ancienne installation…";

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          try {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
            await registration.unregister();
          } catch {
            // Continue with other registrations.
          }
        }
      }

      status.textContent = "Nettoyage des anciens fichiers temporaires…";
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }

      status.textContent = "Chargement de la dernière version 3B…";
      const next = new URL("/", window.location.origin);
      next.searchParams.set("3b-recovered", Date.now().toString());
      window.setTimeout(() => window.location.replace(next.toString()), 250);
    } catch {
      status.textContent = "La réparation automatique n’a pas pu se terminer. Ferme 3B complètement, rouvre ce lien dans ton navigateur puis réessaie.";
      button.disabled = false;
    }
  }

  button.addEventListener("click", repair);
})();
