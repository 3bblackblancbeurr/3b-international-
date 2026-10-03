import {CITY_MAP_PRESETS} from './city3b-map-presets.js';
import './city3b-map-picker.css';

export function CityMapPreview({map}){
 const snow=map.climate==='snow';
 return <svg viewBox="-1000 -1000 2000 2000" aria-hidden="true" className="city-map-preview">
  <rect x="-1000" y="-1000" width="2000" height="2000" fill={snow?'#dce8eb':'#6d8961'}/>
  {map.terrain.filter(f=>f.kind==='hill').map(f=><g key={f.id}><circle cx={f.x1} cy={f.z1} r={f.width*1.7} fill={snow?'#b2c9d1':'#435c43'} opacity=".35"/><circle cx={f.x1-8} cy={f.z1-14} r={f.width} fill={snow?'#f5f8f8':'#93a978'}/></g>)}
  {map.terrain.filter(f=>f.kind==='river').map(f=><line key={f.id} x1={f.x1} y1={f.z1} x2={f.x2} y2={f.z2} stroke="#78c8d5" strokeWidth={f.width+10} strokeLinecap="round"/>)}
  {map.terrain.filter(f=>f.kind==='tree').map(f=><circle key={f.id} cx={f.x1} cy={f.z1} r={14+f.width} fill={snow?'#506f67':'#294d39'}/>)}
  <circle cx="0" cy="0" r="65" fill="none" stroke="#f7e4ac" strokeWidth="8" strokeDasharray="18 15"/><circle cx="0" cy="0" r="12" fill="#fff2c9"/>
 </svg>;
}

export default function CityMapPicker({value,onChange,disabled=false}){
 return <fieldset className="city-map-picker" disabled={disabled}>
  <legend>Choisis ton territoire</legend>
  <p>2 km × 2 km · même budget de départ · arbres supprimables</p>
  <div className="city-map-options">{CITY_MAP_PRESETS.map(map=><label key={map.id} className="city-map-option" data-selected={value===map.id}>
   <input type="radio" name="city-starting-map" value={map.id} checked={value===map.id} onChange={()=>onChange(map.id)}/>
   <CityMapPreview map={map}/><span className="city-map-copy"><strong>{map.name}</strong><small>{map.description}</small><b>{map.difficulty} · {map.terrain.filter(f=>f.kind==='tree').length} arbres</b></span>
  </label>)}</div>
  <small>Le cercle indique la clairière de départ. Le choix est conservé dans ta sauvegarde.</small>
 </fieldset>;
}
