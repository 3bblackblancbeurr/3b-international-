/**
 * Serializes native presence operations independently of the floating UI.
 * Local disable is immediate; a pending native start is followed by a stop.
 */
export function createCompanionNativePresence({ preferences, native }) {
  const platform = native.companionPlatform();
  const listeners = new Set();
  let snapshot = Object.freeze({ capabilities: null, busy: false, status: '', stopPending: false, stopFailed: false });
  let operation = null;
  let shutdown = null;
  let generation = 0;
  let refreshId = 0;
  let previousEnabled = preferences.getSnapshot().enabled;

  function publish(patch) {
    if (Object.keys(patch).every(key => snapshot[key] === patch[key])) return;
    snapshot = Object.freeze({ ...snapshot, ...patch });
    for (const listener of [...listeners]) listener();
  }

  function setStatus(status) {
    if (!snapshot.stopPending) publish({ status });
  }

  const activeKey = platform === 'android' ? 'overlayActive' : 'liveActivityActive';
  const preferenceKey = platform === 'android' ? 'androidOverlayEnabled' : 'iosLiveActivityEnabled';

  async function refreshCapabilities({ reconcile = true } = {}) {
    const request = ++refreshId;
    let value;
    try { value = await native.getCompanionCapabilities(); }
    catch { value = { platform, available: false }; }
    if (request !== refreshId) return null;
    publish({ capabilities: { ...snapshot.capabilities, ...value } });
    // These flags report observed external presence, never consent to auto-start it.
    if (value.available !== false) preferences.update({
      ...(typeof value.overlayActive === 'boolean' ? { androidOverlayEnabled: value.overlayActive } : {}),
      ...(typeof value.liveActivityActive === 'boolean' ? { iosLiveActivityEnabled: value.liveActivityActive } : {}),
    });
    if (reconcile && platform !== 'web' && !preferences.getSnapshot().enabled && !shutdown) {
      if (value.available !== false && value[activeKey] === false) {
        if (snapshot.stopFailed) publish({ stopFailed: false, status: '' });
      } else void requestStop();
    }
    return value;
  }

  function observedPresence(active) {
    preferences.update({ [preferenceKey]: active });
    if (snapshot.capabilities) publish({ capabilities: { ...snapshot.capabilities, [activeKey]: active } });
  }

  function runNative(action) {
    if (operation || shutdown) return Promise.resolve({ busy: true });
    const token = generation;
    const current = () => token === generation && preferences.getSnapshot().enabled;
    ++refreshId;
    publish({ busy: true });
    const task = Promise.resolve().then(async () => {
      try { await action(current); }
      catch { if (!shutdown) setStatus('L’opération n’a pas abouti. Tu peux réessayer.'); }
      finally { if (!shutdown) await refreshCapabilities(); }
    });
    operation = task;
    return task.finally(() => {
      if (operation === task) operation = null;
      if (!shutdown) publish({ busy: false });
    });
  }

  function requestStop() {
    ++generation;
    ++refreshId;
    if (shutdown) return shutdown;
    if (platform === 'web') {
      publish({ busy: false, stopPending: false, stopFailed: false, status: '' });
      return Promise.resolve(true);
    }
    publish({ busy: true, stopPending: true, stopFailed: false, status: 'Arrêt de la présence hors de l’application…' });
    const previous = operation || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      let confirmed = false;
      try {
        const result = platform === 'android' ? await native.stopCompanionOverlay() : await native.endCompanionLiveActivity();
        confirmed = platform === 'android' ? result?.stopped === true : result?.ended === true;
      } catch { /* Refresh below may still confirm that the native service ended. */ }
      if (confirmed) observedPresence(false);
      if (platform === 'ios') {
        try { await native.syncCompanionWidget({ mode: 'idle', message: 'Compagnon désactivé', enabled: false }); }
        catch { /* Ending a Live Activity does not depend on optional widget support. */ }
      }
      const actual = await refreshCapabilities({ reconcile: false });
      if (actual?.available !== false && typeof actual?.[activeKey] === 'boolean') confirmed = actual[activeKey] === false;
      if (confirmed) observedPresence(false);
      publish({ stopFailed: !confirmed, status: confirmed ? '' : 'L’arrêt de la présence hors de l’application n’est pas confirmé. Réessaie ici ou arrête-la depuis ton téléphone.' });
      return confirmed;
    });
    shutdown = task.finally(() => {
      shutdown = null;
      publish({ busy: false, stopPending: false });
    });
    return shutdown;
  }

  function enableOverlay(options) {
    return runNative(async current => {
      if (!current()) return;
      setStatus('Vérification de l’autorisation Android…');
      const permission = await native.requestOverlayPermission();
      if (!current()) return;
      if (!permission?.granted) {
        setStatus('Dans Android, autorise l’affichage par-dessus les applications. Reviens ensuite ici pour activer le compagnon.');
        return;
      }
      const result = await native.startCompanionOverlay(options);
      if (!result?.started) throw new Error('overlay_not_started');
      observedPresence(true);
      if (!current()) { void requestStop(); return; }
      setStatus('Compagnon activé hors de l’application. Tu peux l’arrêter ici ou en maintenant le doigt sur lui.');
    });
  }

  function disableOverlay() {
    return runNative(async () => {
      const result = await native.stopCompanionOverlay();
      if (!result?.stopped) throw new Error('overlay_not_stopped');
      observedPresence(false);
      setStatus('Compagnon hors application arrêté.');
    });
  }

  function enableLive(options) {
    return runNative(async current => {
      if (!current()) return;
      const result = await native.startCompanionLiveActivity(options);
      if (!result?.started) { setStatus('Les Live Activities sont indisponibles ou désactivées dans les réglages iOS.'); return; }
      observedPresence(true);
      if (!current()) { void requestStop(); return; }
      setStatus(result.reused ? 'Live Activity déjà active, état actualisé.' : 'Live Activity 3B activée.');
    });
  }

  function disableLive() {
    return runNative(async () => {
      const result = await native.endCompanionLiveActivity();
      if (!result?.ended) throw new Error('live_activity_not_ended');
      observedPresence(false);
      setStatus('Live Activity 3B arrêtée.');
    });
  }

  function openWallpaper() {
    return runNative(async current => {
      if (!current()) return;
      const result = await native.openCompanionWallpaperPicker();
      setStatus(result?.opened ? 'Choisis Compagnon 3B dans les fonds animés Android.' : 'Les fonds animés ne sont pas disponibles sur cet appareil.');
    });
  }

  const unsubscribe = preferences.subscribe(() => {
    const enabled = preferences.getSnapshot().enabled;
    const changed = enabled !== previousEnabled;
    previousEnabled = enabled;
    if (changed && !enabled) void requestStop();
  });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    refreshCapabilities, setStatus, enableOverlay, disableOverlay, enableLive, disableLive, openWallpaper, requestStop,
    dispose() { ++generation; ++refreshId; unsubscribe(); listeners.clear(); },
  };
}
