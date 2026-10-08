import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {hoodGeometry,hoodHemGeometry} from './hood.js';

/** Rigid armour parts share the human skeleton and are batched into four
 * skinned draws. There is no per-stud/plate draw and no second skeleton. */
export function fitGuardianAppearance(model,identity,{reducedMotion=false}={}){
 model.updateWorldMatrix(true,true);
 let source;model.traverse(o=>{if(!source&&o.isSkinnedMesh)source=o;});
 if(!source)return null;
 const originalMeshes=[];model.traverse(o=>{if(o.isMesh)originalMeshes.push({object:o,visible:o.visible});});
 const skeleton=source.skeleton,materials=[],geometry=[],meshes=[],batches=new Map(),lowBatches=new Map(),lowMeshes=[],owned=new T.Group(),lowObject=new T.Group();owned.name=identity.name+' · armure';lowObject.name=identity.name+' · silhouette distante';lowObject.visible=false;model.add(owned,lowObject);
 const material=(name,color,metalness=.65,roughness=.36)=>{const m=new T.MeshStandardMaterial({name,color,metalness,roughness});materials.push(m);return m;};
 const plate=material('guardian-plate',identity.plate,.78,.34),gold=material('guardian-gold',identity.trim,.73,.33),cloth=material('guardian-collar',identity.cape,0,.85),hair=material('guardian-hair',identity.hairColor,0,.9);
 const spot=name=>{const bone=model.getObjectByName(name);return bone?model.worldToLocal(bone.getWorldPosition(new T.Vector3())):new T.Vector3();};
 const head=spot('Head'),chest=spot('spine_03'),waist=spot('pelvis');
 function add(g,mat,boneName,p,scale=[1,1,1],rotation=[0,0,0],target=batches){
  const bone=skeleton.bones.findIndex(b=>b.name===boneName);if(bone<0){g.dispose();return;}
  g.applyMatrix4(new T.Matrix4().compose(p,new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale)));
  // The shipped glTF is imported in its first animation pose, which differs
  // from the bind matrices stored by the exporter. Author against that actual
  // anatomy, then undo its skin transform before batching into the shared rig.
  // Otherwise the new plates receive the bone translation twice on screen.
  const correction=new T.Matrix4().multiplyMatrices(skeleton.bones[bone].matrixWorld,skeleton.boneInverses[bone]).invert().multiply(model.matrixWorld);
  g.applyMatrix4(correction);
  if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
  const indices=new Uint16Array(g.attributes.position.count*4),weights=new Float32Array(indices.length);for(let i=0;i<g.attributes.position.count;i++){indices[i*4]=bone;weights[i*4]=1;}
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  if(!target.has(mat))target.set(mat,[]);target.get(mat).push(g);geometry.push(g);return g;
 }
 const at=(p,x=0,y=0,z=0)=>p.clone().add(new T.Vector3(x,y,z));
 function line(points,r,mat,boneName='spine_03'){
  if(points.length===2){const a=points[0],b=points[1],delta=b.clone().sub(a),g=new T.CylinderGeometry(r,r,delta.length(),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));return add(g,mat,boneName,a.clone().add(b).multiplyScalar(.5));}
  return add(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(8,points.length*5),r,5,false),mat,boneName,new T.Vector3());
 }
 const breastplate=new T.SphereGeometry(1,24,14,0,Math.PI,.35,Math.PI-.62),positions=breastplate.attributes.position;
 for(let i=0;i<positions.count;i++){const y=positions.getY(i);positions.setX(i,positions.getX(i)*(1-.18*Math.max(0,-y)));}breastplate.computeVertexNormals();
 add(breastplate,plate,'spine_03',at(chest,0,-.035,.07),[.21,.255,.12]);
 const platePoint=(x,y)=>at(chest,x,y,.081+.12*Math.sqrt(Math.max(0,1-(x/.21)**2-((y+.035)/.255)**2)));
 // Curved gilt borders, central heraldry and asymmetric layered shoulders.
 for(const side of [-1,1]){
  line([platePoint(side*.105,-.22),platePoint(side*.195,-.055),platePoint(side*.14,.12)],.0055,gold);
  line([platePoint(side*.03,-.22),platePoint(side*.055,-.07),platePoint(side*.12,.06)],.0035,gold);
  const suffix=side<0?'r':'l',shoulder=spot('upperarm_'+suffix),forearm=spot('lowerarm_'+suffix),shin=spot('calf_'+suffix);
  for(let layer=0;layer<3;layer++){
   add(new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*.65),layer===1?gold:plate,'upperarm_'+suffix,at(shoulder,side*(.03+layer*.03),-.013-layer*.035,0),[.15-layer*.016,.088,.15-layer*.007]);
  }
  add(new T.CylinderGeometry(.073,.061,.165,10,1,true),plate,'lowerarm_'+suffix,at(forearm,side*.135,0,0),[1,1,1],[0,0,Math.PI/2]);
  for(const offset of [.06,.2])add(new T.TorusGeometry(.07,.009,4,16),gold,'lowerarm_'+suffix,at(forearm,side*offset,0,0),[1,1,1],[0,Math.PI/2,0]);
  add(new T.SphereGeometry(1,10,6),plate,'calf_'+suffix,at(shin,0,-.17,.072),[.064,.18,.035]);
  for(const y of [-.045,-.3])add(new T.TorusGeometry(.058,.006,4,16),gold,'calf_'+suffix,at(shin,0,y,.008),[1,1,1],[Math.PI/2,0,0]);
  // Tassets articulate with the upper leg, leaving a knee and stride gap.
  const thigh=spot('thigh_'+suffix);for(let j=0;j<3;j++){
   const shape=new T.Shape();shape.moveTo(-.069,.025);shape.lineTo(.069,.025);shape.lineTo(.053,-.035);shape.lineTo(0,-.045);shape.lineTo(-.053,-.035);shape.closePath();
   add(new T.ExtrudeGeometry(shape,{depth:.013,bevelEnabled:true,bevelSegments:1,bevelSize:.004,bevelThickness:.003}),j===1?gold:plate,'thigh_'+suffix,at(thigh,0,-.045-j*.062,.11),[1,1,1],[0,0,side*.08]);
  }
 }
 add(new T.TorusGeometry(.19,.018,5,24),gold,'pelvis',at(waist,0,.075,.01),[1,.8,1],[Math.PI/2,0,0]);
 add(new T.OctahedronGeometry(.035),gold,'pelvis',at(waist,0,.075,.173),[1,1,.45]);
 // Eight emblem medallions: same economical metal batch, unique line work.
 const emblem=platePoint(0,.005);add(new T.CylinderGeometry(.05,.05,.014,16),gold,'spine_03',emblem,[1,1,1],[Math.PI/2,0,0]);
 const strokes={
  fleur:[[-.032,-.012,0,0],[0,0,.031,-.012],[0,-.025,0,.033],[-.025,.012,0,.004],[0,.004,.025,.012]],
  rayon:Array.from({length:8},(_,i)=>[Math.sin(i*Math.PI/4)*.016,Math.cos(i*Math.PI/4)*.016,Math.sin(i*Math.PI/4)*.038,Math.cos(i*Math.PI/4)*.038]),
  flocon:[[-.034,0,.034,0],[0,-.034,0,.034],[-.026,-.026,.026,.026],[-.026,.026,.026,-.026]],
  arbre:[[0,-.034,0,.034],[-.029,.006,0,.032],[0,.032,.029,.006],[-.024,-.006,0,.018],[0,.018,.024,-.006]],
  etoile:Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5,b=(i+2)*Math.PI*2/5;return [Math.sin(a)*.035,Math.cos(a)*.035,Math.sin(b)*.035,Math.cos(b)*.035];}),
  croissant:[[-.023,-.026,-.035,0],[-.035,0,-.024,.027],[-.024,.027,.001,.034],[-.023,-.026,.001,-.033]],
  cornes:[[-.03,.028,-.022,-.008],[-.022,-.008,0,-.028],[0,-.028,.022,-.008],[.022,-.008,.03,.028]],
 }[identity.ornament];
 for(const [x,y,xx,yy] of strokes)line([at(emblem,x,y,.013),at(emblem,xx,yy,.013)],.0028,plate);
 if(identity.crown){
  const points=[];for(let i=0;i<=20;i++){const a=-1.1+i/20*2.2;points.push(at(head,Math.sin(a)*.125,.205+Math.cos(a)*.015,Math.cos(a)*.125));}line(points,.008,gold,'Head');
  for(let i=-2;i<=2;i++){const x=i*.037;add(new T.OctahedronGeometry(.027),gold,'Head',at(head,x,.235+(2-Math.abs(i))*.012,.126-Math.abs(i)*.012),[.38,1,.3]);}
 }
 if(identity.hood){add(hoodGeometry(),cloth,'Head',at(head,0,.035,.004),[.77,.78,.77]);add(hoodHemGeometry(),gold,'Head',at(head,0,.035,.004),[.78,.79,.78]);add(new T.SphereGeometry(1,12,6,0,Math.PI,0,Math.PI*.6),hair,'Head',at(head,0,.175,.006),[.095,.065,.102]);for(const side of [-1,1])line([at(head,side*.025,.216,.085),at(head,side*.055,.184,.103),at(head,side*.07,.146,.099)],.008,hair,'Head');}
 if(identity.fur){
  const collar=at(chest,0,.095,-.025);for(let i=0;i<18;i++){const a=i*Math.PI*2/18;add(new T.SphereGeometry(.055,7,5),hair,'spine_03',at(collar,Math.sin(a)*.16,Math.cos(a)*.018,Math.cos(a)*.13),[1,.7,1]);}
 }
 if(identity.longHair||identity.card==='C165'){
  for(const side of [-1,1])for(let strand=0;strand<6;strand++)line([at(head,side*(.075+strand*.008),.15,-.032-strand*.009),at(head,side*(.13+strand*.007),-.045,-.06-strand*.01),at(head,side*(.15+strand*.006),-.23,-.095-strand*.01),at(head,side*(.13+strand*.008),-.37,-.13-strand*.008)],.008,hair,'Head');
 }
 if(!identity.body){
  for(let i=0;i<12;i++){const angle=i*Math.PI*2/12,x=Math.sin(angle)*.071,z=Math.cos(angle)*.075;line([at(head,x,.212,z),at(head,x*1.08,.193,z*1.14),at(head,x*1.18,.177,z*1.19)],.011,hair,'Head');}
 }
 if(identity.beard){
  const shape=new T.Shape();[[-.075,.015],[-.043,-.044],[0,-.055],[.043,-.044],[.075,.015],[.056,.025],[0,.003],[-.056,.025]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  add(new T.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1}),hair,'Head',at(head,0,-.013,.091));
 }
 const lowSkin=material('guardian-lod-skin',identity.skinColor,0,.86);
 const low=(g,mat,boneName,p,scale=[1,1,1],rotation=[0,0,0])=>add(g,mat,boneName,p,scale,rotation,lowBatches);
 low(new T.SphereGeometry(1,10,7),lowSkin,'Head',at(head,0,.11,.005),[.088,.131,.081]);
 low(new T.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI*.55),hair,'Head',at(head,0,.155,-.012),[.094,.092,.088]);
 low(new T.SphereGeometry(1,10,7),plate,'spine_03',at(chest,0,-.12,.02),[.18,.24,.106]);
 low(new T.SphereGeometry(1,8,5),cloth,'pelvis',at(waist,0,.035,0),[.165,.14,.105]);
 for(const side of [-1,1]){
  const suffix=side<0?'r':'l',shoulder=spot('upperarm_'+suffix),forearm=spot('lowerarm_'+suffix),thigh=spot('thigh_'+suffix),shin=spot('calf_'+suffix),foot=spot('foot_'+suffix);
  low(new T.CapsuleGeometry(.05,.16,2,6),plate,'upperarm_'+suffix,at(shoulder,side*.1,0,0),[1,1,1],[0,0,Math.PI/2]);
  low(new T.CapsuleGeometry(.039,.16,2,6),cloth,'lowerarm_'+suffix,at(forearm,side*.11,0,0),[1,1,1],[0,0,Math.PI/2]);
  low(new T.CapsuleGeometry(.064,.27,2,6),cloth,'thigh_'+suffix,at(thigh,0,-.185,0));
  low(new T.CapsuleGeometry(.043,.34,2,6),plate,'calf_'+suffix,at(shin,0,-.21,0));
  low(new T.SphereGeometry(1,8,5),cloth,'foot_'+suffix,at(foot,0,-.016,.045),[.055,.04,.1]);
 }
 for(const [groups,parent,collection] of [[batches,owned,meshes],[lowBatches,lowObject,lowMeshes]])for(const [mat,list] of groups){
  const merged=mergeGeometries(list,false);if(!merged)continue;geometry.push(merged);
  const skin=new T.SkinnedMesh(merged,mat);skin.name=identity.name+' · '+mat.name;skin.bind(skeleton,source.bindMatrix);skin.castShadow=skin.receiveShadow=true;
  // Conservative local-space envelope includes the authored arm gestures and
  // hair. It permits offscreen culling without a bounding recompute per frame.
  skin.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.5);parent.add(skin);collection.push(skin);
 }
 // All original armour colours remain recoverable after liberation. State tint
 // only modifies owned materials and never changes an avatar or cached asset.
 const base=materials.filter(m=>m!==lowSkin).map(m=>({m,color:m.color.clone(),emissive:m.emissive.clone()}));let state={liberated:false,phase:1,threat:0,power:0},disposed=false,painted=false,level='full';
 return {object:owned,materials,
  setDistance(distance){distance=Number.isFinite(distance)?Math.max(0,distance):0;const next=level==='full'?(distance>44?'far':'full'):(distance<36?'full':'far');if(next!==level){level=next;owned.visible=level==='full';lowObject.visible=!owned.visible;for(const entry of originalMeshes)entry.object.visible=owned.visible&&entry.visible;}return level==='full';},
  setState(value={}){const next={...state,...value,liberated:!!(value.liberated??state.liberated)};next.phase=T.MathUtils.clamp(Math.round(next.phase)||1,1,3);next.threat=T.MathUtils.clamp(Number.isFinite(next.threat)?next.threat:0,0,1);next.power=T.MathUtils.clamp(Number.isFinite(next.power)?next.power:0,0,1);if(painted&&Object.keys(next).every(key=>next[key]===state[key]))return;state=next;painted=true;for(const {m,color} of base){m.color.copy(color);if(!state.liberated)m.color.lerp(new T.Color('#3c3347'),.22+state.threat*.1);m.emissive.set(state.liberated?identity.plate:'#5c3970');m.emissiveIntensity=state.liberated?.018:.05+state.phase*.012;}},
  update(time){if(disposed)return;for(const {m} of base)m.emissiveIntensity=(state.liberated?.018:.05+state.phase*.012)+(reducedMotion?0:Math.sin(time*1.35)*.008)+Math.min(.15,Math.max(0,state.power||0)*.1);},
  diagnostics(){return {art:'humanoid-web-adaptation',card:identity.card,region:identity.region,name:identity.name,totem:identity.totem,totemRole:'emblem',state:{...state},lod:level,armourDraws:meshes.length,armourVertices:meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0),farDraws:lowMeshes.length,farVertices:lowMeshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0),rigBones:skeleton.bones.length};},
  dispose(){if(disposed)return;disposed=true;owned.removeFromParent();lowObject.removeFromParent();for(const entry of originalMeshes)entry.object.visible=entry.visible;geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());},
 };
}
