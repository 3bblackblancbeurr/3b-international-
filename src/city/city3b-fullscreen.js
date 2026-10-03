// Only called from an explicit player gesture. Unsupported browsers keep the landscape layout.
export async function enterCityFullscreen(element) {
  try {
    if (!document.fullscreenElement && element?.requestFullscreen) await element.requestFullscreen();
    if (document.fullscreenElement && screen.orientation?.lock) await screen.orientation.lock('landscape');
    return Boolean(document.fullscreenElement);
  } catch { return Boolean(document.fullscreenElement); }
}

export function leaveCityFullscreen(element) {
  if (document.fullscreenElement !== element) return;
  try { screen.orientation?.unlock?.(); } catch { /* Browser-managed orientation. */ }
  document.exitFullscreen?.().catch(() => {});
}
