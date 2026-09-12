import { lazy, Suspense } from 'react';

const ImmersiveNexus = lazy(() => import('./PassportNexusImmersive.jsx'));
const IllustratedNexus = lazy(() => import('./PassportNexusIllustrated.jsx'));

// Preserve the independently released illustrated experience, including its
// legacy progression rules, without loading two conflicting CSS themes.
// A full-page URL selection makes the fallback reproducible and reversible.
export default function PassportNexus(props) {
  if (!props.open) return null;
  const illustrated = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('nexusVersion') === 'illustre';
  const Experience = illustrated ? IllustratedNexus : ImmersiveNexus;
  return <Suspense fallback={<span role="status">Ouverture du Nexus…</span>}>
    <Experience {...props} />
  </Suspense>;
}
