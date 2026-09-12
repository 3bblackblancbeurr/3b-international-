import {createImpactLabels} from './impact-labels.js';
import {createCombatInput,dodgeVector} from './combat-input.js';
import {invokeCompanion,companionPower} from './companion-powers.js';
import {getWeapon} from '../arsenal.js';
import {COUNTRIES,isCountry,countryLayout,countryDialogue} from './countries.js';
import {advanceMotion,pointerStick,createQualityController} from '../motion.js';
import {createMovementFrame} from '../camera-follow.js';
import {createSceneryOcclusion} from '../occlusion.js';
import * as T from 'three';
import {createWorldSky} from '../sky.js';
import {createEnvironment} from './environment.js';
import {createActors} from './actors.js';
import {createCompanion,commandWolf,updateWolf} from './companion.js';
import {createCombat,command,stepCombat,actionCost} from './combat.js';
import {act,normalize} from './state.js';
import {POINTS,WORLDS,SPAWNS,objective} from './data.js';
import {distance,move,ground,route,inside,obstacles,safePosition} from './space.js';
import {createOriginsAudio} from './audio.js';

export function createOriginsScene(host,{initial,onSnapshot,onSave,onMessage,onLoad,onError}){
 const movementFrame=createMovementFrame(),occlusion=createSceneryOcclusion();
 const state=normalize(initial),scene=new T.Scene(),camera=new T.PerspectiveCamera(52,1,.06,650),renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Monde 3B · vue 3D');host.appendChild(renderer.domElement);
 const lightProfile=()=>state.settings.quality==='light'||state.settings.quality==='auto'&&matchMedia('(pointer: coarse)').matches;
 const renderQuality=createQualityController(state.settings.quality==='light'?'fluid':state.settings.quality==='high'?'detail':'auto');
 let lightMode=lightProfile();renderer.setPixelRatio(renderQuality.ratio(host.clientWidth,host.clientHeight,devicePixelRatio));
 const hemi=new T.HemisphereLight('#d5e7fb','#aaa089',1.1),sun=new T.DirectionalLight('#fff1d2',2.5);sun.position.set(-35,55,28);sun.castShadow=true;sun.shadow.mapSize.setScalar(lightMode?1024:2048);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;sun.shadow.camera.near=1;sun.shadow.camera.far=155;sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;scene.add(hemi,sun,sun.target);
 scene.fog=new T.Fog('#c7d6d8',140,380);const sky=createWorldSky(renderer,texture=>{scene.environment=texture;scene.environmentIntensity=.65;});scene.add(sky.root);
 const audio=createOriginsAudio(),actors=createActors(scene,onError,state.avatar),clock=new T.Timer(),ray=new T.Raycaster(),plane=new T.Plane(v(0,1,0),0),keys=new Set(),pointers=new Map();
 let regionalEncounter=false;
 const combatInput=createCombatInput();
 const companionRuntime={readyAt:0};
 let position={...state.position},wolf=createCompanion(position),combat=createCombat(),world,time=0,lastSnapshot=0,lastSave=0,lastEvent=0,raf,dead=false,paused=false,loading=true,heading=Math.PI,yaw=0,pitch=.30,manual=0,moveYaw=null,path=[],vision=0,visionCooldown=0,cinematic=null,autoTarget=null,oldEnemyState='patrol',stepTime=0,frameCount=0,frameTime=0,fps=0,zoneToken=0;
 clock.connect(document);
 combat.hp=state.hp;const stick={x:0,z:0},desired=new T.Vector3(),aim=new T.Vector3(),smoothAim=new T.Vector3(position.x,1.2,position.z),effects=[];
 const impactLabels=createImpactLabels(scene);
 const effectMat=new T.MeshBasicMaterial({color:'#f1dcae',transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}),effectGeo=new T.TorusGeometry(1,.035,5,45),dangerMat=new T.MeshBasicMaterial({color:'#d26b47',transparent:true,opacity:.36,side:T.DoubleSide,depthWrite:false});
 const dangerCircle=new T.CircleGeometry(1,64),dangerCone=new T.CircleGeometry(1,48,Math.PI/2-Math.acos(.2),2*Math.acos(.2));const danger=new T.Mesh(dangerCircle,dangerMat);danger.rotation.x=-Math.PI/2;danger.visible=false;scene.add(danger);
 const targetMark=new T.Mesh(new T.RingGeometry(.32,.39,28),new T.MeshBasicMaterial({color:'#e8d3a0',transparent:true,opacity:.8,side:T.DoubleSide}));targetMark.rotation.x=-Math.PI/2;targetMark.visible=false;scene.add(targetMark);
 function v(x,y,z){return new T.Vector3(x,y,z);}
 function save(final=false){if(document.hidden&&!final)return;state.position=safePosition(position,state.zone,state.flags);state.hp=combat.hp||100;onSave(structuredClone(state));}
 const slashGeo=new T.TorusGeometry(1,.045,5,30,Math.PI*1.3),sparkGeo=new T.IcosahedronGeometry(.055,0);
 function signal(type,x=position.x,z=position.z){audio.event(type);const m=effectMat.clone();m.color.set(['vision','circle','trial'].includes(type)?'#72d0ed':type==='hurt'?'#c66c4c':getWeapon(state.avatar.weapon).color);const slash=['light','heavy'].includes(type),effect=new T.Mesh(slash?slashGeo:effectGeo,m);effect.rotation.x=slash?.22:-Math.PI/2;if(slash)effect.rotation.y=heading;effect.position.set(x,ground({x,z},state.zone)+(slash?1.1:.07),z);scene.add(effect);effects.push({object:effect,time:0,duration:type==='restored'?2:slash?.28:.65,type,slash});if(['impact','defeat','perfect'].includes(type)){for(let i=0;i<10;i++){const sm=effectMat.clone();sm.color.set(type==='perfect'?'#8fe6ed':'#ffe0a0');const spark=new T.Mesh(sparkGeo,sm);spark.position.set(x,ground({x,z},state.zone)+1,z);scene.add(spark);effects.push({object:spark,time:0,duration:.42,type:'spark',velocity:new T.Vector3(Math.sin(i*2.4)*2,1.5+(i%3)*.4,Math.cos(i*2.4)*2)});}}}
 function snapshot(){const target=objective(state),interactions=available(),nearest=interactions.filter(p=>distance(position,p)<3.2).sort((a,b)=>distance(position,a)-distance(position,b))[0];onSnapshot({state:structuredClone(state),position:{...position},wolf:{position:{...wolf.position},mode:wolf.mode,arrived:wolf.arrived,cooldown:Math.max(0,companionRuntime.readyAt-time),power:companionPower(state.avatar.companion).name},heading,yaw,vision:Math.max(0,vision),visionCooldown,objective:target,nearby:nearest?{id:nearest.id,name:nearest.name}:null,combat:{lightCost:actionCost('light',state.avatar,state.xp,state.equipment),heavyCost:actionCost('heavy',state.avatar,state.xp,isCountry(state.zone)&&state.regions[state.zone].upgrade?'artisan':state.equipment),combo:combat.time-combat.comboAt<1.4?combat.combo:0,guard:combat.companionGuard||0,slow:combat.companionSlow||0,hp:combat.hp,stamina:combat.stamina,energy:combat.energy,enemy:combat.enemy.hp,enemyMax:combat.enemy.maxHp,enemyName:combat.enemy.name,state:combat.enemy.state,active:regionalEncounter||state.zone==='france'&&state.flags.echo&&state.flags.echo2&&!state.flags.defeated,dodge:combat.dodge,attack:combat.attack?.kind},fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,cameraDistance:camera.position.distanceTo(aim),selectedDistance:state.settings.zoom,loading,cinematic:cinematic?.type,route:!!path.length});}
 async function loadZone(){
  const token=++zoneToken;impactLabels.dispose();combatInput.clear();regionalEncounter=false;if(isCountry(state.zone)){const hp=combat.hp;combat=createCombat(countryLayout(state.zone).encounter,state.zone);combat.hp=hp;}else if(combat.arena){const hp=combat.hp;combat=createCombat();combat.hp=hp;}loading=true;onLoad(true);path=[];autoTarget=null;cinematic=null;vision=0;combat.attack=null;keys.clear();stick.x=stick.z=0;moveYaw=null;movementFrame.reset();world?.dispose();world=createEnvironment(scene,state.zone,{onError,quality:lightMode?'light':'high',occlusion});audio.region(state.zone);const atmosphere=COUNTRIES[state.zone]||{sky:'#628fac',haze:'#c7d6d8'};sky.setRegion(atmosphere);scene.fog.color.set(atmosphere.haze);wolf=createCompanion(position);wolf.position=safePosition(wolf.position,state.zone,state.flags);smoothAim.set(position.x,ground(position,state.zone)+1.15,position.z);camera.position.set(position.x+Math.sin(yaw)*state.settings.zoom,3.4,position.z+Math.cos(yaw)*state.settings.zoom);camera.lookAt(smoothAim);
  try{await Promise.all([world.ready,actors.ready]);if(dead||token!==zoneToken)return;loading=false;onLoad(false);save();snapshot();}catch(e){if(!dead&&token===zoneToken){loading=false;onLoad(false);onError('Impossible de terminer le chargement 3D. '+e.message);}}
 }
 function perform(id,extra={}){
  state.hp=combat.hp;
  const before=state.zone,result=act(state,id,{position,vision:vision>0,wolfAtTarget:wolf.arrived&&distance(wolf.position,POINTS.trace)<1,wolfOnSeal:wolf.mode==='hold'&&wolf.arrived&&distance(wolf.position,POINTS.seal)<1,...extra});
  if(result.changed){Object.assign(state,result.save);if(state.zone!==before){position={...state.position};loadZone();}else{combat.hp=state.hp;save();}signal(result.cinematic||'quest');}
  if(result.encounter&&!regionalEncounter){const hp=combat.hp;combat=createCombat(countryLayout(state.zone).encounter,state.zone);combat.hp=hp;regionalEncounter=true;}if(id==='refuge'&&extra.topic==='rest'&&result.changed){combat.hp=100;combat.stamina=100;combat.energy=100;}
  if(result.message)onMessage({text:result.message,speaker:result.speaker,choices:result.choices});
  if(result.speaker){actors.talk(id);}
  if(result.cinematic&&result.changed){cinematic={type:result.cinematic,left:3,target:result.cinematic==='returned'?{x:0,z:0,y:6}:result.cinematic==='restored'?{x:0,z:-54,y:2}: {x:0,z:-54,y:2}};keys.clear();stick.x=stick.z=0;path=[];audio.event(result.cinematic);}
  snapshot();return result;
 }
 function available(){
  if(state.zone==='sanctuary')return [{id:'circle',...POINTS.circle},...WORLDS.map(w=>({...w,name:'Traverser · '+w.name}))];
  if(isCountry(state.zone))return countryLayout(state.zone).points.map(p=>{const actor=actors.npcs.find(n=>n.id===p.id);return actor?{...p,x:actor.a.object.position.x,z:actor.a.object.position.z}:p;});
  return [...actors.npcs.filter(n=>n.id.startsWith('walker')).map(n=>({id:n.id,x:n.a.object.position.x,z:n.a.object.position.z,name:'Parler à '+(n.id==='walker1'?'un habitant':'une habitante')})),...Object.entries(POINTS).filter(([id,p])=>p.zone==='france'&&(!['trace','echo','echo2','memory','secret'].includes(id)||vision>0)&&(!['echo','echo2'].includes(id)||state.flags.trial)&&(!['fragment'].includes(id)||state.flags.defeated)&&(!['flower'].includes(id)||state.flags.gardenAccepted)).map(([id,p])=>({id,...p}))];
 }
 function interact(id){if(paused||loading||cinematic)return;const p=id?available().find(p=>p.id===id):available().filter(p=>distance(position,p)<3.2).sort((a,b)=>distance(position,a)-distance(position,b))[0];if(!p)return;if(state.zone==='france'&&p.id.startsWith('walker')&&distance(position,p)<3.2){onMessage({speaker:'Habitant du quartier',text:state.flags.justice?'Les Archives ont retrouvé leurs voix. Je passe à l’atelier pour aider à réparer le quartier.':'La fontaine est notre point de rencontre. L’artisan, au sud-ouest, cherche quelqu’un pour son jardin.'});actors.talk(p.id);return;}if(isCountry(state.zone)){if(p.id==='country-encounter'&&regionalEncounter){onMessage({text:'L’épreuve est déjà en cours. Éloigne-toi vers le refuge pour te replier.'});return;}if(p.id==='country-landmark'){onMessage({text:'Tu es devant '+p.name+'. Une interprétation architecturale du monument, intégrée au Monde 3B.'});return;}const dialogue=countryDialogue(state.zone,p.id,'welcome',state);if(dialogue&&distance(position,p)<3.2){onMessage(dialogue);actors.talk(p.id);return;}}perform(p.id);}
 function action(kind){if(paused||loading||cinematic)return;audio.start(state.settings);
  if(kind==='interact'){if(regionalEncounter||state.zone==='france'&&state.flags.echo&&state.flags.echo2&&!state.flags.defeated)return;interact();return;}if(kind==='wolf'&&(regionalEncounter||state.zone==='france'&&state.flags.echo&&state.flags.echo2&&!state.flags.defeated)){const result=invokeCompanion(companionRuntime,combat,{now:time,avatar:state.avatar,player:position,companion:wolf.position,zone:state.zone,flags:state.flags,active:true});if(result.ok){signal('circle',wolf.position.x,wolf.position.z);actors.hero.action('Cast');}onMessage({text:result.text});snapshot();return;}if(kind==='wolf'){commandWolf(wolf,position,state);perform('wolf');return;}
  if(kind==='vision'){if(visionCooldown>0)return;vision=7;visionCooldown=11;actors.hero.action('Cast');signal('vision');snapshot();return;}
  if(kind==='recenter'){yaw=heading+Math.PI;manual=0;return;}
  if(kind==='skip'){cinematic=null;return;}
  if(['light','heavy','circle'].includes(kind)&&(combat.attack||combat.dodge>0)){combatInput.queue(kind,time);return;}if(kind==='dodge')combatInput.clear();
  combat.loadout=state.avatar;combat.xp=state.xp;
  if(command(combat,kind,position,isCountry(state.zone)&&state.regions[state.zone].upgrade?'artisan':state.equipment)){if(kind!=='dodge'){const e=combat.enemy;if((regionalEncounter||state.zone==='france'&&!state.flags.defeated)&&distance(position,e)<8)heading=Math.atan2(e.x-position.x,e.z-position.z);actors.hero.face(Math.sin(heading),Math.cos(heading),.12);actors.hero.action(kind==='circle'?'Cast':'Attack',combat.attack?.definition?.duration);}else actors.hero.action('Hit');signal(kind);lastEvent=combat.event?.id||lastEvent;path=[];}
 }
 function navigate(id){const p=(isCountry(state.zone)?countryLayout(state.zone).points.find(p=>p.id===id):POINTS[id])||WORLDS.find(w=>w.id===id);if(!p||paused||loading)return false;if(p.zone&&p.zone!==state.zone)return false;let destination=p;if(state.zone==='sanctuary'&&WORLDS.some(w=>w.id===id))destination={x:p.x*26/29,z:p.z*26/29};
  // Approach solids and NPCs without walking through them.
  if(!isCountry(state.zone)&&['circle','guardian','resident','atelier','refuge'].includes(id))destination={x:p.x,z:p.z+2};
  if(id==='secret')destination={x:p.x+1.1,z:p.z};
  path=route(position,destination,state.zone,state.flags);autoTarget=path.length?destination:null;return !!path.length;
 }
 const keyDown=e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat)return;keys.add(k);const commands={e:'interact',f:'wolf',v:'vision',j:'light',k:'heavy',r:'circle',' ':'dodge',c:'recenter'};if(commands[k])action(commands[k]);};
 const keyUp=e=>keys.delete(e.key.toLowerCase());
 const blur=()=>{combatInput.clear();keys.clear();pointers.clear();stick.x=stick.z=0;moveYaw=null;movementFrame.reset();clock.reset();};
 const pointerDown=e=>{if(e.target!==renderer.domElement||paused||loading)return;renderer.domElement.focus({preventScroll:true});audio.start(state.settings);const rect=renderer.domElement.getBoundingClientRect(),mode=e.pointerType==='touch'&&e.clientX-rect.left<rect.width*.43?'move':'camera';if([...pointers.values()].some(p=>p.mode===mode))return;pointers.set(e.pointerId,{mode,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:0});renderer.domElement.setPointerCapture(e.pointerId);};
 const pointerMove=e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.lastX,dy=e.clientY-p.lastY;p.moved+=Math.abs(dx)+Math.abs(dy);if(p.mode==='move'){const input=pointerStick(e.clientX-p.x,e.clientY-p.y);stick.x=input.x;stick.z=input.z;path=[];}else{yaw-=dx*.005*state.settings.sensitivity;pitch=Math.max(-.95,Math.min(.9,pitch+dy*.003*state.settings.sensitivity));manual=2.2;}p.lastX=e.clientX;p.lastY=e.clientY;};
 const pointerUp=e=>{const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);if(p.mode==='move'){stick.x=stick.z=0;movementFrame.reset();}else if(e.type==='pointerup'&&p.moved<5&&e.pointerType!=='touch'&&!paused&&!loading){const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=new T.Vector3();if(ray.ray.intersectPlane(plane,hit)){const end=safePosition({x:hit.x,z:hit.z},state.zone,state.flags);if(distance(end,{x:hit.x,z:hit.z})<1){path=route(position,end,state.zone,state.flags);autoTarget=path.length?end:null;}}}};
 const wheel=e=>{e.preventDefault();state.settings.zoom=Math.max(6,Math.min(12,state.settings.zoom+e.deltaY*.008));save();};
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setPixelRatio(renderQuality.ratio(w,h,devicePixelRatio));renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerUp);renderer.domElement.addEventListener('lostpointercapture',pointerUp);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
 let wasVisible=!document.hidden;
 const visibility=()=>{if(document.hidden&&wasVisible)save(true);wasVisible=!document.hidden;blur();audio.pause(document.hidden||paused);};document.addEventListener('visibilitychange',visibility);
 const pagehide=()=>save();window.addEventListener('pagehide',pagehide);
 function frame(){if(dead)return;raf=requestAnimationFrame(frame);clock.update();const raw=clock.getDelta(),dt=Math.min(.05,raw);time+=dt;frameCount++;frameTime+=raw;if(frameTime>=1){fps=Math.round(frameCount/frameTime);if(!paused&&!loading&&renderQuality.sample(fps,frameTime))resize();frameCount=frameTime=0;}
  let motion={dx:0,dz:0,travel:0},wMotion={dx:0,dz:0,travel:0};
  if(!paused&&!loading&&!document.hidden){
   manual=Math.max(0,manual-dt);vision=Math.max(0,vision-dt);visionCooldown=Math.max(0,visionCooldown-dt);if(cinematic){cinematic.left-=dt;if(cinematic.left<=0)cinematic=null;}
   if(!cinematic){
    let x=stick.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft')),z=stick.z+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('z')||keys.has('arrowup'));const input=movementFrame.resolve(x,z,yaw);x=input.x;z=input.z;
    if(Math.hypot(x,z)>1e-5){path=[];autoTarget=null;}
    let speed=keys.has('shift')?5.5:3.3;if(combat.attack)speed*=combat.attack.kind==='light'?.82:.58;if(combat.dodge>0){speed=10;combat.dodgeDirection??=dodgeVector(x,z,heading);x=combat.dodgeDirection.x;z=combat.dodgeDirection.z;}
    const previous=position,next=advanceMotion({position,target:path[0]||null,route:path.slice(1)},{x,z},dt,speed,[],0,(p,dx,dz)=>move(p,dx,dz,state.zone,state.flags));
    position=next.position;path=next.target?[next.target,...next.route]:[];motion={dx:position.x-previous.x,dz:position.z-previous.z,travel:next.travelled};
    if(motion.travel>.001){heading+=Math.atan2(Math.sin(Math.atan2(motion.dx,motion.dz)-heading),Math.cos(Math.atan2(motion.dx,motion.dz)-heading))*(1-Math.exp(-dt*17));stepTime+=dt;if(stepTime>(speed>4?.24:.37)){audio.event('step');stepTime=0;}}
    if(state.settings.follow&&manual===0&&motion.travel>.001){const wanted=heading+Math.PI;yaw+=Math.atan2(Math.sin(wanted-yaw),Math.cos(wanted-yaw))*(1-Math.exp(-dt*2.4));}
    wMotion=updateWolf(wolf,dt,position,state,heading);
    if(wolf.arrived&&wolf.mode==='search'&&state.flags.met&&!state.flags.scent&&distance(wolf.position,POINTS.trace)<1)perform('wolf');
    const queued=combatInput.take(time,!!combat.attack||combat.dodge>0);if(queued)action(queued);
    if(state.zone==='france'||isCountry(state.zone))stepCombat(combat,dt,position,heading,isCountry(state.zone)?{echo:regionalEncounter,echo2:regionalEncounter,defeated:!regionalEncounter}:state.flags,state.zone);else{combat.energy=Math.min(100,combat.energy+dt*2);combat.stamina=Math.min(100,combat.stamina+dt*19);combat.dodge=Math.max(0,combat.dodge-dt);combat.dodgeCooldown=Math.max(0,combat.dodgeCooldown-dt);if(combat.attack){combat.attack.elapsed+=dt;if(combat.attack.elapsed>1.2)combat.attack=null;}}
    if(combat.enemy.state!==oldEnemyState){if(combat.enemy.state==='windup')actors.enemy.action('Cast');if(combat.enemy.state==='recover')actors.enemy.action('Attack');oldEnemyState=combat.enemy.state;}
    if(combat.event&&combat.event.id!==lastEvent){lastEvent=combat.event.id;const e=combat.event;signal(e.type,e.x,e.z);impactLabels.add(e,ground({x:e.x,z:e.z},state.zone));if(e.type==='impact')actors.enemy.action('Hit');if(e.type==='hurt')actors.hero.action('Hit');if(e.type==='defeat'){actors.enemy.action('Death');if(regionalEncounter){regionalEncounter=false;perform('country-encounter',{combatVictory:true});}else perform('defeated',{combatVictory:true});}}
    if(combat.hp<=0){combat=createCombat();combat.hp=100;regionalEncounter=false;position=isCountry(state.zone)?{...countryLayout(state.zone).points.find(p=>p.id==='refuge')}:{x:0,z:-48};state.position={...position};state.hp=100;wolf=createCompanion(position);path=[];save();onMessage({text:'Le loup t’a ramené à l’abri. Tes quêtes et tes souvenirs sont conservés.'});}
   }
   combat.loadout=state.avatar;combat.xp=state.xp;
   actors.tick(dt,state,position,heading,motion,wolf,wMotion,combat,time,regionalEncounter);audio.tick(dt);
  }
  world?.update(state,vision>0,position,time);
  const pY=ground(position,state.zone),focus=cinematic?.target||{x:position.x,y:pY+1.15,z:position.z};aim.set(focus.x,focus.y,focus.z);smoothAim.lerp(aim,1-Math.exp(-dt*14));
  const flat=Math.cos(pitch)*state.settings.zoom;desired.set(smoothAim.x+Math.sin(yaw)*flat,smoothAim.y+Math.sin(pitch)*state.settings.zoom,smoothAim.z+Math.cos(yaw)*flat);
  // Reuse the scenery cutout: a nearby wall never changes the chosen lens or zoom.
  const lift=Math.max(0,pY+.45-desired.y);desired.y+=lift;aim.copy(smoothAim);aim.y+=lift;camera.position.lerp(desired,1-Math.exp(-dt*12));camera.lookAt(aim);occlusion.update(camera.position,aim);

  sun.position.set(position.x-35,55,position.z+28);sun.target.position.set(position.x,0,position.z);sun.target.updateMatrixWorld();
  const restoration=state.flags.justice?1:state.zone==='france'&&position.z< -49?.78:1;hemi.intensity=T.MathUtils.lerp(hemi.intensity,1.1*restoration,dt*2);
  danger.visible=(regionalEncounter||state.zone==='france'&&!state.flags.defeated)&&combat.enemy.state==='windup';const e=combat.enemy;if(danger.visible){danger.geometry=e.pattern%2?dangerCircle:dangerCone;danger.rotation.z=e.pattern%2?0:e.heading+Math.PI;danger.position.set(e.pattern%2?e.aim.x:e.x,.045,e.pattern%2?e.aim.z:e.z);danger.scale.setScalar(e.pattern%2?4.4:3.5);danger.material.opacity=.2+(1-Math.max(0,e.timer))* .22;}
  impactLabels.update(paused?0:dt);
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.time+=dt;if(e.velocity){e.velocity.y-=dt*7;e.object.position.addScaledVector(e.velocity,dt);e.object.scale.setScalar(1-e.time/e.duration);}else if(e.slash){e.object.scale.setScalar(e.type==='heavy'?1.7:1.15);e.object.rotation.z+=dt*5;}else e.object.scale.setScalar(.4+e.time*(e.type==='restored'?12:4));e.object.material.opacity=Math.max(0,1-e.time/e.duration)*.65;if(e.time>=e.duration){e.object.removeFromParent();e.object.material.dispose();effects.splice(i,1);}}
  targetMark.visible=!!path.length&&!!autoTarget;if(autoTarget)targetMark.position.set(autoTarget.x,ground(autoTarget,state.zone)+.08,autoTarget.z);
  if(state.settings.shake&&!paused){const recent=effects.findLast(e=>e.type==='impact'||e.type==='hurt');if(recent&&recent.time<.12)camera.position.x+=Math.sin(time*95)*.024*(1-recent.time/.12);}
  sky.update(camera,time);renderer.render(scene,camera);if(time-lastSnapshot>.2){lastSnapshot=time;snapshot();}if(time-lastSave>3&&!loading){lastSave=time;save();}
 }
 loadZone();raf=requestAnimationFrame(frame);
 return{dialogue(id,topic){if(!isCountry(state.zone))return;const p=available().find(p=>p.id===id);if(!p||distance(position,p)>3.2)return;if(['upgrade','rest','restore'].includes(topic)){perform(id,{topic});return;}if(topic==='encounter'){navigate('country-encounter');onMessage({text:'La clairière est indiquée sur la carte.'});return;}if(topic==='garden'){navigate('country-garden');onMessage({speaker:'Guide du quartier',text:'Je t’indique la promenade sur la carte. Tu peux reprendre la main à tout moment.'});return;}const d=countryDialogue(state.zone,id,topic,state);if(d){onMessage(d);actors.talk(id);}},async avatar(value,looks){const next=normalize({...state,avatar:{...value,created:true},looks});await actors.setAvatar(next.avatar);state.avatar=next.avatar;state.looks=next.looks;save();snapshot();},action,interact,navigate,skip(){cinematic=null;},pause(value){paused=value;blur();audio.pause(value);if(value)save();},settings(values){Object.assign(state.settings,values);state.settings=normalize(state).settings;audio.configure(state.settings);renderQuality.setMode(state.settings.quality==='light'?'fluid':state.settings.quality==='high'?'detail':'auto');resize();const next=lightProfile();if(next!==lightMode){lightMode=next;resize();sun.shadow.mapSize.setScalar(lightMode?1024:2048);sun.shadow.map?.dispose();sun.shadow.map=null;}save();},startAudio(){audio.start(state.settings);audio.region(state.zone);},getState(){return structuredClone({...state,position});},destroy(){if(dead)return;save();dead=true;zoneToken++;cancelAnimationFrame(raf);clock.dispose();observer.disconnect();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);window.removeEventListener('pagehide',pagehide);document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerUp);renderer.domElement.removeEventListener('lostpointercapture',pointerUp);renderer.domElement.removeEventListener('wheel',wheel);impactLabels.dispose();audio.dispose();actors.dispose();world?.dispose();sky.dispose();dangerCircle.dispose();dangerCone.dispose();dangerMat.dispose();effectGeo.dispose();slashGeo.dispose();sparkGeo.dispose();effectMat.dispose();targetMark.geometry.dispose();targetMark.material.dispose();effects.forEach(e=>e.object.material.dispose());sun.shadow.map?.dispose();renderer.dispose();renderer.domElement.remove();}};
}
