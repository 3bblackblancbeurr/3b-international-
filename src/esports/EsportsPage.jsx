import {ArrowRight, Swords, Trophy} from 'lucide-react';
import '../styles/open-spaces-3b.css';

export default function EsportsPage({goTo}){
 return <section className="esports3b-open" aria-labelledby="esports3b-title">
  <div className="esports3b-emblem" aria-hidden="true"><span>16</span><i>—</i><span>18</span></div>
  <div className="esports3b-content">
   <p className="esports3b-kicker"><Swords size={17} aria-hidden="true"/> 3B ESPORTS</p>
   <h1 id="esports3b-title">16-18 <em>e-sport</em></h1>
   <p>L'espace de l'équipe 16-18. Notre terrain de compétition : Warzone.</p>
   <div className="esports3b-divider"/>
   <p className="esports3b-subline"><Trophy size={18} aria-hidden="true"/> Équipe 16-18 · 3B ESPORTS</p>
   <button type="button" className="esports3b-link" onClick={()=>goTo('sport')}>Voir l'Espace sport 3B <ArrowRight size={18} aria-hidden="true"/></button>
  </div>
 </section>;
}
