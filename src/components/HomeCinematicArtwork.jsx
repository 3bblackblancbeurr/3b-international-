import { useEffect, useRef, useState } from 'react';
import { useLuxury } from '../design-system/LuxuryExperience.jsx';

// Separate, long-lived visual layers derived from the owner's approved menu image.
// The photograph NEVER rotates: only the transparent ring layer does.
export const MENU_SCENE_URL = 'https://cdn.creativeclaw.co/u/be6cdbed/images/efdc49d8-0f1f-467e-8c17-af6d98c1f2be.webp';
export const MENU_RING_URL = 'https://cdn.creativeclaw.co/u/be6cdbed/images/d769962b-91da-4127-90b1-7f65b879a9da.webp';
const OFFLINE_SCENE = '/art/monde-3b/reference-cite-huit-heritages.webp';

export default function HomeCinematicArtwork() {
  const sceneRef = useRef(null);
  const { policy } = useLuxury();
  const [sceneFailed, setSceneFailed] = useState(false);
  const [ringFailed, setRingFailed] = useState(false);

  useEffect(() => {
    const stage = sceneRef.current;
    if (!stage) return undefined;
    const covers = new Set();
    const update = () => {
      stage.dataset.covered = document.hidden || covers.size > 0 ? 'true' : 'false';
    };
    const onCover = event => {
      if (event.detail?.open) covers.add(event.type);
      else covers.delete(event.type);
      update();
    };
    const onVisibility = () => update();
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => {
          stage.dataset.visible = entry?.isIntersecting ? 'true' : 'false';
        }, { threshold: 0.02 })
      : null;
    observer?.observe(stage);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('threeb:app-menu-state', onCover);
    window.addEventListener('threeb:home-story-state', onCover);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('threeb:app-menu-state', onCover);
      window.removeEventListener('threeb:home-story-state', onCover);
    };
  }, []);

  const motionAllowed = !policy.reduced && !policy.economical;
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
        width="864"
        height="810"
        decoding="async"
        fetchPriority="high"
        draggable="false"
        onError={() => setSceneFailed(true)}
      />
      {ringFailed ? (
        <span className="home-aaa-ring-fallback" />
      ) : (
        <img
          className="home-aaa-rotating-circle"
          src={MENU_RING_URL}
          alt=""
          width="650"
          height="650"
          decoding="async"
          fetchPriority="high"
          draggable="false"
          onError={() => setRingFailed(true)}
        />
      )}
    </figure>
  );
}
