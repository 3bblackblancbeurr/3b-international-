import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import SecretPage from '../secret/SecretPage.jsx';

export default function ComingSoon({secret=false}){
 const[paused,setPaused]=useState(false);
 if(secret)return <SecretPage/>;
 return <section className="coming-page" data-paused={paused}>
  <p className="eyebrow">3B INTERNATIONAL</p><h1>Manga 3B</h1>
  <p className="coming-label">Bientôt</p>
  <button className="quiet-button" onClick={()=>setPaused(!paused)}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'Reprendre l’animation':'Mettre en pause'}</button>
 </section>;
}
