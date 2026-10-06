import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {launchUnrealWorld,UNREAL_LAUNCH_ENABLED} from '../world/unrealLaunch.js';
import {Button} from '../design-system/index.jsx';

export default function WorldPortalCard({goTo}){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const openNativeWorld=async()=>{
  if(busy)return;
  setBusy(true);setMessage('');
  try{await launchUnrealWorld();}
  catch{setMessage('L’expérience native 3B est momentanément indisponible. Le Monde du 3B reste accessible dans l’application.');}
  finally{setBusy(false);}
 };
 return <section className="world-portal home-world-entry" aria-labelledby="world-portal-title">
  <img className="home-world-art" src="/art/luxury-v2/hub-cite-origine.webp" alt="La Cité Origine et son Cercle Brisé" width="1672" height="941" fetchPriority="high"/>
  <div className="home-world-ring-motion" aria-hidden="true">
   <svg className="home-world-ring-svg" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" focusable="false">
    <defs>
     <linearGradient id="home-world-ring-metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#5e4f38"/>
      <stop offset=".18" stopColor="#e8d29b"/>
      <stop offset=".38" stopColor="#8f7448"/>
      <stop offset=".58" stopColor="#2b3034"/>
      <stop offset=".78" stopColor="#d7bd7d"/>
      <stop offset="1" stopColor="#57462f"/>
     </linearGradient>
     <linearGradient id="home-world-ring-blue" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#126ca1"/>
      <stop offset=".45" stopColor="#79e7ff"/>
      <stop offset=".7" stopColor="#1ba8e9"/>
      <stop offset="1" stopColor="#0b5d96"/>
     </linearGradient>
    </defs>
    <ellipse className="home-world-ring-contact" cx="836" cy="431" rx="188" ry="24"/>
    <circle className="home-world-ring-veil" cx="836" cy="228" r="202"/>
    <g className="home-world-ring-rotor">
     <circle className="home-world-ring-shadow" cx="836" cy="228" r="202"/>
     <circle className="home-world-ring-body" cx="836" cy="228" r="202"/>
     <circle className="home-world-ring-trim" cx="836" cy="228" r="184"/>
     <circle className="home-world-ring-blue" cx="836" cy="228" r="202"/>
     <g className="home-world-ring-fragments">
      <rect x="813" y="8" width="45" height="22" rx="3" transform="rotate(7 836 19)"/>
      <rect x="1040" y="115" width="38" height="20" rx="3" transform="rotate(34 1059 125)"/>
      <rect x="1014" y="342" width="43" height="22" rx="3" transform="rotate(-26 1035 353)"/>
      <rect x="676" y="381" width="39" height="20" rx="3" transform="rotate(24 695 391)"/>
     </g>
    </g>
   </svg>
  </div>
  <div className="world-portal-copy">
   <p className="eyebrow">LA CITÉ DES HUIT HÉRITAGES</p>
   <h2 id="world-portal-title">Ton monde<br/>commence <em>ici.</em></h2>
   <p>Huit portes. Une histoire à écrire.</p>
   <div className="world-portal-actions">
    <Button as={RouteLink} page="world3b" goTo={goTo} variant="champagne" className="surface-button">Explorer le Monde <ArrowUpRight size={16}/></Button>
    {UNREAL_LAUNCH_ENABLED&&<Button variant="ghost" onClick={openNativeWorld} disabled={busy} loading={busy}>{busy?'Ouverture…':'Lancer l’expérience native'}</Button>}
   </div>
   {message&&<p role="status">{message}</p>}
  </div>
  <span className="home-world-signature" aria-hidden="true">CITÉ · 8 PORTES</span>
 </section>;
}
