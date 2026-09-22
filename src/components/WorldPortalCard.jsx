import {useState} from 'react';
import {ArrowUpRight, Cpu, Globe2, ShieldCheck} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {launchUnrealWorld,UNREAL_LAUNCH_ENABLED} from '../world/unrealLaunch.js';

const GATES=[
 ['FR','Justice'],['DZ','Loyauté'],['ES','Passion'],['MA','Noblesse'],
 ['IT','Espoir'],['TN','Courage'],['TR','Foi'],['EE','Sagesse']
];

export default function WorldPortalCard({goTo,registered=false}){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState('');

 async function openUnreal(){
  if(!registered){goTo('passport');return;}
  setBusy(true);setMessage('');
  try{
   await launchUnrealWorld();
   setMessage('Passage vers le client Unreal demandé.');
  }catch(error){
   setMessage(error instanceof Error?error.message:'Le client Unreal 3B n’a pas pu être ouvert.');
  }finally{setBusy(false);}
 }

 return <section className="world-portal" aria-labelledby="world-portal-title">
  <div className="world-portal-copy">
   <p className="eyebrow">MONDE DU 3B · NOUVELLE GÉNÉRATION</p>
   <h2 id="world-portal-title">Une plateforme qui devient un <em>monde.</em></h2>
   <p>Le web reste le cœur de ton écosystème. Le client Unreal Engine prend la relève pour l’exploration, les combats, les Gardiens, la ville vivante et les cinématiques.</p>
   <div className="world-portal-meta">
    <span><Globe2 size={16}/>8 territoires liés</span>
    <span><ShieldCheck size={16}/>Même Passeport 3B</span>
    <span><Cpu size={16}/>UE 5.8 foundation</span>
   </div>
   <div className="world-portal-actions">
    <RouteLink page="world3b" goTo={goTo} className="surface-button">Entrer dans le Monde actuel <ArrowUpRight size={16}/></RouteLink>
    {UNREAL_LAUNCH_ENABLED&&<button type="button" className="quiet-button" onClick={openUnreal} disabled={busy}>{busy?'Ouverture…':registered?'Ouvrir le client Unreal':'Passeport requis'}</button>}
   </div>
   {message&&<p className="world-portal-message" role="status">{message}</p>}
  </div>
  <div className="world-portal-stage" aria-hidden="true">
   <div className="world-portal-horizon"/>
   <div className="world-portal-ring">
    {GATES.map(([code,value],index)=><div className="world-gate" key={code} style={{'--gate':index}}><b>{code}</b><small>{value}</small></div>)}
    <div className="world-portal-core"><span>3B</span><small>MONDE</small></div>
   </div>
   <div className="world-portal-floor"><i/><i/><i/><i/><i/></div>
  </div>
 </section>;
}
