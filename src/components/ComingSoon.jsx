import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
export default function ComingSoon({secret=false}){
 const[paused,setPaused]=useState(false);
 return <section className={'coming-page '+(secret?'secret-page':'')} data-paused={paused}>
  <p className="eyebrow">3B INTERNATIONAL</p><h1>{secret?'Secret 3B':'Manga 3B'}</h1>
  {secret&&<div className="secret-stage" aria-label="Emblème 3B en relief doré"><div className="secret-orbit"/><div className="secret-monogram" aria-hidden="true">{Array.from({length:14},(_,i)=><span key={i} style={{transform:'translateZ('+i*1.5+'px)'}}>3B</span>)}</div><div className="secret-reflection" aria-hidden="true">3B</div></div>}
  <p className={secret?'secret-legend':'coming-label'}>Bientôt</p>
  {secret&&<button className="quiet-button" onClick={()=>setPaused(!paused)}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'Reprendre l’animation':'Mettre en pause'}</button>}
 </section>;
}
