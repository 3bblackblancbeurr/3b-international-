import {ArrowUpRight, BookOpen, Globe2} from 'lucide-react';
import '../styles/open-spaces-3b.css';

const VALUES=['Justice','Loyauté','Passion','Noblesse','Espoir','Courage','Foi','Sagesse'];

export default function MangaPage({goTo}){
 return <section className="manga3b-open" aria-labelledby="manga3b-title">
  <div className="manga3b-hero">
   <div className="manga3b-art"><img src="/games/origins-cover.jpg" alt="Illustration de l'univers narratif 3B Origins" loading="eager"/></div>
   <div className="manga3b-copy">
    <p className="manga3b-kicker"><BookOpen size={16} aria-hidden="true"/> 3B ORIGINS · MANGA</p>
    <h1 id="manga3b-title">Le Cercle <em>Brisé.</em></h1>
    <p className="manga3b-lead">L'histoire de Kaïs commence ici. Huit portes, huit gardiens et huit valeurs à réunir face au Monstre de l'Oubli.</p>
    <p className="manga3b-meta">TOME 0 · L'OUBLI DES VALEURS</p>
    <div className="manga3b-actions">
     <a href="/manga-3b-le-cercle-brise.html" className="manga3b-primary">Découvrir le récit <ArrowUpRight size={18} aria-hidden="true"/></a>
     <button type="button" className="manga3b-secondary" onClick={()=>goTo('world3b')}><Globe2 size={17} aria-hidden="true"/> Explorer le Monde 3B</button>
    </div>
   </div>
  </div>
  <div className="manga3b-values" aria-label="Les huit valeurs du récit">{VALUES.map(value=><span key={value}>{value}</span>)}</div>
  <p className="manga3b-note">L'univers narratif est accessible. Les chapitres illustrés complets seront publiés lorsqu'ils seront disponibles.</p>
 </section>;
}
