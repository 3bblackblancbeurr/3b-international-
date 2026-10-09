import * as THREE from 'three';
import {goldMasterTokens,worldRealmArt,worldArtMaterials} from '../../design-system/tokens.js';
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
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='lens-renderer';renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),view=new THREE.PerspectiveCamera(42,1,.03,70),anchor=new THREE.Group(),content=new THREE.Group();anchor.add(content);scene.add(anchor);
 const realm=worldRealmArt[episode.fragment?.realm]||worldRealmArt.france,palette=goldMasterTokens.colors;
 const gold=new THREE.MeshStandardMaterial({color:palette.champagne,metalness:.88,roughness:.25,emissive:palette.champagneDeep,emissiveIntensity:.15}),stone=new THREE.MeshStandardMaterial({color:realm.stone,metalness:.2,roughness:.8}),dark=new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentDark,metalness:.62,roughness:.4}),lake=new THREE.MeshStandardMaterial({color:realm.cloth,metalness:.55,roughness:.28,emissive:worldArtMaterials.monumentBlue,emissiveIntensity:.2}),energy=new THREE.MeshBasicMaterial({color:palette.matrix,transparent:true,opacity:.72}),light=new THREE.MeshBasicMaterial({color:palette.champagneHighlight}),ghost=new THREE.MeshStandardMaterial({color:realm.cloth,emissive:worldArtMaterials.monumentBlue,emissiveIntensity:.4,transparent:true,opacity:.9,metalness:.45,roughness:.25});
 const disposeMaterials=[gold,stone,dark,lake,energy,light,ghost],geometries=new Set(),meshes=[],objects=new Map(),animations=[];
 function mesh(geometry,material,parent,x=0,y=0,z=0){geometries.add(geometry);const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);parent.add(object);meshes.push(object);return object;}
 function model(key,x,y,z){const group=new THREE.Group();group.position.set(x,y,z);group.userData.lensKey=key;content.add(group);objects.set(key,group);return group;}
 const floor=new THREE.Group();content.add(floor);
 mesh(new THREE.CylinderGeometry(3.2,3.45,.2,80),dark,floor,0,-.13,0);
 mesh(new THREE.CylinderGeometry(3.16,3.18,.035,80),lake,floor,0,-.008,0);
 const rim=mesh(new THREE.TorusGeometry(3.2,.024,8,100),gold,floor,0,.04,0);rim.rotation.x=Math.PI/2;
 for(let i=0;i<24;i++){const a=i*Math.PI/12;const glyph=mesh(new THREE.BoxGeometry(.07,.035,.2),i%3?gold:energy,floor,Math.cos(a)*2.93,.025,Math.sin(a)*2.93);glyph.rotation.y=-a;}
 const portal=model('portal',0,0,-1.9),portalRing=mesh(new THREE.TorusGeometry(1.23,.105,12,96),gold,portal,0,1.3,0),portalInner=mesh(new THREE.TorusGeometry(1.06,.025,8,96),energy,portal,0,1.3,.02);
 mesh(new THREE.BoxGeometry(.32,.42,.4),dark,portal,-.78,.2,0);mesh(new THREE.BoxGeometry(.32,.42,.4),dark,portal,.78,.2,0);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;mesh(new THREE.OctahedronGeometry(.055),light,portal,Math.cos(a)*1.43,1.3+Math.sin(a)*1.43,0);}
 const curtain=mesh(new THREE.CircleGeometry(1.05,64),new THREE.MeshBasicMaterial({color:palette.matrix,transparent:true,opacity:.12,side:THREE.DoubleSide}),portal,0,1.3,-.04);disposeMaterials.push(curtain.material);
 animations.push(t=>{portalInner.rotation.z=t*.1;curtain.material.opacity=(portalOpen ? .2 : .08)+Math.sin(t*.8)*.035;});
 const chest=model('chest',-1.45,0,.55);chest.rotation.y=.35;
 mesh(new THREE.BoxGeometry(.9,.5,.65),dark,chest,0,.3,0);mesh(new THREE.BoxGeometry(.95,.06,.69),gold,chest,0,.08,0);
 for(const x of [-.39,.39])mesh(new THREE.BoxGeometry(.055,.49,.67),gold,chest,x,.31,0);
 const lid=new THREE.Group();lid.position.set(0,.53,-.32);chest.add(lid);mesh(new THREE.BoxGeometry(.94,.13,.7),gold,lid,0,.04,.33);mesh(new THREE.BoxGeometry(.7,.02,.54),dark,lid,0,.12,.33);
 mesh(new THREE.OctahedronGeometry(.08),light,chest,0,.38,.37);let chestOpen=false;
 animations.push(t=>{lid.rotation.x=chestOpen?-Math.PI*.45:Math.sin(t*.5)*.025;});
 const guardian=model('guardian',1.35,0,-.1),body=mesh(new THREE.ConeGeometry(.44,1.38,8),ghost,guardian,0,.87,0),hood=mesh(new THREE.SphereGeometry(.27,16,14),dark,guardian,0,1.65,0);
 mesh(new THREE.SphereGeometry(.19,16,12),stone,guardian,0,1.65,.12);const halo=mesh(new THREE.TorusGeometry(.42,.016,6,48),gold,guardian,0,1.69,-.12);
 const leftArm=mesh(new THREE.CylinderGeometry(.075,.1,.66,8),ghost,guardian,-.31,1.14,.08);leftArm.rotation.z=-.47;const rightArm=mesh(new THREE.CylinderGeometry(.075,.1,.66,8),ghost,guardian,.31,1.14,.08);rightArm.rotation.z=.47;
 mesh(new THREE.OctahedronGeometry(.08),light,guardian,0,1.02,.42);animations.push(t=>{guardian.position.y=Math.sin(t*.65)*.07;halo.rotation.z=t*.08;});
 const fragmentMaterial=gold.clone();disposeMaterials.push(fragmentMaterial);
 const fragment=model('fragment',0,0,1.15),gem=mesh(new THREE.IcosahedronGeometry(.27,0),fragmentMaterial,fragment,0,1.1,0),gemHalo=mesh(new THREE.TorusGeometry(.48,.009,6,64),energy,fragment,0,1.1,0);gemHalo.rotation.x=.45;
 const plinth=mesh(new THREE.CylinderGeometry(.38,.45,.24,12),dark,fragment,0,.15,0);mesh(new THREE.TorusGeometry(.39,.018,6,48),gold,fragment,0,.27,0).rotation.x=Math.PI/2;
 animations.push(t=>{gem.rotation.y=t*.3;gem.rotation.z=Math.sin(t*.3)*.08;gem.position.y=1.1+Math.sin(t*.9)*.09;gemHalo.rotation.y=t*.15;});
 const clueOrbs=new Map();
 (episode.points||[]).forEach((point,index)=>{const angle=.3+index/(Math.max(episode.points.length,1))*Math.PI*2,group=model('clue:'+point.id,Math.cos(angle)*2.3,0,Math.sin(angle)*2.3);const orb=mesh(new THREE.OctahedronGeometry(.14),energy,group,0,.58,0);clueOrbs.set(point.id,orb);mesh(new THREE.CylinderGeometry(.12,.18,.12,8),gold,group,0,.08,0);animations.push(t=>{orb.rotation.y=t*.4+index;orb.position.y=.58+Math.sin(t*.8+index)*.1;});});
 const particleGeometry=new THREE.BufferGeometry(),positions=new Float32Array(180*3);
 for(let i=0;i<180;i++){const a=i*2.399;positions[i*3]=Math.cos(a)*(1+i/55);positions[i*3+1]=.2+(i%31)/11;positions[i*3+2]=Math.sin(a)*(1+i/55);}
 particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometries.add(particleGeometry);const particleMaterial=new THREE.PointsMaterial({color:palette.champagneHighlight,size:.02,transparent:true,opacity:.5});disposeMaterials.push(particleMaterial);const particles=new THREE.Points(particleGeometry,particleMaterial);content.add(particles);animations.push(t=>particles.rotation.y=t*.015);
 scene.add(new THREE.HemisphereLight(palette.text,realm.night,2.1));const key=new THREE.DirectionalLight(palette.champagneHighlight,3);key.position.set(3,6,5);scene.add(key);const rimLight=new THREE.PointLight(palette.matrix,13,10);rimLight.position.set(-2,2,-2);scene.add(rimLight);
 const fragmentGlow=new THREE.PointLight(palette.champagneHighlight,.6,4);fragmentGlow.position.set(0,1.2,1.1);content.add(fragmentGlow);
 let portalOpen=false;
 const reticle=mesh(new THREE.RingGeometry(.1,.13,40),energy,scene);reticle.geometry.rotateX(-Math.PI/2);reticle.matrixAutoUpdate=false;reticle.visible=false;
 let alive=true,paused=false,ar=false,placed=false,focusKey='all',target=new THREE.Vector3(0,.65,0),yaw=.15,pitch=.3,distance=8.8,orientation=null,baseline=null;
 const raycaster=new THREE.Raycaster(),direction=new THREE.Vector3(),rayMatrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),baseQuaternion=new THREE.Quaternion();
 function orbit(){if(ar)return;const eye=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(target);view.position.copy(eye);view.lookAt(target);baseQuaternion.copy(view.quaternion);if(orientation){if(!baseline)baseline=orientation.clone();const delta=baseline.clone().invert().multiply(orientation);view.quaternion.copy(baseQuaternion).multiply(delta);}view.updateMatrixWorld();}
 function inspectHits(hits){for(const hit of hits){let node=hit.object;while(node&&!node.userData.lensKey)node=node.parent;const found=node?.userData.lensKey;if(found){const item=found.startsWith('clue:')?{kind:'clue',id:found.slice(5)}:{kind:found,id:found==='fragment'?episode.fragment?.id||'fragment':found};onInspect(item);return item;}}return null;}
 function tap(clientX,clientY){if(ar)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),view);inspectHits(raycaster.intersectObjects(content.children,true));}
 const xr=createXRSessionController({overlayRoot,onState:state=>{
  if(!alive)return;
  if(state.phase==='idle'||state.phase==='error'){ar=false;placed=false;reticle.visible=false;anchor.matrixAutoUpdate=true;anchor.matrix.identity();anchor.position.set(0,0,0);anchor.quaternion.identity();anchor.scale.setScalar(1);content.scale.setScalar(1);content.visible=true;orbit();resume();}
  if(placed&&['surface','searching'].includes(state.phase))return;
  onXRState({...state,placed});
 },attachSession:async session=>{
  ar=true;placed=false;content.visible=false;view.position.set(0,0,0);view.quaternion.identity();renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);if(!alive)return null;resume();return renderer.xr.getReferenceSpace();
 },onPose:matrix=>{reticle.visible=ar&&!!matrix&&!placed;if(matrix)reticle.matrix.fromArray(matrix);},onSelect:({pose,event,referenceSpace})=>{
  if(!alive||!ar)return;
  if(!placed){if(!pose)return;anchor.matrixAutoUpdate=false;anchor.matrix.fromArray(pose);content.scale.setScalar(.24);content.visible=true;placed=true;reticle.visible=false;onXRState({phase:'placed',placed:true,message:'Ton univers est posé. Touche un objet pour l’inspecter, ou rapproche-toi doucement.'});return;}
  try{const nativePose=event.frame?.getPose(event.inputSource?.targetRaySpace,referenceSpace);if(!nativePose)return;rayMatrix.fromArray(nativePose.transform.matrix);rayMatrix.decompose(position,rotation,scale);direction.set(0,0,-1).applyQuaternion(rotation);raycaster.set(position,direction);inspectHits(raycaster.intersectObjects(content.children,true));}catch{/* A select event without a current frame cannot inspect a spatial object. */}
 }});
 function render(time=0,frame){if(!alive||paused)return;if(ar)xr.frame(frame);else orbit();if(!reducedMotion)animations.forEach(update=>update(time*.001));scene.updateMatrixWorld();renderer.render(scene,view);}
 function resume(){if(!alive||paused)return;renderer.setAnimationLoop(reducedMotion&&!ar?null:render);if(reducedMotion&&!ar)render();}
 const resize=()=>{if(!alive)return;const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);renderer.setSize(width,height,false);view.aspect=width/height;view.updateProjectionMatrix();if(!ar)render();};const observer=new ResizeObserver(resize);observer.observe(host);
 const pointers=new Map();let pinch=0,gesture=null;
 function down(event){if(ar)return;renderer.domElement.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});gesture={x:event.clientX,y:event.clientY,time:performance.now(),moved:pointers.size>1};pinch=0;}
 function move(event){if(ar||!pointers.has(event.pointerId))return;const previous=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(gesture&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>7)gesture.moved=true;
  if(pointers.size===2){const values=[...pointers.values()],next=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);if(pinch&&next)distance=THREE.MathUtils.clamp(distance*pinch/next,3.2,14);pinch=next;}
  else{yaw-=(event.clientX-previous.x)*.008;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-previous.y)*.006,-.2,1.05);}orbit();if(reducedMotion)render();
 }
 function up(event){if(!pointers.has(event.pointerId))return;const single=pointers.size===1;pointers.delete(event.pointerId);if(single&&gesture&&!gesture.moved&&performance.now()-gesture.time<650)tap(event.clientX,event.clientY);gesture=null;pinch=0;}
 function cancel(event){pointers.delete(event.pointerId);gesture=null;pinch=0;}
 function wheel(event){if(ar)return;event.preventDefault();distance=THREE.MathUtils.clamp(distance+event.deltaY*.007,3.2,14);orbit();if(reducedMotion)render();}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
 const lost=event=>{event.preventDefault();paused=true;renderer.setAnimationLoop(null);xr.stop();onStatus('Le rendu 3D s’est interrompu. Les objets restent consultables dans la liste.');};renderer.domElement.addEventListener('webglcontextlost',lost);
 orbit();resize();resume();
 return {
  startAR:()=>xr.start(),stopAR:()=>xr.stop(),
  rePlace(){if(ar){placed=false;content.visible=false;reticle.visible=false;onXRState({phase:'searching',placed:false,message:'Vise une surface puis touche l’écran pour replacer ton univers.'});}},
  focus(key){focusKey=key;const group=objects.get(key);target=group?group.position.clone().add(new THREE.Vector3(0,.8,0)):new THREE.Vector3(0,.65,0);distance=group?4.3:8.8;yaw=.15;pitch=.25;baseline=null;orbit();if(reducedMotion)render();},
  recenter(){baseline=null;yaw=.15;pitch=.3;this.focus(focusKey);},
  setOrientation({alpha,beta,gamma,screen=0}){if(![alpha,beta,gamma].every(Number.isFinite))return;orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(beta),THREE.MathUtils.degToRad(alpha),-THREE.MathUtils.degToRad(gamma),'YXZ'));orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-THREE.MathUtils.degToRad(screen)));orbit();if(reducedMotion)render();},
  stopOrientation(){orientation=null;baseline=null;orbit();if(reducedMotion)render();},
  setProgress(progress){const solved=progress?.solved||[];chestOpen=progress?.chestOpened===true;portalOpen=progress?.portalOpened===true;lid.rotation.x=chestOpen?-Math.PI*.45:0;fragmentMaterial.emissiveIntensity=chestOpen ? .65 : .15+Math.min(solved.length,3)*.07;fragmentGlow.intensity=chestOpen?5:.6;clueOrbs.forEach((orb,id)=>{orb.material=solved.includes(id)?light:energy;});halo.material=chestOpen?light:gold;portalInner.material=portalOpen?light:energy;curtain.material.opacity=portalOpen ? .23 : .09;if(reducedMotion)render();},
  pause(value){paused=value;if(value)renderer.setAnimationLoop(null);else resume();},
  dispose(){if(!alive)return;alive=false;xr.stop();renderer.setAnimationLoop(null);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('webglcontextlost',lost);geometries.forEach(geometry=>geometry.dispose());disposeMaterials.forEach(material=>material.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();pointers.clear();},
 };
}
