import React from 'react';
import {Button} from '../design-system/index.jsx';
import {DEFAULT_WORLD_VISUAL} from './visual-preferences.js';

export function VisualSettings({value,onChange}){
 return <section className="world-quality world-visual-settings" aria-label="Confort visuel">
  <h3>Confort visuel</h3>
  <label className="world-audio-slider" htmlFor="world-brightness"><span>Luminosité <b>{Math.round(value.brightness*100)} %</b></span>
   <input id="world-brightness" type="range" min="0.8" max="1.5" step="0.05" value={value.brightness} onChange={event=>onChange({...value,brightness:Number(event.target.value)})}/>
  </label>
  <label className="world-shadow-assist"><input type="checkbox" checked={value.shadowAssist} onChange={event=>onChange({...value,shadowAssist:event.target.checked})}/> Mieux voir dans les ombres</label>
  <p>Éclaircit les personnages et les chemins sombres. La nuit, la météo et les missions gardent leur rythme. Ces réglages restent sur cet appareil.</p>
  <Button variant="ghost" onClick={()=>onChange({...DEFAULT_WORLD_VISUAL})}>Réinitialiser le confort visuel</Button>
 </section>;
}
