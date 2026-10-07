import React from 'react';
import {ArrowUp,Check,Compass,Footprints,Map,MessageCircle,Navigation,X} from 'lucide-react';
import {controlLabel} from '../control-bindings.js';
import {Button} from '../../design-system/index.jsx';
import {hubItemLabel,hubObjectiveLabel} from './presentation.js';

export const HUB_ORIENTATION_KEY='3b-hub-orientation-v1';
const emptyProgress=()=>({moved:false,mapOpened:false,interacted:false});

export function readHubOrientation(storage){
 try{
  storage??=globalThis.localStorage;
  const saved=JSON.parse(storage?.getItem?.(HUB_ORIENTATION_KEY)||'null');
  return {seen:!!saved?.seen||saved===1,progress:updateHubOrientation(saved?.progress)};
 }catch{return {seen:false,progress:emptyProgress()};}
}

export function writeHubOrientation(progress,seen,storage){
 const record={seen:!!seen,progress:updateHubOrientation(progress)};
 try{(storage??globalThis.localStorage)?.setItem?.(HUB_ORIENTATION_KEY,JSON.stringify(record));}catch{}
 return record;
}

export function updateHubOrientation(progress=emptyProgress(),event={}){
 const next={moved:progress?.moved===true,mapOpened:progress?.mapOpened===true,interacted:progress?.interacted===true};
 if(event.type==='move'&&Number.isFinite(event.distance)&&event.distance>=2)next.moved=true;
 if(event.type==='map')next.mapOpened=true;
 if(event.type==='interact')next.interacted=true;
 return next;
}

/** A UI label must never fall back to an authored machine identifier. */
export function humanHubText(value,fallback='Lieu de la cité'){
 if(typeof value!=='string')return fallback;
 const text=value.trim();
 return !text||text.includes('_')||/\b(?:talk|weather|hub|signal|building|transport|npc):/i.test(text)?fallback:text;
}

export function hubDistanceLabel(distance){
 if(!Number.isFinite(distance)||distance<0)return 'Distance à confirmer';
 if(distance<1000)return Math.round(distance)+' m';
 return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(distance/1000)+' km';
}

export function createHubObjectiveModel(snapshot={},goal=null,items=[]){
 const target=snapshot.waypoint||goal?.item||null;
 const position=snapshot.position||{},validPoint=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z);
 const direct=validPoint(target)&&validPoint(position)?Math.hypot(target.x-position.x,target.z-position.z):null;
 const route=(Array.isArray(snapshot.route)?snapshot.route:[]).filter(validPoint);
 const guiding=!!snapshot.waypoint&&route.length>0;
 let routeDistance=0,previous=position;
 if(guiding&&validPoint(position))for(const point of route){routeDistance+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;}
 const distance=guiding&&validPoint(position)?routeDistance:direct;
 const district=items.find(item=>item.type==='hubDistrict'&&item.district===target?.district);
 const destination=humanHubText(target?hubItemLabel(target):null,humanHubText(district?.name,'La Cité des Huit Héritages'));
 const label=snapshot.waypoint?destination:goal?humanHubText(hubObjectiveLabel(goal.label),'Découvre les lieux et les habitants de la cité'):'Découvre les lieux et les habitants de la cité';
 const missionLabel=snapshot.waypoint&&goal&&goal.item?.id!==target?.id?humanHubText(hubObjectiveLabel(goal.label),''):null;
 const arrived=!!snapshot.waypoint&&direct!==null&&direct<=Math.max(3,Math.min(7,target?.range||7));
 return {
  target,destination,label,missionLabel,distance,distanceLabel:hubDistanceLabel(distance),guiding,arrived,
  hasWaypoint:!!snapshot.waypoint,
  canNavigate:validPoint(target),
  status:arrived?'Tu es à proximité':guiding?'Guidage en cours':snapshot.waypoint?'Repère choisi':goal?'Prochaine étape':'Exploration libre',
  distanceDescription:guiding?'sur ton chemin':'à vol d’oiseau',
  detail:arrived?'Approche le lieu et choisis l’action proposée.':guiding?'Le chemin doré suit ton trajet. Tu peux reprendre la main en te déplaçant.':snapshot.waypoint?'Suis le repère ou lance le guidage.':'Choisis un repère pour commencer ; la carte reste disponible à tout moment.',
 };
}

export function HubObjectiveCard({model,onNavigate,onGuide,onGuideTo,onCancelGuide,onOpenMap,bearing=0,loaded=true}){
 const guide=model.hasWaypoint?onGuide:onGuideTo?()=>onGuideTo(model.target):null;
 const navigate=onNavigate&&model.canNavigate?()=>onNavigate(model.target):null;
 return <section className={'hub-objective-card'+(model.guiding?' is-guiding':'')} aria-label="Ton objectif dans la cité">
  <div className="hub-objective-heading"><Compass size={17} aria-hidden="true"/><small>{model.status}</small>{model.target&&<span className="hub-objective-distance" title={model.distanceDescription}>{model.distanceLabel}</span>}</div>
  <h2>{model.label}</h2>
  {model.target&&model.destination!==model.label&&<p className="hub-objective-destination">Destination : {model.destination}</p>}
  {model.missionLabel&&<p className="hub-objective-mission">Mission : {model.missionLabel}</p>}
  <p className="hub-objective-detail">{model.detail}</p>
  <div className="hub-objective-actions">
   {model.canNavigate&&!model.arrived&&!model.guiding&&(guide?<Button variant="champagne" className="hub-guide-primary" disabled={!loaded} onClick={guide}><Navigation size={15} aria-hidden="true"/>Me guider</Button>:navigate?<Button variant="champagne" className="hub-guide-primary" disabled={!loaded} onClick={navigate}><Compass size={15} aria-hidden="true"/>Placer un repère</Button>:null)}
   {model.guiding&&<span className="hub-guidance-running" role="status"><ArrowUp size={16} style={{transform:`rotate(${bearing}deg)`}} aria-hidden="true"/>En route · {model.distanceLabel}</span>}
   <Button variant="ghost" className="hub-guide-map" disabled={!loaded||!onOpenMap} onClick={onOpenMap} aria-label="Ouvrir la carte de la cité"><Map size={15} aria-hidden="true"/>Carte</Button>
   {model.hasWaypoint&&onCancelGuide&&<Button variant="ghost" className="hub-guide-cancel" disabled={!loaded} onClick={onCancelGuide} aria-label={model.guiding?'Arrêter le guidage et retirer le repère':'Retirer le repère'}><X size={15} aria-hidden="true"/>{model.guiding?'Arrêter':'Retirer'}</Button>}
  </div>
 </section>;
}

export default function HubOrientationGuide({progress=emptyProgress(),controls,inputMode='keyboard',onDismiss,onOpenMap}){
 const completed=Object.values(progress).filter(Boolean).length,touch=inputMode==='touch';
 const steps=[
  {id:'moved',Icon:Footprints,title:'Prends tes repères',detail:touch?'Glisse à gauche pour avancer ; à droite pour regarder.':`Avance avec ${controlLabel(controls,'moveForward')} ; utilise ${controlLabel(controls,'moveLeft')}, ${controlLabel(controls,'moveBackward')} et ${controlLabel(controls,'moveRight')} pour te déplacer. Glisse sur le décor pour regarder.`},
  {id:'mapOpened',Icon:Map,title:'Choisis un lieu',detail:'Ouvre la carte, choisis une destination, puis lance le guidage.'},
  {id:'interacted',Icon:MessageCircle,title:'Rencontre la cité',detail:touch?'Approche un habitant ou un service et touche le bouton d’action.':`Approche un habitant ou un service, puis appuie sur ${controlLabel(controls,'interact')} ou choisis le bouton d’action.`},
 ];
 return <section className="hub-orientation-guide" aria-label="Premiers pas dans la cité">
  <header><div><small>Bienvenue dans la Cité 3B</small><h2>À ton rythme</h2></div><Button variant="ghost" onClick={onDismiss} aria-label="Fermer l’aide des premiers pas" title="L’aide reste disponible avec le bouton Premiers pas"><X size={18} aria-hidden="true"/></Button></header>
  <p>Explore la cité et ses services. Les huit portes restent à découvrir quand tu le souhaites.</p>
  <ol>{steps.map(({id,Icon,title,detail})=><li key={id} className={progress[id]?'is-complete':''}><span className="hub-orientation-icon" aria-hidden="true">{progress[id]?<Check size={16}/>:<Icon size={16}/>}</span><div><strong>{title}{progress[id]&&<span className="hub-sr-only"> · étape accomplie</span>}</strong><p>{detail}</p></div></li>)}</ol>
  <footer><span aria-label={completed+' étapes accomplies sur 3'}>{completed}/3 repères</span>{!progress.mapOpened&&onOpenMap&&<Button variant="ghost" onClick={onOpenMap}>Ouvrir la carte</Button>}<Button variant="ghost" className="hub-orientation-dismiss" onClick={onDismiss}>{completed===3?'C’est parti':'Explorer librement'}</Button></footer>
 </section>;
}
