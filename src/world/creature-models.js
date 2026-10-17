import * as THREE from 'three';
import {cardById} from './catalog.js';
import {CARD_DESIGNS} from './card-designs.js';
import {guardianIdentity} from './guardian-identity.js';
import {smoothActorHeading} from './actor-locomotion.js';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';

const realmAnimals=Object.freeze({italie:'wolf',estonie:'lynx',turquie:'bear',algerie:'fennec',tunisie:'eagle',maroc:'lion',espagne:'bull'});
const animalNames=Object.freeze({wolf:'loup',lynx:'lynx',bear:'ours',fennec:'fennec',eagle:'aigle',lion:'lion',bull:'taureau'});
/** Only cards already authored as nonhuman spirits use this local adaptation.
 * A name explicitly naming an animal takes precedence over a realm default.
 * The eight human Gardiens, French characters and neutral/finale cards keep
 * their existing identities, controllers and assets. */
export function creatureRecipe(cardId){
 const card=cardById[cardId],design=CARD_DESIGNS[cardId];
 if(!card||design?.kind!=='spirit'||guardianIdentity(cardId)||!realmAnimals[card.country])return null;
 const named=[[/fennec/i,'fennec'],[/lion/i,'lion'],[/loup|louve/i,'wolf'],[/ours/i,'bear'],[/aigle/i,'eagle'],[/lynx/i,'lynx'],[/taureau/i,'bull']].find(([pattern])=>pattern.test(card.name));
 const animal=named?.[1]||realmAnimals[card.country],palette=worldRealmArt[card.country],silver=/argent|acier/i.test(card.name);
 return Object.freeze({card:card.id,name:card.name,region:card.country,animal,label:animalNames[animal],coat:silver?worldRealmArt.estonie.stone:['bear','bull'].includes(animal)?design.cloth:palette.stone,mane:design.cloth,muzzle:worldArtMaterials.dust,metal:design.trim,eyes:worldArtMaterials.monumentDark,size:animal==='fennec'?.82:animal==='eagle'?.90:animal==='bear'?1.05:1});
}

/** One instanced batch per material/primitive. The articulated source nodes
 * are transforms only: there is no second body or imported humanoid underneath.
 * All animation consumes the existing scene tick and accepted action API. */
export function createCreatureActor({card,scale=2,reducedMotion=false}={}){
 const recipe=creatureRecipe(card);if(!recipe)return null;
 const object=new THREE.Group(),form=new THREE.Group();object.name='3B · '+recipe.name;object.scale.setScalar(scale*recipe.size);object.add(form);
 object.userData.creatureIdentity={...recipe,nonhuman:true};form.name='Anatomie · '+recipe.label;
 const owned=[],parts=[],joints={},batches=[],legs=[],wings=[],tail=[],anatomy={legs:recipe.animal==='eagle'?2:4,wings:recipe.animal==='eagle'?2:0,ears:recipe.animal==='eagle'?0:2,horns:recipe.animal==='bull'?2:0,tail:1};
 const own=value=>(owned.push(value),value),sphere=own(new THREE.SphereGeometry(1,12,8)),cone=own(new THREE.ConeGeometry(1,1,8));
 const materials=Object.fromEntries(['coat','mane','muzzle','metal','eyes'].map(slot=>[slot,own(new THREE.MeshStandardMaterial({color:recipe[slot],roughness:slot==='metal'?.44:slot==='eyes'?.38:.88,metalness:slot==='metal'?.45:0}))]));
 let dead=false,clock=0,phase=0,heading=0,gait=0,attention=null,combat={},distance=0,action='Idle',actionAt=0,actionDuration=0,lookYaw=0;
 const point=new THREE.Vector3(),inverse=new THREE.Matrix4(),instanceMatrix=new THREE.Matrix4();
 function joint(name,parent,x=0,y=0,z=0){const group=new THREE.Group();group.name=name;group.position.set(x,y,z);parent.add(group);joints[name]=group;return group;}
 function part(name,parent,slot,x,y,z,sx,sy,sz,{shape='sphere',rx=0,ry=0,rz=0,detail=false}={}){
  const node=new THREE.Object3D();node.name=name;node.position.set(x,y,z);node.scale.set(sx,sy,sz);node.rotation.set(rx,ry,rz);parent.add(node);parts.push({node,slot,shape,detail});return node;
 }
 const torso=joint('torso',form),head=joint('head',torso,0,recipe.animal==='bull'?1.12:recipe.animal==='eagle'?1.72:recipe.animal==='bear'?1.48:1.39,recipe.animal==='eagle'?.31:.78),jaw=joint('jaw',head,0,-.14,.22);
 const animal=recipe.animal,broad=['bear','bull'].includes(animal),feline=['lion','lynx'].includes(animal),frontZ=animal==='bear'?.56:.52,rearZ=-.57;
 if(animal==='eagle'){
  part('poitrine',torso,'coat',0,1.13,0,.36,.58,.43);part('plastron',torso,'muzzle',0,1.2,.26,.29,.43,.19);
  part('crâne',head,'muzzle',0,0,0,.27,.28,.29);part('bec crochu',head,'metal',0,-.03,.34,.11,.34,.15,{shape:'cone',rx:Math.PI/2+.2});part('pointe du bec',head,'eyes',0,-.16,.43,.055,.13,.065,{shape:'cone',rx:Math.PI-.28});
  for(const side of [-1,1]){
   part('œil',head,'eyes',side*.218,.04,.15,.052,.052,.038,{detail:true});part('arcade',head,'coat',side*.19,.12,.10,.13,.045,.16,{rz:side*.18});
   const wing=joint('wing:'+side,torso,side*.30,1.43,0);wings.push({joint:wing,side});
   part('épaule de l’aile',wing,'coat',side*.27,0,-.03,.42,.14,.36);
   for(let i=0;i<7;i++)part('rémige '+i,wing,i%3?'coat':'mane',side*(.48+i*.13),-.015,-.12-i*.09,.18,.055,.55-i*.025,{ry:-side*(.25+i*.045)});
   const hip=joint('leg:'+side,torso,side*.17,.68,.04),knee=joint('knee:'+side,hip,0,-.28,0);legs.push({hip,knee,side,front:true});
   part('tarse',hip,'metal',0,-.16,0,.055,.22,.055);part('pied',knee,'metal',0,-.24,.10,.07,.10,.17);
   for(let toe=0;toe<3;toe++)part('griffe',knee,'eyes',(toe-1)*.075,-.28,.24,.025,.16,.025,{shape:'cone',rx:Math.PI/2,detail:true});
  }
  const tailJoint=joint('tail',torso,0,.96,-.35);tail.push(tailJoint);
  for(let i=0;i<5;i++)part('rectrice '+i,tailJoint,i%2?'mane':'coat',(i-2)*.11,-.13,-.39,.11,.055,.48,{ry:(i-2)*.12});
 }else{
  const bodyWidth=broad?.61:feline?.47:.40,bodyHeight=animal==='bear'?.70:animal==='bull'?.62:.44;
  part('corps',torso,'coat',0,.95,0,bodyWidth,bodyHeight,.88);part('poitrail',torso,'coat',0,1.03,.43,bodyWidth*(animal==='bull'?1.13:1),bodyHeight*1.12,.49);
  if(animal==='bear')part('garrot',torso,'mane',0,1.35,.22,.53,.43,.57);
  if(animal==='bull')part('bosse des épaules',torso,'mane',0,1.30,.42,.55,.41,.49);
  part('ventre',torso,'muzzle',0,.78,.08,bodyWidth*.79,bodyHeight*.64,.67);
  const headWidth=animal==='bear'?.43:animal==='bull'?.41:feline?.34:.29,headHeight=animal==='bear'?.39:animal==='bull'?.46:.32;
  if(animal==='lion'){
   part('crinière',head,'mane',0,-.02,-.13,.57,.63,.46);
   for(let i=0;i<9;i++){const a=i*Math.PI*2/9;part('mèche de crinière',head,'mane',Math.sin(a)*.45,Math.cos(a)*.49-.04,-.06,.18,.25,.24,{rz:-a});}
  }
  part('crâne',head,'coat',0,0,.01,headWidth,headHeight,animal==='bull'?.42:.37);
  if(animal==='lynx')for(const side of [-1,1])part('favori',head,'muzzle',side*.28,-.06,.10,.21,.18,.26,{rz:side*.35});
  const muzzleWidth=animal==='bull'?.36:animal==='bear'?.24:feline?.22:.18,muzzleDepth=animal==='bull'?.30:feline?.17:animal==='fennec'?.31:.29;
  part('museau',head,'muzzle',0,-.09,.31,muzzleWidth,.17,muzzleDepth);part('truffe',head,'eyes',0,-.055,.31+muzzleDepth*.85,muzzleWidth*.53,.075,.065);
  part('mâchoire inférieure',jaw,'muzzle',0,-.045,.16,muzzleWidth*.88,.09,muzzleDepth*.83);
  for(const side of [-1,1]){
   part('œil',head,'eyes',side*headWidth*.86,.075,.23,.048,.047,.037,{detail:true});part('lueur de l’œil',head,'muzzle',side*headWidth*.87,.087,.256,.014,.014,.012,{detail:true});
   if(['bear','lion','bull'].includes(animal)){
    part('oreille',head,'coat',side*headWidth*.88,.25,-.10,.15,.17,.12,{rz:-side*.25});part('pavillon',head,'mane',side*headWidth*.91,.265,-.004,.082,.10,.035,{detail:true});
   }else{
    const earHeight=animal==='fennec'?.70:animal==='lynx'?.37:.39,earX=animal==='fennec'?.24:.20;
    part('oreille pointue',head,'coat',side*earX,.29+earHeight*.35,-.03,.15,earHeight,.12,{shape:'cone',rz:-side*.16});
    part('intérieur de l’oreille',head,'mane',side*earX,.29+earHeight*.34,.035,.093,earHeight*.67,.035,{shape:'cone',rz:-side*.16});
    if(animal==='lynx')part('pinceau de l’oreille',head,'eyes',side*.235,.67,-.025,.025,.26,.025,{shape:'cone',rz:-side*.15});
   }
   if(animal==='bull'){
    part('base de la corne',head,'muzzle',side*.45,.24,-.05,.14,.40,.14,{shape:'cone',rz:-side*.86});part('pointe de la corne',head,'metal',side*.64,.43,-.05,.075,.38,.075,{shape:'cone',rz:side*.28});
   }
  }
  const hipWidth=broad?.43:.29,hipY=animal==='bear'?.93:.86;
  for(const front of [true,false])for(const side of [-1,1]){
   const hip=joint('leg:'+(front?'front:':'rear:')+side,torso,side*hipWidth,hipY,front?frontZ:rearZ),knee=joint('knee:'+(front?'front:':'rear:')+side,hip,0,-.40,front?0:-.08);legs.push({hip,knee,side,front});
   const thick=broad?.17:animal==='fennec'?.09:.12;
   part('haut de patte',hip,'coat',0,-.22,0,thick*1.25,.29,thick*1.4,{rx:front?0:-.16});part('bas de patte',knee,'coat',0,-.21,.04,thick*.83,.25,thick*.87);
   if(animal==='bull')for(const toe of [-1,1])part('sabot fendu',knee,'eyes',toe*.065,-.39,.12,.061,.11,.18);
   else{part('patte au sol',knee,'muzzle',0,-.37,.14,thick*1.16,.11,.21);for(const toe of [-1,0,1])part('doigt',knee,'eyes',toe*thick*.58,-.365,.285,.024,.045,.053,{detail:true});}
  }
  const tailJoint=joint('tail',torso,0,1.10,-.78),tailEnd=joint('tail:tip',tailJoint,0,.08,-.47);tail.push(tailJoint,tailEnd);
  const short=animal==='lynx',slender=['lion','bull'].includes(animal),tailLength=short?.26:slender?.49:.50;
  part('queue',tailJoint,'coat',0,.035,-tailLength*.52,slender?.055:.14,slender?.065:.15,tailLength*.70,{rx:-.12});
  if(!short){part('bout de queue',tailEnd,slender?'mane':'coat',0,.01,-.17,slender?.11:.18,slender?.13:.18,.31,{rx:.16});}
 }
 // A small crafted neck fitting distinguishes these fictional spirits while
 // retaining animal anatomy. No crown, new power or guardian identity is added.
 part('médaillon du lien',torso,'metal',0,animal==='eagle'?1.17:1.0,animal==='eagle'?.44:.80,.095,.13,.035,{detail:true});
 const groups=new Map();for(const piece of parts){const key=piece.shape+':'+piece.slot;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(piece);}
 for(const pieces of groups.values()){
  const sample=pieces[0],mesh=own(new THREE.InstancedMesh(sample.shape==='cone'?cone:sphere,materials[sample.slot],pieces.length));mesh.name='Créature · '+sample.slot+' · '+sample.shape;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);form.add(mesh);batches.push({mesh,pieces});
 }
 function sync(){
  object.updateMatrixWorld(true);inverse.copy(form.matrixWorld).invert();
  for(const {mesh,pieces} of batches){let index=0;for(const piece of pieces){if(distance>85&&piece.detail)continue;instanceMatrix.multiplyMatrices(inverse,piece.node.matrixWorld);mesh.setMatrixAt(index++,instanceMatrix);}mesh.count=index;mesh.instanceMatrix.needsUpdate=true;}
 }
 function resetPose(){form.position.set(0,0,0);form.rotation.set(0,0,0);form.scale.set(1,1,1);torso.rotation.set(0,0,0);head.rotation.set(0,lookYaw,0);jaw.rotation.x=0;for(const {hip,knee} of legs){hip.rotation.x=0;knee.rotation.x=0;}for(const {joint,side} of wings)joint.rotation.z=-side*.98;for(const joint of tail)joint.rotation.y=joint.rotation.x=0;}
 function update(dt,dx=0,dz=0,travelled=0){
  if(dead)return;dt=THREE.MathUtils.clamp(Number.isFinite(dt)?dt:0,0,.25);clock+=dt;const movement=Number.isFinite(travelled)?Math.max(0,travelled):0,speed=dt>0?movement/dt:0,weight=Math.min(1,speed/Math.max(1,scale*1.3));gait+=(weight-gait)*(1-Math.exp(-dt*10));phase+=movement/Math.max(.01,scale*recipe.size)*4.7;
  if(action!=='Death'&&actionDuration&&clock>=actionAt+actionDuration){action='Idle';actionDuration=0;}
  if(combat.facing)heading=smoothActorHeading(heading,combat.facing.x,combat.facing.z,dt);else if(speed>.08)heading=smoothActorHeading(heading,dx,dz,dt);object.rotation.y=heading;
  let desiredYaw=0;if(attention&&Number.isFinite(attention.x)&&Number.isFinite(attention.z)){point.set(attention.x,Number.isFinite(attention.y)?attention.y:0,attention.z);object.updateMatrixWorld(true);object.worldToLocal(point);desiredYaw=THREE.MathUtils.clamp(Math.atan2(point.x,point.z),-.42,.42);}lookYaw+=(desiredYaw-lookYaw)*(1-Math.exp(-dt*5));resetPose();
  const p=actionDuration?THREE.MathUtils.clamp((clock-actionAt)/actionDuration,0,1):0,gesture=reducedMotion?(p<.65?1:0):Math.sin(p*Math.PI),walking=action==='Death'?0:gait;
  for(const {hip,knee,side,front} of legs){const offset=(side>0?Math.PI:0)+(front?0:Math.PI),stride=Math.sin(phase+offset)*walking*(broad?.34:.51)*(reducedMotion?.75:1);hip.rotation.x=stride;knee.rotation.x=Math.max(0,-stride)*.82;}
  if(!reducedMotion){form.position.y=Math.abs(Math.sin(phase*2))*walking*.045;torso.scale.y=1+Math.sin(clock*1.8+recipe.name.length)*.009*(1-walking);for(let i=0;i<tail.length;i++)tail[i].rotation.y=Math.sin(clock*1.6-i*.7)*(.12+walking*.15);}
  else torso.scale.y=1;
  if(['Attack','Attack2','Attack3','Cast','Signature'].includes(action)){head.rotation.x=-gesture*.20;jaw.rotation.x=gesture*(animal==='eagle'?.06:.28);torso.rotation.x=-gesture*.08;form.position.z=gesture*.14;for(const {joint,side} of wings)joint.rotation.z=-side*(.98-gesture*.91);}
  else if(['Hit','Stagger'].includes(action)){torso.rotation.z=gesture*.14;head.rotation.x=gesture*.16;}
  else if(['Guard','Parry'].includes(action)||combat.guard>0){head.rotation.x=.18;torso.rotation.x=.08;for(const {joint,side} of wings)joint.rotation.z=-side*1.1;}
  else if(action==='Death'){const collapse=reducedMotion?1:Math.min(1,p*2);form.rotation.z=collapse*.64;form.scale.y=1-collapse*.40;form.position.y=collapse*.18;head.rotation.x=collapse*.34;}
  if(wings.length&&!reducedMotion&&walking>.1&&!actionDuration)for(const {joint,side} of wings)joint.rotation.z=-side*(.98-Math.sin(phase)*walking*.06);
  sync();
 }
 const controller={object,get ready(){return!dead;},get airborne(){return false;},update,
  action(name,duration){if(dead)return false;action=name||'Idle';actionAt=clock;actionDuration=action==='Idle'?0:Number.isFinite(duration)&&duration>0?THREE.MathUtils.clamp(duration,.12,3.5):action==='Death'?1.2:action==='Hit'?.35:.65;return true;},
  face(dx,dz,dt){if(dead)return;heading=smoothActorHeading(heading,dx,dz,dt);object.rotation.y=heading;},setAttention(value){attention=value||null;},setCombat(value){combat=value||{};},setLod(value){distance=Number.isFinite(value)?Math.max(0,value):0;},setGuardianState(){},setGuardianAnticipation(){return false;},snapshotGuardian(){return null;},setActivity(){},setPose(){},setColor(){},cancelAirborne(){return false;},airAction(){return false;},
  snapshotCreature(){return{card,animal,region:recipe.region,anatomy:{...anatomy},ready:!dead,animation:action,gait,phase,reducedMotion,renderMeshes:batches.length,parts:parts.length};},
  reset(){if(dead)return;clock=phase=heading=gait=lookYaw=0;action='Idle';actionDuration=0;attention=null;combat={};resetPose();torso.scale.set(1,1,1);object.rotation.y=0;sync();},
  dispose(){if(dead)return;dead=true;object.removeFromParent();for(const resource of owned)resource.dispose();object.clear();}
 };
 update(0);return controller;
}
