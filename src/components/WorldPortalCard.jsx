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
  <div className="home-world-stone-decor" aria-hidden="true">
   <span className="home-world-stone-pillar home-world-stone-pillar-left"/>
   <span className="home-world-stone-pillar home-world-stone-pillar-right"/>
   <span className="home-world-stone-platform"/>
  </div>
  <div className="home-world-ring-motion" aria-hidden="true">
   <svg className="home-world-ring-svg" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" focusable="false">
    <defs>
     <pattern id="home-world-ring-stone" patternUnits="userSpaceOnUse" width="64" height="46">
      <rect width="64" height="46" fill="#5b5b58"/>
      <path d="M0 7L64 2V21L0 27Z" fill="#77756f" opacity=".72"/>
      <path d="M0 33L64 24V46H0Z" fill="#444746" opacity=".92"/>
      <path d="M8 0L14 46M39 0L34 46M0 15L64 12M0 38L64 34" stroke="#252827" strokeWidth="2" opacity=".7"/>
      <path d="M18 4L25 14L21 24L31 35M50 6L44 17L52 29L47 42" fill="none" stroke="#aaa69c" strokeWidth="1.4" opacity=".48"/>
     </pattern>
     <linearGradient id="home-world-ring-blue" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#126ca1"/>
      <stop offset=".45" stopColor="#79e7ff"/>
      <stop offset=".7" stopColor="#1ba8e9"/>
      <stop offset="1" stopColor="#0b5d96"/>
     </linearGradient>
    </defs>
    <g className="home-world-ring-plinth">
     <path d="M638 419H1034L1088 462H584Z"/>
     <path d="M682 396H990L1025 423H647Z"/>
     <path className="home-world-ring-plinth-blue" d="M690 421H982"/>
    </g>
    <ellipse className="home-world-ring-contact" cx="836" cy="431" rx="188" ry="24"/>
    <circle className="home-world-ring-veil" cx="836" cy="228" r="202"/>
    <g className="home-world-ring-rotor">
     <circle className="home-world-ring-shadow" cx="836" cy="228" r="202"/>
     <circle className="home-world-ring-body" cx="836" cy="228" r="202"/>
     <circle className="home-world-ring-masonry" cx="836" cy="228" r="202"/>
     <circle className="home-world-ring-trim" cx="836" cy="228" r="178"/>
     <circle className="home-world-ring-blue" cx="836" cy="228" r="202"/>
     <circle className="home-world-ring-blue-inner" cx="836" cy="228" r="164"/>
     <g className="home-world-ring-fragments">
      <rect x="807" y="4" width="58" height="28" rx="2" transform="rotate(7 836 18)"/>
      <rect x="1035" y="108" width="52" height="27" rx="2" transform="rotate(34 1061 121)"/>
      <rect x="1008" y="337" width="57" height="29" rx="2" transform="rotate(-26 1036 351)"/>
      <rect x="669" y="375" width="54" height="28" rx="2" transform="rotate(24 696 389)"/>
      <rect x="605" y="196" width="48" height="25" rx="2" transform="rotate(-18 629 208)"/>
     </g>
     <g className="home-world-ring-cracks">
      <path d="M720 72l18 14-11 16 22 18"/>
      <path d="M960 94l-17 18 13 14-19 19"/>
      <path d="M1008 258l-20 12 8 18-23 11"/>
      <path d="M749 374l14-19 18 8 10-24"/>
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
