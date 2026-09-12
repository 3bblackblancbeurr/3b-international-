import {encounterProfile} from './encounters.js';
import {advanceMotion} from '../motion.js';
import {move} from './space.js';
import {isCountry,countryLayout,countryNextStop} from './countries.js';
import * as T from 'three';
import {createLivingActor,createLivingLibrary} from '../living.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ground,distance,route} from './space.js';
export function createActors(scene,onError,playerAvatar){
 const library=createLivingLibrary(),all=[],root=new T.Group();scene.add(root);let dead=false;
 const avatar={body:'homme',style:'voyageur',hair:3,skin:2,headwear:'hood',fabricColor:'#20262d',trouserColor:'#23282d',bootColor:'#292b2c',accentColor:'#baa883',pattern:'uni'};
 const actor=(options)=>{const a=createLivingActor(library,{...options,onError});root.add(a.object);all.push(a);return a;};
 let hero=actor({avatar:playerAvatar||avatar,scale:1.02});const guardian=actor({avatar:{...avatar,style:'mystique',outer:'cape',fabricColor:'#d3c6a8',accentColor:'#ac9468'},scale:1.48});let enemy=actor({avatar:{...avatar,style:'sentinelle',outer:'cape',fabricColor:'#273742',accentColor:'#7ab4ce',skin:5},scale:1.48});
 const npcs=[
  {id:'resident',x:3,z:15,a:actor({avatar:{...avatar,body:'femme',headwear:'none',fabricColor:'#829491',hair:4},scale:1})},
  {id:'atelier',x:-17,z:33,a:actor({avatar:{...avatar,headwear:'none',outer:'apron',fabricColor:'#555e68'},scale:1})},
  {id:'refuge',x:18,z:33,a:actor({avatar:{...avatar,body:'femme',headwear:'none',hair:6,fabricColor:'#ad8f70'},scale:.98})},
  {id:'walker1',x:-7,z:5,a:actor({avatar:{...avatar,headwear:'none',fabricColor:'#63584e'},scale:1})},
  {id:'walker2',x:9,z:-18,a:actor({avatar:{...avatar,body:'femme',headwear:'none',fabricColor:'#597575'},scale:1})},
 ];
 const wolfRoot=new T.Group();root.add(wolfRoot);wolfRoot.scale.setScalar(.76);let wolfModel,mixer,actions={},current='Idle',wolfGeometry=new Set(),wolfMaterials=new Set();
 const ready=new GLTFLoader().loadAsync('/world/origins/wolf.glb').then(asset=>{
  wolfModel=asset.scene;wolfRoot.add(wolfModel);wolfModel.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;wolfGeometry.add(o.geometry);for(const m of [o.material].flat()){wolfMaterials.add(m);if(m.name==='Original wolf coat')m.color.set('#9da6ad');}}});
  mixer=new T.AnimationMixer(wolfModel);for(const clip of asset.animations)actions[clip.name]=mixer.clipAction(clip);actions.Idle?.play();if(dead){wolfGeometry.forEach(g=>g.dispose());wolfMaterials.forEach(m=>m.dispose());}
 }).catch(e=>{if(!dead)onError('Le modèle du loup manque : '+e.message);throw e;});
 function wolfGait(next){if(next===current||!actions[next])return;actions[next].reset().play();actions[current]?.crossFadeTo(actions[next],.18,false);current=next;}
 let enemyZone=null;let lastEnemy={x:0,z:-66},previousHP=130,deathTime=-100;
 const allReady=Promise.all([ready,...[0,1,2,3].map(i=>library.load('/world/living/traveller-'+i+'.glb'))]);
 return{get hero(){return hero;},setAvatar(next){return new Promise((resolve,reject)=>{const replacement=createLivingActor(library,{avatar:next,scale:1.02,onError:message=>{replacement.dispose();reject(Error(message));},onLoad:()=>{if(dead){replacement.dispose();reject(Error('Vue fermée'));return;}replacement.object.position.copy(hero.object.position);replacement.object.rotation.copy(hero.object.rotation);root.add(replacement.object);root.remove(hero.object);all.splice(all.indexOf(hero),1);hero.dispose();hero=replacement;all.push(hero);resolve();}});});},get enemy(){return enemy;},guardian,wolfRoot,npcs,ready:allReady,
  tick(dt,state,position,heading,motion,wolf,wMotion,combat,time,regionalEncounter=false){
   hero.object.position.set(position.x,ground(position,state.zone),position.z);hero.update(dt,motion.dx,motion.dz,motion.travel);if(!motion.travel)hero.face(Math.sin(heading),Math.cos(heading),dt);
   if(previousHP>0&&combat.enemy.hp<=0)deathTime=time;previousHP=combat.enemy.hp;
   if(enemyZone!==state.zone){enemyZone=state.zone;const profile=encounterProfile(state.zone),old=enemy;enemy=actor({avatar:{...avatar,style:profile.style,headwear:profile.style==='voyageur'?'none':'hood',outer:profile.style==='mystique'?'cape':'scarf',fabricColor:profile.color,pattern:'broderie',accentColor:'#b9dce2'},scale:profile.hp>=150?1.48:1.22});all.splice(all.indexOf(old),1);old.object.removeFromParent();old.dispose();}const france=state.zone==='france';guardian.object.visible=france;enemy.object.visible=regionalEncounter||isCountry(state.zone)&&combat.enemy.hp<=0&&time-deathTime<2.3||france&&state.flags.echo&&state.flags.echo2&&(!state.flags.defeated||time-deathTime<2.3);
   guardian.object.position.set(0,0,-43);guardian.update(dt);guardian.face(position.x,position.z+43,dt);
   const e=combat.enemy;enemy.object.position.set(e.x,0,e.z);enemy.update(dt,e.x-lastEnemy.x,e.z-lastEnemy.z,distance(e,lastEnemy));enemy.face(Math.sin(e.heading),Math.cos(e.heading),dt);lastEnemy={x:e.x,z:e.z};
   for(const n of npcs){n.a.object.visible=state.zone!=='sanctuary';const local=isCountry(state.zone)?countryLayout(state.zone).points.find(p=>p.id===n.id):null;let x=local?.x??n.x,z=local?.z??n.z,dx=0,dz=0;if(local&&n.id.startsWith('walker')){if(n.zone!==state.zone){n.zone=state.zone;n.walk={position:{x,z},target:null,route:[]};n.wait=1;n.visit=0;}const alarm=regionalEncounter&&distance(n.walk.position,combat.enemy)<18;if(alarm&&!n.alarmed){n.walk.target=null;n.walk.route=[];n.wait=0;}n.alarmed=alarm;n.wait=Math.max(0,(n.wait||0)-dt);if(!n.walk.target&&n.wait===0){const danger=regionalEncounter&&distance(n.walk.position,combat.enemy)<18;const dest=danger?countryLayout(state.zone).points.find(p=>p.id==='refuge'):state.regions[state.zone].restored>0&&n.visit%3===2?countryLayout(state.zone).points.find(p=>p.id==='country-garden'):countryNextStop(state.zone,n.visit);n.visit++;const path=route(n.walk.position,{x:dest.x+1.2,z:dest.z+1.2},state.zone,{});n.walk.target=path[0];n.walk.route=path.slice(1);n.wait=0;}const hadTarget=!!n.walk.target,old=n.walk.position;if(!n.pause)n.walk=advanceMotion(n.walk,{x:0,z:0},dt,1.1,[],0,(p,dx,dz)=>move(p,dx,dz,state.zone,{}));else n.pause=Math.max(0,n.pause-dt);if(hadTarget&&!n.walk.target)n.wait=4+n.visit%3;x=n.walk.position.x;z=n.walk.position.z;dx=x-old.x;dz=z-old.z;}if(!local&&n.id.startsWith('walker')){const phase=time%(state.flags.justice?18:24),walking=phase<10;const offset=walking?Math.sin(phase/10*Math.PI)*3:0;x+=offset;dx=walking?Math.cos(phase/10*Math.PI)*.94*dt:0;}if(n.id==='atelier'&&!regionalEncounter&&!n.pause&&time-(n.workAt||0)>5){n.workAt=time;n.a.action('Work');}if(!n.id.startsWith('walker'))n.pause=Math.max(0,(n.pause||0)-dt);n.a.object.position.set(x,0,z);n.a.update(dt,dx,dz,Math.hypot(dx,dz));if(!dx)n.a.face(position.x-x,position.z-z,dt);}
   wolfRoot.position.set(wolf.position.x,ground(wolf.position,state.zone),wolf.position.z);wolfRoot.rotation.y=wolf.heading;
   const speed=wMotion.travel/Math.max(.001,dt),gait=wolf.arrived?(wolf.mode==='search'?'Sniff':'Wait'):speed>.15?(speed>3.5?'Run':'Walk'):'Idle';wolfGait(gait);actions[gait]?.setEffectiveTimeScale(gait==='Walk'?Math.max(.7,speed/2):gait==='Run'?Math.max(.7,speed/5):1);mixer?.update(dt);
  },talk(id){const n=npcs.find(n=>n.id===id);if(n)n.pause=3;(npcs.find(n=>n.id===id)?.a||guardian).action('Talk');hero.action('Talk');},dispose(){dead=true;root.removeFromParent();all.forEach(a=>a.dispose());library.dispose();mixer?.stopAllAction();if(wolfModel)mixer?.uncacheRoot(wolfModel);wolfGeometry.forEach(g=>g.dispose());wolfMaterials.forEach(m=>m.dispose());}};
}
