import { useLayoutEffect, useRef, useState } from 'react';
import { startLaunchPlayback } from './launch-playback.js';

export { LAUNCH_TIMING } from './launch-playback.js';
export const BRAND_ICON = '/icons/3b-icon-20260912-512.png';

const SHARDS = Object.freeze([
  ['0 0,28% 0,20% 24%,0 36%',-150,-120,-18,0],
  ['28% 0,55% 0,47% 28%,20% 24%',-48,-155,12,90],
  ['55% 0,82% 0,76% 25%,47% 28%',62,-150,-10,180],
  ['82% 0,100% 0,100% 37%,76% 25%',155,-110,17,270],
  ['0 36%,20% 24%,28% 50%,0 60%',-170,-30,13,150],
  ['20% 24%,47% 28%,50% 51%,28% 50%',-92,-52,-9,240],
  ['47% 28%,76% 25%,72% 52%,50% 51%',84,-60,8,330],
  ['76% 25%,100% 37%,100% 61%,72% 52%',165,-14,-14,420],
  ['0 60%,28% 50%,24% 76%,0 83%',-166,55,-12,310],
  ['28% 50%,50% 51%,48% 78%,24% 76%',-76,62,10,400],
  ['50% 51%,72% 52%,79% 76%,48% 78%',76,64,-8,490],
  ['72% 52%,100% 61%,100% 83%,79% 76%',168,58,12,580],
  ['0 83%,24% 76%,32% 100%,0 100%',-138,138,16,470],
  ['24% 76%,48% 78%,55% 100%,32% 100%',-48,154,-11,560],
  ['48% 78%,79% 76%,82% 100%,55% 100%',54,152,9,650],
  ['79% 76%,100% 83%,100% 100%,82% 100%',146,132,-15,740],
]);

const SPARKS = Object.freeze(Array.from({ length: 22 }, (_, index) => ({
  angle: index * 137.508,
  distance: 92 + (index % 6) * 24,
  delay: (index * 79) % 720,
  size: 1 + (index % 3) * .65,
})));

export default function CinematicLaunch({ policy, enabled = true, onReveal, onDone }) {
  const [phase, setPhase] = useState('loading');
  const [paused, setPaused] = useState(false);
  const [artworkAvailable, setArtworkAvailable] = useState(null);
  const artwork = useRef(null);
  const done = useRef(onDone);
  done.current = onDone;
  const reveal = useRef(onReveal);
  reveal.current = onReveal;
  const currentPolicy = useRef(policy);
  currentPolicy.current = policy;

  useLayoutEffect(() => {
    if (!enabled || policy.reduced) {
      done.current();
      return undefined;
    }

    return startLaunchPlayback({
      artwork: artwork.current,
      onArtwork: setArtworkAvailable,
      onPhase(next) {
        setPhase(next);
        if (next === 'hold' && currentPolicy.current.haptics) {
          try { navigator.vibrate?.([8, 28, 12]); } catch { /* Haptics are enhancement only. */ }
        }
      },
      onPaused: setPaused,
      onReveal: () => reveal.current?.(),
      onFinish: () => done.current(),
    });
  }, [policy.reduced, enabled]);

  return <section
    className="threeb-launch"
    data-phase={phase}
    data-paused={paused || undefined}
    data-artwork={artworkAvailable === false ? 'unavailable' : undefined}
    aria-label="Ouverture cinématique de 3B International"
    aria-live="polite"
  >
    <div className="threeb-launch-depth" aria-hidden="true" />
    <div className="threeb-launch-halo" aria-hidden="true" />
    <div className="threeb-launch-energy" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => <span key={index} style={{ '--energy-index': index }} />)}
    </div>

    <div className="threeb-launch-logo" aria-hidden="true">
      <img ref={artwork} className="threeb-launch-core" src={BRAND_ICON} alt="" width="512" height="512" fetchPriority="high" decoding="async" draggable="false" />
      {SHARDS.map(([clip, x, y, rotate, delay], index) => <div
        key={index}
        className="threeb-launch-fragment"
        style={{
          clipPath: `polygon(${clip})`,
          '--fragment-x': `${x}px`,
          '--fragment-y': `${y}px`,
          '--fragment-rotate': `${rotate}deg`,
          '--assemble-delay': `${delay}ms`,
          '--dissolve-delay': `${(index % 5) * 34}ms`,
          '--dissolve-x': `${x * .58}px`,
          '--dissolve-y': `${y * .58}px`,
          '--dissolve-rotate': `${rotate * .7}deg`,
        }}
      >
        <img src={BRAND_ICON} alt="" width="512" height="512" draggable="false" />
      </div>)}
      <div className="threeb-launch-seal" />
      <div className="threeb-launch-sparks">
        {SPARKS.map((spark, index) => <span key={index} style={{
          '--spark-angle': `${spark.angle}deg`,
          '--spark-distance': `${spark.distance}px`,
          '--spark-delay': `${spark.delay}ms`,
          '--spark-size': `${spark.size}px`,
          '--spark-out-distance': `${spark.distance * 1.45}px`,
        }} />)}
      </div>
    </div>

    <p className="threeb-launch-signature">3B INTERNATIONAL</p>
    <p className="threeb-launch-subline">NOT A BRAND · A LEGACY</p>
  </section>;
}
