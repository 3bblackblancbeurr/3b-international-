import { useSyncExternalStore } from 'react';
import * as native from '../native/companion.js';
import { companionPreferences } from './companion-preferences.js';
import { createCompanionNativePresence } from './companion-native-presence.js';

export const companionNativePresence = createCompanionNativePresence({ preferences: companionPreferences, native });

export function useCompanionPreferences() {
  return useSyncExternalStore(companionPreferences.subscribe, companionPreferences.getSnapshot, companionPreferences.getServerSnapshot);
}

export function useCompanionNativePresence() {
  return useSyncExternalStore(companionNativePresence.subscribe, companionNativePresence.getSnapshot, companionNativePresence.getSnapshot);
}
