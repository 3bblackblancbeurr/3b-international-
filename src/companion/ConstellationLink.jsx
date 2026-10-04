import { useState } from 'react';
import { Button } from '../design-system/index.jsx';
import { STAR_POSITIONS, selectConstellationStar } from './constellation.js';

export default function ConstellationLink({ bond, onChange, onComplete }){
  const [notice,setNotice]=useState('');
  function choose(id){
    const next=selectConstellationStar(bond,id);
    if(next.length===bond.length)return;
    const saved=onChange(next);
    setNotice(saved?'':'Ton lien reste disponible pendant cette visite.');
    if(next.length===8)onComplete();
  }
  const complete=bond.length===8;
  return <section className="companion3b-link" aria-labelledby="companion-link-title">
    <div className="companion3b-link-heading"><h3 id="companion-link-title">Le lien</h3><span>{bond.length} / 8</span></div>
    <p>{complete?'Ta constellation accompagne ton gardien.':'Relie huit étoiles, dans ton ordre. Crée votre constellation.'}</p>
    <div className="companion3b-starfield">
      <svg viewBox="0 0 100 100" aria-hidden="true"><polyline points={(complete?[...bond,bond[0]]:bond).map(id=>STAR_POSITIONS[id].join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth=".6"/></svg>
      {STAR_POSITIONS.map(([x,y],id)=><Button key={id} variant="ghost" className="companion3b-star" aria-label={`Étoile ${id+1}${bond.includes(id)?' reliée':''}`} aria-pressed={bond.includes(id)} disabled={bond.includes(id)} style={{left:`${x}%`,top:`${y}%`}} onClick={()=>choose(id)}><span aria-hidden="true">✦</span>{bond.includes(id)&&<small aria-hidden="true">{bond.indexOf(id)+1}</small>}</Button>)}
      <span className="companion3b-starfield-core" aria-hidden="true">{complete?'✧':'·'}</span>
    </div>
    <p className="companion3b-link-status" role="status" aria-live="polite">{notice|| (complete?'Enregistrée sur cet appareil.':'Chaque étoile choisie rejoint son orbite.')}</p>
    {bond.length>0&&<Button variant="ghost" className="companion3b-link-reset" onClick={()=>{onChange([]);setNotice('');}}>Tisser un autre lien</Button>}
  </section>;
}
