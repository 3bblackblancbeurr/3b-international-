import {weaponAnimations} from './weapon-animation.js';
import {fitWeapon} from './weapon-model.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {CARD_DESIGNS} from './card-designs.js';
import {fitGarments,garmentPattern} from './garments.js';
import {SKINS,OUTFITS} from './avatar-rules.js';
import {prepareTintMaterial} from './avatar-material.js';
import {createLocomotionMixer,smoothActorHeading} from './actor-locomotion.js';
import {createInteractionPoses} from './interaction-poses.js';
import {createInteractionReadingProp} from './interaction-reading-prop.js';
import {createCreaturePresence} from './creature-presence.js';

export function createLivingLibrary(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();let disposed=false;
 function release(asset){const geo=new Set(),mat=new Set(),tex=new Set();asset.scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){mat.add(m);for(const v of Object.values(m))if(v?.isTexture)tex.add(v);}});geo.forEach(g=>g.dispose());mat.forEach(m=>m.dispose());tex.forEach(t=>t.dispose());}
 return {load(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).then(asset=>{if(disposed){release(asset);throw Error('Vue fermée.');}return asset;}).catch(error=>{cache.delete(url);throw error;}));return cache.get(url);},dispose(){disposed=true;cache.forEach(p=>p.then(release).catch(()=>{}));cache.clear();}};
}
export function avatarRecipe(avatar){return {outerColor:avatar?.outerColor,metalColor:avatar?.metalColor||'#c9ad75',belt:avatar?.belt||'none',pendant:!!avatar?.pendant,body:avatar?.body==='femme'?1:0,style:['voyageur','sentinelle','mystique'].indexOf(avatar?.style||'voyageur'),hair:avatar?.hair??3,boots:avatar?.boots??0,height:avatar?.height??1,build:avatar?.build??1,fabric:avatar?.fabric||'cotton',patternScale:avatar?.patternScale??1,capeLength:avatar?.capeLength??1,hoodFit:avatar?.hoodFit??1,skin:avatar?.skinColor||SKINS[avatar?.skin??2],cloth:avatar?.fabricColor||OUTFITS[avatar?.color??0],accentColor:avatar?.accentColor||'#d7bd83',trouserColor:avatar?.trouserColor||'#77644d',bootColor:avatar?.bootColor||'#695239',pattern:avatar?.pattern||'uni',headwear:avatar?.headwear||'none',outer:avatar?.outer||'none',bag:!!avatar?.bag,hairColor:avatar?.hairColor||'#352a24',shape:avatar?.shape||'equilibre',face:avatar?.face||0,jaw:avatar?.jaw||0,nose:avatar?.nose||0,shoulders:avatar?.shoulders||0,chest:avatar?.chest||0,waist:avatar?.waist||0,hips:avatar?.hips||0,arms:avatar?.arms||0,legs:avatar?.legs||0,eyeSize:avatar?.eyeSize||0,browHeight:avatar?.browHeight||0,mouthWidth:avatar?.mouthWidth||0,earSize:avatar?.earSize||0,freckles:avatar?.freckles||0,scar:avatar?.scar||'none',mole:avatar?.mole||'none',beard:avatar?.beard||0,mustache:avatar?.mustache||0,hairLength:avatar?.hairLength??.5,assetSlots:avatar?.assetSlots||null};}
export function createLivingActor(library,{card,avatar,scale=1,reducedMotion=false,onLoad,onError}={}){
 const recipe=card?CARD_DESIGNS[card]:avatarRecipe(avatar),url=card?'/world/card-models/'+card+(card==='C165'?'-v2':'')+'.glb':'/world/living/traveller-'+(recipe.body*3+recipe.style)+'.glb';
 const object=new THREE.Group(),personal=new Set();let model,mixer,garments,weaponModel,readingProp,pattern,sourceIdle,creaturePresence,attention=null,actions={},legActions={},upperGait,lowerGait,current=null,dead=false,clock=0,actionEnd=0,heading=0,ready=false,combatPose={},ambientActivity=null,interactionPose=null,seatHeight=.9,seatRootOffset=0;
 object.scale.setScalar(scale);
 function transition(name,once=false){
  if(dead)return;
  const next=actions[name]||actions.Idle;if(!next||current===name&&!once)return;
  const previous=actions[current];if(current==='Locomotion')upperGait?.fadeOut(.18);next.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.enabled=true;next.setEffectiveWeight(1).setEffectiveTimeScale(1).play();if(previous&&previous!==next)previous.crossFadeTo(next,.18,false);current=name;
 }
 library.load(url).then(asset=>{
  if(dead)return;model=clone(asset.scene);object.add(model);if(!card)pattern=garmentPattern(recipe);
  model.traverse(o=>{
   if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   o.material=Array.isArray(o.material)?o.material.map(m=>{const c=m.clone();personal.add(c);return c;}):o.material?.clone();if(o.material&&!Array.isArray(o.material))personal.add(o.material);
   if(!card||recipe.kind==='person'){
    const hair=o.name.match(/^Hair_(\d+)/),boots=o.name.match(/^Boots_(\d+)/);if(!card&&hair)o.visible=Number(hair[1])===recipe.hair&&recipe.headwear!=='hood';if(!card&&boots)o.visible=Number(boots[1])===recipe.boots;
    for(const m of [o.material].flat().filter(Boolean)){
     // Imported ORM maps incorrectly made fabric and skin fully metallic.
     // These surfaces need diffuse daylight, not an environment reflection.
     if(/SkinColor|HandsColor|HairColor|ClothColor|TrouserColor|BootColor/.test(m.name))prepareTintMaterial(m,{pattern:!!pattern&&/ClothColor_ClothColor/.test(m.name)});
     if(/SkinColor|HandsColor/.test(m.name))m.color.set(recipe.skin);
     else if(/HairColor/.test(m.name))m.color.set(recipe.hairColor);
     else if(/ClothColor/.test(m.name)){m.color.set(recipe.cloth);m.roughness=({cotton:.92,linen:1,satin:.38,leather:.55})[recipe.fabric]??.92;if(pattern){m.map=pattern;m.needsUpdate=true;}}
     else if(!card&&/TrouserColor/.test(m.name))m.color.set(recipe.trouserColor);
     else if(!card&&/BootColor/.test(m.name))m.color.set(recipe.bootColor);
    }
    if(o.morphTargetDictionary)for(const [plus,minus,value] of [['FaceWide','FaceNarrow',recipe.face],['JawStrong','JawSoft',recipe.jaw],['NoseLarge','NoseSmall',recipe.nose],['ShouldersWide','ShouldersNarrow',recipe.shoulders],['ChestFull','ChestFlat',recipe.chest],['WaistWide','WaistNarrow',recipe.waist],['HipsWide','HipsNarrow',recipe.hips],['ArmsThick','ArmsThin',recipe.arms],['LegsThick','LegsThin',recipe.legs],['EyesLarge','EyesSmall',recipe.eyeSize],['BrowsHigh','BrowsLow',recipe.browHeight],['MouthWide','MouthNarrow',recipe.mouthWidth],['EarsLarge','EarsSmall',recipe.earSize]])for(const [key,v] of [[plus,Math.max(0,value)],[minus,Math.max(0,-value)]]){const index=o.morphTargetDictionary[key];if(index!==undefined)o.morphTargetInfluences[index]=v;}
   }
  });
  if(!card){const width=recipe.shape==='solide'?1.1:recipe.shape==='elance'?.92:1;model.scale.set(width*recipe.build,(recipe.shape==='elance'?1.055:1)*recipe.height,width*recipe.build);}
  if(!card){garments=fitGarments(model,recipe);if(avatar?.weapon)weaponModel=fitWeapon(model,avatar);}creaturePresence=createCreaturePresence(model,{card,reducedMotion});mixer=new THREE.AnimationMixer(model);
  const layered=!!model.getObjectByName('thigh_l'),lower=t=>/^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(t.name);
  for(const clip of asset.animations){const name=['Idle','Walk','Jog','Run','Attack','Hit','Death','Cast','Talk','Work'].find(n=>clip.name===n||clip.name.startsWith(n+'_')||clip.name.endsWith('_'+n));if(!name)continue;
   const body=layered&&name!=='Death'?new THREE.AnimationClip(name+'-upper',clip.duration,clip.tracks.filter(t=>!lower(t))):clip;actions[name]=mixer.clipAction(body);
   if(layered&&['Idle','Walk','Jog','Run'].includes(name))legActions[name]=mixer.clipAction(new THREE.AnimationClip(name+'-legs',clip.duration,clip.tracks.filter(lower)));
  }
  if(!card){
   const styleClips=weaponAnimations(asset.animations.find(c=>c.name==='Idle'),avatar?.weapon);
   for(const clip of styleClips)actions[clip.name]=mixer.clipAction(clip);
  }
  transition('Idle');mixer.update(0);
  upperGait=createLocomotionMixer(actions);lowerGait=createLocomotionMixer(legActions);
  if(!card){sourceIdle=asset.animations.find(c=>c.name==='Idle');const poses=createInteractionPoses(sourceIdle,model,{scale,seatHeight});seatRootOffset=poses.seatRootOffset;for(const clip of poses.clips)actions[clip.name]=mixer.clipAction(clip);readingProp=createInteractionReadingProp(model);}
  ready=true;if(interactionPose)transition('Pose'+interactionPose);onLoad?.();
 }).catch(error=>{if(!dead){console.error('[3B living]',url,error);onError?.('Le modèle n’a pas pu être chargé.');}});
 return {
  object,setCombat(value){combatPose=value||{};},setAttention(value){attention=value||null;},get ready(){return ready;},
  setPose(name,options={}){
   const next=['Sit','Read','Inspect'].includes(name)?name:null;
   const height=Math.max(.1,Math.min(3,Number.isFinite(options.seatHeight)?options.seatHeight:seatHeight));
   let rebuilt=false;
   if(model&&next==='Sit'&&height!==seatHeight){
    seatHeight=height;const poses=createInteractionPoses(sourceIdle,model,{scale,seatHeight});seatRootOffset=poses.seatRootOffset;
    for(const clip of poses.clips){const old=actions[clip.name];old?.stop();if(old)mixer.uncacheAction(old.getClip(),model);actions[clip.name]=mixer.clipAction(clip);}
    rebuilt=true;if(current?.startsWith('Pose'))current=null;
   }else seatHeight=height;
   if(interactionPose===next&&!rebuilt)return;interactionPose=next;actionEnd=0;readingProp?.hide();if(weaponModel?.object)weaponModel.object.visible=!next;
   if(ready&&next){lowerGait?.fadeOut(.18);transition('Pose'+next);}
  },
  poseRootOffset(height=seatHeight){return interactionPose==='Sit'?seatRootOffset+height-seatHeight:0;},
  setActivity(name){ambientActivity=['Work','Talk'].includes(name)?name:null;if(ready&&clock>=actionEnd&&actions[ambientActivity])transition(ambientActivity);},
  action(name,duration){if(!ready)return;interactionPose=null;readingProp?.hide();if(weaponModel?.object)weaponModel.object.visible=true;const timed=Number.isFinite(duration)&&duration>0;const length=timed?Math.max(.18,Math.min(3.5,duration)):(name==='Death'?2.5:name==='Hit'?.35:Math.min(3.5,Math.max(.5,actions[name]?.getClip().duration||.75)));actionEnd=clock+length;transition(name,true);if(timed&&actions[name])actions[name].setEffectiveTimeScale(actions[name].getClip().duration/length);},
  face(dx,dz,dt){heading=smoothActorHeading(heading,dx,dz,dt);object.rotation.y=heading;},
  update(dt,dx=0,dz=0,travelled=0){
   if(dead)return;dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.25));clock+=dt;garments?.update(clock);if(!mixer)return;
   const speed=dt>0?Math.max(0,travelled)/dt:0,localSpeed=speed/Math.max(.01,scale);
   if(combatPose.guard>0&&actions.Guard){if(current!=='Guard')transition('Guard',true);actionEnd=clock+.1;}else if(current==='Guard'&&clock<actionEnd)actionEnd=clock;
   if(interactionPose&&clock>=actionEnd){if(current!=='Pose'+interactionPose)transition('Pose'+interactionPose);}
   else if(clock>=actionEnd){
    if(speed<=.08&&ambientActivity&&actions[ambientActivity])transition(ambientActivity);
    else{if(current!=='Locomotion'){actions[current]?.fadeOut(.18);current='Locomotion';}upperGait?.update(localSpeed,dt);}
   }
   if(speed>.08&&!interactionPose)this.face(dx,dz,dt);
   if((current==='Death'&&clock<actionEnd)||interactionPose)lowerGait?.stop();else lowerGait?.update(localSpeed,dt);
   creaturePresence?.beforeMixer();
   for(let remaining=dt;remaining>1e-7;){const step=Math.min(.05,remaining);mixer.update(step);remaining-=step;}
   creaturePresence?.update(dt,clock,{viewer:attention,active:clock<actionEnd,speed});
   readingProp?.update(interactionPose==='Read'&&current==='PoseRead'&&clock>=actionEnd);
   // The hand bone now has this frame's pose before detached/evolved parts are
   // placed. Updating the weapon before the mixer caused a one-frame hand lag.
   if(weaponModel?.object)weaponModel.object.visible=!interactionPose;weaponModel?.update(clock,combatPose,{reducedMotion});
  },
  reset(){heading=0;object.rotation.y=0;actionEnd=0;ambientActivity=null;interactionPose=null;readingProp?.hide();if(weaponModel?.object)weaponModel.object.visible=true;upperGait?.reset();lowerGait?.reset();transition('Idle');},
  setColor(color){if(card)return;recipe.cloth=color||avatarRecipe(avatar).cloth;for(const m of personal)if(/ClothColor/.test(m.name))m.color.set(recipe.cloth);},
  dispose(){if(dead)return;dead=true;ready=false;readingProp?.dispose();garments?.dispose();weaponModel?.dispose();creaturePresence?.dispose();pattern?.dispose();mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}personal.forEach(m=>m.dispose());object.clear();}
 };
}
