import React,{useState} from 'react';
import {createPortal} from 'react-dom';
import {Play} from 'lucide-react';
import GamesHubBase from './GamesHubBase.jsx';
import Underground3B from './underground/Underground3B.jsx';

export default function GamesHub({goTo}){
 const[underground,setUnderground]=useState(false);
 return <>
  <section className="arcade underground-launch" aria-label="3B Underground">
   <div className="premium-library">
    <button className="premium-game-card" data-game="underground" onClick={()=>setUnderground(true)}>
     <span className="premium-card-art" aria-hidden="true"><span className="premium-card-number">05</span><span className="premium-card-sprite"/></span>
     <span className="premium-card-copy"><span className="premium-card-genre">COURSE 3D · CARRIÈRE · 8 PAYS</span><strong>3B Underground — Le Cercle Brisé</strong><span className="premium-card-description">192 épreuves, 8 Gardiens, rivaux, garage, tuning, progression et course 3D. Les voitures restent des prototypes jusqu’à la phase modèles.</span><span className="premium-card-bottom"><span>Socle jouable</span><span className="premium-card-play"><Play size={15}/>Jouer</span></span></span>
    </button>
   </div>
  </section>
  <GamesHubBase goTo={goTo}/>
  {underground&&createPortal(<Underground3B onClose={()=>setUnderground(false)}/>,document.body)}
 </>;
}
