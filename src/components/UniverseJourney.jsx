import {ArrowUpRight, Building2, Fingerprint, Globe2} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {CircleArtwork} from './NexusArtwork.jsx';

const JOURNEYS = {
 passport:{number:'01',label:'TON IDENTITÉ',title:'Passeport 3B',description:'Une identité à protéger. Des preuves que tu choisis de partager.',action:'Ouvrir mon Passeport',Icon:Fingerprint},
 city3b:{number:'02',label:'TA CRÉATION',title:'Créer ma Ville',description:'Bâtis tes quartiers. Accueille leurs habitants. Fais vivre ta ville.',action:'Construire ma ville',Icon:Building2},
 world3b:{number:'03',label:'TON AVENTURE',title:'Le Monde du 3B',description:'Huit royaumes, huit valeurs. Une mémoire à reconquérir.',action:'Explorer le Monde',Icon:Globe2},
};

// Decorative illustration of the personal city; no simulated account data.
function CityIllustration(){
 return <svg viewBox="0 0 460 280" fill="none" aria-hidden="true" focusable="false">
  <path d="m28 169 197-101 205 101-205 99Z" fill="var(--3b-scene-blue-15)" stroke="var(--3b-scene-blue-60)"/>
  <path d="m28 169 197 99v13L28 182Zm197 99 205-99v13L225 281Z" fill="var(--3b-carbon)"/>
  <path d="m81 168 143 72 151-73M149 107l148 73M113 196l159-79" stroke="var(--3b-scene-muted-55)" strokeWidth="7"/>
  <path d="m81 168 143 72 151-73M149 107l148 73M113 196l159-79" stroke="var(--3b-scene-muted-85)" strokeDasharray="3 10"/>
  {[{x:144,y:110,h:54,w:36},{x:218,y:78,h:69,w:40},{x:284,y:122,h:48,w:33},{x:188,y:156,h:42,w:34},{x:254,y:172,h:75,w:40},{x:110,y:147,h:36,w:27}].map(({x,y,h,w},i)=><g key={x}>
   <path d={`m${x} ${y} ${w/2}-${w/4} ${w/2} ${w/4}-${w/2} ${w/4}Z`} transform={`translate(0,-${h})`} fill={i%2?'var(--3b-champagne)':'var(--3b-matrix)'} stroke="var(--3b-champagne-highlight)" strokeWidth=".6"/>
   <path d={`M${x} ${y-h}v${h}l${w/2} ${w/4}v-${h}Z`} fill="var(--3b-scene-blue-30)" stroke="var(--3b-scene-blue-60)" strokeWidth=".6"/>
   <path d={`m${x+w/2} ${y-h+w/4} ${w/2}-${w/4}v${h}l-${w/2} ${w/4}Z`} fill="var(--3b-scene-blue-20)" stroke="var(--3b-scene-blue-60)" strokeWidth=".6"/>
   {[12,24,36,48,60].filter(a=>a<h-3).map(a=><path key={a} d={`m${x+5} ${y-h+a} ${w/2-9} ${w/4-4}m10 0 ${w/2-9}-${w/4-4}`} stroke={i%2?'var(--3b-champagne)':'var(--3b-scene-muted-75)'} strokeWidth="2" opacity=".8"/>)}
  </g>)}
  {[{x:83,y:157},{x:315,y:160},{x:343,y:152},{x:175,y:119}].map(({x,y})=><g key={x}><path d={`M${x} ${y}v-22`} stroke="var(--3b-scene-muted-40)" strokeWidth="2"/><ellipse cx={x} cy={y-23} rx="9" ry="14" fill="var(--3b-scene-green-60)"/><path d={`M${x} ${y-11}v-14`} stroke="var(--3b-scene-muted-65)"/></g>)}
  <path d="m55 166 45-24m256 47 34-17" stroke="var(--3b-matrix)" strokeWidth="3"/>
 </svg>;
}

export default function UniverseJourney({item,goTo}){
 const journey=JOURNEYS[item.id];
 if(!journey)return null;
 const {Icon}=journey;
 return <RouteLink page={item.id} goTo={goTo} className="journey-card" data-section={item.id} data-status="open">
  <div className="journey-art" aria-hidden="true">
   {item.id==='passport'&&<div className="journey-identity"><i/><i/><Fingerprint size={104} strokeWidth={.7}/><span>3B · IDENTITÉ</span></div>}
   {item.id==='city3b'&&<CityIllustration/>}
   {item.id==='world3b'&&<CircleArtwork id="journey-nexus" large/>}
   <span className="journey-number">{journey.number}</span>
  </div>
  <div className="journey-content"><p className="journey-eyebrow"><Icon size={14}/>{journey.label}</p><h3>{journey.title}</h3><p>{journey.description}</p><span className="journey-action">{journey.action}<ArrowUpRight size={19}/></span></div>
 </RouteLink>;
}
