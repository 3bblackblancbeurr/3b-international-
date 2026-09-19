import {createPartyActors} from './party-actors.js';
import {createCombatTelegraph} from './combat-telegraph.js';
import {createWorldPost} from './postprocessing.js';
import {createWorldSky} from './sky.js';
import {createMovementFrame,followMovement,viewBearing} from './camera-follow.js';
import {combatCue,createCombatEffects} from './combat-effects.js';
import {LANDMARK_SITE} from './heritage.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadWorldModels} from './models.js';
import {createLivingActor} from './living.js';
import {DEFAULT_ORBIT,restoreOrbit,rotateOrbit,zoomOrbit,orbitView} from './orbit.js';
import {advanceMotion,pointerStick,createQualityController,createMotionSmoother} from './motion.js';
import {movementHeading} from './heading.js';
import {COUNTRIES,countryById,cardById} from './catalog.js';
import {createPortalFrame} from './portals.js';
import {createDaylight} from './daylight.js';
import {districtAt} from './settlements.js';
import {toLandscape} from './terrain.js';
import {createLandscape} from './landscape.js';
import {WORLD_RADIUS,BIOMES,randomFor} from './terrain.js';
import {worldRuntimeItems} from './runtime-items.js';
import {COSMETICS} from './chapters.js';
import {findPath,findInteractionPath} from './navigation.js';
import {distance,nearestInteraction,teamStats} from './rules.js';
import {hubNpcPose} from './hub/npc-motion.js';
import {routePose} from './hub/transport-motion.js';

export function createWorldScene(canvas,{save,onSnapshot,onInteract,onActivity,onError,onLoadState,onStep,onCombatStep,onTransitComplete}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 const quality=createQualityController();renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.localClippingEnabled=true;
 renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.04;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.3,1200),sky=createWorldSky(renderer,texture=>{scene.environment=texture;});scene.add(sky.root);const post=createWorldPost(renderer,scene,camera);renderer.info.autoReset=false;
 const hemi=new THREE.HemisphereLight(0xdcefff,0x61736b,1.1);scene.add(hemi);const fill=new THREE.DirectionalLight('#d9edff',.22);fill.position.set(-30,25,-40);scene.add(fill);
 const sun=new THREE.DirectionalLight(0xffe5bd,2.4);scene.add(sun,sun.target);sun.castShadow=true;
 const portraitLight=new THREE.DirectionalLight('#fff1dc',.22);scene.add(portraitLight,portraitLight.target);
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:1,far:130});sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;sun.shadow.radius=3;sun.shadow.camera.updateProjectionMatrix();
 const cameraTarget=new THREE.Vector3(),desiredTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),screenPoint=new THREE.Vector3();
 const screenAnchor=p=>{screenPoint.copy(p);screenPoint.y+=4.5;screenPoint.project(camera);return{x:(screenPoint.x+1)*50,y:(1-screenPoint.y)*50};};
 let root=new THREE.Group(),resources=[],animations=[],obstacles=[],items=[],region=save.region,position={x:0,z:5},heading=180,target=null,waypoint=null,route=[];
 let paused=false,presentation=null,disposed=false,held=null,stick={x:0,z:0},keys=new Set(),moving=false,elapsed=0,last=performance.now(),report=0,raf,frames=0,frameTime=0,qualityWarmupUntil=0,fps=60,shadowAt=0;
 let avatar,companion,focusRing,waypointRing,effect,portalMaterials=[],cooldowns=new Map(),itemVisuals=new Map(),cameraMode=0,feedbackAt=-100,feedbackAction='';
 let stats=teamStats(save),models=null,hero=null,landscape=null,actors=[],hubNpcActors=[],hubVehicles=[],stepDistance=0,needsRender=true,materialCache=new Map(),battleTarget=null;
 let escort=null,escortId=null,trail=[],shot=null,daylight=null,retaliationPlayed=true;
 let partyActors=null,latestPeers=[],partyState=null;
 let fieldRival=null,combatDistance=Infinity,combatClock=0,combatButton=null;
 const combatInput={x:0,z:0};
 let qualityMode='auto',cameraFollow=true,manualCameraAt=-Infinity,travelTimer=null,routeSprintUntil=0,lastGroundTapAt=-Infinity,lastCameraTapAt=-Infinity,transit=null;
 try{cameraFollow=localStorage.getItem('3b-world-camera-follow')!=='false';}catch{}
 const movementFrame=createMovementFrame(),motionSmoother=createMotionSmoother();
 let orbit={...DEFAULT_ORBIT},orbitHeld=null,avatarKey='';try{orbit=restoreOrbit(JSON.parse(localStorage.getItem('3b-world-camera')));}catch{}
 const rememberCamera=()=>{try{localStorage.setItem('3b-world-camera',JSON.stringify({...orbit,version:2}));}catch{}};const touchPoints=new Map();let pinchDistance=null;
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const combatFx=createCombatEffects({reducedMotion}),threat=createCombatTelegraph({reducedMotion});scene.add(combatFx.root,threat.root);let lastCombat=null;const opponentPosition=new THREE.Vector3();
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
 function syncEscort(){if(!models)return;if(save.adventure.companionHidden){escort?.object.removeFromParent();escort?.dispose();escort=null;escortId=null;trail=[];return;}const id=save.adventure.companion||save.team[0]||save.leader;if(escortId===id&&escort)return;escort?.object.removeFromParent();escort?.dispose();escortId=id;escort=createLivingActor(models.living,{card:id,scale:2,onError});escort.object.position.set(position.x+2,groundY(position.x+2,position.z+2),position.z+2);root.add(escort.object);trail=[];}
 function rebuild(nextRegion){
  onLoadState?.(true);
  partyActors?.dispose();partyActors=null;escort?.dispose();escort=null;escortId=null;shot=null;fieldRival=null;combatFx.clear();lastCombat=null;
  hero?.dispose();landscape?.dispose();actors.forEach(a=>a.controller.dispose());actors=[];hubNpcActors=[];hubVehicles=[];scene.remove(root);resources.forEach(r=>r.dispose());resources=[];materialCache=new Map();root=new THREE.Group();scene.add(root);animations=[];portalMaterials=[];obstacles=[];itemVisuals=new Map();battleTarget=null;
  region=nextRegion;items=worldRuntimeItems(region,save);position={x:0,z:5};heading=180;target=null;route=[];waypoint=null;transit=null;clearInput();
  const hubFog=region==='hub'&&items.some(item=>item.eventId==='dock_fog'),hubRain=region==='hub'&&items.some(item=>item.eventId==='heavy_rain_echo');
  const c=countryById[region],biome=BIOMES[region],rng=randomFor(biome.seed),accent=c?.color||'#e4cd94';
  scene.background=new THREE.Color(biome.sky);sky.setRegion(biome);scene.fog=new THREE.Fog(hubFog?0x8aa6b2:0xbacdd6,hubFog?70:220,hubFog?330:780);hemi.color.set(biome.sky).lerp(new THREE.Color('#ffffff'),.5);hemi.intensity=.55;sun.intensity=3.5;
  daylight?.dispose();daylight=createDaylight(renderer,biome);scene.environment=sky.environment||daylight.texture;scene.environmentIntensity=.55;
  landscape=createLandscape(models,region,save,error=>{console.error(error);onError('Un élément du quartier n’a pas pu être chargé. Recharge pour reprendre.');});const currentLandscape=landscape;landscape.ready.then(()=>{if(!disposed&&landscape===currentLandscape)onLoadState?.(false);});landscape.setQuality(qualityMode);root.add(landscape.root);obstacles.push(...landscape.collisions);landscape.setParty(partyState);partyActors=createPartyActors(models,root,groundY,onError);partyActors.setPeers(latestPeers);
  const stone=material(c?.stone||'#cfc7ae'),gold=material(accent,{emissive:accent,emissiveIntensity:.22,metalness:.4});
  for(const item of items){
   if(item.type==='portal'){portal(item);continue;}
   if(item.type==='hubBuilding'){
    const y=groundY(item.x,item.z),wall=material(item.tier===0?'#263744':item.tier===1?'#1d2b36':'#17232d',{metalness:.22,roughness:.68}),trim=material(item.tier===0?'#d6b46a':'#00a8ff',{emissive:item.tier===0?'#d6b46a':'#00a8ff',emissiveIntensity:.18,metalness:.5});
    const body=mesh('box',wall,item.x,y+item.height/2,item.z,item.width,item.height,item.depth);
    const crown=mesh('box',trim,item.x,y+item.height+.16,item.z,item.width*1.04,.28,item.depth*1.04);
    const door=mesh('box',trim,item.x,y+1.15,item.z+item.depth/2+.04,1.15,2.3,.08);
    obstacles.push({x:item.x,z:item.z,r:Math.max(2.8,Math.hypot(item.width,item.depth)*.34)});itemVisuals.set(item.id,[body,crown,door]);continue;
   }
   if(item.type==='hubNpc'){
    const y=groundY(item.x,item.z),rarity={common:'#c9d1d9',rare:'#00a8ff',epic:'#9b6cff',legendary:'#d6b46a',unique:'#ffffff'}[item.rarity]||'#c9d1d9';
    item.homeX=item.x;item.homeZ=item.z;
    const body=mesh('cylinder',material(rarity,{emissive:rarity,emissiveIntensity:.08}),item.x,y+1.05,item.z,.42,1.35,.42);
    const head=mesh('sphere',material('#c9a987'),item.x,y+2.25,item.z,.38,.42,.38);
    hubNpcActors.push({item,body,head});itemVisuals.set(item.id,[body,head]);continue;
   }
   if(item.type==='hubMission'){
    const y=groundY(item.x,item.z),mat=material(item.importance==='major'?'#d6b46a':'#00a8ff',{emissive:item.importance==='major'?'#d6b46a':'#00a8ff',emissiveIntensity:.5,metalness:.45});
    const ob=mesh('sphere',mat,item.x,y+1.35,item.z,.34,.65,.34);animations.push({mesh:ob,type:'float',y:y+1.35,itemId:item.id});
    const ring=mesh('ring',mat,item.x,y+.08,item.z,.9,.9,.9);ring.rotation.x=-Math.PI/2;itemVisuals.set(item.id,[ob,ring]);continue;
   }
   if(item.type==='hubTransport'){
    const y=groundY(item.x,item.z),color=item.transport==='train'?'#d6b46a':'#00a8ff',mat=material(color,{emissive:color,emissiveIntensity:.3,metalness:.5});
    const pylon=mesh('cylinder',mat,item.x,y+.9,item.z,.3,1.8,.3);const ring=mesh('ring',mat,item.x,y+1.9,item.z,.72,.72,.72);ring.rotation.x=Math.PI/2;itemVisuals.set(item.id,[pylon,ring]);continue;
   }
   if(item.type==='hubDistrict'){
    const y=groundY(item.x,item.z),mat=material('#d6b46a',{emissive:'#d6b46a',emissiveIntensity:.12,metalness:.4});
    const marker=mesh('cylinder',mat,item.x,y+.18,item.z,1.05,.18,1.05);itemVisuals.set(item.id,[marker]);continue;
   }
   if(item.type==='hubEvent'){
    const y=groundY(item.x,item.z),mat=material('#00a8ff',{emissive:'#00a8ff',emissiveIntensity:.65,metalness:.3});
    const core=mesh('sphere',mat,item.x,y+1.45,item.z,.46,.7,.46);const ring=mesh('ring',mat,item.x,y+.1,item.z,1.2,1.2,1.2);ring.rotation.x=-Math.PI/2;
    animations.push({mesh:core,type:'float',y:y+1.45,itemId:item.id});itemVisuals.set(item.id,[core,ring]);continue;
   }
   if(item.type==='hubSecret'){continue;}
   if(item.type==='job'||item.type==='cooperation'||item.type==='cafe'||item.type==='story'||item.type==='atelier'||item.type==='sanctuary'||item.type==='camp'||item.type==='resource'||item.type==='landmark'||item.type==='vista')continue;
   if(item.type==='survey'){const y=groundY(item.x,item.z);mesh('cylinder',stone,item.x,y+.5,item.z,.52,1,.52);const book=mesh('box',gold,item.x,y+1.15,item.z,.9,.1,.62);book.rotation.x=.25;obstacles.push({x:item.x,z:item.z,r:.65});continue;}
   if(item.type==='final'){const actor=createLivingActor(models.living,{card:'C164',scale:3.1,onError});actor.object.position.set(item.x,groundY(item.x,item.z),item.z);actor.object.visible=false;root.add(actor.object);actors.push({controller:actor,itemId:'final',creature:true,x:item.x,z:item.z});continue;}
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
  if(region==='hub'){
   for(const spec of [{transport:'train',cycle:38,color:'#d6b46a',height:1.15,scale:[1.25,.78,3.8]},{transport:'boat',cycle:52,color:'#00a8ff',height:.5,scale:[1.15,.45,2.2]}]){
    const stops=items.filter(i=>i.type==='hubTransport'&&i.transport===spec.transport).sort((a,b)=>a.stopIndex-b.stopIndex);
    if(stops.length>1){
     const vehicle=mesh('box',material(spec.color,{emissive:spec.color,emissiveIntensity:.18,metalness:.5}),stops[0].x,groundY(stops[0].x,stops[0].z)+spec.height,stops[0].z,...spec.scale);
     hubVehicles.push({vehicle,stops,...spec});
    }
   }
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
  if(hubRain){
   const rainCount=qualityMode==='fluid'?90:160,rainCoords=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){rainCoords[i*3]=(rng()-.5)*150;rainCoords[i*3+1]=4+rng()*34;rainCoords[i*3+2]=(rng()-.5)*150;}
   const rainGeo=register(new THREE.BufferGeometry());rainGeo.setAttribute('position',new THREE.BufferAttribute(rainCoords,3));
   const rain=new THREE.Points(rainGeo,register(new THREE.PointsMaterial({size:.075,color:'#8bdcff',transparent:true,opacity:.48,depthWrite:false})));root.add(rain);animations.push({mesh:rain,type:'rain'});
  }
  // A resumed encounter starts next to its saved opponent, not at the country
  // entrance. Keep the same safe approach used by actual walking.
  const encounter=save.adventure.encounter;
  if(encounter?.field)position={...encounter.field.p};
  if(encounter&&!encounter.field){const opponent=encounter.final?items.find(i=>i.type==='final'):encounter.patrol?items.find(i=>i.type==='patrol'):items.find(i=>i.card===encounter.card);if(opponent){const approach=findInteractionPath(position,opponent,obstacles,WORLD_RADIUS).at(-1);if(approach)position={...approach};battleTarget=opponent;}}
  // Frame the country's own landmark on arrival, while keeping chosen zoom.
  if(cameraFollow){const vista=region==='hub'?{x:0,z:-8}:toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z);orbit={...orbit,yaw:Math.atan2(position.x-vista.x,position.z-vista.z)};heading=((-orbit.yaw*180/Math.PI)%360+360)%360;avatar.rotation.y=orbit.yaw+Math.PI;}
  const view=orbitView(orbit,position,groundY(position.x,position.z),camera.aspect<.85,groundY);camera.position.copy(view.position);cameraTarget.copy(view.target);camera.lookAt(cameraTarget);report=0;needsRender=true;batchStatic();last=performance.now();frames=0;frameTime=0;qualityWarmupUntil=last+3000;
 }
 function resize(){const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setPixelRatio(quality.ratio(width,height,devicePixelRatio||1));renderer.setSize(width,height,false);needsRender=true;camera.aspect=width/height;camera.updateProjectionMatrix();post.resize(width,height,renderer.getPixelRatio(),qualityMode);}}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 function startRoute(destination,interaction=false,run=false){motionSmoother.reset();route=(interaction?findInteractionPath:findPath)(position,destination,obstacles,WORLD_RADIUS);target=route.shift()||null;routeSprintUntil=run?performance.now()+2200:0;needsRender=true;}
 function transitDestination(item){
  if(item.targetDistrict&&Number.isFinite(item.targetX)&&Number.isFinite(item.targetZ))return {x:item.targetX,z:item.targetZ,district:item.targetDistrict};
  const stops=items.filter(candidate=>candidate.type==='hubTransport'&&candidate.transport===item.transport&&Number.isInteger(candidate.stopIndex)).sort((a,b)=>a.stopIndex-b.stopIndex);
  if(stops.length<2)return null;const index=stops.findIndex(stop=>stop.id===item.id),next=stops[(Math.max(0,index)+1)%stops.length];return next?{x:next.x,z:next.z,district:next.district}:null;
 }
 function rideTransport(item){
  if(region!=='hub'||transit||item?.type!=='hubTransport')return null;
  const to=transitDestination(item);if(!to)return null;
  clearInput();const duration={train:4200,boat:5200,telepheric:4600,zipline:2600}[item.transport]||3600,height={train:.8,boat:.35,telepheric:13,zipline:8}[item.transport]||0;
  transit={item,from:{...position},to,duration,height,started:performance.now(),progress:0};needsRender=true;onActivity?.();
  return {transport:item.transport,transitId:item.transitId,from:item.district,to:to.district,duration};
 }
 function clearInput(){keys.clear();stick={x:0,z:0};held=null;orbitHeld=null;touchPoints.clear();pinchDistance=null;target=null;route=[];routeSprintUntil=0;movementFrame.reset();motionSmoother.reset();}
 function down(e){
  if(paused||transit||!landscape||e.button>2)return;e.preventDefault();onActivity();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
  const rect=canvas.getBoundingClientRect(),cameraTouch=e.pointerType==='touch'&&e.clientX-rect.left>=rect.width*.52;
  if(e.button===2||cameraTouch){touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!orbitHeld)orbitHeld={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false};if(touchPoints.size===2){const p=[...touchPoints.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}return;}
  if(held)return;held={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),drag:false,run:false};target=null;route=[];
 }
 function move(e){
  if(touchPoints.has(e.pointerId)){touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});onActivity();needsRender=true;manualCameraAt=performance.now();
   if(touchPoints.size===2){const p=[...touchPoints.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance!==null)orbit=zoomOrbit(orbit,(pinchDistance-distance)*5);pinchDistance=distance;if(orbitHeld){orbitHeld.drag=true;const q=touchPoints.get(orbitHeld.id);if(q){orbitHeld.x=q.x;orbitHeld.y=q.y;}}return;}
   if(orbitHeld?.id===e.pointerId){const dx=e.clientX-orbitHeld.x,dy=e.clientY-orbitHeld.y;orbit=rotateOrbit(orbit,dx,dy);orbitHeld.x=e.clientX;orbitHeld.y=e.clientY;if(Math.hypot(e.clientX-orbitHeld.startX,e.clientY-orbitHeld.startY)>7)orbitHeld.drag=true;}return;
  }
  if(!held||held.id!==e.pointerId)return;const dx=e.clientX-held.x,dy=e.clientY-held.y,len=Math.hypot(dx,dy);if(len>10)held.drag=true;held.run=len>68;stick=pointerStick(dx,dy);onActivity();
 }
 function pointRoute(e,run=false){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(landscape.ground,false)[0];if(hit){const p=hit.point,r=Math.hypot(p.x,p.z),scale=Math.min(1,(WORLD_RADIUS-2)/r);startRoute({x:p.x*scale,z:p.z*scale},false,run);}}
 function up(e){
  rememberCamera();
  if(touchPoints.has(e.pointerId)){
   const cameraTap=orbitHeld?.id===e.pointerId&&!orbitHeld.drag&&e.type==='pointerup'&&e.pointerType==='touch',tappedAt=performance.now();
   if(cameraTap){if(tappedAt-lastCameraTapAt<320){manualCameraAt=-Infinity;cameraFollow=true;try{localStorage.setItem('3b-world-camera-follow','true');}catch{}needsRender=true;}lastCameraTapAt=tappedAt;}
   touchPoints.delete(e.pointerId);pinchDistance=null;if(orbitHeld?.id===e.pointerId){const next=[...touchPoints.entries()][0];orbitHeld=next?{id:next[0],x:next[1].x,y:next[1].y,startX:next[1].x,startY:next[1].y,drag:true}:null;}return;
  }
  if(!held||held.id!==e.pointerId)return;
  if(!held.drag&&!paused&&e.type==='pointerup'){const tappedAt=performance.now(),run=tappedAt-lastGroundTapAt<320;lastGroundTapAt=tappedAt;pointRoute(e,run);}
  held=null;stick={x:0,z:0};
 }
 function wheel(e){if(paused)return;e.preventDefault();orbit=zoomOrbit(orbit,e.deltaY);rememberCamera();needsRender=true;onActivity();}
 const context=e=>e.preventDefault();
 function toggleCamera(){cameraMode=1-cameraMode;orbit={...orbit,distance:cameraMode?36:24,pitch:cameraMode?.5:DEFAULT_ORBIT.pitch};rememberCamera();needsRender=true;}
 function keydown(e){if(paused||transit||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','z','q','e','shift','c'].includes(key)){e.preventDefault();if(key==='c'){if(!e.repeat)toggleCamera();return;}keys.add(key);target=null;route=[];onActivity();if(key==='e'&&!e.repeat)interact();}}
 function keyup(e){keys.delete(e.key.toLowerCase());}
 function interact(){if(paused||transit)return;const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())&&!(i.type==='resource'&&i.done)));if(closest){clearInput();battleTarget=closest;onActivity();onInteract(closest);}}
 const hidden=()=>{clearInput();last=performance.now();frameTime=frames=0;needsRender=true;};
 const lost=e=>{e.preventDefault();paused=true;onError('Le rendu 3D a été interrompu. Recharge le monde pour reprendre ta sauvegarde.');};
 canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('contextmenu',context);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('webglcontextlost',lost);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',hidden);
 function tick(now){
  now=performance.now();
  if(disposed)return;raf=requestAnimationFrame(tick);const rawDt=Math.max(0,(now-last)/1000);last=now;
  const cinematic=presentation==='encounter',fieldCombat=cinematic&&!!save.adventure.encounter?.field&&!save.adventure.encounter?.result;if(shot&&now>=shot.until)shot=null;if(document.hidden||!models||!avatar||paused&&!cinematic&&!needsRender)return;
  const dt=Math.min(rawDt,.25);elapsed+=dt;let travelled=0,dx=0,dz=0;
  if(!paused&&!shot){
   if(now<qualityWarmupUntil){frames=0;frameTime=0;}else{frames++;frameTime+=rawDt;}if(frameTime>=1){fps=Math.round(frames/frameTime);if(quality.sample(fps,frameTime))resize();frames=0;frameTime=0;}
   if(transit){
    const previous=position,progress=Math.max(0,Math.min(1,(now-transit.started)/transit.duration)),smooth=progress*progress*(3-2*progress);
    position={x:transit.from.x+(transit.to.x-transit.from.x)*smooth,z:transit.from.z+(transit.to.z-transit.from.z)*smooth};transit.progress=progress;
    dx=position.x-previous.x;dz=position.z-previous.z;travelled=Math.hypot(dx,dz);moving=travelled>.001;
    if(moving){heading=movementHeading(dx,dz,heading);orbit=followMovement(orbit,dx,dz,dt,{enabled:cameraFollow,manual:false,quietFor:99,reducedMotion});}
    if(progress>=1){const done=transit;transit=null;onTransitComplete?.(done.item,{from:done.from,to:done.to});}
   }else{
   dx=stick.x+((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('q')||keys.has('arrowleft'))?1:0);
   dz=stick.z+((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('z')||keys.has('arrowup'))?1:0);
   const rawInput=movementFrame.resolve(dx,dz,viewBearing(camera.position,cameraTarget));
   ({x:dx,z:dz}=motionSmoother.update(rawInput,dt));
   const sprinting=keys.has('shift')||held?.run||target&&routeSprintUntil>now;
   const previous=position,next=advanceMotion({position,target,route},{x:dx,z:dz},dt,10.5*stats.speed*(sprinting?1.4:1),obstacles,WORLD_RADIUS);
   if(fieldCombat){
    const inputLength=Math.max(1,Math.hypot(dx,dz));combatInput.x=Math.round(dx/inputLength*1000)/1000;combatInput.z=Math.round(dz/inputLength*1000)/1000;
    if(target&&Math.hypot(dx,dz)<.05){const d=Math.hypot(target.x-position.x,target.z-position.z)||1;combatInput.x=(target.x-position.x)/d;combatInput.z=(target.z-position.z)/d;}
    combatClock+=dt;
    if(combatClock>=.1){combatClock%=.1;const kind=combatButton;combatButton=null;onCombatStep?.({...combatInput,...(kind?{kind}:{})});}
    const p=save.adventure.encounter.field.p,blend=1-Math.exp(-dt*22);position={x:position.x+(p.x-position.x)*blend,z:position.z+(p.z-position.z)*blend};
    travelled=Math.hypot(position.x-previous.x,position.z-previous.z);moving=travelled>.001;
   }else{combatClock=0;({position,target,route,travelled,moving}=next);}
   dx=position.x-previous.x;dz=position.z-previous.z;
   if(moving){const nextHeading=movementHeading(dx,dz,heading);if(Math.abs(((nextHeading-heading+540)%360)-180)>2.5)report=0;heading=nextHeading;orbit=followMovement(orbit,dx,dz,dt,{enabled:cameraFollow,manual:!!orbitHeld,quietFor:(now-manualCameraAt)/1000,reducedMotion});onActivity();stepDistance+=travelled;if(stepDistance>2.1){stepDistance=0;onStep?.(region);}}
   }
  }else moving=false;
  const y=groundY(position.x,position.z)+(transit?.height||0),age=elapsed-feedbackAt,impact=age<.28&&!reducedMotion?Math.sin(age/.28*Math.PI):0,retaliation=age>.3&&age<.62&&!reducedMotion?Math.sin((age-.3)/.32*Math.PI):0;
  avatar.position.set(position.x,y,position.z);hero.update(dt,dx,dz,travelled);
  if(region==='hub'){
   for(const actor of hubNpcActors){
    const pose=hubNpcPose(actor.item,elapsed),gy=groundY(pose.x,pose.z);actor.item.x=pose.x;actor.item.z=pose.z;
    actor.body.position.set(pose.x,gy+1.05,pose.z);actor.head.position.set(pose.x,gy+2.25,pose.z);actor.body.rotation.y=pose.heading;actor.head.rotation.y=pose.heading;
   }
   for(const vehicle of hubVehicles){
    const pose=routePose(vehicle.stops,elapsed,vehicle.cycle);if(!pose)continue;
    vehicle.vehicle.position.set(pose.x,groundY(pose.x,pose.z)+vehicle.height,pose.z);vehicle.vehicle.rotation.y=pose.heading;
   }
  }
  const encounter=save.adventure.encounter;
  let opponent=cinematic?(encounter?.final?items.find(i=>i.type==='final'):encounter?.patrol?items.find(i=>i.type==='patrol'):battleTarget?.card===encounter?.card?battleTarget:items.find(i=>i.card===encounter?.card)):null;
  if(fieldCombat&&opponent){
   fieldRival={...encounter.field.enemy,id:opponent.id};
   opponent={...opponent,x:fieldRival.x,z:fieldRival.z};
  }else if(!cinematic)fieldRival=null;
  combatDistance=opponent?Math.hypot(opponent.x-position.x,opponent.z-position.z):Infinity;hero?.setWeaponDrawn(!!opponent);
  if(opponent&&!retaliationPlayed&&age>=.32){retaliationPlayed=true;if(lastCombat?.counter){actors.find(a=>a.itemId===opponent.id)?.controller.action('Attack');if(lastCombat.incoming>0&&!lastCombat.defended)hero.action('Hit');}}
  if(opponent&&!fieldCombat){let ox=opponent.x-position.x,oz=opponent.z-position.z,d=Math.hypot(ox,oz);if(d<.01){ox=0;oz=-1;d=1;}const spacing=Math.max(0,4.5-d),approach=feedbackAction==='guard'||feedbackAction==='dodge'?0:impact*.75;avatar.position.x+=ox/d*(approach-spacing);avatar.position.z+=oz/d*(approach-spacing);if(feedbackAction==='dodge'&&!fieldCombat){avatar.position.x+=oz/d*impact*2.4;avatar.position.z-=ox/d*impact*2.4;}avatar.position.y=groundY(avatar.position.x,avatar.position.z);avatar.rotation.y=Math.atan2(ox,oz);}
  if(escort){escort.object.visible=!cinematic;const p=escort.object.position;if(travelled>.05&&(!trail.length||Math.hypot(trail.at(-1).x-position.x,trail.at(-1).z-position.z)>1))trail.push({...position});while(trail.length>65)trail.shift();while(trail.length>3&&Math.hypot(trail[0].x-p.x,trail[0].z-p.z)<1.3)trail.shift();const goal=trail.length>3?trail[0]:null,old={x:p.x,z:p.z};if(goal&&!paused&&!shot){const result=advanceMotion({position:old,target:goal,route:[]},{x:0,z:0},dt,Math.max(11,10.5*stats.speed*1.6),obstacles,WORLD_RADIUS);p.set(result.position.x,groundY(result.position.x,result.position.z),result.position.z);}escort.update(dt,p.x-old.x,p.z-old.z,Math.hypot(p.x-old.x,p.z-old.z));if(Math.hypot(p.x-position.x,p.z-position.z)>40){p.set(position.x,y,position.z);trail=[];}}
  const wide=cameraMode===1,portrait=camera.aspect<.85;
  if(opponent&&!fieldCombat){const mx=(avatar.position.x+opponent.x)/2,mz=(avatar.position.z+opponent.z)/2,my=(avatar.position.y+groundY(opponent.x,opponent.z))/2;desiredTarget.set(mx,my+1.8,mz);desiredCamera.set(mx+(portrait?12:15),my+(portrait?14:11),mz+(portrait?20:18));}
  else{const view=orbitView(orbit,position,y,portrait,groundY);desiredTarget.copy(view.target);desiredCamera.copy(view.position);}
  if(shot&&(!reducedMotion||shot.heritage)){const age=1-(shot.until-now)/shot.duration,a=shot.angle+(reducedMotion?0:age*.28);desiredTarget.set(shot.x,groundY(shot.x,shot.z)+(shot.heritage?28:2),shot.z);const radius=shot.heritage?(portrait?118:106):23;desiredCamera.set(shot.x+Math.sin(a)*radius,groundY(shot.x,shot.z)+(shot.heritage?36:14),shot.z+Math.cos(a)*radius);}

  const smoothing=1-Math.exp(-dt*(reducedMotion?20:7));camera.position.lerp(desiredCamera,smoothing);cameraTarget.lerp(desiredTarget,smoothing);camera.lookAt(cameraTarget);landscape.updateCamera(camera.position,cameraTarget,!shot?.heritage);
  portraitLight.position.copy(camera.position);portraitLight.position.y+=5;portraitLight.target.position.copy(avatar.position);portraitLight.target.position.y+=1.5;
  sun.position.set(position.x-38,y+54,position.z+35);sun.target.position.set(position.x,y,position.z);portalMaterials.forEach(mat=>mat.uniforms.time.value=elapsed);
  for(const a of animations){if(a.type==='float'){a.mesh.position.y=a.y+Math.sin(elapsed*1.5+a.mesh.position.x)*.15;a.mesh.rotation.y+=dt*.3;}if(a.type==='shadow')a.mesh.position.set(avatar.position.x,avatar.position.y+.07,avatar.position.z);if(a.type==='particles')a.mesh.rotation.y=Math.sin(elapsed*.04)*.03;if(a.type==='rain'){const attr=a.mesh.geometry.attributes.position,array=attr.array;for(let i=1;i<array.length;i+=3){array[i]-=dt*19;if(array[i]<0)array[i]=28+((i*17)%11);}attr.needsUpdate=true;}}
  partyActors?.tick(dt,region);landscape.tick(elapsed,dt,position);landscape.updateDistrict(camera,position);
  for(const a of actors){const object=a.controller.object,active=cinematic&&opponent?.id===a.itemId;object.visible=a.itemId==='final'?active:active||!(cooldowns.get(a.itemId)>Date.now());if(!object.visible)continue;const previous=object.position.clone(),wander=!active&&!paused?Math.sin(elapsed*.28+a.x)*.6:0;const ax=active?opponent.x:a.x+wander,az=active?opponent.z:a.z;object.position.set(ax,groundY(ax,az),az);const movement=object.position.distanceTo(previous);a.controller.update(dt,object.position.x-previous.x,object.position.z-previous.z,movement);if(active){const d=Math.hypot(position.x-ax,position.z-az)||1;const response=lastCombat?.counter?retaliation:0;object.position.x+=(position.x-ax)/d*response*.9;object.position.z+=(position.z-az)/d*response*.9;object.rotation.y=Math.atan2(position.x-ax,position.z-az);object.rotation.z=lastCombat?.outgoing?impact*.06:0;}else object.rotation.z=0;}
  if(opponent){opponentPosition.set(opponent.x,groundY(opponent.x,opponent.z),opponent.z);combatFx.update(elapsed,avatar.position,opponentPosition);}else combatFx.clear();
  threat.update(opponent?encounter:null,elapsed,avatar.position,opponentPosition,combatFx.state.active);
  const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())&&!(i.type==='resource'&&i.done)));
  focusRing.visible=!!closest&&!paused&&!transit;if(closest)focusRing.position.set(closest.x,groundY(closest.x,closest.z)+.09,closest.z);
  waypointRing.visible=!!waypoint&&!paused&&distance(position,waypoint)>7;if(waypoint)waypointRing.position.set(waypoint.x,groundY(waypoint.x,waypoint.z)+.1,waypoint.z);
  effect.visible=!lastCombat&&age<.65;if(effect.visible){effect.position.set(avatar.position.x,avatar.position.y+.15,avatar.position.z);effect.scale.setScalar(1+age*6);effect.material.opacity=Math.max(0,1-age/.65)*.7;effect.material.color.set(feedbackAction==='guard'?'#a2dff0':'#ffe0a0');}
  if(renderer.shadowMap.enabled&&(needsRender||now-shadowAt>=50)){renderer.shadowMap.needsUpdate=true;shadowAt=now;}
  sky.update(camera,reducedMotion?0:elapsed);renderer.info.reset();post.render(dt);report-=dt;
  if(report<=0||needsRender){report=(moving||held?.drag)?.1:.4;onSnapshot({architecture:landscape.architectureDiagnostics,interior:landscape.interior?.id||null,combat:opponent?{distance:combatDistance,hero:screenAnchor(avatar.position),enemy:screenAnchor(opponentPosition)}:null,cinematic:shot?{title:shot.title,detail:shot.detail}:null,transit:transit?{name:transit.item.name,transport:transit.item.transport,progress:transit.progress}:null,companion:escortId,region,district:districtAt(region,position,(x,z)=>toLandscape(region,x,z)),position:{...position},heading,camera:{...orbit,yaw:viewBearing(camera.position,cameraTarget),follow:cameraFollow,actualDistance:camera.position.distanceTo(cameraTarget)},near:closest,moving,fps,drawCalls:renderer.info.render.calls,ambientOcclusion:post.enabled,resolution:Math.round(renderer.getPixelRatio()*100),waypoint,remaining:waypoint?Math.round(distance(position,waypoint)):null,joystick:held?.drag?{x:held.x,y:held.y,dx:stick.x*26,dy:stick.z*26}:null});}
  needsRender=false;
 }
 onLoadState?.(true);
 loadWorldModels().then(value=>{if(disposed){value.dispose();return;}models=value;rebuild(region);resize();last=performance.now();}).catch(error=>{if(!disposed){console.error('[3B world models]',error);paused=true;onError('Les modèles 3D n’ont pas pu être chargés. Recharge le monde pour réessayer.');}});
 resize();raf=requestAnimationFrame(tick);
 return{
  setPeers(peers){latestPeers=peers;partyActors?.setPeers(peers);},
  setParty(party){partyState=party;landscape?.setParty(party);},
  combatAction(kind){combatButton=kind;combatClock=.1;},
  canBattle(action){return !['strike','power','wait'].includes(action)||combatDistance<=(action==='power'?22:action==='wait'?8:7.5);},
  setPaused(value){paused=value;needsRender=true;last=performance.now();frames=frameTime=0;if(value)clearInput();},
  setPresentation(value){presentation=value;if(value!=='encounter')combatFx.clear();needsRender=true;},
  feedback(type,action,previous,next){if(type==='field'){const f=next?.adventure.encounter?.field;if(!f?.last)return;action=f.last;type='battle';}if(['battle','beacon','pact','restore','power','help'].includes(type)){feedbackAt=elapsed;feedbackAction=action||type;lastCombat=null;if(!next?.adventure.encounter?.field&&type==='battle'&&action==='dodge'&&fieldRival){const x=position.x-fieldRival.x,z=position.z-fieldRival.z,len=Math.hypot(x,z)||1;const dodge=advanceMotion({position,target:null,route:[]},{x:z/len,z:-x/len},.2,20,obstacles,WORLD_RADIUS);position=dodge.position;}if(type==='battle'){lastCombat=combatCue(previous?.adventure.encounter,next?.adventure.encounter,action,next?.adventure.avatar);combatFx.start(lastCombat,elapsed);retaliationPlayed=false;hero?.action(action==='enemy'?'Hit':action==='guard'||action==='dodge'||action==='wait'||action==='miss'?'Idle':action==='power'||action==='support'||action==='trap'?'Cast':'Attack');const e=next?.adventure.encounter,rival=actors.find(a=>a.itemId===battleTarget?.id||(!battleTarget&&a.itemId===items.find(i=>e?.patrol?i.type==='patrol':i.card===e?.card)?.id));if(lastCombat?.outgoing)rival?.controller.action(e?.result==='victory'?'Death':'Hit');}else if(type==='power')hero?.action('Cast');needsRender=true;}},
  inspectLandmark(){if(region==='hub')return;const p=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z);shot={...p,angle:-BIOMES[region].angle+.35,duration:6500,until:performance.now()+6500,heritage:true,title:'Le patrimoine du pays',detail:'Vue du monument · reprendre quand tu veux'};clearInput();needsRender=true;},
  skipCinematic(){shot=null;needsRender=true;},
  retreat(encounter){const rival=battleTarget||items.find(i=>i.card===encounter.card||encounter.patrol&&i.type==='patrol');if(!rival)return;let x=position.x-rival.x,z=position.z-rival.z,len=Math.hypot(x,z);if(len<.01){x=0;z=1;len=1;}startRoute({x:position.x+x/len*9,z:position.z+z/len*9});},
  toggleCamera,
  setCameraFollow(value){cameraFollow=!!value;if(!cameraFollow)orbit={...orbit,yaw:viewBearing(camera.position,cameraTarget)};rememberCamera();try{localStorage.setItem('3b-world-camera-follow',String(cameraFollow));}catch{}needsRender=true;},
  setQuality(mode){qualityMode=mode;quality.setMode(mode);landscape?.setQuality(mode);renderer.shadowMap.enabled=mode!=='fluid';const size=mode==='detail'?2048:1024;if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;}resize();},
  setSave(value){if(value===save)return;const oldField=save.adventure.encounter?.field,newField=value.adventure.encounter?.field;if(newField&&!oldField){position={...newField.p};combatClock=0;combatButton=null;}if(oldField&&newField&&!value.adventure.encounter.result&&value.region===region){save=value;needsRender=true;return;}const previousItems=items,oldStage=save.adventure.chapters[region]?.restored||0;save=value;const newStage=save.adventure.chapters[region]?.restored||0;if(newStage>oldStage&&models&&!reducedMotion){const p=toLandscape(region,...(newStage===3?[LANDMARK_SITE.x,LANDMARK_SITE.z]:newStage===2?[29,15]:[11,-4]));shot={...p,angle:orbit.yaw,duration:4200,until:performance.now()+4200,heritage:newStage===3,title:newStage===3?'Le pays retrouve sa lumière':newStage===2?'Un quartier reprend vie':'Le lieu se souvient',detail:newStage===2?'Ton groupe peut maintenant se préparer ici.':'Les habitants retrouvent leur histoire.'};clearInput();}syncEscort();stats=teamStats(save);landscape?.update(save);if(models&&JSON.stringify(save.adventure.avatar)!==avatarKey){hero?.dispose();avatar?.removeFromParent();hero=createLivingActor(models.living,{avatar:save.adventure.avatar,scale:2.2,onError});avatar=hero.object;root.add(avatar);avatarKey=JSON.stringify(save.adventure.avatar);}hero?.setColor(save.adventure.cosmetic!=='voyageur'?COSMETICS.find(c=>c.id===save.adventure.cosmetic)?.color:null);items=worldRuntimeItems(region,save);if(models)for(const item of items){if(!['echo','patrol'].includes(item.type)||previousItems.find(i=>i.id===item.id)?.card===item.card)continue;const old=actors.find(a=>a.itemId===item.id);if(old){old.controller.object.removeFromParent();old.controller.dispose();actors=actors.filter(a=>a!==old);}itemVisuals.set(item.id,[makeActor(item)]);}needsRender=true;},
  rideTransport(item){return rideTransport(item);},
  travel(id){if(!models)return;clearTimeout(travelTimer);paused=true;clearInput();onLoadState?.(true);travelTimer=setTimeout(()=>{if(disposed)return;try{rebuild(countryById[id]?id:'hub');paused=false;needsRender=true;}catch(error){console.error('[3B travel]',error);avatar=null;onLoadState?.(false);onError('Ce pays n’a pas pu être chargé. Recharge le monde pour reprendre.');}},0);},
  interact,
  waypoint(item,walk=false){if(!item)return;waypoint=item;needsRender=true;if(walk)startRoute(item,true);},
  cooldown(id){cooldowns.set(id,Date.now()+90000);},
  destroy(){clearTimeout(travelTimer);partyActors?.dispose();disposed=true;post.dispose();sky.dispose();combatFx.dispose();threat.dispose();daylight?.dispose();escort?.dispose();hero?.dispose();landscape?.dispose();actors.forEach(a=>a.controller.dispose());models?.dispose();cancelAnimationFrame(raf);observer.disconnect();resources.forEach(r=>r.dispose());Object.values(geometry).forEach(g=>g.dispose());renderer.dispose();canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',context);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('webglcontextlost',lost);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',hidden);},
 };
}
