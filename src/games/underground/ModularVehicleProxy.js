import * as THREE from 'three';
import {resolveVehicleAssembly} from './vehiclePlatform.js';

const C=v=>new THREE.Color(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function mat(color,{metalness=.15,roughness=.45,clearcoat=0,clearcoatRoughness=.12,emissive=null,emissiveIntensity=0,transparent=false,opacity=1,iridescence=0}={}){
  return new THREE.MeshPhysicalMaterial({color:C(color),metalness,roughness,clearcoat,clearcoatRoughness,emissive:emissive?C(emissive):C('#000000'),emissiveIntensity,transparent,opacity,iridescence,iridescenceIOR:1.3});
}
function box(w,h,d,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function cyl(r,w,material,x,y,z,camber=0,segments=24){const g=new THREE.CylinderGeometry(r,r,w,segments);g.rotateZ(Math.PI/2);const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.rotation.z+=camber;m.castShadow=true;return m;}
function selected(assembly,slot){return assembly.parts.find(p=>p.slotId===slot)?.optionId||'';}
function contains(assembly,slot,word){return selected(assembly,slot).includes(word);}
function finishMaterial(assembly,color){
  const id=selected(assembly,'finish');
  if(id.includes('mat'))return mat(color,{metalness:.52,roughness:.58,clearcoat:.05});
  if(id.includes('satin'))return mat(color,{metalness:.58,roughness:.38,clearcoat:.25});
  if(id.includes('chrome'))return mat(color,{metalness:.96,roughness:.08,clearcoat:.75,clearcoatRoughness:.04});
  if(id.includes('iridescent'))return mat(color,{metalness:.62,roughness:.18,clearcoat:1,clearcoatRoughness:.055,iridescence:.8});
  if(id.includes('candy'))return mat(color,{metalness:.64,roughness:.16,clearcoat:1,clearcoatRoughness:.045});
  if(id.includes('nacre')||id.includes('nacre'))return mat(color,{metalness:.5,roughness:.17,clearcoat:.95,clearcoatRoughness:.06,iridescence:.25});
  return mat(color,{metalness:.78,roughness:.22,clearcoat:.9,clearcoatRoughness:.07});
}

export function createModularVehicleProxy(vehicle,{ai=false,accentOverride=null}={}){
  const a=resolveVehicleAssembly(vehicle),c=a.customization,root=new THREE.Group();root.name='U3B_ModularVehicleProxy';root.userData={platformId:a.platformId,platformVersion:a.platformVersion,assembly:a,wheels:[],lightMaterials:[],neonMaterials:[]};
  const primary=ai?'#101319':c.colors.primary,secondary=ai?'#08090c':c.colors.secondary,accent=accentOverride||(ai?'#e24444':c.colors.accent);
  const bodyMat=finishMaterial(a,primary),secondaryMat=mat(secondary,{metalness:.56,roughness:.28,clearcoat:.52,clearcoatRoughness:.1}),accentMat=mat(accent,{metalness:.72,roughness:.24,clearcoat:.62,clearcoatRoughness:.08});
  const dark=mat('#030406',{metalness:.4,roughness:.54}),glass=mat('#101824',{metalness:.18,roughness:.09,clearcoat:1,clearcoatRoughness:.035,transparent:true,opacity:.82}),carbon=mat('#06080b',{metalness:.38,roughness:.31,clearcoat:.36}),interior=mat(c.colors.interior,{roughness:.64}),screen=mat('#07111d',{roughness:.16,emissive:'#2f75ff',emissiveIntensity:.68});
  const lightFront=mat(c.colors.light,{roughness:.12,emissive:c.colors.light,emissiveIntensity:4.6}),lightRear=mat('#ff1838',{roughness:.12,emissive:'#ff1838',emissiveIntensity:4.2});root.userData.lightMaterials.push(lightFront,lightRear);

  // Châssis et panneaux séparés : la silhouette finale pourra remplacer chaque module.
  root.add(box(1.78,.22,3.56,dark,0,.31,0));
  root.add(box(1.90,.44,1.52,bodyMat,0,.60,-1.08));
  root.add(box(1.90,.46,1.38,bodyMat,0,.61,1.12));
  root.add(box(1.78,.34,1.25,secondaryMat,0,.78,-.04));
  root.add(box(1.50,.48,1.55,glass,0,1.05,-.02));
  root.add(box(1.65,.11,.94,contains(a,'hood','carbone')?carbon:bodyMat,0,.91,-1.28));
  root.add(box(1.54,.10,1.20,contains(a,'roof','carbone')?carbon:bodyMat,0,1.34,.02));
  root.add(box(1.72,.09,.34,dark,0,.36,-2.02),box(1.68,.08,.36,dark,0,.34,2.02));

  if(!selected(a,'spoiler').includes('aucun')){const width=contains(a,'spoiler','gt')?1.98:1.56,wing=box(width,.065,.34,contains(a,'spoiler','carbone')?carbon:dark,0,1.20,1.72);root.add(wing,box(.075,.36,.075,dark,-.56,1.03,1.67),box(.075,.36,.075,dark,.56,1.03,1.67));}
  if(!selected(a,'rollCage').includes('aucun')){const cage=box(1.25,.055,1.35,accentMat,0,1.02,.12);cage.rotation.z=.02;root.add(cage);}

  // Habitacle configurable : sièges, volant, écran, audio coffre.
  const seatStyle=selected(a,'seats'),seatMat=contains(a,'seatMaterial','carbone')?carbon:interior;
  for(const x of [-.38,.38]){const s=box(.44,.62,.62,seatMat,x,.70,.28);s.rotation.x=-.12;root.add(s);if(seatStyle.includes('baquet'))root.add(box(.36,.12,.24,accentMat,x,1.01,.34));}
  const steering=box(.07,.42,.42,dark,-.43,.89,-.50);steering.rotation.z=Math.PI/4;root.add(steering);root.add(box(.92,.18,.24,interior,0,.82,-.58));
  if(!selected(a,'headUnit').includes('origine'))root.add(box(.46,.24,.04,screen,0,.82,-.70));
  if(!selected(a,'subwoofer').includes('aucun')){root.add(box(.70,.42,.32,dark,0,.57,1.39));root.add(cyl(.22,.05,accentMat,0,.58,1.21));}

  // Signatures lumineuses et verre optique.
  for(const x of [-.58,.58]){root.add(box(.47,.09,.045,lightFront,x,.71,-2.035));root.add(box(.47,.08,.045,lightRear,x,.72,2.035));}
  root.add(box(1.18,.035,.035,lightRear,0,.72,2.06));
  if(contains(a,'drl','halo'))for(const x of [-.58,.58])root.add(cyl(.12,.032,lightFront,x,.73,-2.052));
  if(c.neon.enabled&&!ai){const neon=mat(c.neon.color,{roughness:.18,emissive:c.neon.color,emissiveIntensity:1.6+3.2*c.neon.intensity,transparent:true,opacity:.9});const glow=box(1.76,.018,3.35,neon,0,.105,0);glow.castShadow=false;glow.receiveShadow=false;root.userData.neonMaterials.push(neon);root.add(glow);const haloMat=new THREE.MeshBasicMaterial({color:C(c.neon.color),transparent:true,opacity:.14+.22*c.neon.intensity,depthWrite:false,blending:THREE.AdditiveBlending});const halo=new THREE.Mesh(new THREE.CircleGeometry(1.35,28),haloMat);halo.rotation.x=-Math.PI/2;halo.scale.set(1.1,2.2,1);halo.position.y=.075;root.userData.neonMaterials.push(haloMat);root.add(halo);}

  // Roues, disques, étriers et stance calculés depuis le contrat de plateforme.
  const tire=mat('#020304',{roughness:.84}),rim=mat(contains(a,'rimFinish','chrome')?'#e3e7ec':contains(a,'rimFinish','or')?'#c8a35a':'#505762',{metalness:.92,roughness:.18,clearcoat:.25}),disc=mat('#9aa0a7',{metalness:.95,roughness:.24}),caliper=mat(c.colors.caliper,{metalness:.62,roughness:.28,clearcoat:.25});
  const wr=a.stance.diameterM/2,ww=a.stance.widthM;
  for(const [id,w] of Object.entries(a.stance.wheels)){
    const wheel=cyl(wr,ww,tire,w.position[0],w.position[1],w.position[2],w.camberRad,28);wheel.name=`wheel-${id}`;wheel.userData={radius:wr,baseCamber:w.camberRad};root.userData.wheels.push(wheel);root.add(wheel);
    const rimMesh=cyl(wr*.64,ww*1.025,rim,w.position[0],w.position[1],w.position[2],w.camberRad,28);rimMesh.name=`rim-${id}`;root.userData.wheels.push(rimMesh);root.add(rimMesh);
    root.add(cyl(wr*.43,ww*1.045,disc,w.position[0],w.position[1],w.position[2],w.camberRad,28));
    const cal=box(.12,.25,.08,caliper,w.position[0]+(w.position[0]<0?.02:-.02),w.position[1]+.02,w.position[2]);root.add(cal);
  }

  // Diffuseur, échappement et détails identitaires.
  if(!selected(a,'diffuser').includes('origine'))for(const x of [-.55,0,.55]){const fin=box(.04,.24,.42,dark,x,.27,1.96);fin.rotation.x=-.16;root.add(fin);}
  if(!selected(a,'exhaustTips').includes('origine'))for(const x of contains(a,'exhaustTips','quad')?[-.68,-.48,.48,.68]:[-.56,.56]){const tip=cyl(.07,.18,contains(a,'exhaustTips','titane')?accentMat:dark,x,.34,2.10);tip.rotation.y=Math.PI/2;root.add(tip);}
  if(!selected(a,'towHook').includes('aucun'))root.add(cyl(.06,.15,accentMat,.52,.34,-2.06));
  if(selected(a,'antenna').includes('requin')){const ant=box(.16,.08,.24,secondaryMat,0,1.41,.72);ant.rotation.x=-.2;root.add(ant);}

  root.position.y+=a.stance.rideOffsetM;root.scale.set(.94,.94,.94);return root;
}

export function updateProxyRuntime(root,vehicle,{speedKph=0,time=0,brake=0,steer=0}={}){
  if(!root?.userData?.assembly)return;const c=root.userData.assembly.customization,intensity=c.neon.enabled?clamp(c.neon.intensity,0,1):0;
  for(const m of root.userData.neonMaterials||[]){if('emissiveIntensity'in m&&c.neon.pulse!=='steady'){const pulse=c.neon.pulse==='beat'?(.55+.45*Math.sin(time*9)):c.neon.pulse==='chase'?(.5+.5*Math.sin(time*13+root.position.z*.2)):(.75+.25*Math.sin(time*4));m.emissiveIntensity=(1.35+3.2*intensity)*pulse;}else if('opacity'in m&&c.neon.pulse!=='steady')m.opacity=(.10+.24*intensity)*(.72+.28*Math.sin(time*4.4));}
  for(const m of root.userData.lightMaterials||[])if(m.emissive?.r>.8&&m.emissive?.g<.4)m.emissiveIntensity=4.0+clamp(brake,0,1)*4.8;
  const wheelAngular=(speedKph/3.6)/Math.max(.12,root.userData.wheels?.[0]?.userData?.radius||.34);for(const w of root.userData.wheels||[])w.rotation.x-=wheelAngular*.016;
  root.rotation.x=THREE.MathUtils.lerp(root.rotation.x,-Math.min(.022,speedKph/15000),.08);root.rotation.z=THREE.MathUtils.lerp(root.rotation.z,-clamp(steer,-1,1)*Math.min(.015,speedKph/16000),.07);
}
