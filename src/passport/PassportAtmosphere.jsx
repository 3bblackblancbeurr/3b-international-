import { useEffect, useRef, useState } from 'react';
import { mountEntrySky } from '../design-system/entry-sky.js';
import './passport-atmosphere.css';

/** A decorative world behind the passport; gestures stay on the real page. */
export default function PassportAtmosphere({ hostRef, running = true, economical = false }) {
  const canvas = useRef(null);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [systemReduced, setSystemReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setSystemReduced(preference.matches);
    const visibility = () => setHidden(document.hidden);
    motion(); visibility();
    preference.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      preference.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  const reduced = !running || systemReduced;
  useEffect(() => {
    if (!canvas.current) return undefined;
    // A paused page retains a single still sky, with no frame loop or movement listeners.
    // Visibility and page lifecycle are handled inside the shared bounded renderer.
    return mountEntrySky(canvas.current, { reduced, economical, interactionHost: hostRef?.current });
  }, [hostRef, reduced, economical]);

  return <div className="passport-atmosphere" data-running={!reduced && !hidden} data-economical={economical} aria-hidden="true">
    <img className="passport-atmosphere-art" src="/passport/heritage-atmosphere.webp" alt="" decoding="async" draggable="false" />
    <div className="passport-atmosphere-light" />
    <canvas ref={canvas} className="passport-atmosphere-canvas" />
    <div className="passport-atmosphere-scrim" />
  </div>;
}
