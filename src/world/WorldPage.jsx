import {FrontierPanel} from './FrontierPanel.jsx';
import {combatCue} from './combat-effects.js';
import {HERITAGE} from './heritage.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Compass,Footprints,Map,Maximize,Play,Sparkles,Users,X,Download,RotateCcw,Volume2,VolumeX} from 'lucide-react';
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
import {landscapeItems} from './terrain.js';
import './immersion.css';
import ArenaPage from '../arena/ArenaPage.jsx';
import {ArenaStage} from '../arena/ArenaStage.jsx';
import './exploration.css';
import {REGIONS} from './settlements.js';
import {Companions,CompanionRow,Sanctuary,TALENT_NAMES} from './Companions.jsx';
import './companions.css';
import './audit.css';
import {AvatarPanel} from './AvatarPanel.jsx';

function Modal({title,onClose,children,wide=false,kind}){
 const ref=useRef(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement;dialog.showModal();return()=>{dialog.close();previous?.focus?.({preventScroll:true});};},[]);
 return <dialog ref={ref} className={'world-dialog'+(wide?' world-dialog-wide':'')+' world-dialog-'+kind} onCancel={e=>{e.preventDefault();onClose();}} aria-label={title}>
  <header><div><span className="world-kicker">3B WORLD · LES 8 PORTES</span><h2>{title}</h2></div><button aria-label="Fermer" className="world-icon" onClick={onClose}><X size={20}/></button></header>
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
export default function WorldPage({goTo}){const account=useLoyalty();return account.loading?<div className="world-loading">Ouverture du Monde 3B…</div>:<WorldSession key={account.user?.id||'guest'} uid={account.user?.id} goTo={goTo}/>;}

function WorldSession({uid,goTo}){
 const[save,setSave]=useState(blankSave),[loaded,setLoaded]=useState(false),[snapshot,setSnapshot]=useState({region:'hub',position:{x:0,z:9}}),[panel,setPanel]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saveMessage,setSaveMessage]=useState('Chargement de la sauvegarde…'),[gps,setGPS]=useState(false),[gpsMessage,setGPSMessage]=useState('Le GPS est désactivé.'),[walkSession,setWalkSession]=useState(0),[sound,setSound]=useState(false);
 const [assetsLoading,setAssetsLoading]=useState(true),[quality,setQuality]=useState(()=>{try{return ['auto','fluid','detail'].includes(localStorage.getItem('3b-world-quality'))?localStorage.getItem('3b-world-quality'):'auto';}catch{return 'auto';}});
 const [combatImpact,setCombatImpact]=useState(null);
 const canvas=useRef(null),shell=useRef(null),scene=useRef(null),saveRef=useRef(save),callbacks=useRef({}),ready=useRef(false),paused=useRef(false),activity=useRef(0),rewardEngine=useRef({status:'playing'}),watch=useRef(null),tracker=useRef(createWalkTracker()),walkRef=useRef(0),audio=useRef(null),dirty=useRef(false),saveTimer=useRef(null),noticeTimer=useRef(null);
 saveRef.current=save;
 const rewardMessage=useGameRewards('world',rewardEngine,paused,ready,activity);
 const announce=useCallback(text=>{setNotice(text);clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),2400);},[]);
 const act=useCallback(command=>{try{const previous=saveRef.current,next=recordWorldAction(uid,previous,command);saveRef.current=next;setSave(next);dirty.current=true;activity.current=Date.now();audio.current?.event(command.type);scene.current?.feedback(command.type,command.action,previous,next);if(command.type==='battle'){const cue=combatCue(previous.adventure.encounter,next.adventure.encounter,command.action,next.adventure.avatar);if(cue)setCombatImpact({...cue,key:next.adventure.encounter.turn});}else if(['leave','visit','patrol','encounter'].includes(command.type))setCombatImpact(null);if(['restore','solve'].includes(command.type)&&(next.adventure.chapters[next.region]?.restored||0)>(previous.adventure.chapters[previous.region]?.restored||0))setPanel(null);if(next.xp>previous.xp){announce('+'+(next.xp-previous.xp)+' XP monde · +'+Math.max(0,next.shards-previous.shards)+' éclats');}return next;}catch(error){announce(error.message);return null;}},[uid,announce]);
 function chime(){audio.current?.event('reward');}
 function toggleSound(){const next=!sound;if(!audio.current)audio.current=createWorldAudio();audio.current.enable(next,saveRef.current.region);setSound(next);}
 async function sync(){if(!loaded)return;dirty.current=false;const result=await saveWorld(uid,saveRef.current);if(result.pending)dirty.current=true;setSaveMessage(result.message);if(result.data){if(result.data.region!==saveRef.current.region)scene.current?.travel(result.data.region);saveRef.current=result.data;setSave(result.data);}}
 function stopGPS(message='Le GPS est désactivé.') {if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);watch.current=null;tracker.current.reset();setGPS(false);setGPSMessage(message);}
 function startGPS(){
  if(!navigator.geolocation){setGPSMessage('Ce navigateur ne propose pas le GPS. Le monde virtuel reste disponible.');return;}
  stopGPS('Recherche du signal GPS…');setGPS(true);
  watch.current=navigator.geolocation.watchPosition(position=>{
   const result=tracker.current.accept(position);setGPSMessage(result.status);
   if(result.metres>0){activity.current=Date.now();const previous=walkRef.current;walkRef.current+=result.metres;setWalkSession(Math.floor(walkRef.current));if(Math.floor(walkRef.current/100)>Math.floor(previous/100)){announce('Tes pas ont révélé un écho. Arrête-toi pour le rencontrer.');}act({type:'walk',metres:Math.min(200,Math.max(1,Math.round(result.metres)))});}
  },e=>{if(e.code===1)stopGPS('Permission refusée. Tu peux l’autoriser dans les réglages du navigateur puis réessayer.');else setGPSMessage(e.code===3?'Signal trop lent · attends un endroit dégagé.':'GPS indisponible pour le moment.');},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 }
 function travel(id){if(!act({type:'visit',region:id}))return;scene.current?.travel(id);audio.current?.region(id);setPanel(null);chime();}
 function finishEncounter(){const e=saveRef.current.adventure.encounter;if(e){if(!act({type:'leave'}))return;if(!e.result){scene.current?.retreat(e);announce('Repli · aucune récompense, ton groupe est conservé');}}setPanel(null);}
 function closePanel(){const e=saveRef.current.adventure.encounter;if(e){if(['victory','recruited','missed','defeat'].includes(e.result)){finishEncounter();return;}setPanel(panel==='encounterPause'?'encounter':'encounterPause');return;}setPanel(null);}
 function interact(item){
  if(item.type==='portal'){travel(item.id);return;}
  if(item.type==='vista'){announce(item.name+' · explore les rues et les alentours librement.');return;}
  if(item.type==='landmark'){setPanel('heritage');return;}
  if(item.type==='camp'){setPanel('camp');return;}
  if(item.type==='resource'){const next=act({type:'gather',resource:item.resource});if(next){const labels={wood:'bois',stone:'pierre',food:'provisions'};announce('Récolte ajoutée · '+labels[item.resource]);}return;}
  if(item.type==='patrol'){if(act({type:'patrol'}))setPanel('encounter');return;}
  if(item.type==='atelier'){setPanel('avatar');return;}
  if(item.type==='survey'){const previous=saveRef.current.xp,next=act({type:'survey',id:item.id.split(':').at(-1)});if(next){announce(next.xp>previous?item.name+' · +25 XP monde · +6 éclats':'Carnet déjà complété · '+item.name);if(next.xp>previous)chime();}return;}
  if(item.type==='sanctuary'){setPanel('sanctuary');return;}
  if(item.type==='story'){setPanel('story');return;}
  if(item.type==='final'){if(saveRef.current.adventure.finished){setPanel('final');return;}if(act({type:'final'}))setPanel('encounter');return;}
  if(item.type==='beacon'){if(act({type:'beacon',id:item.id}))chime();return;}
  if(act({type:'encounter',id:item.id})){scene.current?.cooldown(item.id);setPanel('encounter');}
 }
 callbacks.current={interact,step:region=>audio.current?.step(region)};
 useEffect(()=>{let live=true;loadWorld(uid).then(result=>{if(!live)return;setSave(result.data);saveRef.current=result.data;dirty.current=!!result.needsSave;setSaveMessage(result.message);setLoaded(true);if(result.data.adventure.encounter)setPanel('encounter');else if(!result.data.adventure.avatar.created)setPanel('avatar');});return()=>{live=false;};},[uid]);
 useEffect(()=>{
  if(!loaded)return;
  try{scene.current=createWorldScene(canvas.current,{save:saveRef.current,onSnapshot:setSnapshot,onLoadState:setAssetsLoading,onInteract:item=>callbacks.current.interact(item),onActivity:()=>{activity.current=Date.now();},onStep:region=>callbacks.current.step(region),onError:setError});scene.current.setQuality(quality);ready.current=true;}
  catch{setError('Le navigateur n’a pas pu ouvrir la 3D. Active l’accélération graphique ou essaie un autre navigateur. Ta sauvegarde est conservée.');}
  return()=>{ready.current=false;scene.current?.destroy();scene.current=null;};
 },[loaded]);
 useEffect(()=>{if(panel!=='encounter')setCombatImpact(null);},[panel]);
 useEffect(()=>{paused.current=(!!panel&&!['encounter','gps'].includes(panel))||!!error;scene.current?.setPaused(!!panel||!!error);scene.current?.setPresentation(panel);},[panel,error,loaded]);
 useEffect(()=>{scene.current?.setSave(save);if(!loaded||!dirty.current)return;clearTimeout(saveTimer.current);saveTimer.current=setTimeout(sync,1200);return()=>clearTimeout(saveTimer.current);},[save,loaded]);
 useEffect(()=>{
  const hidden=()=>{audio.current?.visibility(document.hidden);if(document.hidden){stopGPS('GPS arrêté en arrière-plan. Réactive-le pour une nouvelle sortie.');if(dirty.current)saveWorld(uid,saveRef.current);} };
  document.addEventListener('visibilitychange',hidden);
  const timer=setInterval(()=>{if(ready.current&&dirty.current)sync();},20000);
  return()=>{document.removeEventListener('visibilitychange',hidden);clearInterval(timer);clearTimeout(noticeTimer.current);clearTimeout(saveTimer.current);if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);if(dirty.current)saveWorld(uid,saveRef.current);audio.current?.close();};
 },[uid,loaded]);
 const country=countryById[snapshot.region],stats=useMemo(()=>teamStats(save),[save]),regionItems=useMemo(()=>landscapeItems(snapshot.region,save),[snapshot.region,save]),outdoorEchoes=save.adventure.outdoorCredits;
 function navigateTo(id){const item=regionItems.find(i=>i.id===id);if(item)navigate(item);}
 function navigate(item){scene.current?.waypoint(item,false);setPanel(null);}
 function exportSave(){const blob=new Blob([JSON.stringify(saveRef.current,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='3b-monde-sauvegarde.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function importSave(event){const file=event.target.files?.[0];if(!file)return;try{if(file.size>300000)throw Error();const raw=JSON.parse(await file.text());if(raw.version!==1||!raw.collection)throw Error();if(uid){announce('Les comptes restaurent leur progression depuis le serveur. Ta copie peut être utilisée en mode invité.');return;}const restored=normalizeSave(raw);setSave(restored);saveRef.current=restored;scene.current?.setSave(restored);writeLocal(null,restored);dirty.current=true;scene.current?.travel(restored.region);announce('Ta copie de sauvegarde a été restaurée.');}catch{announce('Ce fichier n’est pas une sauvegarde du Monde 3B valide.');}event.target.value='';}
 return <section ref={shell} className="world-shell" aria-label="Le Monde du 3B">
  <canvas ref={canvas} className="world-canvas" tabIndex={0} aria-label="Monde 3D. Glisse à gauche pour avancer, à droite pour tourner la caméra. Flèches ou ZQSD, E pour interagir."/>
  <div className="world-vignette"/>
  {panel==='encounter'&&snapshot.combat&&combatImpact&&<div className="combat-impact-layer" aria-hidden="true" key={combatImpact.key}>{combatImpact.outgoing>0&&<b className="impact-enemy" style={{left:snapshot.combat.enemy.x+'%',top:snapshot.combat.enemy.y+'%'}}>−{combatImpact.outgoing}</b>}{(combatImpact.incoming>0||combatImpact.healing>0)&&<b className={combatImpact.healing?'impact-heal':'impact-hero'} style={{left:snapshot.combat.hero.x+'%',top:snapshot.combat.hero.y+'%'}}>{combatImpact.healing?'+'+combatImpact.healing:'−'+combatImpact.incoming}</b>}</div>}
  <WorldHUD snapshot={snapshot} save={save} panel={panel} onPanel={setPanel} onInteract={()=>scene.current?.interact()} onGuide={()=>scene.current?.waypoint(snapshot.waypoint,true)} loaded={loaded&&!assetsLoading}/>
  {snapshot.cinematic&&!panel&&<div className="play-cinematic"><div><h2>{snapshot.cinematic.title}</h2><p>{snapshot.cinematic.detail}</p></div><button onClick={()=>scene.current?.skipCinematic()}>Passer</button></div>}
  {gps&&!panel&&<button className="play-gps" onClick={()=>setPanel('gps')} aria-label="Sortie GPS"> <Footprints size={16}/> {walkSession} m</button>}
  {snapshot.joystick&&<div className="world-joystick" style={{left:snapshot.joystick.x,top:snapshot.joystick.y}}><i style={{transform:`translate(${snapshot.joystick.dx}px,${snapshot.joystick.dy}px)`}}/></div>}
  {notice&&<div className="world-notice" role="status">{notice}</div>}
  {(!loaded||assetsLoading)&&!error&&<div className="world-loading" role="status">Préparation de ton voyage…</div>}
  {error&&<div className="world-failure" role="alert"><h2>Reprendre l’exploration</h2><p>{error}</p><button className="world-primary" onClick={()=>location.reload()}>Recharger le monde</button><button onClick={()=>goTo('home')}>Retour à l’application</button></div>}
  {panel&&<Modal kind={panel} title={({heritage:'Patrimoine et monde 3B',camp:'Mon refuge',collection:'Les compagnons du monde',sanctuary:'Un lieu pour ton groupe',team:'Ton équipe',atlas:'L’Atlas des huit portes',journal:'Journal d’exploration',gps:'Les échos du dehors',pause:'Une pause dans le voyage',encounterPause:'Rencontre suspendue',encounter:'Un écho te rencontre',final:'Le monde continue',story:'Un pays à reconstruire',wardrobe:'Ton style',avatar:'Ton personnage',arena:'L’Arène 3B'})[panel]} onClose={closePanel} wide={['collection','atlas','journal','avatar','arena'].includes(panel)}>
   {panel==='encounterPause'&&<div className="encounter-pause"><h3>Ton groupe t’attend.</h3><p>Tu peux reprendre cette rencontre, y compris après avoir rechargé la page.</p><button className="world-primary" onClick={()=>setPanel('encounter')}>Reprendre le combat</button><button onClick={finishEncounter}>Se replier dans le monde</button><small>{save.adventure.encounter?.patrol?'La provision de cette expédition reste consommée. Tes constructions et tes compagnons sont conservés.':'Un repli ne donne aucune récompense.'}</small></div>}
   {panel==='heritage'&&country&&<div className="heritage-panel"><span className="world-kicker">{HERITAGE[country.id].city} · {country.name}</span><h3>{HERITAGE[country.id].name}</h3><p>{HERITAGE[country.id].form}</p><p>Une interprétation 3D à l’échelle du jeu. Ce pays réunit plusieurs lieux et paysages : il ne reproduit pas le plan d’une ville réelle.</p><p>Les travaux du pays rallument le parvis. Continue ensuite à développer ton refuge, entraîner tes compagnons et protéger les environs.</p><div className="world-actions"><button className="world-primary" onClick={()=>{setPanel(null);scene.current?.inspectLandmark();}}>Admirer le monument</button><button onClick={()=>setPanel('story')}>Les travaux du pays</button></div><a href={HERITAGE[country.id].source} target="_blank" rel="noreferrer">Découvrir le lieu réel ↗</a></div>}
   {panel==='camp'&&<FrontierPanel save={save} act={act} onNavigate={navigateTo}/>}
   {panel==='arena'&&<ArenaPage onExit={closePanel} onAccount={()=>goTo('member')}/>}
   {panel==='avatar'&&<AvatarPanel save={save} act={act} onDone={closePanel}/>}
   {panel==='collection'&&<Companions save={save} act={act}/>}
   {panel==='encounter'&&<AdventureEncounter save={save} act={act} onClose={finishEncounter} Art={Art}/>}
   {panel==='story'&&<StoryPanel save={save} act={act} onNavigate={navigateTo} onClose={closePanel}/>}
   {panel==='sanctuary'&&<Sanctuary save={save} act={act} onClose={closePanel} onNavigate={navigateTo}/>}
   {panel==='wardrobe'&&<Wardrobe save={save} act={act}/>}
   {panel==='team'&&<><p>Un compagnon principal et trois alliés. Leurs aptitudes renforcent ton personnage. Un seul gardien de l’Union peut rejoindre ce groupe.</p><div className="world-team-grid">{[save.leader,...save.team].map((id,i)=><div key={id}><span className="world-kicker">{i===0?'COMPAGNON PRINCIPAL':'ALLIÉ '+i}</span><Card card={cardById[id]} owned onClick={()=>setPanel('collection')}/><p>{cardById[id].trait}</p>{i>0&&<button onClick={()=>act({type:'equip',id})}>Retirer</button>}</div>)}{save.team.length<3&&<button className="world-team-empty" onClick={()=>setPanel('collection')}>＋<strong>Ajouter un Allié</strong><span>Gagne sa confiance puis invite-le dans ton groupe.</span></button>}</div><div className="world-stat-row"><span>Niveau <b>{levelFor(save.xp)}</b></span><span>XP monde <b>{save.xp}</b></span><span>Éclats <b>{save.shards}</b></span><span>Vitalité <b>{stats.health}</b></span><span>Frappe <b>{stats.attack+stats.affinity}</b></span><span>Garde <b>2 soins de {stats.heal+9} par rencontre</b></span></div><h3>Pouvoirs et objets actifs</h3><div className="world-equipment">{['terrain','ambiance','fragment','pierre','support','energy'].map(slot=><div key={slot}><small>{TALENT_NAMES[slot]||slot}</small><strong>{cardById[save.loadout[slot]]?.name||'Emplacement libre'}</strong>{save.loadout[slot]&&<button aria-label={'Déséquiper '+slot} onClick={()=>act({type:'equip',id:save.loadout[slot]})}><X size={15}/></button>}</div>)}<div><small>Pièges</small><strong>{save.loadout.traps.length} / 3 équipés</strong></div></div><button className="world-primary" onClick={()=>setPanel('collection')}>Rencontrer et préparer mes compagnons</button></>}
   {panel==='atlas'&&<>{country&&<section className="expedition-progress"><h3>De la ville à la campagne</h3><p>Retrouve les deux carnets du pays : chaque découverte apporte 25 XP monde et 6 éclats, une seule fois.</p><div>{['city','rural'].map(key=><button key={key} onClick={()=>navigateTo(snapshot.region+':survey:'+key)}>{save.adventure.discoveries.includes(snapshot.region+':'+key)?'✓ ':'⌾ '}{REGIONS[snapshot.region][key]}<small>{save.adventure.discoveries.includes(snapshot.region+':'+key)?'Lieu découvert':'Placer un repère'}</small></button>)}</div></section>}<WorldMap region={snapshot.region} items={regionItems} position={snapshot.position} onSelect={navigate}/><div className="world-atlas-grid">{(country?[{id:'hub',name:'Retour au Nexus',color:'#e4cd94'},...COUNTRIES]:COUNTRIES).map(c=><button key={c.id} style={{'--country-color':c.color}} onClick={()=>{if(snapshot.region!=='hub'){if(c.id==='hub')navigate(regionItems.find(i=>i.id==='hub'));else{announce('Rejoins d’abord la porte du Nexus pour changer de pays.');navigate(regionItems.find(i=>i.id==='hub'));}}else navigate(regionItems.find(i=>i.id===c.id));}}><span>{c.symbol||'◈'}</span><div><strong>{c.name}</strong><small>{save.seals.includes(c.id)?'◆ Sceau obtenu':save.visited.includes(c.id)?'Monde découvert':'À explorer'}</small></div><ArrowUpRight size={18}/></button>)}</div>{country&&<><h3>Points d’intérêt proches</h3><div className="world-point-list">{regionItems.filter(i=>i.type!=='portal').map(i=><button key={i.id} onClick={()=>navigate(i)}>{i.type==='beacon'?'◇ ':i.type==='guardian'?'♜ ':'✦ '}{i.name}<ArrowUpRight size={15}/></button>)}</div></>}</>}
   {panel==='journal'&&<AdventureJournal save={save} onNavigate={navigateTo} onStyle={value=>act({type:'nexusStyle',value})}/>}
   {panel==='gps'&&<><div className="world-outdoor-icon"><Footprints size={38}/></div><h3>Le monde vient à ta rencontre.</h3><p>Marche où tu le souhaites. Tous les 100 mètres validés, un écho apparaît dans le pays que tu explores. Arrête-toi dans un endroit sûr pour jouer la rencontre.</p><p className="world-rule">Le décor affiché est virtuel. Aucune destination réelle n’est imposée. Tes coordonnées restent sur cet appareil et ne sont ni enregistrées ni envoyées au compte ; seule la distance totale est sauvegardée. Le GPS s’arrête quand tu quittes cet écran pour une autre application.</p><div className="world-stat-row"><span>Cette sortie <b>{walkSession} m</b></span><span>Total <b>{save.walked} m</b></span><span>Échos <b>{outdoorEchoes}</b></span></div><p role="status">{gpsMessage}</p><div className="world-actions"><button className="world-primary" onClick={gps?()=>stopGPS():startGPS}>{gps?'Arrêter le GPS':'Activer le GPS'}</button>{outdoorEchoes>0&&<button onClick={()=>{if(!country){announce('Traverse d’abord la porte d’un pays. Tes échos restent disponibles pour cette sortie.');return;}if(act({type:'encounter',id:country.id+':echo:0',outdoor:true}))setPanel('encounter');}}>Je suis à l’arrêt · rencontrer un écho</button>}</div><small>Les positions imprécises, les bonds de GPS et les déplacements trop rapides ne comptent pas. Garde le navigateur ouvert pendant la marche.</small></>}
   {panel==='pause'&&<><div className="play-pause-heading"><small>LES HUIT PORTES</small><h3>Le voyage continue.</h3></div><div className="play-pause-nav"><button onClick={()=>setPanel('collection')}><Users/>Compagnons <small>{CHARACTERS.filter(p=>save.collection[p.id]).length} / {CHARACTERS.length}</small></button><button onClick={()=>setPanel('team')}><Users/>Équipe</button><button onClick={()=>setPanel('arena')}><Users/>Arène en ligne</button><button onClick={()=>setPanel('atlas')}><Map/>Carte</button><button onClick={()=>setPanel('gps')}><Footprints/>Dehors</button></div><p className="world-save-status" role="status">{saveMessage}</p><p>{rewardMessage}</p>{!uid&&<p>Cette partie invitée reste sur cet appareil. La partie de ton compte possède sa propre progression synchronisée ; ta partie invitée reste disponible en te déconnectant.</p>}<p>Les XP monde renforcent ton aventure. Les XP et points de fidélité sont gagnés par le temps de jeu actif, avec les plafonds partagés de ton compte.</p><div className="world-options"><button onClick={()=>setPanel(null)}><Play size={19}/> Reprendre</button><button onClick={()=>{shell.current?.requestFullscreen?.().catch(()=>announce('Le plein écran n’est pas disponible dans ce navigateur.'));setPanel(null);}}><Maximize size={19}/> Plein écran</button><button onClick={()=>{scene.current?.toggleCamera();setPanel(null);}}><Compass size={19}/> Changer de vue</button><button onClick={()=>goTo('home')}><ArrowLeft size={19}/> Quitter le monde</button><button onClick={toggleSound}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>} Sons {sound?'activés':'désactivés'}</button><button onClick={sync}><RotateCcw size={19}/> Synchroniser</button><button onClick={exportSave}><Download size={19}/> Télécharger ma sauvegarde</button>{!uid&&<label className="world-import">Restaurer une copie invitée<input type="file" accept=".json,application/json" onChange={importSave}/></label>}<button onClick={()=>setPanel('avatar')}><Sparkles size={19}/> Personnaliser mon personnage</button><button onClick={()=>setPanel('journal')}><BookOpen size={19}/> Chapitres et Nexus</button><button onClick={()=>goTo('member')}><Users size={19}/>{uid?'Mon compte 3B':'Jouer avec mon compte 3B'}</button></div><div className="world-quality"><label htmlFor="world-difficulty">Défis des rencontres</label><select id="world-difficulty" value={save.adventure.difficulty} onChange={e=>act({type:'difficulty',value:e.target.value})}><option value="adventure">Aventure · découvrir les huit pays</option><option value="expert">Expert · adversaires plus résistants et dangereux</option></select><p>La difficulté s’applique aux prochaines rencontres. Chaque gardien vaincu en Expert offre une récompense unique.</p></div><div className="world-quality"><label htmlFor="world-camera-follow">Caméra d’exploration</label><select id="world-camera-follow" value={snapshot.camera?.follow===false?'free':'follow'} onChange={e=>scene.current?.setCameraFollow(e.target.value==='follow')}><option value="follow">Suivre automatiquement mes déplacements</option><option value="free">Angle libre · orientation manuelle</option></select><p>Le regard manuel reste prioritaire. Le suivi reprend quand tu avances ; ton zoom reste identique en ville.</p></div><div className="world-quality"><label htmlFor="world-quality">Qualité graphique</label><select id="world-quality" value={quality} onChange={e=>{const mode=e.target.value;setQuality(mode);scene.current?.setQuality(mode);try{localStorage.setItem('3b-world-quality',mode);}catch{}}}><option value="auto">Automatique · s’adapte à ton appareil</option><option value="fluid">Fluidité · résolution plus légère</option><option value="detail">Détails · résolution plus élevée</option></select><p>Le mode automatique ajuste la résolution pendant l’exploration. Les commandes et la vitesse restent identiques.</p></div><details><summary>Commandes et état du rendu</summary><p>Glisse à gauche pour avancer et à droite pour tourner la caméra. Un toucher court définit une destination. Clic droit pour la caméra, molette pour zoomer. Au clavier : flèches, ZQSD ou WASD ; E pour interagir ; Maj pour courir. Glisse plus loin pour courir au doigt. C change la vue.</p><p>{snapshot.fps||'—'} images/s · {snapshot.drawCalls||'—'} appels de rendu · résolution {snapshot.resolution||100} %. La performance dépend de ton appareil.</p></details></>}
   {panel==='final'&&<div className="world-result"><Sparkles size={46}/><h3>Le monde continue à grandir.</h3><p>Le défi de l’Union est accompli. Les pays restent ouverts : aménage tes refuges, protège les environs et entraîne tes compagnons.</p><p>Continue à rencontrer les habitants et les créatures, à développer leurs pouvoirs et à relever les défis experts.</p><button className="world-primary" onClick={()=>setPanel('wardrobe')}>Porter la tenue de l’Union</button></div>}
  </Modal>}
 </section>;
}
