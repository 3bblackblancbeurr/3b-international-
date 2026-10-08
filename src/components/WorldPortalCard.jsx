import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {launchUnrealWorld,UNREAL_LAUNCH_ENABLED} from '../world/unrealLaunch.js';
import {Button} from '../design-system/index.jsx';
import BrokenCircle3D from './BrokenCircle3D.jsx';

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
  <div className="home-world-atmosphere" aria-hidden="true"><div className="home-world-horizon"/><div className="home-world-skyline"/><span className="home-world-ray ray-1"/><span className="home-world-ray ray-2"/><span className="home-world-ray ray-3"/></div>
  <BrokenCircle3D variant="menu"/>
  <div className="world-portal-copy">
   <p className="eyebrow">3B INTERNATIONAL <span className="home-world-live">· UNIVERS PERSISTANT</span></p>
   <h2 id="world-portal-title">Huit portes.<br/><em>Une légende.</em></h2>
   <p>Traverse la Cité des Huit Héritages. Explore, rencontre les Gardiens et fais évoluer un monde vivant.</p>
   <div className="world-portal-actions">
    <Button as={RouteLink} page="world3b" goTo={goTo} variant="champagne" className="surface-button">Explorer le Monde <ArrowUpRight size={16}/></Button>
    {UNREAL_LAUNCH_ENABLED&&<Button variant="ghost" onClick={openNativeWorld} disabled={busy} loading={busy}>{busy?'Ouverture…':'Lancer l’expérience native'}</Button>}
   </div>
   {message&&<p role="status">{message}</p>}
  </div>
  <div className="home-world-signature" aria-hidden="true"><span>8 ROYAUMES</span><i/><span>8 GARDIENS</span><i/><span>UN SEUL MONDE</span></div>
 </section>;
}
