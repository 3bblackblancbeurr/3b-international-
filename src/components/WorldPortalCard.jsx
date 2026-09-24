import {useState} from 'react';
import {ArrowUpRight, CircleDot, Globe2, ShieldCheck} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {launchUnrealWorld,UNREAL_LAUNCH_ENABLED} from '../world/unrealLaunch.js';
import hubPlan from '../world/hub/data/hub-master-plan-v2.json' with { type: 'json' };

const DISTRICTS=hubPlan.districts.map(district=>({
 id:district.id,name:district.name,x:district.center[0]*100,y:district.center[1]*100,kind:district.kind,
}));
const DISTRICT_BY_ID=Object.fromEntries(DISTRICTS.map(district=>[district.id,district]));
const GATES=hubPlan.countries.map(country=>({
 code:country.code,value:country.value,country:country.country,x:country.gateMap[0]*100,y:country.gateMap[1]*100,district:country.gateDistrict,color:country.color,
}));


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
   <p className="eyebrow">LE MONDE DU 3B · LA CITÉ DES HUIT HÉRITAGES</p>
   <h2 id="world-portal-title">Une cité qui évolue avec ton <em>histoire.</em></h2>
   <p>Le Hub central réunit dix quartiers utiles, des bâtiments vivants, les transports 3B et huit Portes physiques dispersées dans la Cité. Chaque Gardien libéré transforme réellement le monde à ton retour.</p>
   <div className="world-portal-meta">
    <span><Globe2 size={16}/>8 Portes dispersées</span>
    <span><CircleDot size={16}/>10 quartiers vivants</span>
    <span><ShieldCheck size={16}/>Hub central · zone sûre</span>
   </div>
   <div className="world-portal-actions">
    <RouteLink page="world3b" goTo={goTo} className="surface-button">Entrer dans le Monde du 3B <ArrowUpRight size={16}/></RouteLink>
    {UNREAL_LAUNCH_ENABLED&&<button type="button" className="quiet-button world-native-button" onClick={openNativeWorld} disabled={busy}>{busy?'Ouverture…':'Lancer l’expérience native'}</button>}
   </div>
   {message&&<p className="world-portal-message" role="status">{message}</p>}
  </div>

  <div className="world-portal-stage world-heritage-city-preview" aria-hidden="true">
   <div className="nexus-atmosphere"><i/><i/><i/></div>
   <svg className="heritage-city-network" viewBox="0 0 100 100" preserveAspectRatio="none">
    {DISTRICTS.filter(district=>district.id!=='heritage_square').map(district=><line key={'d-'+district.id} x1="50" y1="53" x2={district.x} y2={district.y}/>)}
    {GATES.map(gate=>{const district=DISTRICT_BY_ID[gate.district];return district?<line key={'g-'+gate.code} className="heritage-gate-link" x1={gate.x} y1={gate.y} x2={district.x} y2={district.y}/>:null;})}
    <polyline className="heritage-train-loop" points={hubPlan.transport.train.stations.map(id=>{const district=DISTRICT_BY_ID[id];return district?district.x+','+district.y:'';}).filter(Boolean).concat([(()=>{const d=DISTRICT_BY_ID[hubPlan.transport.train.stations[0]];return d?d.x+','+d.y:'';})()]).join(' ')}/>
   </svg>
   <div className="heritage-city-core"><b>3B</b><span>TOUR DU CERCLE BRISÉ</span><small>PLACE DE L’HÉRITAGE</small></div>
   <div className="heritage-city-districts">
    {DISTRICTS.map(district=><span className={'heritage-district heritage-district-'+district.kind} key={district.id} style={{'--x':district.x+'%','--y':district.y+'%'}}><i/><small>{district.name}</small></span>)}
   </div>
   <div className="heritage-city-gates">
    {GATES.map(gate=><span className="heritage-country-gate" key={gate.code} style={{'--x':gate.x+'%','--y':gate.y+'%','--gate-color':gate.color}}><b>{gate.code}</b><small>{gate.value}</small></span>)}
   </div>
   <div className="heritage-city-water heritage-city-water-a"/><div className="heritage-city-water heritage-city-water-b"/>
   <div className="heritage-city-caption"><strong>LA CITÉ DES HUIT HÉRITAGES</strong><span>10 quartiers · 8 Portes dispersées · une ville vivante</span></div>
  </div>
 </section>;
}
