import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';

export const HealthBridge = registerPlugin('ThreeBHealth');
export const ReminderBridge = registerPlugin('ThreeBHealthReminders');
export const nativePlatform = () => Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
export const hasHealthBridge = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ThreeBHealth');
export const hasReminderBridge = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ThreeBHealthReminders');

// Foreground refresh only. The OS/provider records steps independently of 3B.
export function onHealthResume(callback) {
  let disposed = false, listener;
  const visible = () => { if (!document.hidden) callback(); };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('focus', visible);
  if (Capacitor.isNativePlatform()) App.addListener('appStateChange', state => { if (state.isActive) callback(); })
    .then(value => { if (disposed) value.remove(); else listener = value; }).catch(() => {});
  return () => { disposed = true; document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); listener?.remove(); };
}

export function healthError(error) {
  const code = String(error?.code || '').toLowerCase();
  if (code==='health_authorization_failed') return 'La demande d’accès Apple Santé n’a pas pu se terminer. Réessaie depuis l’application ouverte.';
  if (/permission|denied/.test(code)) return 'L’autorisation nécessaire n’est pas disponible. Tu peux vérifier les permissions dans les réglages du téléphone.';
  if (/cancel/.test(code)) return 'Demande annulée. Tu peux continuer sans connexion.';
  if (/unavailable|unsupported|not_implemented/.test(code)) return 'Cette version ou ce téléphone ne permet pas encore cette connexion.';
  return 'La lecture n’a pas abouti. Vérifie les permissions et réessaie. Aucune valeur n’a été inventée.';
}
