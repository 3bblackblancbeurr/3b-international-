import {Button} from '../design-system/index.jsx';
import React from 'react';
import {ArrowUpRight,Compass} from 'lucide-react';
import {campaignOverview} from './adventure-objective.js';

export function AdventureOverview({save,onNavigate,onExplore}){
 const story=campaignOverview(save),objective=story.objective;
 return <section className="journey-overview" aria-label="Histoire et but du Monde du 3B">
  <div className="journey-intro"><span className="world-kicker">KAÏS · PORTEUR DU LIEN</span><h3>Rallumer ce qui nous relie.</h3><p>L’Oubli efface les noms, les histoires et les liens entre les peuples. Avec Kaïs, retrouve les huit Fragments et ramène-les au Cercle Brisé, au cœur du Nexus.</p><p>Chaque royaume porte une valeur. Écoute ses habitants, traverse ses épreuves et réveille une partie du monde.</p></div>
  {objective&&<article className="journey-next"><Compass size={24}/><div><small>LA SUITE DE TON AVENTURE</small><h4>{objective.title}</h4><p>{objective.description}</p>{objective.targetId&&<Button className="world-primary" onClick={()=>onNavigate(objective.targetId)}>{objective.cta||'Placer un repère'} <ArrowUpRight size={16}/></Button>}</div></article>}
  <div className="journey-cycle" aria-label="Boucle de l’aventure"><span>Explorer</span><i>→</i><span>Retrouver un Fragment</span><i>→</i><span>Revenir au Nexus</span><i>→</i><span>Voir le monde évoluer</span></div>
  <div className="journey-heading"><h4>Les huit héritages</h4><span>{story.progress.current}/{story.progress.total} · {story.progress.label}</span></div>
  <ol className="journey-realms">{story.countries.map(country=><li key={country.id} className={country.completed?'is-complete':''}><span className="journey-seal" aria-hidden="true">{country.completed?'◆':'◇'}</span><div><strong>{country.name}</strong><small>{country.guardian} · {country.value}</small></div><span>{country.status}</span></li>)}</ol>
  <Button className="journey-explore" onClick={onExplore}>Explorer librement · ouvrir la carte <ArrowUpRight size={16}/></Button>
 </section>;
}
