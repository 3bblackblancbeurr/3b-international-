import * as THREE from 'three';
import {mergeIndexedGeometries} from './geometry-batch.js';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';
import {COUNTRIES} from './catalog.js';
import {finalCirclePhase,finalCircleMasteryMask} from './final-circle.js';

// A body made of separated memories: an open rib cage, a missing face and
// broken stone wings. This presentation never computes damage or mastery.
export function createOblivionActor({reducedMotion=false}={}){
 const object=new THREE.Group();object.name='3B · Manifestation de l’Oubli';
 object.userData.oblivion={art:'authored-fragment-body',height:10.8};
 const owned=[],own=value=>(owned.push(value),value);
 const materials={
  stone:own(new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentStone,roughness:.87,metalness:.12})),
  dark:own(new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentDark,roughness:.7,metalness:.28})),
  metal:own(new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentGold,roughness:.47,metalness:.72})),
  core:own(new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentEmission,emissive:worldArtMaterials.monumentEmission,emissiveIntensity:.5,roughness:.44,metalness:.4})),
 };
 const rig=new THREE.Group();rig.name='Fragmented body';object.add(rig);
 const q=new THREE.Quaternion(),euler=new THREE.Euler(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 function body(parent,name,build){
  const parts=new Map();
  const put=(slot,geo,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{
   euler.set(rx,ry,rz);q.setFromEuler(euler);position.set(x,y,z);scale.set(sx,sy,sz);matrix.compose(position,q,scale);geo.applyMatrix4(matrix);
   if(!parts.has(slot))parts.set(slot,[]);parts.get(slot).push(geo);
  };
  build(put);const group=new THREE.Group();group.name=name;parent.add(group);
  for(const [slot,pieces] of parts){const geometry=own(mergeIndexedGeometries(pieces));pieces.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,materials[slot]);mesh.castShadow=mesh.receiveShadow=true;mesh.name=name+' · '+slot;group.add(mesh);}
  return group;
 }
 const rock=()=>new THREE.IcosahedronGeometry(1,1),box=()=>new THREE.BoxGeometry(1,1,1);
 const trunk=body(rig,'La cage ouverte',put=>{
  // The central opening stays empty. There is no imported human torso inside.
  for(const side of [-1,1]){
   put('stone',rock(),side*1.08,5.7,.2,.67,2.4,.78,0,side*.2,-side*.17);
   for(let rib=0;rib<5;rib++)put('stone',box(),side*(.70+rib*.11),4.4+rib*.55,.82,1.06,.20,.38,0,side*.15,-side*(.26+rib*.045));
   put('metal',box(),side*1.53,7.14,.12,.10,2.05,.13,0,0,-side*.3);
  }
  put('dark',rock(),0,3.7,.3,.96,.72,.67);put('stone',rock(),0,7.75,.35,1.35,.62,.78);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;put('dark',rock(),Math.sin(a)*.88,2.7-(i%3)*.48,Math.cos(a)*.5,.27,1.23+(i%2)*.46,.26,0,a,Math.sin(i)*.25);}
 });
 const head=body(rig,'Le visage absent',put=>{
  for(const side of [-1,1]){
   put('dark',rock(),side*.57,8.8,.04,.58,.93,.52,0,side*.18,-side*.18);
   put('stone',rock(),side*.93,9.5,.08,.2,1.17,.22,0,0,-side*.31);
   put('metal',box(),side*.4,8.86,.63,.28,.055,.09,0,0,-side*.13);
  }
  put('stone',rock(),0,9.42,-.15,.65,.32,.56);put('dark',rock(),0,8.04,.11,.42,.34,.42);
 });
 const arms=[];
 for(const side of [-1,1]){
  const joint=new THREE.Group();joint.position.set(side*1.5,7.12,.04);joint.name=side<0?'Aile brisée gauche':'Aile brisée droite';rig.add(joint);
  body(joint,'Fragments porteurs',put=>{
   put('stone',rock(),side*.95,-.3,0,1.53,.7,.76,0,0,-side*.38);
   put('stone',rock(),side*2,-1.5,.2,.56,1.43,.54,0,0,side*.24);
   put('dark',rock(),side*2.35,-2.75,.6,.65,.66,.55);
   for(let finger=0;finger<3;finger++)put('stone',rock(),side*(2.09+finger*.27),-3.45-finger*.13,.8,.11,.75,.14,.13,0,side*.12);
   for(let feather=0;feather<5;feather++)put(feather%2?'dark':'stone',box(),side*(.65+feather*.50),.2+feather*.18,-.55,.36,2.35-feather*.22,.23,0,.15,-side*(.37+feather*.08));
  });arms.push({joint,side});
 }
 const core=body(rig,'Le souvenir captif',put=>{
  put('core',new THREE.OctahedronGeometry(.72,1),0,5.9,.12,1,1.4,1);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;put('metal',box(),Math.sin(a)*1.09,5.9+Math.cos(a)*1.09,.12,.20,.63,.18,0,0,-a);}
 });
 const shardGeometry=own(new THREE.OctahedronGeometry(.30,0)),shards=[];
 for(let i=0;i<8;i++){
  const country=COUNTRIES[i],tint=worldRealmArt[country.id].cloth;
  const material=own(new THREE.MeshStandardMaterial({color:tint,emissive:tint,emissiveIntensity:.1,roughness:.48,metalness:.55}));
  const mesh=new THREE.Mesh(shardGeometry,material);mesh.name='Mémoire · '+country.name;mesh.castShadow=true;rig.add(mesh);shards.push(mesh);
 }
 let dead=false,time=0,actionName='Idle',actionAt=0,actionDuration=.8,phase=1,mastery=0,windup=0,victory=false,heading=0,lastStateKey='';
 function setFinalState(encounter){
  if(dead||!encounter?.final)return;
  phase=finalCirclePhase(encounter)?.index||1;mastery=finalCircleMasteryMask(encounter);windup=encounter.field?.phase==='windup'?1:0;victory=encounter.result==='victory';
  const key=phase+':'+mastery+':'+windup+':'+victory;if(key===lastStateKey)return;lastStateKey=key;
  const tint=worldRealmArt[COUNTRIES[phase-1].id].cloth;
  materials.core.color.set(tint).lerp(new THREE.Color(worldArtMaterials.monumentEmission),.58);
  materials.core.emissive.copy(materials.core.color);materials.core.emissiveIntensity=victory?.12:.38+windup*.24;
  object.userData.oblivion={...object.userData.oblivion,phase,mastery,victory};
 }
 function update(dt){
  if(dead)return;dt=THREE.MathUtils.clamp(Number.isFinite(dt)?dt:0,0,.25);time+=dt;
  const age=(time-actionAt)/actionDuration,gesture=age>=0&&age<1?Math.sin(age*Math.PI):0;
  const movement=reducedMotion?0:1,breathe=Math.sin(time*.84)*.055*movement;
  rig.position.y=breathe-(victory?Math.min(1,(time-actionAt)/2)*.55:0);rig.rotation.z=actionName==='Hit'?gesture*.055*movement:0;
  head.rotation.y=Math.sin(time*.22)*.10*movement;trunk.scale.x=1+breathe*.15;
  for(const {joint,side} of arms){
   const strike=/Attack|Cast/.test(actionName)?gesture:0;
   joint.rotation.z=side*(-.12-windup*.20+strike*.5)*movement;
   joint.rotation.x=(windup*-.23-strike*.65)*movement;
  }
  core.rotation.y=time*.15*movement;
  for(let i=0;i<shards.length;i++){
   const mesh=shards[i],a=i*Math.PI/4+time*.045*movement,restored=!!(mastery&(1<<i)),radius=restored?2.55:2.05;
   mesh.position.set(Math.sin(a)*radius,6.05+Math.cos(a)*1.9,Math.cos(a)*.65+.25);mesh.rotation.set(0,time*.12*movement,a);
   mesh.scale.setScalar((i===phase-1?1.35:1)*(restored?.8:1));mesh.material.emissiveIntensity=restored?.28:i===phase-1?.42:.05;
  }
  if(age>=1&&actionName!=='Death')actionName='Idle';
 }
 update(0);
 return{object,get ready(){return !dead;},setFinalState,
  action(name,duration=.8){if(dead)return false;actionName=name;actionAt=time;actionDuration=Math.max(.18,Math.min(3.5,Number(duration)||.8));return true;},
  update,face(dx,dz,dt){if(Math.hypot(dx,dz)<.001)return;const target=Math.atan2(dx,dz);heading+=Math.atan2(Math.sin(target-heading),Math.cos(target-heading))*(1-Math.exp(-Math.max(0,dt||0)*10));object.rotation.y=heading;},
  setLod(){},setAttention(){},setGuardianState(){},setCombat(){},
  snapshotGuardian(){return {ready:!dead,kind:'oblivion',phase,mastery,animation:actionName};},
  dispose(){if(dead)return;dead=true;object.removeFromParent();for(const resource of owned)resource.dispose();object.clear();}
 };
}
