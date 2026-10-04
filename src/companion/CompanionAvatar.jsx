import { STAR_POSITIONS, sanitizeConstellation } from './constellation.js';

export default function CompanionAvatar({ mode='idle', interaction='', bond=[], reduced=false, size=118, title='Compagnon 3B', decorative=false }) {
  const stars=sanitizeConstellation(bond);
  const points=stars.map(i=>STAR_POSITIONS[i].join(',')).join(' ');
  return <span className="companion3b-avatar companion3b-avatar-street" data-mode={mode} data-interaction={interaction} data-reduced={reduced} style={{width:size,height:Math.round(size*1.38)}} role={decorative?undefined:'img'} aria-label={decorative?undefined:title} aria-hidden={decorative||undefined}>
    <span className="companion3b-street-aura" aria-hidden="true"/>
    <img className="companion3b-street-art" src="/companion/robot-streetwear-v1.png" alt="" draggable="false" decoding="async"/>
    {stars.length>1&&<svg className="companion3b-signature" viewBox="0 0 100 100" aria-hidden="true"><polyline points={points+(stars.length===8?' '+STAR_POSITIONS[stars[0]].join(','):'')} fill="none" stroke="currentColor" strokeWidth=".55"/>{stars.map(i=><circle key={i} cx={STAR_POSITIONS[i][0]} cy={STAR_POSITIONS[i][1]} r="1.1" fill="currentColor"/>)}</svg>}
  </span>;
}
