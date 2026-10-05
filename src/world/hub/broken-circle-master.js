import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function createBrokenCircleMaster({root,owned,materials,countries=[]}){
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
  // Heavy architectural shell: fixed to the city and visibly broken between sectors.
  add(fixed,new THREE.TorusGeometry(12,.82,10,28,segmentArc),i%2?dark:gold,[0,0,0],[0,0,a]);
  add(fixed,new THREE.TorusGeometry(12,.12,6,28,segmentArc),gold,[0,0,.88],[0,0,a]);
  // Mechanical collars rotate independently inside the fixed shell.
  add(rotorOuter,new THREE.TorusGeometry(10.45,.34,8,24,segmentArc-.035),i%2?stone:gold,[0,0,0],[0,0,a+.018]);
  add(rotorInner,new THREE.TorusGeometry(8.85,.16,6,24,segmentArc-.06),blue,[0,0,.05],[0,0,a+.03]);
  const color=countries[i]?.color||'#d6b46a',mat=new THREE.MeshPhysicalMaterial({color,emissive:color,emissiveIntensity:.1,metalness:.58,roughness:.28,clearcoat:.5,clearcoatRoughness:.18});
  owned.push(mat);
  const seal=add(fixed,new THREE.BoxGeometry(.28,1.35,.18),mat,[Math.cos(a+.17)*11.7,Math.sin(a+.17)*11.7,1.02],[0,0,a+.17-Math.PI/2]);
  heritage.push({mesh:seal,material:mat,index:i});
 }
 // Controlled fracture fragments stay near the right break and float independently.
 const pieces=[
  [12.45,1.25,.35,.9,.55,.8,.14],[13.15,2.05,-.15,.66,.44,.62,-.2],[13.35,3.05,.2,.55,.38,.52,.27],
  [12.75,4.0,-.1,.48,.34,.46,-.31],[12.25,4.75,.16,.4,.3,.38,.35]
 ];
 const loose=[];
 pieces.forEach((p,i)=>{const m=add(fracture,new THREE.BoxGeometry(p[3],p[4],p[5]),i%2?stone:gold,[p[0],p[1],p[2]],[0,0,p[6]]);loose.push({mesh:m,base:m.position.clone(),phase:i*1.37});});
 // Energy rails and efficient local lights illuminate nearby architecture.
 add(energy,new THREE.TorusGeometry(9.55,.055,5,96),blue,[0,0,.45]);
 add(energy,new THREE.TorusGeometry(11.15,.04,5,96),blue,[0,0,-.45]);
 const cyan=new THREE.PointLight('#55dfff',1.15,46,2),amber=new THREE.PointLight('#d6b46a',.38,34,2);
 cyan.position.set(0,0,3);amber.position.set(-5,-6,2);cyan.castShadow=amber.castShadow=false;energy.add(cyan,amber);

 const particleCount=32,positions=new Float32Array(particleCount*3);
 for(let i=0;i<particleCount;i++){const t=i/(particleCount-1);positions[i*3]=11.7+(i%5)*.38;positions[i*3+1]=.4+t*5.3;positions[i*3+2]=((i%7)-3)*.16;}
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(positions,3));owned.push(pg);
 const pm=new THREE.PointsMaterial({color:'#b9f6ff',size:.11,transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending});owned.push(pm);
 const particles=new THREE.Points(pg,pm);fracture.add(particles);

 let progress=0,daylight=1,reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function setProgress(count){
  progress=clamp(Number(count)||0,0,8);
  for(const h of heritage){const on=h.index<progress;h.material.emissiveIntensity=on?.92:.08;h.mesh.scale.setScalar(on?1.08:.92);}
 }
 function setDaylight(value){daylight=clamp(Number(value)||0);}

 function tick(time,playerDistance=Infinity){
  const near=clamp(1-playerDistance/125);
  const motion=reduced?.06:1;
  rotorOuter.rotation.z=time*.035*motion*(1+near*.18);
  rotorInner.rotation.z=-time*.052*motion*(1+near*.24);
  energy.rotation.z=time*.11*motion;
  energy.scale.setScalar(1+Math.sin(time*.9)*.006*(1+near));
  const pulse=.72+.28*Math.sin(time*1.25);
  cyan.intensity=(.65+.72*(1-daylight)+near*.9)*pulse;
  amber.intensity=.18+.28*(1-daylight)+near*.2;
  pm.opacity=.28+.28*pulse+near*.16;
  loose.forEach((f,i)=>{const amp=(.06+.035*near)*motion;f.mesh.position.y=f.base.y+Math.sin(time*.72+f.phase)*amp;f.mesh.position.x=f.base.x+Math.cos(time*.48+f.phase)*amp*.45;f.mesh.rotation.z+=((i%2?-.006:.008)*motion)*(1+near*.3);});
  particles.rotation.z=Math.sin(time*.16)*.035;particles.position.y=Math.sin(time*.65)*.08*motion;
  fixed.rotation.z=Math.sin(time*.09)*.0015*motion;
  root.userData.brokenCircle={progress,near,outerRotation:rotorOuter.rotation.z,innerRotation:rotorInner.rotation.z};
 }

 setProgress(0);
 return {root:fixed,groups:{fixed,rotorOuter,rotorInner,fracture,energy},setProgress,setDaylight,tick,diagnostics:{rings:3,heritages:8,looseFragments:loose.length,physical:true,articulated:true}};
}
