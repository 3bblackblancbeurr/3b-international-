import { Capacitor, registerPlugin } from "@capacitor/core";

const ThreeBCompanion = registerPlugin("ThreeBCompanion");

export function companionPlatform() {
  return Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web";
}

export async function getCompanionCapabilities() {
  if (!Capacitor.isNativePlatform()) {
    return {
      platform: "web",
      inApp: true,
      overlay: false,
      liveWallpaper: false,
      liveActivity: false,
      lockWidget: false,
    };
  }

  if (Capacitor.getPlatform() === "android") {
    try {
      return await ThreeBCompanion.getCapabilities();
    } catch {
      return {
        platform: "android",
        inApp: true,
        overlay: false,
        liveWallpaper: false,
        liveActivity: false,
        lockWidget: false,
      };
    }
  }

  return {
    platform: Capacitor.getPlatform(),
    inApp: true,
    overlay: false,
    liveWallpaper: false,
    liveActivity: Capacitor.getPlatform() === "ios",
    lockWidget: Capacitor.getPlatform() === "ios",
  };
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
