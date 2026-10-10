import * as THREE from 'three';
import {cinemaProfile} from './cinematic-director.js';
import {createLivingActor} from './living.js';
import {campaignPerson} from './journey-presence.js';
import {createStoryRelic} from './story-relic.js';

/** Visualise the authoritative boss state. This object never awards damage,
 * invulnerability, a seal or a new elemental/totem ability. */
export function createRealmEffects(region,{reducedMotion=false,groundY=()=>0}={}){
 const profile=cinemaProfile(region),root=new THREE.Group();root.name='3B-'+region+'-Arena';
 const owned=[],keep=value=>(owned.push(value),value);
 const gold=keep(new THREE.MeshStandardMaterial({color:'#c9ad73',metalness:.72,roughness:.36}));
 const stone=keep(new THREE.MeshStandardMaterial({color:profile.shadow,metalness:.2,roughness:.7}));
 const glow=keep(new THREE.MeshBasicMaterial({color:profile.accent,transparent:true,opacity:.36,depthWrite:false,side:THREE.DoubleSide}));
 const spectral=keep(new THREE.MeshBasicMaterial({color:profile.accent,transparent:true,opacity:.16,depthWrite:false}));
 const rings=[],wards=[];
 const ringGeometry=keep(new THREE.RingGeometry(10.8,11,80));
 for(let i=0;i<2;i++){const ring=new THREE.Mesh(ringGeometry,i?glow:gold);ring.rotation.x=-Math.PI/2;ring.position.y=.075+i*.035;ring.scale.setScalar(i?.65:1);root.add(ring);rings.push(ring);}
 const pillarGeometry=keep(new THREE.CylinderGeometry(.42,.66,3.2,8)),crownGeometry=keep(new THREE.OctahedronGeometry(.45));
 const count={france:4,algerie:2,maroc:4,tunisie:4,espagne:7,italie:6,turquie:8,estonie:3}[region]||4;
 for(let i=0;i<count;i++){const angle=i*Math.PI*2/count,pillar=new THREE.Mesh(pillarGeometry,stone),crown=new THREE.Mesh(crownGeometry,gold);pillar.position.set(Math.sin(angle)*12,1.6,Math.cos(angle)*12);crown.position.copy(pillar.position);crown.position.y=3.45;root.add(pillar,crown);}
 const wardGeometry=keep(new THREE.PlaneGeometry(2.6,3.5));
 for(let i=0;i<6;i++){const ward=new THREE.Mesh(wardGeometry,spectral),angle=i*Math.PI/3;ward.position.set(Math.sin(angle)*3.8,2.1,Math.cos(angle)*3.8);ward.rotation.y=angle;root.add(ward);wards.push(ward);}
 const relic=new THREE.Mesh(keep(new THREE.OctahedronGeometry(.68)),gold);relic.position.y=1.2;root.add(relic);
 const beamGeometry=keep(new THREE.BufferGeometry()),beamPositions=new Float32Array(18);beamGeometry.setAttribute('position',new THREE.BufferAttribute(beamPositions,3));
 const beamMaterial=keep(new THREE.LineBasicMaterial({color:profile.accent,transparent:true,opacity:.65,depthWrite:false}));
 const beams=new THREE.LineSegments(beamGeometry,beamMaterial);beams.frustumCulled=false;root.add(beams);
 const echoes=[];
 const echoGeometry=keep(new THREE.CapsuleGeometry(.55,2.3,3,7));
 for(let i=0;i<3;i++){const echo=new THREE.Mesh(echoGeometry,spectral);root.add(echo);echoes.push(echo);}
 root.visible=false;
 const setBeam=(index,a,b)=>{for(let k=0;k<3;k++){beamPositions[index*6+k]=a[k];beamPositions[index*6+3+k]=b[k];}};
 function tick(time,{encounter,player,focus,presentation,cinematic=false}={}){
  const field=encounter?.field,active=!!encounter?.boss&&!encounter.result;
  root.visible=active||cinematic;if(!root.visible||!player||!focus)return;
  const home=field?.home||focus,base=groundY(home.x,home.z);root.position.set(home.x,base,home.z);
  const phase=Math.max(1,Math.min(3,presentation?.index||encounter?.phase||1)),pulse=reducedMotion?.5:.5+.5*Math.sin(time*.9);
  glow.opacity=.17+pulse*.12;spectral.opacity=.09+pulse*.07;
  rings[1].rotation.z=reducedMotion?0:time*.07;
  relic.visible=region==='maroc';relic.rotation.y=reducedMotion?0:time*.14;
  const integrity=presentation?.heritage?.integrity??(Number.isFinite(encounter?.guardianMeter)?encounter.guardianMeter:100);
  if(relic.visible)relic.scale.setScalar(.45+Math.max(0,integrity)/100*.55);
  wards.forEach((ward,i)=>{ward.visible=region==='italie'&&(presentation?.shield??encounter?.guardianShield??0)>i*5||region==='turquie'&&i<phase;});
  echoes.forEach((echo,i)=>{
   const decoy=presentation?.decoys?.[i];echo.visible=region==='estonie'&&active&&!!decoy||region==='france'&&active&&!presentation?.verified&&i<2;
   const angle=time*.08+i*Math.PI*2/3;
   echo.position.set(decoy?decoy.x-home.x:Math.sin(angle)*7,1.8,decoy?decoy.z-home.z:Math.cos(angle)*7);
  });
  beams.visible=region==='algerie'||region==='turquie';
  if(beams.visible){
   const playerPoint=[player.x-home.x,groundY(player.x,player.z)-base+1.8,player.z-home.z],focusPoint=[focus.x-home.x,groundY(focus.x,focus.z)-base+2,focus.z-home.z];
   const reliable=presentation?.signal?.reliable;
   setBeam(0,[0,.16,0],region==='turquie'&&reliable?[reliable.x-home.x,.18,reliable.z-home.z]:playerPoint);setBeam(1,[0,.16,0],focusPoint);setBeam(2,[-2,.16,0],[2,.16,0]);beamGeometry.attributes.position.needsUpdate=true;
   beamMaterial.opacity=region==='algerie'&&!presentation?.link?.stable ? .2 : .65;
  }
  root.userData.state={region,phase,signature:region,integrity,shield:encounter?.guardianShield||0,intensity:region==='espagne'?encounter?.guardianMeter||0:0,verified:!!encounter?.guardianFlag,windup:field?.windup||0};
 }
 return {root,tick,dispose(){root.removeFromParent();owned.forEach(resource=>resource.dispose());}};
}

export function createRealmMarker(item,{groundY=()=>0,library,reducedMotion=false,onError}={}){
 item={...item};
 const root=new THREE.Group();root.name='3B-Objective-'+item.id;root.position.set(item.x,groundY(item.x,item.z),item.z);
 const owned=[],keep=value=>(owned.push(value),value),colour=item.color||'#dfc58c';
 const baseMaterial=keep(new THREE.MeshStandardMaterial({color:'#1a242a',roughness:.48,metalness:.35}));
 const metalMaterial=keep(new THREE.MeshStandardMaterial({color:colour,roughness:.33,metalness:.72,emissive:colour,emissiveIntensity:.12}));
 const base=new THREE.Mesh(keep(new THREE.CylinderGeometry(.55,.7,.5,10)),baseMaterial);base.position.y=.25;root.add(base);
 const figure=new THREE.Mesh(keep(new THREE.OctahedronGeometry(.42)),metalMaterial);figure.position.y=1.45;root.add(figure);
 const geometry=keep(new THREE.RingGeometry(.88,.94,40)),material=keep(new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));
 const ring=new THREE.Mesh(geometry,material);ring.rotation.x=-Math.PI/2;ring.position.y=.045;root.add(ring);
 const trialMaterial=keep(new THREE.MeshBasicMaterial({color:'#c9a569',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));
 const trialGeometry=keep(new THREE.PlaneGeometry(6,2.5)),trialBands=[];
 if(['hazard','defend','rhythm','relay'].includes(item.mode))for(let i=0;i<3;i++){const band=new THREE.Mesh(trialGeometry,trialMaterial);band.rotation.x=-Math.PI/2;band.position.set(0,.05,-3-i*3);root.add(band);trialBands.push(band);}
 const actors=[],human=item.type==='campaignObjective'&&!['guardian','hazard','rhythm','defend','rebuild','route','memory'].includes(item.mode);
 if(library&&human){
  const count=item.mode==='escort'?3:1;
  for(let i=0;i<count;i++){
   const actor=createLivingActor(library,{scale:2.05,reducedMotion,onError,avatar:count===1?campaignPerson(item):{body:i%2?'femme':'homme',style:i%2?'mystique':'voyageur',color:(item.region?.length+i)%6,skin:(i+2)%5,hair:i+1}});
   actor.object.position.set(count===1?1.5:i===0?0:i===1?-1.4:1.4,0,i?1.5:0);root.add(actor.object);actors.push(actor);
  }
  figure.position.x=-1.4;
 }
 const relic=createStoryRelic(item);if(relic){root.add(relic.root);figure.visible=false;}
 let previousTime=0,oldPoint={x:item.x,z:item.z};
 return {root,update(next){Object.assign(item,next);root.position.set(item.x,groundY(item.x,item.z),item.z);},tick(time,position,{reducedMotion=false}={}){
  const dt=Math.min(.1,Math.max(0,time-previousTime));previousTime=time;root.visible=Math.hypot(position.x-item.x,position.z-item.z)<260;if(!root.visible)return;
  figure.rotation.y=reducedMotion?0:time*.2;figure.position.y=1.45+(reducedMotion?0:Math.sin(time*1.1)*.08);
  if(trialBands.length){const challenge=item.campaign;trialMaterial.color.set(challenge?.safe?'#83c6bb':'#c9a569');trialMaterial.opacity=challenge?.started ? .32 : .16;trialBands.forEach(band=>band.visible=challenge?.integrity>0);}
  const dx=item.x-oldPoint.x,dz=item.z-oldPoint.z;
  actors.forEach(actor=>{const nearby=Math.hypot(position.x-item.x,position.z-item.z)<14;actor.setAttention(nearby?{x:position.x,y:groundY(position.x,position.z)+3.4,z:position.z}:null);actor.setActivity?.(nearby&&item.mode!=='escort'?'Talk':null);actor.update(dt,dx,dz,Math.hypot(dx,dz));if(nearby&&item.mode!=='escort')actor.face(position.x-item.x-actor.object.position.x,position.z-item.z-actor.object.position.z,dt);});oldPoint={x:item.x,z:item.z};
 },dispose(){relic?.dispose();root.removeFromParent();actors.forEach(actor=>actor.dispose());owned.forEach(resource=>resource.dispose());}};
}
