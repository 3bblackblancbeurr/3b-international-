import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Camera,CameraOff,Compass,Gem,Move,RotateCcw,ScanLine,ShieldCheck,Sparkles,X} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {createLensCameraController,detectARSupport} from './xr-session.js';
import './lens.css';

function availableObjects(episode){return [
 {kind:'guardian',id:'guardian',name:episode.guardian||'Le Gardien',description:'Une silhouette de lumière veille sur ce royaume. Tu peux retrouver sa voix et son dialogue dans ton aventure.'},
 {kind:'fragment',id:episode.fragment?.id||'fragment',name:episode.fragment?.name||'Le fragment',description:'Un éclat du récit suspendu dans la lumière. Inspecte-le librement ; sa découverte se joue dans l’aventure.'},
 {kind:'chest',id:'chest',name:'Le coffre invisible',description:'Les trois traces de l’aventure composent sa clé. Ici, tu peux déjà observer le coffre et les objets qui l’entourent.'},
 {kind:'portal',id:'portal',name:'Le portail',description:'Une porte lumineuse relie ce royaume à ton univers 3B. Elle est visible dès le début ; son activation se joue dans l’aventure.'},
 ...(episode.points||[]).map(point=>({kind:'clue',id:point.id,name:point.name,description:point.riddle?.question||point.description,clue:point.riddle?.clue})),
 ];}

export default function LensExperience({episode,progress,onInspect=()=>{},onExit=()=>{}}){
 const account=useLoyalty(),uid=account.user?.id||'guest';
 const dialog=useRef(null),host=useRef(null),video=useRef(null),scene=useRef(null),media=useRef(null),alive=useRef(false),generation=useRef(0),orientationTicket=useRef(0),orientationHandler=useRef(null),callbacks=useRef({onInspect,onExit}),progressRef=useRef(progress);
 callbacks.current={onInspect,onExit};progressRef.current=progress;
 const [ready,setReady]=useState(false),[fallback,setFallback]=useState(false),[mode,setMode]=useState('3d'),[cameraState,setCameraState]=useState('idle'),[arSupported,setARSupported]=useState(null),[xrState,setXRState]=useState({phase:'idle',placed:false}),[orientation,setOrientation]=useState(false),[focus,setFocus]=useState('all'),[selected,setSelected]=useState(null),[message,setMessage]=useState('Glisse pour regarder autour de toi. Touche un objet pour l’inspecter.'),[notice,setNotice]=useState('');
 const objects=useMemo(()=>availableObjects(episode),[episode]),objectsRef=useRef(objects);objectsRef.current=objects;
 function inspect(item){const found=objectsRef.current.find(object=>object.kind===item.kind&&(object.id===item.id||item.kind!=='clue'));if(!found)return;setSelected(found);callbacks.current.onInspect({kind:found.kind,id:found.id});}
 function stopOrientation(){orientationTicket.current++;if(orientationHandler.current)window.removeEventListener('deviceorientation',orientationHandler.current);orientationHandler.current=null;scene.current?.stopOrientation();if(alive.current)setOrientation(false);}
 function stopAll(){stopOrientation();media.current?.stop();scene.current?.stopAR();if(alive.current){setMode('3d');setXRState({phase:'idle',placed:false});}}
 function exit(){stopAll();callbacks.current.onExit();}
 useEffect(()=>{
  alive.current=true;const ticket=++generation.current,previous=document.activeElement,element=dialog.current;
  setReady(false);setFallback(false);setSelected(null);setFocus('all');setMode('3d');setOrientation(false);setCameraState('idle');setXRState({phase:'idle',placed:false});setARSupported(null);setNotice('');setMessage('Glisse pour regarder autour de toi. Touche un objet pour l’inspecter.');
  if(!element.open){try{element.showModal();}catch{element.setAttribute('open','');}}
  element.querySelector('[data-testid="lens-exit"]')?.focus({preventScroll:true});
  media.current=createLensCameraController({onState:value=>{if(alive.current){setCameraState(value);if(value==='idle')setMode(current=>current==='camera'?'3d':current);}},onStream:stream=>{
   if(video.current)video.current.srcObject=stream;
   if(!alive.current||!stream)return;
   setMode('camera');setMessage('Regarde autour de toi. Les objets sont superposés à ta caméra, sans suivi spatial.');
   video.current?.play().catch(()=>{if(alive.current&&video.current?.srcObject===stream){media.current?.stop();setMode('3d');setNotice('L’aperçu caméra est indisponible. Continue en 3D.');}});
  }});
  detectARSupport().then(supported=>{if(alive.current&&ticket===generation.current)setARSupported(supported);});
  import('./lens-scene.js').then(({createLensScene})=>{
   if(!alive.current||ticket!==generation.current)return;
   try{
    const instance=createLensScene(host.current,{episode,overlayRoot:element,reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,onInspect:item=>{if(alive.current)inspect(item);},onStatus:text=>{if(alive.current){setFallback(true);setNotice(text);stopAll();}},onXRState:state=>{
     if(!alive.current)return;setXRState(state);if(state.phase==='searching'||state.phase==='surface'||state.phase==='placed')setMode('ar');if(state.phase==='idle'||state.phase==='error')setMode('3d');if(state.message)setMessage(state.message);
    }});
    scene.current=instance;instance.setProgress(progressRef.current);instance.pause(document.hidden);setReady(true);
   }catch(error){setFallback(true);setReady(true);setNotice(error.message);}
  }).catch(()=>{if(alive.current&&ticket===generation.current){setFallback(true);setReady(true);setNotice('L’affichage 3D est indisponible. Explore les objets depuis la liste.');}});
  const visibility=()=>{if(document.hidden){stopAll();scene.current?.pause(true);setMessage('Caméra, orientation et AR arrêtées lorsque l’application passe en arrière-plan.');}else scene.current?.pause(false);};
  const overlaySelect=event=>{if(event.target?.closest?.('button,input,select,textarea,summary,a,[data-lens-controls]'))event.preventDefault();};
  const escape=event=>{if(event.key==='Escape'){event.preventDefault();exit();}};
  document.addEventListener('visibilitychange',visibility);element.addEventListener('beforexrselect',overlaySelect);element.addEventListener('keydown',escape);
  return()=>{alive.current=false;generation.current++;orientationTicket.current++;if(orientationHandler.current)window.removeEventListener('deviceorientation',orientationHandler.current);orientationHandler.current=null;media.current?.stop();media.current=null;scene.current?.dispose();scene.current=null;if(video.current)video.current.srcObject=null;document.removeEventListener('visibilitychange',visibility);element.removeEventListener('beforexrselect',overlaySelect);element.removeEventListener('keydown',escape);if(element.open)element.close?.();if(previous?.isConnected)previous.focus?.({preventScroll:true});};
 },[uid,episode.id]);
 useEffect(()=>{scene.current?.setProgress(progress);},[progress]);
 async function startCamera(){const ticket=generation.current;stopAll();setNotice('');try{await media.current?.start();}catch{if(alive.current&&ticket===generation.current){setMode('3d');setNotice('Caméra refusée ou indisponible. La visite reste entièrement jouable en 3D.');}}}
 async function startAR(){const ticket=generation.current;stopAll();setNotice('');try{await scene.current?.startAR();}catch{if(alive.current&&ticket===generation.current)setNotice('L’AR avec suivi de surface est indisponible ou a été refusée. Continue en 3D ou avec ta caméra.');}}
 async function startOrientation(){
  if(orientation){stopOrientation();setNotice('Orientation arrêtée. Utilise le toucher pour regarder.');return;}
  stopOrientation();const ticket=orientationTicket.current,lifetime=generation.current,OrientationEvent=window.DeviceOrientationEvent;setNotice('');
  if(!OrientationEvent){setNotice('L’orientation est indisponible ici. Glisse sur la scène pour regarder.');return;}
  try{if(typeof OrientationEvent.requestPermission==='function'&&await OrientationEvent.requestPermission()!=='granted')throw Error('denied');
   if(!alive.current||ticket!==orientationTicket.current||lifetime!==generation.current||document.hidden)return;
   const handler=event=>{if(!alive.current||ticket!==orientationTicket.current||lifetime!==generation.current)return;scene.current?.setOrientation({alpha:event.alpha,beta:event.beta,gamma:event.gamma,screen:window.screen?.orientation?.angle??window.orientation??0});};
   orientationHandler.current=handler;window.addEventListener('deviceorientation',handler);setOrientation(true);setNotice('Incline ton téléphone pour regarder. Ce contrôle ne repère pas les objets dans le réel.');
  }catch{if(alive.current&&ticket===orientationTicket.current&&lifetime===generation.current)setNotice('Orientation refusée. Tu peux continuer avec le toucher.');}
 }
 function chooseView(key){setFocus(key);scene.current?.focus(key);setSelected(null);}
 const arBusy=xrState.phase==='starting',cameraBusy=cameraState==='starting',arActive=mode==='ar',sensorBusy=arBusy||cameraBusy;
 return <dialog ref={dialog} className="lens-dialog" data-mode={mode} data-testid="lens-experience" aria-labelledby="lens-title" aria-modal="true" onCancel={event=>{event.preventDefault();exit();}}>
  <header className="lens-header" data-lens-controls><div><p>3B / LENTILLE INVISIBLE</p><h2 id="lens-title">{episode.city||episode.title}</h2></div><span className="lens-mode-label">{mode==='ar'?'AR · suivi de surface':mode==='camera'?'Caméra · sans suivi spatial':'Exploration 3D'}</span><Button data-testid="lens-exit" variant="ghost" onClick={exit} aria-label="Fermer la Lentille Invisible"><X size={21} aria-hidden="true"/></Button></header>
  <div className="lens-body">
   <section className="lens-stage" aria-label="Univers 3D à explorer"><video ref={video} muted playsInline className="lens-camera" aria-label="Aperçu caméra local, sans enregistrement" hidden={mode!=='camera'}/> {/* gold-master-allow: transient MediaStream preview needs a video ref; shared VideoPlayer is for saved media. */}
    <div ref={host} className="lens-canvas"/>
    {!ready&&<div className="lens-loading" role="status"><Sparkles size={28} aria-hidden="true"/><span>Les lumières du royaume prennent forme…</span></div>}
    {fallback&&<div className="lens-fallback" aria-hidden="true"><div className="lens-fallback-ring"><Gem size={76} strokeWidth={1}/></div><span>Ton univers reste à portée de regard</span></div>}
    <div className="lens-stage-status" role="status"><ScanLine size={16} aria-hidden="true"/><span>{message}</span></div>
    <div className="lens-view-controls" data-lens-controls aria-label="Choisir une vue"><Button variant="ghost" aria-pressed={focus==='all'} onClick={()=>chooseView('all')} disabled={!ready||arActive}>L’assemblée</Button><Button variant="ghost" aria-pressed={focus==='guardian'} onClick={()=>chooseView('guardian')} disabled={!ready||arActive}>{episode.guardian||'Le Gardien'}</Button><Button variant="ghost" aria-pressed={focus==='fragment'} onClick={()=>chooseView('fragment')} disabled={!ready||arActive}>Le fragment</Button><Button variant="ghost" aria-pressed={focus==='portal'} onClick={()=>chooseView('portal')} disabled={!ready||arActive}>Le passage</Button></div>
   </section>
   <aside className="lens-sidebar" data-lens-controls>
    <div className="lens-tools"><p className="lens-kicker">CHOISIS COMMENT REGARDER</p><div className="lens-mode-buttons"><Button data-testid="lens-3d" variant={mode==='3d'?'champagne':'ghost'} onClick={()=>{stopAll();setMessage('Glisse pour regarder. Pince pour rapprocher les objets.');}}>3D à distance</Button><Button data-testid="lens-camera-toggle" variant={mode==='camera'?'champagne':'ghost'} disabled={!ready||arBusy} onClick={cameraBusy||mode==='camera'?()=>{stopAll();setMessage('Caméra arrêtée. Continue en 3D.');}:startCamera}>{cameraBusy||mode==='camera'?<CameraOff size={16} aria-hidden="true"/>:<Camera size={16} aria-hidden="true"/>}{cameraBusy?'Annuler':mode==='camera'?'Arrêter la caméra':'Voir avec ma caméra'}</Button><Button data-testid="lens-ar-toggle" variant={arActive?'champagne':'ghost'} disabled={!ready||fallback||arSupported!==true||cameraBusy} onClick={arBusy||arActive?()=>{stopAll();setMessage('AR arrêtée. Continue en 3D.');}:startAR}><ScanLine size={16} aria-hidden="true"/>{arBusy?'Annuler la demande AR':arActive?'Arrêter l’AR':'Placer sur une surface'}</Button></div><p className="lens-support">{arSupported===null?'Vérification de la compatibilité AR…':arSupported?'Ce navigateur propose l’AR immersive. La détection d’une surface sera vérifiée à l’activation.':'AR avec suivi de surface indisponible ici. La 3D et l’aperçu caméra restent accessibles.'}</p><div className="lens-adjustments"><Button data-testid="lens-recenter" variant="ghost" disabled={!ready} onClick={()=>{scene.current?.recenter();if(arActive)scene.current?.rePlace();}}><RotateCcw size={15} aria-hidden="true"/>{arActive?'Replacer':'Recentrer'}</Button><Button data-testid="lens-orientation" variant="ghost" aria-pressed={orientation} disabled={!ready||fallback||arActive||sensorBusy} onClick={startOrientation}><Compass size={15} aria-hidden="true"/>{orientation?'Arrêter l’orientation':'Activer l’orientation'}</Button></div>{notice&&<p className="lens-notice" role="status">{notice}</p>}</div>
    <div className="lens-object-list"><p className="lens-kicker">TOUCHE UN OBJET / OU CHOISIS ICI</p><div role="group" aria-label="Objets du royaume">{objects.map(object=><Button data-testid={'lens-object-'+object.kind+'-'+object.id} key={object.kind+object.id} variant="ghost" aria-pressed={selected?.id===object.id&&selected?.kind===object.kind} onClick={()=>{inspect(object);scene.current?.focus(object.kind==='clue'?'clue:'+object.id:object.kind);}}><span className={'lens-object-symbol lens-object-'+object.kind} aria-hidden="true"><Gem size={14}/></span>{object.name}</Button>)}</div></div>
    {selected&&<section className="lens-inspection" aria-labelledby="lens-inspect-title"><p className="lens-kicker">OBJET INSPECTÉ</p><h3 id="lens-inspect-title">{selected.name}</h3><p>{selected.description}</p>{selected.clue&&<details><summary>Révéler un indice facultatif</summary><p>{selected.clue}</p></details>}<Button data-testid="lens-continue" variant="ghost" onClick={()=>{callbacks.current.onInspect({kind:selected.kind,id:selected.id});exit();}}>Continuer dans mon aventure</Button></section>}
    <div className="lens-explanation"><Move size={17} aria-hidden="true"/><p>Glisse pour tourner et pince pour zoomer. Tu peux explorer tous les objets sans résoudre d’énigme.</p><ShieldCheck size={17} aria-hidden="true"/><p>Arrête-toi pour regarder. Les objets sont une fiction : aucun bâtiment ni lieu réel n’est reconnu, et aucune image n’est enregistrée. L’inspection ne donne pas de récompense.</p></div>
   </aside>
  </div>
 </dialog>;
}
