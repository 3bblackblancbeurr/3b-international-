import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function createBrokenCircleMaster({root,owned,materials,countries=[],reducedMotion}){
 const {dark,gold,blue,stone}=materials;
 const fixed=new THREE.Group(),rotorOuter=new THREE.Group(),rotorInner=new THREE.Group(),fracture=new THREE.Group(),energy=new THREE.Group();
 fixed.name='Cercle Brisé · coque fixe';rotorOuter.name='Cercle Brisé · rotor externe';rotorInner.name='Cercle Brisé · rotor interne';fracture.name='Cercle Brisé · fracture';energy.name='Cercle Brisé · énergie';
 for(const g of [fixed,rotorOuter,rotorInner,fracture,energy]){g.position.set(0,38,12);root.add(g);}
 const add=(parent,geometry,material,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1])=>{
  owned.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...pos);mesh.rotation.set(...rot);mesh.scale.set(...scale);mesh.castShadow=material!==blue;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 const segmentArc=Math.PI/4-.11,heritage=[];
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  // Heavy architectural shell: sector 0 is deliberately absent to form
  // one unmistakable physical fracture instead of eight equal decorative gaps.
  if(i!==0){
   add(fixed,new THREE.TorusGeometry(12,.82,10,28,segmentArc),i%2?dark:gold,[0,0,0],[0,0,a]);
   add(fixed,new THREE.TorusGeometry(12,.12,6,28,segmentArc),gold,[0,0,.88],[0,0,a]);
  }
  // Mechanical collars rotate independently inside the fixed shell.
  add(rotorOuter,new THREE.TorusGeometry(10.45,.34,8,24,segmentArc-.035),i%2?stone:gold,[0,0,0],[0,0,a+.018]);
  add(rotorInner,new THREE.TorusGeometry(8.85,.16,6,24,segmentArc-.06),blue,[0,0,.05],[0,0,a+.03]);
  const color=countries[i]?.color||'#d6b46a',mat=new THREE.MeshPhysicalMaterial({color,emissive:color,emissiveIntensity:.1,metalness:.58,roughness:.28,clearcoat:.5,clearcoatRoughness:.18});
  owned.push(mat);
  const seal=add(fixed,new THREE.BoxGeometry(.28,1.35,.18),mat,[Math.cos(a+.17)*11.7,Math.sin(a+.17)*11.7,1.02],[0,0,a+.17-Math.PI/2]);
  heritage.push({mesh:seal,material:mat,index:i});
 }
 // Exposed fracture edges carry energy into the structure.
 for(const a of [-.045,Math.PI/4+.045]){
  add(fixed,new THREE.BoxGeometry(.18,1.9,.24),blue,[Math.cos(a)*11.92,Math.sin(a)*11.92,.94],[0,0,a-Math.PI/2]);
 }

 // Controlled fracture fragments stay near the right break and float independently.
 const pieces=[
  [12.45,1.25,.35,.9,.55,.8,.14],[13.15,2.05,-.15,.66,.44,.62,-.2],[13.35,3.05,.2,.55,.38,.52,.27],
  [12.75,4.0,-.1,.48,.34,.46,-.31],[12.25,4.75,.16,.4,.3,.38,.35]
 ];
 const loose=[];
 pieces.forEach((p,i)=>{const m=add(fracture,new THREE.BoxGeometry(p[3],p[4],p[5]),i%2?stone:gold,[p[0],p[1],p[2]],[0,0,p[6]]);loose.push({mesh:m,base:m.position.clone(),angle:p[6],phase:i*1.37});});
 // Energy rails and efficient local lights illuminate nearby architecture.
 add(energy,new THREE.TorusGeometry(9.55,.055,5,96),blue,[0,0,.45]);
 add(energy,new THREE.TorusGeometry(11.15,.04,5,96),blue,[0,0,-.45]);
 const cyan=new THREE.PointLight('#55dfff',1.65,52,2),amber=new THREE.PointLight('#d6b46a',.48,38,2);
 cyan.position.set(0,0,3);amber.position.set(-5,-6,2);cyan.castShadow=amber.castShadow=false;energy.add(cyan,amber);

 const compact=(group,keep=new Set())=>{
  const byMaterial=new Map();
  for(const child of [...group.children])if(child.isMesh&&!keep.has(child)){
   const key=child.material.uuid;if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(child);
  }
  for(const list of byMaterial.values())if(list.length>1){
   const parts=list.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return g.applyMatrix4(mesh.matrix);});
   const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!merged)continue;owned.push(merged);
   const mesh=new THREE.Mesh(merged,list[0].material);mesh.castShadow=list[0].material!==blue;mesh.receiveShadow=true;group.add(mesh);list.forEach(old=>old.removeFromParent());
  }
 };
 compact(fixed,new Set(heritage.map(h=>h.mesh)));compact(rotorOuter);compact(rotorInner);compact(energy);

 // Three differently coloured moving resonance bands share one GPU draw call.
 const waveGeometry=new THREE.TorusGeometry(13,.052,5,96);
 const waveMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.10,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 owned.push(waveGeometry,waveMaterial);
 const waves=new THREE.InstancedMesh(waveGeometry,waveMaterial,3);
 waves.name='Cercle Brisé · 3 résonances instanciées';waves.castShadow=waves.receiveShadow=false;waves.frustumCulled=false;energy.add(waves);
 const waveMatrix=new THREE.Object3D();
 const positionWave=(index,time=0,motion=0)=>{
  const phase=Math.sin(time*(1.05+index*.13)-index*1.9);
  waveMatrix.position.set(0,0,.47-index*.09);
  waveMatrix.scale.setScalar((13+index*.67)/13*(1+.018*phase*motion));
  waveMatrix.updateMatrix();waves.setMatrixAt(index,waveMatrix.matrix);
 };
 for(let index=0;index<3;index++){waves.setColorAt(index,new THREE.Color(index===1?'#d6bc82':'#54d9f5'));positionWave(index);}
 waves.instanceMatrix.needsUpdate=true;if(waves.instanceColor)waves.instanceColor.needsUpdate=true;
 // Deterministic lights create sparkle without new shadows, textures or network downloads.
 const starCount=96,starPositions=new Float32Array(starCount*3);
 for(let i=0;i<starCount;i++){const a=i*2.399963229728653,radial=12.7+(i%9)*.19;starPositions[i*3]=Math.cos(a)*radial;starPositions[i*3+1]=Math.sin(a)*radial;starPositions[i*3+2]=.8+((i*7)%6)*.08;}
 const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));owned.push(starsGeometry);
 const starsMaterial=new THREE.PointsMaterial({color:'#f7d99a',size:.17,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending});owned.push(starsMaterial);
 const stars=new THREE.Points(starsGeometry,starsMaterial);energy.add(stars);
 const particleCount=32,positions=new Float32Array(particleCount*3);
 for(let i=0;i<particleCount;i++){const t=i/(particleCount-1);positions[i*3]=11.7+(i%5)*.38;positions[i*3+1]=.4+t*5.3;positions[i*3+2]=((i%7)-3)*.16;}
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(positions,3));owned.push(pg);
 const pm=new THREE.PointsMaterial({color:'#b9f6ff',size:.11,transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending});owned.push(pm);
 const particles=new THREE.Points(pg,pm);fracture.add(particles);

 const motionQuery=typeof window!=='undefined'?window.matchMedia?.('(prefers-reduced-motion: reduce)'):null;
 let progress=0,daylight=1,lastTime=null,animationTime=0,outerPhase=0,innerPhase=0,quality='medium';
 const reduced=()=>reducedMotion??(motionQuery?.matches||typeof document!=='undefined'&&document.documentElement.dataset.experienceMotion==='reduced');
 function setProgress(count){
  progress=clamp(Number(count)||0,0,8);
  for(const h of heritage){const on=h.index<progress;h.material.emissiveIntensity=on ? .92 : .08;h.mesh.scale.setScalar(on ? 1.08 : .92);}
 }
 function setDaylight(value){daylight=clamp(Number(value)||0);}
 function setQuality(mode){
  quality=mode;
  pg.setDrawRange(0,mode==='fluid'||mode==='low'?12:particleCount);
  starsGeometry.setDrawRange(0,mode==='fluid'||mode==='low'?20:starCount);
  waves.count=mode==='fluid'||mode==='low'?1:3;
 }

 function tick(time,playerDistance=Infinity){
  if(!Number.isFinite(time))return;
  time=Math.max(0,time);
  const near=Number.isFinite(playerDistance)?clamp(1-Math.max(0,playerDistance)/125):0;
  const dt=lastTime===null?Math.min(time,.25):clamp(time-lastTime,0,.25);lastTime=time;
  const motion=reduced()?0:1;
  // Integrate speed rather than multiplying the entire elapsed time by
  // proximity: approaching the monument must never jump its mechanical phase.
  animationTime+=dt*motion;
  outerPhase=(outerPhase+dt*.035*motion*(1+near*.18))%TAU;
  innerPhase=(innerPhase-dt*.052*motion*(1+near*.24))%TAU;
  rotorOuter.rotation.z=outerPhase;
  rotorInner.rotation.z=innerPhase;
  energy.rotation.z=(animationTime*.11)%TAU;
  energy.scale.setScalar(1+Math.sin(animationTime*.9)*.006*(1+near)*motion);
  const pulse=motion?.72+.28*Math.sin(animationTime*1.25):1;
  cyan.intensity=(.82+1.02*(1-daylight)+near*1.08)*pulse;
  amber.intensity=.24+.38*(1-daylight)+near*.24;
  pm.opacity=.28+.28*pulse+near*.16;
  for(let index=0;index<waves.count;index++)positionWave(index,animationTime,motion);
  waves.instanceMatrix.needsUpdate=true;waveMaterial.opacity=.055+.045*(.5+.5*Math.sin(animationTime*.82))+near*.05;
  starsMaterial.opacity=.19+.16*(.5+.5*Math.sin(animationTime*2.1))+near*.18;
  stars.rotation.z=-animationTime*.045*motion;
  loose.forEach(f=>{const amp=(.06+.035*near)*motion;f.mesh.position.y=f.base.y+Math.sin(animationTime*.72+f.phase)*amp;f.mesh.position.x=f.base.x+Math.cos(animationTime*.48+f.phase)*amp*.45;f.mesh.rotation.z=f.angle+Math.sin(animationTime*.48+f.phase)*.16*motion;});
  particles.rotation.z=Math.sin(animationTime*.16)*.035*motion;particles.position.y=Math.sin(animationTime*.65)*.08*motion;
  // The architectural shell is anchored; only the internal machinery moves.
  fixed.rotation.z=0;
  cyan.visible=playerDistance<180;
  amber.visible=playerDistance<125&&quality!=='fluid'&&quality!=='low';
  root.userData.brokenCircle={progress,near,outerRotation:rotorOuter.rotation.z,innerRotation:rotorInner.rotation.z};
 }

 setProgress(0);
 return {root:fixed,groups:{fixed,rotorOuter,rotorInner,fracture,energy},setProgress,setDaylight,setQuality,tick,diagnostics:{rings:3,heritages:8,looseFragments:loose.length,physical:true,articulated:true}};
}
