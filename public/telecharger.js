(() => {
  const button = document.getElementById("install3b");
  const continueLink = document.getElementById("continue3b");
  const status = document.getElementById("install-status");
  const iosHelp = document.getElementById("ios-help");
  const fallbackHelp = document.getElementById("fallback-help");
  const installedPanel = document.getElementById("installed-panel");

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  let deferredPrompt = null;
  let readyTimer = null;

  function setStatus(message) {
    status.textContent = message || "";
  }

  function showInstalled() {
    button.hidden = true;
    iosHelp.hidden = true;
    fallbackHelp.hidden = true;
    installedPanel.hidden = false;
    setStatus("3B International est installée sur cet appareil.");
  }

  function prepareFallback() {
    if (isStandalone()) return showInstalled();
    if (!deferredPrompt) {
      button.disabled = false;
      button.textContent = isIOS ? "Installer 3B sur iPhone" : "Installer 3B International";
      setStatus(isIOS
        ? "Sur iPhone, Apple demande l’ajout depuis Safari."
        : "Appuie sur Installer. Si le navigateur autorise l’installation directe, sa fenêtre de validation s’ouvrira.");
    }
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }

  if (isStandalone()) {
    showInstalled();
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    clearTimeout(readyTimer);
    button.disabled = false;
    button.textContent = "Installer 3B International";
    iosHelp.hidden = true;
    fallbackHelp.hidden = true;
    setStatus("Prêt. Une seule validation système sera demandée par ton navigateur.");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    showInstalled();
  });

  button.addEventListener("click", async () => {
    if (isStandalone()) {
      showInstalled();
      return;
    }

    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      button.disabled = true;
      button.textContent = "Validation…";
      setStatus("");
      try {
        const choice = await prompt.prompt();
        if (choice?.outcome === "accepted") {
          button.textContent = "Installation en cours…";
          setStatus("Installation acceptée. L’icône 3B va apparaître avec tes applications.");
        } else {
          button.disabled = false;
          button.textContent = "Installer 3B International";
          setStatus("Installation annulée. Tu peux réessayer quand tu veux.");
        }
      } catch {
        button.disabled = false;
        button.textContent = "Installer 3B International";
        fallbackHelp.hidden = false;
        setStatus("Le navigateur n’a pas ouvert la validation automatiquement.");
      }
      return;
    }

    if (isIOS) {
      iosHelp.hidden = false;
      fallbackHelp.hidden = true;
      setStatus("Apple ne permet pas à une page web de déclencher automatiquement le bouton « Ajouter ». Voici le parcours le plus court.");
      iosHelp.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    fallbackHelp.hidden = false;
    iosHelp.hidden = true;
    setStatus(isAndroid
      ? "Ton navigateur ne fournit pas la fenêtre d’installation directe ici. Ouvre cette page dans Chrome ou Samsung Internet."
      : "Utilise l’option d’installation de ton navigateur.");
    fallbackHelp.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  continueLink.addEventListener("click", () => {
    window.location.href = "/";
  });

  readyTimer = window.setTimeout(prepareFallback, 1800);
})();
