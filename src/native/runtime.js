import { Capacitor } from '@capacitor/core';
import { readLocation, navigateTo } from '../lib/navigation.js';
import { handleNativeBack } from './back-navigation.js';

export const isNativeApp = () => Capacitor.isNativePlatform();
export const PUBLIC_APP_URL = 'https://3b-international.vercel.app/';

export async function setupNativeApp() {
  if (!isNativeApp()) return () => {};
  document.documentElement.dataset.native = Capacitor.getPlatform();
  if (Capacitor.getPlatform() !== 'android') return () => {};
  const { App: NativeApp } = await import('@capacitor/app');
  const handle = await NativeApp.addListener('backButton', ({ canGoBack }) => {
    handleNativeBack({
      canGoBack,
      closeDialog() {
        const dialog = document.querySelector('dialog[open]');
        if (!dialog) return false;
        if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
        return true;
      },
      page: readLocation().page,
      back: () => window.history.back(),
      home() {
        navigateTo('home');
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
      exit: () => NativeApp.exitApp(),
    });
  });
  return () => handle.remove();
}

export async function openWebShop() {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: PUBLIC_APP_URL + '#boutique', toolbarColor: '#030405' });
}
