// One monotonic timeline for the camera, captions and recorded voice, at any FPS.
export function createCinematicClock(duration, now = () => performance.now()) {
 let accumulated = 0, anchor = now(), stopped = false;
 const holds = new Set();
 const elapsed = () => Math.min(duration, accumulated + (stopped || holds.size ? 0 : Math.max(0, now() - anchor)));
 return {
  elapsed,
  get paused() { return holds.size > 0; },
  hold(reason, value) {
   if (stopped || holds.has(reason) === !!value) return;
   accumulated = elapsed(); anchor = now();
   if (value) holds.add(reason); else holds.delete(reason);
  },
  stop() { accumulated = elapsed(); stopped = true; },
 };
}
