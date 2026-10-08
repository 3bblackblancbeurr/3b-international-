import {HubMechanismPanel} from './hub/HubMechanismPanel.jsx';
import {mechanismFor} from './hub/mechanism.js';
import {HubDistrictPanel} from './hub/HubDistrictPanel.jsx';
import {HubCityServices} from './hub/HubCityServices.jsx';
import {resolveHubCityService} from './hub/hub-city-services.js';
import {platformNextObjective} from './hub/platform-layout.js';
import {HubOpeningCinematic} from './hub/HubOpeningCinematic.jsx';
import './hub/platform.css';
import {franceDistrictState} from './france-life.js';
import {PartyPanel} from './PartyPanel.jsx';
import {createPartyConnection} from './cooperation.js';
import './cooperation.css';
import {FieldEncounter} from './FieldEncounter.jsx';
import WorldPlayControls from './WorldPlayControls.jsx';
import {ParisJournal} from './ParisJournal.jsx';
import './paris.css';
import {FrontierPanel} from './FrontierPanel.jsx';
import {combatCue} from './combat-effects.js';
import {HERITAGE} from './heritage.js';
import { useLuxury } from '../design-system/LuxuryExperience.jsx';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Compass,Footprints,Map as MapIcon,Maximize,Play,Sparkles,Users,X,Download,RotateCcw,Volume2,VolumeX} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {useGameRewards} from '../loyalty/useGameRewards.js';
import {CARDS,CHARACTERS,COUNTRIES,cardById,countryById,cardSlot,craftPrice} from './catalog.js';
import {blankSave,normalizeSave,levelFor,teamStats} from './rules.js';
import {loadWorld,saveWorld,writeLocal,recordWorldAction} from './save.js';
import {StoryPanel,AdventureJournal,Wardrobe,AdventureEncounter} from './AdventurePanels.jsx';
import {explorationTrait} from './chapters.js';
import {createWalkTracker} from './gps.js';
import {createWorldScene} from './scene.js';
import {ORIGINAL_ART,ART_SOURCE} from './art.js';
import './world.css';
import './adventure.css';
import {ADAPTED_ART} from './portraits.js';
import {createWorldAudio} from './audio.js';
import {WorldHUD,WorldMap} from './WorldHUD.jsx';
import {worldRuntimeItems} from './runtime-items.js';
import './immersion.css';
import ArenaPage from '../arena/ArenaPage.jsx';
import {ArenaStage} from '../arena/ArenaStage.jsx';
import './exploration.css';
import {REGIONS} from './settlements.js';
import {Companions,CompanionRow,Sanctuary,TALENT_NAMES} from './Companions.jsx';
import './companions.css';
import './audit.css';
import {AvatarPanel} from './AvatarPanel.jsx';
import {hubNpcDialogue} from './hub/npc-dialogue.js';
import {hubDialogueScene} from './hub/dialogue-presentation.js';
import {hubDialogueIntents,hubDialogueIntentResponse} from './hub/dialogue-presentation.js';
import {CANON_WORLDS} from './story-canon.js';
import {GUARDIAN_VALUES,guardianValueStep,guardianValueOptions,guardianValueOutcome} from './guardian-values.js';
import {isAutoHubMission} from './hub/mission-signals.js';
import {worldCinematicEvents} from './cinematic-events.js';
import {cinematicSeenCommand} from './cinematic-persistence.js';
import {storyCinematicPresentation} from './story-cinematic.js';
import {CinematicOverlay} from './CinematicOverlay.jsx';
import DigitalStorePanel from '../store/DigitalStorePanel.jsx';
import {loadDigitalStore} from '../store/digital-store-client.js';
import {ownedPremiumCodes} from '../store/premium-effects.js';
import {contextActions,primaryContextAction,actionFeedback} from './interaction-system.js';
import {isPhysicalTraversalAction} from './traversal-motion.js';
import {guardianHubState} from './guardian-relations.js';
import {resonanceFor,unlockedResonances} from './guardian-resonances.js';
import {resonanceContextMessage} from './resonance-context.js';
import {CONTROL_ACTIONS,CONTROL_KEY_CHOICES,loadControlBindings,saveControlBindings,setPrimaryControl,controlLabel} from './control-bindings.js';
import {worldEntryPolicy} from './entry-policy.js';
import {loadCameraSensitivity,saveCameraSensitivity} from './camera-preferences.js';
import {Button} from '../design-system/index.jsx';
import WorldSettingsPanel from './WorldSettingsPanel.jsx';
import WorldSaveStatus from './WorldSaveStatus.jsx';
import {worldSaveStatus} from './save.js';
import {assignControlKey,controlProfile} from './control-bindings.js';
import {hubCategoryLabel,hubDistrictLabel,hubMissionLabel,hubObjectiveLabel} from './hub/presentation.js';
import {hubMissionReward} from './hub/mission-catalog.js';
import './hub/hub-master.css';
import {activeCampaignSnapshot} from './campaign-runtime.js';
import {CampaignDialog,CampaignChallenge,RealmJournal,RealmTravelPanel} from './RealmJourney.jsx';

function Modal({title,onClose,children,wide=false,kind}){
 const ref=useRef(null),closeRef=useRef(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement;dialog.showModal();dialog.scrollTop=0;return()=>{dialog.close();if(previous?.isConnected)previous.focus?.({preventScroll:true});else document.querySelector('.world-canvas')?.focus({preventScroll:true});};},[]);
 useEffect(()=>{if(ref.current){ref.current.scrollTop=0;closeRef.current?.focus({preventScroll:true});}},[kind]);
 return <dialog ref={ref} className={'world-dialog'+(wide?' world-dialog-wide':'')+' world-dialog-'+kind} onCancel={e=>{e.preventDefault();onClose();}} aria-label={title}>
  <header><div><span className="world-kicker">3B WORLD · LES 8 PORTES</span><h2>{title}</h2></div><Button ref={closeRef} variant="ghost" aria-label="Fermer" className="world-icon" onClick={onClose}><X size={20}/></Button></header>
  {children}
 </dialog>;
}
function OriginalArt({card,full=false}){
 const art=ORIGINAL_ART[card.id];
 return <svg className="world-original-art" viewBox={(full?art.frame:art.portrait).join(' ')} preserveAspectRatio={full?'xMidYMid meet':'xMidYMin slice'} aria-hidden="true"><image href={art.src} width={art.width} height={art.height}/></svg>;
}
function Art({card,className=''}){
 const index=Math.max(0,COUNTRIES.findIndex(c=>c.id===card.country)),country=COUNTRIES[index];
 if(ORIGINAL_ART[card.id])return <div className={'world-card-art world-original '+className} aria-hidden="true"><OriginalArt card={card}/></div>;
 if(ADAPTED_ART[card.id]){const art=ADAPTED_ART[card.id];return <div className={'world-card-art world-original '+className} aria-hidden="true"><svg className="world-original-art" viewBox={art.portrait.join(' ')} preserveAspectRatio="xMidYMid slice"><image href={art.src} width={art.width} height={art.height}/></svg></div>;}
 if(card.country==='3b')return <div className={'world-card-art world-neutral '+className} aria-hidden="true"><b>3B</b><span>LES GARDIENS DE L’UNION</span></div>;
 return <div className={'world-card-art '+className} style={{'--art-x':(index%4)/3*100+'%','--art-y':index<4?'0%':'100%','--country-color':country.color}} aria-hidden="true"><div/><span>{card.country==='3b'?'3B':country.name.toUpperCase()}</span></div>;
}
function Card({card,owned,onClick}){return <CompanionRow person={card} owned={owned} onClick={onClick}/>;}
const DEFAULT_AUDIO_MIX={master:.78,music:.34,ambience:.55,sfx:.78,voice:.9};
const City3BPortal=React.lazy(()=>import('../components/City3BPortal.jsx'));
export default function WorldPage({goTo}){const account=useLoyalty();return account.loading?<div className="world-loading">Ouverture du Monde 3B…</div>:<WorldSession key={account.user?.id||'guest'} uid={account.user?.id} goTo={goTo}/>;}

function WorldSession({uid,goTo}){
 const { present } = useLuxury();
 const[franceResident,setFranceResident]=useState(null);
 const[save,setSave]=useState(blankSave),[loaded,setLoaded]=useState(false),[snapshot,setSnapshot]=useState({region:'hub',position:{x:0,z:9}}),[panel,setPanel]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saveMessage,setSaveMessage]=useState('Chargement de la sauvegarde…'),[gps,setGPS]=useState(false),[gpsMessage,setGPSMessage]=useState('Le GPS est désactivé.'),[walkSession,setWalkSession]=useState(0),[sound,setSound]=useState(()=>{try{return localStorage.getItem('3b-world-sound')!=='0';}catch{return true;}});
 const [worldRequested,setWorldRequested]=useState(false),[haptics,setHaptics]=useState(()=>{try{return localStorage.getItem('3b-world-haptics')!=='0';}catch{return true;}}),[soundCaptions,setSoundCaptions]=useState(()=>{try{return localStorage.getItem('3b-world-sound-captions')!=='0';}catch{return true;}}),[soundCaption,setSoundCaption]=useState(''),[controls,setControls]=useState(()=>loadControlBindings());
 const [assetsLoading,setAssetsLoading]=useState(true),[quality,setQuality]=useState(()=>{try{return ['auto','fluid','detail'].includes(localStorage.getItem('3b-world-quality'))?localStorage.getItem('3b-world-quality'):'auto';}catch{return 'auto';}});
 const [audioMix,setAudioMix]=useState(()=>{try{const stored=JSON.parse(localStorage.getItem('3b-world-audio-mix')||'{}');return Object.fromEntries(Object.entries(DEFAULT_AUDIO_MIX).map(([key,value])=>[key,Number.isFinite(stored?.[key])?Math.max(0,Math.min(1,stored[key])):value]));}catch{return {...DEFAULT_AUDIO_MIX}}});
 const [cameraLookSensitivity,setCameraLookSensitivity]=useState(loadCameraSensitivity);
 const [saveStatus,setSaveStatus]=useState({scope:uid?'account':'device',outcome:'loading'}),[companionVisible,setCompanionVisible]=useState(()=>{try{return localStorage.getItem('3b-world-app-companion')==='1';}catch{return false;}});
 const syncFlight=useRef(null),saveGeneration=useRef(0),saveUsable=useRef(false);
 const [cityOpen,setCityOpen]=useState(false),[relayOrigin,setRelayOrigin]=useState(null);
 const [premiumCodes,setPremiumCodes]=useState(()=>new Set());
 const fieldCombat=panel==='encounter'&&!!save.adventure.encounter?.field&&!save.adventure.encounter.result&&!save.adventure.encounter.pact;
 const [partyState,setPartyState]=useState(null),[connection,setConnection]=useState('solo'),partyLink=useRef(null),peersRef=useRef([]);
 const [towerLift,setTowerLift]=useState(null),[combatImpact,setCombatImpact]=useState(null),[npcDialogue,setNpcDialogue]=useState(null),[hubGuardianInfo,setHubGuardianInfo]=useState(null),[hubOffer,setHubOffer]=useState(null),[hubPlace,setHubPlace]=useState(null),[hubMechanism,setHubMechanism]=useState(null),[storyCinematic,setStoryCinematic]=useState(null),[cinematicQueue,setCinematicQueue]=useState([]);
 const canvas=useRef(null),shell=useRef(null),scene=useRef(null),saveRef=useRef(save),callbacks=useRef({}),ready=useRef(false),paused=useRef(false),activity=useRef(0),rewardEngine=useRef({status:'playing'}),watch=useRef(null),tracker=useRef(createWalkTracker()),walkRef=useRef(0),audio=useRef(null),dirty=useRef(false),saveTimer=useRef(null),noticeTimer=useRef(null),captionTimer=useRef(null),dialogueTurns=useRef(new Map()),cinematicKeys=useRef(new Set()),partyRuntimeSelf=useRef(null),partyDownKey=useRef(null);
 saveRef.current=save;
 const rewardMessage=useGameRewards('world',rewardEngine,paused,ready,activity);
 useEffect(()=>{const orientation=globalThis.screen?.orientation;orientation?.lock?.('landscape').catch(()=>{});return()=>orientation?.unlock?.();},[]);
 const announce=useCallback(text=>{setNotice(text);clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),2400);},[]);
 const captionAudio=useCallback(text=>{if(!text)return;setSoundCaption(text);clearTimeout(captionTimer.current);captionTimer.current=setTimeout(()=>setSoundCaption(''),2200);},[]);
 const updateControl=useCallback((action,key)=>{const result=assignControlKey(controls,action,key);if(result.conflict){announce('Cette touche sert déjà à '+CONTROL_ACTIONS[result.conflict].label.toLowerCase()+'. Choisis une autre touche.');return;}setControls(saveControlBindings(result.bindings));},[controls,announce]);
 const enqueueCinematics=useCallback(events=>{
  if(!events?.length)return;
  const fresh=events.filter(event=>{if(cinematicKeys.current.has(event.key))return false;cinematicKeys.current.add(event.key);return true;});
  if(fresh.length)setCinematicQueue(queue=>[...queue,...fresh].sort((a,b)=>b.priority-a.priority));
 },[]);
 const finishAvatarReveal=useCallback(({firstCreation=false,openingPlayed=false}={})=>{
  setWorldRequested(true);setPanel(null);
  if(firstCreation&&!openingPlayed)enqueueCinematics([{kind:'world-opening',key:'opening:gold-master-v4',region:saveRef.current.region||'hub',context:{region:saveRef.current.region||'hub'},priority:110}]);
 },[enqueueCinematics]);
 const act=useCallback(command=>{
  if(!saveUsable.current){announce('Attends la récupération de ta sauvegarde avant de poursuivre.');return null;}
  try{
   const previous=saveRef.current;
   if(command.type==='battle'&&previous.adventure.encounter?.field){scene.current?.combatAction(command.action);return previous;}
   if(command.type==='battle'&&previous.region==='france'&&scene.current&&!scene.current.canBattle(command.action)){announce('Rapproche-toi de ton adversaire.');return null;}
   const next=recordWorldAction(uid,previous,command),quiet=command.type==='campaignAction'&&command.operation==='tick';
   const storyEvents=worldCinematicEvents(previous,next,command);if(storyEvents.length)enqueueCinematics(storyEvents);
   saveRef.current=next;setSave(next);dirty.current=true;saveGeneration.current++;
   if(!quiet)setSaveStatus(current=>({...worldSaveStatus(uid),...(['offline','auth','receipt','storage'].includes(current.outcome)?{outcome:current.outcome}:{})}));
   activity.current=Date.now();
   if(!quiet&&command.type!=='cinematicSeen'&&(command.type!=='field'||next.adventure.encounter?.field?.last))audio.current?.event(command.type==='field'?'battle':command.type,command.type==='field'?next.adventure.encounter.field.last:(command.action||command.transport||command.choiceId||command.id));
   if(!quiet&&command.type!=='cinematicSeen')scene.current?.feedback(command.type,command.action,previous,next);
   if(['field','campaignAction','realmTravel','realmRelayDiscover'].includes(command.type))scene.current?.setSave(next);
   if(command.type==='realmTravel')scene.current?.relocateRealm(next.adventure.realmTravel);
   if(command.type==='campaignAction'&&next.adventure.encounter&&!next.adventure.encounter.result&&(!previous.adventure.encounter||previous.adventure.encounter.result||next.adventure.encounter.card!==previous.adventure.encounter.card))setPanel('encounter');
   if(command.type==='battle'||command.type==='field'){
    const cue=combatCue(previous.adventure.encounter,next.adventure.encounter,command.type==='field'?next.adventure.encounter.field.last:command.action,next.adventure.avatar);
    if(cue&&(cue.outgoing||cue.incoming||cue.healing))setCombatImpact({...cue,key:next.adventure.encounter.turn});
   }else if(['leave','visit','patrol','encounter'].includes(command.type))setCombatImpact(null);
   if(['restore','solve'].includes(command.type)&&(next.adventure.chapters[next.region]?.restored||0)>(previous.adventure.chapters[previous.region]?.restored||0))setPanel(null);
   if(next.xp>previous.xp)announce('+'+(next.xp-previous.xp)+' XP monde'+(next.shards>previous.shards?' · +'+(next.shards-previous.shards)+' éclats':''));
   return next;
  }catch(error){announce(error.message);return null;}
 },[uid,announce,enqueueCinematics]);
 useEffect(()=>{const director=createWorldAudio();audio.current=director;director.setMix(audioMix);director.enable(sound&&!cityOpen,saveRef.current.region);return()=>{director.close();if(audio.current===director)audio.current=null;};},[uid]);
 useEffect(()=>{audio.current?.ambience(snapshot.region,snapshot.interior);},[snapshot.region,snapshot.interior]);
 useEffect(()=>{audio.current?.weather(snapshot.weather);},[snapshot.weather]);
 useEffect(()=>{audio.current?.phase(snapshot.time?.phase);},[snapshot.time?.phase]);
 useEffect(()=>{audio.current?.listener(snapshot.position,snapshot.heading);},[snapshot.position?.x,snapshot.position?.z,snapshot.heading]);
 useEffect(()=>{audio.current?.weapon?.(save.adventure.avatar.weapon);},[save.adventure.avatar.weapon]);
 useEffect(()=>{audio.current?.state(storyCinematic?.audioState||(fieldCombat?'combat':panel==='valueTrial'||panel==='guardianHub'?'guardian':panel==='journal'||panel==='story'?'mission':'exploration'));},[fieldCombat,panel,storyCinematic]);
 useEffect(()=>{audio.current?.setMix(audioMix);},[audioMix]);
 useEffect(()=>{audio.current?.enable(sound&&!cityOpen,saveRef.current.region);},[sound,cityOpen]);
 useEffect(()=>{
  let live=true;
  if(!uid){setPremiumCodes(new Set());return()=>{live=false;};}
  loadDigitalStore('world').then(store=>{if(live)setPremiumCodes(ownedPremiumCodes(store));}).catch(()=>{if(live)setPremiumCodes(new Set());});
  return()=>{live=false;};
 },[uid]);
 useEffect(()=>{scene.current?.setPremiumCodes?.(premiumCodes);},[premiumCodes]);
 useEffect(()=>{
  if(storyCinematic||!cinematicQueue.length||assetsLoading||!scene.current)return;
  const event=cinematicQueue[0],presentation=storyCinematicPresentation(event);setCinematicQueue(queue=>queue.slice(1));
  if(!presentation){cinematicKeys.current.delete(event.key);return;}
  setStoryCinematic(presentation);scene.current?.playCinematicShot?.(presentation.kind,presentation.context,presentation.duration);audio.current?.cinematic?.(presentation.kind);audio.current?.state(presentation.audioState);audio.current?.speak(presentation.title+'. '+presentation.detail,{character:presentation.voiceCharacter});
 },[cinematicQueue,storyCinematic,assetsLoading,worldRequested]);
 function chime(){audio.current?.event('reward');}
 function updateAudioMix(key,value){const next={...audioMix,[key]:Math.max(0,Math.min(1,Number(value)))};setAudioMix(next);try{localStorage.setItem('3b-world-audio-mix',JSON.stringify(next));}catch{}}
 function toggleSound(){const next=!sound;try{localStorage.setItem('3b-world-sound',next?'1':'0');}catch{}if(!audio.current)audio.current=createWorldAudio();audio.current.setMix(audioMix);audio.current.enable(next,saveRef.current.region);setSound(next);}
 function finishStoryCinematic(){
  const current=storyCinematic;if(!current)return;
  scene.current?.skipCinematic();const seenCommand=cinematicSeenCommand(current);if(seenCommand)act(seenCommand);cinematicKeys.current.delete(current.key);setStoryCinematic(null);
 }
 function sync(){
  if(!loaded)return Promise.resolve(null);
  if(syncFlight.current)return syncFlight.current;
  const generation=saveGeneration.current;dirty.current=false;setSaveStatus(current=>({...current,outcome:'saving'}));
  const flight=saveWorld(uid,saveRef.current).then(result=>{
   dirty.current=!!result.pending||saveGeneration.current!==generation;setSaveMessage(result.message);setSaveStatus(result.status);
   if(result.data){if(result.data.region!==saveRef.current.region)scene.current?.travel(result.data.region);saveRef.current=result.data;setSave(result.data);}
   return result;
  }).finally(()=>{syncFlight.current=null;});
  syncFlight.current=flight;return flight;
 }
 function toggleWorldCompanion(){const next=!companionVisible;setCompanionVisible(next);try{localStorage.setItem('3b-world-app-companion',next?'1':'0');}catch{}window.dispatchEvent(new CustomEvent('threeb:world-companion',{detail:{visible:next}}));}
 function changeQuality(mode){setQuality(mode);scene.current?.setQuality(mode);try{localStorage.setItem('3b-world-quality',mode);}catch{}}
 function changeHaptics(){const next=!haptics;setHaptics(next);try{localStorage.setItem('3b-world-haptics',next?'1':'0');}catch{}}
 function changeSoundCaptions(){const next=!soundCaptions;setSoundCaptions(next);try{localStorage.setItem('3b-world-sound-captions',next?'1':'0');}catch{}if(!next)setSoundCaption('');}
 function changeSensitivity(value){const next=saveCameraSensitivity(value);setCameraLookSensitivity(next);scene.current?.setCameraSensitivity?.(next);}
 function enterFullscreen(){if(!shell.current?.requestFullscreen){announce('Le plein écran n’est pas disponible dans ce navigateur.');return;}shell.current.requestFullscreen().then(()=>setPanel(null)).catch(()=>announce('Le plein écran n’est pas disponible dans ce navigateur.'));}

 async function refreshWorld(){const result=await loadWorld(uid);saveRef.current=result.data;setSave(result.data);setSaveMessage(result.message);setSaveStatus(result.status);dirty.current=!!result.needsSave;scene.current?.setSave(result.data);return result;}
 function handlePartyRuntimeState(row){
  const previous=partyRuntimeSelf.current;partyRuntimeSelf.current=row;
  if(previous?.state==='downed'&&row?.state==='active'&&saveRef.current.adventure.encounter?.result==='defeat'){
   refreshWorld().then(result=>{if(result?.data?.adventure?.encounter&&!result.data.adventure.encounter.result){setPanel('encounter');announce('Un allié t’a réanimé · reprends tes appuis.');}}).catch(error=>announce(error.message));
  }
 }
 function locateMember(member){if(member.camp){navigateTo(save.region+':cooperation');return;}const peer=peersRef.current.find(p=>p.id===member.id);if(!peer){announce('Ce voyageur est hors ligne ou en train de rejoindre le groupe.');return;}if(peer.region!==saveRef.current.region){announce('Retrouve ce voyageur dans '+(countryById[peer.region]?.name||'la Cité des Huit Héritages')+'. Traverse la porte correspondante.');return;}navigate({id:peer.id,name:member.avatar?.name||'Voyageur',x:peer.x,z:peer.z});}
 function stopGPS(message='Le GPS est désactivé.') {if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);watch.current=null;tracker.current.reset();setGPS(false);setGPSMessage(message);}
 function startGPS(){
  if(!navigator.geolocation){setGPSMessage('Ce navigateur ne propose pas le GPS. Le monde virtuel reste disponible.');return;}
  stopGPS('Recherche du signal GPS…');setGPS(true);
  watch.current=navigator.geolocation.watchPosition(position=>{
   const result=tracker.current.accept(position);setGPSMessage(result.status);
   if(result.metres>0){activity.current=Date.now();const previous=walkRef.current;walkRef.current+=result.metres;setWalkSession(Math.floor(walkRef.current));if(Math.floor(walkRef.current/100)>Math.floor(previous/100)){announce('Tes pas ont révélé un écho. Arrête-toi pour le rencontrer.');}act({type:'walk',metres:Math.min(200,Math.max(1,Math.round(result.metres)))});}
  },e=>{if(e.code===1)stopGPS('Permission refusée. Tu peux l’autoriser dans les réglages du navigateur puis réessayer.');else setGPSMessage(e.code===3?'Signal trop lent · attends un endroit dégagé.':'GPS indisponible pour le moment.');},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 }
 function travel(id){if(!act({type:'visit',region:id}))return;present('portal');scene.current?.travel(id);audio.current?.region(id);setPanel(null);chime();}
 function finishEncounter(){const e=saveRef.current.adventure.encounter;if(e){if(!act({type:'leave'}))return;if(!e.result){scene.current?.retreat(e);announce('Repli · aucune récompense, ton groupe est conservé');}}setPanel(null);}
 function closePanel(){setWorldRequested(true);const e=saveRef.current.adventure.encounter;if(e){if(['victory','recruited','missed','defeat'].includes(e.result)){finishEncounter();return;}setPanel(panel==='encounterPause'?'encounter':'encounterPause');return;}setNpcDialogue(null);setPanel(null);}
 function interactDefault(item){
  if(Number.isFinite(item?.x)&&Number.isFinite(item?.z))audio.current?.spatialEvent(item.type,item);
  if(item.type==='portal'){travel(item.id);return;}
  if(item.type==='campaignObjective'){setPanel('campaign');return;}
  if(item.type==='realmTravel'){
   const core=item.id===saveRef.current.region+':realm:core';
   if(!core&&!act({type:'realmRelayDiscover',id:item.id,position:scene.current?.snapshotPosition?.()||snapshot.position}))return;
   setRelayOrigin(item);setPanel('realmTravel');return;
  }
  if(item.type==='realmSite'){announce(item.description||item.name);return;}
  if(item.type==='franceResident'){setFranceResident(item.residentId);setPanel('paris');return;}
  if(item.type==='hubNpc'){
   const next=act({type:'hubNpcTalk',id:item.npcId});if(!next)return;
   const turn=dialogueTurns.current.get(item.npcId)||0;dialogueTurns.current.set(item.npcId,turn+1);
   const dialogueContext={hour:new Date().getHours(),weather:snapshot.weather||'clear'},scene=hubDialogueScene(item,{...dialogueContext,missionState:next.hub?.missions,talks:next.hub?.stats?.npcTalks?.[item.npcId]||0}),intents=hubDialogueIntents(item,next,dialogueContext);
   audio.current?.speak(scene.text||hubNpcDialogue(item,next.hub?.missions,turn),{character:item.npcId});
   setNpcDialogue({item,scene,intents,response:null});setPanel('hubDialogue');return;
  }
  if(item.type==='hubGuardian'){audio.current?.speak(item.name+' · Gardien de la valeur '+item.value,{character:item.card});setHubGuardianInfo(item);setPanel('guardianHub');return;}
  if(item.type==='hubMission'){
   const current=saveRef.current.hub?.missions?.[item.missionId];if(!current)return;
   if(current.status==='available'){if(item.locked){announce(item.name+' · termine d’abord : '+item.missingPrerequisites.map(hubMissionLabel).join(', '));return;}setHubOffer(item);setPanel('hubContract');return;}
   if(current.status==='active'){
    if(isAutoHubMission(item.missionId)){announce(item.name+' · objectif '+(current.completedObjectives+1)+'/'+current.totalObjectives+' · '+(item.objectives?.[current.completedObjectives]||'continue dans le monde'));return;}
    const next=act({type:'hubMissionStep',id:item.missionId,objective:current.completedObjectives});if(next){const after=next.hub.missions[item.missionId];announce(after.status==='completed'?item.name+' · objectifs terminés':item.name+' · objectif '+after.completedObjectives+'/'+after.totalObjectives);}return;
   }
   if(current.status==='completed'&&!current.claimed){const next=act({type:'hubMissionClaim',id:item.missionId});if(next)announce(item.name+' · récompense récupérée');return;}
   announce(item.name+' · mission déjà accomplie');return;
  }
  if(item.type==='hubTransport'){const now=new Date(),ride=scene.current?.rideHubTransport(item);if(!ride){announce('Ce transport n’est pas disponible pour le moment.');return;}const next=act({type:'hubTransportRide',transport:ride.transport,from:ride.from,to:ride.to,night:now.getHours()>=20||now.getHours()<6,dateKey:now.toISOString().slice(0,10)});if(next)announce(item.name+' · départ vers '+ride.to);return;}
  if(item.type==='hubEvent'){const before=saveRef.current.hub?.events?.includes(item.eventId),next=act({type:'hubEventDiscover',id:item.eventId});if(next){announce(before?item.effect:item.effect+' · +25 XP · +6 éclats');if(!before)chime();}return;}
  if(item.type==='hubSecretStep'){
   if(saveRef.current.hub?.secrets?.includes(item.secretId)){announce('Ce secret est déjà découvert.');return;}
   if(item.done){announce(item.name+' · déjà enregistré');return;}
   const next=act({type:'hubSecretStep',id:item.secretId,step:item.step});if(next){const count=next.hub.stats.secretProgress[item.secretId]?.length||0;announce(item.name+' · indice '+count+' enregistré');chime();}return;
  }
  if(item.type==='hubSecret'){const before=saveRef.current.hub?.secrets?.includes(item.secretId),next=act({type:'hubSecretUnlock',id:item.secretId,evidence:item.evidence||{}});if(next){announce(before?'Secret déjà découvert':item.reward+' · secret découvert');if(!before)chime();}return;}
  if(item.type==='hubHeritageFacility'){
   act({type:'hubDistrictVisit',id:item.district});
   const services=item.services||[];
   announce(item.name+' · '+item.purpose);
   if(services.some(id=>['tactical_training','timed_challenges','sport','public_events'].includes(id))){setPanel('arena');return;}
   if(services.some(id=>['craft','forge','textile_upgrade'].includes(id))){setPanel('avatar');return;}
   if(services.some(id=>['navigation','coast_missions','data','mapping','exploration_tools'].includes(id))){setPanel('atlas');return;}
   if(services.some(id=>['healing','restoration'].includes(id))){setPanel('team');return;}
   setPanel('journal');return;
  }
  if(item.type==='hubPublicPlace'||item.type==='hubCreature'){act({type:'hubDistrictVisit',id:item.district});setHubPlace(item);setPanel('hubPlace');return;}
  if(item.type==='hubBuilding'){
   act({type:'hubDistrictVisit',id:item.district});const next=act({type:'hubBuildingVisit',id:item.buildingId});if(!next)return;
   if(resolveHubCityService(item)){setHubPlace(item);setPanel('hubCityService');return;}
   const functions=item.functions||[];
   if(item.buildingId==='city_planning_office'||item.buildingId==='city_gallery'){setHubPlace(item);setPanel('hubPlace');return;}
   if(functions.includes('combat')||functions.includes('movement_training')){setPanel('arena');return;}
   if(functions.includes('textile_ai')){goTo('ia-textile');return;}
   if(functions.includes('styling')||functions.includes('customization')){setPanel('avatar');return;}
   if(functions.includes('shop')){goTo('shop');return;}
   if(functions.includes('groups')){setPanel('party');return;}
   if(functions.includes('world_map')){setPanel('atlas');return;}
   if(functions.includes('collection')||functions.includes('character_collection')){setPanel('collection');return;}
   if(functions.includes('tutorial')||functions.includes('public_missions')){setPanel('journal');return;}
   setHubPlace(item);setPanel('hubPlace');return;
  }
  if(item.type==='hubDistrict'){act({type:'hubDistrictVisit',id:item.district});announce(item.name+' · '+item.purpose);return;}
  if(item.type==='valueTrial'){if(item.locked){announce('Reconstruis d’abord les deux premières étapes du pays avant cette épreuve.');return;}const vr=GUARDIAN_VALUES[saveRef.current.region],vs=saveRef.current.adventure.values?.[saveRef.current.region],step=vr?guardianValueStep(saveRef.current.region,vs):null;if(step)audio.current?.speak('Épreuve de '+vr.value+'. '+step.label,{character:vr.card});setPanel('valueTrial');return;}
  if(item.type==='vista'){announce(item.name+' · explore les rues et les alentours librement.');return;}
  if(item.type==='landmark'){setPanel('heritage');return;}
  if(item.type==='job'){const next=act({type:'jobDone',id:item.job});if(next)chime();return;}
  if(item.type==='cooperation'){setPanel('party');return;}
  if(item.type==='cafe'){setPanel('cafe');return;}
  if(item.type==='camp'){setPanel('camp');return;}
  if(item.type==='resource'){const next=act({type:'gather',resource:item.resource});if(next){const labels={wood:'bois',stone:'pierre',food:'provisions'};announce('Récolte ajoutée · '+labels[item.resource]);}return;}
  if(item.type==='patrol'){if(act({type:'patrol'})){act({type:'fieldStart'});setPanel('encounter');}return;}
  if(item.type==='atelier'){setPanel('avatar');return;}
  if(item.type==='survey'){const previous=saveRef.current.xp,next=act({type:'survey',id:item.id.split(':').at(-1)});if(next){announce(next.xp>previous?item.name+' · +25 XP monde · +6 éclats':'Carnet déjà complété · '+item.name);if(next.xp>previous)chime();}return;}
  if(item.type==='sanctuary'){setPanel('sanctuary');return;}
  if(item.type==='story'){setPanel('story');return;}
  if(item.type==='final'){if(saveRef.current.adventure.finished){setPanel('final');return;}if(act({type:'final'}))setPanel('encounter');return;}
  if(item.type==='beacon'){if(act({type:'beacon',id:item.id}))chime();return;}
  if(act({type:'encounter',id:item.id})){act({type:'fieldStart'});scene.current?.cooldown(item.id);setPanel('encounter');}
 }
 async function interact(item,actionId=null){
  if(!item)return;
  const actions=contextActions(item,{save:saveRef.current,region:snapshot.region}),contextAction=(actionId?actions.find(action=>action.id===actionId):actions[0])||primaryContextAction(item,{save:saveRef.current,region:snapshot.region});
  if(!contextAction)return;
  const feedback=actionFeedback(contextAction.id),performed=scene.current?.contextAction?.(contextAction.id,item);if(item.type==='hubLifeObject'&&!performed){announce('Rapproche-toi du mobilier pour l’utiliser.');return;}audio.current?.interaction?.(contextAction.id);if(soundCaptions&&feedback?.caption)captionAudio('['+feedback.caption+']');
  if(haptics&&feedback?.haptic&&globalThis.navigator?.vibrate){const pattern={light:12,medium:24,strong:[28,18,34]}[feedback.haptic];if(pattern)globalThis.navigator.vibrate(pattern);}
  if((item.type==='hubMissionAction'||item.type==='jobAction')&&isPhysicalTraversalAction(contextAction.id)){
   const moved=await scene.current?.performTraversal?.(contextAction.id,item);
   if(!moved){announce('Le passage physique est bloqué. Replace-toi près de la cible et réessaie.');return;}
  }
  if(item.type==='hubLifeObject'){announce(item.detail||item.name);return;}
  if(item.type==='hubLift'){setTowerLift(item);setPanel('hubLift');return;}
  if(contextAction.id==='resonance'){
   const next=act({type:'resonanceContext',targetId:item.id,targetType:item.type,verb:contextAction.resonanceVerb});if(next)announce(resonanceContextMessage(next.adventure.resonanceContext));return;
  }
  if(item.type==='downedPlayer'&&contextAction.id==='revive'){
   const link=partyLink.current;if(!link){announce('La connexion au groupe n’est pas prête.');return;}
   link.revive(item.userId).then(()=>announce((item.name||'Voyageur')+' · réanimation validée par le serveur')).catch(error=>announce(error.message));return;
  }
  if(item.type==='hubMissionAction'){
   if(mechanismFor(item)){setHubMechanism(item);setPanel('hubMechanism');return;}
   const before=saveRef.current.hub?.missions?.[item.missionId],next=act({type:'hubMissionAction',missionId:item.missionId,actionId:item.actionId});if(!next)return;
   const after=next.hub?.missions?.[item.missionId],advanced=(after?.completedObjectives||0)>(before?.completedObjectives||0);
   announce(item.actionLabel+(advanced?' · objectif validé':' · action enregistrée'));if(advanced)chime();return;
  }
  if(item.type==='jobAction'){
   const before=saveRef.current.adventure?.frontier?.[saveRef.current.region],next=act({type:'jobAction',job:item.job,actionId:item.actionId});if(!next)return;
   const after=next.adventure?.frontier?.[next.region],advanced=(after?.jobStage||0)>(before?.jobStage||0);
   announce(item.actionLabel+(advanced?' · étape terminée':' · action enregistrée'));if(advanced)chime();return;
  }
  if(['hubPublicPlace','hubCreature','campaignObjective','realmTravel','realmSite'].includes(item.type)){interactDefault(item);return;}
  if(['inspect','observe','scan','memoryVision'].includes(contextAction.id)){
   const descriptions={
    inspect:item.detail||item.purpose||item.effect||('Tu examines '+(item.name||'cet élément')+'.'),
    observe:item.detail||item.purpose||('Tu prends le temps d’observer '+(item.name||'la situation')+' avant d’agir.'),
    scan:'Le scan relève les éléments visibles et les conserve comme contexte ; il ne valide pas une mission à lui seul.',
    memoryVision:item.done?'Ce Souvenir a déjà été restauré. La Vision révèle encore les traces de ce qui s’est passé ici.':'La Vision montre une résonance autour de ce point. Pour restaurer le Souvenir, il faut encore accomplir l’action demandée.',
   };
   announce(descriptions[contextAction.id]);return;
  }
  if(contextAction.id==='calm'&&item.type==='echo'){
   const region=saveRef.current.region;if(!saveRef.current.adventure.chapters?.[region]?.helped){announce('Aide d’abord l’habitant du pays pour apprendre à approcher cet Écho sans combattre.');return;}
   if(!act({type:'encounter',id:item.id}))return;
   const next=act({type:'approach',kind:'help'});if(next){setPanel('encounter');announce('Approche pacifique · observe maintenant les besoins de l’Écho pour créer un lien.');}
   return;
  }
  interactDefault(item);
 }
 const moveInput=useCallback(value=>scene.current?.setMoveInput?.(value),[]);
 const playAction=useCallback(kind=>{audio.current?.unlock?.();scene.current?.gameplayAction?.(kind);},[]);
 callbacks.current={interact,campaign:input=>act({type:'campaignAction',...input}),combat:input=>act({type:'field',...input}),step:region=>audio.current?.step(region),gameplay:kind=>audio.current?.gameplay?.(kind)};
 useEffect(()=>{let live=true;loadWorld(uid).then(result=>{if(!live)return;if(uid&&!result.status.hasLocalCopy&&['offline','auth','receipt','storage'].includes(result.status.outcome)){setSaveStatus(result.status);setSaveMessage(result.message);setError('La progression de ton compte n’a pas pu être retrouvée. Aucune copie locale n’est disponible : reconnecte-toi puis réessaie pour reprendre ta partie.');setAssetsLoading(false);return;}const entry=worldEntryPolicy(result.data);let data=result.data,entryRecorded=false;if(entry.action){try{data=recordWorldAction(uid,data,entry.action);entryRecorded=true;}catch(error){setError('Le Nexus n’a pas pu être préparé sans risquer ta sauvegarde · '+error.message);}}saveUsable.current=true;setSave(data);saveRef.current=data;dirty.current=!!result.needsSave||entryRecorded;setSaveMessage(result.message+(entryRecorded?' · entrée au Nexus préparée.':''));setSaveStatus(result.status);setLoaded(true);setWorldRequested(!!result.data.adventure.avatar.created||!!result.data.adventure.encounter);if(entry.resumeEncounter)setPanel('encounter');else if(!data.adventure.avatar.created)setPanel('avatar');});return()=>{live=false;};},[uid]);
 useEffect(()=>{
  if(!loaded||!worldRequested)return;
  try{scene.current=createWorldScene(canvas.current,{save:saveRef.current,onSnapshot:setSnapshot,onLoadState:setAssetsLoading,onInteract:item=>callbacks.current.interact(item),onCombatStep:input=>callbacks.current.combat(input),onCampaignStep:input=>callbacks.current.campaign(input),onGameplay:kind=>callbacks.current.gameplay(kind),onActivity:()=>{activity.current=Date.now();},onStep:region=>callbacks.current.step(region),onError:setError});scene.current.setQuality(quality);scene.current.setControls?.(controls);scene.current.setCameraSensitivity?.(cameraLookSensitivity);scene.current.setPremiumCodes?.(premiumCodes);ready.current=true;}
  catch{setError('Le navigateur n’a pas pu ouvrir la 3D. Active l’accélération graphique ou essaie un autre navigateur. Ta sauvegarde est conservée.');}
  return()=>{ready.current=false;scene.current?.destroy();scene.current=null;};
 },[loaded,worldRequested]);
 useEffect(()=>{if(panel!=='encounter')setCombatImpact(null);else if(!storyCinematic&&!cinematicQueue.length&&saveRef.current.adventure.encounter&&!saveRef.current.adventure.encounter.result&&!saveRef.current.adventure.encounter.field)act({type:'fieldStart'});},[panel,loaded,storyCinematic,cinematicQueue.length]);
 useEffect(()=>{paused.current=cityOpen||!!storyCinematic||(!!panel&&!['encounter','gps'].includes(panel))||!!error;scene.current?.setPaused(cityOpen||!!storyCinematic||(!!panel&&!fieldCombat)||!!error);scene.current?.setPresentation(storyCinematic?'storyCinematic':panel);},[panel,error,loaded,worldRequested,fieldCombat,storyCinematic,cityOpen]);
 useEffect(()=>{scene.current?.setNpcConversation?.(panel==='hubDialogue'&&!cityOpen&&!storyCinematic&&!error?npcDialogue?.item.id:null);},[panel,npcDialogue?.item.id,cityOpen,storyCinematic,error,loaded,worldRequested]);
 useEffect(()=>{if(!uid||!loaded)return;partyLink.current=createPartyConnection({uid,onState:setPartyState,onPeers:peers=>{peersRef.current=peers;scene.current?.setPeers(peers);},onConnection:setConnection,onError:announce,onRuntimeState:handlePartyRuntimeState});return()=>{partyLink.current?.dispose();partyLink.current=null;partyRuntimeSelf.current=null;};},[uid,loaded]);
 useEffect(()=>{partyLink.current?.pose({region:snapshot.region,x:snapshot.position.x,z:snapshot.position.z,heading:snapshot.heading||0});},[snapshot]);
 useEffect(()=>{
  const encounter=save.adventure.encounter;
  if(!uid||!loaded||!partyState?.party||encounter?.result!=='defeat'){if(encounter?.result!=='defeat')partyDownKey.current=null;return;}
  const key=[encounter.region,encounter.card,encounter.turn].join(':');if(partyDownKey.current===key)return;partyDownKey.current=key;let cancelled=false;
  (async()=>{try{const result=await sync();if(cancelled)return;if(result?.pending)throw Error('La défaite doit être synchronisée avant la réanimation coop.');await partyLink.current?.down();if(!cancelled)announce('Tu es à terre · rapproche un membre du groupe pour être réanimé.');}catch(error){if(!cancelled){partyDownKey.current=null;announce(error.message);}}})();
  return()=>{cancelled=true;};
 },[uid,loaded,partyState?.party?.id,save.adventure.encounter?.result,save.adventure.encounter?.turn,save.adventure.encounter?.card]);
 useEffect(()=>{scene.current?.setParty(partyState?.party);},[partyState,loaded]);
 useEffect(()=>{scene.current?.setSave(save);if(!loaded||!dirty.current)return;clearTimeout(saveTimer.current);saveTimer.current=setTimeout(sync,1200);return()=>clearTimeout(saveTimer.current);},[save,loaded]);
 useEffect(()=>{scene.current?.setControls?.(controls);},[controls]);
 useEffect(()=>{
  const hidden=()=>{audio.current?.visibility(document.hidden);if(document.hidden){stopGPS('GPS arrêté en arrière-plan. Réactive-le pour une nouvelle sortie.');if(dirty.current)sync();} };
  const online=()=>{if(uid){if(!saveUsable.current)location.reload();else sync();}};document.addEventListener('visibilitychange',hidden);window.addEventListener('online',online);
  const timer=setInterval(()=>{if(ready.current&&dirty.current)sync();},20000),scheduleTimer=setInterval(()=>scene.current?.refreshHubSchedule(),60000);
  return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('online',online);clearTimeout(captionTimer.current);clearInterval(timer);clearInterval(scheduleTimer);clearTimeout(noticeTimer.current);clearTimeout(saveTimer.current);if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);if(dirty.current)saveWorld(uid,saveRef.current);};
 },[uid,loaded]);
 const country=countryById[snapshot.region],stats=useMemo(()=>teamStats(save),[save]),regionItems=useMemo(()=>snapshot.mapItems||worldRuntimeItems(snapshot.region,save),[snapshot.region,snapshot.mapItems,save]),outdoorEchoes=save.adventure.outdoorCredits;
 const valueRule=GUARDIAN_VALUES[save.region],valueState=save.adventure.values?.[save.region],valueStep=valueRule?guardianValueStep(save.region,valueState):null,valueOptions=valueRule?guardianValueOptions(save.region,valueState):[];
 const valueOutcome=valueRule?guardianValueOutcome(save.region,valueState):null;
 const guardianHubView=hubGuardianInfo?guardianHubState(hubGuardianInfo.region,save):null;
 const guardianResonance=hubGuardianInfo?resonanceFor(hubGuardianInfo.region):null,resonances=unlockedResonances(save);
 async function validatePartyRegroup(){
  if(!partyState?.party||!partyLink.current){announce('Crée ou rejoins d’abord un groupe.');return;}
  if(save.region==='hub'){announce('Le regroupement partagé se valide dans un pays.');return;}
  const target=regionItems.find(item=>item.type==='cooperation');if(!target){announce('Refuge commun introuvable dans cette zone.');return;}
  if((partyState.members||[]).length<2){announce('Il faut au moins deux voyageurs dans le groupe.');return;}
  try{const result=await partyLink.current.objective({objective:'refuge-regroup:'+save.region,region:save.region,x:target.x,z:target.z,required:2});announce(result?.idempotent?'Regroupement coop déjà validé.':'Objectif partagé validé · deux voyageurs réunis au refuge.');}
  catch(error){announce(error.message);}
 }
 function runCampaign(operation,choice){
  const before=activeCampaignSnapshot(saveRef.current);if(!before||before.finished)return;
  const next=act({type:'campaignAction',region:before.region,objective:before.objective,operation,choice,position:scene.current?.snapshotPosition?.()||snapshot.position});if(!next)return;
  const after=activeCampaignSnapshot(next);
  if(next.adventure.encounter&&!next.adventure.encounter.result){setPanel('encounter');return;}
  if(after?.started||after?.objective!==before.objective)setPanel(null);
 }
 function relayTravel(destination){
  if(!relayOrigin)return;
  const next=act({type:'realmTravel',from:relayOrigin.id,to:destination.id,position:scene.current?.snapshotPosition?.()||snapshot.position});
  if(next){audio.current?.interaction?.('ride');setRelayOrigin(null);setPanel(null);announce(destination.name);}
 }
 function navigateTo(id){const item=regionItems.find(i=>i.id===id);if(item)navigate(item);}
 function navigate(item){if(!item){announce('Ce lieu n’est pas disponible dans la zone actuelle.');return;}scene.current?.waypoint(item,false);setPanel(null);}
 function cancelGuidance(){
  scene.current?.cancelWaypoint?.();
  setSnapshot(previous=>({...previous,waypoint:null,route:[],routePlanning:false,remaining:null,joystick:null}));
 }
 function exportSave(){const blob=new Blob([JSON.stringify(saveRef.current,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='3b-monde-sauvegarde.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function importSave(event){const file=event.target.files?.[0];if(!file)return;try{if(file.size>300000)throw Error();const raw=JSON.parse(await file.text());if(raw.version!==1||!raw.collection)throw Error();if(uid){announce('Les comptes restaurent leur progression depuis le serveur. Ta copie peut être utilisée en mode invité.');return;}const restored=normalizeSave(raw);if(!writeLocal(null,restored))throw Object.assign(Error('Le stockage local ne peut pas enregistrer cette copie. Libère de la place puis réessaie.'),{playerMessage:true});setSave(restored);saveRef.current=restored;scene.current?.setSave(restored);dirty.current=true;scene.current?.travel(restored.region);announce('Ta copie de sauvegarde a été restaurée.');}catch(error){announce(error.playerMessage?error.message:'Ce fichier n’est pas une sauvegarde du Monde 3B valide.');}event.target.value='';}
 return <section ref={shell} onPointerDownCapture={()=>audio.current?.unlock?.()} onKeyDownCapture={()=>audio.current?.unlock?.()} className="world-shell" data-region={snapshot.region} aria-label="Le Monde du 3B">
  <div className="world-rotate-device" role="status"><RotateCcw/><strong>Tourne ton téléphone</strong><span>Le Monde du 3B se joue en horizontal.</span></div>
  <canvas ref={canvas} className="world-canvas" tabIndex={0} inert={!!error||(!!panel&&!fieldCombat)||cityOpen||!!storyCinematic} aria-label={"Monde 3D. Glisse à gauche pour avancer, à droite pour tourner la caméra. "+controlLabel(controls,'interact')+" pour interagir."}/>
  <div className="world-vignette"/>
  {storyCinematic&&<CinematicOverlay key={storyCinematic.key} presentation={storyCinematic} onDone={finishStoryCinematic} onSkip={finishStoryCinematic}/>} 
  {panel==='encounter'&&snapshot.combat&&combatImpact&&<div className="combat-impact-layer" aria-hidden="true" key={combatImpact.key}>{combatImpact.outgoing>0&&<b className="impact-enemy" style={{left:snapshot.combat.enemy.x+'%',top:snapshot.combat.enemy.y+'%'}}>−{combatImpact.outgoing}</b>}{(combatImpact.incoming>0||combatImpact.healing>0)&&<b className={combatImpact.healing?'impact-heal':'impact-hero'} style={{left:snapshot.combat.hero.x+'%',top:snapshot.combat.hero.y+'%'}}>{combatImpact.healing?'+'+combatImpact.healing:'−'+combatImpact.incoming}</b>}</div>}
  <WorldHUD onCompanionGuard={()=>{if(!saveRef.current.adventure.companion||saveRef.current.adventure.companionHidden)act({type: 'companion',id:saveRef.current.adventure.companion||saveRef.current.leader});act({type: 'companionOrder',value: 'guard'});}} onCampaignAction={runCampaign} onPlay={playAction} onNavigate={navigate} snapshot={snapshot} save={save} panel={error?'failure':panel} onPanel={value=>{if(saveUsable.current&&!error)setPanel(value);}} onInteract={()=>scene.current?.interact()} onContextAction={(item,id)=>interact(item,id)} onGuide={()=>scene.current?.waypoint(snapshot.waypoint,true)} onGuideTo={item=>scene.current?.waypoint(item,true)} onCancelGuide={cancelGuidance} notificationVisible={!!notice} loaded={loaded&&!assetsLoading} controls={controls}/>
  {loaded&&!assetsLoading&&!error&&!storyCinematic&&!cityOpen&&(!panel||fieldCombat)&&<WorldPlayControls onAction={playAction} onMove={moveInput} controls={controls} combat={fieldCombat}/>}
  {!panel&&<><button className="play-button play-party" aria-label="Rejoindre la Maison de la Communauté" title="Maison de la Communauté" onClick={()=>{const place=regionItems.find(i=>i.buildingId==='community_house');if(place)navigate(place);else setPanel('party');}}><Users size={21}/></button>{partyState?.party&&<span className={'party-online '+connection}>{connection==='connected'?'● Groupe '+partyState.members.length+'/4':'Reconnexion…'}</span>}</>}
  {snapshot.cinematic&&!panel&&!storyCinematic&&<div className="play-cinematic"><div><h2>{snapshot.cinematic.title}</h2><p>{snapshot.cinematic.detail}</p></div><button onClick={()=>scene.current?.skipCinematic()}>Passer</button></div>}
  {gps&&!panel&&<button className="play-gps" onClick={()=>setPanel('gps')} aria-label="Sortie GPS"> <Footprints size={16}/> {walkSession} m</button>}
  {snapshot.joystick&&<div className="world-joystick" style={{left:snapshot.joystick.x,top:snapshot.joystick.y}}><i style={{transform:`translate(${snapshot.joystick.dx}px,${snapshot.joystick.dy}px)`}}/></div>}
  {notice&&<div className="world-notice" role="status" aria-atomic="true">{notice}<button className="notice-close" aria-label="Fermer la notification" onClick={()=>{clearTimeout(noticeTimer.current);setNotice('');}}>×</button></div>}
  {!panel&&loaded&&uid&&<WorldSaveStatus compact status={saveStatus} onSync={sync} onExport={exportSave} onAccount={()=>goTo('member')}/>}
  {soundCaptions&&soundCaption&&<div className="world-sound-caption" role="status" aria-live="polite">{soundCaption}</div>}
  {(!loaded||assetsLoading)&&!error&&<div className="world-loading" role="status">Préparation de ton voyage…</div>}
  {error&&<Modal title="Reprendre l’exploration" kind="failure" onClose={()=>goTo('home')}><div className="hub-recovery" role="alert"><p>{error}</p><div className="world-actions"><Button className="world-primary" onClick={()=>location.reload()}>Réessayer</Button>{uid&&<Button variant="neutral" onClick={()=>goTo('member')}>Me reconnecter</Button>}<Button variant="neutral" onClick={()=>goTo('home')}>Retour à l’application</Button></div></div></Modal>}
  {fieldCombat&&<FieldEncounter save={save} act={act} onRetreat={finishEncounter} onPause={()=>setPanel('encounterPause')} snapshot={snapshot} controls={controls} onJump={()=>playAction('jump')} onFieldAction={kind=>scene.current?.combatAction(kind)}/>}
  {!panel&&snapshot.lifeInteraction&&<div className="hub-life-reading" role="status"><strong>{snapshot.lifeInteraction.title}</strong><p>{snapshot.lifeInteraction.detail}</p><span>{snapshot.lifeInteraction.caption}</span><button onClick={()=>scene.current?.endLifeInteraction?.()}>Reprendre la marche</button></div>}
  {!panel&&snapshot.region==='hub'&&snapshot.interior&&<div className="hub-place">{snapshot.towerFloor?.name||regionItems.find(i=>i.buildingId===snapshot.interior)?.name||'Lieu de la cité'}</div>}
  {!panel&&snapshot.region!=='hub'&&<>{!(snapshot.waypoint&&snapshot.remaining>7)&&<button className="paris-journal-link" onClick={()=>{setFranceResident(null);setPanel('paris');}}>La vie du quartier</button>}{snapshot.interior&&<div className="paris-place">{snapshot.interior==='atelier'?'Atelier des Verrières':'Refuge des Liens'}</div>}</>}
  {panel&&!fieldCombat&&<Modal kind={panel} title={({party:'Explorer ensemble',cafe:'Café des Liens',paris:'La vie du quartier',heritage:'Patrimoine et monde 3B',camp:'Mon refuge',collection:'Les compagnons du monde',sanctuary:'Un lieu pour ton groupe',team:'Ton équipe',atlas:'L’Atlas des huit portes',journal:'Journal d’exploration',campaign:'Une étape du royaume',realmTravel:'Les relais du royaume',gps:'Les échos du dehors',pause:'Une pause dans le voyage',encounterPause:'Rencontre suspendue',encounter:'Un écho te rencontre',final:'Le monde continue',story:'Un pays à reconstruire',wardrobe:'Ton style',avatar:'Ton personnage',arena:'L’Arène 3B',hubDialogue:npcDialogue?.item?.name||'Conversation',valueTrial:valueRule?'Épreuve · '+valueRule.value:'Épreuve du Gardien',guardianHub:hubGuardianInfo?.name||'Gardien',hubMechanism:'Rétablir les connexions',hubContract:'Une mission pour la cité',hubCityService:hubPlace?.name||'Service de la cité',hubPlace:hubPlace?.name||'Lieu de la cité',hubOpening:'Le Cercle Brisé',hubLift:'Ascenseur de la Tour',premium:'Boutique Premium 3B'})[panel]} onClose={closePanel} wide={['collection','atlas','journal','avatar','arena','premium','hubOpening','hubCityService'].includes(panel)}>
   {panel==='hubOpening'&&<HubOpeningCinematic avatar={save.adventure.avatar} onDone={closePanel}/> }
   {panel==='hubContract'&&hubOffer&&<div className="hub-contract"><span className="world-kicker">{hubCategoryLabel(hubOffer.category)} · {hubDistrictLabel(hubOffer.district)}</span><h3>{hubOffer.name}</h3><ol>{hubOffer.objectives?.map((objective,i)=><li key={i}>{hubObjectiveLabel(objective)}</li>)}</ol><p>Récompense : {hubMissionReward(hubOffer).xp} XP monde · {hubMissionReward(hubOffer).shards} éclats</p><div className="world-actions"><Button className="world-primary" onClick={()=>{const next=act({type:'hubMissionStart',id:hubOffer.missionId});if(next){setHubOffer(null);setPanel(null);announce(hubOffer.name+' · mission acceptée');}}}>Accepter la mission</Button><Button variant="neutral" onClick={()=>{setHubOffer(null);closePanel();}}>Pas maintenant</Button></div></div>}
   {panel==='hubMechanism'&&hubMechanism&&<HubMechanismPanel key={hubMechanism.id} item={hubMechanism} onCancel={()=>{setHubMechanism(null);closePanel();}} onSolved={item=>{const next=act({type:'hubMissionAction',missionId:item.missionId,actionId:item.actionId});setHubMechanism(null);closePanel();if(next){announce(item.actionLabel+' · circuit validé');chime();}}}/>}
   {panel==='hubCityService'&&hubPlace&&<HubCityServices key={hubPlace.id} item={hubPlace} save={save} items={regionItems} accountId={uid} onNavigate={navigate} onPanel={setPanel} onOpenCity={()=>{setPanel(null);setCityOpen(true);}} onApplyPalette={patch=>!!act({type:'avatar',avatar:{...saveRef.current.adventure.avatar,...patch}})}/> }
   {panel==='hubPlace'&&hubPlace&&<HubDistrictPanel place={hubPlace} save={save} items={regionItems} onNavigate={navigate} onService={item=>navigate({...item,x:item.entrance.x,z:item.entrance.z})} onMission={item=>{setHubOffer(item);setPanel('hubContract');}}/>}
   {panel==='premium'&&<DigitalStorePanel scope="world" onStoreChange={store=>setPremiumCodes(ownedPremiumCodes(store))}/>}
   {panel==='hubLift'&&towerLift&&<div className="hub-lift-panel"><span className="world-kicker">Tour du Cercle Brisé</span><h3>Les étages de la cité</h3><p>Choisis un étage, puis explore la galerie ou le panorama.</p><div className="world-actions">{towerLift.destinations.map(floor=><button key={floor.id} aria-pressed={(snapshot.towerFloor?.index??null)===floor.index} onClick={()=>{const destination=scene.current?.setTowerFloor?.(floor.index);if(destination){audio.current?.interaction?.('ride');setPanel(null);setTowerLift(null);announce(destination.name);}}}>{floor.name}<small>{floor.y?Math.round(floor.y)+' m':'Accueil et services'}</small></button>)}</div></div>}
   {panel==='guardianHub'&&hubGuardianInfo&&<div className="guardian-hub-panel"><span className="world-kicker">{hubGuardianInfo.value} · Gardien libéré</span><h3>{hubGuardianInfo.name}</h3><p>{guardianHubView?.line||'Le Gardien reste présent dans la Cité.'}</p>{guardianHubView&&<><p><strong>Conflit personnel.</strong> {guardianHubView.conflict}</p><p><strong>Après sa libération.</strong> {guardianHubView.postMission}</p>{guardianResonance&&<section className="guardian-resonance"><h4>Résonance transmise · {guardianResonance.name}</h4><p><strong>Exploration.</strong> {guardianResonance.exploration}</p><p><strong>Combat.</strong> {guardianResonance.combat}</p><small>{guardianResonance.limit}</small></section>}{guardianHubView.relationships.length>0&&<div className="guardian-relations"><h4>Relations entre Gardiens</h4>{guardianHubView.relationships.map(rel=><article key={rel.id}><strong>{rel.theme}</strong><p>{rel.tension}</p><small>{rel.mission}</small></article>)}</div>}{guardianHubView.stage==='union'&&<p><strong>Rôle final.</strong> {guardianHubView.finalRole}</p>}</>}<div className="world-actions"><button onClick={()=>{if(guardianHubView){audio.current?.speak(guardianHubView.line,{character:hubGuardianInfo.card});announce(guardianHubView.value+' · '+guardianHubView.stage);}}}>Parler au Gardien</button><button className="world-primary" onClick={()=>{const region=hubGuardianInfo.region;setHubGuardianInfo(null);setPanel(null);travel(region);}}>Retourner en {countryById[hubGuardianInfo.region]?.name||hubGuardianInfo.region}</button><button onClick={()=>{setHubGuardianInfo(null);setPanel(null);}}>Rester dans la Cité</button></div></div>}
   {panel==='valueTrial'&&valueRule&&<div className="guardian-value-panel"><span className="world-kicker">{valueRule.name} · {valueRule.value}</span>{valueState?.completed?<><h3>Valeur traversée</h3><p>{valueOutcome?.summary} Cette épreuve ne juge pas un score parfait : le Gardien se souvient aussi de la manière dont tu as assumé les tensions créées.</p>{valueOutcome?.tensions>0&&<p><strong>{valueOutcome.tensions}</strong> tension{valueOutcome.tensions>1?'s':''} mémorisée{valueOutcome.tensions>1?'s':''} dans ton parcours.</p>}<button className="world-primary" onClick={()=>setPanel(null)}>Reprendre l’exploration</button></>:valueStep?<><h3>{valueStep.reflection?'Réflexion sur les conséquences':'Décision '+(valueStep.step+1)+'/3'}</h3><p>{valueStep.prompt}</p>{valueOutcome?.tensions>0&&!valueStep.reflection&&<p className="world-hint">Tes choix précédents ont déjà créé {valueOutcome.tensions} tension{valueOutcome.tensions>1?'s':''}. Elles ne sont pas effacées.</p>}<div className="world-actions">{valueOptions.map(option=><button key={option.id} onClick={()=>{const next=act({type:'guardianValueChoice',choiceId:option.id});if(!next)return;announce(option.consequence);if(next.adventure.values?.[save.region]?.completed)chime();}}><strong>{option.label}</strong><small>{option.consequence}</small></button>)}</div></>:<p>Épreuve indisponible.</p>}</div>}
   {panel==='hubDialogue'&&npcDialogue&&<div className="hub-dialogue-v3">{npcDialogue.item.missionIds?.length>0&&<div className="world-actions">{npcDialogue.item.missionIds.map(id=>{const mission=regionItems.find(i=>i.type==='hubMission'&&i.missionId===id);return mission?<Button variant="neutral" key={id} disabled={mission.locked} onClick={()=>{if(save.hub?.missions?.[id]?.status==='available'||(save.hub?.missions?.[id]?.status==='completed'&&!save.hub?.missions?.[id]?.claimed))interactDefault(mission);else navigate(regionItems.find(i=>i.type==='hubMissionAction'&&i.missionId===id)||mission);}}>{mission.name}{mission.locked?' · à débloquer':''}</Button>:null;})}</div>}<span className="world-kicker">{npcDialogue.item.role} · {npcDialogue.scene.activity?.label||npcDialogue.item.activity||npcDialogue.item.district}</span><h3>{npcDialogue.item.name}</h3><p>{npcDialogue.response?.text||npcDialogue.scene.text}</p>{npcDialogue.scene.choices?.length>0&&<><h4>Répondre</h4><div className="world-actions">{npcDialogue.scene.choices.map(choice=><Button variant="neutral" key={choice.id} onClick={()=>{const next=act({type:'hubDialogueChoice',npcId:npcDialogue.item.npcId,sceneId:npcDialogue.scene.id,choiceId:choice.id});if(next){announce(choice.value+' · choix mémorisé');setNpcDialogue({...npcDialogue,scene:{...npcDialogue.scene,choices:null},response:{text:'Ton choix est enregistré. Tu peux continuer la conversation ou repartir.'}});}}}>{choice.label}</Button>)}</div></>}<h4>Parler de…</h4><div className="world-actions">{npcDialogue.intents.map(intent=><Button variant="neutral" key={intent.id} onClick={()=>{const next=act({type:'hubDialogueIntent',npcId:npcDialogue.item.npcId,intentId:intent.id});if(!next)return;const regionId=COUNTRIES.find(country=>country.name===npcDialogue.item.country)?.id,canon=CANON_WORLDS[regionId],response=hubDialogueIntentResponse(npcDialogue.item,intent.id,next,{hour:new Date().getHours(),weather:snapshot.weather||'clear',guardianName:canon?.guardian,value:canon?.value,countryName:npcDialogue.item.country,guardianLiberated:regionId?next.seals.includes(regionId):false});audio.current?.speak(response.text,{character:npcDialogue.item.npcId});if(response.close){setNpcDialogue(null);setPanel(null);}else setNpcDialogue({...npcDialogue,response});}}>{intent.label}</Button>)}</div></div>}
   {panel==='party'&&<PartyPanel uid={uid} state={partyState} save={save} connection={connection} onState={data=>partyLink.current?.update(data)} onFlush={async()=>{const result=await sync();if(result?.pending)throw Error('Attends la synchronisation de ta progression avant de contribuer.');}} onRefreshWorld={refreshWorld} onLocate={locateMember} onLogin={()=>goTo('member')} onSharedObjective={validatePartyRegroup} onSignal={kind=>{partyLink.current?.signal(kind);setPanel(null);}}/>}
   {panel==='encounterPause'&&<div className="encounter-pause"><h3>Ton groupe t’attend.</h3><p>Tu peux reprendre cette rencontre, y compris après avoir rechargé la page.</p><button className="world-primary" onClick={()=>setPanel('encounter')}>Reprendre le combat</button><button onClick={finishEncounter}>Se replier dans le monde</button><small>{save.adventure.encounter?.patrol?'La provision de cette expédition reste consommée. Tes constructions et tes compagnons sont conservés.':'Un repli ne donne aucune récompense.'}</small></div>}
   {panel==='heritage'&&country&&<div className="heritage-panel"><span className="world-kicker">{HERITAGE[country.id].city} · {country.name}</span><h3>{HERITAGE[country.id].name}</h3><p>{HERITAGE[country.id].form}</p><p>Une interprétation 3D à l’échelle du jeu. Ce pays réunit plusieurs lieux et paysages : il ne reproduit pas le plan d’une ville réelle.</p><p>Les travaux du pays rallument le parvis. Continue ensuite à développer ton refuge, entraîner tes compagnons et protéger les environs.</p><div className="world-actions"><button className="world-primary" onClick={()=>{setPanel(null);scene.current?.inspectLandmark();}}>Admirer le monument</button><button onClick={()=>setPanel('story')}>Les travaux du pays</button></div><a href={HERITAGE[country.id].source} target="_blank" rel="noreferrer">Découvrir le lieu réel ↗</a></div>}
   {panel==='cafe'&&<div className="paris-journal"><span className="world-kicker">LA TERRASSE DES VOYAGEURS</span><h3>Préparer la prochaine sortie</h3><p>Un panier du quartier contient trois provisions. Chaque expédition en consomme une.</p><p>Tu possèdes <strong>{save.shards} éclats</strong>.</p><button className="world-primary" disabled={save.shards<franceDistrictState(save.adventure.frontier.france).basketPrice} onClick={()=>{if(act({type:'provisions'}))announce('Panier préparé · +3 provisions · −'+franceDistrictState(save.adventure.frontier.france).basketPrice+' éclats');}}>Acheter 3 provisions · {franceDistrictState(save.adventure.frontier.france).basketPrice} éclats</button><p>À court de provisions et d’éclats ? Le refuge conserve une solution de secours gratuite.</p><button onClick={()=>navigateTo('france:camp')}>Repérer le refuge</button></div>}
   {panel==='paris'&&<ParisJournal save={save} residentId={franceResident} act={act} onNavigate={navigateTo} onPanel={setPanel}/>}
   {panel==='camp'&&<FrontierPanel save={save} act={act} onNavigate={navigateTo}/>}
   {panel==='arena'&&<ArenaPage onExit={closePanel} onAccount={()=>goTo('member')}/>}
   {panel==='avatar'&&<AvatarPanel key={uid||'guest'} uid={uid||null} save={save} act={act} onDone={finishAvatarReveal}/>} 
   {panel==='collection'&&<Companions save={save} act={act}/>}
   {panel==='encounter'&&<AdventureEncounter save={save} act={act} onClose={finishEncounter} Art={Art}/>}
   {panel==='story'&&<StoryPanel save={save} act={act} onNavigate={navigateTo} onClose={closePanel}/>}
   {panel==='sanctuary'&&<Sanctuary save={save} act={act} onClose={closePanel} onNavigate={navigateTo}/>}
   {panel==='wardrobe'&&<Wardrobe save={save} act={act}/>}
   {panel==='team'&&<><p>Un compagnon principal et trois alliés. Leurs aptitudes renforcent ton personnage. Un seul gardien de l’Union peut rejoindre ce groupe.</p><div className="world-team-grid">{[save.leader,...save.team].map((id,i)=><div key={id}><span className="world-kicker">{i===0?'COMPAGNON PRINCIPAL':'ALLIÉ '+i}</span><Card card={cardById[id]} owned onClick={()=>setPanel('collection')}/><p>{cardById[id].trait}</p>{i>0&&<button onClick={()=>act({type:'equip',id})}>Retirer</button>}</div>)}{save.team.length<3&&<button className="world-team-empty" onClick={()=>setPanel('collection')}>＋<strong>Ajouter un Allié</strong><span>Gagne sa confiance puis invite-le dans ton groupe.</span></button>}</div><div className="world-stat-row"><span>Niveau <b>{levelFor(save.xp)}</b></span><span>XP monde <b>{save.xp}</b></span><span>Éclats <b>{save.shards}</b></span><span>Vitalité <b>{stats.health}</b></span><span>Frappe <b>{stats.attack+stats.affinity}</b></span><span>Garde <b>2 soins de {stats.heal+9} par rencontre</b></span></div><h3>Pouvoirs et objets actifs</h3>{resonances.length>0&&<section className="world-rule world-resonance-picker"><strong>Résonances de Gardiens · {resonances.length}/8</strong><p>Choisis l’enseignement que Kaïs emporte dans la prochaine rencontre. Une Résonance n’est pas une valeur possédée : c’est une technique transmise par un Gardien libéré.</p><div className="world-actions">{resonances.map(item=><button key={item.region} aria-pressed={save.adventure.resonance===item.region} className={save.adventure.resonance===item.region?'world-primary':''} onClick={()=>act({type:'resonanceSelect',region:item.region})}><strong>{item.name}</strong><small>{item.guardian} · {item.value}</small></button>)}{save.adventure.resonance&&<button onClick={()=>act({type:'resonanceSelect',region:null})}>Aucune Résonance</button>}</div><small>Combat temps réel : une charge par rencontre. Hors combat, la Résonance sélectionnée apparaît seulement dans les situations compatibles ; elle aide à lire ou stabiliser l’action sans valider l’objectif ni donner de récompense.</small></section>}<div className="world-equipment">{['terrain','ambiance','fragment','pierre','support','energy'].map(slot=><div key={slot}><small>{TALENT_NAMES[slot]||slot}</small><strong>{cardById[save.loadout[slot]]?.name||'Emplacement libre'}</strong>{save.loadout[slot]&&<button aria-label={'Déséquiper '+slot} onClick={()=>act({type:'equip',id:save.loadout[slot]})}><X size={15}/></button>}</div>)}<div><small>Pièges</small><strong>{save.loadout.traps.length} / 3 équipés</strong></div></div><button className="world-primary" onClick={()=>setPanel('collection')}>Rencontrer et préparer mes compagnons</button></>}
   {panel==='atlas'&&<>{country&&<section className="expedition-progress"><h3>De la ville à la campagne</h3><p>Retrouve les deux carnets du pays : chaque découverte apporte 25 XP monde et 6 éclats, une seule fois.</p><div>{['city','rural'].map(key=><button key={key} onClick={()=>navigateTo(snapshot.region+':survey:'+key)}>{save.adventure.discoveries.includes(snapshot.region+':'+key)?'✓ ':'⌾ '}{REGIONS[snapshot.region][key]}<small>{save.adventure.discoveries.includes(snapshot.region+':'+key)?'Lieu découvert':'Placer un repère'}</small></button>)}</div></section>}<WorldMap region={snapshot.region} items={regionItems} position={snapshot.position} cartography={snapshot.cartography} route={snapshot.route} waypoint={snapshot.waypoint} heading={snapshot.heading} level={snapshot.towerFloor} onSelect={navigate}/><div className="world-atlas-grid">{(country?[{id:'hub',name:'Retour à la Cité des Huit Héritages',color:'#e4cd94'},...COUNTRIES]:COUNTRIES).map(c=><button key={c.id} style={{'--country-color':c.color}} onClick={()=>{if(snapshot.region!=='hub'){if(c.id==='hub')navigate(regionItems.find(i=>i.id==='hub'));else{announce('Rejoins d’abord la porte de la Cité des Huit Héritages pour changer de pays.');navigate(regionItems.find(i=>i.id==='hub'));}}else navigate(regionItems.find(i=>i.id===c.id));}}><span>{c.symbol||'◈'}</span><div><strong>{c.name}</strong><small>{save.seals.includes(c.id)?'◆ Sceau obtenu':save.visited.includes(c.id)?'Monde découvert':'À explorer'}</small></div><ArrowUpRight size={18}/></button>)}</div>{country&&<><h3>Points d’intérêt proches</h3><div className="world-point-list">{regionItems.filter(i=>i.type!=='portal').map(i=><button key={i.id} onClick={()=>navigate(i)}>{i.type==='beacon'?'◇ ':i.type==='guardian'?'♜ ':'✦ '}{i.name}<ArrowUpRight size={15}/></button>)}</div></>}</>}
   {panel==='journal'&&<><RealmJournal save={save} onNavigate={navigate} onOpenAtlas={()=>setPanel('atlas')}/><AdventureJournal save={save} onNavigate={navigateTo} onStyle={value=>act({type:'nexusStyle',value})}/></>}
   {panel==='campaign'&&<CampaignDialog save={save} onAction={runCampaign} onContinue={()=>setPanel(null)}/>}
   {panel==='realmTravel'&&<RealmTravelPanel save={save} origin={relayOrigin} onTravel={relayTravel} onNavigate={navigate}/>}
   {panel==='gps'&&<><div className="world-outdoor-icon"><Footprints size={38}/></div><h3>Le monde vient à ta rencontre.</h3><p>Marche où tu le souhaites. Tous les 100 mètres validés, un écho apparaît dans le pays que tu explores. Arrête-toi dans un endroit sûr pour jouer la rencontre.</p><p className="world-rule">Le décor affiché est virtuel. Aucune destination réelle n’est imposée. Tes coordonnées restent sur cet appareil et ne sont ni enregistrées ni envoyées au compte ; seule la distance totale est sauvegardée. Le GPS s’arrête quand tu quittes cet écran pour une autre application.</p><div className="world-stat-row"><span>Cette sortie <b>{walkSession} m</b></span><span>Total <b>{save.walked} m</b></span><span>Échos <b>{outdoorEchoes}</b></span></div><p role="status">{gpsMessage}</p><div className="world-actions"><button className="world-primary" onClick={gps?()=>stopGPS():startGPS}>{gps?'Arrêter le GPS':'Activer le GPS'}</button>{outdoorEchoes>0&&<button onClick={()=>{if(!country){announce('Traverse d’abord la porte d’un pays. Tes échos restent disponibles pour cette sortie.');return;}if(act({type:'encounter',id:country.id+':echo:0',outdoor:true}))setPanel('encounter');}}>Je suis à l’arrêt · rencontrer un écho</button>}</div><small>Les positions imprécises, les bonds de GPS et les déplacements trop rapides ne comptent pas. Garde le navigateur ouvert pendant la marche.</small></>}
   {panel==='pause'&&<WorldSettingsPanel uid={uid} save={save} saveStatus={saveStatus} saveMessage={saveMessage} rewardMessage={rewardMessage} snapshot={snapshot} onPanel={setPanel} onResume={closePanel} onFullscreen={enterFullscreen} onCamera={()=>{scene.current?.toggleCamera();setPanel(null);}} onExit={()=>goTo('home')} onAccount={()=>goTo('member')} onSync={sync} onExport={exportSave} onImport={importSave} sound={sound} onSound={toggleSound} haptics={haptics} onHaptics={changeHaptics} soundCaptions={soundCaptions} onSoundCaptions={changeSoundCaptions} difficulty={save.adventure.difficulty} onDifficulty={value=>act({type:'difficulty',value})} quality={quality} onQuality={changeQuality} sensitivity={cameraLookSensitivity} onSensitivity={changeSensitivity} onFollow={value=>scene.current?.setCameraFollow(value)} audioMix={audioMix} onAudio={updateAudioMix} controls={controls} onControl={updateControl} onControlProfile={profile=>{setControls(saveControlBindings(controlProfile(profile)));announce('Commandes '+(profile==='default'?'réinitialisées':profile.toUpperCase()));}} companionVisible={companionVisible} onCompanion={toggleWorldCompanion}/>}
   {panel==='final'&&<div className="world-result"><Sparkles size={46}/><h3>Le monde continue à grandir.</h3><p>Le défi de l’Union est accompli. Les pays restent ouverts : aménage tes refuges, protège les environs et entraîne tes compagnons.</p><p>Continue à rencontrer les habitants et les créatures, à développer leurs pouvoirs, reconstruire la Cité et relever les défis du Monde 3B.</p><div className="world-actions"><button className="world-primary" onClick={()=>setPanel('wardrobe')}>Porter la tenue de l’Union</button></div></div>}
  </Modal>}
  {cityOpen&&<React.Suspense fallback={<div className="world-loading" role="status">Ouverture de ta ville…</div>}><City3BPortal open onClose={()=>setCityOpen(false)}/></React.Suspense>}
 </section>;
}
