import { useEffect, useRef } from 'react';
import { mountEntrySky } from './entry-sky.js';
import './entry-sky.css';

/** The entry remains a single action; the sky is decorative and never captures input. */
export default function EntryAtmosphere({ policy }) {
  const canvas = useRef(null);
  const reduced = policy?.reduced === true;
  const economical = policy?.economical === true;
  useEffect(() => {
    if (!canvas.current) return undefined;
    return mountEntrySky(canvas.current, { reduced, economical });
  }, [reduced, economical]);
  return <div className="entry-atmosphere entry-celestial" data-sky-motion={reduced ? 'still' : 'living'} aria-hidden="true">
    <div className="entry-atmosphere-aura"/>
    <canvas ref={canvas} className="entry-atmosphere-canvas"/>
    <div className="entry-atmosphere-vignette"/>
  </div>;
}
