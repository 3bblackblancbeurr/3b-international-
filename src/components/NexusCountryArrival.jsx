import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { PortalArtwork } from './NexusArtwork.jsx';
import { NEXUS_ART } from '../passport/nexus-art-data.js';

export default function NexusCountryArrival({ world, busy = false, onBack, onEnter }) {
  if (!world) return null;
  const art = NEXUS_ART[world.code] || NEXUS_ART.FR;
  const traits = world.arrivalTraits || [world.value, art.atmosphere];
  return <section className="nexus-country-arrival" data-country={world.code} style={{ '--arrival-color': world.color }} aria-labelledby="nexus-country-arrival-title">
    <div className="nexus-country-copy">
      <p className="nexus-kicker">PORTE {world.number} / 08 · {world.value.toUpperCase()}</p>
      <h2 id="nexus-country-arrival-title">{world.arrivalTitle}<span>{art.title}</span></h2>
      <p className="nexus-country-lead">{world.arrivalLead || art.description}</p>
      <ul className="nexus-country-traits" aria-label={`Horizons ${world.country}`}>
        {traits.map(trait => <li key={trait}>{trait}</li>)}
      </ul>
      <div className="nexus-country-guardian"><ShieldCheck size={16} aria-hidden="true" /><span>Gardien du passage</span><strong>{world.guardian}</strong></div>
      <div className="nexus-country-load" aria-hidden="true" />
      <div className="nexus-country-actions">
        <button type="button" className="nexus-country-back" disabled={busy} onClick={onBack}><ArrowLeft size={16} /> Retour au Nexus</button>
        <button type="button" className="nexus-country-enter" disabled={busy} onClick={onEnter}>{busy ? 'Ouverture du monde…' : `Explorer ${world.country}`} <ArrowRight size={17} /></button>
      </div>
    </div>
    <div className="nexus-country-stage" aria-hidden="true">
      <div className="nexus-country-portal"><PortalArtwork code={world.code} id={`nexus-v6-arrival-${world.code}`} /></div>
      <span className="nexus-country-coordinate">{world.code} · {world.number} / VIII · 3B</span>
    </div>
  </section>;
}
