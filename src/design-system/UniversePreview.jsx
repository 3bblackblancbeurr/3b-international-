import { useEffect, useRef, useState } from 'react';
import { Button } from './index.jsx';
import { useLuxury } from './LuxuryExperience.jsx';
import { REALM_PREVIEWS } from './experience-policy.js';

export default function UniversePreview() {
  const host = useRef(null), runtime = useRef(null), selected = useRef(-1);
  const [realm, setRealm] = useState(-1), [ready, setReady] = useState(false);
  const [atlas, setAtlas] = useState(false);
  const { policy, cue } = useLuxury();
  useEffect(() => {
    if (!policy.preview3D || !atlas) return;
    let disposed = false, loading = false, inView = false;
    const activate = async () => {
      if (loading || runtime.current || !inView || document.hidden) return;
      loading = true;
      try {
        const { createUniversePreview } = await import('./universe-scene.js');
        if (disposed) return;
        runtime.current = createUniversePreview(host.current, () => setReady(false));
        runtime.current.select(selected.current);
        runtime.current.pause(!inView || document.hidden);
        setReady(true);
      } catch { /* The artwork remains available without WebGL. */ }
    };
    const visibility = () => { runtime.current?.pause(!inView || document.hidden); activate(); };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; visibility(); }, { rootMargin: '80px' });
    observer.observe(host.current);
    document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; observer.disconnect(); document.removeEventListener('visibilitychange', visibility); runtime.current?.dispose(); runtime.current = null; setReady(false); };
  }, [policy.preview3D, atlas]);
  const choose = index => { selected.current = index; setRealm(index); setAtlas(true); runtime.current?.select(index); cue('portal'); };
  const current = REALM_PREVIEWS[realm];
  return <div className="luxury-universe-preview">
    <div className="luxury-universe-stage" data-live={ready}>
      <img className="luxury-universe-poster" src="/art/monde-3b/reference-cite-huit-heritages.webp" alt="La Cité des Huit Héritages — image de référence 3B" width="1536" height="1152" loading="lazy"/>
      <div ref={host} className="luxury-universe-canvas" aria-hidden="true"/>
      <div className="luxury-universe-caption" aria-live="polite"><small>{current ? current.value.toUpperCase() : 'LA CITÉ DES HUIT HÉRITAGES'}</small><strong>{current ? current.name : 'Tout part du Nexus.'}</strong><span>{current ? `${current.guardian} · Gardien de ${current.value}` : 'Huit royaumes. Un héritage commun.'}</span></div>
      <Button className="luxury-universe-reset" variant="ghost" onClick={() => choose(-1)} disabled={realm === -1}>Vue du Nexus</Button>
      {policy.preview3D && <Button className="luxury-universe-mode" variant="ghost" onClick={() => { setAtlas(value => !value); cue('press'); }} aria-pressed={atlas}>{atlas ? 'Voir le panorama' : 'Explorer l’atlas 3D'}</Button>}
    </div>
    <div className="luxury-realms" role="group" aria-label="Admirer les huit royaumes">
      {REALM_PREVIEWS.map((item, index) => <Button key={item.code} variant="ghost" aria-pressed={realm === index} onClick={() => choose(index)}><span>{item.code}</span><small>{item.name}</small></Button>)}
    </div>
  </div>;
}
