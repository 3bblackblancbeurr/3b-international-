import {useState} from 'react';
import {ArrowUpRight, CircleDot, Globe2, ShieldCheck} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {launchUnrealWorld,UNREAL_LAUNCH_ENABLED} from '../world/unrealLaunch.js';


export default function WorldPortalCard({goTo}){
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');

 const openNativeWorld=async()=>{
  if(busy)return;
  setBusy(true);setMessage('');
  try{await launchUnrealWorld();}
  catch{setMessage('L’expérience native 3B est momentanément indisponible. Le Monde du 3B reste accessible dans l’application.');}
  finally{setBusy(false);}
 };

 return <section className="world-portal" aria-labelledby="world-portal-title">
  <div className="world-portal-copy">
   <p className="eyebrow">LE MONDE DU 3B · CITÉ DES HUIT HÉRITAGES</p>
   <h2 id="world-portal-title">Une cité vivante. <em>Huit héritages reliés.</em></h2>
   <p>Le Hub est une métropole entière : quartiers utiles, bâtiments vivants, transports, secrets et huit Portes dispersées dans la Cité. Chaque Gardien libéré transforme durablement le monde.</p>
   <div className="world-portal-meta">
    <span><Globe2 size={16}/>8 Portes reliées</span>
    <span><CircleDot size={16}/>10 quartiers utiles</span>
    <span><ShieldCheck size={16}/>Même Passeport 3B</span>
   </div>
   <div className="world-portal-actions">
    <RouteLink page="world3b" goTo={goTo} className="surface-button">Entrer dans le Monde du 3B <ArrowUpRight size={16}/></RouteLink>
    {UNREAL_LAUNCH_ENABLED&&<button type="button" className="quiet-button world-native-button" onClick={openNativeWorld} disabled={busy}>{busy?'Ouverture…':'Lancer l’expérience native'}</button>}
   </div>
   {message&&<p className="world-portal-message" role="status">{message}</p>}
  </div>

  <div className="world-portal-stage world-portal-city-stage" aria-hidden="true">
   <div className="nexus-atmosphere"><i/><i/><i/></div>
   <img className="hub-city-canon-map" src="/world/hub/cite-huit-heritages-canon-v3.svg" alt="" loading="lazy"/>
   <span className="hub-city-stage-badge"><b>3B</b><small>CITÉ DES HUIT HÉRITAGES</small></span>
  </div>
 </section>;
}
