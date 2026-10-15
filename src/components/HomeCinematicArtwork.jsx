import { useEffect, useRef, useState } from 'react';
import { useLuxury } from '../design-system/LuxuryExperience.jsx';

// These are genuine independent visual assets, NOT a screenshot of a finished UI.
// Crucially there is no baked-in ring in MENU_SCENE_URL and no city in MENU_RING_URL.
// The ring's rotation is a compositor animation, not an animation of the backdrop.
export const MENU_SCENE_URL = 'https://cdn.creativeclaw.co/u/be6cdbed/images/eb865b42-4b1d-4ce5-a857-ac7c9b2f09c1.png';
export const MENU_RING_URL = 'https://cdn.creativeclaw.co/u/be6cdbed/images/73a34bbf-6829-4b8a-b8a7-6d622769698e.png';
const OFFLINE_SCENE = '/art/monde-3b/reference-cite-huit-heritages.webp';

export default function HomeCinematicArtwork() {
  const sceneRef = useRef(null);
  const { policy } = useLuxury();
  const [sceneFailed, setSceneFailed] = useState(false);
  const [ringFailed, setRingFailed] = useState(false);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;
    const covers = new Set();
    const updateVisibility = () => {
      scene.dataset.covered = document.hidden || covers.size > 0 ? 'true' : 'false';
    };
    const onOverlay = event => {
      if (event.detail?.open) covers.add(event.type);
      else covers.delete(event.type);
      updateVisibility();
    };
    const onTabVisibility = () => updateVisibility();
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => {
          scene.dataset.visible = entry?.isIntersecting ? 'true' : 'false';
        }, { threshold: 0.02 })
      : null;

    observer?.observe(scene);
    document.addEventListener('visibilitychange', onTabVisibility);
    window.addEventListener('threeb:app-menu-state', onOverlay);
    window.addEventListener('threeb:home-story-state', onOverlay);
    updateVisibility();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onTabVisibility);
      window.removeEventListener('threeb:app-menu-state', onOverlay);
      window.removeEventListener('threeb:home-story-state', onOverlay);
    };
  }, []);

  // Saving data or having 4GB RAM is NOT a reason to freeze a CSS transform:
  // unlike WebGL, this compositor-only animation is inexpensive on phones.
  const motionAllowed = !policy.reduced;

  return (
    <figure
      ref={sceneRef}
      className="home-aaa-art"
      data-motion={motionAllowed ? 'enabled' : 'reduced'}
      data-visible="true"
      data-covered="false"
      aria-hidden="true"
    >
      <img
        className="home-aaa-artwork"
        src={sceneFailed ? OFFLINE_SCENE : MENU_SCENE_URL}
        alt=""
        width="941"
        height="1672"
        decoding="async"
        fetchPriority="high"
        draggable="false"
        onError={() => setSceneFailed(true)}
      />
      <span className="home-aaa-magic-sky" />
      <span className="home-aaa-ring-aura" />
      <span className="home-aaa-ring-holder">
        {ringFailed ? (
          <span className="home-aaa-ring-fallback" />
        ) : (
          <img
            className="home-aaa-rotating-circle"
            src={MENU_RING_URL}
            alt=""
            width="1254"
            height="1254"
            decoding="async"
            fetchPriority="high"
            draggable="false"
            onError={() => setRingFailed(true)}
          />
        )}
      </span>
      <span className="home-aaa-water-glow" />
    </figure>
  );
}
