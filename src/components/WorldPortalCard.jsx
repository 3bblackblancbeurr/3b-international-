import {useState} from 'react';
import {ArrowUpRight, CircleDot, Globe2, ShieldCheck} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {CircleArtwork} from './NexusArtwork.jsx';
import {launchUnrealWorld,UNREAL_LAUNCH_ENABLED} from '../world/unrealLaunch.js';

const GATES=[
 {code:'FR',value:'Justice',x:50,y:4},
 {code:'DZ',value:'Loyauté',x:78,y:15},
 {code:'ES',value:'Passion',x:95,y:42},
 {code:'MA',value:'Noblesse',x:85,y:72},
 {code:'IT',value:'Espoir',x:63,y:91},
 {code:'TN',value:'Courage',x:37,y:91},
 {code:'TR',value:'Foi',x:15,y:72},
 {code:'EE',value:'Sagesse',x:5,y:42},
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
   <div className="nexus-atmosphere"><i/><i/><i/></div>
   <div className="nexus-authentic-circle nexus-ring-scene">
    <CircleArtwork id="home-nexus-circle" large doors={GATES.map(gate=>({code:gate.code,sealed:false,restored:false}))}/>
    <div className="nexus-gates">
     {GATES.map((gate,index)=><span className="nexus-portal-pylon" key={gate.code} style={{'--x':gate.x+'%','--y':gate.y+'%','--i':index}}>
       <i className="nexus-pylon-frame"/>
       <b>{gate.code}</b><small>{gate.value}</small>
      </span>)}
    </div>
    <span className="nexus-circle-plinth"><b>3B</b><small>NEXUS</small></span>
   </div>
   <div className="nexus-avenue"><i/><i/><i/></div>
  </div>
 </section>;
}
