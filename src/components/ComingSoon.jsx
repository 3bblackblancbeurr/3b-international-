import { useState } from 'react';
import { ArrowUpRight, Pause, Play } from 'lucide-react';

export default function ComingSoon({secret=false,goTo}){
 const[paused,setPaused]=useState(false);
 return <section className={'coming-page '+(secret?'secret-page':'manga-preview-page')} data-paused={paused}>
  <p className="eyebrow">{secret?'TRANSMISSION 3B':'3B ORIGINS'}</p>
  <h1>{secret?'Secret 3B':'Le Cercle Brisé'}</h1>
  {secret?<div className="secret-stage" aria-label="Emblème 3B en relief doré"><div className="secret-orbit"/><div className="secret-monogram" aria-hidden="true">{Array.from({length:14},(_,i)=><span key={i} style={{transform:'translateZ('+i*1.5+'px)'}}>3B</span>)}</div><div className="secret-reflection" aria-hidden="true">3B</div></div>:<div className="manga-preview-mark" aria-hidden="true"><span>8</span><small>PORTES</small></div>}
  <p className={secret?'secret-legend':'coming-label'}>{secret?'PROTOCOLE VERROUILLÉ':'TOME 0 · EN PRÉPARATION'}</p>
  <p className="coming-copy">{secret
   ? 'Le prochain chapitre de 3B reste volontairement fermé. Les indices, transmissions et ouvertures apparaîtront ici lorsqu’ils devront être révélés.'
   : 'Kaïs entre dans un monde où les valeurs se sont effacées. Huit Portes, huit Gardiens et huit fragments du Cercle Brisé relient le manga au Monde du 3B.'}</p>
  <div className="coming-status-grid" aria-label={secret?'État du Secret 3B':'État de 3B ORIGINS'}>
   {secret?<>
    <article><span>État</span><strong>Verrouillé</strong></article>
    <article><span>Signal</span><strong>En attente</strong></article>
    <article><span>Accès</span><strong>Depuis 3B</strong></article>
   </>:<>
    <article><span>Héros</span><strong>Kaïs</strong></article>
    <article><span>Arc</span><strong>Le Cercle Brisé</strong></article>
    <article><span>Structure</span><strong>8 Portes · 8 valeurs</strong></article>
   </>}
  </div>
  <div className="coming-actions">
   {secret&&<button className="quiet-button" onClick={()=>setPaused(!paused)}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'Reprendre l’animation':'Mettre en pause'}</button>}
   {!secret&&goTo&&<button className="surface-button" type="button" onClick={()=>goTo('world3b')}>Entrer dans le Monde du 3B <ArrowUpRight size={16}/></button>}
  </div>
 </section>;
}
