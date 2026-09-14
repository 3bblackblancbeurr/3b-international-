import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {resolveVehicleAssembly} from './vehiclePlatform.js';

const C=v=>new THREE.Color(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mat(color,{metalness=.15,roughness=.45,clearcoat=0,clearcoatRoughness=.12,emissive=null,emissiveIntensity=0,transparent=false,opacity=1,iridescence=0,transmission=0}={}){return new THREE.MeshPhysicalMaterial({color:C(color),metalness,roughness,clearcoat,clearcoatRoughness,emissive:emissive?C(emissive):C('#000000'),emissiveIntensity,transparent,opacity,iridescence,iridescenceIOR:1.3,transmission,ior:1.48});}
function rounded(w,h,d,material,x=0,y=0,z=0,r=.08){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,Math.min(r,Math.min(w,h,d)*.22)),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function cyl(r,w,material,x,y,z,camber=0,segments=32){const g=new THREE.CylinderGeometry(r,r,w,segments);g.rotateZ(Math.PI/2);const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.rotation.z+=camber;m.castShadow=true;return m;}
function selected(a,slot){return a.parts.find(p=>p.slotId===slot)?.optionId||'';}
function contains(a,slot,word){return selected(a,slot).includes(word);}
function finishMaterial(a,color){const id=selected(a,'finish');if(id.includes('mat'))return mat(color,{metalness:.48,roughness:.56,clearcoat:.08});if(id.includes('satin'))return mat(color,{metalness:.58,roughness:.34,clearcoat:.32});if(id.includes('chrome'))return mat(color,{metalness:.97,roughness:.07,clearcoat:.82,clearcoatRoughness:.025});if(id.includes('iridescent'))return mat(color,{metalness:.66,roughness:.15,clearcoat:1,clearcoatRoughness:.04,iridescence:.9});if(id.includes('candy'))return mat(color,{metalness:.62,roughness:.13,clearcoat:1,clearcoatRoughness:.035});if(id.includes('nacre'))return mat(color,{metalness:.52,roughness:.16,clearcoat:.98,clearcoatRoughness:.045,iridescence:.25});return mat(color,{metalness:.76,roughness:.19,clearcoat:1,clearcoatRoughness:.045});}
function addContactShadow(root){const data=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const dx=(x-31.5)/31.5,dy=(y-31.5)/31.5,d=Math.min(1,Math.sqrt(dx*dx+dy*dy));const a=Math.round(105*Math.pow(1-d,2.4));const i=(y*64+x)*4;data[i]=0;data[i+1]=0;data[i+2]=0;data[i+3]=a;}const tex=new THREE.DataTexture(data,64,64,THREE.RGBAFormat);tex.needsUpdate=true;const m=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.72});const p=new THREE.Mesh(new THREE.PlaneGeometry(2.35,4.9),m);p.rotation.x=-Math.PI/2;p.position.y=.045;p.renderOrder=0;root.add(p);root.userData.contactShadowTexture=tex;}
function addFender(root,material,x,z){const f=rounded(.52,.28,.96,material,x,.59,z,.11);f.rotation.x=z<0?-.03:.03;root.add(f);}

export function createModularVehicleProxy(vehicle,{ai=false,accentOverride=null}={}){
  const a=resolveVehicleAssembly(vehicle),c=a.customization,root=new THREE.Group();root.name='U3B_ModularVehicleProxy';root.userData={platformId:a.platformId,platformVersion:a.platformVersion,assembly:a,wheels:[],lightMaterials:[],neonMaterials:[]};
  const primary=ai?'#11141a':c.colors.primary,secondary=ai?'#08090c':c.colors.secondary,accent=accentOverride||(ai?'#e24444':c.colors.accent);
  const bodyMat=finishMaterial(a,primary),secondaryMat=mat(secondary,{metalness:.56,roughness:.27,clearcoat:.58}),accentMat=mat(accent,{metalness:.7,roughness:.22,clearcoat:.7});
  const dark=mat('#030406',{metalness:.42,roughness:.48}),glass=mat('#0d1622',{metalness:.08,roughness:.08,clearcoat:1,clearcoatRoughness:.025,transparent:true,opacity:.72,transmission:.12}),carbon=mat('#06080b',{metalness:.34,roughness:.30,clearcoat:.42}),interior=mat(c.colors.interior,{roughness:.60}),screen=mat('#07111d',{roughness:.13,emissive:'#2f75ff',emissiveIntensity:.8});
  const lightFront=mat(c.colors.light,{roughness:.10,emissive:c.colors.light,emissiveIntensity:5.1}),lightRear=mat('#ff1435',{roughness:.10,emissive:'#ff1435',emissiveIntensity:4.8});root.userData.lightMaterials.push(lightFront,lightRear);
  addContactShadow(root);

  // Low, continuous silhouette instead of stacked cubes.
  root.add(rounded(1.90,.38,3.92,dark,0,.34,0,.13));
  const lower=rounded(1.92,.42,3.62,bodyMat,0,.55,0,.17);root.add(lower);
  const nose=rounded(1.82,.31,1.25,bodyMat,0,.74,-1.48,.14);nose.rotation.x=-.045;root.add(nose);
  const rearDeck=rounded(1.80,.30,1.18,bodyMat,0,.75,1.42,.13);rearDeck.rotation.x=.035;root.add(rearDeck);
  const shoulder=rounded(1.76,.24,2.10,secondaryMat,0,.79,.08,.12);root.add(shoulder);
  addFender(root,bodyMat,-.77,-1.25);addFender(root,bodyMat,.77,-1.25);addFender(root,bodyMat,-.77,1.20);addFender(root,bodyMat,.77,1.20);

  const windshield=rounded(1.42,.44,.78,glass,0,1.01,-.43,.12);windshield.rotation.x=-.18;root.add(windshield);
  const rearGlass=rounded(1.40,.40,.66,glass,0,1.03,.55,.12);rearGlass.rotation.x=.16;root.add(rearGlass);
  const roof=rounded(1.35,.12,.98,contains(a,'roof','carbone')?carbon:bodyMat,0,1.28,.08,.08);root.add(roof);
  const hood=rounded(1.62,.10,1.12,contains(a,'hood','carbone')?carbon:bodyMat,0,.91,-1.27,.07);hood.rotation.x=-.04;root.add(hood);

  // Front/rear aerodynamic furniture.
  const splitter=rounded(1.74,.07,.34,dark,0,.29,-2.00,.035);splitter.rotation.x=-.04;root.add(splitter);
  const diffuser=rounded(1.66,.08,.38,dark,0,.28,1.99,.035);diffuser.rotation.x=.04;root.add(diffuser);
  for(const x of [-.76,.76]){const intake=rounded(.30,.20,.16,dark,x,.53,-1.92,.04);root.add(intake);}
  for(const x of [-.52,.52]){const vent=rounded(.26,.035,.42,carbon,x,.93,-1.27,.03);root.add(vent);}
  if(!selected(a,'spoiler').includes('aucun')){const width=contains(a,'spoiler','gt')?1.96:1.58,wing=rounded(width,.055,.30,contains(a,'spoiler','carbone')?carbon:dark,0,1.28,1.74,.035);root.add(wing);for(const x of [-.58,.58]){const mount=rounded(.065,.36,.065,dark,x,1.10,1.69,.02);root.add(mount);}}

  // Cockpit details still modular.
  const seatMat=contains(a,'seatMaterial','carbone')?carbon:interior;for(const x of [-.37,.37]){const base=rounded(.44,.25,.55,seatMat,x,.66,.20,.08);root.add(base);const back=rounded(.42,.62,.18,seatMat,x,.91,.43,.08);back.rotation.x=-.17;root.add(back);if(selected(a,'seats').includes('baquet'))root.add(rounded(.34,.10,.18,accentMat,x,1.12,.42,.04));}
  const dash=rounded(.96,.18,.28,interior,0,.86,-.58,.05);root.add(dash);const steering=new THREE.Mesh(new THREE.TorusGeometry(.19,.035,8,24),dark);steering.position.set(-.42,.90,-.49);steering.rotation.y=Math.PI/2;root.add(steering);if(!selected(a,'headUnit').includes('origine'))root.add(rounded(.42,.22,.035,screen,0,.88,-.72,.025));
  if(!selected(a,'rollCage').includes('aucun')){const cage=new THREE.Mesh(new THREE.TorusGeometry(.55,.035,8,32,Math.PI),accentMat);cage.position.set(0,1.03,.28);cage.rotation.y=Math.PI/2;root.add(cage);}
  if(!selected(a,'subwoofer').includes('aucun')){root.add(rounded(.72,.36,.34,dark,0,.58,1.40,.06));root.add(cyl(.21,.045,accentMat,0,.58,1.22));}

  // More sculpted optical signatures.
  for(const x of [-.56,.56]){const hf=rounded(.48,.105,.055,lightFront,x,.72,-2.005,.04);hf.rotation.y=x<0?-.06:.06;root.add(hf);const tr=rounded(.48,.09,.05,lightRear,x,.74,2.015,.035);tr.rotation.y=x<0?.05:-.05;root.add(tr);}
  root.add(rounded(1.10,.028,.028,lightRear,0,.76,2.045,.012));
  if(contains(a,'drl','halo'))for(const x of [-.56,.56])root.add(cyl(.115,.028,lightFront,x,.74,-2.035));
  if(c.neon.enabled&&!ai){const neon=mat(c.neon.color,{roughness:.15,emissive:c.neon.color,emissiveIntensity:1.7+3.4*c.neon.intensity,transparent:true,opacity:.9});const strip=rounded(1.68,.018,3.35,neon,0,.105,0,.008);strip.castShadow=false;root.userData.neonMaterials.push(neon);root.add(strip);const haloMat=new THREE.MeshBasicMaterial({color:C(c.neon.color),transparent:true,opacity:.13+.22*c.neon.intensity,depthWrite:false,blending:THREE.AdditiveBlending});const halo=new THREE.Mesh(new THREE.CircleGeometry(1.42,36),haloMat);halo.rotation.x=-Math.PI/2;halo.scale.set(1.1,2.35,1);halo.position.y=.072;root.userData.neonMaterials.push(haloMat);root.add(halo);}

  // Wheels: tire sidewalls, metallic rims, discs and calipers.
  const tire=mat('#020304',{roughness:.88}),rim=mat(contains(a,'rimFinish','chrome')?'#e7ebef':contains(a,'rimFinish','or')?'#caa75b':'#555d69',{metalness:.95,roughness:.15,clearcoat:.28}),disc=mat('#9da4ac',{metalness:.96,roughness:.24}),caliper=mat(c.colors.caliper,{metalness:.58,roughness:.24,clearcoat:.32});
  const wr=a.stance.diameterM/2,ww=a.stance.widthM;for(const [id,w] of Object.entries(a.stance.wheels)){const wheel=cyl(wr,ww,tire,w.position[0],w.position[1],w.position[2],w.camberRad,36);wheel.name=`wheel-${id}`;wheel.userData={radius:wr};root.userData.wheels.push(wheel);root.add(wheel);const rimMesh=cyl(wr*.64,ww*1.03,rim,w.position[0],w.position[1],w.position[2],w.camberRad,36);rimMesh.name=`rim-${id}`;root.userData.wheels.push(rimMesh);root.add(rimMesh);root.add(cyl(wr*.43,ww*1.05,disc,w.position[0],w.position[1],w.position[2],w.camberRad,36));const cal=rounded(.12,.25,.09,caliper,w.position[0]+(w.position[0]<0?.02:-.02),w.position[1]+.03,w.position[2],.025);root.add(cal);}
  if(!selected(a,'diffuser').includes('origine'))for(const x of [-.56,0,.56]){const fin=rounded(.035,.23,.40,dark,x,.28,1.95,.012);fin.rotation.x=-.16;root.add(fin);}
  if(!selected(a,'exhaustTips').includes('origine'))for(const x of contains(a,'exhaustTips','quad')?[-.69,-.49,.49,.69]:[-.57,.57]){const tip=cyl(.065,.18,contains(a,'exhaustTips','titane')?accentMat:dark,x,.34,2.08);tip.rotation.y=Math.PI/2;root.add(tip);}
  if(!selected(a,'towHook').includes('aucun'))root.add(cyl(.055,.15,accentMat,.52,.34,-2.06));
  root.position.y+=a.stance.rideOffsetM;root.scale.set(.94,.94,.94);return root;
}

export function updateProxyRuntime(root,vehicle,{speedKph=0,time=0,brake=0,steer=0}={}){if(!root?.userData?.assembly)return;const c=root.userData.assembly.customization,intensity=c.neon.enabled?clamp(c.neon.intensity,0,1):0;for(const m of root.userData.neonMaterials||[]){if('emissiveIntensity'in m&&c.neon.pulse!=='steady'){const pulse=c.neon.pulse==='beat'?(.55+.45*Math.sin(time*9)):c.neon.pulse==='chase'?(.5+.5*Math.sin(time*13+root.position.z*.2)):(.75+.25*Math.sin(time*4));m.emissiveIntensity=(1.35+3.2*intensity)*pulse;}else if('opacity'in m&&c.neon.pulse!=='steady')m.opacity=(.10+.24*intensity)*(.72+.28*Math.sin(time*4.4));}for(const m of root.userData.lightMaterials||[])if(m.emissive?.r>.8&&m.emissive?.g<.4)m.emissiveIntensity=4.2+clamp(brake,0,1)*5;const wheelAngular=(speedKph/3.6)/Math.max(.12,root.userData.wheels?.[0]?.userData?.radius||.34);for(const w of root.userData.wheels||[])w.rotation.x-=wheelAngular*.016;root.rotation.x=THREE.MathUtils.lerp(root.rotation.x,-Math.min(.021,speedKph/15500),.08);root.rotation.z=THREE.MathUtils.lerp(root.rotation.z,-clamp(steer,-1,1)*Math.min(.014,speedKph/16500),.07);}
