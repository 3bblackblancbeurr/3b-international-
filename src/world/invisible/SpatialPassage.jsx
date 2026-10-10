import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Orbit,X,RotateCcw,Move} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {detectARSupport} from './xr-session.js';
import {createSpatialSession} from './spatial-session.js';
import {createPassageArt} from './passage-art.js';
import {createApparitionArt} from './apparition-art.js';
export default function SpatialPassage({onBeforeOpen}){
 const host=useRef(null),hud=useRef(null),engine=useRef(null),alive=useRef(false),before=useRef(onBeforeOpen);
 before.current=onBeforeOpen;
 const [choice,setChoice]=useState('apparition'),[ready,setReady]=useState(false),[paused,setPaused]=useState(false),[animated,setAnimated]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),[sequence,setSequence]=useState('presence');
 const [support,setSupport]=useState(null),[state,setState]=useState({phase:'idle',message:'',canPlace:false}),[preview,setPreview]=useState(false);
 useEffect(()=>{alive.current=true;detectARSupport().then(value=>{if(alive.current)setSupport(value);});return()=>{alive.current=false;engine.current?.controller.stop();engine.current?.dispose();engine.current=null;};},[]);
 function setup(mode){
  engine.current?.dispose();
  const renderer=new THREE.WebGLRenderer({alpha:mode==='ar',antialias:true,stencil:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(host.current.clientWidth||320,host.current.clientHeight||420);
  renderer.setClearColor(0x080e16,mode==='ar'?0:1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  host.current.replaceChildren(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.02,10);camera.position.set(0,.01,.6);
  setReady(choice==='passage');setPaused(false);
  const art=choice==='apparition'?createApparitionArt({onReady:()=>{if(!disposed&&alive.current){setReady(true);host.current?.setAttribute('data-ready','true');}},onPhase:phase=>{if(alive.current)setSequence(phase);},onError:()=>{if(!disposed){controller?.stop();dispose();if(alive.current){setPreview(false);setState({phase:'error',message:'Le personnage n’a pas pu se charger. Vérifie ta connexion puis réessaie.',canPlace:false});}}}}):createPassageArt();art.setAnimated?.(animated);host.current.setAttribute('data-ready',choice==='passage'?'true':'false');scene.add(art.root);art.root.visible=mode==='preview';art.root.matrixAutoUpdate=false;
  const ambient=new THREE.HemisphereLight(0xbedcef,0x1c1821,.8),key=new THREE.DirectionalLight(0xffe6c5,1.7);key.position.set(.3,.6,.7);scene.add(ambient,key);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  const target=new THREE.Mesh(new THREE.RingGeometry(.009,.012,32),new THREE.MeshBasicMaterial({color:0xe4cf9e,side:THREE.DoubleSide,transparent:true,opacity:.85,depthTest:false}));target.matrixAutoUpdate=false;target.visible=false;target.renderOrder=10;scene.add(target);
  const resize=new ResizeObserver(()=>{if(renderer.xr.isPresenting)return;const w=host.current?.clientWidth,h=host.current?.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}});resize.observe(host.current);
  let disposed=false,last=0,controller,angle=0,startX=null,startAngle=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);resize.disconnect();art.dispose();target.geometry.dispose();target.material.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  function update(value){if(!alive.current)return;setState(value);if(value.phase==='idle'||value.phase==='error')dispose();}
  controller=createSpatialSession({overlayRoot:hud.current,attachSession:async session=>{renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');renderer.xr.setFramebufferScaleFactor(.85);await renderer.xr.setSession(session);return renderer.xr.getReferenceSpace();},onState:update,onPose:matrix=>{art.root.visible=!!matrix;if(matrix)art.root.matrix.fromArray(matrix);},onCandidate:matrix=>{target.visible=!!matrix;if(matrix)target.matrix.fromArray(matrix);},onLight:estimate=>{const i=estimate.primaryLightIntensity,d=estimate.primaryLightDirection;if(i&&d&&[i.x,i.y,i.z,d.x,d.y,d.z].every(Number.isFinite)){const max=Math.max(i.x,i.y,i.z,.001);key.color.setRGB(i.x/max,i.y/max,i.z/max);key.intensity=Math.max(.7,Math.min(3.5,max));key.position.set(d.x,d.y,d.z);}}});
  renderer.setAnimationLoop((time,frame)=>{if(disposed)return;try{if(mode==='ar'){if(!frame)return;controller.frame(frame);}else{if(document.hidden||time-last<33)return;last=time;art.root.matrix.makeRotationY(angle);}
   art.update(time/1000,choice==='passage'?reduced:false);renderer.render(scene,camera);
  }catch{controller.stop();if(alive.current)setState({phase:'error',message:'Le rendu s’est interrompu. Ferme puis réessaie.',canPlace:false});}});
  renderer.domElement.addEventListener('pointerdown',event=>{if(mode!=='preview')return;startX=event.clientX;startAngle=angle;renderer.domElement.setPointerCapture(event.pointerId);});
  renderer.domElement.addEventListener('pointermove',event=>{if(startX!==null)angle=startAngle+(event.clientX-startX)*.003;});
  for(const type of ['pointerup','pointercancel'])renderer.domElement.addEventListener(type,()=>{startX=null;});
  const contextLost=event=>{if(disposed)return;event.preventDefault();controller.stop();if(alive.current)setState({phase:'error',message:'Le rendu a été interrompu par le téléphone. Réessaie.',canPlace:false});};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  engine.current={controller,dispose,art};return engine.current;
 }
 async function open(){if(engine.current?.controller.active||state.phase==='starting')return;before.current();setPreview(false);try{const next=setup('ar');await next.controller.start();}catch{engine.current?.dispose();setState({phase:'error',message:'Le rendu spatial est indisponible sur cet appareil.',canPlace:false});}}
 async function showPreview(){await engine.current?.controller.stop();if(preview){engine.current?.dispose();setPreview(false);return;}before.current();setPreview(true);try{setup('preview');}catch{setPreview(false);setState({phase:'error',message:'L’aperçu 3D est indisponible.',canPlace:false});}}
 const active=!['idle','error'].includes(state.phase),placed=state.phase==='placed';
 function replay(){engine.current?.art.replay?.();setPaused(false);engine.current?.art.setPaused?.(false);}
 function pause(){const value=!paused;setPaused(value);engine.current?.art.setPaused?.(value);}
 function animation(){const value=!animated;setAnimated(value);engine.current?.art.setAnimated?.(value);setPaused(false);engine.current?.art.setPaused?.(false);}
 function select(value){engine.current?.controller.stop();engine.current?.dispose();setPreview(false);setChoice(value);setReady(false);}
 const labels={apparition:'L’écho apparaît…',presence:'Une présence de lumière.',geste:'L’écho te fait un signe.',deplacement:'Un pas dans ton espace.',disparition:'L’écho se dissipe…',terminee:'L’écho s’est dissipé. Relance son apparition.'};
 function controls(){return <div className="hidden-echo-controls"><Button variant="neutral" onClick={replay} disabled={!ready}>Relancer</Button><Button variant="ghost" onClick={pause} disabled={!ready||!animated} aria-pressed={paused}>{paused?'Reprendre':'Pause'}</Button><Button variant="ghost" onClick={animation} disabled={!ready} aria-pressed={animated}>{animated?'Animations activées':'Animations arrêtées'}</Button></div>;}
 return <section className="hidden-passage" aria-labelledby="hidden-passage-title"><div className="hidden-passage-intro"><p className="hidden-eyebrow">UNE PRÉSENCE DANS TON ESPACE</p><h3 id="hidden-passage-title">L’invisible prend vie.</h3><p>Choisis une apparition animée ou un passage. Place ta scène dans la pièce, puis bouge pour en découvrir le volume.</p></div>
 <div className="hidden-scene-choices" role="group" aria-label="Scène à révéler"><button disabled={active} aria-pressed={choice==='apparition'} onClick={()=>select('apparition')}>Apparition animée</button><button disabled={active} aria-pressed={choice==='passage'} onClick={()=>select('passage')}>Passage 3D</button></div><div className="hidden-passage-actions"><Button onClick={open} disabled={active||support===null}><Orbit size={18}/>{support===null?'Vérification du téléphone…':choice==='apparition'?'Révéler l’apparition':'Révéler le passage'}</Button><Button variant="ghost" onClick={showPreview} disabled={active}>{preview?'Fermer la visite 3D':choice==='apparition'?'Découvrir l’apparition en 3D':'Découvrir le passage en 3D'}</Button></div>
 {support===false&&<p className="hidden-caption">Le suivi spatial n’est pas disponible dans ce navigateur. Essaie <a href="https://3b-international.vercel.app/?invisibleView=scanner#monde-invisible" target="_blank" rel="noopener noreferrer">3B dans Chrome sur Android</a>. Le téléphone doit prendre en charge la réalité augmentée.</p>}
 <div ref={host} className={'hidden-passage-stage '+(preview?'is-preview':'')+(active?' is-spatial':'')} role={preview?'img':undefined} aria-label={preview?choice==='apparition'?'Apparition humaine animée en lumière bleue':'Visite 3D du passage avec cadre en relief et monde intérieur':undefined}/>
 {preview&&<><p role="status" className="hidden-echo-status">{!ready?'Chargement de la scène…':choice==='apparition'?labels[sequence]:'Le passage est prêt.'}</p>{choice==='apparition'&&controls()}<p className="hidden-caption">Visite 3D sans caméra. Glisse pour regarder sous un autre angle. Le bouton « Révéler » ouvre le placement dans ta pièce.</p></>}
 {state.message&&!active&&<p role="status" className="hidden-inline-status">{state.message}</p>}
 <div ref={hud} className={'hidden-spatial-hud '+(active?'is-active':'')}><header><span>3B / {choice==='apparition'?'L’APPARITION':'LE PASSAGE'}</span><button aria-label="Fermer le passage" onClick={()=>engine.current?.controller.stop()}><X size={24}/></button></header><div className="hidden-spatial-hud-bottom"><p role="status">{placed&&choice==='apparition'?ready?labels[sequence]:'L’apparition se prépare…':state.message}</p><div><Button disabled={!state.canPlace||!ready} onClick={()=>{replay();engine.current?.controller.requestPlacement();}}><Move size={18}/>{state.surface?'Placer ici':'Placer devant moi'}</Button><Button variant="neutral" onClick={()=>{replay();engine.current?.controller.rePlace();}} disabled={state.phase==='starting'}><RotateCcw size={18}/>Replacer</Button></div>{placed&&choice==='apparition'&&controls()}<small>Scène de 36 cm · placement libre à 55 cm · aucune énigme</small></div></div>
 <p className="hidden-caption">Les dessins et lieux précis ne sont pas encore publiés. Le placement reste valable pendant cette ouverture. Aucune photo, aucun GPS ni micro demandé par 3B.</p>
 </section>;
}
