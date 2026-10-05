export const LAUNCH_TIMING = Object.freeze({
  assemble: 2450,
  hold: 620,
  dissolve: 880,
  exit: 360,
});

const LAUNCH_PHASES = Object.freeze(Object.keys(LAUNCH_TIMING));

export function launchPhaseAt(elapsed) {
  let boundary = 0;
  for (const [phase, duration] of Object.entries(LAUNCH_TIMING)) {
    boundary += duration;
    if (elapsed < boundary) return phase;
  }
  return 'done';
}

// The clock starts only after the artwork is decoded and a visible frame can
// be drawn. Background time must not consume the opening on an Android launch.
export function startLaunchPlayback({
  artwork,
  onArtwork,
  onPhase,
  onPaused,
  onReveal,
  onFinish,
  document: page = globalThis.document,
  requestFrame = globalThis.requestAnimationFrame.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame.bind(globalThis),
  now = () => performance.now(),
  setTimer = globalThis.setTimeout.bind(globalThis),
  clearTimer = globalThis.clearTimeout.bind(globalThis),
  artworkTimeout = 4000,
}) {
  let active = true;
  let ready = false;
  let frame = null;
  let previous = null;
  let phaseElapsed = 0;
  let phaseIndex = -1;
  let deadline = null;

  const removeArtworkListeners = () => {
    artwork?.removeEventListener('load', decode);
    artwork?.removeEventListener('error', unavailable);
  };

  const dispose = () => {
    active = false;
    if (frame !== null) cancelFrame(frame);
    if (deadline !== null) clearTimer(deadline);
    page.removeEventListener('visibilitychange', visibility);
    removeArtworkListeners();
  };

  const draw = timestamp => {
    frame = null;
    if (!active || page.hidden) return;
    if (previous !== null) phaseElapsed += Math.max(0, timestamp - previous);
    previous = timestamp;

    if (phaseIndex < 0 || phaseElapsed >= LAUNCH_TIMING[LAUNCH_PHASES[phaseIndex]]) {
      // A delayed frame may finish the current phase, never skip an unseen
      // one. Its excess time predates the next CSS animation, so that next
      // phase starts at zero instead of inheriting an already-expired clock.
      phaseIndex += 1;
      phaseElapsed = 0;
      const next = LAUNCH_PHASES[phaseIndex];
      if (!next) {
        dispose();
        onFinish();
        return;
      }
      onPhase(next);
      if (next === 'exit') onReveal();
    }
    frame = requestFrame(draw);
  };

  const visibility = () => {
    onPaused(page.hidden);
    if (page.hidden) {
      if (previous !== null) phaseElapsed += Math.max(0, now() - previous);
      previous = null;
      if (frame !== null) cancelFrame(frame);
      frame = null;
    } else if (ready && frame === null) {
      previous = null;
      frame = requestFrame(draw);
    }
  };

  const settle = available => {
    if (!active || ready) return;
    ready = true;
    if (deadline !== null) clearTimer(deadline);
    removeArtworkListeners();
    onArtwork(available);
    visibility();
  };

  const unavailable = () => settle(false);
  const decode = () => {
    if (!active || ready) return;
    if (!artwork?.naturalWidth) { unavailable(); return; }
    if (typeof artwork.decode !== 'function') { settle(true); return; }
    try {
      Promise.resolve(artwork.decode()).then(() => settle(true), unavailable);
    } catch {
      unavailable();
    }
  };

  page.addEventListener('visibilitychange', visibility);
  onPaused(page.hidden);
  // A failed request keeps the energy effect, without a broken or late logo.
  // It cannot leave the application permanently blocked behind its opening.
  deadline = setTimer(unavailable, artworkTimeout);
  if (!artwork || artwork.complete) decode();
  else {
    artwork.addEventListener('load', decode, { once: true });
    artwork.addEventListener('error', unavailable, { once: true });
  }

  return dispose;
}
