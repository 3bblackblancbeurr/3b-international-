import { Capacitor, registerPlugin } from '@capacitor/core';

const Immersive = registerPlugin('Immersive');

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

function mark(enabled) {
  if (typeof document === 'undefined') return;
  if (enabled) document.documentElement.dataset.introImmersive = 'true';
  else delete document.documentElement.dataset.introImmersive;
}

export async function enterIntroImmersive() {
  mark(true);
  if (!isAndroidNative()) return false;
  try {
    await Immersive.setIntroMode({ enabled: true });
    return true;
  } catch {
    return false;
  }
}

export async function exitIntroImmersive() {
  mark(false);
  if (!isAndroidNative()) return false;
  try {
    await Immersive.setIntroMode({ enabled: false });
    return true;
  } catch {
    return false;
  }
}
