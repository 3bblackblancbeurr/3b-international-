import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Crown, Hammer, LockKeyhole, Play, RotateCcw, Sparkles, WandSparkles } from 'lucide-react';
import NexusCityScene from './NexusCityScene.jsx';
import { BUILDING_LIBRARY, NEXUS_MODE, buildingAccess } from './city-data.js';
import { RARITIES, rarityOddsLabel } from './rarity.js';
import './nexus-city.css';

const SAVE_KEY = '3b_nexus_city_v1';
const SELECTED_KEY = '3b_nexus_building_v1';

function readCity() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!Array.isArray(value)) return [];
    return value.filter(entry => entry && Number.isInteger(entry.x) && Number.isInteger(entry.z) && BUILDING_LIBRARY.some(building => building.id === entry.buildingId)).slice(0, NEXUS_MODE.maxPlotsSubscriber);
  } catch {
    return [];
  }
}

function saveCity(city) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(city)); } catch {}
}

export default function NexusCityPage({ goTo }) {
  const [started, setStarted] = useState(false);
  const [city, setCity] = useState(readCity);
  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem(SELECTED_KEY) || BUILDING_LIBRARY[0].id; } catch { return BUILDING_LIBRARY[0].id; }
  });
  const [notice, setNotice] = useState('');
  const [inventory] = useState(['tour-matrix']);
  const selectedBuilding = useMemo(() => BUILDING_LIBRARY.find(item => item.id === selected) || BUILDING_LIBRARY[0], [selected]);

  useEffect(() => { saveCity(city); }, [city]);
  useEffect(() => { try { localStorage.setItem(SELECTED_KEY, selected); } catch {} }, [selected]);

  function place(entry) {
    const building = BUILDING_LIBRARY.find(item => item.id === entry.buildingId);
    if (!building || !buildingAccess(building, inventory)) {
      setNotice('Cet élément doit d’abord être débloqué dans le Monde du 3B.');
      return;
    }
    if (Math.abs(entry.x) > 6 || Math.abs(entry.z) > 6) return;
    setCity(current => {
      const withoutCell = current.filter(item => item.x !== entry.x || item.z !== entry.z);
      const next = [...withoutCell, entry].slice(-NEXUS_MODE.maxPlotsFree);
      return next;
    });
    setNotice(`${building.name} placé · sauvegarde locale automatique.`);
  }

  function choose(building) {
    setSelected(building.id);
    setNotice(buildingAccess(building, inventory) ? `${building.name} sélectionné.` : `${building.name} est à débloquer.`);
  }

  function reset() {
    setCity([]);
    setNotice('Terrain remis à zéro.');
  }

  return <section className={`nexus-city-page ${started ? 'is-building' : 'is-intro'}`}>
    <NexusCityScene city={city} started={started} selectedBuilding={selectedBuilding.id} onPlace={place} />
    <div className="nexus-city-vignette" aria-hidden="true" />

    {!started ? <div className="nexus-city-intro">
      <button className="nexus-back" type="button" onClick={() => goTo('world3b')}><ArrowLeft size={18}/> Retour au Monde du 3B</button>
      <div className="nexus-city-copy">
        <p className="nexus-kicker"><Sparkles size={14}/> NEXUS DÉBLOQUÉ · MODE CONSTRUCTION</p>
        <h1>Crée ta ville <span>3B</span>.</h1>
        <p>Tu as trouvé le Nexus dans la Cité Origine. Ici, tu quittes l’exploration principale pour entrer dans un autre mode du même univers : bâtir ta ville, développer ses quartiers et exposer les objets gagnés dans les huit mondes.</p>
        <div className="nexus-city-features" aria-label="Fonctions du Nexus">
          <span><Building2 size={17}/> Ville 3D évolutive</span>
          <span><Hammer size={17}/> Construction par parcelles</span>
          <span><Crown size={17}/> Objets jusqu’à Unique</span>
        </div>
        <button className="nexus-start" type="button" onClick={() => setStarted(true)}><Play size={20} fill="currentColor"/> COMMENCER À CONSTRUIRE</button>
        <small>France · Estonie · Espagne · Italie · Maroc · Algérie · Tunisie · Turquie</small>
      </div>
      <div className="nexus-intro-card" aria-label="Présentation de la ville 3B">
        <span>3B CITY / 01</span><strong>TA VILLE. TON HÉRITAGE.</strong><em>NOIR · OR CHAMPAGNE · BLEU MATRIX</em>
      </div>
    </div> : <>
      <header className="nexus-builder-topbar">
        <button type="button" onClick={() => goTo('world3b')}><ArrowLeft size={18}/> Monde 3B</button>
        <div><span>NEXUS / CITY BUILDER</span><strong>{city.length} / {NEXUS_MODE.maxPlotsFree} parcelles libres</strong></div>
        <button type="button" onClick={reset}><RotateCcw size={17}/> Recommencer</button>
      </header>
      <aside className="nexus-builder-panel">
        <div className="nexus-builder-title"><WandSparkles size={20}/><div><span>CONSTRUIRE</span><strong>{selectedBuilding.name}</strong></div></div>
        <p>Touche un emplacement de la ville pour construire. Retouche la même case pour remplacer le bâtiment.</p>
        <div className="nexus-building-list">
          {BUILDING_LIBRARY.map(building => {
            const unlocked = buildingAccess(building, inventory);
            return <button key={building.id} type="button" className={selected === building.id ? 'is-selected' : ''} disabled={!unlocked} onClick={() => choose(building)} style={{'--rarity-glow': building.rarityInfo.glow}}>
              <span>{unlocked ? <Building2 size={17}/> : <LockKeyhole size={17}/>}</span><div><strong>{building.name}</strong><small>{building.rarityInfo.name}</small></div>
            </button>;
          })}
        </div>
        <div className="nexus-rarity-mini"><span>Raretés</span>{RARITIES.slice(-4).map(rarity => <small key={rarity.id} style={{'--rarity-glow':rarity.glow}}><i/>{rarity.name} · {rarityOddsLabel(rarity)}</small>)}</div>
        {notice && <p className="nexus-builder-notice" role="status">{notice}</p>}
      </aside>
      <div className="nexus-build-hint"><Hammer size={17}/> Sélectionne un bâtiment puis touche le terrain.</div>
    </>}
  </section>;
}
