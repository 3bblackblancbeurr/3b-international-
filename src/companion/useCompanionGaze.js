import { useEffect } from 'react';
import { companionGaze } from './companion-assistant.js';

export default function useCompanionGaze(ref, enabled) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      element.style.removeProperty('--gaze-x'); element.style.removeProperty('--gaze-y');
    };
    const move = event => {
      if (event.pointerType === 'touch' || document.hidden || frame) return;
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const gaze = companionGaze(clientX, clientY, element.getBoundingClientRect());
        element.style.setProperty('--gaze-x', `${gaze.x}px`);
        element.style.setProperty('--gaze-y', `${gaze.y}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', reset);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', reset); document.removeEventListener('visibilitychange', reset); reset(); };
  }, [ref, enabled]);
}
