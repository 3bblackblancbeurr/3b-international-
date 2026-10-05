import { useEffect, useRef, useState } from 'react';

export const LAUNCH_TIMING = Object.freeze({
  prelude: 260,
  assemble: 2450,
  hold: 620,
  dissolve: 880,
  exit: 360,
});
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

export default function CinematicLaunch({ policy, enabled = true, onDone }) {
  const [phase, setPhase] = useState('prelude');
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!enabled) {
      done.current();
      return undefined;
    }

    if (!policy.animate) {
      setPhase('hold');
      const reducedFinish = setTimeout(() => done.current(), 850);
      return () => clearTimeout(reducedFinish);
    }

    const assembleAt = LAUNCH_TIMING.prelude;
    const holdAt = assembleAt + LAUNCH_TIMING.assemble;
    const dissolveAt = holdAt + LAUNCH_TIMING.hold;
    const exitAt = dissolveAt + LAUNCH_TIMING.dissolve;
    const finishAt = exitAt + LAUNCH_TIMING.exit;

    const assemble = setTimeout(() => setPhase('assemble'), assembleAt);
    const hold = setTimeout(() => {
      setPhase('hold');
      if (policy.haptics) {
        try { navigator.vibrate?.([8, 28, 12]); } catch { /* Haptics are enhancement only. */ }
      }
    }, holdAt);
    const dissolve = setTimeout(() => setPhase('dissolve'), dissolveAt);
    const exit = setTimeout(() => setPhase('exit'), exitAt);
    const finish = setTimeout(() => done.current(), finishAt);

    return () => {
      clearTimeout(assemble);
      clearTimeout(hold);
      clearTimeout(dissolve);
      clearTimeout(exit);
      clearTimeout(finish);
    };
  }, [policy.animate, policy.haptics, enabled]);

  return <section
    className="threeb-launch"
    data-phase={phase}
    data-reduced={!policy.animate || undefined}
    aria-label="Ouverture cinématique de 3B International"
    aria-live="polite"
  >
    <div className="threeb-launch-depth" aria-hidden="true" />
    <div className="threeb-launch-halo" aria-hidden="true" />
    <div className="threeb-launch-energy" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => <span key={index} style={{ '--energy-index': index }} />)}
    </div>

    <div className="threeb-launch-logo" aria-hidden="true">
      <img className="threeb-launch-core" src={BRAND_ICON} alt="" width="512" height="512" draggable="false" />
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
        }} />)}
      </div>
    </div>

    <p className="threeb-launch-signature">3B INTERNATIONAL</p>
    <p className="threeb-launch-subline">NOT A BRAND · A LEGACY</p>
  </section>;
}
