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
   <img className="home-world-ring-layer" src="/art/luxury-v2/hub-cite-origine.webp" alt="" width="1672" height="941"/>
   <span className="home-world-ring-energy"/>
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
