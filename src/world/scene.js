import {createPartyActors} from './party-actors.js';
import {createCombatTelegraph} from './combat-telegraph.js';
import {createWorldPost} from './postprocessing.js';
import {cinemaProfile} from './cinematic-director.js';
import {cinematicReturnView} from './cinematic-camera.js';
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
import {worldRadiusFor,BIOMES,randomFor} from './terrain.js';
import {worldRuntimeItems} from './runtime-items.js';
import {COSMETICS} from './chapters.js';
import {findPath,findInteractionPath} from './navigation.js';
import {distance,nearestInteraction,teamStats} from './rules.js';
import {hubNpcPose,npcSimulationTier} from './hub/npc-motion.js';
import {routePose} from './hub/transport-motion.js';
import {worldTimeSnapshot} from './world-time.js';
import {streamingProfile,lodForDistance} from './streaming.js';
import {worldWeatherForDate,weatherProfile} from './world-weather.js';
import {buildPremiumHubRoad,decorateHubBuilding,createPremiumTrafficVehicle,createPremiumTransportVisual,createPremiumHubMarker,createPremiumTransitVehicle} from './premium-hub-visuals.js';

export function createWorldScene(canvas,{save,onSnapshot,onInteract,onActivity,onError,onLoadState,onStep,onCombatStep}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 const quality=createQualityController();renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.localClippingEnabled=true;
 renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.04;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.3,1800),sky=createWorldSky(renderer,texture=>{scene.environment=texture;});scene.add(sky.root);const post=createWorldPost(renderer,scene,camera);renderer.info.autoReset=false;
 const hemi=new THREE.HemisphereLight(0xdcefff,0x61736b,1.1);scene.add(hemi);const fill=new THREE.DirectionalLight('#d9edff',.22);fill.position.set(-30,25,-40);scene.add(fill);
 const sun=new THREE.DirectionalLight(0xffe5bd,2.4);scene.add(sun,sun.target);sun.castShadow=true;
 const portraitLight=new THREE.DirectionalLight('#fff1dc',.22);scene.add(portraitLight,portraitLight.target);
 const cinematicBlue=new THREE.PointLight('#58d1ff',0,34,2),cinematicGold=new THREE.PointLight('#e0c486',0,28,2);scene.add(cinematicBlue,cinematicGold);
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:1,far:130});sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;sun.shadow.radius=3;sun.shadow.camera.updateProjectionMatrix();
 const cameraTarget=new THREE.Vector3(),desiredTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),screenPoint=new THREE.Vector3();
 const screenAnchor=p=>{screenPoint.copy(p);screenPoint.y+=4.5;screenPoint.project(camera);return{x:(screenPoint.x+1)*50,y:(1-screenPoint.y)*50};};
 let root=new THREE.Group(),resources=[],animations=[],obstacles=[],items=[],region=save.region,worldRadius=worldRadiusFor(save.region),position={x:0,z:5},heading=180,target=null,waypoint=null,route=[];
 let paused=false,presentation=null,disposed=false,held=null,stick={x:0,z:0},keys=new Set(),moving=false,elapsed=0,last=performance.now(),report=0,raf,frames=0,frameTime=0,qualityWarmupUntil=0,fps=60,shadowAt=0;
 let avatar,companion,focusRing,waypointRing,effect,cinematicFx=null,portalMaterials=[],cooldowns=new Map(),itemVisuals=new Map(),cameraMode=0,feedbackAt=-100,feedbackAction='';
 let stats=teamStats(save),models=null,hero=null,landscape=null,actors=[],hubNpcActors=[],hubVehicles=[],stepDistance=0,needsRender=true,materialCache=new Map(),battleTarget=null;
 let escort=null,escortId=null,trail=[],shot=null,daylight=null,retaliationPlayed=true;
 let partyActors=null,latestPeers=[],partyState=null;
 let fieldRival=null,combatDistance=Infinity,combatClock=0,combatButton=null;
 const combatInput={x:0,z:0};
 let qualityMode='auto',cameraFollow=true,manualCameraAt=-Infinity,travelTimer=null,transportRide=null,routeSprintUntil=0,lastGroundTapAt=-Infinity,lastCameraTapAt=-Infinity,lastWorldTimeAt=0,lastStreamingAt=0,lastNpcUpdateAt=0,worldTime=worldTimeSnapshot(),weather=worldWeatherForDate(save.region,new Date()),weatherState=weatherProfile(weather),weatherFx=null,weatherPositions=null;
 try{cameraFollow=localStorage.getItem('3b-world-camera-follow')!=='false';}catch{}
 const movementFrame=createMovementFrame(),motionSmoother=createMotionSmoother();
 let orbit={...DEFAULT_ORBIT},orbitHeld=null,avatarKey='';try{orbit=restoreOrbit(JSON.parse(localStorage.getItem('3b-world-camera')));}catch{}
 const rememberCamera=()=>{try{localStorage.setItem('3b-world-camera',JSON.stringify({...orbit,version:2}));}catch{}};const touchPoints=new Map();let pinchDistance=null;
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const combatFx=createCombatEffects({reducedMotion}),threat=createCombatTelegraph({reducedMotion});scene.add(combatFx.root,threat.root);let lastCombat=null;const opponentPosition=new THREE.Vector3();
 const register=asset=>(resources.push(asset),asset),sceneWetness={value:.06},sceneDaylight={value:1};
 const material=(color,extra={})=>{const key=JSON.stringify([color,extra]);if(!materialCache.has(key)){
  const m=new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.08,...extra});
  if(!extra.transparent){const previous=m.onBeforeCompile.bind(m);m.onBeforeCompile=shader=>{previous(shader);shader.uniforms.sceneWetness=sceneWetness;shader.uniforms.sceneDaylight=sceneDaylight;shader.vertexShader='varying vec3 sceneSurfacePos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsceneSurfacePos=(modelMatrix*vec4(position,1.)).xyz;');shader.fragmentShader='varying vec3 sceneSurfacePos;uniform float sceneWetness;uniform float sceneDaylight;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float sNoise=fract(sin(dot(floor(sceneSurfacePos.xz*2.1),vec2(12.9898,78.233)))*43758.5453);
   float sWet=sceneWetness*(.26+.74*smoothstep(.72,.97,sNoise));
   diffuseColor.rgb*=mix(1.,.74,sWet);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb+vec3(.01,.018,.028),(1.-sceneDaylight)*sWet*.22);
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float srNoise=fract(sin(dot(floor(sceneSurfacePos.xz*2.1),vec2(12.9898,78.233)))*43758.5453);
   roughnessFactor=mix(roughnessFactor,.27,sceneWetness*(.30+.70*smoothstep(.72,.97,srNoise)));
  `);};m.customProgramCacheKey=()=> '3b-scene-wetness-v1';}
  materialCache.set(key,register(m));
 }return materialCache.get(key);};
 const geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,20),sphere:new THREE.IcosahedronGeometry(1,1),ring:new THREE.TorusGeometry(1,.065,6,48)};
 const groundY=(x,z)=>landscape?.height(x,z)||0;
 function mesh(g,mat,x,y,z,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(typeof g==='string'?geometry[g]:g,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);return m;}
function hubNpcAvatar(item){
  let h=2166136261;const key=item.npcId||item.id||'3b';for(let i=0;i<key.length;i+=1){h^=key.charCodeAt(i);h=Math.imul(h,16777619);}
  const pick=(values,shift=0)=>values[(h>>>shift)%values.length];
  const cloth=pick(['#202833','#15364a','#4a3423','#243c34','#4a2744','#3d3d46','#2b3848','#5a4437','#263c3a','#463b55'],0);
  const skin=pick(['#5f3d2b','#7b5138','#9a6c4e','#b98663','#d0a17d','#e0b896'],4);
  const hairColor=pick(['#171310','#352a24','#6a4a34','#16191d','#4b3428','#221b19'],18);
  const accentColor=pick(['#d6b46a','#78bfe8','#9ab67f','#c98986','#b09bd4','#d9d0bd'],21);
  const style=pick(['voyageur','sentinelle','mystique'],9),headwearRoll=(h>>>26)%7,outerRoll=(h>>>22)%7;
  return {
   body:(h>>>7)%2?'femme':'homme',
   style,
   hair:(h>>>12)%7,
   boots:(h>>>15)%3,
   fabricColor:cloth,
   skinColor:skin,
   hairColor,
   accentColor,
   trouserColor:pick(['#242a31','#4b4037','#35443f','#4a3946','#565148'],6),
   bootColor:pick(['#30251f','#45352b','#20272d','#5a4434'],11),
   metalColor:'#d6b46a',
   outerColor:pick([cloth,accentColor,'#20272d'],3),
   fabric:pick(['cotton','linen','satin','leather'],13),
   pattern:pick(['uni','bandes','damier','insigne','broderie'],25),
   patternScale:.78+((h>>>16)%7)*.12,
   shape:pick(['equilibre','elance','solide'],5),
   height:.94+((h>>>20)%7)*.02,
   build:.94+((h>>>10)%6)*.025,
   headwear:headwearRoll===0?'beret':headwearRoll===1?'brim':headwearRoll===2?'hood':'none',
   outer:outerRoll===0?'cape':outerRoll<=2?'scarf':outerRoll===3?'apron':'none',
   bag:(h>>>23)%3===0,
   belt:(h>>>17)%4===0?'utility':(h>>>17)%3===0?'simple':'none',
   pendant:(h>>>29)%4===0,
  };
 }
  function buildCinematicFx(){
  const group=new THREE.Group(),blue=register(new THREE.MeshBasicMaterial({color:'#58d1ff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})),gold=register(new THREE.MeshBasicMaterial({color:'#e0c486',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  const outer=new THREE.Mesh(register(new THREE.TorusGeometry(1,.028,6,72)),blue),inner=new THREE.Mesh(register(new THREE.TorusGeometry(1,.018,6,64)),gold);outer.rotation.x=inner.rotation.x=-Math.PI/2;inner.scale.setScalar(.68);group.add(outer,inner);
  const pointsData=new Float32Array(48*3);for(let i=0;i<48;i++){const a=i/48*Math.PI*2,r=.5+(i%7)/7*2.2;pointsData[i*3]=Math.cos(a)*r;pointsData[i*3+1]=.2+(i%9)*.16;pointsData[i*3+2]=Math.sin(a)*r;}
  const pg=register(new THREE.BufferGeometry());pg.setAttribute('position',new THREE.BufferAttribute(pointsData,3));const pm=register(new THREE.PointsMaterial({color:'#e0c486',size:.07,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})),points=new THREE.Points(pg,pm);group.add(points);group.visible=false;root.add(group);cinematicFx={group,outer,inner,points,blue,gold,pm};
 }
 function glowTexture(){const cv=document.createElement('canvas');cv.width=cv.height=64;const ctx=cv.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.2,'rgba(255,255,255,.7)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return register(new THREE.CanvasTexture(cv));}
 function portal(item){
  const index=Math.max(0,COUNTRIES.findIndex(c=>c.id===item.id)),y=groundY(item.x,item.z);
  const frame=createPortalFrame(countryById[item.id]?item.id:region,item.color);register(frame);frame.group.position.set(item.x,y,item.z);root.add(frame.group);for(const side of [-1,1])obstacles.push({x:item.x+side*3.65,z:item.z,r:1.25});
  const filmGeo=register(new THREE.CircleGeometry(1,40));
  const filmMat=register(new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{time:{value:0},tint:{value:new THREE.Color(item.color)},art:{value:models.atlas},tile:{value:new THREE.Vector2(index%4*.25,index<4?.5:0)}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float time; uniform vec3 tint; uniform sampler2D art; uniform vec2 tile; void main(){vec2 p=vUv-.5;float r=length(p)*2.;float ripple=sin(r*24.-time*1.7)*.5+.5;vec2 uv=vUv+sin(vUv.yx*10.+time*.4)*.005;vec3 c=texture2D(art,uv*vec2(.25,.5)+tile).rgb;gl_FragColor=vec4(mix(c,tint,pow(r,5.)*.55+ripple*.05),.93);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  mesh(filmGeo,filmMat,item.x,y+4,item.z+.1,2.95,3.45,1);portalMaterials.push(filmMat);
  if(region==='hub'){
   const accentMat=material(item.color,{emissive:item.color,emissiveIntensity:.34,metalness:.58,roughness:.26}),champagne=material('#d6b46a',{emissive:'#7b5d24',emissiveIntensity:.12,metalness:.78,roughness:.28}),dark=material('#0c1218',{roughness:.48,metalness:.42});
   const haloGeo=register(new THREE.TorusGeometry(1,.045,8,96)),halo=mesh(haloGeo,accentMat,item.x,y+4.4,item.z-.72,4.9,5.65,1);halo.castShadow=false;
   for(const side of [-1,1]){
    const px=item.x+side*5.9;
    const pylon=mesh('box',dark,px,y+4.25,item.z-.15,.52,8.5,.72),fin=mesh('box',champagne,px,y+7.95,item.z+.28,.72,.18,.38),beacon=mesh('sphere',accentMat,px,y+8.55,item.z+.05,.28,.42,.28);
    pylon.castShadow=true;fin.castShadow=beacon.castShadow=false;obstacles.push({x:px,z:item.z,r:.72});
    for(let stripe=0;stripe<3;stripe++){const light=mesh('box',accentMat,px,y+2.4+stripe*1.7,item.z+.58,.12,.55,.06);light.castShadow=false;}
   }
   const crown=mesh('box',champagne,item.x,y+9.55,item.z-.22,2.2,.18,.42);crown.castShadow=false;
  }
 }
 function makeActor(item){
  const card=cardById[item.card],creature=item.type==='guardian'||item.type==='hubGuardian';
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
  partyActors?.dispose();partyActors=null;escort?.dispose();escort=null;escortId=null;shot=null;post.setCinematic(null);cinematicBlue.intensity=cinematicGold.intensity=0;cinematicFx=null;fieldRival=null;combatFx.clear();lastCombat=null;
  hero?.dispose();landscape?.dispose();actors.forEach(a=>a.controller.dispose());hubNpcActors.forEach(a=>a.controller?.dispose());actors=[];hubNpcActors=[];hubVehicles=[];transportRide=null;weatherFx=null;weatherPositions=null;scene.remove(root);resources.forEach(r=>r.dispose());resources=[];materialCache=new Map();root=new THREE.Group();scene.add(root);animations=[];portalMaterials=[];obstacles=[];itemVisuals=new Map();battleTarget=null;
  region=nextRegion;worldRadius=worldRadiusFor(region);items=worldRuntimeItems(region,save);weather=worldWeatherForDate(region,new Date());weatherState=weatherProfile(weather);sceneWetness.value=weather==='storm'?1:weather==='heavy_rain'?.82:weather==='rain'?.55:weather==='fog'?.22:.06;sceneDaylight.value=worldTime.daylight;position={x:0,z:5};heading=180;target=null;route=[];waypoint=null;clearInput();
  const c=countryById[region],biome=BIOMES[region],rng=randomFor(biome.seed),accent=c?.color||'#e4cd94';
  scene.background=new THREE.Color(biome.sky);sky.setRegion(biome);sky.setAtmosphere?.({daylight:worldTime.daylight,weather});scene.fog=new THREE.Fog(0xbacdd6,region==='hub'?300:220,region==='hub'?1350:780);hemi.color.set(biome.sky).lerp(new THREE.Color('#ffffff'),.5);hemi.intensity=.55;sun.intensity=3.5;
  daylight?.dispose();daylight=createDaylight(renderer,biome);scene.environment=sky.environment||daylight.texture;scene.environmentIntensity=.55;
  landscape=createLandscape(models,region,save,error=>{console.error(error);onError('Un élément du quartier n’a pas pu être chargé. Recharge pour reprendre.');});const currentLandscape=landscape;landscape.ready.then(()=>{if(!disposed&&landscape===currentLandscape)onLoadState?.(false);});landscape.setQuality(qualityMode);landscape.setWeather?.(weather);landscape.setDaylight?.(worldTime.daylight);root.add(landscape.root);obstacles.push(...landscape.collisions);landscape.setParty(partyState);partyActors=createPartyActors(models,root,groundY,onError);partyActors.setPeers(latestPeers);
  const stone=material(c?.stone||'#cfc7ae'),gold=material(accent,{emissive:accent,emissiveIntensity:.22,metalness:.4});
  for(const item of items){
   if(item.type==='portal'){portal(item);continue;}
   if(item.type==='hubNpc'){
    item.homeX=item.x;item.homeZ=item.z;
    const controller=createLivingActor(models.living,{avatar:hubNpcAvatar(item),scale:1.9,onError});
    controller.object.position.set(item.x,groundY(item.x,item.z),item.z);root.add(controller.object);
    hubNpcActors.push({item,controller,object:controller.object,lastSimAt:0,lastX:item.x,lastZ:item.z});itemVisuals.set(item.id,[controller.object]);continue;
   }
   if(item.type==='hubRoad'){
    const visuals=buildPremiumHubRoad(item,{mesh,material,groundY});itemVisuals.set(item.id,visuals);continue;
   }
   if(item.type==='hubBuilding'||item.type==='hubStructure'){
    const bx=item.buildingX??item.x,bz=item.buildingZ??item.z,y=groundY(bx,bz),canonical=item.type==='hubBuilding',tier=item.tier||0;
    const palette=canonical?['#1d252d','#182f3d','#2c2834'][Math.min(2,tier)]:['#242a2f','#202b31','#2c3036'][Math.min(2,tier)];
    const body=mesh('box',material(palette,{roughness:canonical?.58:.76,metalness:canonical?.22:.08}),bx,y+item.height/2,bz,item.width,item.height,item.depth);
    const visuals=[body,...decorateHubBuilding(item,{mesh,material,groundY,canonical})];
    obstacles.push({x:bx,z:bz,width:item.width+.8,depth:item.depth+.8,rotation:0});itemVisuals.set(item.id,visuals);continue;
   }
   if(item.type==='hubTraffic'){
    const car=createPremiumTrafficVehicle(item,{root,geometry,material,groundY});
    hubVehicles.push({vehicle:car,stops:[item.from,item.to],line:item.routeId,cycle:Math.max(18,Math.hypot(item.to.x-item.from.x,item.to.z-item.from.z)/item.speed*2),height:0,traffic:true});itemVisuals.set(item.id,[car]);continue;
   }
   if(item.type==='hubGuardian'){
    itemVisuals.set(item.id,[makeActor(item)]);continue;
   }
   if(item.type==='hubMission'){
    const marker=createPremiumHubMarker(item,{root,geometry,material,groundY,kind:'mission'});itemVisuals.set(item.id,[marker]);continue;
   }
   if(item.type==='hubTransport'){
    const station=createPremiumTransportVisual(item,{root,geometry,material,groundY});itemVisuals.set(item.id,[station]);continue;
   }
   if(item.type==='hubDistrict'){
    const marker=createPremiumHubMarker(item,{root,geometry,material,groundY,kind:'district'});itemVisuals.set(item.id,[marker]);continue;
   }
   if(item.type==='hubEvent'){
    const marker=createPremiumHubMarker(item,{root,geometry,material,groundY,kind:'event'});itemVisuals.set(item.id,[marker]);continue;
   }
   if(item.type==='hubSecretStep'){
    const marker=createPremiumHubMarker(item,{root,geometry,material,groundY,kind:'secret'});itemVisuals.set(item.id,[marker]);continue;
   }
   if(item.type==='hubSecret'){continue;}
   if(item.type==='job'||item.type==='cooperation'||item.type==='cafe'||item.type==='story'||item.type==='atelier'||item.type==='sanctuary'||item.type==='camp'||item.type==='resource'||item.type==='landmark'||item.type==='vista')continue;
   if(item.type==='valueTrial'){
    const marker=createPremiumHubMarker(item,{root,geometry,material,groundY,kind:'trial'});itemVisuals.set(item.id,[marker]);continue;
   }
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
   for(const spec of [{transport:'train',cycle:38,color:'#d6b46a',height:.62},{transport:'boat',cycle:52,color:'#00a8ff',height:.28},{transport:'telepheric',cycle:18,color:'#b9d7ff',height:4.2}]){
    const candidates=items.filter(i=>i.type==='hubTransport'&&i.transport===spec.transport),lines=[...new Set(candidates.map(i=>i.line||spec.transport))];
    for(const line of lines){
     const stops=candidates.filter(i=>(i.line||spec.transport)===line).sort((a,b)=>a.stopIndex-b.stopIndex);
     if(stops.length<2)continue;
     const vehicle=createPremiumTransitVehicle(spec,stops[0],{root,geometry,material,groundY});
     hubVehicles.push({vehicle,stops,line,...spec});
    }
   }
  }
  hero=createLivingActor(models.living,{avatar:save.adventure.avatar,scale:2.2,onError});avatarKey=JSON.stringify(save.adventure.avatar);avatar=hero.object;root.add(avatar);hero.setColor(save.adventure.cosmetic!=='voyageur'?COSMETICS.find(c=>c.id===save.adventure.cosmetic)?.color:null);
  const shadow=mesh(register(new THREE.CircleGeometry(1,24)),register(new THREE.MeshBasicMaterial({color:'#12261c',transparent:true,opacity:.3,depthWrite:false})),0,.06,0,.85,.85,1);shadow.rotation.x=-Math.PI/2;animations.push({mesh:shadow,type:'shadow'});
  companion=new THREE.Group();root.add(companion);syncEscort();
  const ringMat=register(new THREE.MeshBasicMaterial({color:'#fae3a2',transparent:true,opacity:.55,depthWrite:false}));
  focusRing=mesh('ring',ringMat,0,0,0,1.35);focusRing.rotation.x=-Math.PI/2;focusRing.visible=false;
  waypointRing=mesh('ring',ringMat,0,0,0,1.6);waypointRing.rotation.x=-Math.PI/2;waypointRing.visible=false;
  effect=mesh('ring',register(new THREE.MeshBasicMaterial({color:'#fff0ab',transparent:true,opacity:0,depthWrite:false})),0,0,0,1);effect.rotation.x=-Math.PI/2;buildCinematicFx();
  const spriteTex=glowTexture(),coords=new Float32Array(90*3);for(let i=0;i<90;i++){coords[i*3]=(rng()-.5)*160;coords[i*3+1]=3+rng()*18;coords[i*3+2]=(rng()-.5)*160;}
  const particleGeo=register(new THREE.BufferGeometry());particleGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));
  const points=new THREE.Points(particleGeo,register(new THREE.PointsMaterial({size:.18,color:accent,map:spriteTex,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending})));root.add(points);animations.push({mesh:points,type:'particles'});
  weatherPositions=new Float32Array(150*3);for(let i=0;i<150;i++){weatherPositions[i*3]=(rng()-.5)*72;weatherPositions[i*3+1]=rng()*34;weatherPositions[i*3+2]=(rng()-.5)*72;}
  const weatherGeo=register(new THREE.BufferGeometry()),weatherAttr=new THREE.BufferAttribute(weatherPositions,3);weatherGeo.setAttribute('position',weatherAttr);
  weatherFx=new THREE.Points(weatherGeo,register(new THREE.PointsMaterial({size:weather==='snow'?.26:.08,color:weather==='snow'?'#ffffff':'#b9dcff',transparent:true,opacity:weatherState.opacity,depthWrite:false})));
  weatherFx.visible=weatherState.precipitation;root.add(weatherFx);
  // A resumed encounter starts next to its saved opponent, not at the country
  // entrance. Keep the same safe approach used by actual walking.
  const encounter=save.adventure.encounter;
  if(encounter?.field)position={...encounter.field.p};
  if(encounter&&!encounter.field){const opponent=encounter.final?items.find(i=>i.type==='final'):encounter.patrol?items.find(i=>i.type==='patrol'):items.find(i=>i.card===encounter.card);if(opponent){const approach=findInteractionPath(position,opponent,obstacles,worldRadius).at(-1);if(approach)position={...approach};battleTarget=opponent;}}
  // Frame the country's own landmark on arrival, while keeping chosen zoom.
  if(cameraFollow){const vista=region==='hub'?{x:0,z:-8}:toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z);orbit={...orbit,yaw:Math.atan2(position.x-vista.x,position.z-vista.z)};heading=((-orbit.yaw*180/Math.PI)%360+360)%360;avatar.rotation.y=orbit.yaw+Math.PI;}
  const view=orbitView(orbit,position,groundY(position.x,position.z),camera.aspect<.85,groundY);camera.position.copy(view.position);cameraTarget.copy(view.target);camera.lookAt(cameraTarget);report=0;needsRender=true;batchStatic();last=performance.now();frames=0;frameTime=0;qualityWarmupUntil=last+3000;
 }
 function resize(){const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setPixelRatio(quality.ratio(width,height,devicePixelRatio||1));renderer.setSize(width,height,false);needsRender=true;camera.aspect=width/height;camera.updateProjectionMatrix();post.resize(width,height,renderer.getPixelRatio(),qualityMode);}}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 function startRoute(destination,interaction=false,run=false){motionSmoother.reset();route=(interaction?findInteractionPath:findPath)(position,destination,obstacles,worldRadius);target=route.shift()||null;routeSprintUntil=run?performance.now()+2200:0;needsRender=true;}
 function clearInput(){keys.clear();stick={x:0,z:0};held=null;orbitHeld=null;touchPoints.clear();pinchDistance=null;target=null;route=[];routeSprintUntil=0;movementFrame.reset();motionSmoother.reset();}
 function down(e){
  if(paused||transportRide||!landscape||e.button>2)return;e.preventDefault();onActivity();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
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
 function pointRoute(e,run=false){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(landscape.ground,false)[0];if(hit){const p=hit.point,r=Math.hypot(p.x,p.z),scale=Math.min(1,(worldRadius-2)/r);startRoute({x:p.x*scale,z:p.z*scale},false,run);}}
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
 function keydown(e){if(paused||transportRide||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','z','q','e','shift','c'].includes(key)){e.preventDefault();if(key==='c'){if(!e.repeat)toggleCamera();return;}keys.add(key);target=null;route=[];onActivity();if(key==='e'&&!e.repeat)interact();}}
 function keyup(e){keys.delete(e.key.toLowerCase());}
 function interact(){if(paused||transportRide)return;const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())&&!(i.type==='resource'&&i.done)));if(closest){clearInput();battleTarget=closest;onActivity();onInteract(closest);}}
 const hidden=()=>{clearInput();last=performance.now();frameTime=frames=0;needsRender=true;};
 const lost=e=>{e.preventDefault();paused=true;onError('Le rendu 3D a été interrompu. Recharge le monde pour reprendre ta sauvegarde.');};
 canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('contextmenu',context);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('webglcontextlost',lost);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',hidden);
 function tick(now){
  now=performance.now();
  if(disposed)return;raf=requestAnimationFrame(tick);const rawDt=Math.max(0,(now-last)/1000);last=now;
  const cinematic=presentation==='encounter',fieldCombat=cinematic&&!!save.adventure.encounter?.field&&!save.adventure.encounter?.result;if(shot&&now>=shot.until){if(shot.cinematic)post.setCinematic(null);if(Number.isFinite(shot.fovEnd)){camera.fov=shot.fovEnd;camera.updateProjectionMatrix();}shot=null;}if(document.hidden||!models||!avatar||(paused&&!cinematic&&!shot&&!needsRender))return;
  const dt=Math.min(rawDt,.25);elapsed+=dt;let travelled=0,dx=0,dz=0;
  if(now-lastWorldTimeAt>=1000){
   lastWorldTimeAt=now;worldTime=worldTimeSnapshot();sceneDaylight.value=worldTime.daylight;const nextWeather=worldWeatherForDate(region,new Date());if(nextWeather!==weather){weather=nextWeather;weatherState=weatherProfile(weather);sceneWetness.value=weather==='storm'?1:weather==='heavy_rain'?.82:weather==='rain'?.55:weather==='fog'?.22:.06;landscape?.setWeather?.(weather);if(weatherFx){weatherFx.visible=weatherState.precipitation;weatherFx.material.opacity=weatherState.opacity;weatherFx.material.size=weather==='snow'?.26:.08;weatherFx.material.color.set(weather==='snow'?'#ffffff':'#b9dcff');}}landscape?.setDaylight?.(worldTime.daylight);sky.setAtmosphere?.({daylight:worldTime.daylight,weather});
   const biome=BIOMES[region]||BIOMES.hub,dayColor=new THREE.Color(biome.sky),nightColor=new THREE.Color('#07101a');
   scene.background.copy(dayColor).lerp(nightColor,1-worldTime.daylight);
   sun.intensity=3.5*worldTime.sun;hemi.intensity=.55*worldTime.daylight;fill.intensity=.22*Math.max(.28,worldTime.daylight);
   portraitLight.intensity=.22*Math.max(.45,worldTime.daylight);renderer.toneMappingExposure=.82+.22*worldTime.daylight;
   if(scene.fog){const visibility=worldTime.fog*weatherState.visibility;scene.fog.near=220*visibility;scene.fog.far=780*visibility;}
   needsRender=true;
  }
  if(!paused&&!shot){
   if(now<qualityWarmupUntil){frames=0;frameTime=0;}else{frames++;frameTime+=rawDt;}if(frameTime>=1){fps=Math.round(frames/frameTime);if(quality.sample(fps,frameTime))resize();frames=0;frameTime=0;}
   if(transportRide){
    const previous=position,progress=Math.min(1,(now-transportRide.started)/transportRide.duration),smooth=progress*progress*(3-2*progress);
    position={x:transportRide.from.x+(transportRide.to.x-transportRide.from.x)*smooth,z:transportRide.from.z+(transportRide.to.z-transportRide.from.z)*smooth};
    dx=position.x-previous.x;dz=position.z-previous.z;travelled=Math.hypot(dx,dz);moving=progress<1;
    if(travelled>.001)heading=movementHeading(dx,dz,heading);
    if(progress>=1){position={...transportRide.to};transportRide=null;moving=false;onActivity();}
   }else{
    dx=stick.x+((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('q')||keys.has('arrowleft'))?1:0);
    dz=stick.z+((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('z')||keys.has('arrowup'))?1:0);
    const rawInput=movementFrame.resolve(dx,dz,viewBearing(camera.position,cameraTarget));
    ({x:dx,z:dz}=motionSmoother.update(rawInput,dt));
    const sprinting=keys.has('shift')||held?.run||target&&routeSprintUntil>now;
    const previous=position,next=advanceMotion({position,target,route},{x:dx,z:dz},dt,10.5*stats.speed*(sprinting?1.4:1),obstacles,worldRadius);
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
  const y=groundY(position.x,position.z),age=elapsed-feedbackAt,impact=age<.28&&!reducedMotion?Math.sin(age/.28*Math.PI):0,retaliation=age>.3&&age<.62&&!reducedMotion?Math.sin((age-.3)/.32*Math.PI):0;
  avatar.position.set(position.x,y,position.z);hero.update(dt,dx,dz,travelled);
  if(region==='hub'){
   const stream=streamingProfile(qualityMode,typeof navigator!=='undefined'?navigator.deviceMemory:undefined,region);
   if(now-lastNpcUpdateAt>=1000/stream.npcUpdateHz){
    lastNpcUpdateAt=now;
    for(const actor of hubNpcActors){
     const d=Math.hypot(actor.item.x-position.x,actor.item.z-position.z),lod=lodForDistance(d,stream),visible=lod<3;
     actor.object.visible=visible;if(!visible)continue;
     const sim=npcSimulationTier(d),interval=1000/Math.max(.25,sim.updateHz);if(actor.lastSimAt&&now-actor.lastSimAt<interval)continue;const delta=Math.max(.001,(now-(actor.lastSimAt||now-16))/1000);actor.lastSimAt=now;const pose=hubNpcPose(actor.item,elapsed,{distance:d,weather,playerVisible:d<18,paused}),gy=groundY(pose.x,pose.z);actor.item.x=pose.x;actor.item.z=pose.z;actor.item.simulationState=pose.state;actor.item.simulationTier=pose.tier;actor.item.needs=pose.needs;
     actor.object.visible=visible;actor.object.position.set(pose.x,gy,pose.z);actor.object.rotation.y=pose.heading;const moved=Math.hypot(pose.x-actor.lastX,pose.z-actor.lastZ);actor.controller.update(delta,pose.x-actor.lastX,pose.z-actor.lastZ,moved);actor.lastX=pose.x;actor.lastZ=pose.z;
    }
   }
   if(now-lastStreamingAt>=350){
    lastStreamingAt=now;
    for(const [id,visuals] of itemVisuals){
     if(!id.startsWith('hub:')||id.startsWith('hub:npc:'))continue;
     const item=items.find(entry=>entry.id===id);if(!item)continue;
     const lod=lodForDistance(Math.hypot(item.x-position.x,item.z-position.z),stream);
     visuals.forEach((visual,index)=>{visual.visible=lod<3&&(lod<2||index===0);});
    }
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
  combatDistance=opponent?Math.hypot(opponent.x-position.x,opponent.z-position.z):Infinity;
  if(opponent&&!retaliationPlayed&&age>=.32){retaliationPlayed=true;if(lastCombat?.counter){actors.find(a=>a.itemId===opponent.id)?.controller.action('Attack');if(lastCombat.incoming>0&&!lastCombat.defended)hero.action('Hit');}}
  if(opponent&&!fieldCombat){let ox=opponent.x-position.x,oz=opponent.z-position.z,d=Math.hypot(ox,oz);if(d<.01){ox=0;oz=-1;d=1;}const spacing=Math.max(0,4.5-d),approach=feedbackAction==='guard'||feedbackAction==='dodge'?0:impact*.75;avatar.position.x+=ox/d*(approach-spacing);avatar.position.z+=oz/d*(approach-spacing);if(feedbackAction==='dodge'&&!fieldCombat){avatar.position.x+=oz/d*impact*2.4;avatar.position.z-=ox/d*impact*2.4;}avatar.position.y=groundY(avatar.position.x,avatar.position.z);avatar.rotation.y=Math.atan2(ox,oz);}
  if(escort){escort.object.visible=!cinematic;const p=escort.object.position;if(travelled>.05&&(!trail.length||Math.hypot(trail.at(-1).x-position.x,trail.at(-1).z-position.z)>1))trail.push({...position});while(trail.length>65)trail.shift();while(trail.length>3&&Math.hypot(trail[0].x-p.x,trail[0].z-p.z)<1.3)trail.shift();const goal=trail.length>3?trail[0]:null,old={x:p.x,z:p.z};if(goal&&!paused&&!shot){const result=advanceMotion({position:old,target:goal,route:[]},{x:0,z:0},dt,Math.max(11,10.5*stats.speed*1.6),obstacles,worldRadius);p.set(result.position.x,groundY(result.position.x,result.position.z),result.position.z);}escort.update(dt,p.x-old.x,p.z-old.z,Math.hypot(p.x-old.x,p.z-old.z));if(Math.hypot(p.x-position.x,p.z-position.z)>40){p.set(position.x,y,position.z);trail=[];}}
  const wide=cameraMode===1,portrait=camera.aspect<.85;
  if(opponent&&!fieldCombat){const mx=(avatar.position.x+opponent.x)/2,mz=(avatar.position.z+opponent.z)/2,my=(avatar.position.y+groundY(opponent.x,opponent.z))/2;desiredTarget.set(mx,my+1.8,mz);desiredCamera.set(mx+(portrait?12:15),my+(portrait?14:11),mz+(portrait?20:18));}
  else{const view=orbitView(orbit,position,y,portrait,groundY);desiredTarget.copy(view.target);desiredCamera.copy(view.position);}
  if(shot&&(!reducedMotion||shot.heritage||shot.cinematic)){const age=Math.max(0,Math.min(1,1-(shot.until-now)/shot.duration)),ease=age*age*(3-2*age),arc=reducedMotion?0:(shot.arc??.28),a=shot.angle+age*arc,baseY=groundY(shot.x,shot.z),baseRadius=shot.radius??(shot.heritage?(portrait?118:106):23),radius=Math.max(3,baseRadius*(1-(shot.dolly||0)*age)),waterReveal=shot.kind==='world-opening'&&region==='hub',focusLift=waterReveal?2.6+(shot.focusY-2.6)*ease:(shot.focusY??(shot.heritage?28:2)),cameraLift=waterReveal?4.2+((shot.height??18)-4.2)*ease:(shot.height??(shot.heritage?36:14));desiredTarget.set(shot.x,baseY+focusLift,shot.z);desiredCamera.set(shot.x+Math.sin(a)*radius,baseY+cameraLift,shot.z+Math.cos(a)*radius);if(shot.endCamera&&shot.endTarget){const returnBlend=waterReveal?Math.max(0,(ease-.72)/.28):ease;desiredCamera.lerp(shot.endCamera,returnBlend);desiredTarget.lerp(shot.endTarget,returnBlend);}if(Number.isFinite(shot.fovStart)){camera.fov=shot.fovStart+(shot.fovEnd-shot.fovStart)*ease;camera.updateProjectionMatrix();}}

  const smoothing=1-Math.exp(-dt*(reducedMotion?20:7));camera.position.lerp(desiredCamera,smoothing);cameraTarget.lerp(desiredTarget,smoothing);camera.lookAt(cameraTarget);landscape.updateCamera(camera.position,cameraTarget,!shot?.heritage);
  portraitLight.position.copy(camera.position);portraitLight.position.y+=5;portraitLight.target.position.copy(avatar.position);portraitLight.target.position.y+=1.5;
  if(shot?.cinematic&&cinematicFx){
   const p=Math.max(0,Math.min(1,1-(shot.until-now)/shot.duration)),fade=Math.sin(Math.PI*p),baseY=groundY(shot.x,shot.z),scale=shot.kind==='world-opening'?10:shot.heritage?8:shot.kind==='final-combat-intro'?5.2:shot.kind==='guardian-intro'?3.8:shot.kind==='memory-fragment'?1.8:2.8;
   cinematicFx.group.visible=true;cinematicFx.group.position.set(shot.x,baseY+.18,shot.z);cinematicFx.outer.scale.setScalar(scale*(.72+p*.44));cinematicFx.inner.scale.setScalar(scale*(.44+p*.18));cinematicFx.outer.rotation.z+=dt*.22;cinematicFx.inner.rotation.z-=dt*.31;cinematicFx.points.rotation.y+=dt*.18;cinematicFx.points.position.y=.25+Math.sin(elapsed*1.2)*.12;cinematicFx.points.scale.setScalar(scale*.72);
   cinematicFx.blue.color.set(shot.accent||'#58d1ff');cinematicFx.blue.opacity=.12+.32*fade;cinematicFx.gold.opacity=.08+.26*fade;cinematicFx.pm.opacity=.12+.42*fade;cinematicFx.pm.color.set(shot.secondary||'#e0c486');
   cinematicBlue.color.set(shot.accent||'#58d1ff');cinematicGold.color.set(shot.secondary||'#e0c486');cinematicBlue.position.set(shot.x+4,baseY+5,shot.z+3);cinematicGold.position.set(shot.x-3,baseY+3.2,shot.z-2);cinematicBlue.intensity=(shot.major?7.5:4.6)*fade;cinematicGold.intensity=(shot.major?5.2:3.2)*fade;
  }else{if(cinematicFx)cinematicFx.group.visible=false;cinematicBlue.intensity*=.82;cinematicGold.intensity*=.82;}
  sun.position.set(position.x-38,y+54,position.z+35);sun.target.position.set(position.x,y,position.z);portalMaterials.forEach(mat=>mat.uniforms.time.value=elapsed);
  for(const a of animations){if(a.type==='float'){a.mesh.position.y=a.y+Math.sin(elapsed*1.5+a.mesh.position.x)*.15;a.mesh.rotation.y+=dt*.3;}if(a.type==='shadow')a.mesh.position.set(avatar.position.x,avatar.position.y+.07,avatar.position.z);if(a.type==='particles')a.mesh.rotation.y=Math.sin(elapsed*.04)*.03;}
  if(weatherFx?.visible&&weatherPositions){weatherFx.position.set(position.x,groundY(position.x,position.z)+1,position.z);for(let i=0;i<weatherPositions.length;i+=3){weatherPositions[i]+=weatherState.wind*dt*2;weatherPositions[i+1]-=weatherState.speed*dt;if(weatherPositions[i+1]<0){weatherPositions[i+1]=32;weatherPositions[i]=(Math.random()-.5)*72;weatherPositions[i+2]=(Math.random()-.5)*72;}}weatherFx.geometry.attributes.position.needsUpdate=true;}
  partyActors?.tick(dt,region);landscape.tick(elapsed,dt,position);landscape.updateDistrict(camera,position);
  for(const a of actors){const object=a.controller.object,combatActive=cinematic&&opponent?.id===a.itemId,shotActive=!!shot?.cinematic&&shot.focusItemId===a.itemId,active=combatActive||shotActive,focusActor=combatActive?opponent:shotActive?{x:a.x,z:a.z}:null;object.visible=a.itemId==='final'?active:active||!(cooldowns.get(a.itemId)>Date.now());if(!object.visible)continue;const previous=object.position.clone(),wander=!active&&!paused?Math.sin(elapsed*.28+a.x)*.6:0;const ax=focusActor?focusActor.x:a.x+wander,az=focusActor?focusActor.z:a.z;object.position.set(ax,groundY(ax,az),az);const movement=object.position.distanceTo(previous);a.controller.update(dt,object.position.x-previous.x,object.position.z-previous.z,movement);if(active){if(combatActive){const d=Math.hypot(position.x-ax,position.z-az)||1,response=lastCombat?.counter?retaliation:0;object.position.x+=(position.x-ax)/d*response*.9;object.position.z+=(position.z-az)/d*response*.9;object.rotation.y=Math.atan2(position.x-ax,position.z-az);object.rotation.z=lastCombat?.outgoing?impact*.06:0;}else{object.rotation.y=Math.atan2(camera.position.x-ax,camera.position.z-az);object.rotation.z=0;}}else object.rotation.z=0;}
  if(opponent){opponentPosition.set(opponent.x,groundY(opponent.x,opponent.z),opponent.z);combatFx.update(elapsed,avatar.position,opponentPosition);}else combatFx.clear();
  threat.update(opponent?encounter:null,elapsed,avatar.position,opponentPosition,combatFx.state.active);
  const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())&&!(i.type==='resource'&&i.done)));
  focusRing.visible=!!closest&&!paused;if(closest)focusRing.position.set(closest.x,groundY(closest.x,closest.z)+.09,closest.z);
  waypointRing.visible=!!waypoint&&!paused&&distance(position,waypoint)>7;if(waypoint)waypointRing.position.set(waypoint.x,groundY(waypoint.x,waypoint.z)+.1,waypoint.z);
  effect.visible=!lastCombat&&age<.65;if(effect.visible){effect.position.set(avatar.position.x,avatar.position.y+.15,avatar.position.z);effect.scale.setScalar(1+age*6);effect.material.opacity=Math.max(0,1-age/.65)*.7;effect.material.color.set(feedbackAction==='guard'?'#a2dff0':'#ffe0a0');}
  if(renderer.shadowMap.enabled&&(needsRender||now-shadowAt>=50)){renderer.shadowMap.needsUpdate=true;shadowAt=now;}
  sky.update(camera,reducedMotion?0:elapsed);renderer.info.reset();post.render(dt);report-=dt;
  if(report<=0||needsRender){report=(moving||held?.drag)?.1:.4;onSnapshot({architecture:landscape.architectureDiagnostics,interior:landscape.interior?.id||null,time:worldTime,weather,combat:opponent?{distance:combatDistance,hero:screenAnchor(avatar.position),enemy:screenAnchor(opponentPosition)}:null,cinematic:shot?{title:shot.title,detail:shot.detail}:null,companion:escortId,region,district:districtAt(region,position,(x,z)=>toLandscape(region,x,z)),position:{...position},heading,camera:{...orbit,yaw:viewBearing(camera.position,cameraTarget),follow:cameraFollow,actualDistance:camera.position.distanceTo(cameraTarget)},near:closest,moving,fps,drawCalls:renderer.info.render.calls,ambientOcclusion:post.enabled,resolution:Math.round(renderer.getPixelRatio()*100),waypoint,remaining:waypoint?Math.round(distance(position,waypoint)):null,joystick:held?.drag?{x:held.x,y:held.y,dx:stick.x*26,dy:stick.z*26}:null});}
  needsRender=false;
 }
 onLoadState?.(true);
 loadWorldModels().then(value=>{if(disposed){value.dispose();return;}models=value;rebuild(region);resize();last=performance.now();}).catch(error=>{if(!disposed){console.error('[3B world models]',error);paused=true;onError('Les modèles 3D n’ont pas pu être chargés. Recharge le monde pour réessayer.');}});
 resize();raf=requestAnimationFrame(tick);
 return{
  refreshHubSchedule(){
   if(region!=='hub')return;
   const latest=worldRuntimeItems('hub',save),byId=new Map(latest.filter(item=>item.type==='hubNpc').map(item=>[item.id,item]));
   for(const actor of hubNpcActors){const next=byId.get(actor.item.id);if(!next)continue;actor.item.homeX=next.x;actor.item.homeZ=next.z;actor.item.district=next.district;actor.item.activity=next.activity;}
   needsRender=true;
  },
  setPeers(peers){latestPeers=peers;partyActors?.setPeers(peers);},
  setParty(party){partyState=party;landscape?.setParty(party);},
  combatAction(kind){combatButton=kind;combatClock=.1;},
  canBattle(action){return !['strike','power','wait'].includes(action)||combatDistance<=(action==='power'?22:action==='wait'?8:7.5);},
  setPaused(value){paused=value;needsRender=true;last=performance.now();frames=frameTime=0;if(value)clearInput();},
  setPresentation(value){presentation=value;if(value!=='encounter')combatFx.clear();needsRender=true;},
  feedback(type,action,previous,next){if(type==='field'){const f=next?.adventure.encounter?.field;if(!f?.last)return;action=f.last;type='battle';}if(['battle','beacon','pact','restore','power','help'].includes(type)){feedbackAt=elapsed;feedbackAction=action||type;lastCombat=null;if(!next?.adventure.encounter?.field&&type==='battle'&&action==='dodge'&&fieldRival){const x=position.x-fieldRival.x,z=position.z-fieldRival.z,len=Math.hypot(x,z)||1;const dodge=advanceMotion({position,target:null,route:[]},{x:z/len,z:-x/len},.2,20,obstacles,worldRadius);position=dodge.position;}if(type==='battle'){lastCombat=combatCue(previous?.adventure.encounter,next?.adventure.encounter,action,next?.adventure.avatar);combatFx.start(lastCombat,elapsed);retaliationPlayed=false;hero?.action(action==='enemy'?'Hit':action==='guard'||action==='dodge'||action==='wait'||action==='miss'?'Idle':action==='power'||action==='support'||action==='trap'?'Cast':'Attack');const e=next?.adventure.encounter,rival=actors.find(a=>a.itemId===battleTarget?.id||(!battleTarget&&a.itemId===items.find(i=>e?.patrol?i.type==='patrol':i.card===e?.card)?.id));if(lastCombat?.outgoing)rival?.controller.action(e?.result==='victory'?'Death':'Hit');}else if(type==='power')hero?.action('Cast');needsRender=true;}},
  playCinematicShot(kind,context={},duration=5200){
   const encounter=save.adventure.encounter||{},now=performance.now(),major=['world-opening','country-first-entry','guardian-intro','final-combat-intro','story-finale'].includes(kind);
   let focus={...position},heritage=false,radius=major?17:13,height=major?10:8,focusY=2.1,arc=major?.42:.24,dolly=major?.14:.08,angle=orbit.yaw-.16,focusItemId=null,endCamera=null,endTarget=null,fovStart=null,fovEnd=null;
   if(kind==='world-opening'){
    if(region==='hub'){
     const water=BIOMES.hub.water;
     focus={x:0,z:-145};radius=camera.aspect<.85?470:540;height=18;focusY=54;arc=.20;dolly=.54;
     angle=Math.atan2(water.x-focus.x,water.z-focus.z);
     fovStart=70;fovEnd=60;
     context={...context,waterReveal:true};
    }else{
     focus={...position};radius=camera.aspect<.85?78:112;height=camera.aspect<.85?50:64;focusY=5.5;arc=.58;dolly=.08;angle=orbit.yaw-.58;fovStart=72;fovEnd=60;
    }
    const finalView=cinematicReturnView(orbit,position,groundY(position.x,position.z),camera.aspect<.85,groundY);endCamera=finalView.position;endTarget=finalView.target;hero?.action('Idle');
   }else if(kind==='country-first-entry'&&region!=='hub'){focus=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z);heritage=true;radius=camera.aspect<.85?104:94;height=34;focusY=27;arc=.32;dolly=.08;angle=-BIOMES[region].angle+.18;}
   else if(['guardian-intro','final-combat-intro','important-combat-result'].includes(kind)){
    const rival=battleTarget||items.find(i=>encounter.final?i.type==='final':encounter.patrol?i.type==='patrol':i.card===(context.card||encounter.card));
    if(rival){focus={x:rival.x,z:rival.z};focusItemId=rival.id;radius=kind==='final-combat-intro'?18:12;height=kind==='final-combat-intro'?11:7.5;focusY=2.2;arc=.52;dolly=.18;angle=orbit.yaw-.3;const actor=actors.find(a=>a.itemId===rival.id);actor?.controller.action(kind==='important-combat-result'?'Idle':'Cast');}
   }else if(kind==='story-restoration'&&region!=='hub'){
    const stage=context.stage||save.adventure.chapters[region]?.restored||1;
    focus=toLandscape(region,...(stage===3?[LANDMARK_SITE.x,LANDMARK_SITE.z]:stage===2?[29,15]:[11,-4]));heritage=stage===3;radius=heritage?(camera.aspect<.85?110:98):18;height=heritage?35:11;focusY=heritage?27:2.4;arc=.34;dolly=.12;
   }else if(kind==='discovery'){
    const place=items.find(i=>i.id===region+':survey:'+context.place);if(place)focus={x:place.x,z:place.z};radius=14;height=9;focusY=2.2;arc=.3;dolly=.1;
   }else if(kind==='memory-fragment'){
    const fragment=items.find(i=>i.id===context.id||i.type==='beacon'&&i.id===context.id);
    if(fragment)focus={x:fragment.x,z:fragment.z};radius=7.8;height=5.1;focusY=1.1;arc=.46;dolly=.25;angle=orbit.yaw-.22;
   }else if(kind==='story-alliance'){
    const resident=items.find(i=>i.type==='story'||i.id===region+':story');
    if(resident){focus={x:resident.x,z:resident.z};landscape?.cinematicFocus(focus.x,focus.z,'Talk',elapsed);}radius=10.5;height=6.4;focusY=1.85;arc=.34;dolly=.1;angle=orbit.yaw-.2;
   }else if(kind==='story-power'){hero?.action('Cast');radius=9.5;height=6.3;focusY=1.8;arc=.42;dolly=.2;}
   const profile=cinemaProfile(region),accent=profile.accent,secondary=profile.secondary,micro=['memory-fragment','discovery','story-power'].includes(kind);
   post.setCinematic({active:true,intensity:major?1:micro?.72:.84,accent,secondary});
   shot={...focus,kind,major,focusItemId,accent,secondary,angle,duration,until:now+duration,heritage,cinematic:true,radius,height,focusY,arc,dolly,endCamera,endTarget,fovStart,fovEnd,title:'',detail:''};clearInput();needsRender=true;
  },
  inspectLandmark(){if(region==='hub')return;const p=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z),duration=6500,profile=cinemaProfile(region),accent=profile.accent,secondary=profile.secondary;post.setCinematic({active:true,intensity:.82,accent,secondary});shot={...p,kind:'heritage-inspection',major:false,accent,secondary,angle:-BIOMES[region].angle+.35,duration,until:performance.now()+duration,heritage:true,cinematic:true,title:'Le patrimoine du pays',detail:'Vue du monument · reprendre quand tu veux'};clearInput();needsRender=true;},
  skipCinematic(){if(shot?.cinematic)post.setCinematic(null);if(Number.isFinite(shot?.fovEnd)){camera.fov=shot.fovEnd;camera.updateProjectionMatrix();}shot=null;needsRender=true;},
  rideHubTransport(item){
   if(region!=='hub'||transportRide||item?.type!=='hubTransport'||item.boardable===false)return null;
   const line=item.line||item.transport,stops=items.filter(i=>i.type==='hubTransport'&&i.transport===item.transport&&(i.line||i.transport)===line).sort((a,b)=>a.stopIndex-b.stopIndex),index=stops.findIndex(stop=>stop.id===item.id);
   if(index<0||stops.length<2)return null;
   const next=item.transport==='zipline'?stops[index+1]:stops[(index+1)%stops.length];if(!next)return null;
   const durations={train:3600,boat:5200,telepheric:4300,zipline:2300};clearInput();waypoint=null;position={x:item.x,z:item.z};
   transportRide={transport:item.transport,line,from:{x:item.x,z:item.z},to:{x:next.x,z:next.z},fromDistrict:item.district,toDistrict:next.district,started:performance.now(),duration:durations[item.transport]||4200};
   needsRender=true;return {transport:item.transport,line,from:item.district,to:next.district,duration:transportRide.duration};
  },
  retreat(encounter){const rival=battleTarget||items.find(i=>i.card===encounter.card||encounter.patrol&&i.type==='patrol');if(!rival)return;let x=position.x-rival.x,z=position.z-rival.z,len=Math.hypot(x,z);if(len<.01){x=0;z=1;len=1;}startRoute({x:position.x+x/len*9,z:position.z+z/len*9});},
  toggleCamera,
  setCameraFollow(value){cameraFollow=!!value;if(!cameraFollow)orbit={...orbit,yaw:viewBearing(camera.position,cameraTarget)};rememberCamera();try{localStorage.setItem('3b-world-camera-follow',String(cameraFollow));}catch{}needsRender=true;},
  setQuality(mode){qualityMode=mode;quality.setMode(mode);landscape?.setQuality(mode);renderer.shadowMap.enabled=mode!=='fluid';const memory=typeof navigator!=='undefined'?Number(navigator.deviceMemory)||4:4,highEndAuto=mode==='auto'&&canvas.clientWidth>=1000&&memory>=8,size=(mode==='detail'||highEndAuto)?2048:1024;if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;}resize();},
  setSave(value){if(value===save)return;const oldField=save.adventure.encounter?.field,newField=value.adventure.encounter?.field;if(newField&&!oldField){position={...newField.p};combatClock=0;combatButton=null;}if(oldField&&newField&&!value.adventure.encounter.result&&value.region===region){save=value;needsRender=true;return;}const previousItems=items,oldStage=save.adventure.chapters[region]?.restored||0;save=value;const newStage=save.adventure.chapters[region]?.restored||0;if(newStage>oldStage&&models&&!reducedMotion){const p=toLandscape(region,...(newStage===3?[LANDMARK_SITE.x,LANDMARK_SITE.z]:newStage===2?[29,15]:[11,-4]));shot={...p,angle:orbit.yaw,duration:4200,until:performance.now()+4200,heritage:newStage===3,title:newStage===3?'Le pays retrouve sa lumière':newStage===2?'Un quartier reprend vie':'Le lieu se souvient',detail:newStage===2?'Ton groupe peut maintenant se préparer ici.':'Les habitants retrouvent leur histoire.'};clearInput();}syncEscort();stats=teamStats(save);landscape?.update(save);if(models&&JSON.stringify(save.adventure.avatar)!==avatarKey){hero?.dispose();avatar?.removeFromParent();hero=createLivingActor(models.living,{avatar:save.adventure.avatar,scale:2.2,onError});avatar=hero.object;root.add(avatar);avatarKey=JSON.stringify(save.adventure.avatar);}hero?.setColor(save.adventure.cosmetic!=='voyageur'?COSMETICS.find(c=>c.id===save.adventure.cosmetic)?.color:null);
  const nextItems=worldRuntimeItems(region,save);
  if(region==='hub'&&hubNpcActors.length){
   const liveNpcs=new Map(hubNpcActors.map(actor=>[actor.item.id,actor.item]));
   items=nextItems.map(item=>{const live=liveNpcs.get(item.id);if(!live)return item;const x=live.x,z=live.z,homeX=live.homeX,homeZ=live.homeZ;Object.assign(live,item,{x,z,homeX,homeZ});return live;});
  }else items=nextItems;
  if(models)for(const item of items){if(!['echo','patrol'].includes(item.type)||previousItems.find(i=>i.id===item.id)?.card===item.card)continue;const old=actors.find(a=>a.itemId===item.id);if(old){old.controller.object.removeFromParent();old.controller.dispose();actors=actors.filter(a=>a!==old);}itemVisuals.set(item.id,[makeActor(item)]);}needsRender=true;},
  travel(id){if(!models)return;clearTimeout(travelTimer);paused=true;clearInput();onLoadState?.(true);travelTimer=setTimeout(()=>{if(disposed)return;try{rebuild(countryById[id]?id:'hub');paused=false;needsRender=true;}catch(error){console.error('[3B travel]',error);avatar=null;onLoadState?.(false);onError('Ce pays n’a pas pu être chargé. Recharge le monde pour reprendre.');}},0);},
  interact,
  waypoint(item,walk=false){if(!item)return;waypoint=item;needsRender=true;if(walk)startRoute(item,true);},
  cooldown(id){cooldowns.set(id,Date.now()+90000);},
  destroy(){clearTimeout(travelTimer);partyActors?.dispose();disposed=true;post.dispose();sky.dispose();combatFx.dispose();threat.dispose();daylight?.dispose();escort?.dispose();hero?.dispose();landscape?.dispose();actors.forEach(a=>a.controller.dispose());hubNpcActors.forEach(a=>a.controller?.dispose());models?.dispose();cancelAnimationFrame(raf);observer.disconnect();resources.forEach(r=>r.dispose());Object.values(geometry).forEach(g=>g.dispose());renderer.dispose();canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',context);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('webglcontextlost',lost);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',hidden);},
 };
}
