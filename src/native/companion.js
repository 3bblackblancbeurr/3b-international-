import { Capacitor, registerPlugin } from "@capacitor/core";

const ThreeBCompanion = registerPlugin("ThreeBCompanion");

export function companionPlatform() {
  return Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web";
}

function webCapabilities() {
  return {
    platform: "web",
    inApp: true,
    overlay: false,
    liveWallpaper: false,
    liveActivity: false,
    lockWidget: false,
  };
}

function nativeFallback(platform) {
  return {
    platform,
    inApp: true,
    overlay: false,
    liveWallpaper: false,
    liveActivity: false,
    lockWidget: false,
    available: false,
  };
}

export async function getCompanionCapabilities() {
  if (!Capacitor.isNativePlatform()) return webCapabilities();
  const platform = Capacitor.getPlatform();
  try {
    return { ...await ThreeBCompanion.getCapabilities(), available: true };
  } catch {
    return nativeFallback(platform);
  }
}

export async function requestOverlayPermission() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { granted: false };
  return ThreeBCompanion.requestOverlayPermission();
}

export async function startCompanionOverlay(options = {}) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { started: false };
  return ThreeBCompanion.startOverlay(options);
}

export async function stopCompanionOverlay() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { stopped: false };
  return ThreeBCompanion.stopOverlay();
}

export async function openCompanionWallpaperPicker() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { opened: false };
  return ThreeBCompanion.openWallpaperPicker();
}

export async function setNativeCompanionMode(mode, options = {}) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { updated: false };
  return ThreeBCompanion.setMode({ ...options, mode });
}

export async function syncCompanionWidget({ mode, message, enabled }) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return { updated: false };
  return ThreeBCompanion.syncWidget({ mode, message, enabled });
}

export async function startCompanionLiveActivity({ mode, message }) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return { started: false };
  return ThreeBCompanion.startLiveActivity({ mode, message });
}

export async function updateCompanionLiveActivity({ mode, message }) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return { updated: false };
  return ThreeBCompanion.updateLiveActivity({ mode, message });
}

export async function endCompanionLiveActivity() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return { ended: false };
  return ThreeBCompanion.endLiveActivity();
}
