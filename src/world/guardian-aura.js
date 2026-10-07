import * as THREE from 'three';
import {COUNTRIES} from './catalog.js';
import {GUARDIAN_MASTER_SPEC} from './realm-master-spec.js';

const colors=Object.fromEntries(COUNTRIES.map(country=>[country.id,country.color]));
// Visual rhythm only: the already-authoritative resonance/gameplay rules stay unchanged.
export const GUARDIAN_AURA_SIGNATURES=Object.freeze({
 france:{petals:3,tempo:.75},algerie:{petals:2,tempo:.62},
 maroc:{petals:5,tempo:.48},tunisie:{petals:4,tempo:1.15},
 espagne:{petals:7,tempo:1.4},italie:{petals:6,tempo:.84},
 turquie:{petals:8,tempo:.55},estonie:{petals:9,tempo:.42},
});
export function createGuardianAura(region,{reducedMotion=false}={}){
 const signature=GUARDIAN_AURA_SIGNATURES[region],profile=GUARDIAN_MASTER_SPEC[region];
 if(!signature||!profile)return null;
 const color=new THREE.Color(colors[region]),gold=new THREE.Color('#e8cb87');
 const group=new THREE.Group();group.name='3B-Guardian-Resonance-'+profile.name;
 // Character models are currently scaled in living.js; keep the ground halo sized
 // independently of that proxy scale. This is NOT a weapon or finished animation.
 group.scale.setScalar(.43);
 const geometry=new THREE.RingGeometry(1.25,1.3,64),innerGeometry=new THREE.RingGeometry(.74,.775,64);
 const materials=[color,gold].map(tint=>new THREE.MeshBasicMaterial({
  color:tint,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide,
  blending:THREE.AdditiveBlending,
 }));
 const rings=[geometry,innerGeometry].map((g,i)=>{
  const ring=new THREE.Mesh(g,materials[i]);ring.rotation.x=-Math.PI/2;
  ring.position.y=.08+i*.018;ring.renderOrder=6+i;group.add(ring);return ring;
 });
 const raysGeo=new THREE.BufferGeometry(),positions=new Float32Array(signature.petals*3*2);
 for(let i=0;i<signature.petals;i++){
  const angle=i*2*Math.PI/signature.petals,point=i*6;
  positions[point]=Math.sin(angle)*.88;positions[point+1]=.075;positions[point+2]=Math.cos(angle)*.88;
  positions[point+3]=Math.sin(angle)*1.55;positions[point+4]=.075;positions[point+5]=Math.cos(angle)*1.55;
 }
 raysGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const rayMaterial=new THREE.LineBasicMaterial({color,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending});
 const rays=new THREE.LineSegments(raysGeo,rayMaterial);rays.renderOrder=8;group.add(rays);
 let disposed=false;
 function tick(time,{visible=true}={}){
  if(disposed)return;
  group.visible=visible;
  const p=Number.isFinite(time)?time:0;
  const wave=reducedMotion?.5:.5+.5*Math.sin(p*signature.tempo*2);
  rings[0].scale.setScalar(reducedMotion?1:.93+wave*.12);
  rings[1].scale.setScalar(reducedMotion?1:1.11-wave*.13);
  materials[0].opacity=reducedMotion?.15:.12+.2*wave;
  materials[1].opacity=reducedMotion?.15:.1+.16*(1-wave);
  rays.rotation.y=reducedMotion?0:p*signature.tempo*.25;
  rayMaterial.opacity=reducedMotion?.1:.1+.18*wave;
 }
 return{group,signature,tick,
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometry.dispose();innerGeometry.dispose();raysGeo.dispose();materials.forEach(m=>m.dispose());rayMaterial.dispose();}
 };
}
