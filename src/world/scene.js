import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadWorldModels} from './models.js';
import {createLivingActor} from './living.js';
import {DEFAULT_ORBIT,rotateOrbit,zoomOrbit,cameraRelative,orbitView} from './orbit.js';
import {advanceMotion,pointerStick,createQualityController} from './motion.js';
import {COUNTRIES,countryById,cardById} from './catalog.js';
import {createPortalFrame} from './portals.js';
import {createDaylight} from './daylight.js';
import {districtAt} from './settlements.js';
import {toLandscape} from './terrain.js';
import {createLandscape} from './landscape.js';
import {landscapeItems,WORLD_RADIUS,BIOMES,randomFor} from './terrain.js';
import {COSMETICS} from './chapters.js';
import {findPath,findInteractionPath} from './navigation.js';
import {distance,nearestInteraction,teamStats} from './rules.js';

export function createWorldScene(canvas,{save,onSnapshot,onInteract,onActivity,onError,onLoadState,onStep}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 const quality=createQualityController();renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.3,460);
 const hemi=new THREE.HemisphereLight(0xd1edff,0xa6af8e,.9);scene.add(hemi);const fill=new THREE.DirectionalLight('#d9edff',.65);fill.position.set(-30,25,-40);scene.add(fill);
 const sun=new THREE.DirectionalLight(0xffe5bd,2.4);scene.add(sun,sun.target);sun.castShadow=true;
 const portraitLight=new THREE.DirectionalLight('#fff1dc',.55);scene.add(portraitLight,portraitLight.target);
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:1,far:130});sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;sun.shadow.radius=3;sun.shadow.camera.updateProjectionMatrix();
 const cameraTarget=new THREE.Vector3(),desiredTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 let root=new THREE.Group(),resources=[],animations=[],obstacles=[],items=[],region=save.region,position={x:0,z:5},target=null,waypoint=null,route=[];
 let paused=false,presentation=null,disposed=false,held=null,stick={x:0,z:0},keys=new Set(),moving=false,elapsed=0,last=performance.now(),report=0,raf,frames=0,frameTime=0,fps=60,shadowAt=0;
 let avatar,companion,focusRing,waypointRing,effect,portalMaterials=[],cooldowns=new Map(),itemVisuals=new Map(),cameraMode=0,feedbackAt=-100,feedbackAction='';
 let stats=teamStats(save),models=null,hero=null,landscape=null,actors=[],stepDistance=0,needsRender=true,materialCache=new Map(),battleTarget=null;
 let escort=null,escortId=null,trail=[],shot=null,daylight=null;
 let orbit={...DEFAULT_ORBIT},orbitHeld=null,avatarKey='';const touchPoints=new Map();let pinchDistance=null;
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const register=asset=>(resources.push(asset),asset);
 const material=(color,extra={})=>{const key=JSON.stringify([color,extra]);if(!materialCache.has(key))materialCache.set(key,register(new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.08,...extra})));return materialCache.get(key);};
 const geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,20),sphere:new THREE.IcosahedronGeometry(1,1),ring:new THREE.TorusGeometry(1,.065,6,48)};
 const groundY=(x,z)=>landscape?.height(x,z)||0;
 function mesh(g,mat,x,y,z,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(typeof g==='string'?geometry[g]:g,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);return m;}
 function glowTexture(){const cv=document.createElement('canvas');cv.width=cv.height=64;const ctx=cv.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.2,'rgba(255,255,255,.7)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return register(new THREE.CanvasTexture(cv));}
 function portal(item){
  const index=Math.max(0,COUNTRIES.findIndex(c=>c.id===item.id)),y=groundY(item.x,item.z);
  const frame=createPortalFrame(countryById[item.id]?item.id:region,item.color);register(frame);frame.group.position.set(item.x,y,item.z);root.add(frame.group);for(const side of [-1,1])obstacles.push({x:item.x+side*3.65,z:item.z,r:1.25});
  const filmGeo=register(new THREE.CircleGeometry(1,40));
  const filmMat=register(new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{time:{value:0},tint:{value:new THREE.Color(item.color)},art:{value:models.atlas},tile:{value:new THREE.Vector2(index%4*.25,index<4?.5:0)}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float time; uniform vec3 tint; uniform sampler2D art; uniform vec2 tile; void main(){vec2 p=vUv-.5;float r=length(p)*2.;float ripple=sin(r*24.-time*1.7)*.5+.5;vec2 uv=vUv+sin(vUv.yx*10.+time*.4)*.005;vec3 c=texture2D(art,uv*vec2(.25,.5)+tile).rgb;gl_FragColor=vec4(mix(c,tint,pow(r,5.)*.55+ripple*.05),.93);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  mesh(filmGeo,filmMat,item.x,y+4,item.z+.1,2.95,3.45,1);portalMaterials.push(filmMat);
 }
 function makeActor(item){
  const card=cardById[item.card],creature=item.type==='guardian';
  const actor=createLivingActor(models.living,{card:card.id,scale:creature?2.5:2,onError});
  actor.object.position.set(item.x,groundY(item.x,item.z),item.z);actor.object.rotation.y=(card?.number||0)*.7;root.add(actor.object);
  actors.push({controller:actor,itemId:item.id,creature,x:item.x,z:item.z});return actor.object;
 }
 function batchStatic(){
  const dynamic=new Set([avatar,companion,focusRing,waypointRing,effect,...animations.map(a=>a.mesh),...[...itemVisuals.values()].flat()]),groups=new Map();
  for(const m of root.children){if(!m.isMesh||m.isInstancedMesh||dynamic.has(m)||m.material.transparent)continue;const key=m.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
  for(const meshes of groups.values())if(meshes.length>2){const geometries=meshes.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return g.applyMatrix4(m.matrix);});const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;const batch=new THREE.Mesh(register(merged),meshes[0].material);batch.castShadow=true;batch.receiveShadow=true;root.add(batch);meshes.forEach(m=>root.remove(m));}
 }
 function syncEscort(){if(!models)return;const id=save.adventure.companion||save.team[0]||save.leader;if(escortId===id&&escort)return;escort?.object.removeFromParent();escort?.dispose();escortId=id;escort=createLivingActor(models.living,{card:id,scale:2,onError});escort.object.position.set(position.x+2,groundY(position.x+2,position.z+2),position.z+2);root.add(escort.object);trail=[];}
 function rebuild(nextRegion){
  escort?.dispose();escort=null;escortId=null;shot=null;
  hero?.dispose();landscape?.dispose();actors.forEach(a=>a.controller.dispose());actors=[];scene.remove(root);resources.forEach(r=>r.dispose());resources=[];materialCache=new Map();root=new THREE.Group();scene.add(root);animations=[];portalMaterials=[];obstacles=[];itemVisuals=new Map();battleTarget=null;
  region=nextRegion;items=landscapeItems(region,save);position={x:0,z:5};target=null;route=[];waypoint=null;clearInput();
  const c=countryById[region],biome=BIOMES[region],rng=randomFor(biome.seed),accent=c?.color||'#e4cd94';
  scene.background=new THREE.Color(biome.sky);scene.fog=new THREE.Fog(biome.haze,110,300);hemi.color.set(biome.sky).lerp(new THREE.Color('#ffffff'),.5);hemi.intensity=.9;sun.intensity=4.2;
  daylight?.dispose();daylight=createDaylight(renderer,biome);scene.environment=daylight.texture;scene.environmentIntensity=.4;
  landscape=createLandscape(models,region,save);root.add(landscape.root);obstacles.push(...landscape.collisions);
  const stone=material(c?.stone||'#cfc7ae'),gold=material(accent,{emissive:accent,emissiveIntensity:.22,metalness:.4});
  for(const item of items){
   if(item.type==='portal'){portal(item);continue;}
   if(item.type==='story'||item.type==='atelier'||item.type==='sanctuary'||item.type==='camp'||item.type==='resource')continue;
   if(item.type==='survey'){const y=groundY(item.x,item.z);mesh('cylinder',stone,item.x,y+.5,item.z,.52,1,.52);const book=mesh('box',gold,item.x,y+1.15,item.z,.9,.1,.62);book.rotation.x=.25;obstacles.push({x:item.x,z:item.z,r:.65});continue;}
   if(item.type==='final'){const actor=createLivingActor(models.living,{card:'C165',scale:3.1,onError});actor.object.position.set(item.x,groundY(item.x,item.z),item.z);actor.object.visible=false;root.add(actor.object);actors.push({controller:actor,itemId:'final',creature:true,x:item.x,z:item.z});continue;}
   const first=root.children.length,y=groundY(item.x,item.z);
   if(item.type==='guardian'||item.type==='echo'||item.type==='patrol')makeActor(item);
   if(item.type==='beacon'){
    const mat=material(item.color,{emissive:item.color,emissiveIntensity:item.done?.08:.48,metalness:.5});
    mesh('cylinder',stone,item.x,y+.25,item.z,.75,.5,.75);
    const ob=mesh('sphere',mat,item.x,y+1.7,item.z,.4,1,.4);animations.push({mesh:ob,type:'float',y:y+1.7,itemId:item.id});
    const ring=mesh('ring',mat,item.x,y+1.7,item.z,1,1,1);ring.rotation.x=.5;
   }
   itemVisuals.set(item.id,root.children.slice(first));
  }
  hero=createLivingActor(models.living,{avatar:save.adventure.avatar,scale:2.2,onError});avatarKey=JSON.stringify(save.adventure.avatar);avatar=hero.object;root.add(avatar);hero.setColor(save.adventure.cosmetic!=='voyageur'?COSMETICS.find(c=>c.id===save.adventure.cosmetic)?.color:null);
  const shadow=mesh(register(new THREE.CircleGeometry(1,24)),register(new THREE.MeshBasicMaterial({color:'#12261c',transparent:true,opacity:.3,depthWrite:false})),0,.06,0,.85,.85,1);shadow.rotation.x=-Math.PI/2;animations.push({mesh:shadow,type:'shadow'});
  companion=new THREE.Group();root.add(companion);syncEscort();
  const ringMat=register(new THREE.MeshBasicMaterial({color:'#fae3a2',transparent:true,opacity:.55,depthWrite:false}));
  focusRing=mesh('ring',ringMat,0,0,0,1.35);focusRing.rotation.x=-Math.PI/2;focusRing.visible=false;
  waypointRing=mesh('ring',ringMat,0,0,0,1.6);waypointRing.rotation.x=-Math.PI/2;waypointRing.visible=false;
  effect=mesh('ring',register(new THREE.MeshBasicMaterial({color:'#fff0ab',transparent:true,opacity:0,depthWrite:false})),0,0,0,1);effect.rotation.x=-Math.PI/2;
  const spriteTex=glowTexture(),coords=new Float32Array(90*3);for(let i=0;i<90;i++){coords[i*3]=(rng()-.5)*160;coords[i*3+1]=3+rng()*18;coords[i*3+2]=(rng()-.5)*160;}
  const particleGeo=register(new THREE.BufferGeometry());particleGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));
  const points=new THREE.Points(particleGeo,register(new THREE.PointsMaterial({size:.18,color:accent,map:spriteTex,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending})));root.add(points);animations.push({mesh:points,type:'particles'});
  const view=orbitView(orbit,position,groundY(position.x,position.z),camera.aspect<.85);camera.position.copy(view.position);cameraTarget.copy(view.target);camera.lookAt(cameraTarget);report=0;needsRender=true;batchStatic();
 }
 function resize(){const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setPixelRatio(quality.ratio(width,height,devicePixelRatio||1));renderer.setSize(width,height,false);needsRender=true;camera.aspect=width/height;camera.updateProjectionMatrix();}}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 function startRoute(destination,interaction=false){route=(interaction?findInteractionPath:findPath)(position,destination,obstacles,WORLD_RADIUS);target=route.shift()||null;needsRender=true;}
 function clearInput(){keys.clear();stick={x:0,z:0};held=null;orbitHeld=null;touchPoints.clear();pinchDistance=null;target=null;route=[];}
 function down(e){
  if(paused||!landscape||e.button>2)return;e.preventDefault();onActivity();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
  const rect=canvas.getBoundingClientRect(),cameraTouch=e.pointerType==='touch'&&e.clientX-rect.left>rect.width*.55;
  if(e.button===2||cameraTouch){touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!orbitHeld)orbitHeld={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false};if(touchPoints.size===2){const p=[...touchPoints.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}return;}
  if(held)return;held={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),drag:false,run:false};target=null;route=[];
 }
 function move(e){
  if(touchPoints.has(e.pointerId)){touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});onActivity();needsRender=true;
   if(touchPoints.size===2){const p=[...touchPoints.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance!==null)orbit=zoomOrbit(orbit,(pinchDistance-distance)*5);pinchDistance=distance;if(orbitHeld){orbitHeld.drag=true;const q=touchPoints.get(orbitHeld.id);if(q){orbitHeld.x=q.x;orbitHeld.y=q.y;}}return;}
   if(orbitHeld?.id===e.pointerId){const dx=e.clientX-orbitHeld.x,dy=e.clientY-orbitHeld.y;orbit=rotateOrbit(orbit,dx,dy);orbitHeld.x=e.clientX;orbitHeld.y=e.clientY;if(Math.hypot(e.clientX-orbitHeld.startX,e.clientY-orbitHeld.startY)>7)orbitHeld.drag=true;}return;
  }
  if(!held||held.id!==e.pointerId)return;const dx=e.clientX-held.x,dy=e.clientY-held.y,len=Math.hypot(dx,dy);if(len>7)held.drag=true;held.run=len>88;stick=pointerStick(dx,dy);onActivity();
 }
 function pointRoute(e){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(landscape.ground,false)[0];if(hit){const p=hit.point,r=Math.hypot(p.x,p.z),scale=Math.min(1,(WORLD_RADIUS-2)/r);startRoute({x:p.x*scale,z:p.z*scale});}}
 function up(e){
  if(touchPoints.has(e.pointerId)){if(orbitHeld?.id===e.pointerId&&!orbitHeld.drag&&e.type==='pointerup'&&e.pointerType==='touch')pointRoute(e);touchPoints.delete(e.pointerId);pinchDistance=null;if(orbitHeld?.id===e.pointerId){const next=[...touchPoints.entries()][0];orbitHeld=next?{id:next[0],x:next[1].x,y:next[1].y,startX:next[1].x,startY:next[1].y,drag:true}:null;}return;}
  if(!held||held.id!==e.pointerId)return;if(!held.drag&&!paused&&e.type==='pointerup')pointRoute(e);held=null;stick={x:0,z:0};
 }
 function wheel(e){if(paused)return;e.preventDefault();orbit=zoomOrbit(orbit,e.deltaY);needsRender=true;onActivity();}
 const context=e=>e.preventDefault();
 function toggleCamera(){cameraMode=1-cameraMode;orbit={...orbit,distance:cameraMode?36:24,pitch:cameraMode?.76:.5};needsRender=true;}
 function keydown(e){if(paused||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','z','q','e','shift','c'].includes(key)){e.preventDefault();if(key==='c'){if(!e.repeat)toggleCamera();return;}keys.add(key);target=null;route=[];onActivity();if(key==='e'&&!e.repeat)interact();}}
 function keyup(e){keys.delete(e.key.toLowerCase());}
 function interact(){if(paused)return;const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())&&!(i.type==='resource'&&i.done)));if(closest){clearInput();battleTarget=closest;onActivity();onInteract(closest);}}
 const hidden=()=>{clearInput();last=performance.now();frameTime=frames=0;needsRender=true;};
 const lost=e=>{e.preventDefault();paused=true;onError('Le rendu 3D a été interrompu. Recharge le monde pour reprendre ta sauvegarde.');};
 canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('contextmenu',context);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('webglcontextlost',lost);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',hidden);
 function tick(now){
  if(disposed)return;raf=requestAnimationFrame(tick);const rawDt=Math.max(0,(now-last)/1000);last=now;
  const cinematic=presentation==='encounter';if(shot&&now>=shot.until)shot=null;if(document.hidden||!models||!avatar||paused&&!cinematic&&!needsRender)return;
  const dt=Math.min(rawDt,.25);elapsed+=dt;let travelled=0,dx=0,dz=0;
  if(!paused&&!shot){
   frames++;frameTime+=rawDt;if(frameTime>=1){fps=Math.round(frames/frameTime);if(quality.sample(fps,frameTime))resize();frames=0;frameTime=0;}
   dx=stick.x+((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('q')||keys.has('arrowleft'))?1:0);
   dz=stick.z+((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('z')||keys.has('arrowup'))?1:0);
   ({x:dx,z:dz}=cameraRelative(dx,dz,orbit.yaw));
   const previous=position,next=advanceMotion({position,target,route},{x:dx,z:dz},dt,10.5*stats.speed*(keys.has('shift')||held?.run?1.4:1),obstacles,WORLD_RADIUS);
   ({position,target,route,travelled,moving}=next);dx=position.x-previous.x;dz=position.z-previous.z;
   if(moving){onActivity();stepDistance+=travelled;if(stepDistance>2.1){stepDistance=0;onStep?.(region);}}
  }else moving=false;
  const y=groundY(position.x,position.z),age=elapsed-feedbackAt,impact=age<.5&&!reducedMotion?Math.sin(age/.5*Math.PI):0;
  avatar.position.set(position.x,y,position.z);hero.update(dt,dx,dz,travelled);
  const encounter=save.adventure.encounter;
  const opponent=cinematic?(encounter?.final?items.find(i=>i.type==='final'):encounter?.patrol?items.find(i=>i.type==='patrol'):battleTarget?.card===encounter?.card?battleTarget:items.find(i=>i.card===encounter?.card)):null;
  if(opponent){let ox=opponent.x-position.x,oz=opponent.z-position.z,d=Math.hypot(ox,oz);if(d<.01){ox=0;oz=-1;d=1;}const spacing=Math.max(0,4.5-d),approach=feedbackAction==='guard'||feedbackAction==='dodge'?0:impact*.75;avatar.position.x+=ox/d*(approach-spacing);avatar.position.z+=oz/d*(approach-spacing);if(feedbackAction==='dodge'){avatar.position.x+=oz/d*impact*2.4;avatar.position.z-=ox/d*impact*2.4;}avatar.position.y=groundY(avatar.position.x,avatar.position.z);avatar.rotation.y=Math.atan2(ox,oz);}
  if(escort){escort.object.visible=!cinematic;const p=escort.object.position;if(travelled>.05&&(!trail.length||Math.hypot(trail.at(-1).x-position.x,trail.at(-1).z-position.z)>1))trail.push({...position});while(trail.length>65)trail.shift();while(trail.length>3&&Math.hypot(trail[0].x-p.x,trail[0].z-p.z)<1.3)trail.shift();const goal=trail.length>3?trail[0]:null,old={x:p.x,z:p.z};if(goal&&!paused&&!shot){const result=advanceMotion({position:old,target:goal,route:[]},{x:0,z:0},dt,Math.max(11,10.5*stats.speed*1.6),obstacles,WORLD_RADIUS);p.set(result.position.x,groundY(result.position.x,result.position.z),result.position.z);}escort.update(dt,p.x-old.x,p.z-old.z,Math.hypot(p.x-old.x,p.z-old.z));if(Math.hypot(p.x-position.x,p.z-position.z)>40){p.set(position.x,y,position.z);trail=[];}}
  const wide=cameraMode===1,portrait=camera.aspect<.85;
  if(opponent){const mx=(avatar.position.x+opponent.x)/2,mz=(avatar.position.z+opponent.z)/2,my=(avatar.position.y+groundY(opponent.x,opponent.z))/2;desiredTarget.set(mx,my+1.8,mz);desiredCamera.set(mx+(portrait?12:15),my+(portrait?14:11),mz+(portrait?20:18));}
  else{const view=orbitView(orbit,position,y,portrait);desiredTarget.copy(view.target);desiredCamera.copy(view.position);}
  if(shot&&!reducedMotion){const age=1-(shot.until-now)/shot.duration,a=shot.angle+age*.28;desiredTarget.set(shot.x,groundY(shot.x,shot.z)+2,shot.z);desiredCamera.set(shot.x+Math.sin(a)*23,groundY(shot.x,shot.z)+14,shot.z+Math.cos(a)*23);}

  const smoothing=1-Math.exp(-dt*(reducedMotion?20:7));camera.position.lerp(desiredCamera,smoothing);cameraTarget.lerp(desiredTarget,smoothing);camera.lookAt(cameraTarget);landscape.updateCamera(camera.position,cameraTarget);
  portraitLight.position.copy(camera.position);portraitLight.position.y+=5;portraitLight.target.position.copy(avatar.position);portraitLight.target.position.y+=1.5;
  sun.position.set(position.x-24,y+65,position.z+24);sun.target.position.set(position.x,y,position.z);portalMaterials.forEach(mat=>mat.uniforms.time.value=elapsed);
  for(const a of animations){if(a.type==='float'){a.mesh.position.y=a.y+Math.sin(elapsed*1.5+a.mesh.position.x)*.15;a.mesh.rotation.y+=dt*.3;}if(a.type==='shadow')a.mesh.position.set(avatar.position.x,avatar.position.y+.07,avatar.position.z);if(a.type==='particles')a.mesh.rotation.y=Math.sin(elapsed*.04)*.03;}
  landscape.tick(elapsed,dt,position);
  for(const a of actors){const object=a.controller.object,active=cinematic&&opponent?.id===a.itemId;object.visible=a.itemId==='final'?active:active||!(cooldowns.get(a.itemId)>Date.now());if(!object.visible)continue;const previous=object.position.clone(),wander=!active&&!paused?Math.sin(elapsed*.28+a.x)*.6:0;object.position.set(a.x+wander,groundY(a.x+wander,a.z),a.z);const movement=object.position.distanceTo(previous);a.controller.update(dt,object.position.x-previous.x,object.position.z-previous.z,movement);if(active){object.rotation.y=Math.atan2(position.x-a.x,position.z-a.z);object.rotation.z=impact*.06;}else object.rotation.z=0;}
  const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())&&!(i.type==='resource'&&i.done)));
  focusRing.visible=!!closest&&!paused;if(closest)focusRing.position.set(closest.x,groundY(closest.x,closest.z)+.09,closest.z);
  waypointRing.visible=!!waypoint&&!paused&&distance(position,waypoint)>7;if(waypoint)waypointRing.position.set(waypoint.x,groundY(waypoint.x,waypoint.z)+.1,waypoint.z);
  effect.visible=age<.65;if(effect.visible){effect.position.set(avatar.position.x,avatar.position.y+.15,avatar.position.z);effect.scale.setScalar(1+age*6);effect.material.opacity=Math.max(0,1-age/.65)*.7;effect.material.color.set(feedbackAction==='guard'?'#a2dff0':'#ffe0a0');}
  if(renderer.shadowMap.enabled&&(needsRender||now-shadowAt>=50)){renderer.shadowMap.needsUpdate=true;shadowAt=now;}
  renderer.render(scene,camera);report-=dt;
  if(report<=0||needsRender){report=(moving||held?.drag)?.1:.4;onSnapshot({cinematic:shot?{title:shot.title,detail:shot.detail}:null,companion:escortId,region,district:districtAt(region,position,(x,z)=>toLandscape(region,x,z)),position:{...position},camera:{...orbit,actualDistance:camera.position.distanceTo(cameraTarget)},near:closest,moving,fps,drawCalls:renderer.info.render.calls,resolution:Math.round(renderer.getPixelRatio()*100),waypoint,remaining:waypoint?Math.round(distance(position,waypoint)):null,joystick:held?.drag?{x:held.x,y:held.y,dx:stick.x*26,dy:stick.z*26}:null});}
  needsRender=false;
 }
 onLoadState?.(true);
 loadWorldModels().then(value=>{if(disposed){value.dispose();return;}models=value;rebuild(region);resize();last=performance.now();onLoadState?.(false);}).catch(error=>{if(!disposed){console.error('[3B world models]',error);paused=true;onError('Les modèles 3D n’ont pas pu être chargés. Recharge le monde pour réessayer.');}});
 resize();raf=requestAnimationFrame(tick);
 return{
  setPaused(value){paused=value;needsRender=true;last=performance.now();frames=frameTime=0;if(value)clearInput();},
  setPresentation(value){presentation=value;needsRender=true;},
  feedback(type,action){if(['battle','beacon','pact','restore','power','help'].includes(type)){feedbackAt=elapsed;feedbackAction=action||type;if(type==='battle'){hero?.action(action==='guard'||action==='dodge'?'Idle':action==='power'?'Cast':'Attack');const rival=actors.find(a=>a.itemId===battleTarget?.id);rival?.controller.action(save.adventure.encounter?.result==='victory'?'Death':'Hit');}else if(type==='power')hero?.action('Cast');needsRender=true;}},
  skipCinematic(){shot=null;needsRender=true;},
  toggleCamera,
  setQuality(mode){quality.setMode(mode);renderer.shadowMap.enabled=mode!=='fluid';const size=mode==='detail'?2048:1024;if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;}resize();},
  setSave(value){const previousItems=items,oldStage=save.adventure.chapters[region]?.restored||0;save=value;const newStage=save.adventure.chapters[region]?.restored||0;if(newStage>oldStage&&models&&!reducedMotion){const p=toLandscape(region,...(newStage===3?[35,-35]:newStage===2?[29,15]:[11,-4]));shot={...p,angle:orbit.yaw,duration:4200,until:performance.now()+4200,title:newStage===3?'Le pays retrouve sa lumière':newStage===2?'Un quartier reprend vie':'Le lieu se souvient',detail:newStage===2?'Ton groupe peut maintenant se préparer ici.':'Les habitants retrouvent leur histoire.'};clearInput();}syncEscort();stats=teamStats(save);landscape?.update(save);if(models&&JSON.stringify(save.adventure.avatar)!==avatarKey){hero?.dispose();avatar?.removeFromParent();hero=createLivingActor(models.living,{avatar:save.adventure.avatar,scale:2.2,onError});avatar=hero.object;root.add(avatar);avatarKey=JSON.stringify(save.adventure.avatar);}hero?.setColor(save.adventure.cosmetic!=='voyageur'?COSMETICS.find(c=>c.id===save.adventure.cosmetic)?.color:null);items=landscapeItems(region,save);if(models)for(const item of items){if(!['echo','patrol'].includes(item.type)||previousItems.find(i=>i.id===item.id)?.card===item.card)continue;const old=actors.find(a=>a.itemId===item.id);if(old){old.controller.object.removeFromParent();old.controller.dispose();actors=actors.filter(a=>a!==old);}itemVisuals.set(item.id,[makeActor(item)]);}needsRender=true;},
  travel(id){if(models)rebuild(countryById[id]?id:'hub');},
  interact,
  waypoint(item,walk=false){if(!item)return;waypoint=item;needsRender=true;if(walk)startRoute(item,true);},
  cooldown(id){cooldowns.set(id,Date.now()+90000);},
  destroy(){disposed=true;daylight?.dispose();escort?.dispose();hero?.dispose();landscape?.dispose();actors.forEach(a=>a.controller.dispose());models?.dispose();cancelAnimationFrame(raf);observer.disconnect();resources.forEach(r=>r.dispose());Object.values(geometry).forEach(g=>g.dispose());renderer.dispose();canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',context);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('webglcontextlost',lost);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',hidden);},
 };
}
