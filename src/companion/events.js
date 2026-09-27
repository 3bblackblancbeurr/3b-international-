export function emitCompanionEvent(type, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("threeb:companion", {
    detail: { ...detail, type },
  }));
}

export const companionReward = (detail) => emitCompanionEvent("reward", detail);
export const companionCelebrate = (detail) => emitCompanionEvent("celebrate", detail);
export const companionNotify = (detail) => emitCompanionEvent("notification", detail);
