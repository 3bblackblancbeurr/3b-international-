import React,{memo,useEffect,useState,useMemo,useRef} from 'react';
import {Menu,BookOpen,Map,ArrowUp,MessageCircle,DoorOpen,Sparkles,Swords,Trees,Mountain,Wheat,HelpCircle,LoaderCircle,Eye,EyeOff,X} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {CompanionPortrait} from './Companions.jsx';
import {countryById,cardById} from './catalog.js';
import {Compass,MiniMap,DetailedMap} from './Cartography.jsx';
import {HERITAGE} from './heritage.js';
import {worldRuntimeItems} from './runtime-items.js';
import {WEATHER_LABELS} from './world-weather.js';
import {frontierState} from './frontier.js';
import {levelFor} from './rules.js';
import {compassHeading} from './settlements.js';
import {contextActions} from './interaction-system.js';
import {controlLabel} from './control-bindings.js';
import {platformNextObjective} from './hub/platform-layout.js';
import {hubDistrictLabel,hubItemLabel} from './hub/presentation.js';
import HubOrientationGuide,{HubObjectiveCard,createHubObjectiveModel,humanHubText,readHubOrientation,writeHubOrientation,updateHubOrientation} from './hub/HubOrientationGuide.jsx';
import './hub/hub-hud.css';
import {readHudPreferences,writeHudPreferences} from './hud-preferences.js';
import {activeCampaignSnapshot} from './campaign-runtime.js';
import {CampaignChallenge} from './RealmJourney.jsx';
import {journeyPresence} from './journey-presence.js';

const phaseLabels={dawn:'Aube',morning:'Matin',day:'Jour',afternoon:'Après-midi',dusk:'Crépuscule',evening:'Soir',night:'Nuit'};

export const WorldHUD=memo(function WorldHUD({snapshot,save,panel,onPanel,onInteract,onContextAction,onGuide,onGuideTo,onCancelGuide,loaded,controls,onNavigate,onCampaignAction,onPlay,onCompanionGuard,notificationVisible=false,inputMode}){
 const isHub=snapshot.region==='hub',country=countryById[snapshot.region],near=snapshot.near,home=frontierState(save,snapshot.region);
 const mapItems=useMemo(()=>isHub&&snapshot.mapItems?snapshot.mapItems:worldRuntimeItems(snapshot.region,save),[isHub,snapshot.region,snapshot.mapItems,save]);
 const hubGoal=isHub?platformNextObjective(mapItems,save):null;
 const hubObjective=isHub?createHubObjectiveModel(snapshot,hubGoal,mapItems):null;
 const campaign=useMemo(()=>activeCampaignSnapshot(save),[save]),campaignItem=mapItems.find(item=>item.type==='campaignObjective'&&item.id===campaign?.objective);
 const [arrival,setArrival]=useState(false),[actionMenu,setActionMenu]=useState(false),[layoutOpen,setLayoutOpen]=useState(false),[hud,setHud]=useState(readHudPreferences),[dismissedNear,setDismissedNear]=useState(null);
 const showWidget=id=>setHud(current=>writeHudPreferences({...current,[id]:!current[id]}));
 const closeWidget=id=>setHud(current=>writeHudPreferences({...current,[id]:false}));
 const [hint,setHint]=useState(()=>{try{return !localStorage.getItem('3b-world-intro-seen');}catch{return true;}});
 const [orientation,setOrientation]=useState(readHubOrientation);
 const [guideOpen,setGuideOpen]=useState(()=>!readHubOrientation().seen);
 const [detectedInput,setDetectedInput]=useState(()=>globalThis.matchMedia?.('(pointer: coarse)')?.matches?'touch':'keyboard');
 const input=inputMode||detectedInput,origin=useRef(null),actionTrigger=useRef(null),actionList=useRef(null);
 useEffect(()=>{if(!loaded)return;setArrival(true);const timer=setTimeout(()=>setArrival(false),3800);return()=>clearTimeout(timer);},[snapshot.region,loaded]);
 useEffect(()=>{if(!loaded||isHub)return;const timer=setTimeout(()=>{setHint(false);try{localStorage.setItem('3b-world-intro-seen','1');}catch{}},6500);return()=>clearTimeout(timer);},[loaded,isHub]);
 useEffect(()=>{setActionMenu(false);setDismissedNear(null);},[near?.id,panel,loaded]);
 useEffect(()=>{if(panel)setLayoutOpen(false);},[panel]);
 useEffect(()=>{
  if(!isHub)return;
  const pointer=event=>{if(event.target?.closest?.('.world-shell'))setDetectedInput(event.pointerType==='touch'?'touch':'keyboard');};
  const keyboard=event=>{if(!event.metaKey&&!event.ctrlKey&&!event.altKey)setDetectedInput('keyboard');};
  window.addEventListener('pointerdown',pointer);window.addEventListener('keydown',keyboard);
  return()=>{window.removeEventListener('pointerdown',pointer);window.removeEventListener('keydown',keyboard);};
 },[isHub]);
 const recordStep=event=>setOrientation(current=>({...current,progress:updateHubOrientation(current.progress,event)}));
 useEffect(()=>{
  if(!isHub||!loaded){origin.current=null;return;}
  const point=snapshot.position;
  if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))return;
  if(!origin.current)origin.current={...point};
  if(!orientation.progress.moved&&Math.hypot(point.x-origin.current.x,point.z-origin.current.z)>=2)recordStep({type:'move',distance:2});
 },[isHub,loaded,snapshot.position?.x,snapshot.position?.z,orientation.progress.moved]);
 useEffect(()=>{if(isHub&&panel==='atlas'&&!orientation.progress.mapOpened)recordStep({type:'map'});},[isHub,panel,orientation.progress.mapOpened]);
 useEffect(()=>{if(isHub)writeHubOrientation(orientation.progress,orientation.seen);},[isHub,orientation]);
 useEffect(()=>{
  if(!actionMenu)return;
  actionList.current?.querySelector('[role="menuitem"]')?.focus();
  const outside=event=>{if(!actionList.current?.contains(event.target)&&!actionTrigger.current?.contains(event.target))setActionMenu(false);};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[actionMenu]);
 const dismissGuide=()=>{setGuideOpen(false);setOrientation(current=>({...current,seen:true}));};
 const openMap=()=>{if(isHub)recordStep({type:'map'});onPanel('atlas');};
 const actions=near?contextActions(near,{save,region:snapshot.region}):[],primary=actions[0];
 const Icon=primary?.category==='combat'?Swords:primary?.category==='social'?MessageCircle:primary?.category==='traversal'||near?.type==='portal'?DoorOpen:Sparkles;
 const name=isHub?humanHubText(primary?.label||near?.name,'Interagir'):primary?.label||near?.name,extraActions=Math.max(0,actions.length-1);
 const bearing=snapshot.waypoint&&Number.isFinite(snapshot.position?.x)?Math.atan2(snapshot.waypoint.x-snapshot.position.x,snapshot.position.z-snapshot.waypoint.z)*180/Math.PI-compassHeading(snapshot.camera?.yaw||0):0;
 const triggerAction=id=>{if(!near||!loaded)return;if(onContextAction)onContextAction(near,id);else onInteract?.();if(isHub)recordStep({type:'interact'});setActionMenu(false);};
 const menuKeys=event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setActionMenu(false);actionTrigger.current?.focus();}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();event.stopPropagation();const buttons=[...actionList.current.querySelectorAll('[role="menuitem"]')],current=buttons.indexOf(document.activeElement);
   buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  }else if(event.key==='Tab')setActionMenu(false);
 };
 const storyBeat=journeyPresence(campaign,campaign?.target&&snapshot.position?Math.hypot(campaign.target.x-snapshot.position.x,campaign.target.z-snapshot.position.z):Infinity);
 const playerName=save.adventure?.avatar?.name||'Voyageur',companionName=cardById[snapshot.companion]?.name||'Compagnon';
 return <div className={'play-hud'+(isHub?' hub-hud':'')+(snapshot.waypoint&&snapshot.remaining>7?' has-waypoint':'')+(panel?' is-hidden':'')+(!loaded?' is-loading':'')+(notificationVisible?' has-notification':'')+(near?' has-interaction':'')} aria-hidden={panel?true:undefined} aria-busy={!loaded||undefined} inert={panel?true:undefined} data-input={input}>
  <nav className="play-top" aria-label="Navigation du monde"><div className="hub-top-start"><Button variant="ghost" className="play-button" aria-label="Journal et objectif" title="Journal et objectif" disabled={isHub&&!loaded} onClick={()=>onPanel('journal')}><BookOpen size={20} aria-hidden="true"/></Button>{isHub&&<Button variant="ghost" className="play-button hub-help-trigger" aria-label="Premiers pas dans la cité" aria-expanded={guideOpen} title="Premiers pas" disabled={!loaded} onClick={()=>{setHud(current=>writeHudPreferences({...current,missions:true}));setGuideOpen(value=>!hud.missions||!value);}}><HelpCircle size={20} aria-hidden="true"/></Button>}</div><span className="play-region">{country?.name||'Cité des Huit Héritages'}</span><div><Button variant="ghost" className="play-button" aria-label="Affichage du jeu" aria-expanded={layoutOpen} title="Afficher ou masquer les informations" onClick={()=>setLayoutOpen(value=>!value)}><Eye size={20} aria-hidden="true"/></Button><Button variant="ghost" className="play-button" aria-label="Ouvrir la carte" title="Carte" disabled={isHub&&!loaded} onClick={openMap}><Map size={20} aria-hidden="true"/></Button><Button variant="ghost" className="play-button" aria-label="Pause et options" title="Pause" onClick={()=>onPanel('pause')}><Menu size={23} aria-hidden="true"/></Button></div></nav>
  {hud.details&&country&&<Button variant="ghost" className="play-supplies" aria-label={home.wood+' bois, '+home.stone+' pierre, '+home.food+' provisions. Ouvrir mon refuge'} title="Provisions et refuge" onClick={()=>onPanel('camp')}><span><Trees size={15} aria-hidden="true"/>{home.wood}</span><span><Mountain size={15} aria-hidden="true"/>{home.stone}</span><span><Wheat size={15} aria-hidden="true"/>{home.food}</span></Button>}
  {layoutOpen&&<div className="hud-layout-menu" role="group" aria-label="Informations à l’écran">{[['map','Mini-carte'],['missions','Missions et progression'],['companion','Compagnon'],['details','Boussole, lieu et profil'],['interactions','Actions à proximité']].map(([id,label])=><button key={id} aria-pressed={hud[id]} onClick={()=>showWidget(id)}>{hud[id]?<Eye size={16}/>:<EyeOff size={16}/>}<span>{label}</span></button>)}<button onClick={()=>{setHud(writeHudPreferences({map:false,missions:false,companion:false,details:false,interactions:false}));dismissGuide();setArrival(false);setLayoutOpen(false);}}><EyeOff size={16}/>Tout masquer</button><button onClick={()=>{setHud(writeHudPreferences({map:true,missions:true,companion:true,details:true,interactions:true}));setDismissedNear(null);setLayoutOpen(false);}}><Eye size={16}/>Tout afficher</button><button className="hud-close" onClick={()=>setLayoutOpen(false)}><X size={16}/>Fermer</button></div>}
  {hud.details&&(!isHub||loaded)&&<><Compass heading={snapshot.heading} waypoint={snapshot.waypoint} position={snapshot.position}/>
   <div className="world-district">{isHub?hubDistrictLabel(snapshot.district):snapshot.district||country?.name||'Cité des Huit Héritages'}{snapshot.time&&<small> · {isHub?phaseLabels[snapshot.time.phase]||'Jour':snapshot.time.phase} · {String(Math.floor(snapshot.time.hour)).padStart(2,'0')}:{String(Math.floor((snapshot.time.hour%1)*60)).padStart(2,'0')}{snapshot.weather?' · '+(WEATHER_LABELS[snapshot.weather]||(isHub?'Météo variable':snapshot.weather)):''}</small>}</div>
  </>}
  {hud.map&&(!isHub||loaded)&&<><button className="hud-widget-close hud-minimap-close" aria-label="Fermer la mini-carte" onClick={()=>closeWidget('map')}><X size={15}/></button><MiniMap region={snapshot.region} items={mapItems} position={snapshot.position} heading={snapshot.heading} camera={snapshot.camera} waypoint={snapshot.waypoint} cartography={snapshot.cartography} route={snapshot.route} level={snapshot.towerFloor} onOpen={openMap}/>
  </>}
  {isHub&&hud.missions&&!campaignItem&&<aside className="hub-mission-rail" aria-label="Repères du voyage"><button className="hud-widget-close" aria-label="Masquer les missions" onClick={()=>closeWidget('missions')}><X size={15}/></button>
   {!loaded?<div className="hub-loading-card" role="status"><LoaderCircle size={20} aria-hidden="true"/><div><strong>La cité se prépare</strong><span>Chargement du décor et des points de repère…</span></div></div>:<>
    <HubObjectiveCard model={hubObjective} onNavigate={onNavigate} onGuide={onGuide} onGuideTo={onGuideTo} onCancelGuide={onCancelGuide} onOpenMap={openMap} bearing={bearing}/>
    {guideOpen&&!arrival&&!notificationVisible&&<HubOrientationGuide progress={orientation.progress} controls={controls} inputMode={input} onDismiss={dismissGuide} onOpenMap={openMap}/>}
    {!guideOpen&&!notificationVisible&&snapshot.hubEvolution&&<div className="hub-evolution-chip" aria-label={'Évolution de la Cité : '+snapshot.hubEvolution.label+', '+snapshot.hubEvolution.restored+' héritages restaurés sur '+snapshot.hubEvolution.total+(snapshot.hubEvolution.milestone?' · '+snapshot.hubEvolution.milestone.label:'')}><small>CITÉ · ÉVOLUTION {snapshot.hubEvolution.stage}/4</small><strong>{snapshot.hubEvolution.label}</strong>{snapshot.hubEvolution.milestone&&<em>{snapshot.hubEvolution.milestone.label}</em>}<span>{snapshot.hubEvolution.restored}/{snapshot.hubEvolution.total} héritages restaurés{snapshot.hubEvolution.nextMilestone?' · prochain palier '+snapshot.hubEvolution.nextMilestone.fragments+'/8':''}</span></div>}
   </>}
  </aside>}
  {loaded&&hud.missions&&!panel&&campaign?.started&&<CampaignChallenge current={campaign} onAction={onCampaignAction} onPlay={onPlay} onCompanionGuard={onCompanionGuard} onJournal={()=>onPanel('campaign')} onNavigate={point=>onNavigate({id:'campaign:guide',name:'Étape en cours',...point})}/>}
  {loaded&&hud.missions&&!panel&&!campaign?.started&&campaignItem&&<aside className="realm-challenge"><header><Button variant="ghost" onClick={()=>onPanel('journal')}>{campaign.title}</Button><Button variant="ghost" aria-label="Masquer les missions" onClick={()=>closeWidget('missions')}>×</Button></header><p>{campaign.name}</p>{storyBeat&&<p className="journey-presence"><strong>{storyBeat.speaker}</strong><span>{storyBeat.text}</span></p>}<div className="realm-challenge-actions"><Button variant="ghost" onClick={()=>onNavigate(campaignItem)}>Repérer l’étape</Button>{!isHub&&<Button variant="ghost" onClick={()=>onNavigate(mapItems.filter(item=>item.type==='realmTravel').sort((a,b)=>Math.hypot(a.x-snapshot.position.x,a.z-snapshot.position.z)-Math.hypot(b.x-snapshot.position.x,b.z-snapshot.position.z))[0])}>Rejoindre un relais</Button>}</div></aside>}
  {arrival&&hud.details&&loaded&&!notificationVisible&&<div className="play-arrival" key={snapshot.region}><span>LES HUIT PORTES</span><h1>{country?.title||'Cité des Huit Héritages'}</h1><i/>{country&&<p className="arrival-landmark">{HERITAGE[country.id]?.name}</p>}</div>}
  {hud.details&&<Button variant="ghost" className="play-profile" aria-label={playerName+', niveau '+levelFor(save.xp)+'. Ouvrir l’équipe'} title="Équipe et progression" disabled={isHub&&!loaded} onClick={()=>onPanel('team')}><span>{playerName.slice(0,1).toUpperCase()}</span><small>{levelFor(save.xp)}</small></Button>}
  {hud.companion&&snapshot.companion&&<Button variant="ghost" className="play-companion" aria-label={companionName+' · ouvrir les compagnons'} disabled={isHub&&!loaded} onClick={()=>onPanel('collection')}><CompanionPortrait id={snapshot.companion}/><span><small>À tes côtés</small><strong>{companionName}</strong></span></Button>}
  {hud.missions&&!isHub&&snapshot.waypoint&&snapshot.remaining>7&&<Button variant="ghost" className="play-bearing" aria-label={'Repère : '+snapshot.waypoint.name+', '+snapshot.remaining+' mètres. Rejoindre automatiquement.'} title="Rejoindre le repère" onClick={onGuide}><ArrowUp size={18} style={{transform:`rotate(${bearing}deg)`}} aria-hidden="true"/><small>{snapshot.remaining} m</small></Button>}
  {hud.interactions&&near&&near.id!==dismissedNear&&loaded&&<div className="play-interaction-cluster" key={near.id}><button className="hud-widget-close" aria-label="Masquer l’action proche" onClick={()=>setDismissedNear(near.id)}><X size={15}/></button><Button variant="ghost" className="play-interaction" onClick={()=>triggerAction(primary?.id)} aria-label={name||'Interagir'} title={name||'Interagir'}><Icon size={20} aria-hidden="true"/><span>{isHub&&<small className="hub-interaction-target">{humanHubText(hubItemLabel(near),'À proximité')}</small>}<span>{name}</span></span><kbd>{controlLabel(controls,'interact')}</kbd>{isHub&&input==='touch'&&<small className="hub-touch-action">Toucher</small>}</Button>{extraActions>0&&<Button variant="ghost" ref={actionTrigger} className="play-interaction-more" aria-expanded={actionMenu} aria-haspopup="menu" aria-label={extraActions+' autres actions pour '+(isHub?hubItemLabel(near):near.name||'ce lieu')} onClick={()=>setActionMenu(value=>!value)}>•••</Button>}{actionMenu&&extraActions>0&&<div ref={actionList} className="play-context-actions" role="menu" aria-label={'Actions pour '+(isHub?hubItemLabel(near):near.name||'cet élément')} onKeyDown={menuKeys}>{actions.slice(1).map(action=><Button variant="ghost" role="menuitem" key={action.id} onClick={()=>triggerAction(action.id)}><span>{isHub?humanHubText(action.label,'Interagir'):action.label}</span><small>{action.caption}</small></Button>)}</div>}</div>}
  {hud.details&&!isHub&&hint&&!near&&!snapshot.moving&&!arrival&&<div className="play-first-hint">Glisse à gauche pour avancer · à droite pour regarder</div>}
 </div>;
});

export const WorldMap=DetailedMap;
