import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Orbit,X,RotateCcw,Move} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {detectARSupport} from './xr-session.js';
import {createSpatialSession} from './spatial-session.js';
import {createPassageArt} from './passage-art.js';
export default function SpatialPassage({onBeforeOpen}){
 const host=useRef(null),hud=useRef(null),engine=useRef(null),alive=useRef(false),before=useRef(onBeforeOpen);
 before.current=onBeforeOpen;
 const [support,setSupport]=useState(null),[state,setState]=useState({phase:'idle',message:'',canPlace:false}),[preview,setPreview]=useState(false);
 useEffect(()=>{alive.current=true;detectARSupport().then(value=>{if(alive.current)setSupport(value);});return()=>{alive.current=false;engine.current?.controller.stop();engine.current?.dispose();engine.current=null;};},[]);
 function setup(mode){
  engine.current?.dispose();
  const renderer=new THREE.WebGLRenderer({alpha:mode==='ar',antialias:true,stencil:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(host.current.clientWidth||320,host.current.clientHeight||420);
  renderer.setClearColor(0x080e16,mode==='ar'?0:1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  host.current.replaceChildren(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.02,10);camera.position.set(0,.01,.6);
  const art=createPassageArt();scene.add(art.root);art.root.visible=mode==='preview';art.root.matrixAutoUpdate=false;
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
   art.update(time/1000,reduced);renderer.render(scene,camera);
  }catch{controller.stop();if(alive.current)setState({phase:'error',message:'Le rendu s’est interrompu. Ferme puis réessaie.',canPlace:false});}});
  renderer.domElement.addEventListener('pointerdown',event=>{if(mode!=='preview')return;startX=event.clientX;startAngle=angle;renderer.domElement.setPointerCapture(event.pointerId);});
  renderer.domElement.addEventListener('pointermove',event=>{if(startX!==null)angle=startAngle+(event.clientX-startX)*.003;});
  for(const type of ['pointerup','pointercancel'])renderer.domElement.addEventListener(type,()=>{startX=null;});
  const contextLost=event=>{if(disposed)return;event.preventDefault();controller.stop();if(alive.current)setState({phase:'error',message:'Le rendu a été interrompu par le téléphone. Réessaie.',canPlace:false});};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  engine.current={controller,dispose};return engine.current;
 }
 async function open(){if(engine.current?.controller.active||state.phase==='starting')return;before.current();setPreview(false);try{const next=setup('ar');await next.controller.start();}catch{engine.current?.dispose();setState({phase:'error',message:'Le rendu spatial est indisponible sur cet appareil.',canPlace:false});}}
 async function showPreview(){await engine.current?.controller.stop();if(preview){engine.current?.dispose();setPreview(false);return;}before.current();setPreview(true);try{setup('preview');}catch{setPreview(false);setState({phase:'error',message:'L’aperçu 3D est indisponible.',canPlace:false});}}
 const active=!['idle','error'].includes(state.phase);
 return <section className="hidden-passage" aria-labelledby="hidden-passage-title"><div className="hidden-passage-intro"><p className="hidden-eyebrow">UNE PORTE VERS L’INVISIBLE</p><h3 id="hidden-passage-title">Un passage dans le lieu réel.</h3><p>Un cadre en relief. Un monde en profondeur. Place le passage, puis déplace-toi pour regarder à travers.</p></div>
 <div className="hidden-passage-actions"><Button onClick={open} disabled={active||support===null}><Orbit size={18}/>{support===null?'Vérification du téléphone…':'Révéler le passage'}</Button><Button variant="ghost" onClick={showPreview} disabled={active}>{preview?'Fermer la visite 3D':'Découvrir le passage en 3D'}</Button></div>
 {support===false&&<p className="hidden-caption">Le suivi spatial n’est pas disponible dans ce navigateur. Essaie <a href="https://3b-international.vercel.app/?invisibleView=scanner#monde-invisible" target="_blank" rel="noopener noreferrer">3B dans Chrome sur Android</a>. Le téléphone doit prendre en charge la réalité augmentée.</p>}
 <div ref={host} className={'hidden-passage-stage '+(preview?'is-preview':'')+(active?' is-spatial':'')} role={preview?'img':undefined} aria-label={preview?'Visite 3D du passage avec cadre en relief et monde intérieur':undefined}/>
 {preview&&<p className="hidden-caption">Visite 3D sans caméra. Glisse pour regarder le cadre et le monde derrière. Le placement dans ta pièce utilise le bouton « Révéler le passage ».</p>}
 {state.message&&!active&&<p role="status" className="hidden-inline-status">{state.message}</p>}
 <div ref={hud} className={'hidden-spatial-hud '+(active?'is-active':'')}><header><span>3B / LE PASSAGE</span><button aria-label="Fermer le passage" onClick={()=>engine.current?.controller.stop()}><X size={24}/></button></header><div className="hidden-spatial-hud-bottom"><p role="status">{state.message}</p><div><Button disabled={!state.canPlace} onClick={()=>engine.current?.controller.requestPlacement()}><Move size={18}/>{state.surface?'Placer ici':'Placer devant moi'}</Button><Button variant="neutral" onClick={()=>engine.current?.controller.rePlace()} disabled={state.phase==='starting'}><RotateCcw size={18}/>Replacer</Button></div><small>Passage de 36 cm · placement libre à 55 cm · aucune énigme</small></div></div>
 <p className="hidden-caption">Les dessins et lieux précis ne sont pas encore publiés. Le placement reste valable pendant cette ouverture. Aucune photo, aucun GPS ni micro demandé par 3B.</p>
 </section>;
}
