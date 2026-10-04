import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {craftedBladeGeometry} from './weapon-blade.js';
import {getWeapon} from './arsenal.js';

/** Continuous recurve branches, with the grip at the equipped hand origin. */
export function craftedBowLimbGeometry(z=0,radius=.027,radialSegments=6,surfaceOffset=0){
 const points=[[.34,-.5],[.24,-.43],[.06,-.27],[0,0],[.06,.28],[.24,.45],[.34,.5]].map(([x,y])=>new T.Vector3(x,y,z));
 const curve=new T.CatmullRomCurve3(points,false,'centripetal'),segments=36,geometry=new T.TubeGeometry(curve,segments,radius,radialSegments,false),p=geometry.attributes.position;
 // Wide load-bearing centre, flexible tapered tips. Retain a smooth profile
 // along the whole branch instead of discrete cylinders meeting at corners.
 const centre=new T.Vector3();for(let i=0;i<=segments;i++){curve.getPointAt(i/segments,centre);const taper=.56+.44*Math.sin(i/segments*Math.PI);for(let j=0;j<=radialSegments;j++){const v=i*(radialSegments+1)+j;p.setXYZ(v,centre.x+(p.getX(v)-centre.x)*taper,centre.y+(p.getY(v)-centre.y)*taper,centre.z+(p.getZ(v)-centre.z)*taper+surfaceOffset*taper);}}
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.bowEndpoints=[points[0].toArray(),points.at(-1).toArray()];return geometry;
}

/** The same physical assembly is used in the traveller's hand and the armory.
 * Static fittings are merged by material; only articulated parts stay separate. */
export function fitWeapon(model,avatar={}){
 const w=getWeapon(avatar.weapon),tier=T.MathUtils.clamp(Number.isInteger(avatar.weaponForm)?avatar.weaponForm:0,0,3),root=new T.Group(),ownedGeo=new Set(),ownedMat=new Set(),staticPieces=[],splitBlades=[],orbiters=[];
 const material=options=>{const m=new T.MeshPhysicalMaterial(options);ownedMat.add(m);return m;};
 const steel=material({color:'#b5c5d0',metalness:.92,roughness:.26,clearcoat:.25,clearcoatRoughness:.22});
 const gold=material({color:'#bf9953',metalness:.86,roughness:.3});
 const dark=material({color:'#13212b',metalness:.58,roughness:.4});
 const leather=material({color:'#30252a',metalness:0,roughness:.88});
 const light=material({color:w.color,emissive:w.color,emissiveIntensity:.22+tier*.06,metalness:.42,roughness:.25});
 function mesh(geometry,m,x=0,y=0,z=0,{dynamic=false,part=null}={}){
  // Authored blades have no texture UVs; supply them before material batching,
  // so they can be merged with bevelled fittings without losing the steel.
  if(!geometry.attributes.uv){const p=geometry.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)*6+.5;uv[i*2+1]=p.getY(i);}geometry.setAttribute('uv',new T.BufferAttribute(uv,2));}
  ownedGeo.add(geometry);const o=new T.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(part)o.userData.weaponPart=part;root.add(o);if(!dynamic)staticPieces.push(o);return o;
 }
 function rod(x,y,z,xx,yy,zz,r=.012,m=gold){const a=new T.Vector3(x,y,z),b=new T.Vector3(xx,yy,zz),delta=b.clone().sub(a);if(delta.length()<1e-7)return;const o=mesh(new T.CylinderGeometry(r,r,delta.length(),8),m);o.position.copy(a.add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 function ring(radius,tube,m,x=0,y=0,z=0,plane='front',{dynamic=false}={}){const o=mesh(new T.TorusGeometry(radius,tube,5,32),m,x,y,z,{dynamic});if(plane==='grip')o.rotation.x=Math.PI/2;return o;}
 function panel(points,m,x=0,y=0,z=0,depth=.025,bevel=.008){
  const shape=new T.Shape();points.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel*.65,bevelSegments:1,curveSegments:8});geometry.translate(0,0,-depth/2);return mesh(geometry,m,x,y,z);
 }
 function blade(x=0,y=.25,length=.7,width=1,angle=0,dynamic=false){const o=mesh(craftedBladeGeometry(length),steel,x,y+length/2,0,{dynamic,part:'blade'});o.scale.x=width;o.rotation.z=angle;return o;}
 function grip(y=-.02,length=.3,r=.027){rod(0,y-length/2,0,0,y+length/2,0,r,leather);for(let i=0;i<8;i++)ring(r+.003,.0035,gold,0,y-length*.42+i*length*.12,0,'grip');for(const side of [-1,1])ring(r+.006,.006,gold,0,y+side*length*.5,0,'grip');mesh(new T.IcosahedronGeometry(r*1.65,1),gold,0,y-length*.5-.035);}
 function guard(y=.2,width=.18){panel([[-width,.035],[-width-.025,.065],[-width-.035,.03],[-width+.015,-.023],[width-.015,-.023],[width+.035,.03],[width+.025,.065],[width,.035]],gold,0,y,0,.04);mesh(new T.IcosahedronGeometry(.034,1),light,0,y,.04);}
 function engraving(y=.35,length=.48,x=0,z=.017){
  rod(x,y,z,x,y+length,z,.0028,gold);
  for(let i=0;i<4+tier;i++){const at=y+.045+i*length/(5+tier);rod(x-.024,at+.02,z,x,at,z,.0024,gold);rod(x,at,z,x+.024,at+.02,z,.0024,gold);}
 }
 function cuff(y=.07,r=.1,length=.22){const o=mesh(new T.CylinderGeometry(r,r*.84,length,12,1,true),dark,0,y);o.rotation.x=Math.PI/2;for(const zz of [-length/2,length/2])ring(r,.009,gold,0,y,zz);for(const side of [-1,1])panel([[-.025,-.06],[.025,-.06],[.035,.06],[-.035,.06]],gold,side*r*.92,y,.06,.025);}
 function crescent(radius=.28,x=0,y=.34,rotation=0){
  const points=[];for(let i=0;i<=24;i++){const a=-.3+i/24*Math.PI*1.62;points.push([Math.cos(a)*radius,Math.sin(a)*radius]);}for(let i=24;i>=0;i--){const a=-.3+i/24*Math.PI*1.62;const r=radius-.035-.025*Math.sin(i/24*Math.PI);points.push([Math.cos(a)*r,Math.sin(a)*r]);}
  const o=panel(points,steel,x,y,0,.023,.004);o.rotation.z=rotation;return o;
 }
 function bow(double=false){
  const wood=material({color:'#50382b',metalness:.04,roughness:.66,clearcoat:.14});wood.name='laminated-bow-wood';
  grip(0,.24,.032);
  const limbs=(z=0)=>{
   mesh(craftedBowLimbGeometry(z),wood);mesh(craftedBowLimbGeometry(z,.005,4,.024),gold);
   rod(.34,-.5,z+.042,.34,.5,z+.042,.0028,light);
   for(const side of [-1,1]){mesh(new T.SphereGeometry(.02,8,6),gold,.34,side*.5,z);rod(.34,side*.5,z,.305,side*.48,z,.01,gold);rod(.34,side*.5,z,.34,side*.5,z+.042,.006,gold);}
  };
  limbs();if(double)limbs(-.075);
  // The nock crosses the string at mid-height; the shaft passes over the grip.
  rod(-.01,0,.042,.74,0,.042,.006,steel);panel([[.0,-.019],[.095,0],[.0,.019],[.018,0]],steel,.72,0,.042,.012,.002);
  for(const side of [-1,1])panel([[-.055,0],[0,.06],[.055,0],[0,-.025]],gold,.035,side*.26,.031,.012,.003);
  if(double)for(const y of [-.09,.09])rod(0,y,0,0,y,-.075,.013,gold);
 }
 // Signature transformations change the physical silhouette, not only the tint.
 if(w.kind==='Bouclier'){
  const r=.32+tier*.028;
  if(tier===0){const points=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return [Math.sin(a)*r,Math.cos(a)*r];});panel(points,dark,0,.3,0,.055,.012);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4,spacing=tier===0?0:.02+tier*.009;const o=panel([[-.105,.08],[0,r+spacing],[.105,.08],[0,.025]],i%2?steel:gold,0,.3,.015,.032,.008);o.rotation.z=a;mesh(new T.IcosahedronGeometry(.018,0),light,Math.sin(-a)*r*.7,.3+Math.cos(a)*r*.7,.06);}
  mesh(new T.SphereGeometry(.075,12,8),gold,0,.3,.065).scale.z=.45;ring(.063,.006,light,0,.3,.098);rod(-.07,.26,-.085,.07,.26,-.085,.022,leather);
 }else if(w.kind==='Éventail'){
  grip(-.005,.2,.024);const count=tier===0?1:7,spread=tier===0?0:.9+tier*.07;
  for(let i=0;i<count;i++){const a=count===1?0:(i/(count-1)-.5)*spread*2;const o=panel([[-.012,0],[-.045,.42],[0,.6],[.045,.42],[.012,0]],i%2?gold:steel,0,.08,0,.016,.004);o.rotation.z=a;rod(0,.08,.025,-Math.sin(a)*.46,.08+Math.cos(a)*.46,.025,.006,light);}
  mesh(new T.CylinderGeometry(.038,.038,.065,12),gold,0,.08).rotation.x=Math.PI/2;
 }else if(w.kind==='Arc'||w.id==='romano'&&tier>0){bow(tier>=2);}
 else if(w.kind==='Griffes'||w.kind==='Gantelet'){
  cuff();const count=w.kind==='Griffes'?3:tier>=2?2:1;
  for(let i=0;i<count;i++)blade((i-(count-1)/2)*.073,.13,tier===0?.37:.47,.43,-(i-(count-1)/2)*.1);
  for(let i=0;i<3;i++)panel([[-.019,-.025],[.019,-.025],[.023,.025],[-.023,.025]],gold,(i-1)*.067,.13,.1,.025,.005);
 }else if(w.kind==='Ailes'){
  cuff(.04,.07,.15);for(let i=0;i<6+tier;i++){const a=-(i/(5+tier))*.95,o=panel([[-.013,0],[-.034,.32],[.025,.52],[.046,.28],[.02,.08]],i%2?steel:light,i*.016,.03+i*.01,0,.017,.004);o.rotation.z=a;}
 }else if(w.kind==='Fil'){
  grip(.04,.22,.026);ring(.073,.018,gold,0,.23);for(let i=0;i<3+tier;i++){const o=ring(.25+i*.028,.0035,light,0,.44+i*.025);o.scale.x=1+i*.07;o.rotation.z=i*.31;}
 }else if(w.kind==='Doubles lames'){
  grip(.035,.21,.025);
  if(tier===0){crescent(.27,-.16,.32,.4);crescent(.27,.16,.32,Math.PI+.4);}else{for(let i=0;i<(tier>=2?2:1);i++){crescent(.33,0,.35,i*Math.PI);if(i)root.children.at(-1).position.z=-.055;}ring(.29,.008,light,0,.35,.035);}
 }else if(w.kind==='Ciseaux'){
  for(let i=0;i<2;i++){const side=i?1:-1,o=blade(side*(tier? .09:.04),.15,.65,.72,side*.225,true);splitBlades.push({object:o,base:o.position.clone(),rotation:o.rotation.clone(),side});ring(.075,.015,gold,side*.061,.035);rod(side*.055,.07,0,side*.03,.21,0,.017,leather);}
  mesh(new T.CylinderGeometry(.028,.028,.08,12),gold,0,.18).rotation.x=Math.PI/2;
 }else if(w.kind==='Hache'){
  rod(0,-.24,0,0,.78,0,.027,dark);grip(-.06,.3,.031);
  panel([[-.07,.16],[.11,.18],[.32,.1],[.37,-.08],[.27,-.17],[.11,-.13],[-.07,-.09]],steel,0,.62,0,.05,.008);
  panel([[0,.12],[.1,.13],[.13,-.09],[0,-.09]],gold,0,.62,.031,.012,.003);engraving(.54,.14,.06,.041);
  if(tier>0)panel([[.01,.15],[-.16,.18],[-.3,.05],[-.28,-.12],[-.15,-.16],[.01,-.08]],steel,0,.62,0,.05,.008);
 }else if(w.id==='paris'&&tier>0){
  grip(-.28,.24,.03);rod(0,-.42,0,0,.78,0,.012,dark);
  for(let i=0;i<4;i++){const x=(i%2?1:-1)*.115,y=-.3+i*.31;rod(x,y,0,x,y+.18,0,.016);const tip=blade(x,y+.16,.18,.65,0,tier>1);if(tier>1)orbiters.push({object:tip,base:tip.position.clone(),phase:i*Math.PI/2});}
 }else if(w.kind==='Lance'){
  rod(0,-.59,0,0,.97,0,.02,dark);grip(-.02,.28,.026);blade(0,.85,.32,.8);guard(.86,.07);
  for(const y of [-.49,.35,.64])ring(.026,.006,gold,0,y,0,'grip');
  if(w.id==='paris')for(let i=0;i<6;i++){rod(-.048,-.46+i*.2,0,.048,-.26+i*.2,0,.005,gold);rod(.048,-.46+i*.2,0,-.048,-.26+i*.2,0,.005,gold);}
  if(w.id==='carthage'&&tier>0){for(const side of [-1,1]){rod(0,.68,0,side*.13,.75,0,.019);blade(side*.13,.75,.3,.64);}}
 }else{
  grip(-.015,.3,.027);guard(.2,w.id==='romano'?.23:.17);
  if(w.kind==='Sabre'){
   panel([[-.042,0],[-.044,.4],[-.018,.58],[.065,.74],[.095,.76],[.053,.54],[.052,.32],[.042,0]],steel,0,.25,0,.027,.004);
   rod(.15,.2,0,.15,-.09,0,.009,gold);rod(.15,-.09,0,.025,-.16,0,.009,gold);engraving(.33,.29,0,.021);
  }else if(w.id==='tallinn'){
   cuff(.025,.068,.12);panel([[-.04,0],[-.04,.48],[.0,.7],[.05,.53],[.055,.15],[.03,0]],steel,0,.25,0,.027,.004);engraving(.34,.4,0,.021);if(tier>=2)blade(-.125,.27,.57,.55,-.08);
  }else{blade(0,.25,.7);engraving();}
 }
 // Tier fittings provide visible progression on all sixteen weapons without
 // changing the collision reach, damage, XP gates or existing combat timings.
 if(tier>=1){ring(.041,.007,light,0,.16,0,'grip');for(const side of [-1,1])mesh(new T.IcosahedronGeometry(.025,0),light,side*.07,.2,.04);}
 if(tier>=2){const halo=ring(tier===3?.32:.22,.0065,light,0,.36,0,'grip',{dynamic:true});orbiters.push({object:halo,base:halo.position.clone(),ring:true});}
 if(tier===3){for(let i=0;i<6;i++){const a=i*Math.PI/3;panel([[-.013,0],[0,.075],[.013,0],[0,-.025]],gold,Math.sin(a)*.31,.36+Math.cos(a)*.31,.02,.012,.002);}}
 // One mesh per static material replaces the original dozens of fitting draws.
 const batches=new Map();for(const o of staticPieces){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);o.removeFromParent();}
 for(const [m,parts] of batches){const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)continue;ownedGeo.add(geometry);const o=new T.Mesh(geometry,m);o.castShadow=o.receiveShadow=true;o.name='weapon-assembly-'+(['steel','bronze','dark','leather','inlay'][[steel,gold,dark,leather,light].indexOf(m)]||m.name||'fitting');root.add(o);}
 // Source fittings no longer need their temporary geometry after the merge.
 for(const o of staticPieces){ownedGeo.delete(o.geometry);o.geometry.dispose();}
 model.updateMatrixWorld(true);const hand=model.getObjectByName('hand_r');
 if(hand){const p=hand.getWorldPosition(new T.Vector3());model.worldToLocal(p);root.position.copy(p);model.add(root);hand.attach(root);}else{root.position.set(.4,.85,0);model.add(root);}
 root.rotateZ(-Math.PI/2);root.name='3B-equipped-'+w.id;root.userData.weaponForm=tier;root.userData.weaponId=w.id;
 const destination=new T.Vector3();let separation=0,lastTime=0,disposed=false;
 return {object:root,update(time,combat={},options={}){if(disposed)return;const dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;separation+=(Number(combat.detached>0)-separation)*(1-Math.exp(-dt*14));model.updateWorldMatrix(true,true);for(const b of splitBlades){destination.set(b.side*.55,1.15,1.6+(options.reducedMotion?0:Math.sin(time*7+b.side)*.3));model.localToWorld(destination);root.worldToLocal(destination);b.object.position.copy(b.base).lerp(destination,separation);b.object.rotation.copy(b.rotation);if(!options.reducedMotion)b.object.rotation.y+=separation*time*9;}for(const o of orbiters){if(o.ring){o.object.rotation.y=options.reducedMotion?0:time*.5;continue;}if(options.reducedMotion){o.object.position.copy(o.base);continue;}o.object.position.x=o.base.x+Math.cos(time+o.phase)*.045;o.object.position.z=o.base.z+Math.sin(time+o.phase)*.06;}},dispose(){if(disposed)return;disposed=true;root.removeFromParent();ownedGeo.forEach(g=>g.dispose());ownedMat.forEach(m=>m.dispose());root.clear();}};
}
