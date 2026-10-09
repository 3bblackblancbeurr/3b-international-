import * as THREE from 'three';
import {goldMasterTokens} from '../../design-system/tokens.js';
import {createLensAdventure} from './lens-adventure.js';
import {createXRSessionController} from './xr-session.js';
import {createLensViewController,worldPlacementMatrix} from './lens-view.js';

export function lensObjectsFor(episode){
 return [
  {kind:'guardian',id:'guardian',name:episode.guardian||'Le Gardien',description:'Une silhouette de lumière veille sur les traces de ce royaume. Approche-la du regard et retrouve son dialogue dans ton aventure.'},
  {kind:'fragment',id:episode.fragment?.id||'fragment',name:episode.fragment?.name||'Le fragment',description:'Un éclat du récit suspendu dans la lumière. L’inspecter te permet de mieux le regarder ; sa découverte se joue dans l’aventure.'},
  {kind:'chest',id:'chest',name:'Le coffre invisible',description:'Ses lignes de lumière protègent un secret. Le coffre du récit s’ouvre lorsque tu réunis ses trois traces.'},
  {kind:'portal',id:'portal',name:'La porte du royaume',description:'Une porte relie ce lieu à ton univers 3B. Tu peux l’explorer dès maintenant et l’activer dans l’aventure.'},
  ...(episode.points||[]).map(point=>({kind:'clue',id:point.id,name:point.name,description:point.riddle?.question||point.description,clue:point.riddle?.clue})),
 ];
}

export function createLensScene(host,{episode,onInspect=()=>{},onStatus=()=>{},onXRState=()=>{},overlayRoot,reducedMotion=false}={}){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{throw Error('L’affichage 3D n’est pas disponible sur cet appareil. Les objets restent consultables dans la liste.');}
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.domElement.className='lens-renderer';renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),view=new THREE.PerspectiveCamera(42,1,.03,180),anchor=new THREE.Group();
 const adventure=createLensAdventure(episode,{reducedMotion}),{content,environment,objects,realm}=adventure,palette=goldMasterTokens.colors;
 anchor.add(content);scene.add(anchor,environment);
 scene.add(new THREE.HemisphereLight(realm.sky,realm.night,1.25));
 const key=new THREE.DirectionalLight(realm.sun,2.35);key.position.set(-6,9,5);scene.add(key);
 const rimLight=new THREE.DirectionalLight(realm.sky,.8);rimLight.position.set(5,4,-6);scene.add(rimLight);
 const reticleGeometry=new THREE.RingGeometry(.1,.13,40),reticleMaterial=new THREE.MeshBasicMaterial({color:palette.matrix,side:THREE.DoubleSide});reticleGeometry.rotateX(-Math.PI/2);
 const reticle=new THREE.Mesh(reticleGeometry,reticleMaterial);scene.add(reticle);reticle.matrixAutoUpdate=false;reticle.visible=false;
 const look=createLensViewController(view);
 let alive=true,paused=false,ar=false,placed=false,trackingLost=false,focusKey='all',overlayMode='3d',lastRendered=-Infinity;
 function applyMode(){const mode=ar?'ar':overlayMode;adventure.setMode(mode);scene.background=mode==='3d'?adventure.background:null;scene.fog=mode==='3d'?new THREE.Fog(adventure.fogColor,14,62):null;}
 function overviewDistance(){return Math.max(10.2,3.95/(Math.tan(THREE.MathUtils.degToRad(view.fov/2))*view.aspect)+2.7);}
 function focus(key){focusKey=key;const group=objects.get(key),height=key==='guardian'?1.13:key==='portal'?1.5:key==='fragment'?1.17:.53;
  adventure.setSelected?.(key==='all'?null:key);if(ar)return;
  if(overlayMode==='camera'&&!group)look.recenter();else look.focus(group?group.position.clone().add(new THREE.Vector3(0,height,0)):new THREE.Vector3(0,1,0),group?(key==='portal'?5:key==='guardian'?3.2:2.6):overviewDistance());
  if(reducedMotion)render();
 }
 const raycaster=new THREE.Raycaster(),direction=new THREE.Vector3(),rayMatrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
 function inspectHits(hits){for(const hit of hits){let node=hit.object;while(node&&!node.userData.lensKey)node=node.parent;const found=node?.userData.lensKey;if(found){const item=found.startsWith('clue:')?{kind:'clue',id:found.slice(5)}:{kind:found,id:found==='fragment'?episode.fragment?.id||'fragment':found};onInspect(item);return item;}}return null;}
 function tap(clientX,clientY){if(ar)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),view);inspectHits(raycaster.intersectObjects(content.children,true));}
 const xr=createXRSessionController({overlayRoot,onReferenceReset:()=>{placed=false;trackingLost=false;content.visible=false;reticle.visible=false;},onState:state=>{
  if(!alive)return;
  if(state.phase==='idle'||state.phase==='error'){ar=false;placed=false;trackingLost=false;reticle.visible=false;anchor.matrixAutoUpdate=true;anchor.matrix.identity();anchor.position.set(0,0,0);anchor.quaternion.identity();anchor.scale.setScalar(1);content.scale.setScalar(1);content.visible=true;renderer.xr.enabled=false;look.setMode(overlayMode);applyMode();focus(focusKey);resume();}
  if(state.phase==='tracking-lost'){trackingLost=true;content.visible=false;}
  else if(trackingLost&&['surface','searching'].includes(state.phase)){trackingLost=false;content.visible=placed;if(placed){onXRState({phase:'placed',placed:true,message:'Le suivi du téléphone a repris. Le monde reste à son emplacement.'});return;}}
  if(placed&&['surface','searching'].includes(state.phase))return;
  onXRState({...state,placed});
 },attachSession:async session=>{
  ar=true;placed=false;trackingLost=false;applyMode();content.visible=false;view.position.set(0,0,0);view.quaternion.identity();renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);if(!alive||!ar||!xr.active){try{await session.end();}catch{/* The owner already closed this session. */}return null;}resume();return renderer.xr.getReferenceSpace();
 },onPose:matrix=>{reticle.visible=ar&&!!matrix&&!placed;if(matrix)reticle.matrix.fromArray(matrix);},onSelect:({pose,viewerPosition,event,referenceSpace})=>{
  if(!alive||!ar)return;
  if(!placed){if(!pose)return;anchor.matrixAutoUpdate=false;anchor.matrix.copy(worldPlacementMatrix(pose,viewerPosition));anchor.matrixWorldNeedsUpdate=true;content.scale.setScalar(1);content.visible=true;adventure.reveal?.();placed=true;reticle.visible=false;scene.updateMatrixWorld(true);onXRState({phase:'placed',placed:true,message:'Le monde est placé à taille humaine. Touche un objet pour l’inspecter.'});return;}
  try{const nativePose=event.frame?.getPose(event.inputSource?.targetRaySpace,referenceSpace);if(!nativePose)return;rayMatrix.fromArray(nativePose.transform.matrix);rayMatrix.decompose(position,rotation,scale);direction.set(0,0,-1).applyQuaternion(rotation);raycaster.set(position,direction);inspectHits(raycaster.intersectObjects(content.children,true));}catch{/* A select event without a current frame cannot inspect a spatial object. */}
 }});
 function render(time=0,frame){if(!alive||paused)return;if(!ar&&time&&time-lastRendered<1000/30)return;if(time)lastRendered=time;if(ar)xr.frame(frame);else look.apply();if(!reducedMotion)adventure.update(time*.001);scene.updateMatrixWorld();renderer.render(scene,view);}
 function resume(){if(!alive||paused)return;renderer.setAnimationLoop(reducedMotion&&!ar?null:render);if(reducedMotion&&!ar)render();}
 const resize=()=>{if(!alive)return;const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5,Math.sqrt(1800000/(width*height))));renderer.setSize(width,height,false);view.aspect=width/height;view.fov=overlayMode==='camera'?62:42;view.updateProjectionMatrix();if(!ar&&overlayMode==='3d'&&focusKey==='all')look.setDistance(overviewDistance());if(!ar)render();};const observer=new ResizeObserver(resize);observer.observe(host);
 const pointers=new Map();let pinch=0,gesture=null;
 function down(event){if(ar)return;renderer.domElement.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});gesture={x:event.clientX,y:event.clientY,time:performance.now(),moved:pointers.size>1};pinch=0;}
 function move(event){if(ar||!pointers.has(event.pointerId))return;const previous=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(gesture&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>7)gesture.moved=true;
  if(pointers.size===2){const values=[...pointers.values()],next=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);if(pinch&&next)look.zoom(pinch/next);pinch=next;}
  else look.rotate(event.clientX-previous.x,event.clientY-previous.y);if(reducedMotion)render();
 }
 function up(event){if(!pointers.has(event.pointerId))return;const single=pointers.size===1;pointers.delete(event.pointerId);if(single&&gesture&&!gesture.moved&&performance.now()-gesture.time<650)tap(event.clientX,event.clientY);gesture=null;pinch=0;}
 function cancel(event){pointers.delete(event.pointerId);gesture=null;pinch=0;}
 function wheel(event){if(ar||overlayMode==='camera')return;event.preventDefault();look.zoom(1+THREE.MathUtils.clamp(event.deltaY*.0008,-.5,.5));if(reducedMotion)render();}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
 const lost=event=>{event.preventDefault();paused=true;renderer.setAnimationLoop(null);xr.stop();onStatus('Le rendu 3D s’est interrompu. Les objets restent consultables dans la liste.');};renderer.domElement.addEventListener('webglcontextlost',lost);
 applyMode();look.apply();resize();resume();
 return {
  startAR:()=>xr.start(),stopAR:()=>xr.stop(),
  rePlace(){if(ar){placed=false;content.visible=false;reticle.visible=false;onXRState({phase:'searching',placed:false,message:'Vise un sol dégagé puis touche l’écran pour replacer ton univers.'});}},
  focus,
  setMode(mode){if(!alive)return;overlayMode=mode==='3d'?'3d':'camera';applyMode();if(!ar){look.setMode(overlayMode);focus(focusKey);resize();render();}},
  recenter(){if(!alive||ar)return;focusKey='all';look.recenter(overviewDistance());if(reducedMotion)render();},
  setOrientation(reading){if(!alive||ar)return false;const accepted=look.setOrientation(reading);if(accepted&&reducedMotion)render();return accepted;},
  stopOrientation(){if(ar)return;look.stopOrientation();if(reducedMotion)render();},
  setSelected(key){adventure.setSelected?.(key);if(reducedMotion&&!ar)render();},
  activate(key){if(!alive)return false;const activated=adventure.activate?.(key)===true;if(activated&&reducedMotion&&!ar)render();return activated;},
  setProgress(progress){if(!alive)return;adventure.setProgress(progress);if(reducedMotion&&!ar)render();},
  pause(value){paused=value;if(value){renderer.setAnimationLoop(null);pointers.clear();gesture=null;pinch=0;xr.stop();}else resume();},
  dispose(){if(!alive)return;alive=false;xr.stop();renderer.setAnimationLoop(null);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('webglcontextlost',lost);adventure.dispose();reticleGeometry.dispose();reticleMaterial.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();pointers.clear();},
 };
}
