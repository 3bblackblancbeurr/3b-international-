import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const sanctuaryCards=new Set(['C166','C171']);
/** Quiet secondary motion and crafted fittings for the two existing hub spirits.
 * Call beforeMixer before imported clips advance, then update after them. Neither
 * the root, feet, locomotion paths nor encounter rules are changed here. */
export function createCreaturePresence(model,{card,reducedMotion=false}={}){
 if(!sanctuaryCards.has(card))return null;
 const chest=model.getObjectByName('spine_03')||model.getObjectByName('spine_02'),head=model.getObjectByName('Head')||model.getObjectByName('head');
 const ownedGeo=[],ownedMat=[],groups=[],bones=[chest,head].filter(Boolean).map(bone=>({bone,quaternion:bone.quaternion.clone(),scale:bone.scale.clone(),layered:false}));
 const accent=card==='C166'?'#91b86b':'#e8a068',bronze=new T.MeshStandardMaterial({color:'#b59862',metalness:.78,roughness:.36}),inlay=new T.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.25,metalness:.3,roughness:.38});ownedMat.push(bronze,inlay);
 // Existing imported stone gets a soft mineral finish rather than a glossy
 // reflective skin; personal cloned materials remain owned by the actor.
 model.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat().filter(Boolean)){if(/^CreatureStone/.test(m.name)){m.roughness=.83;m.metalness=.08;m.envMapIntensity=.32;}else if(/^CreatureLight/.test(m.name)){m.roughness=.42;m.metalness=.22;m.emissiveIntensity=Math.min(.55,m.emissiveIntensity||.35);}}});
 if(chest){
  const group=new T.Group();group.name='3B · parure de '+(card==='C166'?'refuge':'projection');chest.add(group);groups.push(group);const goldPieces=[],gemPieces=[];
  const transform=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(1,1,1),position=new T.Vector3();
  const add=(geometry,x,y,z,angle,list)=>{q.setFromAxisAngle(new T.Vector3(0,1,0),angle);position.set(x,y,z);transform.compose(position,q,s);geometry.applyMatrix4(transform);list.push(geometry);};
  // Eight separate collar segments leave small joints and fit the existing rig.
  for(let i=0;i<8;i++){const a=i*Math.PI/4;add(new T.BoxGeometry(.07,.036,.018),Math.sin(a)*.152,.035,Math.cos(a)*.152,a,goldPieces);add(new T.IcosahedronGeometry(.018,0),Math.sin(a)*.171,.034,Math.cos(a)*.171,a,gemPieces);}
  for(const side of [-1,1]){for(let i=0;i<3;i++)add(new T.BoxGeometry(.024,.042,.006),side*(.115+i*.031),-.065-i*.017,.13,-side*.25,goldPieces);}
  for(const [pieces,m] of [[goldPieces,bronze],[gemPieces,inlay]]){const prepared=pieces.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(prepared,false);new Set([...pieces,...prepared]).forEach(g=>g.dispose());if(merged){ownedGeo.push(merged);const mesh=new T.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}}
 }
 const offset=new T.Quaternion(),point=new T.Vector3();let yaw=0,pitch=0,disposed=false;
 return {
  beforeMixer(){if(disposed)return;for(const b of bones)if(b.layered){b.bone.quaternion.copy(b.quaternion);b.bone.scale.copy(b.scale);b.layered=false;}},
  update(dt,time,{viewer=null,active=false,speed=0}={}){
   if(disposed)return;dt=T.MathUtils.clamp(Number.isFinite(dt)?dt:0,0,.25);time=Number.isFinite(time)?time:0;
   // Cache the freshly evaluated clip pose; secondary layers never accumulate.
   for(const b of bones){b.quaternion.copy(b.bone.quaternion);b.scale.copy(b.bone.scale);b.layered=false;}
   if(reducedMotion||active)return;
   const seed=card==='C166'?.7:2.3,breath=Math.sin(time*1.7+seed)*.008*(speed>.08?.3:1);
   if(chest){chest.scale.x*=1+breath;chest.scale.z*=1+breath;const b=bones.find(b=>b.bone===chest);b.layered=true;}
   let targetYaw=Math.sin(time*.23+seed)*.1,targetPitch=Math.sin(time*.31+seed)*.025;
   if(viewer){model.updateWorldMatrix(true,false);point.set(viewer.x,Number.isFinite(viewer.y)?viewer.y:0,viewer.z);model.worldToLocal(point);const distance=Math.hypot(point.x,point.z);if(distance>.01&&distance<14){targetYaw=T.MathUtils.clamp(Math.atan2(point.x,point.z),-.32,.32);targetPitch=T.MathUtils.clamp(-Math.atan2(point.y-1.65,distance),-.1,.1);}}
   const blend=1-Math.exp(-dt*3.5);yaw+=(targetYaw-yaw)*blend;pitch+=(targetPitch-pitch)*blend;
   if(head){offset.setFromEuler(new T.Euler(pitch,yaw,0,'YXZ'));head.quaternion.multiply(offset).normalize();bones.find(b=>b.bone===head).layered=true;}
  },
  dispose(){if(disposed)return;this.beforeMixer();disposed=true;groups.forEach(g=>g.removeFromParent());ownedGeo.forEach(g=>g.dispose());ownedMat.forEach(m=>m.dispose());},
 };
}
