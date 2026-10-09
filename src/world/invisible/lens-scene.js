import * as THREE from 'three';
import {goldMasterTokens} from '../../design-system/tokens.js';
import {createLensAdventure} from './lens-adventure.js';
import {createXRSessionController} from './xr-session.js';

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
 const adventure=createLensAdventure(episode),{content,environment,objects,realm}=adventure,palette=goldMasterTokens.colors;
 anchor.add(content);scene.add(anchor,environment);
 scene.add(new THREE.HemisphereLight(realm.sky,realm.night,1.25));
 const key=new THREE.DirectionalLight(realm.sun,2.35);key.position.set(-6,9,5);scene.add(key);
 const rimLight=new THREE.DirectionalLight(realm.sky,.8);rimLight.position.set(5,4,-6);scene.add(rimLight);
 const reticleGeometry=new THREE.RingGeometry(.1,.13,40),reticleMaterial=new THREE.MeshBasicMaterial({color:palette.matrix,side:THREE.DoubleSide});reticleGeometry.rotateX(-Math.PI/2);
 const reticle=new THREE.Mesh(reticleGeometry,reticleMaterial);scene.add(reticle);reticle.matrixAutoUpdate=false;reticle.visible=false;
 let alive=true,paused=false,ar=false,placed=false,focusKey='all',overlayMode='3d',target=new THREE.Vector3(0,1,0),yaw=-.12,pitch=.18,distance=10.2,orientation=null,baseline=null;
 function applyMode(){const mode=ar?'ar':overlayMode;adventure.setMode(mode);scene.background=mode==='3d'?adventure.background:null;scene.fog=mode==='3d'?new THREE.Fog(adventure.fogColor,14,62):null;}
 function overviewDistance(){return Math.max(overlayMode==='3d'?10.2:8.2,(overlayMode==='3d'?3.95:2.3)/(Math.tan(THREE.MathUtils.degToRad(view.fov/2))*view.aspect)+(overlayMode==='3d'?2.7:1.5));}
 function focus(key){focusKey=key;const group=objects.get(key),height=key==='guardian'?1.13:key==='portal'?1.5:key==='fragment'?1.17:.53;
  target=group?group.position.clone().add(new THREE.Vector3(0,height,0)):new THREE.Vector3(0,1,0);
  distance=group?(key==='portal'?5:key==='guardian'?3.2:2.6):overviewDistance();yaw=-.12;pitch=key==='chest'?.25:group?.12:.18;baseline=null;orbit();if(reducedMotion)render();
 }
 const raycaster=new THREE.Raycaster(),direction=new THREE.Vector3(),rayMatrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),baseQuaternion=new THREE.Quaternion();
 function orbit(){if(ar)return;const eye=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(target);view.position.copy(eye);view.lookAt(target);baseQuaternion.copy(view.quaternion);if(orientation){if(!baseline)baseline=orientation.clone();const delta=baseline.clone().invert().multiply(orientation);view.quaternion.copy(baseQuaternion).multiply(delta);}view.updateMatrixWorld();}
 function inspectHits(hits){for(const hit of hits){let node=hit.object;while(node&&!node.userData.lensKey)node=node.parent;const found=node?.userData.lensKey;if(found){const item=found.startsWith('clue:')?{kind:'clue',id:found.slice(5)}:{kind:found,id:found==='fragment'?episode.fragment?.id||'fragment':found};onInspect(item);return item;}}return null;}
 function tap(clientX,clientY){if(ar)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),view);inspectHits(raycaster.intersectObjects(content.children,true));}
 const xr=createXRSessionController({overlayRoot,onState:state=>{
  if(!alive)return;
  if(state.phase==='idle'||state.phase==='error'){ar=false;placed=false;reticle.visible=false;anchor.matrixAutoUpdate=true;anchor.matrix.identity();anchor.position.set(0,0,0);anchor.quaternion.identity();anchor.scale.setScalar(1);content.scale.setScalar(1);content.visible=true;applyMode();focus(focusKey);resume();}
  if(placed&&['surface','searching'].includes(state.phase))return;
  onXRState({...state,placed});
 },attachSession:async session=>{
  ar=true;placed=false;applyMode();content.visible=false;view.position.set(0,0,0);view.quaternion.identity();renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);if(!alive)return null;resume();return renderer.xr.getReferenceSpace();
 },onPose:matrix=>{reticle.visible=ar&&!!matrix&&!placed;if(matrix)reticle.matrix.fromArray(matrix);},onSelect:({pose,event,referenceSpace})=>{
  if(!alive||!ar)return;
  if(!placed){if(!pose)return;anchor.matrixAutoUpdate=false;anchor.matrix.fromArray(pose);content.scale.setScalar(.24);content.visible=true;placed=true;reticle.visible=false;onXRState({phase:'placed',placed:true,message:'Ton univers est posé. Touche un objet pour l’inspecter, ou rapproche-toi doucement.'});return;}
  try{const nativePose=event.frame?.getPose(event.inputSource?.targetRaySpace,referenceSpace);if(!nativePose)return;rayMatrix.fromArray(nativePose.transform.matrix);rayMatrix.decompose(position,rotation,scale);direction.set(0,0,-1).applyQuaternion(rotation);raycaster.set(position,direction);inspectHits(raycaster.intersectObjects(content.children,true));}catch{/* A select event without a current frame cannot inspect a spatial object. */}
 }});
 function render(time=0,frame){if(!alive||paused)return;if(ar)xr.frame(frame);else orbit();if(!reducedMotion)adventure.update(time*.001);scene.updateMatrixWorld();renderer.render(scene,view);}
 function resume(){if(!alive||paused)return;renderer.setAnimationLoop(reducedMotion&&!ar?null:render);if(reducedMotion&&!ar)render();}
 const resize=()=>{if(!alive)return;const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);renderer.setSize(width,height,false);view.aspect=width/height;view.updateProjectionMatrix();if(!ar&&focusKey==='all')distance=overviewDistance();if(!ar)render();};const observer=new ResizeObserver(resize);observer.observe(host);
 const pointers=new Map();let pinch=0,gesture=null;
 function down(event){if(ar)return;renderer.domElement.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});gesture={x:event.clientX,y:event.clientY,time:performance.now(),moved:pointers.size>1};pinch=0;}
 function move(event){if(ar||!pointers.has(event.pointerId))return;const previous=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(gesture&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>7)gesture.moved=true;
  if(pointers.size===2){const values=[...pointers.values()],next=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);if(pinch&&next)distance=THREE.MathUtils.clamp(distance*pinch/next,2.3,17);pinch=next;}
  else{yaw-=(event.clientX-previous.x)*.008;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-previous.y)*.006,-.2,1.05);}orbit();if(reducedMotion)render();
 }
 function up(event){if(!pointers.has(event.pointerId))return;const single=pointers.size===1;pointers.delete(event.pointerId);if(single&&gesture&&!gesture.moved&&performance.now()-gesture.time<650)tap(event.clientX,event.clientY);gesture=null;pinch=0;}
 function cancel(event){pointers.delete(event.pointerId);gesture=null;pinch=0;}
 function wheel(event){if(ar)return;event.preventDefault();distance=THREE.MathUtils.clamp(distance+event.deltaY*.007,2.3,17);orbit();if(reducedMotion)render();}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
 const lost=event=>{event.preventDefault();paused=true;renderer.setAnimationLoop(null);xr.stop();onStatus('Le rendu 3D s’est interrompu. Les objets restent consultables dans la liste.');};renderer.domElement.addEventListener('webglcontextlost',lost);
 applyMode();orbit();resize();resume();
 return {
  startAR:()=>xr.start(),stopAR:()=>xr.stop(),
  rePlace(){if(ar){placed=false;content.visible=false;reticle.visible=false;onXRState({phase:'searching',placed:false,message:'Vise une surface puis touche l’écran pour replacer ton univers.'});}},
  focus,
  setMode(mode){if(!alive)return;overlayMode=mode==='3d'?'3d':'camera';applyMode();if(!ar)focus(focusKey);if(!ar)render();},
  recenter(){baseline=null;yaw=.15;pitch=.3;this.focus(focusKey);},
  setOrientation({alpha,beta,gamma,screen=0}){if(![alpha,beta,gamma].every(Number.isFinite))return;orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(beta),THREE.MathUtils.degToRad(alpha),-THREE.MathUtils.degToRad(gamma),'YXZ'));orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-THREE.MathUtils.degToRad(screen)));orbit();if(reducedMotion)render();},
  stopOrientation(){orientation=null;baseline=null;orbit();if(reducedMotion)render();},
  setProgress(progress){if(!alive)return;adventure.setProgress(progress);if(reducedMotion)render();},
  pause(value){paused=value;if(value)renderer.setAnimationLoop(null);else resume();},
  dispose(){if(!alive)return;alive=false;xr.stop();renderer.setAnimationLoop(null);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('webglcontextlost',lost);adventure.dispose();reticleGeometry.dispose();reticleMaterial.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();pointers.clear();},
 };
}
