import {weaponAnimations} from './weapon-animation.js';
import {fitWeapon} from './weapon-model.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {CARD_DESIGNS} from './card-designs.js';
import {fitGarments,garmentPattern} from './garments.js';
import {SKINS,OUTFITS} from './avatar-rules.js';
import {prepareTintMaterial,characterMaterialSurface} from './avatar-material.js';
import {createLocomotionMixer,smoothActorHeading} from './actor-locomotion.js';
import {createInteractionPoses} from './interaction-poses.js';
import {createInteractionReadingProp} from './interaction-reading-prop.js';
import {createCreaturePresence} from './creature-presence.js';
import {guardianIdentity,guardianRecipe} from './guardian-identity.js';
import {fitGuardianAppearance} from './guardian-appearance.js';
import {fitGuardianWeapons} from './guardian-weapons.js';
import {guardianWeaponAnimations} from './guardian-animation.js';

export function createLivingLibrary(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();let disposed=false;
 function release(asset){const geo=new Set(),mat=new Set(),tex=new Set();asset.scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){mat.add(m);for(const v of Object.values(m))if(v?.isTexture)tex.add(v);}});geo.forEach(g=>g.dispose());mat.forEach(m=>m.dispose());tex.forEach(t=>t.dispose());}
 return {load(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).then(asset=>{if(disposed){release(asset);throw Error('Vue fermée.');}return asset;}).catch(error=>{cache.delete(url);throw error;}));return cache.get(url);},dispose(){disposed=true;cache.forEach(p=>p.then(release).catch(()=>{}));cache.clear();}};
}
export function avatarRecipe(avatar){return {outerColor:avatar?.outerColor,metalColor:avatar?.metalColor||'#c9ad75',belt:avatar?.belt||'none',pendant:!!avatar?.pendant,body:avatar?.body==='femme'?1:0,style:['voyageur','sentinelle','mystique'].indexOf(avatar?.style||'voyageur'),hair:avatar?.hair??3,boots:avatar?.boots??0,height:avatar?.height??1,build:avatar?.build??1,fabric:avatar?.fabric||'cotton',patternScale:avatar?.patternScale??1,capeLength:avatar?.capeLength??1,hoodFit:avatar?.hoodFit??1,skin:avatar?.skinColor||SKINS[avatar?.skin??2],cloth:avatar?.fabricColor||OUTFITS[avatar?.color??0],accentColor:avatar?.accentColor||'#d7bd83',trouserColor:avatar?.trouserColor||'#77644d',bootColor:avatar?.bootColor||'#695239',pattern:avatar?.pattern||'uni',headwear:avatar?.headwear||'none',outer:avatar?.outer||'none',bag:!!avatar?.bag,hairColor:avatar?.hairColor||'#352a24',shape:avatar?.shape||'equilibre',face:avatar?.face||0,jaw:avatar?.jaw||0,nose:avatar?.nose||0,shoulders:avatar?.shoulders||0,chest:avatar?.chest||0,waist:avatar?.waist||0,hips:avatar?.hips||0,arms:avatar?.arms||0,legs:avatar?.legs||0,eyeSize:avatar?.eyeSize||0,browHeight:avatar?.browHeight||0,mouthWidth:avatar?.mouthWidth||0,earSize:avatar?.earSize||0,freckles:avatar?.freckles||0,scar:avatar?.scar||'none',mole:avatar?.mole||'none',beard:avatar?.beard||0,mustache:avatar?.mustache||0,hairLength:avatar?.hairLength??.5,assetSlots:avatar?.assetSlots||null};}
export function createLivingActor(library,{card,avatar,scale=1,reducedMotion=false,guardian=true,onLoad,onError}={}){
 const identity=guardian&&card?guardianIdentity(card):null,recipe=identity?guardianRecipe(identity):card?CARD_DESIGNS[card]:avatarRecipe(avatar),url=identity?identity.asset:card?'/world/card-models/'+card+(card==='C165'?'-v2':'')+'.glb':'/world/living/traveller-'+(recipe.body*3+recipe.style)+'.glb';
 const object=new THREE.Group(),personal=new Set();let model,mixer,garments,weaponModel,readingProp,pattern,sourceIdle,creaturePresence,guardianAppearance,lodDistance=0,lodFull=true,guardianState={liberated:false,phase:1,threat:0,power:0},guardianAnticipation=false,attention=null,actions={},legActions={},airActions={},upperGait,lowerGait,current=null,dead=false,clock=0,actionEnd=0,jumpEnd=0,jumpStart=0,jumpScale=1,jumpLayered=false,airUpper=null,airUpperEnd=0,heading=0,ready=false,combatPose={},ambientActivity=null,interactionPose=null,seatHeight=.9,seatRootOffset=0;
 object.scale.setScalar(scale);if(identity)object.userData.guardianIdentity={card,region:identity.region,name:identity.name,value:identity.value,totem:identity.totem,art:'humanoid-web-adaptation'};
 function transition(name,once=false){
  if(dead)return;
  const next=actions[name]||actions.Idle;if(!next||current===name&&!once)return;
  const previous=actions[current];if(current==='Locomotion')upperGait?.fadeOut(.18);next.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.enabled=true;next.setEffectiveWeight(1).setEffectiveTimeScale(1).play();if(previous&&previous!==next)previous.crossFadeTo(next,.18,false);current=name;
 }
 const jumping=()=>clock<jumpEnd;
 function airTime(seconds=clock){return Math.max(0,seconds-jumpStart)*jumpScale;}
 function startAirUpper(name,duration){
  if(!ready||!jumping()||!airActions[name]||!actions.JumpFlight)return false;
  if(!jumpLayered){
   const time=actions.Jump.time;actions.Jump.stop();
   const lower=actions.JumpFlight;lower.reset().setLoop(THREE.LoopOnce,1);lower.clampWhenFinished=true;lower.enabled=true;lower.setEffectiveWeight(1).setEffectiveTimeScale(jumpScale).play();lower.time=time;
   const upper=airActions.Jump;upper.reset().setLoop(THREE.LoopOnce,1);upper.clampWhenFinished=true;upper.enabled=true;upper.setEffectiveWeight(1).setEffectiveTimeScale(jumpScale).play();upper.time=time;airUpper='Jump';jumpLayered=true;
  }
  const previous=airActions[airUpper],next=airActions[name],length=Math.max(.18,Math.min(3.5,Number.isFinite(duration)&&duration>0?duration:.55));
  next.reset().setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;next.enabled=true;next.setEffectiveWeight(1).setEffectiveTimeScale(next.getClip().duration/length).play();if(previous&&previous!==next)previous.crossFadeTo(next,.12,false);
  airUpper=name;airUpperEnd=clock+length;return true;
 }
 function endAirborne(cancel=false){
  if(!jumpEnd&&!jumpLayered)return false;
  const continuation=jumpLayered&&airUpper&&airUpper!=='Jump'&&clock<airUpperEnd&&!cancel?airUpper:null;
  const old=airActions[airUpper],time=old?.time,rate=old?.getEffectiveTimeScale(),continuationEnd=airUpperEnd;
  if(cancel)actions.JumpFlight?.stop();else actions.JumpFlight?.fadeOut(.12);for(const action of Object.values(airActions))action.stop();
  if(cancel)actions.Jump?.stop();jumpEnd=0;jumpLayered=false;airUpper=null;airUpperEnd=0;
  if(continuation){const next=actions[continuation];next.reset().setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;next.enabled=true;next.setEffectiveWeight(1).setEffectiveTimeScale(rate).play();next.time=time;current=continuation;actionEnd=continuationEnd;}
  else if(cancel){actionEnd=0;current=null;transition('Idle');lowerGait?.update(0,0);mixer?.update(0);}
  return true;
 }
 library.load(url).then(asset=>{
  if(dead)return;model=clone(asset.scene);object.add(model);if(!card)pattern=garmentPattern(recipe);
  model.traverse(o=>{
   if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   o.material=Array.isArray(o.material)?o.material.map(m=>{const c=m.clone();personal.add(c);return c;}):o.material?.clone();if(o.material&&!Array.isArray(o.material))personal.add(o.material);
   if(!card||recipe.kind==='person'||identity){
    const hair=o.name.match(/^Hair_(\d+)/),boots=o.name.match(/^Boots_(\d+)/);if((!card||identity)&&hair)o.visible=Number(hair[1])===recipe.hair&&recipe.headwear!=='hood'&&!identity?.hood;if((!card||identity)&&boots)o.visible=Number(boots[1])===recipe.boots;
    for(const m of [o.material].flat().filter(Boolean)){
     // Hands are a separate skin slot even when the exporter prefixes the
     // material with ClothColor. Keep skin, woven fabric and leather distinct.
     const surface=characterMaterialSurface(m.name);
     if(/SkinColor|HandsColor|EyeColor|HairColor|ClothColor|TrouserColor|BootColor|TrimColor/.test(m.name))prepareTintMaterial(m,{surface,fabric:/TrouserColor/.test(m.name)?'cotton':recipe.fabric,pattern:!!pattern&&/ClothColor_ClothColor/.test(m.name),tint:surface!=='metal'||!card||!!identity});
     if(/SkinColor|HandsColor/.test(m.name))m.color.set(recipe.skin);
     else if(/HairColor/.test(m.name))m.color.set(recipe.hairColor);
     else if(/ClothColor/.test(m.name)){m.color.set(recipe.cloth);if(pattern){m.map=pattern;m.needsUpdate=true;}}
     else if((!card||identity)&&/TrouserColor/.test(m.name))m.color.set(recipe.trouserColor);
     else if((!card||identity)&&/BootColor/.test(m.name))m.color.set(recipe.bootColor);
     else if((!card||identity)&&/TrimColor/.test(m.name))m.color.set(identity?.trim||recipe.metalColor||recipe.accentColor);
    }
    if(o.morphTargetDictionary)for(const [plus,minus,value] of [['FaceWide','FaceNarrow',recipe.face],['JawStrong','JawSoft',recipe.jaw],['NoseLarge','NoseSmall',recipe.nose],['ShouldersWide','ShouldersNarrow',recipe.shoulders],['ChestFull','ChestFlat',recipe.chest],['WaistWide','WaistNarrow',recipe.waist],['HipsWide','HipsNarrow',recipe.hips],['ArmsThick','ArmsThin',recipe.arms],['LegsThick','LegsThin',recipe.legs],['EyesLarge','EyesSmall',recipe.eyeSize],['BrowsHigh','BrowsLow',recipe.browHeight],['MouthWide','MouthNarrow',recipe.mouthWidth],['EarsLarge','EarsSmall',recipe.earSize]])for(const [key,v] of [[plus,Math.max(0,value)],[minus,Math.max(0,-value)]]){const index=o.morphTargetDictionary[key];if(index!==undefined)o.morphTargetInfluences[index]=v;}
   }
  });
  if(!card||identity){const width=recipe.shape==='solide'?1.1:recipe.shape==='elance'?.92:1;model.scale.set(width*recipe.build,(recipe.shape==='elance'?1.055:1)*recipe.height,width*recipe.build);}
  if(!card||identity){garments=fitGarments(model,recipe,{reducedMotion});if(identity){guardianAppearance=fitGuardianAppearance(model,identity,{reducedMotion});guardianAppearance?.setState(guardianState);weaponModel=fitGuardianWeapons(model,identity);}else if(avatar?.weapon)weaponModel=fitWeapon(model,avatar);}creaturePresence=identity?null:createCreaturePresence(model,{card,reducedMotion});mixer=new THREE.AnimationMixer(model);
  const layered=!!model.getObjectByName('thigh_l'),lower=t=>/^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(t.name);
  for(const clip of asset.animations){const name=['Idle','Walk','Jog','Run','Jump','Attack','Hit','Death','Cast','Talk','Work'].find(n=>clip.name===n||clip.name.startsWith(n+'_')||clip.name.endsWith('_'+n));if(!name)continue;
   // Airborne knees, ankles and pelvis belong to the authored jump. Walking
   // remains layered for attacks, but must not overwrite those airborne poses.
   const body=layered&&name!=='Death'&&name!=='Jump'?new THREE.AnimationClip(name+'-upper',clip.duration,clip.tracks.filter(t=>!lower(t))):clip;actions[name]=mixer.clipAction(body);
   if(layered&&['Idle','Walk','Jog','Run'].includes(name))legActions[name]=mixer.clipAction(new THREE.AnimationClip(name+'-legs',clip.duration,clip.tracks.filter(lower)));
   if(layered&&name==='Jump'){actions.JumpFlight=mixer.clipAction(new THREE.AnimationClip('Jump-flight-legs',clip.duration,clip.tracks.filter(lower)));airActions.Jump=mixer.clipAction(new THREE.AnimationClip('Jump-flight-upper',clip.duration,clip.tracks.filter(t=>!lower(t))));}
  }
  if(!card||identity){
   const weaponStyle=identity?(['dagues','baltiques','tolede','kilij'].includes(identity.weapon)?'scissors':'paris'):avatar?.weapon;
   const styleClips=weaponAnimations(asset.animations.find(c=>c.name==='Idle'),weaponStyle);
   for(const clip of styleClips)actions[clip.name]=mixer.clipAction(clip);
   if(identity){for(const clip of guardianWeaponAnimations(model,identity,weaponModel,styleClips))actions[clip.name]=mixer.clipAction(clip);actions.Attack=actions.GuardianAttack;actions.Attack2=actions.GuardianAttack2;actions.Attack3=actions.GuardianAttack3;actions.Guard=actions.GuardianGuard;actions.Parry=actions.Guard;actions.Signature=actions.Cast;actions.Stagger=actions.Hit;actions.Liberation=actions.Cast;actions.Victory=actions.Talk;}
  }
  // Create the masks from the final weapon-specific actions, after their
  // overrides. Aerial arms use the same grip and gesture as the ground action.
  for(const name of ['Attack','Guard','Cast'])if(actions[name]){const clip=actions[name].getClip();airActions[name]=mixer.clipAction(new THREE.AnimationClip('Air-'+name,clip.duration,clip.tracks.filter(t=>!lower(t)).map(t=>t.clone())));}
  transition('Idle');mixer.update(0);
  upperGait=createLocomotionMixer(actions);lowerGait=createLocomotionMixer(legActions);
  if(!card){sourceIdle=asset.animations.find(c=>c.name==='Idle');const poses=createInteractionPoses(sourceIdle,model,{scale,seatHeight});seatRootOffset=poses.seatRootOffset;for(const clip of poses.clips)actions[clip.name]=mixer.clipAction(clip);readingProp=createInteractionReadingProp(model);}
  lodFull=guardianAppearance?.setDistance(lodDistance)??true;weaponModel?.setVisible?.(lodFull);ready=true;if(interactionPose)transition('Pose'+interactionPose);onLoad?.();
 }).catch(error=>{if(!dead){console.error('[3B living]',url,error);onError?.('Le modèle n’a pas pu être chargé.');}});
 return {
  object,airAction:startAirUpper,cancelAirborne(){return endAirborne(true);},get airborne(){return jumping();},setLod(distance){if(!identity)return;lodDistance=distance;lodFull=guardianAppearance?.setDistance(distance)??true;weaponModel?.setVisible?.(lodFull&&!interactionPose);},setGuardianState(value){guardianState={...guardianState,...value};guardianAppearance?.setState(guardianState);},snapshotGuardian(){return identity?{...guardianAppearance?.diagnostics(),ready,animation:current,weapons:weaponModel?.diagnostics()||[]}:null;},setCombat(value){combatPose=value||{};},setAttention(value){attention=value||null;},get ready(){return ready;},
  setPose(name,options={}){
   const next=['Sit','Read','Inspect'].includes(name)?name:null;
   const height=Math.max(.1,Math.min(3,Number.isFinite(options.seatHeight)?options.seatHeight:seatHeight));
   let rebuilt=false;
   if(model&&next==='Sit'&&height!==seatHeight){
    seatHeight=height;const poses=createInteractionPoses(sourceIdle,model,{scale,seatHeight});seatRootOffset=poses.seatRootOffset;
    for(const clip of poses.clips){const old=actions[clip.name];old?.stop();if(old)mixer.uncacheAction(old.getClip(),model);actions[clip.name]=mixer.clipAction(clip);}
    rebuilt=true;if(current?.startsWith('Pose'))current=null;
   }else seatHeight=height;
   if(interactionPose===next&&!rebuilt)return;interactionPose=next;actionEnd=0;readingProp?.hide();if(weaponModel?.object)weaponModel.object.visible=!next;weaponModel?.setVisible?.(lodFull&&!next);
   if(ready&&next){lowerGait?.fadeOut(.18);transition('Pose'+next);}
  },
  poseRootOffset(height=seatHeight){return interactionPose==='Sit'?seatRootOffset+height-seatHeight:0;},
  setActivity(name){ambientActivity=['Work','Talk'].includes(name)?name:null;if(ready&&clock>=actionEnd&&actions[ambientActivity])transition(ambientActivity);},
  setGuardianAnticipation(value){
   const next=!!identity&&!!value;if(next===guardianAnticipation)return next;
   guardianAnticipation=next;
   if(!next&&current==='GuardianAnticipation'){actionEnd=0;current=null;transition('Idle');}
   return next;
  },
  action(name,duration){if(!ready)return false;if(jumping())return startAirUpper(name,duration);interactionPose=null;readingProp?.hide();if(weaponModel?.object)weaponModel.object.visible=true;weaponModel?.setVisible?.(lodFull);const timed=Number.isFinite(duration)&&duration>0;const length=timed?Math.max(.18,Math.min(3.5,duration)):(name==='Death'?2.5:name==='Hit'?.35:Math.min(3.5,Math.max(.5,actions[name]?.getClip().duration||.75)));actionEnd=clock+length;transition(name,true);if(timed&&actions[name])actions[name].setEffectiveTimeScale(actions[name].getClip().duration/length);if(name==='Jump'&&actions.Jump){jumpStart=clock;jumpEnd=actionEnd;jumpScale=actions.Jump.getClip().duration/length;}return true;},
  face(dx,dz,dt){heading=smoothActorHeading(heading,dx,dz,dt);object.rotation.y=heading;},
  update(dt,dx=0,dz=0,travelled=0){
   if(dead)return;dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.25));clock+=dt;garments?.update(clock);guardianAppearance?.update(clock);if(!mixer)return;
   const speed=dt>0?Math.max(0,travelled)/dt:0,localSpeed=speed/Math.max(.01,scale);
   // Exploration supplies a guard envelope every frame. A field-combat guard
   // is a timed action instead, and an absent envelope must not cancel it.
   if(jumpEnd&&!jumping())endAirborne();
   // The accepted phase owns this envelope. Clamp the final preparation pose
   // through pauses/extensions without restarting it or timing a local strike.
   if(guardianAnticipation&&!jumping()){
    if(clock>=actionEnd&&current!=='GuardianAnticipation')transition('GuardianAnticipation',true);
    if(current==='GuardianAnticipation')actionEnd=clock+.1;
   }
   if(jumping()){
    if(combatPose.guard>0&&airActions.Guard){if(airUpper!=='Guard')startAirUpper('Guard',.2);else airUpperEnd=clock+.1;}
    else if(Object.hasOwn(combatPose,'guard')&&airUpper==='Guard'&&clock<airUpperEnd)airUpperEnd=clock;
    if(jumpLayered&&airUpper!=='Jump'&&clock>=airUpperEnd){const previous=airActions[airUpper],next=airActions.Jump;next.reset().setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;next.enabled=true;next.setEffectiveWeight(1).setEffectiveTimeScale(jumpScale).play();next.time=airTime(clock-dt);previous?.crossFadeTo(next,.12,false);airUpper='Jump';}
   }else if(combatPose.guard>0&&actions.Guard){if(current!=='Guard')transition('Guard',true);actionEnd=clock+.1;}else if(Object.hasOwn(combatPose,'guard')&&current==='Guard'&&clock<actionEnd)actionEnd=clock;
   if(interactionPose&&clock>=actionEnd){if(current!=='Pose'+interactionPose)transition('Pose'+interactionPose);}
   else if(clock>=actionEnd){
    if(speed<=.08&&ambientActivity&&actions[ambientActivity])transition(ambientActivity);
    else{if(current!=='Locomotion'){actions[current]?.fadeOut(.18);current='Locomotion';}upperGait?.update(localSpeed,dt);}
   }
   if(speed>.08&&!interactionPose)this.face(dx,dz,dt);
   if(jumping()||(current==='Death'&&clock<actionEnd)||interactionPose)lowerGait?.stop();else lowerGait?.update(localSpeed,dt);
   creaturePresence?.beforeMixer();
   for(let remaining=dt;remaining>1e-7;){const step=Math.min(.05,remaining);mixer.update(step);remaining-=step;}
   creaturePresence?.update(dt,clock,{viewer:attention,active:clock<actionEnd,speed});
   readingProp?.update(interactionPose==='Read'&&current==='PoseRead'&&clock>=actionEnd);
   // The hand bone now has this frame's pose before detached/evolved parts are
   // placed. Updating the weapon before the mixer caused a one-frame hand lag.
   if(weaponModel?.object)weaponModel.object.visible=!interactionPose;weaponModel?.setVisible?.(lodFull&&!interactionPose);weaponModel?.update(clock,combatPose,{reducedMotion});
  },
  reset(){endAirborne(true);guardianAnticipation=false;heading=0;object.rotation.y=0;actionEnd=0;ambientActivity=null;interactionPose=null;readingProp?.hide();if(weaponModel?.object)weaponModel.object.visible=true;upperGait?.reset();lowerGait?.reset();transition('Idle');},
  setColor(color){if(card)return;recipe.cloth=color||avatarRecipe(avatar).cloth;for(const m of personal)if(/ClothColor/.test(m.name))m.color.set(recipe.cloth);},
  dispose(){if(dead)return;dead=true;ready=false;readingProp?.dispose();garments?.dispose();weaponModel?.dispose();guardianAppearance?.dispose();creaturePresence?.dispose();pattern?.dispose();mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}personal.forEach(m=>m.dispose());object.clear();}
 };
}
