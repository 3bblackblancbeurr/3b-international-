import {useState} from 'react';
import {ArrowUpRight, CircleDot, Globe2, ShieldCheck} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {launchUnrealWorld,UNREAL_LAUNCH_ENABLED} from '../world/unrealLaunch.js';

const GATES=[
 ['FR','Justice'],['DZ','Loyauté'],['ES','Passion'],['MA','Noblesse'],
 ['IT','Espoir'],['TN','Courage'],['TR','Foi'],['EE','Sagesse']
];

const BUILDINGS=[
 ['4%','10%','37%','cyan'],['14%','8%','55%','gold'],['23%','12%','43%','blue'],['35%','8%','68%','gold'],
 ['44%','13%','49%','cyan'],['58%','9%','72%','blue'],['68%','12%','46%','gold'],['81%','7%','61%','cyan'],['89%','8%','35%','blue']
];

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
   <p className="eyebrow">LE MONDE DU 3B · NEXUS</p>
   <h2 id="world-portal-title">Une plateforme qui devient un <em>monde.</em></h2>
   <p>Depuis ton téléphone, le Nexus relie les huit Portes, les quartiers, les Gardiens, les missions et ta progression. Un seul Passeport 3B accompagne toute ton aventure.</p>
   <div className="world-portal-meta">
    <span><Globe2 size={16}/>8 Portes reliées</span>
    <span><CircleDot size={16}/>Nexus central</span>
    <span><ShieldCheck size={16}/>Même Passeport 3B</span>
   </div>
   <div className="world-portal-actions">
    <RouteLink page="world3b" goTo={goTo} className="surface-button">Entrer dans le Monde du 3B <ArrowUpRight size={16}/></RouteLink>
    {UNREAL_LAUNCH_ENABLED&&<button type="button" className="quiet-button world-native-button" onClick={openNativeWorld} disabled={busy}>{busy?'Ouverture…':'Lancer l’expérience native'}</button>}
   </div>
   {message&&<p className="world-portal-message" role="status">{message}</p>}
  </div>

  <div className="world-portal-stage" aria-hidden="true">
   <div className="nexus-skyline">
    {BUILDINGS.map(([left,width,height,tone],index)=><span className={'nexus-building nexus-building-'+tone} key={index} style={{'--left':left,'--width':width,'--height':height,'--delay':(-index*.65)+'s'}}><i/><i/></span>)}
   </div>
   <div className="nexus-ring-scene">
    <div className="nexus-ring nexus-ring-outer"/>
    <div className="nexus-ring nexus-ring-inner"/>
    {GATES.map(([code,value],index)=><span className="nexus-gate-marker" key={code} style={{'--angle':(index*45)+'deg','--counter-angle':(-index*45)+'deg'}}><b>{code}</b><small>{value}</small></span>)}
    <div className="nexus-core"><span>3B</span><small>NEXUS</small></div>
   </div>
   <div className="nexus-avenue"><i/><i/><i/></div>
  </div>
 </section>;
}
