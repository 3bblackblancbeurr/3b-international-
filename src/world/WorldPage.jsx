import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Compass,Footprints,Map,Maximize,Play,Sparkles,Users,X,Download,RotateCcw,Volume2,VolumeX} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {useGameRewards} from '../loyalty/useGameRewards.js';
import {CARDS,COUNTRIES,CATEGORIES,SOURCE,cardById,countryById,cardSlot,craftPrice} from './catalog.js';
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
function Card({card,owned,onClick}){
 return <button className={'world-card'+(owned?' is-owned':'')} onClick={onClick} style={{'--country-color':countryById[card.country]?.color||'#eddbb0'}}>
  <Art card={card}/><div className="world-card-top"><span>{card.id}</span><span>{card.rarity}</span></div><div className="world-card-copy"><small>{card.category}</small><strong>{card.name}</strong><span>{owned?'◆ Dans ta collection':'◇ À découvrir'}</span></div>
 </button>;
}
function Collection({save,act,notice}){
 const[query,setQuery]=useState(''),[country,setCountry]=useState('all'),[category,setCategory]=useState('all'),[ownedOnly,setOwnedOnly]=useState(false),[page,setPage]=useState(0),[selected,setSelected]=useState(null);
 const filtered=useMemo(()=>CARDS.filter(c=>(country==='all'||c.country===country)&&(category==='all'||c.category===category)&&(!ownedOnly||save.collection[c.id])&&((c.name+' '+c.id+' '+c.power).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))),[query,country,category,ownedOnly,save.collection]);
 useEffect(()=>{setPage(0);},[query,country,category,ownedOnly]);
 if(selected){const c=cardById[selected],owned=save.collection[c.id],slot=cardSlot(c),equipped=save.leader===c.id||save.team.includes(c.id)||Object.values(save.loadout).includes(c.id)||save.loadout.traps.includes(c.id);return <div className="world-card-detail">
  <button className="world-link" onClick={()=>setSelected(null)}><ArrowLeft size={16}/> Toutes les cartes</button>
  <div className="world-card-detail-grid"><div><div className="card-model-preview"><ArenaStage cardId={c.id}/></div><Card card={c} owned={owned} onClick={()=>{}}/></div><div><span className="world-kicker">{c.id} · {c.countryName}</span><h3>{c.name}</h3><p>{c.character?c.role:c.category} · {c.rarity}{owned?' · Affinité '+owned:''}</p>
   <div className="world-rule"><strong>Dans le monde</strong><p>{explorationTrait(c)}</p></div>
   {c.character&&<div className="world-stat-row"><span>Puissance <b>{c.attack}</b></span><span>Vitalité <b>{c.health}</b></span></div>}
   {owned&&c.character&&<div className="world-actions"><button className="world-primary" disabled={save.leader===c.id} onClick={()=>{act({type:'equip',id:c.id,leader:true});notice('Leader sélectionné.');}}>{save.leader===c.id?'Leader actif':'Choisir comme Leader'}</button><button disabled={save.leader===c.id||(!save.team.includes(c.id)&&(save.team.length===3||(c.country==='3b'&&[save.leader,...save.team].some(id=>cardById[id].country==='3b'))))} onClick={()=>{act({type:'equip',id:c.id});notice('Équipe mise à jour.');}}>{save.team.includes(c.id)?'Retirer des Alliés':'Ajouter aux Alliés'}</button></div>}
   {owned&&slot&&<button className="world-primary" disabled={slot==='trap'&&!equipped&&save.loadout.traps.length===3} onClick={()=>{act({type:'equip',id:c.id});notice('Équipement mis à jour.');}}>{equipped?'Déséquiper':'Équiper cette carte'}</button>}
   {!owned&&slot&&<><p>Atelier : <b>{craftPrice(c)} éclats</b>. {save.visited.includes(c.country)||c.country==='3b'?'Assemble cette carte avec les éclats gagnés en jouant.':'Visite d’abord ce pays.'}</p><button className="world-primary" disabled={save.shards<craftPrice(c)||(!save.visited.includes(c.country)&&c.country!=='3b')} onClick={()=>{act({type:'craft',id:c.id});notice('Carte assemblée dans ta collection.');}}>Assembler · {craftPrice(c)} éclats</button></>}
   {!owned&&!slot&&<p className="world-rule">{c.category==='Carte unique'?'Bats le gardien de ce pays pour recevoir sa carte unique.':c.category==='Personnage neutre 3B'?'Récompense des paliers de 1, 3, 5 et 8 sceaux.':c.character?'Rencontre cet écho dans son pays. Les personnages rares apparaissent après deux souvenirs retrouvés.':c.category==='Mission'?'Complète les objectifs du Journal pour recevoir cette carte.':c.category==='Passeport'?'Traverse la porte de ce pays pour recevoir son Passeport.':'Bats le gardien de ce pays pour recevoir sa Porte.'}</p>}
   {ORIGINAL_ART[c.id]&&<details><summary>Voir la carte illustrée d’origine</summary><div className="world-original-full"><OriginalArt card={c} full/></div><p>Illustration du projet 3B, extraite de ta planche française. Les valeurs imprimées appartiennent au prototype visuel ; les valeurs jouables sont celles indiquées dans cette fiche.</p></details>}
   <details><summary>Règle du jeu de cartes V4</summary><p>{c.effect}</p><p>{c.condition}</p><p>Coût : {c.cost??'—'} · Puissance : {c.originalAttack??'—'} · Défense : {c.originalDefense??'—'}</p><small>{c.source}</small></details>
  </div></div></div>;}
 return <><p className="world-subtitle">{Object.keys(save.collection).length} / 368 cartes · {save.shards} éclats pour l’Atelier. Sélectionne une carte pour comprendre son rôle et l’équiper.</p>
  <div className="world-filters"><label>Rechercher<input placeholder="Nom, pouvoir ou C001…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Pays<select value={country} onChange={e=>setCountry(e.target.value)}><option value="all">Tous les pays</option>{COUNTRIES.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}<option value="3b">3B International</option></select></label><label>Catégorie<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Toutes les catégories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label className="world-check"><input type="checkbox" checked={ownedOnly} onChange={e=>setOwnedOnly(e.target.checked)}/> Mes cartes</label></div>
  <div className="world-collection">{filtered.slice(page*16,(page+1)*16).map(c=><Card key={c.id} card={c} owned={save.collection[c.id]} onClick={()=>setSelected(c.id)}/>)}</div>
  {!filtered.length&&<p>Aucune carte ne correspond à ces filtres.</p>}
  <nav className="world-pages" aria-label="Pages de collection"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Précédent</button><span>{filtered.length} cartes · page {page+1} / {Math.max(1,Math.ceil(filtered.length/16))}</span><button disabled={(page+1)*16>=filtered.length} onClick={()=>setPage(p=>p+1)}>Suivant</button></nav>
  <details><summary>Origine des cartes et adaptation</summary><p>Les 368 fiches viennent du dossier partagé « Les 8 Portes », version V4 reconstruite. Le statut d’origine de chaque fiche est conservé. Les 20 personnages français utilisent les illustrations du <a href={ART_SOURCE} target="_blank" rel="noreferrer">partage des cartes originales</a>. Les 152 autres personnages disposent d’illustrations créées pour cette adaptation à partir de leurs fiches. Les équipements conservent les emblèmes régionaux.</p><p>Le mode exploration adapte les effets pour des rencontres rapides. Le jeu de table V4 prévoit un deck de 50 cartes et une main de 7 ; ses règles sont consultables dans chaque fiche.</p></details>
 </>;
}
export default function WorldPage({goTo}){const account=useLoyalty();return account.loading?<div className="world-loading">Ouverture du Monde 3B…</div>:<WorldSession key={account.user?.id||'guest'} uid={account.user?.id} goTo={goTo}/>;}

function WorldSession({uid,goTo}){
 const[save,setSave]=useState(blankSave),[loaded,setLoaded]=useState(false),[snapshot,setSnapshot]=useState({region:'hub',position:{x:0,z:9}}),[panel,setPanel]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saveMessage,setSaveMessage]=useState('Chargement de la sauvegarde…'),[gps,setGPS]=useState(false),[gpsMessage,setGPSMessage]=useState('Le GPS est désactivé.'),[walkSession,setWalkSession]=useState(0),[sound,setSound]=useState(false);
 const [assetsLoading,setAssetsLoading]=useState(true),[quality,setQuality]=useState(()=>{try{return ['auto','fluid','detail'].includes(localStorage.getItem('3b-world-quality'))?localStorage.getItem('3b-world-quality'):'auto';}catch{return 'auto';}});
 const canvas=useRef(null),shell=useRef(null),scene=useRef(null),saveRef=useRef(save),callbacks=useRef({}),ready=useRef(false),paused=useRef(false),activity=useRef(0),rewardEngine=useRef({status:'playing'}),watch=useRef(null),tracker=useRef(createWalkTracker()),walkRef=useRef(0),audio=useRef(null),dirty=useRef(false),saveTimer=useRef(null),noticeTimer=useRef(null);
 saveRef.current=save;
 const rewardMessage=useGameRewards('world',rewardEngine,paused,ready,activity);
 const announce=useCallback(text=>{setNotice(text);clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),2400);},[]);
 const act=useCallback(command=>{try{const previous=saveRef.current,next=recordWorldAction(uid,previous,command);saveRef.current=next;setSave(next);dirty.current=true;activity.current=Date.now();audio.current?.event(command.type);scene.current?.feedback(command.type,command.action);if(next.xp>previous.xp){announce('+'+(next.xp-previous.xp)+' XP monde · +'+Math.max(0,next.shards-previous.shards)+' éclats');}return next;}catch(error){announce(error.message);return null;}},[uid,announce]);
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
 function closePanel(){if(saveRef.current.adventure.encounter)act({type:'leave'});setPanel(null);}
 function interact(item){
  if(item.type==='portal'){travel(item.id);return;}
  if(item.type==='atelier'){setPanel('avatar');return;}
  if(item.type==='survey'){const previous=saveRef.current.xp,next=act({type:'survey',id:item.id.split(':').at(-1)});if(next){announce(next.xp>previous?item.name+' · +25 XP monde · +6 éclats':'Carnet déjà complété · '+item.name);if(next.xp>previous)chime();}return;}
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
  <WorldHUD snapshot={snapshot} save={save} panel={panel} onPanel={setPanel} onInteract={()=>scene.current?.interact()} onGuide={()=>scene.current?.waypoint(snapshot.waypoint,true)} loaded={loaded&&!assetsLoading}/>
  {gps&&!panel&&<button className="play-gps" onClick={()=>setPanel('gps')} aria-label="Sortie GPS"> <Footprints size={16}/> {walkSession} m</button>}
  {snapshot.joystick&&<div className="world-joystick" style={{left:snapshot.joystick.x,top:snapshot.joystick.y}}><i style={{transform:`translate(${snapshot.joystick.dx}px,${snapshot.joystick.dy}px)`}}/></div>}
  {notice&&<div className="world-notice" role="status">{notice}</div>}
  {(!loaded||assetsLoading)&&!error&&<div className="world-loading" role="status">Préparation de ton voyage…</div>}
  {error&&<div className="world-failure" role="alert"><h2>Reprendre l’exploration</h2><p>{error}</p><button className="world-primary" onClick={()=>location.reload()}>Recharger le monde</button><button onClick={()=>goTo('home')}>Retour à l’application</button></div>}
  {panel&&<Modal kind={panel} title={({collection:'Le Codex des liens',team:'Ton équipe',atlas:'L’Atlas des huit portes',journal:'Journal d’exploration',gps:'Les échos du dehors',pause:'Une pause dans le voyage',encounter:'Un écho te rencontre',final:'L’Union retrouvée',story:'Un pays à reconstruire',wardrobe:'Ton style',avatar:'Ton personnage',arena:'L’Arène 3B'})[panel]} onClose={closePanel} wide={['collection','atlas','journal','avatar','arena'].includes(panel)}>
   {panel==='arena'&&<ArenaPage onExit={closePanel} onAccount={()=>goTo('member')}/>}
   {panel==='avatar'&&<AvatarPanel save={save} act={act} onDone={closePanel}/>}
   {panel==='collection'&&<Collection save={save} act={act} notice={announce}/>}
   {panel==='encounter'&&<AdventureEncounter save={save} act={act} onClose={closePanel} Art={Art}/>}
   {panel==='story'&&<StoryPanel save={save} act={act} onNavigate={navigateTo} onClose={closePanel}/>}
   {panel==='wardrobe'&&<Wardrobe save={save} act={act}/>}
   {panel==='team'&&<><p>Un Leader et trois Alliés. Leurs rôles se combinent. Un seul personnage neutre 3B peut faire partie de l’équipe.</p><div className="world-team-grid">{[save.leader,...save.team].map((id,i)=><div key={id}><span className="world-kicker">{i===0?'LEADER':'ALLIÉ '+i}</span><Card card={cardById[id]} owned onClick={()=>setPanel('collection')}/><p>{cardById[id].trait}</p>{i>0&&<button onClick={()=>act({type:'equip',id})}>Retirer</button>}</div>)}{save.team.length<3&&<button className="world-team-empty" onClick={()=>setPanel('collection')}>＋<strong>Ajouter un Allié</strong><span>Crée un pacte puis équipe sa carte.</span></button>}</div><div className="world-stat-row"><span>Niveau <b>{levelFor(save.xp)}</b></span><span>XP monde <b>{save.xp}</b></span><span>Éclats <b>{save.shards}</b></span><span>Vitalité <b>{stats.health}</b></span><span>Frappe <b>{stats.attack+stats.affinity}</b></span><span>Garde <b>+{stats.heal+8} vitalité</b></span></div><h3>Équipements actifs</h3><div className="world-equipment">{['terrain','ambiance','fragment','pierre','support','energy'].map(slot=><div key={slot}><small>{({energy:'Énergie',support:'Soutien'})[slot]||slot}</small><strong>{cardById[save.loadout[slot]]?.name||'Emplacement libre'}</strong>{save.loadout[slot]&&<button aria-label={'Déséquiper '+slot} onClick={()=>act({type:'equip',id:save.loadout[slot]})}><X size={15}/></button>}</div>)}<div><small>Pièges</small><strong>{save.loadout.traps.length} / 3 équipés</strong></div></div><button className="world-primary" onClick={()=>setPanel('collection')}>Ouvrir la collection et l’Atelier</button></>}
   {panel==='atlas'&&<>{country&&<section className="expedition-progress"><h3>De la ville à la campagne</h3><p>Retrouve les deux carnets du pays : chaque découverte apporte 25 XP monde et 6 éclats, une seule fois.</p><div>{['city','rural'].map(key=><button key={key} onClick={()=>navigateTo(snapshot.region+':survey:'+key)}>{save.adventure.discoveries.includes(snapshot.region+':'+key)?'✓ ':'⌾ '}{REGIONS[snapshot.region][key]}<small>{save.adventure.discoveries.includes(snapshot.region+':'+key)?'Lieu découvert':'Placer un repère'}</small></button>)}</div></section>}<WorldMap region={snapshot.region} items={regionItems} position={snapshot.position} onSelect={navigate}/><div className="world-atlas-grid">{(country?[{id:'hub',name:'Retour au Nexus',color:'#e4cd94'},...COUNTRIES]:COUNTRIES).map(c=><button key={c.id} style={{'--country-color':c.color}} onClick={()=>{if(snapshot.region!=='hub'){if(c.id==='hub')navigate(regionItems.find(i=>i.id==='hub'));else{announce('Rejoins d’abord la porte du Nexus pour changer de pays.');navigate(regionItems.find(i=>i.id==='hub'));}}else navigate(regionItems.find(i=>i.id===c.id));}}><span>{c.symbol||'◈'}</span><div><strong>{c.name}</strong><small>{save.seals.includes(c.id)?'◆ Sceau obtenu':save.visited.includes(c.id)?'Monde découvert':'À explorer'}</small></div><ArrowUpRight size={18}/></button>)}</div>{country&&<><h3>Points d’intérêt proches</h3><div className="world-point-list">{regionItems.filter(i=>i.type!=='portal').map(i=><button key={i.id} onClick={()=>navigate(i)}>{i.type==='beacon'?'◇ ':i.type==='guardian'?'♜ ':'✦ '}{i.name}<ArrowUpRight size={15}/></button>)}</div></>}</>}
   {panel==='journal'&&<AdventureJournal save={save} onNavigate={navigateTo} onStyle={value=>act({type:'nexusStyle',value})}/>}
   {panel==='gps'&&<><div className="world-outdoor-icon"><Footprints size={38}/></div><h3>Le monde vient à ta rencontre.</h3><p>Marche où tu le souhaites. Tous les 100 mètres validés, un écho apparaît dans le pays que tu explores. Arrête-toi dans un endroit sûr pour jouer la rencontre.</p><p className="world-rule">Le décor affiché est virtuel. Aucune destination réelle n’est imposée. Tes coordonnées restent sur cet appareil et ne sont ni enregistrées ni envoyées au compte ; seule la distance totale est sauvegardée. Le GPS s’arrête quand tu quittes cet écran pour une autre application.</p><div className="world-stat-row"><span>Cette sortie <b>{walkSession} m</b></span><span>Total <b>{save.walked} m</b></span><span>Échos <b>{outdoorEchoes}</b></span></div><p role="status">{gpsMessage}</p><div className="world-actions"><button className="world-primary" onClick={gps?()=>stopGPS():startGPS}>{gps?'Arrêter le GPS':'Activer le GPS'}</button>{outdoorEchoes>0&&<button onClick={()=>{if(!country){announce('Traverse d’abord la porte d’un pays. Tes échos restent disponibles pour cette sortie.');return;}if(act({type:'encounter',id:country.id+':echo:0',outdoor:true}))setPanel('encounter');}}>Je suis à l’arrêt · rencontrer un écho</button>}</div><small>Les positions imprécises, les bonds de GPS et les déplacements trop rapides ne comptent pas. Garde le navigateur ouvert pendant la marche.</small></>}
   {panel==='pause'&&<><div className="play-pause-heading"><small>LES HUIT PORTES</small><h3>Le voyage continue.</h3></div><div className="play-pause-nav"><button onClick={()=>setPanel('collection')}><BookOpen/>Collection <small>{Object.keys(save.collection).length} / 368</small></button><button onClick={()=>setPanel('team')}><Users/>Équipe</button><button onClick={()=>setPanel('arena')}><Users/>Arène en ligne</button><button onClick={()=>setPanel('atlas')}><Map/>Carte</button><button onClick={()=>setPanel('gps')}><Footprints/>Dehors</button></div><p className="world-save-status" role="status">{saveMessage}</p><p>{rewardMessage}</p>{!uid&&<p>Cette partie invitée reste sur cet appareil. La partie de ton compte possède sa propre progression synchronisée ; ta partie invitée reste disponible en te déconnectant.</p>}<p>Les XP monde renforcent ton aventure. Les XP et points de fidélité sont gagnés par le temps de jeu actif, avec les plafonds partagés de ton compte.</p><div className="world-options"><button onClick={()=>setPanel(null)}><Play size={19}/> Reprendre</button><button onClick={()=>{shell.current?.requestFullscreen?.().catch(()=>announce('Le plein écran n’est pas disponible dans ce navigateur.'));setPanel(null);}}><Maximize size={19}/> Plein écran</button><button onClick={()=>{scene.current?.toggleCamera();setPanel(null);}}><Compass size={19}/> Changer de vue</button><button onClick={()=>goTo('home')}><ArrowLeft size={19}/> Quitter le monde</button><button onClick={toggleSound}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>} Sons {sound?'activés':'désactivés'}</button><button onClick={sync}><RotateCcw size={19}/> Synchroniser</button><button onClick={exportSave}><Download size={19}/> Télécharger ma sauvegarde</button>{!uid&&<label className="world-import">Restaurer une copie invitée<input type="file" accept=".json,application/json" onChange={importSave}/></label>}<button onClick={()=>setPanel('avatar')}><Sparkles size={19}/> Personnaliser mon personnage</button><button onClick={()=>setPanel('journal')}><BookOpen size={19}/> Chapitres et Nexus</button><button onClick={()=>goTo('member')}><Users size={19}/>{uid?'Mon compte 3B':'Jouer avec mon compte 3B'}</button></div><div className="world-quality"><label htmlFor="world-difficulty">Défis des rencontres</label><select id="world-difficulty" value={save.adventure.difficulty} onChange={e=>act({type:'difficulty',value:e.target.value})}><option value="adventure">Aventure · découvrir les huit pays</option><option value="expert">Expert · adversaires plus résistants et dangereux</option></select><p>La difficulté s’applique aux prochaines rencontres. Chaque gardien vaincu en Expert offre une récompense unique.</p></div><div className="world-quality"><label htmlFor="world-quality">Qualité graphique</label><select id="world-quality" value={quality} onChange={e=>{const mode=e.target.value;setQuality(mode);scene.current?.setQuality(mode);try{localStorage.setItem('3b-world-quality',mode);}catch{}}}><option value="auto">Automatique · s’adapte à ton appareil</option><option value="fluid">Fluidité · résolution plus légère</option><option value="detail">Détails · résolution plus élevée</option></select><p>Le mode automatique ajuste la résolution pendant l’exploration. Les commandes et la vitesse restent identiques.</p></div><details><summary>Commandes et état du rendu</summary><p>Glisse à gauche pour avancer et à droite pour tourner la caméra. Un toucher court définit une destination. Clic droit pour la caméra, molette pour zoomer. Au clavier : flèches, ZQSD ou WASD ; E pour interagir ; Maj pour courir. Glisse plus loin pour courir au doigt. C change la vue.</p><p>{snapshot.fps||'—'} images/s · {snapshot.drawCalls||'—'} appels de rendu · résolution {snapshot.resolution||100} %. La performance dépend de ton appareil.</p></details><details><summary>Règles du dossier d’origine</summary>{SOURCE.rules.map(([name,text])=><p key={name}><b>{name} :</b> {text}</p>)}</details></>}
   {panel==='final'&&<div className="world-result"><Sparkles size={46}/><h3>Les huit pays vivent à nouveau.</h3><p>Tu as aidé leurs habitants, reconstruit leurs lieux et traversé l’Oubli. Leur lumière est maintenant réunie au Nexus.</p><p>Continue les rencontres, les défis experts et la collection des 368 cartes.</p><button className="world-primary" onClick={()=>setPanel('wardrobe')}>Porter la tenue de l’Union</button></div>}
  </Modal>}
 </section>;
}
