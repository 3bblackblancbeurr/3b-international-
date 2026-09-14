import * as THREE from 'three';
import {resolveVehicleAssembly} from './vehiclePlatform.js';

const C=v=>new THREE.Color(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function mat(color,{metalness=.15,roughness=.45,clearcoat=0,emissive=null,emissiveIntensity=0}={}){
  return new THREE.MeshPhysicalMaterial({color:C(color),metalness,roughness,clearcoat,clearcoatRoughness:.12,emissive:emissive?C(emissive):C('#000000'),emissiveIntensity});
}
function box(w,h,d,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function cyl(r,w,material,x,y,z,camber=0){const g=new THREE.CylinderGeometry(r,r,w,20);g.rotateZ(Math.PI/2);const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.rotation.z+=camber;m.castShadow=true;return m;}
function selected(assembly,slot){return assembly.parts.find(p=>p.slotId===slot)?.optionId||'';}
function contains(assembly,slot,word){return selected(assembly,slot).includes(word);}

export function createModularVehicleProxy(vehicle,{ai=false,accentOverride=null}={}){
  const a=resolveVehicleAssembly(vehicle),c=a.customization,root=new THREE.Group();root.name='U3B_ModularVehicleProxy';root.userData={platformId:a.platformId,platformVersion:a.platformVersion,assembly:a};
  const primary=ai?'#101319':c.colors.primary,secondary=ai?'#08090c':c.colors.secondary,accent=accentOverride||(ai?'#e24444':c.colors.accent);
  const bodyMat=mat(primary,{metalness:.78,roughness:contains(a,'finish','mat')?.42:.22,clearcoat:contains(a,'finish','mat')?0:.86}),secondaryMat=mat(secondary,{metalness:.5,roughness:.3,clearcoat:.4}),accentMat=mat(accent,{metalness:.72,roughness:.24,clearcoat:.55});
  const dark=mat('#030406',{metalness:.35,roughness:.58}),glass=mat('#111827',{metalness:.22,roughness:.12,clearcoat:.9}),carbon=mat('#07090c',{metalness:.3,roughness:.35}),interior=mat(c.colors.interior,{roughness:.62}),screen=mat('#07111d',{roughness:.18,emissive:'#2f75ff',emissiveIntensity:.55});
  const lightFront=mat(c.colors.light,{roughness:.16,emissive:c.colors.light,emissiveIntensity:3.8}),lightRear=mat('#ff243c',{roughness:.18,emissive:'#ff243c',emissiveIntensity:3.3});

  // Châssis et panneaux séparés : chaque module peut être remplacé par un vrai mesh plus tard.
  root.add(box(1.78,.22,3.56,dark,0,.31,0));
  root.add(box(1.88,.46,1.52,bodyMat,0,.60,-1.08));
  root.add(box(1.88,.48,1.38,bodyMat,0,.61,1.12));
  root.add(box(1.76,.35,1.25,secondaryMat,0,.78,-.04));
  root.add(box(1.48,.48,1.55,glass,0,1.05,-.02));
  root.add(box(1.62,.12,.92,contains(a,'hood','carbone')?carbon:bodyMat,0,.91,-1.28));
  root.add(box(1.52,.10,1.20,contains(a,'roof','carbone')?carbon:bodyMat,0,1.34,.02));

  if(!selected(a,'spoiler').includes('aucun')){const width=contains(a,'spoiler','gt')?1.95:1.55;root.add(box(width,.07,.32,contains(a,'spoiler','carbone')?carbon:dark,0,1.20,1.72));root.add(box(.08,.35,.08,dark,-.55,1.03,1.67),box(.08,.35,.08,dark,.55,1.03,1.67));}
  if(!selected(a,'rollCage').includes('aucun')){const cage=box(1.25,.06,1.35,accentMat,0,1.02,.12);cage.rotation.z=.02;root.add(cage);}

  // Habitacle configurable : sièges, volant, écran, audio coffre.
  const seatStyle=selected(a,'seats'),seatMat=contains(a,'seatMaterial','carbone')?carbon:interior;
  for(const x of [-.38,.38]){const s=box(.44,.62,.62,seatMat,x,.70,.28);s.rotation.x=-.12;root.add(s);if(seatStyle.includes('baquet'))root.add(box(.36,.12,.24,accentMat,x,1.01,.34));}
  const steering=box(.07,.42,.42,dark,-.43,.89,-.50);steering.rotation.z=Math.PI/4;root.add(steering);
  root.add(box(.92,.18,.24,interior,0,.82,-.58));
  if(!selected(a,'headUnit').includes('origine'))root.add(box(.46,.24,.04,screen,0,.82,-.70));
  if(!selected(a,'subwoofer').includes('aucun')){root.add(box(.70,.42,.32,dark,0,.57,1.39));root.add(cyl(.22,.05,accentMat,0,.58,1.21));}

  // Éclairage externe configurable.
  for(const x of [-.58,.58]){root.add(box(.46,.09,.045,lightFront,x,.71,-2.03));root.add(box(.46,.08,.045,lightRear,x,.72,2.03));}
  if(contains(a,'drl','halo'))for(const x of [-.58,.58])root.add(cyl(.12,.035,lightFront,x,.73,-2.045));
  if(c.neon.enabled&&!ai){const neon=mat(c.neon.color,{roughness:.2,emissive:c.neon.color,emissiveIntensity:1.5+3*c.neon.intensity});const glow=box(1.72,.025,3.25,neon,0,.12,0);glow.castShadow=false;root.add(glow);}

  // Roues et stance calculés depuis le contrat de plateforme.
  const tire=mat('#020304',{roughness:.8}),rim=mat(contains(a,'rimFinish','chrome')?'#d8dde5':contains(a,'rimFinish','or')?'#c8a35a':'#4e5560',{metalness:.9,roughness:.22}),caliper=mat(c.colors.caliper,{metalness:.6,roughness:.3});
  const wr=a.stance.diameterM/2,ww=a.stance.widthM;
  for(const [id,w] of Object.entries(a.stance.wheels)){
    const wheel=cyl(wr,ww,tire,w.position[0],w.position[1],w.position[2],w.camberRad);root.add(wheel);
    const rimMesh=cyl(wr*.62,ww*1.02,rim,w.position[0],w.position[1],w.position[2],w.camberRad);root.add(rimMesh);
    const cal=cyl(wr*.25,ww*1.08,caliper,w.position[0],w.position[1],w.position[2],w.camberRad);root.add(cal);
  }

  // Détails identitaires visibles sur le proxy.
  if(!selected(a,'towHook').includes('aucun'))root.add(cyl(.06,.15,accentMat,.52,.34,-2.06));
  if(selected(a,'antenna').includes('requin')){const ant=box(.16,.08,.24,secondaryMat,0,1.41,.72);ant.rotation.x=-.2;root.add(ant);}
  root.position.y+=a.stance.rideOffsetM;
  root.scale.set(.94,.94,.94);
  return root;
}

export function updateProxyRuntime(root,vehicle,{speedKph=0,time=0}={}){
  if(!root?.userData?.assembly)return;
  const c=root.userData.assembly.customization;
  const intensity=c.neon.enabled?clamp(c.neon.intensity,0,1):0;
  root.traverse(o=>{if(o.material?.emissive&&o.material.emissiveIntensity>1.4&&c.neon.pulse!=='steady'&&o.material.color?.getHexString?.()===C(c.neon.color).getHexString()){
    const pulse=c.neon.pulse==='beat'?(.55+.45*Math.sin(time*9)):c.neon.pulse==='chase'?(.5+.5*Math.sin(time*13+root.position.z*.2)):(.75+.25*Math.sin(time*4));o.material.emissiveIntensity=(1.3+3*intensity)*pulse;
  }});
  root.rotation.x=THREE.MathUtils.lerp(root.rotation.x,-Math.min(.018,speedKph/18000),.08);
}
