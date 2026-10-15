import { useState } from 'react';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { RouteLink } from './AppNavigation.jsx';
import { launchUnrealWorld, UNREAL_LAUNCH_ENABLED } from '../world/unrealLaunch.js';
import { Button } from '../design-system/index.jsx';
import HomeCinematicArtwork from './HomeCinematicArtwork.jsx';
import WorldStoryPreview from './WorldStoryPreview.jsx';

// Homepage after "Commencer": the approved world art stays still and only
// the segmented Broken Circle spins. Text and actions are REAL accessible UI,
// not clickable hotspots baked into a screenshot.
export default function WorldPortalCard({ goTo }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [storyOpen, setStoryOpen] = useState(false);

  const openNativeWorld = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await launchUnrealWorld();
    } catch {
      setMessage('L’expérience native 3B est momentanément indisponible. Le Monde du 3B reste accessible dans l’application.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="world-portal home-world-entry home-aaa-entry" aria-labelledby="world-portal-title">
      <HomeCinematicArtwork />
      <div className="world-portal-copy home-aaa-overlay">
        <div className="home-aaa-accessible">
          <p className="eyebrow">3B INTERNATIONAL</p>
          <h2 id="world-portal-title">Huit portes. <em>Une légende.</em></h2>
          <p>Traverse la Cité des Huit Héritages. Explore, rencontre les Gardiens et fais évoluer un monde vivant.</p>
        </div>
        <div className="world-portal-actions home-aaa-actions">
          <Button as={RouteLink} page="world3b" goTo={goTo} variant="champagne" className="surface-button">
            Explorer le Monde <ArrowUpRight size={19} aria-hidden="true" />
          </Button>
          <Button variant="ghost" aria-haspopup="dialog" onClick={() => setStoryOpen(true)}>
            <BookOpen size={19} aria-hidden="true" /> Découvrir l’histoire
          </Button>
          {UNREAL_LAUNCH_ENABLED && (
            <Button variant="ghost" className="home-aaa-native" onClick={openNativeWorld} disabled={busy} loading={busy}>
              {busy ? 'Ouverture…' : 'Lancer l’expérience native'}
            </Button>
          )}
        </div>
        {message && <p className="home-aaa-ui-message" role="status">{message}</p>}
      </div>
      <WorldStoryPreview
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        onExplore={() => { setStoryOpen(false); goTo('world3b'); }}
      />
    </section>
  );
}
