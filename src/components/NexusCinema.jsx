import { Check, LockKeyhole } from 'lucide-react';
import { NEXUS_WORLDS } from './nexus-worlds.js';
import { NEXUS_CINEMA_ASSETS, nexusDoorImage, nexusHotspotStyle } from './nexus-cinema.js';
import '../styles/nexus-cinema-polish.css';
import '../styles/nexus-portal-v4.css';
import '../styles/nexus-portal-v5.css';
import '../styles/nexus-v7-circle.css';
import '../styles/nexus-v7-tunnel.css';
import '../styles/nexus-v7-doors.css';
import '../styles/nexus-v8-wheel.css';

const TRANSIT_RINGS = Array.from({ length: 12 }, (_, index) => index);
const TRANSIT_STREAKS = Array.from({ length: 36 }, (_, index) => index);
const TRANSIT_GLYPHS = ['3B', '01', '10', 'H', 'B', '3', '11', '00', '3B', '01', 'B', '10', '08', '∞'];
const SPIRAL_SPARKS = Array.from({ length: 34 }, (_, index) => index);
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Art-directed 2.5D presentation. Buttons, selection and seals are live React UI,
 * not a flattened replacement for the app. Travel is handled by useNexusJourney. */
export function NexusCinemaHall({ selected, onSelect, doors = [], originEnabled = false, economy = false, onFailure }) {
  return <section className="nexus-cinema" aria-label="Sanctuaire illustré interactif" data-selection={selected || 'overview'}>
    <div className="nexus-cinema-map">
      <img className="nexus-cinema-photo" src={`${NEXUS_CINEMA_ASSETS}/hall.webp`}
        srcSet={economy ? `${NEXUS_CINEMA_ASSETS}/hall-mobile.webp 564w` : `${NEXUS_CINEMA_ASSETS}/hall-mobile.webp 564w, ${NEXUS_CINEMA_ASSETS}/hall.webp 941w`}
        sizes="(max-width: 759px) calc(100vw - 32px), 560px" width="941" height="1116"
        alt="" decoding="async" fetchPriority="high" onError={onFailure} />
      <div className="nexus-cinema-light" aria-hidden="true" />
      <div className="nexus-cinema-authentic-circle" aria-hidden="true">
        <img className="nexus-cinema-authentic-wheel-art" src={TRANSPARENT_PIXEL} alt="" width="1" height="1" />
      </div>
      <div className="nexus-cinema-hotspots" role="group" aria-label="Sélection des portes dans le décor">
        {NEXUS_WORLDS.map(world => {
          const progress = doors.find(door => door.code === world.code);
          return <button key={world.code} type="button" className="nexus-cinema-hit"
            data-country={world.code} style={nexusHotspotStyle(world.code)} aria-pressed={selected === world.code}
            aria-label={`Sélectionner la porte ${world.country} · ${world.value}`}
            onClick={() => onSelect(world.code)}>
            <span className="nexus-hit-name">{world.country}</span>
            {progress?.sealed && <span className="nexus-hit-seal" aria-label="Sceau retrouvé"><Check size={12} /></span>}
          </button>;
        })}
        <button type="button" className="nexus-cinema-origin" aria-pressed={selected === 'ORIGIN'}
          data-unlocked={originEnabled} aria-label={originEnabled ? 'Sélectionner ORIGINE, passage ouvert' : 'Découvrir les conditions de la porte ORIGINE'}
          onClick={() => onSelect('ORIGIN')}>
          <span>{originEnabled ? <Check size={22} /> : <LockKeyhole size={22} />}</span>
          <strong>ORIGINE</strong><small>{originEnabled ? 'Passage ouvert' : 'Le neuvième seuil'}</small>
        </button>
      </div>
    </div>
    <p className="nexus-cinema-legend"><span /> Sélectionne une porte dans le décor ou dans la galerie.</p>
  </section>;
}

function SpiralArm({ arm }) {
  return <span className={`nexus-v7-spiral nexus-v7-spiral-${arm}`}>
    {SPIRAL_SPARKS.map(index => <i key={`${arm}-${index}`} style={{ '--spark': index }} />)}
  </span>;
}

export function NexusTransitDecor() {
  return <div className="nexus-transit-decor" aria-hidden="true">
    <div className="nexus-v7-spiral-field"><SpiralArm arm="a" /><SpiralArm arm="b" /></div>
    <div className="nexus-v7-speed-ribs" />
    <div className="nexus-transit-horizon" />
    <div className="nexus-transit-depth">
      {TRANSIT_RINGS.map(index => <i key={index} style={{ '--nexus-ring': index }} />)}
    </div>
    <div className="nexus-transit-streaks">
      {TRANSIT_STREAKS.map(index => <i key={index} style={{ '--nexus-streak': index }} />)}
    </div>
    <div className="nexus-transit-glyphs">
      {TRANSIT_GLYPHS.map((glyph, index) => <b key={`${glyph}-${index}`} style={{ '--nexus-glyph': index }}>{glyph}</b>)}
    </div>
    {['left', 'right'].map((side, sideIndex) => <div key={side} className={`nexus-transit-wing nexus-transit-wing-${side}`}>
      {NEXUS_WORLDS.slice(sideIndex * 4, sideIndex * 4 + 4).map((world, index) => <div className="nexus-transit-panel" key={world.code} style={{ '--panel-index': index }}>
        <img src={nexusDoorImage(world.code)} width="132" height="132" alt="" decoding="async" />
        <i className="nexus-transit-panel-scan" />
        <small>{world.code}</small>
        <span>{world.country}</span>
      </div>)}
    </div>)}
    <div className="nexus-transit-axis" />
    <div className="nexus-transit-core">
      <i /><i /><i />
      <strong>3B</strong>
      <span>NEXUS</span>
    </div>
    <div className="nexus-transit-flare" />
    <div className="nexus-transit-vignette" />
  </div>;
}
