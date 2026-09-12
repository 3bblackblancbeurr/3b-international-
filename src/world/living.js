import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {CARD_DESIGNS} from './card-designs.js';
import {fitGarments,garmentPattern} from './garments.js';
import {SKINS,OUTFITS} from './avatar-rules.js';
import {prepareTintMaterial} from './avatar-material.js';

export function createLivingLibrary(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();let disposed=false;
 function release(asset){const geo=new Set(),mat=new Set(),tex=new Set();asset.scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){mat.add(m);for(const v of Object.values(m))if(v?.isTexture)tex.add(v);}});geo.forEach(g=>g.dispose());mat.forEach(m=>m.dispose());tex.forEach(t=>t.dispose());}
 return {load(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).then(asset=>{if(disposed){release(asset);throw Error('Vue fermée.');}return asset;}).catch(error=>{cache.delete(url);throw error;}));return cache.get(url);},dispose(){disposed=true;cache.forEach(p=>p.then(release).catch(()=>{}));cache.clear();}};
}
export function avatarRecipe(avatar){return {body:avatar?.body==='femme'?1:0,style:['voyageur','sentinelle','mystique'].indexOf(avatar?.style||'voyageur'),hair:avatar?.hair??3,boots:avatar?.boots??0,height:avatar?.height??1,build:avatar?.build??1,fabric:avatar?.fabric||'cotton',patternScale:avatar?.patternScale??1,capeLength:avatar?.capeLength??1,hoodFit:avatar?.hoodFit??1,skin:avatar?.skinColor||SKINS[avatar?.skin??2],cloth:avatar?.fabricColor||OUTFITS[avatar?.color??0],accentColor:avatar?.accentColor||'#d7bd83',trouserColor:avatar?.trouserColor||'#77644d',bootColor:avatar?.bootColor||'#695239',pattern:avatar?.pattern||'uni',headwear:avatar?.headwear||'none',outer:avatar?.outer||'none',bag:!!avatar?.bag,hairColor:avatar?.hairColor||'#352a24',shape:avatar?.shape||'equilibre',face:avatar?.face||0,jaw:avatar?.jaw||0,nose:avatar?.nose||0};}
export function createLivingActor(library,{card,avatar,scale=1,onLoad,onError}={}){
 const recipe=card?CARD_DESIGNS[card]:avatarRecipe(avatar),url=card?'/world/card-models/'+card+(card==='C165'?'-v2':'')+'.glb':'/world/living/traveller-'+(recipe.body*3+recipe.style)+'.glb';
 const object=new THREE.Group(),personal=new Set();let model,mixer,garments,pattern,actions={},legActions={},legCurrent=null,current=null,dead=false,clock=0,actionEnd=0,heading=0,ready=false;
 object.scale.setScalar(scale);
 function transition(name,once=false){
  if(dead)return;
  const next=actions[name]||actions.Idle;if(!next||current===name&&!once)return;
  const previous=actions[current];next.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.enabled=true;next.setEffectiveWeight(1).setEffectiveTimeScale(1).play();if(previous&&previous!==next)previous.crossFadeTo(next,.18,false);current=name;
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
    if(o.morphTargetDictionary)for(const [plus,minus,value] of [['FaceWide','FaceNarrow',recipe.face],['JawStrong','JawSoft',recipe.jaw],['NoseLarge','NoseSmall',recipe.nose]])for(const [key,v] of [[plus,Math.max(0,value)],[minus,Math.max(0,-value)]]){const index=o.morphTargetDictionary[key];if(index!==undefined)o.morphTargetInfluences[index]=v;}
   }
  });
  if(!card){const width=recipe.shape==='solide'?1.1:recipe.shape==='elance'?.92:1;model.scale.set(width*recipe.build,(recipe.shape==='elance'?1.055:1)*recipe.height,width*recipe.build);}
  if(!card)garments=fitGarments(model,recipe);mixer=new THREE.AnimationMixer(model);
  const layered=!!model.getObjectByName('thigh_l'),lower=t=>/^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(t.name);
  for(const clip of asset.animations){const name=['Idle','Walk','Jog','Run','Attack','Hit','Death','Cast','Talk','Work'].find(n=>clip.name===n||clip.name.startsWith(n+'_')||clip.name.endsWith('_'+n));if(!name)continue;
   const body=layered&&name!=='Death'?new THREE.AnimationClip(name+'-upper',clip.duration,clip.tracks.filter(t=>!lower(t))):clip;actions[name]=mixer.clipAction(body);
   if(layered&&['Idle','Walk','Jog','Run'].includes(name))legActions[name]=mixer.clipAction(new THREE.AnimationClip(name+'-legs',clip.duration,clip.tracks.filter(lower)));
  }
  transition('Idle');mixer.update(0);ready=true;onLoad?.();
 }).catch(error=>{if(!dead){console.error('[3B living]',url,error);onError?.('Le modèle n’a pas pu être chargé.');}});
 return {object,get ready(){return ready;},action(name){if(!ready)return;actionEnd=clock+(name==='Death'?2.5:name==='Hit'?.35:Math.min(3.5,Math.max(.5,actions[name]?.getClip().duration||.75)));transition(name,true);},face(dx,dz,dt){const target=Math.atan2(dx,dz);heading+=Math.atan2(Math.sin(target-heading),Math.cos(target-heading))*(1-Math.exp(-dt*16));object.rotation.y=heading;},
  update(dt,dx=0,dz=0,travelled=0){if(dead)return;clock+=dt;garments?.update(clock);if(!mixer)return;const speed=dt>0?travelled/dt:0;if(clock>=actionEnd){const name=speed>.08?(speed/scale>4?'Run':'Walk'):'Idle';transition(name);if(speed>.08){actions[name]?.setEffectiveTimeScale(Math.min(2.2,Math.max(.6,speed/scale/(name==='Run'?4.8:1.6))));}}if(speed>.08)this.face(dx,dz,dt);const gait=speed>.08?(speed/scale>4?'Run':speed/scale>2.4&&legActions.Jog?'Jog':'Walk'):'Idle';if(legActions[gait]){if(current==='Death'&&clock<actionEnd){for(const a of Object.values(legActions))a.stop();legCurrent=null;}else{if(legCurrent!==gait){const next=legActions[gait];next.reset().play();if(legActions[legCurrent])legActions[legCurrent].crossFadeTo(next,.18,false);legCurrent=gait;}if(speed>.08)legActions[gait].setEffectiveTimeScale(Math.min(2,Math.max(.65,speed/scale/(gait==='Run'?4.8:gait==='Jog'?3.2:1.6))));}}mixer.update(Math.min(.1,dt));},
  reset(){heading=0;object.rotation.y=0;actionEnd=0;transition('Idle');},setColor(color){if(card)return;recipe.cloth=color||avatarRecipe(avatar).cloth;for(const m of personal)if(/ClothColor/.test(m.name))m.color.set(recipe.cloth);},dispose(){if(dead)return;dead=true;ready=false;garments?.dispose();pattern?.dispose();mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}personal.forEach(m=>m.dispose());object.clear();}
 };
}
