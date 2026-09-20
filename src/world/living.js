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
import {FACE_CAPABILITIES,BODY_CAPABILITIES} from './avatar-capabilities.js';

export function createLivingLibrary(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();let disposed=false;
 function release(asset){const geo=new Set(),mat=new Set(),tex=new Set();asset.scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){mat.add(m);for(const v of Object.values(m))if(v?.isTexture)tex.add(v);}});geo.forEach(g=>g.dispose());mat.forEach(m=>m.dispose());tex.forEach(t=>t.dispose());}
 return {load(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).then(asset=>{if(disposed){release(asset);throw Error('Vue fermée.');}return asset;}).catch(error=>{cache.delete(url);throw error;}));return cache.get(url);},dispose(){disposed=true;cache.forEach(p=>p.then(release).catch(()=>{}));cache.clear();}};
}
export function avatarRecipe(avatar){return {outerColor:avatar?.outerColor,metalColor:avatar?.metalColor||'#c9ad75',belt:avatar?.belt||'none',pendant:!!avatar?.pendant,body:avatar?.body==='femme'?1:0,style:['voyageur','sentinelle','mystique'].indexOf(avatar?.style||'voyageur'),hair:avatar?.hair??3,boots:avatar?.boots??0,height:avatar?.height??1,build:avatar?.build??1,fabric:avatar?.fabric||'cotton',patternScale:avatar?.patternScale??1,patternRotation:avatar?.patternRotation??0,patternIntensity:avatar?.patternIntensity??.8,capeLength:avatar?.capeLength??1,hoodFit:avatar?.hoodFit??1,skin:avatar?.skinColor||SKINS[avatar?.skin??2],skinUndertone:avatar?.skinUndertone||'neutral',cloth:avatar?.fabricColor||OUTFITS[avatar?.color??0],accentColor:avatar?.accentColor||'#d7bd83',trouserColor:avatar?.trouserColor||'#77644d',bootColor:avatar?.bootColor||'#695239',pattern:avatar?.pattern||'uni',headwear:avatar?.headwear||'none',outer:avatar?.outer||'none',bag:!!avatar?.bag,hairColor:avatar?.hairColor||'#352a24',shape:avatar?.shape||'equilibre',face:avatar?.face||0,jaw:avatar?.jaw||0,nose:avatar?.nose||0,shoulders:avatar?.shoulders||0,chest:avatar?.chest||0,waist:avatar?.waist||0,hips:avatar?.hips||0,arms:avatar?.arms||0,legs:avatar?.legs||0,eyeSize:avatar?.eyeSize||0,browHeight:avatar?.browHeight||0,mouthWidth:avatar?.mouthWidth||0,earSize:avatar?.earSize||0,freckles:avatar?.freckles||0,scar:avatar?.scar||'none',mole:avatar?.mole||'none',beard:avatar?.beard||0,mustache:avatar?.mustache||0,hairLength:avatar?.hairLength??.5,assetSlots:avatar?.assetSlots||null,weapon:avatar?.weapon||'heritage',...Object.fromEntries(FACE_CAPABILITIES.filter(x=>!['face','jaw','nose'].includes(x.id)).map(x=>[x.id,avatar?.[x.id]||0])),posture:avatar?.posture||'neutral',handedness:avatar?.handedness==='left'?'left':'right'};}
function skinTint(recipe){const c=new THREE.Color(recipe.skin||'#c89b78');if(recipe.skinUndertone==='warm')c.lerp(new THREE.Color('#ffb48f'),.08);if(recipe.skinUndertone==='cool')c.lerp(new THREE.Color('#b7d2ff'),.065);return c;}
const EXPRESSION_TARGETS={
 smile:['Smile','MouthSmile','MouthSmile_L','MouthSmile_R'],
 serious:['Frown','MouthFrown','BrowDown','BrowDown_L','BrowDown_R'],
 surprise:['Surprise','MouthOpen','EyesWide','EyeWide_L','EyeWide_R']
};
function applyFaceTargets(mesh,recipe,morphTargets){
 if(!mesh.morphTargetDictionary)return;
 for(const key of Object.keys(mesh.morphTargetDictionary))morphTargets.add(key);
 for(const cap of [...FACE_CAPABILITIES,...BODY_CAPABILITIES]){
  const value=Number(recipe[cap.id])||0,[plus,minus]=cap.morphs||[];
  for(const [key,v] of [[plus,Math.max(0,value)],[minus,Math.max(0,-value)]]){const index=mesh.morphTargetDictionary[key];if(index!==undefined)mesh.morphTargetInfluences[index]=v;}
 }
}
export const avatarModelKey=avatar=>`${avatar?.body==='femme'?'femme':'homme'}:${['voyageur','sentinelle','mystique'].includes(avatar?.style)?avatar.style:'voyageur'}`;
export function createLivingActor(library,{card,avatar,scale=1,onLoad,onError,weaponState='world'}={}){
 let currentAvatar=avatar?{...avatar}:null,currentAvatarSignature=JSON.stringify(currentAvatar||{}),recipe=card?CARD_DESIGNS[card]:avatarRecipe(currentAvatar),url=card?'/world/card-models/'+card+(card==='C165'?'-v2':'')+'.glb':'/world/living/traveller-'+(recipe.body*3+recipe.style)+'.glb';
 const object=new THREE.Group(),personal=new Set(),morphTargets=new Set();let model,mixer,garments,weaponModel,pattern,idleClip,actions={},legActions={},legCurrent=null,current=null,dead=false,clock=0,actionEnd=0,heading=0,ready=false,combatPose={},weaponForced=weaponState==='preview',weaponReadyUntil=0,lastArmed=weaponState==='preview',blinkMeshes=[],morphMeshes=[],nextBlink=2.4,blinkStart=-1,expression='neutral';
 object.scale.setScalar(scale);
 const postureQuaternions=new Map();
 function applyPosture(){if(card||!model||current==='Death')return;const poses={neutral:{},relaxed:{spine_02:[.035,0,.015],spine_03:[.025,0,0]},confident:{spine_02:[-.028,0,0],spine_03:[-.035,0,0]},warrior:{spine_02:[.055,0,0],spine_03:[.035,0,0]}},pose=poses[recipe.posture]||poses.neutral;for(const [name,euler] of Object.entries(pose)){const bone=model.getObjectByName(name);if(!bone)continue;let q=postureQuaternions.get(name+recipe.posture);if(!q){q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler));postureQuaternions.set(name+recipe.posture,q);}bone.quaternion.multiply(q);}model.updateMatrixWorld(true,true);}
 function transition(name,once=false){
  if(dead)return;
  const next=actions[name]||actions.Idle;if(!next||current===name&&!once)return;
  const previous=actions[current];next.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.enabled=true;next.setEffectiveWeight(1).setEffectiveTimeScale(1).play();if(previous&&previous!==next)previous.crossFadeTo(next,.18,false);current=name;
 }
 function applyAvatar(nextAvatar,{forceGarments=false}={}){
  if(card||!nextAvatar||!model)return;
  const signature=JSON.stringify(nextAvatar);if(!forceGarments&&signature===currentAvatarSignature)return;
  const previous=currentAvatar||{},nextRecipe=avatarRecipe(nextAvatar);
  const garmentKeys=['headwear','outer','bag','belt','pendant','outerColor','metalColor','accentColor','bootColor','fabricColor','color','fabric','pattern','patternScale','patternRotation','patternIntensity','capeLength','hoodFit'];
  const garmentsChanged=forceGarments||garmentKeys.some(key=>previous?.[key]!==nextAvatar?.[key]);
  const weaponChanged=previous?.weapon!==nextAvatar?.weapon||previous?.weaponForm!==nextAvatar?.weaponForm||previous?.handedness!==nextAvatar?.handedness;
  currentAvatar={...nextAvatar};currentAvatarSignature=signature;recipe=nextRecipe;const skinTone=skinTint(recipe);
  const width=recipe.shape==='solide'?1.1:recipe.shape==='elance'?.92:1;model.scale.set(width*recipe.build,(recipe.shape==='elance'?1.055:1)*recipe.height,width*recipe.build);
  if(garmentsChanged){garments?.dispose();pattern?.dispose();pattern=garmentPattern(recipe);garments=fitGarments(model,recipe);}
  model.traverse(o=>{
   if(!o.isMesh)return;
   const hair=o.name.match(/^Hair_(\d+)/),boots=o.name.match(/^Boots_(\d+)/);if(hair)o.visible=Number(hair[1])===recipe.hair&&recipe.headwear!=='hood';if(boots)o.visible=Number(boots[1])===recipe.boots;
   for(const m of [o.material].flat().filter(Boolean)){
    if(/SkinColor|HandsColor/.test(m.name))m.color.copy(skinTone);
    else if(/HairColor/.test(m.name))m.color.set(recipe.hairColor);
    else if(/ClothColor/.test(m.name)){m.color.set(recipe.cloth);m.roughness=({cotton:.92,linen:1,satin:.38,leather:.55})[recipe.fabric]??.92;if(garmentsChanged){m.map=pattern||null;m.needsUpdate=true;}}
    else if(/TrouserColor/.test(m.name))m.color.set(recipe.trouserColor);
    else if(/BootColor/.test(m.name))m.color.set(recipe.bootColor);
   }
   if(o.morphTargetDictionary){applyFaceTargets(o,recipe,morphTargets);if(!morphMeshes.includes(o))morphMeshes.push(o);if(['Blink_L','Blink_R','EyeBlink_L','EyeBlink_R'].some(key=>o.morphTargetDictionary[key]!==undefined)&&!blinkMeshes.includes(o))blinkMeshes.push(o);}
  });
  if(weaponChanged){weaponModel?.dispose();weaponModel=nextAvatar.weapon?fitWeapon(model,nextAvatar,{drawn:weaponForced,library}):null;lastArmed=weaponForced;if(mixer&&idleClip){for(const clip of weaponAnimations(idleClip,nextAvatar.weapon,nextAvatar.handedness)){actions[clip.name]?.stop();actions[clip.name]=mixer.clipAction(clip);}}}
 }
 library.load(url).then(asset=>{
  if(dead)return;model=clone(asset.scene);object.add(model);if(!card)pattern=garmentPattern(recipe);const skinTone=skinTint(recipe);
  model.traverse(o=>{
   if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   o.material=Array.isArray(o.material)?o.material.map(m=>{const c=m.clone();personal.add(c);return c;}):o.material?.clone();if(o.material&&!Array.isArray(o.material))personal.add(o.material);
   if(!card||recipe.kind==='person'){
    const hair=o.name.match(/^Hair_(\d+)/),boots=o.name.match(/^Boots_(\d+)/);if(!card&&hair)o.visible=Number(hair[1])===recipe.hair&&recipe.headwear!=='hood';if(!card&&boots)o.visible=Number(boots[1])===recipe.boots;
    for(const m of [o.material].flat().filter(Boolean)){
     // Imported ORM maps incorrectly made fabric and skin fully metallic.
     // These surfaces need diffuse daylight, not an environment reflection.
     if(/SkinColor|HandsColor|HairColor|ClothColor|TrouserColor|BootColor/.test(m.name))prepareTintMaterial(m,{pattern:!!pattern&&/ClothColor_ClothColor/.test(m.name)});
     if(/SkinColor|HandsColor/.test(m.name))m.color.copy(skinTone);
     else if(/HairColor/.test(m.name))m.color.set(recipe.hairColor);
     else if(/ClothColor/.test(m.name)){m.color.set(recipe.cloth);m.roughness=({cotton:.92,linen:1,satin:.38,leather:.55})[recipe.fabric]??.92;if(pattern){m.map=pattern;m.needsUpdate=true;}}
     else if(!card&&/TrouserColor/.test(m.name))m.color.set(recipe.trouserColor);
     else if(!card&&/BootColor/.test(m.name))m.color.set(recipe.bootColor);
    }
    if(o.morphTargetDictionary){applyFaceTargets(o,recipe,morphTargets);if(!morphMeshes.includes(o))morphMeshes.push(o);if(['Blink_L','Blink_R','EyeBlink_L','EyeBlink_R'].some(key=>o.morphTargetDictionary[key]!==undefined)&&!blinkMeshes.includes(o))blinkMeshes.push(o);}
   }
  });
  if(!card){const width=recipe.shape==='solide'?1.1:recipe.shape==='elance'?.92:1;model.scale.set(width*recipe.build,(recipe.shape==='elance'?1.055:1)*recipe.height,width*recipe.build);}
  if(!card){garments=fitGarments(model,recipe);if(avatar?.weapon)weaponModel=fitWeapon(model,avatar,{drawn:weaponForced,library});}mixer=new THREE.AnimationMixer(model);
  const layered=!!model.getObjectByName('thigh_l'),lower=t=>/^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(t.name);
  for(const clip of asset.animations){const name=['Idle','Walk','Jog','Run','Jump','Attack','Hit','Death','Cast','Interact','Talk','Work'].find(n=>clip.name===n||clip.name.startsWith(n+'_')||clip.name.endsWith('_'+n));if(!name)continue;
   const body=layered&&name!=='Death'?new THREE.AnimationClip(name+'-upper',clip.duration,clip.tracks.filter(t=>!lower(t))):clip;actions[name]=mixer.clipAction(body);
   if(layered&&['Idle','Walk','Jog','Run'].includes(name))legActions[name]=mixer.clipAction(new THREE.AnimationClip(name+'-legs',clip.duration,clip.tracks.filter(lower)));
  }
  if(!card){
   idleClip=asset.animations.find(c=>c.name==='Idle');const styleClips=weaponAnimations(idleClip,avatar?.weapon,avatar?.handedness);
   for(const clip of styleClips)actions[clip.name]=mixer.clipAction(clip);
  }
  transition('Idle');mixer.update(0);ready=true;onLoad?.();
 }).catch(error=>{if(!dead){console.error('[3B living]',url,error);onError?.('Le modèle n’a pas pu être chargé.');}});
 return {object,setCombat(value){combatPose=value||{};},setWeaponDrawn(value){weaponForced=!!value;},setAvatar(value){applyAvatar(value);},setExpression(value){expression=EXPRESSION_TARGETS[value]?value:'neutral';for(const mesh of morphMeshes){if(!mesh?.morphTargetDictionary)continue;for(const aliases of Object.values(EXPRESSION_TARGETS))for(const key of aliases){const index=mesh.morphTargetDictionary[key];if(index!==undefined)mesh.morphTargetInfluences[index]=0;}for(const key of EXPRESSION_TARGETS[expression]||[]){const index=mesh.morphTargetDictionary[key];if(index!==undefined)mesh.morphTargetInfluences[index]=.72;}}},get capabilities(){return{morphTargets:[...morphTargets],expressions:Object.entries(EXPRESSION_TARGETS).filter(([,names])=>names.some(name=>morphTargets.has(name))).map(([id])=>id)};},get ready(){return ready;},action(name,duration){if(!ready)return;const actionName=name==='Attack'&&actions.WeaponStrike?'WeaponStrike':name,timed=Number.isFinite(duration)&&duration>0;const length=timed?Math.max(.18,Math.min(3.5,duration)):(actionName==='Death'?2.5:actionName==='Hit'?.35:Math.min(3.5,Math.max(.5,actions[actionName]?.getClip().duration||.75)));actionEnd=clock+length;if(['WeaponStrike','Attack','Cast','Guard'].includes(actionName)){weaponReadyUntil=Math.max(weaponReadyUntil,clock+length+1.4);weaponModel?.setDrawn(true);lastArmed=true;}transition(actionName,true);if(timed&&actions[actionName])actions[actionName].setEffectiveTimeScale(actions[actionName].getClip().duration/length);},face(dx,dz,dt){const target=Math.atan2(dx,dz);heading+=Math.atan2(Math.sin(target-heading),Math.cos(target-heading))*(1-Math.exp(-dt*16));object.rotation.y=heading;},
  update(dt,dx=0,dz=0,travelled=0){if(dead)return;clock+=dt;const speed=dt>0?travelled/dt:0;garments?.update(clock,{speed});const armed=weaponForced||clock<weaponReadyUntil||combatPose.guard>0||combatPose.detached>0;if(armed!==lastArmed){const busy=clock<actionEnd&&!['Idle','Walk','Jog','Run','Ready','EquipDraw','EquipSheathe'].includes(current);if(!busy){const transitionName=armed?'EquipDraw':'EquipSheathe';if(actions[transitionName]){transition(transitionName,true);actionEnd=clock+(armed ? .42 : .5);}}lastArmed=armed;}weaponModel?.setDrawn(armed);if(!mixer){weaponModel?.update(clock,combatPose);return;}if(combatPose.guard>0&&actions.Guard){if(current!=='Guard')transition('Guard',true);actionEnd=clock+.1;}else if(current==='Guard'&&clock<actionEnd)actionEnd=clock;if(clock>=actionEnd){const locomotion=speed>.08?(speed/scale>4?'Run':'Walk'):'Idle',name=armed&&actions.Ready?'Ready':locomotion;transition(name);if(!armed&&speed>.08){actions[name]?.setEffectiveTimeScale(Math.min(2.2,Math.max(.6,speed/scale/(name==='Run'?4.8:1.6))));}}if(speed>.08)this.face(dx,dz,dt);const gait=speed>.08?(speed/scale>4?'Run':speed/scale>2.4&&legActions.Jog?'Jog':'Walk'):'Idle';if(legActions[gait]){if(current==='Death'&&clock<actionEnd){for(const a of Object.values(legActions))a.stop();legCurrent=null;}else{if(legCurrent!==gait){const next=legActions[gait];next.reset().play();if(legActions[legCurrent])legActions[legCurrent].crossFadeTo(next,.18,false);legCurrent=gait;}if(speed>.08)legActions[gait].setEffectiveTimeScale(Math.min(2,Math.max(.65,speed/scale/(gait==='Run'?4.8:gait==='Jog'?3.2:1.6))));}}mixer.update(Math.min(.1,dt));applyPosture();if(blinkStart<0&&clock>=nextBlink){blinkStart=clock;nextBlink=clock+2.4+Math.abs(Math.sin(clock*3.17))*2.8;}let blink=0;if(blinkStart>=0){const phase=(clock-blinkStart)/.16;if(phase>=1)blinkStart=-1;else blink=phase<.5?phase*2:(1-phase)*2;}for(const mesh of blinkMeshes){for(const key of ['Blink_L','Blink_R','EyeBlink_L','EyeBlink_R']){const index=mesh.morphTargetDictionary?.[key];if(index!==undefined)mesh.morphTargetInfluences[index]=blink;}}weaponModel?.update(clock,combatPose);weaponModel?.applySecondaryIK?.();},
  reset(){heading=0;object.rotation.y=0;actionEnd=0;transition('Idle');},setColor(color){if(card)return;recipe.cloth=color||avatarRecipe(currentAvatar).cloth;for(const m of personal)if(/ClothColor/.test(m.name))m.color.set(recipe.cloth);},dispose(){if(dead)return;dead=true;ready=false;garments?.dispose();weaponModel?.dispose();pattern?.dispose();mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}personal.forEach(m=>m.dispose());object.clear();}
 };
}
