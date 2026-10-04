import { useEffect, useRef, useState } from 'react';
import { Button } from './index.jsx';

export const LAUNCH_TIMING = Object.freeze({ assemble: 3500, hold: 1000, dissolve: 900 });
export const BRAND_ICON = '/icons/3b-icon-20260912-512.png';

export default function CinematicLaunch({ policy, enabled, onDone }) {
  const [phase, setPhase] = useState('assemble');
  const done = useRef(onDone); done.current = onDone;
  const skip = useRef(null);
  useEffect(() => {
    if (!policy.animate || !enabled) { done.current(); return; }
    const focus = document.activeElement;
    skip.current?.focus({ preventScroll: true });
    const hold = setTimeout(() => setPhase('hold'), LAUNCH_TIMING.assemble);
    const dissolve = setTimeout(() => setPhase('dissolve'), LAUNCH_TIMING.assemble + LAUNCH_TIMING.hold);
    const finish = setTimeout(() => done.current(), LAUNCH_TIMING.assemble + LAUNCH_TIMING.hold + LAUNCH_TIMING.dissolve);
    return () => {
      clearTimeout(hold); clearTimeout(dissolve); clearTimeout(finish);
      requestAnimationFrame(() => {
        const target = focus?.isConnected && focus !== document.body ? focus : document.querySelector('.intro3b-enter, .brand-link');
        target?.focus({ preventScroll: true });
      });
    };
  }, [policy.animate, enabled]);
  const grid = policy.economical ? 4 : 8;
  return <section className="threeb-launch" data-phase={phase} role="dialog" aria-modal="true" aria-label="Ouverture de 3B International" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onDone(); }
    if (event.key === 'Tab') { event.preventDefault(); skip.current?.focus(); }
  }}>
    <div className="threeb-launch-halo" aria-hidden="true" />
    <div className="threeb-launch-logo" aria-hidden="true">
      {Array.from({ length: grid * grid }, (_, index) => {
        const col = index % grid, row = Math.floor(index / grid);
        const x = (col - (grid - 1) / 2) * 45, y = (row - (grid - 1) / 2) * 45;
        return <div key={index} className="threeb-launch-fragment" style={{
          clipPath: `inset(${row * 100 / grid}% ${100 - (col + 1) * 100 / grid}% ${100 - (row + 1) * 100 / grid}% ${col * 100 / grid}%)`,
          '--fragment-x': `${x}px`, '--fragment-y': `${y}px`, '--fragment-rotate': `${(index % 2 ? 1 : -1) * (16 + index % 13)}deg`,
          '--assemble-delay': `${(index * 17 % (grid * grid)) / (grid * grid - 1) * 2600}ms`, '--dissolve-delay': `${(index % grid) * 22}ms`,
        }}><img src={BRAND_ICON} alt="" width="512" height="512" /></div>;
      })}
    </div>
    <p className="threeb-launch-signature">3B INTERNATIONAL</p>
    <Button ref={skip} variant="ghost" className="threeb-launch-skip" onClick={onDone}>Passer l’introduction</Button>
  </section>;
}
