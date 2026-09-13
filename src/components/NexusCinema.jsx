import { Check, LockKeyhole } from 'lucide-react';
import { NEXUS_WORLDS } from './nexus-worlds.js';
import { NEXUS_CINEMA_ASSETS, nexusDoorImage, nexusHotspotStyle } from './nexus-cinema.js';
import '../styles/nexus-cinema-polish.css';

const TRANSIT_RINGS = Array.from({ length: 10 }, (_, index) => index);
const TRANSIT_STREAKS = Array.from({ length: 28 }, (_, index) => index);
const TRANSIT_GLYPHS = ['3B', '01', '10', 'H', 'B', '3', '11', '00', '3B', '01', 'B', '10'];

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
      <svg className="nexus-cinema-seals" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth=".35" />
        {NEXUS_WORLDS.map((world, index) => {
          const angle = (index * 45 - 90) * Math.PI / 180;
          const complete = doors.find(door => door.code === world.code)?.sealed;
          return <circle key={world.code} cx={50 + Math.cos(angle) * 46} cy={50 + Math.sin(angle) * 46} r={complete ? 2.3 : 1.2} className={complete ? 'is-earned' : 'is-pending'} />;
        })}
      </svg>
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

export function NexusTransitDecor() {
  return <div className="nexus-transit-decor" aria-hidden="true">
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
