import * as THREE from 'three';
import {AVATAR_PATHS} from './avatar-rules.js';

export const ENEMY_EFFECTS={france:'#efc66e',italie:'#ec9970',estonie:'#8bdbed',turquie:'#baa2f2',algerie:'#ecc68a',tunisie:'#79d5e2',maroc:'#e99875',espagne:'#dfbb74'};
// Presentation consumes the accepted transition, never grants damage or rewards.
// In particular, a killing blow, pacification or trap cannot trigger a fake hit.
export function combatCue(before,after,action,avatar={}){
 if(!before||!after||after.turn!==before.turn+1)return null;
 return{action,path:avatar.path||'lumiere',color:AVATAR_PATHS[avatar.path]?.color||AVATAR_PATHS.lumiere.color,enemyColor:ENEMY_EFFECTS[before.region]||'#dc9b9b',intent:before.intent,outgoing:Math.max(0,before.enemy-after.enemy),incoming:Math.max(0,before.hp-after.hp),healing:Math.max(0,after.hp-before.hp),counter:!after.result&&action!=='trap',defended:action==='guard'||action==='dodge',result:after.result};
}

export function createCombatEffects({reducedMotion=false}={}){
 const root=new THREE.Group(),owned=[],scratch=new THREE.Vector3(),from=new THREE.Vector3(),to=new THREE.Vector3();root.name='Combat effects';
 const geo=g=>(owned.push(g),g),material=(color,opacity=0)=>{const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});owned.push(m);return m;};
 const arc=geo(new THREE.RingGeometry(1.95,2.65,44,1,0,Math.PI*1.3)),halo=geo(new THREE.TorusGeometry(1,.07,5,40)),orbGeo=geo(new THREE.IcosahedronGeometry(1,1));
 const group=()=>{const g=new THREE.Group();root.add(g);return g;},out=group(),incoming=group(),impact=group(),defence=group();
 function mesh(g,parent,color){const m=new THREE.Mesh(g,material(color));parent.add(m);return m;}
 const slash=mesh(arc,out,'#fff2cf'),echo=mesh(arc,out,'#f0d28f'),projectile=mesh(orbGeo,out,'#efd58f');echo.scale.setScalar(.85);
 const hit=mesh(halo,impact,'#fff3d6'),guard=mesh(halo,defence,'#94def0'),guard2=mesh(halo,defence,'#badfef');guard2.scale.setScalar(1.65);
 const enemyArc=mesh(arc,incoming,'#eaaa83'),enemyOrb=mesh(orbGeo,incoming,'#eaaa83');
 const boltPositions=new Float32Array(18*6),boltGeo=geo(new THREE.BufferGeometry());boltGeo.setAttribute('position',new THREE.BufferAttribute(boltPositions,3));const bolt=new THREE.LineSegments(boltGeo,material('#a6e4ff'));out.add(bolt);bolt.frustumCulled=false;
 const beamGeo=geo(new THREE.CylinderGeometry(1,1,1,6)),beamCore=new THREE.InstancedMesh(beamGeo,material('#d7f5ff'),18),beamGlow=new THREE.InstancedMesh(beamGeo,material('#84cce5'),18),beamDummy=new THREE.Object3D(),beamA=new THREE.Vector3(),beamB=new THREE.Vector3(),beamDelta=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);out.add(beamCore,beamGlow);beamCore.frustumCulled=beamGlow.frustumCulled=false;
 const particlesPositions=new Float32Array(48*3),particleGeo=geo(new THREE.BufferGeometry());particleGeo.setAttribute('position',new THREE.BufferAttribute(particlesPositions,3));
 const particleMat=new THREE.PointsMaterial({color:'#fbe4b2',size:.11,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});owned.push(particleMat);const particles=new THREE.Points(particleGeo,particleMat);particles.frustumCulled=false;impact.add(particles);
 let cue=null,started=-100,lastAge=0;root.visible=false;
 function clear(){root.visible=false;cue=null;}
 function start(next,time){cue=next;started=time;root.visible=!!next;if(!cue)return;for(const m of [slash,echo,projectile,bolt])m.material.color.set(cue.color);enemyArc.material.color.set(cue.enemyColor);enemyOrb.material.color.set(cue.enemyColor);particleMat.color.set(cue.color);}
 const fade=(a,start,end)=>a<start||a>end?0:Math.sin((a-start)/(end-start)*Math.PI);
 function update(time,hero,enemy){
  const age=time-started;lastAge=age;if(!cue||!hero||!enemy||age>.88){root.visible=false;return;}root.visible=true;
  from.copy(hero);from.y+=2;to.copy(enemy);to.y+=2;const length=from.distanceTo(to),yaw=Math.atan2(to.x-from.x,to.z-from.z);
  out.position.copy(from);out.rotation.set(0,yaw,0);incoming.position.copy(to);incoming.rotation.set(0,yaw+Math.PI,0);impact.position.copy(to);defence.position.copy(from);defence.rotation.set(0,yaw,0);
  const attack=cue.action==='strike',power=cue.action==='power',t=Math.min(1,age/.25),f=fade(age,0,.34),powerAlpha=fade(age,0,.45),motion=reducedMotion?.25:1;
  slash.visible=echo.visible=attack||power&&cue.path==='ombre';slash.position.set(0,0,Math.min(2,length*.45));slash.rotation.set(.25,0,-1.7+t*2.5*motion);echo.position.copy(slash.position);echo.rotation.copy(slash.rotation);echo.rotation.z-=.2;slash.material.opacity=f*.85;echo.material.opacity=f*.32;
  projectile.visible=power&&cue.path!=='ombre'&&cue.path!=='tempete';projectile.position.set(0,Math.sin(t*Math.PI)*.35*motion,Math.min(length,length*t));projectile.scale.setScalar(cue.path==='nature'?.45:.28);projectile.rotation.set(t*3,t*2,0);projectile.material.opacity=powerAlpha*.85;
  bolt.visible=power&&cue.path==='tempete';bolt.material.opacity=powerAlpha*.85;beamCore.visible=beamGlow.visible=bolt.visible;beamCore.material.opacity=powerAlpha*.9;beamGlow.material.opacity=powerAlpha*.22;
  if(bolt.visible){for(let i=0;i<18;i++){const a=i/18,b=(i+1)/18,w=Math.sin(a*Math.PI)*.35;boltPositions.set([Math.sin(i*4.7)*w,Math.cos(i*2.8)*w,length*a,Math.sin((i+1)*4.7)*w,Math.cos((i+1)*2.8)*w,length*b],i*6);}boltGeo.attributes.position.needsUpdate=true;for(let i=0;i<18;i++){beamA.fromArray(boltPositions,i*6);beamB.fromArray(boltPositions,i*6+3);beamDelta.copy(beamB).sub(beamA);const len=beamDelta.length();beamDummy.position.copy(beamA).add(beamB).multiplyScalar(.5);beamDummy.quaternion.setFromUnitVectors(up,beamDelta.normalize());beamDummy.scale.set(.045,len,.045);beamDummy.updateMatrix();beamCore.setMatrixAt(i,beamDummy.matrix);beamDummy.scale.set(.17,len,.17);beamDummy.updateMatrix();beamGlow.setMatrixAt(i,beamDummy.matrix);}beamCore.instanceMatrix.needsUpdate=beamGlow.instanceMatrix.needsUpdate=true;}
  const burst=cue.outgoing?fade(age,.15,.7):0;hit.material.opacity=burst*.6;hit.scale.setScalar(.25+Math.max(0,age-.15)*2.7*motion);hit.lookAt(from);particleMat.opacity=burst*.8;
  for(let i=0;i<48;i++){const a=i*2.39996,r=(.3+Math.max(0,age-.16)*3.7*motion)*(1+(i%4)*.17);particlesPositions.set([Math.cos(a)*r,Math.sin(a*.71)*r-Math.max(0,age-.2)**2*3,Math.sin(a)*r],i*3);}particleGeo.attributes.position.needsUpdate=true;
  const shield=cue.action==='guard'||cue.action==='trap',heal=cue.action==='support'||cue.healing>0,dodge=cue.action==='dodge',df=fade(age,.05,.8);guard.visible=guard2.visible=shield||heal||dodge;
  guard.position.set(0,0,shield?1.1:0);guard2.position.copy(guard.position);guard.rotation.set(heal||dodge?Math.PI/2:0,0,0);guard2.rotation.copy(guard.rotation);guard.material.color.set(heal?'#a9de98':cue.action==='trap'?'#dbacfb':'#9edeee');guard2.material.color.copy(guard.material.color);guard.material.opacity=df*.7;guard2.material.opacity=df*.3;guard.scale.setScalar(dodge?1.5:1.1);guard2.scale.setScalar(dodge?2.1:1.65);
  const ef=cue.counter?fade(age,.32,.75):0,et=Math.min(1,Math.max(0,(age-.32)/.25)),ranged=['gel','éclipse','vague','sable','rituel'].includes(cue.intent);
  enemyArc.visible=!!ef&&!ranged;enemyOrb.visible=!!ef&&ranged;enemyArc.material.opacity=ef*.7;enemyArc.rotation.set(.1,0,-1.3+et*2*motion);enemyArc.position.z=Math.min(length,length*et);enemyOrb.position.z=length*et;enemyOrb.scale.setScalar(cue.intent==='vague'?.7:.4);enemyOrb.material.opacity=ef*.7;
  if(cue.action==='trap')defence.position.copy(to);
 }
 return{root,start,update,clear,get state(){return{active:root.visible,cue,age:lastAge};},dispose(){beamCore.dispose();beamGlow.dispose();owned.forEach(v=>v.dispose());root.removeFromParent();}};
}
