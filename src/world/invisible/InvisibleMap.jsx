import React, {useId} from 'react';
import {Button} from '../../design-system/index.jsx';
import {Check, LockKeyhole} from 'lucide-react';
import {worldRealmArt} from '../../design-system/tokens.js';

function RealmSilhouette({realm}){
 const silhouettes={
  france:'M330 264v-58h20v-22h25v22h20v58M406 264v-35l20-15 20 15v35',
  algerie:'M315 264v-50q20-35 40 0v50M373 264v-66h25v66M412 264v-44q20-28 40 0v44',
  maroc:'M306 264v-63h25v-15h20v15h25v63M400 264v-38q25-44 50 0v38',
  tunisie:'M321 264v-39q31-52 62 0v39M402 264v-65h19v-22h10v22h19v65',
  espagne:'M307 264v-36q18-43 36 0v36M353 264v-56q20-38 40 0v56M403 264v-76q22-30 44 0v76',
  italie:'M312 264v-65h131v65M322 264v-39q12-26 24 0v39M366 264v-39q12-26 24 0v39M410 264v-39q12-26 24 0v39',
  turquie:'M311 264v-40h136v40M337 224q43-68 86 0M316 224v-70h9v70M432 224v-70h9v70',
  estonie:'M312 264v-52l20-30 20 30v52M366 264v-81l20-27 20 27v81M420 264v-42l20-26 20 26v42',
 };
 return <path d={silhouettes[realm]||silhouettes.france} fill="var(--invisible-map-stone)" stroke="var(--3b-champagne)" strokeWidth="1.5" opacity=".6"/>;
}

export default function InvisibleMap({episode,points, solved, selected, started, onSelect}) {
 const id=useId().replace(/:/g,'');
 const realm=episode?.realm||'france',city=episode?.city||'Thonon-les-Bains',palette=worldRealmArt[realm],light=solved.length/3;
 return <div className="invisible-map-wrap">
  <div className="invisible-map" aria-label={'Illustration des trois étapes à '+city} style={{'--invisible-map-stone':palette.stone,'--invisible-map-night':palette.night,'--invisible-map-cloth':palette.cloth}}>
   <svg viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
     <linearGradient id={id+'water'} x2="0" y2="1"><stop stopColor="var(--3b-hub-surface)"/><stop offset="1" stopColor="var(--3b-energy-blue-shadow)"/></linearGradient>
     <linearGradient id={id+'land'} x2="1" y2="1"><stop stopColor="var(--invisible-map-cloth)"/><stop offset="1" stopColor="var(--invisible-map-night)"/></linearGradient>
     <pattern id={id+'waves'} width="85" height="32" patternUnits="userSpaceOnUse"><path d="M0 16Q21 8 42 16T85 16" fill="none" stroke="var(--3b-energy-blue-highlight)" strokeWidth="1" opacity=".15"/></pattern>
     <pattern id={id+'blocks'} width="75" height="55" patternUnits="userSpaceOnUse"><rect x="9" y="9" width="43" height="28" rx="3" fill="var(--3b-stone-mid)" opacity=".2"/><path d="M62 0v55M0 46h75" fill="none" stroke="var(--3b-champagne)" strokeWidth="1" opacity=".09"/></pattern>
    </defs>
    <rect width="800" height="480" fill={'url(#'+id+'water)'}/><rect width="800" height="480" fill={'url(#'+id+'waves)'}/>
    <path d="M0 0H800V40L730 36 672 65 596 72 525 94 442 83 362 105 278 78 190 89 99 55 0 61Z" fill="var(--3b-carbon)" opacity=".45"/>
    <path d="M0 311Q110 260 225 286T413 278Q493 280 548 230Q585 204 621 225T699 239Q762 230 800 199V480H0Z" fill={'url(#'+id+'land)'}/>
    <path d="M0 311Q110 260 225 286T413 278Q493 280 548 230Q585 204 621 225T699 239Q762 230 800 199" fill="none" stroke="var(--3b-champagne)" opacity=".65" strokeWidth="2"/>
    <path d="M0 343Q121 290 245 318T433 309L569 262 665 277 800 238V480H0Z" fill={'url(#'+id+'blocks)'}/>
    <path d="M81 435Q210 376 358 391T612 344L739 315" fill="none" stroke="var(--3b-champagne)" strokeWidth="3" opacity=".18"/>
    <path d="M290 480L309 394 361 355 374 291M559 480L568 353 604 284" fill="none" stroke="var(--3b-champagne)" opacity=".12" strokeWidth="4"/>
    <g stroke="var(--3b-champagne-highlight)" fill="var(--3b-stone-deep)" opacity=".7"><path d="M409 408v-55l12-13 12 13v55ZM417 340v-20h8v20"/><path d="M457 384v-31l17-9 17 9v31z"/><path d="M126 321h62v-16h-62zM169 305v-45h5v45"/></g>
    <RealmSilhouette realm={realm}/>
    <g stroke="var(--3b-champagne-highlight)" fill="var(--3b-champagne)" opacity={.12+light*.7}><path d="M193 389L355 299 606 384" strokeWidth="2" fill="none"/>{[0,1,2,3,4,5,6].map(i=><circle key={i} cx={195+i*65} cy={355+(i%2)*24} r={2+light*2}/>)}</g>
    <g fill="var(--3b-text)" fontFamily="inherit" fontSize="13" letterSpacing="4" opacity=".5"><text x="300" y="142">{realm==='france'?'LAC LÉMAN':'LES TRACES INVISIBLES'}</text><text x="80" y="447" fontSize="10">{city.toUpperCase()}</text></g>
    <g transform="translate(741 113)" fill="none" stroke="var(--3b-champagne)" opacity=".6"><circle r="24"/><path d="M0-36V36M-36 0h72M0-20l6 20-6-5-6 5z"/><text x="0" y="-45" fill="var(--3b-champagne)" stroke="none" textAnchor="middle" fontSize="11">N</text></g>
   </svg>
   {points.map((point,index)=>{
    const done=solved.includes(point.id),locked=!started||index>solved.length;
    return <div key={point.id} className="invisible-map-pin-slot" style={{left:point.position.x+'%',top:point.position.y+'%'}}><Button data-testid={'point-'+point.id} variant="ghost" className={'invisible-map-pin'+(selected===point.id?' is-selected':'')+(done?' is-solved':'')} disabled={locked} aria-label={`${index+1}. ${point.name}${done?' · résolu':locked?' · verrouillé':''}`} aria-pressed={selected===point.id} onClick={()=>onSelect(point.id)}><span aria-hidden="true">{done?<Check size={19}/>:locked?<LockKeyhole size={17}/>:index+1}</span></Button></div>;
   })}
   <span className="invisible-map-seal" aria-hidden="true">3B · ATLAS INVISIBLE</span>
  </div>
  <p className="invisible-map-caption">Carte artistique de fiction, sans échelle : les marqueurs racontent l’aventure. Ils ne donnent aucun itinéraire. {solved.length?solved.length+' trace'+(solved.length>1?'s':'')+' illumine'+(solved.length>1?'nt':'')+' la ville.':'La ville s’illumine à chaque réponse.'}</p>
  <ol className="invisible-waypoints">
   {points.map((point,index)=>{const done=solved.includes(point.id),locked=!started||index>solved.length;return <li key={point.id}><Button variant="ghost" className={selected===point.id?'is-selected':''} disabled={locked} aria-pressed={selected===point.id} onClick={()=>onSelect(point.id)}><span className="invisible-waypoint-number" aria-hidden="true">{done?<Check size={16}/>:index+1}</span><span><strong>{point.name}</strong><small>{done?'Écho retrouvé':locked?'À découvrir ensuite':'Énigme disponible'}</small></span>{locked&&<LockKeyhole size={15} aria-hidden="true"/>}</Button></li>;})}
  </ol>
 </div>;
}
