import {MapPin} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {Button} from '../design-system/index.jsx';
import {ATLAS_PORTALS,atlasConnections,atlasPortalForRealm} from './atlas-map-model.js';

export {ATLAS_PORTALS} from './atlas-map-model.js';
export default function AtlasCinematicMap({onRealm,onTravel,activeRealm}){
 const frameRef=useRef(null);
 const [frame,setFrame]=useState(null);
 const selectedPortal=atlasPortalForRealm(activeRealm);
 const connections=atlasConnections(activeRealm);
 useEffect(()=>{
  const stage=frameRef.current?.parentElement;
  if(!stage)return;
  const sync=()=>{
   const rect=stage.getBoundingClientRect();
   const width=Math.max(120,Math.min(rect.width>=900?rect.width*.82:rect.width,rect.height*2));
   const height=width/2;
   setFrame(prev=>prev&&Math.abs(prev.width-width)<1?prev:{width,height});
  };
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(sync):null;
  observer?.observe(stage);sync();
  return()=>observer?.disconnect();
 },[]);
 return <div ref={frameRef} style={frame?{width:frame.width,height:frame.height}:undefined} className="atlas3b-worldmap" role="group" aria-label="Planisphère terrestre nocturne et routes d'exploration illustratives">
  <picture>
   {/* The photographic fallback remains available at /art/earth/black-marble-mobile.webp. */}
   <img className="atlas3b-earth-photo" src="/art/atlas-v4/world-prestige.webp" alt="Illustration de la Terre nocturne, continents éclairés d’or et routes d’exploration" decoding="async" fetchPriority="high"/>
  </picture>
  <svg className="atlas3b-flight-paths" viewBox="0 0 1000 500" aria-hidden="true" focusable="false" preserveAspectRatio="none">
   <defs>
    <linearGradient id="atlas3b-sky-arc" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stopColor="var(--3b-champagne)" stopOpacity=".08"/>
     <stop offset=".5" stopColor="var(--3b-champagne-highlight)" stopOpacity=".96"/>
     <stop offset="1" stopColor="var(--3b-champagne-deep)" stopOpacity=".14"/>
    </linearGradient>
    <linearGradient id="atlas3b-ice-arc">
     <stop offset="0" stopColor="var(--3b-energy-cyan)" stopOpacity=".03"/>
     <stop offset=".48" stopColor="var(--3b-matrix)" stopOpacity=".9"/>
     <stop offset="1" stopColor="var(--3b-energy-blue-highlight)" stopOpacity=".16"/>
    </linearGradient>
   </defs>
   {connections.map(({id,path,color,activePath})=><g key={id}>
    <path d={path} className="atlas3b-flight-base"
     stroke={color==='warm'?'url(#atlas3b-sky-arc)':'url(#atlas3b-ice-arc)'}
     fill="none" strokeWidth="1.35" strokeLinecap="round" opacity=".75"/>
    {activePath&&<path d={activePath} className={'atlas3b-flight-line atlas3b-flight-line--'+color+' is-active'}
     stroke={color==='warm'?'url(#atlas3b-sky-arc)':'url(#atlas3b-ice-arc)'}
     fill="none" strokeWidth="3" strokeLinecap="round" pathLength="100"/>}
   </g>)}
  </svg>
  {ATLAS_PORTALS.map(p=><Button variant="ghost" key={p.id} type="button"
   className={'atlas3b-map-pin'+(p.gold?' atlas3b-map-pin--gold':'')+(p.id===selectedPortal?' is-selected':'')}
   style={{left:p.x+'%',top:p.y+'%'}}
   aria-pressed={p.action==='travel'?undefined:p.id===selectedPortal}
   aria-label={'Explorer '+p.label+(p.action==='travel'?' dans Voyage 3B':' dans les royaumes 3B')}
   title={p.label}
   onClick={()=>p.action==='travel'?onTravel():onRealm(p.action)}>
   <MapPin size={p.gold?21:18} strokeWidth={2} aria-hidden="true"/>
  </Button>)}
  <span className="atlas3b-night-signature" aria-hidden="true">THE WORLD IS OUR HOME</span>
 </div>;
}
