import * as THREE from 'three';
import {mergeIndexedGeometries} from './geometry-batch.js';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';
import {realmStoryPlacement,realmStoryStaging} from './realm-story-staging.js';

/** Authored mission furniture at character scale. The three opaque batches
 * use vertex colours for wood, stone, cloth and metal; no texture, new light,
 * timer or reward is introduced. The approach at the objective stays clear. */
export function createRealmStoryRelic(item){
 const stage=realmStoryStaging(item);if(!stage)return null;
 const root=new THREE.Group(),owned=[],parts=[[],[],[]],art=worldRealmArt[stage.region];
 const palette={stone:art.stone,cloth:art.cloth,gold:worldArtMaterials.monumentGold,wood:worldArtMaterials.monumentDark,paper:worldArtMaterials.dust};
 root.name='3B · '+stage.place+' · '+stage.title;root.userData.storyStage=stage;
 const materials=[.84,.96,.46].map((roughness,index)=>new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness,metalness:index===2?.58:0}));owned.push(...materials);
 const primitive={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),torus:new THREE.TorusGeometry(1,.085,6,24),sphere:new THREE.SphereGeometry(1,10,6),cone:new THREE.ConeGeometry(1,1,10),bell:new THREE.CylinderGeometry(.36,.67,.9,16,1,true)};
 const matrix=new THREE.Matrix4(),rotation=new THREE.Euler(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(),colour=new THREE.Color();
 function put(slot,shape,x,y,z,w,h,d,rx=0,ry=0,rz=0,tint=slot===2?palette.gold:slot===1?palette.cloth:palette.stone){
  const geometry=primitive[shape].clone();rotation.set(rx,ry,rz);quaternion.setFromEuler(rotation);position.set(x,y,z);scale.set(w,h,d);matrix.compose(position,quaternion,scale);geometry.applyMatrix4(matrix);
  const count=geometry.attributes.position.count,colors=new Float32Array(count*3);colour.set(tint);for(let i=0;i<count;i++){colors[i*3]=colour.r;colors[i*3+1]=colour.g;colors[i*3+2]=colour.b;}
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts[slot].push(geometry);
 }
 const box=(slot,x,y,z,w,h,d,rx=0,ry=0,rz=0,tint)=>put(slot,'box',x,y,z,w,h,d,rx,ry,rz,tint);
 const cylinder=(slot,x,y,z,r,h,rx=0,ry=0,rz=0,tint)=>put(slot,'cylinder',x,y,z,r,h,r,rx,ry,rz,tint);
 const ring=(slot,x,y,z,r,rx=0,ry=0,rz=0,tint)=>put(slot,'torus',x,y,z,r,r,r,rx,ry,rz,tint);
 function beam(slot,a,b,width=.09,tint=palette.gold){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),direction=to.clone().sub(from),geometry=primitive.box.clone();
  quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());matrix.compose(from.add(to).multiplyScalar(.5),quaternion,new THREE.Vector3(width,direction.length(),width));geometry.applyMatrix4(matrix);
  const count=geometry.attributes.position.count,colors=new Float32Array(count*3);colour.set(tint);for(let i=0;i<count;i++)colors.set([colour.r,colour.g,colour.b],i*3);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts[slot].push(geometry);
 }
 const accepted=id=>stage.effects.includes(id),token=id=>stage.tokens.includes(id);
 function crate(x,y,z,w=.82){box(0,x,y,z,w,.7,w,0,0,0,palette.wood);for(const side of [-1,1])box(2,x+side*w*.31,y,z,.055,.73,w+.04);box(1,x,y+.37,z,w*.64,.06,w*.62);}
 function folio(x,y,z,w=1){box(1,x,y,z,w,.08,.66,0,0,0,palette.paper);for(let line=0;line<4;line++)box(0,x,y+.045,z-.2+line*.13,w*.72,.012,.025,0,0,0,palette.cloth);}
 function seedling(x,z,ready){
  box(0,x,.24,z,.75,.45,.67,0,0,0,palette.wood);box(0,x,.48,z,.65,.03,.57,0,0,0,palette.stone);
  if(ready){cylinder(2,x,.8,z,.025,.62);for(const side of [-1,1])put(1,'sphere',x+side*.14,.84,z,.23,.075,.13,0,0,side*.45);}
  else for(const side of [-1,1])put(1,'sphere',x+side*.14,.58,z,.10,.09,.13,0,0,0,palette.paper);
 }
 // A flush foundation, decorative edge and fabric signature occupy no height
 // at the action point. All substantial scenery is offset beside that point.
 box(0,0,.025,0,4.9,.05,3.0);for(const side of [-1,1])box(2,side*2.35,.058,0,.045,.018,2.85);box(1,0,.064,1.35,1.65,.018,.15);

 if(stage.family==='convoy'){
  const travelling=['escort','truth','post'].includes(stage.phaseId),united=accepted('groupe_reuni');
  box(0,0,.83,0,3.65,.18,1.7,0,0,0,palette.wood);
  for(const side of [-1,1]){box(0,0,1.12,side*.86,3.65,.45,.10,0,0,0,palette.wood);box(2,0,1.4,side*.9,3.7,.055,.055);}
  for(const x of [-1.25,1.25]){
   cylinder(2,x,.57,0,.065,2.25,Math.PI/2);
   for(const z of [-1.06,1.06]){ring(0,x,.58,z,.48,0,0,0,palette.wood);for(let spoke=0;spoke<6;spoke++){const a=spoke*Math.PI/3;beam(2,[x,.58,z],[x+Math.sin(a)*.44,.58+Math.cos(a)*.44,z],.045);}}
  }
  crate(-1.03,1.25,.05);crate(.05,1.25,-.16,.73);
  cylinder(0,1.13,1.4,.05,.34,.78,0,0,0,palette.stone);ring(1,1.13,1.8,.05,.29,Math.PI/2);box(1,1.13,1.93,.05,.13,.21,.13);
  beam(2,[-1.5,1.3,-.72],[-1.5,3.2,-.72],.07);box(2,-1.5,2.71,-.72,.47,.07,.43);box(1,-1.5,2.46,-.72,.34,.45,.32,0,0,0,palette.paper);put(2,'cone',-1.5,2.85,-.72,.35,.24,.35);
  if(travelling||united){for(const x of [-1.65,1.65])beam(0,[x,1.1,-.68],[x,2.76,-.68],.095,palette.wood);box(1,0,2.86,-.35,3.65,.10,1.03);for(const x of [-1.43,-.72,0,.72,1.43])box(2,x,2.924,-.35,.035,.018,.96);}
  if(stage.phaseId==='truth'||token('registre_convoi'))folio(.03,1.67,.1,.83);
  if(accepted('verite_partagee')||stage.restored)for(const x of [-.95,0,.95])box(1,x,1.48,.91,.42,.45,.025,0,0,0,palette.paper);
 }else if(stage.family==='bells'){
  const tuned=accepted('cloches_reparees'),shared=accepted('atelier_autonome')||accepted('ouvrage_transmis');
  for(const x of [-1.9,1.9]){box(0,x,1.98,-.4,.23,3.9,.33,0,0,0,palette.wood);box(2,x,.13,-.4,.4,.12,.52);}
  box(0,0,3.85,-.4,4.1,.27,.38,0,0,0,palette.wood);box(2,0,3.99,-.4,4.3,.045,.46);
  for(let i=0;i<3;i++){
   const x=(i-1)*1.18,y=tuned?2.35:2.08+(i%2)*.43,r=.63+i*.11;
   beam(2,[x,3.72,-.4],[x,y+r*.45,-.4],.055);put(2,'bell',x,y,-.4,r,r,r,0,0,tuned?0:(i-1)*.15);cylinder(2,x,y+r*.45,-.4,r*.36,.035);ring(2,x,y-r*.45,-.4,r*.66,Math.PI/2);
   cylinder(0,x,y-.24,-.4,.065,.53,0,0,0,palette.wood);put(2,'sphere',x,y-.51,-.4,.12,.13,.12);
   box(1,x,y+.24,-.93,.16,.53+i*.10,.055);if(tuned)box(1,x,1.62,-.4,.12,.66,.03,0,0,0,palette.paper);
  }
  box(0,0,.86,.75,3.65,.17,.85,0,0,0,palette.wood);for(const x of [-1.5,1.5])box(0,x,.44,.75,.2,.78,.65);
  ring(2,-.9,1.05,.72,.25,Math.PI/2);box(2,.9,1.04,.72,.74,.08,.18,0,0,.2);folio(0,1,.72,.66);
  if(shared)for(let cut=0;cut<4;cut++)box(2,-.28+cut*.18,1.06,.71,.065,.018,.31);
 }else if(stage.family==='rescue'){
  const prepared=accepted('issue_preparee'),saved=accepted('personne_sauvee')||accepted('second_sauvetage'),route=accepted('route_ouverte');
  for(const x of [-1.83,1.83]){cylinder(0,x,1.33,-.1,.16,2.6,0,0,0,palette.wood);box(1,x,2.32,-.1,.25,.52,.25);}
  beam(2,[-1.83,2.13,-.1],[1.83,2.13,-.1],.065);
  for(let coil=0;coil<(prepared?4:2);coil++)ring(2,-1.02,.16+coil*.085,.35,.53,Math.PI/2);
  ring(1,1.07,1.02,.25,.64);for(let band=0;band<4;band++){const a=band*Math.PI/2;box(2,1.07+Math.sin(a)*.64,1.02+Math.cos(a)*.64,.25,.15,.24,.18,0,0,-a);}
  for(let i=0;i<3;i++){const x=(i-1)*.82,h=1.18+i*.33;cylinder(0,x,h/2,-1,.09,h);for(let mark=0;mark<4;mark++)box(1,x,.25+mark*.23,-.902,.23,.06,.045);}
  if(saved){box(1,0,.63,.8,1.22,.15,.6);box(2,0,.72,.8,.6,.025,.045);box(2,0,.72,.8,.045,.025,.38);}
  if(route)for(let step=0;step<4;step++)box(2,-1.3+step*.85,.09,1.04,.65,.035,.22);
 }else if(stage.family==='rhythm'){
  const aligned=accepted('moulins_accordes'),performance=accepted('plaza_vivante'),mechanism=stage.phaseId==='movement'||stage.phaseId==='memory'||stage.phaseId==='value';
  box(0,0,1.9,-.42,.3,3.66,.38,0,0,0,palette.wood);box(0,0,.29,-.42,1.4,.5,.98);
  ring(2,0,2.35,-.2,1.22);
  const offset=aligned?Math.PI/4:Math.PI/12+stage.stepIndex*.12;
  for(let i=0;i<4;i++){const a=offset+i*Math.PI/2,x=Math.sin(a),y=2.35+Math.cos(a);beam(0,[0,2.35,-.2],[x*1.55,2.35+Math.cos(a)*1.55,-.2],.10,palette.wood);box(1,x*1.02,y,-.18,.46,1.2,.08,0,0,-a);for(let stitch=0;stitch<3;stitch++)box(2,x*1.02,y-.29+stitch*.23,-.12,.28,.018,.025,0,0,-a);}
  cylinder(2,0,2.35,-.05,.18,.23,Math.PI/2);
  for(let i=0;i<(mechanism?3:5);i++){const x=(i-(mechanism?1:2))*.77,h=.50+(i%2)*.23;cylinder(1,x,h/2,.91,.31,h);cylinder(0,x,h+.035,.91,.32,.07,0,0,0,palette.paper);for(const side of [-1,1])box(2,x+side*.19,h/2,1.16,.035,h,.035);}
  if(performance)for(let beat=0;beat<5;beat++)box(2,-1.7+beat*.85,.085,1.42,.48,.035,.16);
 }else if(stage.family==='restoration'){
  const garden=accepted('jardin_reconstruit'),shared=accepted('chantier_partage');
  for(const x of [-1.66,1.66]){box(0,x,.67,0,1.05,1.25,1.65);box(2,x,1.34,0,1.12,.065,1.73);}
  const boards=garden||shared?7:3;for(let i=0;i<boards;i++){const x=boards===7?-1.9+i*.63:(i-1)*1.72;box(0,x,1.37,0,.56,.14,1.46,0,0,!garden&&i===1?.24:0,palette.wood);}
  for(const side of [-1,1]){
   beam(0,[-2,1.4,side*.69],[-2,2.31,side*.69],.09,palette.wood);beam(0,[2,1.4,side*.69],[2,2.31,side*.69],.09,palette.wood);
   if(garden||shared)beam(2,[-2,2.25,side*.69],[2,2.25,side*.69],.07);
  }
  for(const x of [-1,0,1])seedling(x,1.07,garden);
  if(stage.phaseId==='rebuild'||stage.phaseId==='post'){box(0,-2.1,2.01,-.73,.18,3.25,.2,0,0,0,palette.wood);box(0,2.1,2.01,-.73,.18,3.25,.2,0,0,0,palette.wood);beam(2,[-2.1,3.57,-.73],[2.1,3.57,-.73],.12);}
  if(token('semences')||garden)folio(.02,1.50,-.1,.86);
 }else if(stage.family==='astrolabe'){
  const aligned=accepted('ciel_aligne'),returned=accepted('parole_tenue')||accepted('route_nocturne_ouverte');
  cylinder(0,0,.38,-.2,.72,.65);cylinder(2,0,1.58,-.2,.11,1.8);
  for(let i=0;i<3;i++)ring(i===1?1:2,0,2.48,-.2,1.14,Math.PI/2*(i===0),i===1?Math.PI/2:0,aligned?0:i*.34);
  cylinder(2,0,2.48,-.2,.17,.30,Math.PI/2);
  const a=aligned?Math.PI/2:stage.stepIndex*Math.PI/2+Math.PI/6;beam(2,[0,2.48,-.2],[Math.sin(a)*1.14,2.48+Math.cos(a)*1.14,-.2],.065);
  for(let i=0;i<4;i++){const angle=i*Math.PI/2,x=Math.sin(angle)*1.65,z=-.2+Math.cos(angle)*1.24;cylinder(0,x,.58,z,.17,1.05);put(2,'cone',x,1.2,z,.25,.29,.25);box(1,x,.82,z+.18,.15,.21,.035);}
  folio(0,.16,1.02,1.46);for(let hole=0;hole<(returned?4:2);hole++)ring(2,-.47+hole*.32,.24,1.05,.07,Math.PI/2);
 }else if(stage.family==='tracks'){
  const count=stage.phaseId==='post'?3:2,verified=accepted('leurre_ecarte')||accepted('anomalie_comprise');
  cylinder(0,-.35,.46,-.79,.38,3.55,0,0,Math.PI/2,palette.wood);for(const x of [-1.94,1.24])cylinder(0,x,.46,-.79,.32,.055,0,0,Math.PI/2);
  for(let mark=0;mark<count;mark++)box(2,-.63+mark*.25,.822,-.79,.095,.025,.48,0,0,-.19);
  for(let index=0;index<4;index++)for(const side of [-1,1])put(1,'sphere',-1.1+index*.62+side*.13,.1,.20+(index%2)*.54,.115,.035,.24,0,index%2?.24:-.15,0);
  for(const side of [-1,1]){
   beam(0,[side*1.6,.14,.10],[side*1.42,2.48,-.05],.16,palette.wood);beam(0,[side*1.42,1.75,-.05],[side*2.13,2.29,-.05],.11,palette.wood);
   for(let mark=0;mark<(side===1?count:1);mark++)box(side===1&&verified?2:1,side*1.41,1.16+mark*.22,.04,.33,.055,.07);
   put(1,'cone',side*1.42,2.62,-.05,.43,.66,.42,0,0,side*.14);
  }
  if(verified){ring(2,.25,1.16,.61,.31);beam(2,[.25,.14,.61],[.25,1.16,.61],.055);}
 }
 for(let slot=0;slot<parts.length;slot++){
  const geometry=mergeIndexedGeometries(parts[slot]);parts[slot].forEach(part=>part.dispose());if(!geometry)throw Error('Missing realm story batch '+stage.region+':'+slot);
  owned.push(geometry);geometry.computeBoundingBox();const mesh=new THREE.Mesh(geometry,materials[slot]);mesh.name=stage.family+' · '+slot;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 }
 Object.values(primitive).forEach(geometry=>geometry.dispose());
 const placement=realmStoryPlacement(item);root.position.set(placement.x,0,placement.z);root.rotation.y=placement.rotation;root.userData.placement=placement;
 let dead=false;return{root,stage,key:stage.key,dispose(){if(dead)return;dead=true;root.removeFromParent();for(const resource of owned)resource.dispose();}};
}
