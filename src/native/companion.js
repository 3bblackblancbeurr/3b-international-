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
    liveWallpaper: platform === "android",
    liveActivity: platform === "ios",
    lockWidget: platform === "ios",
  };
}

export async function getCompanionCapabilities() {
  if (!Capacitor.isNativePlatform()) return webCapabilities();
  const platform = Capacitor.getPlatform();
  try {
    return await ThreeBCompanion.getCapabilities();
  } catch {
    return nativeFallback(platform);
  }
}

export async function requestOverlayPermission() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { granted: false };
  return ThreeBCompanion.requestOverlayPermission();
}

export async function startCompanionOverlay() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { started: false };
  return ThreeBCompanion.startOverlay();
}

export async function stopCompanionOverlay() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { stopped: false };
  return ThreeBCompanion.stopOverlay();
}

export async function openCompanionWallpaperPicker() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { opened: false };
  return ThreeBCompanion.openWallpaperPicker();
}

export async function setNativeCompanionMode(mode) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return { updated: false };
  return ThreeBCompanion.setMode({ mode });
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
