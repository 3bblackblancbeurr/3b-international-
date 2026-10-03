import {Button} from '../design-system/index.jsx';
import {cityMapPreset} from './city3b-map-presets.js';
import {CityMapPreview} from './CityMapPicker.jsx';
import './city3b-saves.css';
export default function CitySaveSlots({slots=[],busy,onChoose}){
 return <section className="city-save-menu"><p className="city3b-kicker">CRÉE MA VILLE · TES PARTIES</p><h2>Quelle ville aujourd’hui ?</h2><p>3 emplacements, 4 territoires à découvrir. Chaque ville conserve sa carte et sa progression.</p>
  <div className="city-save-grid">{[1,2,3].map(slot=>{const city=slots.find(s=>s.slot===slot)?.city,map=city?cityMapPreset(city.map_preset):null;return <article className="city-save-card" key={slot}>
   <span className="city-save-number">PARTIE {slot}</span>{map?<CityMapPreview map={map}/>:<div className="city-save-empty" aria-hidden="true">＋</div>}
   <div className="city-save-copy"><h3>{city?.name||'Une nouvelle ville'}</h3>{city?<><p>{map.name} · Niveau {city.city_level||1}</p><small>Enregistrée le {new Date(city.updated_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}</small></>:<p>Choisis ton paysage et pose les premières fondations.</p>}
   <Button variant={city?'champagne':'ghost'} disabled={busy} onClick={()=>onChoose(slot,city)} aria-label={`${city?'Reprendre':'Créer'} la partie ${slot}`}>{city?'Reprendre la ville':'Nouvelle partie'}</Button></div>
  </article>;})}</div>
  <p className="city-save-note">Sauvegarde automatique sur ton compte après chaque action confirmée. Coins et objets premium sont communs à tes trois villes.</p>
 </section>;
}
