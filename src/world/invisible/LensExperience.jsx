import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Camera,CameraOff,Compass,Gem,KeyRound,Move,RotateCcw,ScanLine,Settings2,ShieldCheck,Sparkles,UserRound,X} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {createLensCameraController,detectARSupport} from './xr-session.js';
import './lens.css';

const objectKey=object=>object.kind==='clue'?'clue:'+object.id:object.kind;
function ObjectSymbol({kind}){const Icon=kind==='guardian'?UserRound:kind==='chest'?KeyRound:kind==='portal'?ScanLine:kind==='clue'?Compass:Gem;return <Icon size={20}/>;}
function availableObjects(episode){return [
 {kind:'portal',id:'portal',name:'Le portail',description:'Une porte de lumière à taille humaine. Touche-la pour faire vibrer ses filaments.'},
 {kind:'guardian',id:'guardian',name:episode.guardian||'Le Gardien',description:'Une présence du royaume, debout dans le monde invisible. Approche ton regard pour observer sa silhouette.'},
 {kind:'fragment',id:episode.fragment?.id||'fragment',name:episode.fragment?.name||'Le fragment',description:'Un cristal animé flotte dans les airs. Réveille sa lumière et observe ses facettes.'},
 {kind:'chest',id:'chest',name:'Le coffre invisible',description:'Un coffre en bois et en métal apparaît dans le décor. Observe ses détails sous tous les angles.'},
 ...(episode.points||[]).map(point=>({kind:'clue',id:point.id,name:point.name,description:'Une balise du royaume apparaît ici. Touche-la pour réveiller sa lumière.'})),
 ];}

export default function LensExperience({episode,progress,onInspect=()=>{},onExit=()=>{}}){
 const account=useLoyalty(),uid=account.user?.id||'guest';
 const dialog=useRef(null),host=useRef(null),video=useRef(null),scene=useRef(null),media=useRef(null);
 const alive=useRef(false),generation=useRef(0),orientationTicket=useRef(0),orientationHandler=useRef(null),orientationTimer=useRef(null),modeRequest=useRef(0),sheetTrigger=useRef(null);
 const callbacks=useRef({onInspect,onExit}),progressRef=useRef(progress);
 callbacks.current={onInspect,onExit};progressRef.current=progress;
 const [ready,setReady]=useState(false),[fallback,setFallback]=useState(false),[mode,setMode]=useState('3d');
 const [cameraState,setCameraState]=useState('idle'),[arSupported,setARSupported]=useState(null),[xrState,setXRState]=useState({phase:'idle',placed:false});
 const [orientation,setOrientation]=useState(false),[orientationPending,setOrientationPending]=useState(false);
 const [selected,setSelected]=useState(null),[sheet,setSheet]=useState(null),[message,setMessage]=useState('Glisse pour regarder. Touche un objet pour le découvrir.'),[notice,setNotice]=useState('');
 const modeRef=useRef(mode),sheetRef=useRef(sheet);modeRef.current=mode;sheetRef.current=sheet;
 const objects=useMemo(()=>availableObjects(episode),[episode]),objectsRef=useRef(objects);objectsRef.current=objects;
 function closeSheet(){setSheet(null);requestAnimationFrame(()=>sheetTrigger.current?.isConnected&&sheetTrigger.current.focus({preventScroll:true}));}
 function openSheet(name,event){sheetTrigger.current=event.currentTarget;setSheet(current=>current===name?null:name);}
 function inspect(item){
  const found=objectsRef.current.find(object=>object.kind===item.kind&&(object.id===item.id||item.kind!=='clue'));
  if(!found)return;
  setSelected(found);scene.current?.setSelected?.(objectKey(found));setSheet(null);callbacks.current.onInspect({kind:found.kind,id:found.id});
 }
 function stopOrientation(){
  orientationTicket.current++;clearTimeout(orientationTimer.current);
  if(orientationHandler.current)window.removeEventListener('deviceorientation',orientationHandler.current);
  orientationHandler.current=null;scene.current?.stopOrientation();
  if(alive.current){setOrientation(false);setOrientationPending(false);}
 }
 function stopAll(){modeRequest.current++;stopOrientation();media.current?.stop();const stopped=scene.current?.stopAR();if(alive.current){setMode('3d');setXRState({phase:'idle',placed:false});}return stopped;}
 function exit(){stopAll();callbacks.current.onExit();}
 useEffect(()=>{
  alive.current=true;const ticket=++generation.current,previous=document.activeElement,element=dialog.current;
  setReady(false);setFallback(false);setSelected(null);setSheet(null);setMode('3d');setOrientation(false);setOrientationPending(false);setCameraState('idle');setXRState({phase:'idle',placed:false});setARSupported(null);setNotice('');
  setMessage('Glisse pour regarder. Touche un objet pour le découvrir.');
  if(!element.open){try{element.showModal();}catch{element.setAttribute('open','');}}
  element.querySelector('[data-testid="lens-exit"]')?.focus({preventScroll:true});
  media.current=createLensCameraController({
   onState:value=>{if(alive.current){setCameraState(value);if(value==='idle')setMode(current=>current==='camera'?'3d':current);}},
   onStream:stream=>{
    if(video.current)video.current.srcObject=stream;
    if(!alive.current||!stream)return;
    setMode('camera');setSelected(null);scene.current?.setSelected?.(null);setMessage('Le monde apparaît devant toi. Glisse ou active le regard avec le téléphone.');
    video.current?.play().catch(()=>{if(alive.current&&video.current?.srcObject===stream){media.current?.stop();setMode('3d');setNotice('L’aperçu caméra est indisponible. Continue en 3D.');}});
   }
  });
  detectARSupport().then(supported=>{if(alive.current&&ticket===generation.current)setARSupported(supported);});
  import('./lens-scene.js').then(({createLensScene})=>{
   if(!alive.current||ticket!==generation.current)return;
   try{
    const instance=createLensScene(host.current,{
     episode,overlayRoot:element,reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
     onInspect:item=>{if(alive.current)inspect(item);},
     onStatus:text=>{if(alive.current){setFallback(true);setNotice(text);stopAll();}},
     onXRState:state=>{
      if(!alive.current)return;
      setXRState(state);
      if(['searching','surface','placed','tracking-lost'].includes(state.phase))setMode('ar');
      if(['idle','error'].includes(state.phase))setMode(current=>current==='ar'?'3d':current);
      if(state.message)setMessage(state.message);
     }
    });
    scene.current=instance;instance.setProgress(progressRef.current);instance.setMode(modeRef.current==='3d'?'3d':'camera');instance.pause(document.hidden);setReady(true);
   }catch(error){setFallback(true);setReady(true);setNotice(error.message);}
  }).catch(()=>{if(alive.current&&ticket===generation.current){setFallback(true);setReady(true);setNotice('L’affichage 3D est indisponible sur cet appareil. La liste des objets reste accessible.');}});
  const visibility=()=>{
   if(document.hidden){stopAll();scene.current?.pause(true);setMessage('Caméra et capteurs arrêtés en arrière-plan. Réactive-les pour reprendre.');}
   else scene.current?.pause(false);
  };
  const overlaySelect=event=>{if(event.target?.closest?.('button,input,select,textarea,summary,a,[data-lens-controls]'))event.preventDefault();};
  const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(sheetRef.current)closeSheet();else exit();}};
  document.addEventListener('visibilitychange',visibility);element.addEventListener('beforexrselect',overlaySelect);element.addEventListener('keydown',escape);
  return()=>{
   alive.current=false;generation.current++;orientationTicket.current++;clearTimeout(orientationTimer.current);
   if(orientationHandler.current)window.removeEventListener('deviceorientation',orientationHandler.current);
   orientationHandler.current=null;media.current?.stop();media.current=null;scene.current?.dispose();scene.current=null;
   if(video.current)video.current.srcObject=null;
   document.removeEventListener('visibilitychange',visibility);element.removeEventListener('beforexrselect',overlaySelect);element.removeEventListener('keydown',escape);
   if(element.open)element.close?.();if(previous?.isConnected)previous.focus?.({preventScroll:true});
  };
 },[uid,episode.id]);
 useEffect(()=>{scene.current?.setProgress(progress);},[progress]);
 useEffect(()=>{scene.current?.setMode(mode==='3d'?'3d':'camera');},[mode]);
 useEffect(()=>{if(sheet)dialog.current?.querySelector('[data-testid="lens-close-sheet"]')?.focus({preventScroll:true});},[sheet]);
 async function startCamera(){
  const ticket=generation.current,stopped=stopAll(),request=modeRequest.current;setSheet(null);setNotice('');setCameraState('starting');
  try{await stopped;if(!alive.current||ticket!==generation.current||request!==modeRequest.current||document.hidden)return;await media.current?.start();}
  catch{if(alive.current&&ticket===generation.current&&request===modeRequest.current){setMode('3d');setNotice('Caméra refusée ou indisponible. La visite reste entièrement jouable en 3D.');}}
 }
 async function startAR(){
  const ticket=generation.current;stopAll();setSheet(null);setNotice('');
  try{await scene.current?.startAR();}
  catch{if(alive.current&&ticket===generation.current)setNotice('Le placement AR est indisponible ou a été refusé. Tu peux ouvrir la caméra ou continuer en 3D.');}
 }
 async function startOrientation(){
  if(orientation||orientationPending){stopOrientation();setNotice('Regard tactile activé. Glisse pour tourner.');return;}
  stopOrientation();const ticket=orientationTicket.current,lifetime=generation.current,OrientationEvent=window.DeviceOrientationEvent;setNotice('');
  if(!OrientationEvent){setNotice('Les capteurs sont indisponibles ici. Glisse pour regarder.');return;}
  setOrientationPending(true);
  try{
   if(typeof OrientationEvent.requestPermission==='function'&&await OrientationEvent.requestPermission()!=='granted')throw Error('denied');
   if(!alive.current||ticket!==orientationTicket.current||lifetime!==generation.current||document.hidden)return;
   const handler=event=>{
    if(!alive.current||ticket!==orientationTicket.current||lifetime!==generation.current)return;
    if(![event.alpha,event.beta,event.gamma].every(value=>typeof value==='number'&&Number.isFinite(value)))return;
    const received=scene.current?.setOrientation({alpha:event.alpha,beta:event.beta,gamma:event.gamma,screen:window.screen?.orientation?.angle??window.orientation??0});
    if(received!==false){clearTimeout(orientationTimer.current);setOrientation(true);setOrientationPending(false);setMessage('Tourne doucement ton téléphone pour regarder. Recentrer remet le portail devant toi.');}
   };
   orientationHandler.current=handler;window.addEventListener('deviceorientation',handler);
   orientationTimer.current=setTimeout(()=>{if(alive.current&&ticket===orientationTicket.current){stopOrientation();setNotice('Aucune mesure de mouvement reçue. Utilise le toucher ou vérifie l’autorisation des capteurs dans ton navigateur.');}},3500);
  }catch{if(alive.current&&ticket===orientationTicket.current&&lifetime===generation.current){stopOrientation();setNotice('Accès aux capteurs refusé. Glisse pour regarder.');}}
 }
 function clearSelection(){setSelected(null);scene.current?.setSelected?.(null);}
 function chooseObject(object){inspect(object);scene.current?.focus(objectKey(object));}
 function revealSelected(){if(!selected)return;if(scene.current?.activate?.(objectKey(selected))){setMessage('La lumière de '+selected.name+' se réveille.');setNotice('Sa lumière se réveille. Tu peux continuer à explorer.');}}
 const arBusy=xrState.phase==='starting',cameraBusy=cameraState==='starting',arActive=mode==='ar',sensorBusy=arBusy||cameraBusy;
 const modeLabel=arActive?(xrState.phase==='tracking-lost'?'AR · suivi du téléphone en attente':xrState.placed?'AR · monde ancré au sol':'AR · cherche un sol libre'):mode==='camera'?(orientation?'Caméra · regard avec le téléphone':'Caméra · regard tactile'):'Monde 3D';
 const hint=arActive?message:mode==='camera'?'Touche un objet. Tourne avec le téléphone ou glisse.':'Le monde est prêt. Ouvre ta caméra pour le voir dans ton décor.';
 return <dialog ref={dialog} className="lens-dialog" data-mode={mode} data-testid="lens-experience" aria-labelledby="lens-title" aria-modal="true" onCancel={event=>{event.preventDefault();if(sheetRef.current)closeSheet();else exit();}}>
  <section className="lens-stage" aria-label="Monde Invisible en plein écran">
   <video ref={video} muted playsInline className="lens-camera" aria-label="Aperçu caméra local, sans enregistrement" hidden={mode!=='camera'}/> {/* gold-master-allow: transient MediaStream preview needs a video ref; shared VideoPlayer is for saved media. */}
   <div ref={host} className="lens-canvas"/>
   {!ready&&<div className="lens-loading" role="status"><Sparkles size={30}/><span>Le monde prend forme…</span></div>}
   {fallback&&<div className="lens-fallback" aria-hidden="true"><Gem size={80} strokeWidth={1}/><span>Affichage 3D indisponible</span></div>}
  </section>
  <header className="lens-header" data-lens-controls>
   <Button data-testid="lens-exit" variant="ghost" onClick={exit} aria-label="Revenir à mon aventure"><span data-testid="lens-return-adventure"><ArrowLeft size={20}/><span>Retour</span></span></Button>
   <div className="lens-heading"><p>LE MONDE INVISIBLE</p><h2 id="lens-title">{episode.city||episode.title}</h2><span className="lens-mode-label" data-testid="lens-mode-label">{modeLabel}</span></div>
   <Button data-testid="lens-open-settings" variant="ghost" aria-label="Réglages et aide de la caméra" aria-expanded={sheet==='settings'} onClick={event=>openSheet('settings',event)}><Settings2 size={20}/></Button>
  </header>
  <div className="lens-hud" data-lens-controls>
   {notice&&<div className="lens-notice" role="status"><span>{notice}</span><Button variant="ghost" aria-label="Fermer le message" onClick={()=>setNotice('')}><X size={16}/></Button></div>}
   {selected&&!sheet?<section className="lens-inspection" aria-labelledby="lens-inspect-title" data-testid="lens-inspection"><div className="lens-inspection-heading"><ObjectSymbol kind={selected.kind}/><h3 id="lens-inspect-title">{selected.name}</h3><Button variant="ghost" onClick={clearSelection} aria-label="Fermer l’objet inspecté"><X size={17}/></Button></div><p>{selected.description}</p><Button data-testid="lens-reveal-selected" variant="ghost" disabled={fallback||!ready} onClick={revealSelected}><Sparkles size={17}/>Réveiller sa lumière</Button></section>:!sheet&&<p className="lens-hint">{hint}</p>}
   <div className="lens-world-tools" aria-label="Explorer le monde">
    <Button data-testid="lens-open-objects" variant="ghost" aria-expanded={sheet==='objects'} onClick={event=>openSheet('objects',event)}><Gem size={18}/><span>Objets</span></Button>
    <Button data-testid="lens-recenter" variant="ghost" disabled={!ready||fallback} onClick={()=>{clearSelection();scene.current?.recenter();if(arActive)scene.current?.rePlace();setMessage(arActive?'Choisis un nouvel emplacement au sol.':'Le portail est devant toi.');}}><RotateCcw size={18}/><span>{arActive?'Replacer':'Recentrer'}</span></Button>
    <Button data-testid="lens-orientation" variant="ghost" aria-pressed={orientation} disabled={!ready||fallback||arActive||sensorBusy} onClick={startOrientation}><Compass size={18}/><span>{orientationPending?'Annuler capteurs':orientation?'Regard téléphone':'Tourner avec téléphone'}</span></Button>
   </div>
   <nav className="lens-mode-buttons" aria-label="Affichage du monde">
    <Button data-testid="lens-3d" variant={mode==='3d'&&!sensorBusy?'champagne':'ghost'} aria-pressed={mode==='3d'&&!sensorBusy} onClick={()=>{stopAll();clearSelection();setSheet(null);setMessage('Glisse pour tourner. Pince pour rapprocher les objets.');setNotice('');}}><Move size={18}/><span>3D</span></Button>
    <Button data-testid="lens-camera-toggle" variant={mode==='camera'||cameraBusy?'champagne':'ghost'} aria-pressed={mode==='camera'} disabled={!ready||fallback||arBusy} onClick={cameraBusy||mode==='camera'?()=>{stopAll();setMessage('Caméra arrêtée. Continue en 3D.');}:startCamera}>{cameraBusy||mode==='camera'?<CameraOff size={19}/>:<Camera size={19}/>}<span>{cameraBusy?'Annuler':mode==='camera'?'Couper caméra':'Ouvrir ma caméra'}</span></Button>
    <Button data-testid="lens-ar-toggle" variant={arActive||arBusy?'champagne':'ghost'} aria-pressed={arActive} disabled={!ready||fallback||arSupported!==true||cameraBusy} title={arSupported===true?'Placer le monde sur le sol':'Placement AR indisponible sur ce navigateur'} onClick={arBusy||arActive?()=>{stopAll();setMessage('Placement AR arrêté.');}:startAR}><ScanLine size={18}/><span>{arBusy?'Annuler AR':arActive?'Quitter AR':'Placer en AR'}</span></Button>
   </nav>
   <p className="lens-stage-status" role="status" data-testid="lens-status">{sensorBusy?(cameraBusy?'Autorise la caméra pour faire apparaître le monde.':'Autorise le placement AR.'):arActive?message:mode==='camera'?'Décor 3D sur caméra · position non suivie':arSupported===true?'Caméra ou placement au sol disponibles':'Caméra disponible · placement AR non pris en charge ici'}</p>
  </div>
  {sheet&&<aside className="lens-sheet" data-lens-controls aria-labelledby="lens-sheet-title" data-testid={'lens-sheet-'+sheet}><div className="lens-sheet-header"><h3 id="lens-sheet-title">{sheet==='objects'?'Objets du royaume':'Caméra et réalité augmentée'}</h3><Button data-testid="lens-close-sheet" variant="ghost" aria-label="Fermer le panneau" onClick={closeSheet}><X size={20}/></Button></div><div className="lens-sheet-content">
   {sheet==='objects'?<div className="lens-object-list" role="group" aria-label="Objets du royaume">{objects.map(object=><Button data-testid={'lens-object-'+object.kind+'-'+object.id} key={object.kind+object.id} variant="ghost" aria-pressed={selected?.id===object.id&&selected?.kind===object.kind} onClick={()=>chooseObject(object)}><ObjectSymbol kind={object.kind}/><span>{object.name}</span></Button>)}</div>:<>
    <div className="lens-help-row"><Camera size={22}/><div><h4>Caméra</h4><p>Le décor réel reste visible. Les objets 3D apparaissent devant toi. Active le regard avec le téléphone pour tourner autour de toi ; glisser fonctionne aussi. Ce mode suit ton regard, sans suivre tes déplacements.</p></div></div>
    <div className="lens-help-row"><ScanLine size={22}/><div><h4>Placement au sol</h4><p>{arSupported===null?'Vérification de la compatibilité…':arSupported?'Ton navigateur propose la réalité augmentée. Appuie sur « Placer en AR », vise un sol libre, puis touche le repère pour ancrer le monde à taille réelle. « Replacer » permet de choisir un autre endroit.':'Le suivi de surface n’est pas disponible dans ce navigateur. Sur Android, essaie le navigateur Chrome à jour sur un appareil compatible AR. La caméra reste une autre façon d’explorer.'}</p></div></div>
    <div className="lens-help-row"><ShieldCheck size={22}/><div><h4>Regarde à l’arrêt</h4><p>Choisis un espace public dégagé. Aucune photo, vidéo ni position GPS n’est enregistrée ou envoyée. La caméra et les capteurs s’arrêtent à la fermeture et en arrière-plan.</p></div></div>
    <p className="lens-help-note">L’exploration visuelle est libre. Les énigmes, fragments et récompenses restent dans ton aventure.</p>
   </>}
  </div></aside>}
 </dialog>;
}
