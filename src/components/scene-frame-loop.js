// Decorative scenes render only when their pixels can be seen. Static modes
// retain one sharp frame and redraw on resize or texture completion.
export function createSceneFrameLoop({ render, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame, fps = 30 }) {
  let state = { active: false, visible: true, hidden: false, covered: false, animate: true };
  let frame = null, previous = null, dirty = true, disposed = false;
  const interval = 1000 / fps;
  const allowed = () => !disposed && state.active && state.visible && !state.hidden && !state.covered;
  const stop = () => {
    if (frame !== null) cancelFrame(frame);
    frame = null;
    previous = null;
  };
  const schedule = () => {
    if (allowed() && frame === null && (state.animate || dirty)) frame = requestFrame(tick);
  };
  const tick = now => {
    frame = null;
    if (!allowed()) return;
    const elapsed = previous === null ? 0 : now - previous;
    if (dirty || previous === null || elapsed >= interval - .5) {
      const dt = state.animate ? Math.min(elapsed / 1000, .05) : 0;
      previous = now;
      dirty = false;
      render(now, dt, state.animate);
    }
    schedule();
  };
  return {
    update(next) {
      if (disposed) return;
      const wasAllowed = allowed(), animated = state.animate;
      state = { ...state, ...next };
      if (!allowed()) { stop(); return; }
      if (!wasAllowed || animated !== state.animate) { stop(); dirty = true; }
      schedule();
    },
    invalidate() { if (!disposed) { dirty = true; schedule(); } },
    dispose() { disposed = true; stop(); },
  };
}
