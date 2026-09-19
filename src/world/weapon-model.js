import * as T from 'three';
import {getWeapon} from './arsenal.js';
import {resolveWeaponHandling} from './avatar-compatibility.js';
import {weaponAssetPath} from './weapon-assets.js';

// Authored fallback silhouettes with per-weapon mounting, visible supports and optional
// validated GLTF overrides. The procedural fallback stays active until a real asset loads.
export function fitWeapon(model,avatar,{drawn=true,library=null}={}){
 const w=getWeapon(avatar.weapon),profile=resolveWeaponHandling(w.id,avatar),root=new T.Group(),fallbackRoot=new T.Group(),supportRoot=new T.Group(),geometries=[],materials=[];
 const metal=new T.MeshStandardMaterial({color:'#bfaa79',metalness:.72,roughness:.32}),light=new T.MeshStandardMaterial({color:w.color,emissive:w.color,emissiveIntensity:.35,metalness:.35,roughness:.28}),supportMat=new T.MeshStandardMaterial({color:'#17191d',metalness:.32,roughness:.58});
 materials.push(metal,light,supportMat);root.add(fallbackRoot);model.add(root);model.add(supportRoot);
 function meshInto(parent,g,m,x=0,y=0,z=0){geometries.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
 function mesh(g,m,x=0,y=0,z=0){return meshInto(fallbackRoot,g,m,x,y,z);}
 function rod(x,y,z,xx,yy,zz,r=.012,m=metal,parent=fallbackRoot){const a=new T.Vector3(x,y,z),b=new T.Vector3(xx,yy,zz),d=b.clone().sub(a),o=meshInto(parent,new T.CylinderGeometry(r,r,d.length(),8),m);o.position.copy(a.add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 function blade(x=0,y=.25,length=.7){const o=mesh(new T.ConeGeometry(.075,length,4),light,x,y+length/2);o.scale.z=.3;return o;}
 const tier=Math.max(0,Math.min(3,avatar.weaponForm||0)),evolved=tier>0,orbiters=[],splitBlades=[];
 if(w.kind==='Bouclier'||w.kind==='Éventail'){
  const count=w.kind==='Bouclier'?8:7;for(let i=0;i<count;i++){const a=w.kind==='Bouclier'?i*Math.PI/4:i*Math.PI/6;const o=mesh(new T.BoxGeometry(.15,.34,.035),i%2?light:metal,Math.sin(a)*(evolved?.32:.2),.3+Math.cos(a)*(evolved?.32:.2));o.rotation.z=-a;}
 }else if(w.kind==='Arc'||w.id==='romano'){
  const o=mesh(new T.TorusGeometry(.47,.025,6,32,Math.PI),metal,0,.3);o.rotation.z=-Math.PI/2;rod(0,-.17,0,0,.77,0,.004,light);rod(-.25,.3,0,.4,.3,0,.012,light);
 }else if(w.kind==='Griffes'){for(let i=0;i<3;i++)blade((i-1)*.06,.05,.48);}
 else if(w.kind==='Gantelet'){rod(0,-.12,0,0,.18,0,.026);rod(-.12,.16,0,.12,.16,0,.012,metal);blade(0,.14,.56);}
 else if(w.kind==='Ailes'){for(let i=0;i<6;i++){const o=blade(i*.05,.03+i*.04,.5-i*.045);o.rotation.z=-i*.15;}}
 else if(w.kind==='Fil'){mesh(new T.TorusGeometry(.35,.009,5,40),light,0,.3);}
 else if(w.kind==='Doubles lames'){for(let i=0;i<2;i++){const o=mesh(new T.TorusGeometry(.27,.035,6,28,Math.PI*1.3),light,(evolved?0:(i-.5)*.35),.3);o.rotation.z=i*Math.PI;}}
 else if(w.kind==='Ciseaux'){for(let i=0;i<2;i++){const o=blade((i-.5)*(evolved?.28:.08),.15,.65);o.rotation.z=(i-.5)*.45;splitBlades.push({object:o,base:o.position.clone(),rotation:o.rotation.clone(),side:i?1:-1});mesh(new T.TorusGeometry(.075,.016,6,16),metal,(i-.5)*.12,.04);}}
 else if(w.kind==='Hache'){rod(0,-.25,0,0,.8,0,.025);const o=mesh(new T.CylinderGeometry(.28,.2,.055,8),light,.1,.65);o.rotation.x=Math.PI/2;}
 else if(w.id==='paris'&&evolved){
  for(let i=0;i<4;i++){const x=(i%2?1:-1)*.13,y=-.45+i*.37;rod(x,y,0,x,y+.23,0,.012);const tip=blade(x,y+.16,.17);if(tier>1)orbiters.push({object:tip,base:tip.position.clone(),phase:i*Math.PI/2});}
 }else if(w.kind==='Lance'){
  rod(0,-.6,0,0,1,0,.018);blade(0,.85,.32);
  if(w.id==='paris')for(let i=0;i<7;i++){rod(-.045,-.45+i*.2,0,.045,-.25+i*.2,0,.006,light);rod(.045,-.45+i*.2,0,-.045,-.25+i*.2,0,.006);}
  if(w.id==='carthage'&&evolved){blade(-.13,.65,.35);blade(.13,.65,.35);rod(-.13,.65,0,.13,.65,0);}
 }else{rod(0,-.15,0,0,.25,0,.025);rod(-.14,.2,0,.14,.2,0);blade();}
 if(tier>=2){const halo=mesh(new T.TorusGeometry(tier===3?.32:.22,.009,6,40),light,0,.35);halo.rotation.x=Math.PI/2;orbiters.push({object:halo,base:halo.position.clone(),phase:0,ring:true});}

 function buildSupport(){
  if(!profile.support||profile.stow==='hidden'||!profile.holster)return;
  if(profile.support==='scabbard'){
   const sheath=meshInto(supportRoot,new T.BoxGeometry(.09,.72,.06),supportMat,0,.22,.015);sheath.rotation.z=.02;
   meshInto(supportRoot,new T.BoxGeometry(.13,.045,.075),metal,0,-.13,.015);
  }else if(profile.support==='back'){
   rod(0,-.18,.02,0,.56,.02,.018,supportMat,supportRoot);
   const strap=meshInto(supportRoot,new T.TorusGeometry(.2,.014,6,30,Math.PI*1.3),supportMat,0,.15,.03);strap.rotation.z=Math.PI/2.8;
  }else if(profile.support==='bow'){
   const strap=meshInto(supportRoot,new T.TorusGeometry(.28,.012,6,36,Math.PI*1.45),supportMat,0,.22,.02);strap.rotation.z=-.22;
   rod(-.05,-.14,.015,.05,.55,.015,.009,metal,supportRoot);
  }
 }
 buildSupport();

 root.name='3B-equipped-'+w.id;supportRoot.name='3B-support-'+w.id;model.updateMatrixWorld(true);
 const mountBones=new Map(),bindRelative=new Map(),boneNames=new Set([profile.grip?.bone,profile.holster?.bone].filter(Boolean));
 const bindModelQ=model.getWorldQuaternion(new T.Quaternion()),bindModelInv=bindModelQ.clone().invert();
 for(const name of boneNames){const bone=model.getObjectByName(name);if(!bone)continue;mountBones.set(name,bone);bindRelative.set(name,bindModelInv.clone().multiply(bone.getWorldQuaternion(new T.Quaternion())));}

 const targetPos=new T.Vector3(),targetQuat=new T.Quaternion(),targetScale=new T.Vector3(1,1,1),tmpWorldPos=new T.Vector3(),tmpBoneQ=new T.Quaternion(),tmpModelQ=new T.Quaternion(),tmpRel=new T.Quaternion(),tmpDelta=new T.Quaternion(),tmpBase=new T.Quaternion(),tmpOffset=new T.Vector3(),tmpEuler=new T.Euler(),tmpInvBind=new T.Quaternion();
 function sampleMount(spec){
  if(!spec)return false;const bone=mountBones.get(spec.bone)||model.getObjectByName(spec.bone);if(!bone)return false;
  model.updateWorldMatrix(true,true);bone.getWorldPosition(tmpWorldPos);model.worldToLocal(tmpWorldPos);targetPos.copy(tmpWorldPos);
  const modelQ=model.getWorldQuaternion(tmpModelQ),boneQ=bone.getWorldQuaternion(tmpBoneQ);tmpRel.copy(modelQ).invert().multiply(boneQ);
  const bind=bindRelative.get(spec.bone)||tmpRel;tmpDelta.copy(tmpRel).multiply(tmpInvBind.copy(bind).invert());tmpBase.setFromEuler(tmpEuler.set(...spec.rotation));targetQuat.copy(tmpDelta).multiply(tmpBase).normalize();tmpOffset.set(...spec.position).applyQuaternion(tmpDelta);targetPos.add(tmpOffset);targetScale.setScalar(spec.scale||1);return true;
 }
 function place(group,spec,scaleFactor=1){if(!sampleMount(spec))return false;group.position.copy(targetPos);group.quaternion.copy(targetQuat);group.scale.copy(targetScale).multiplyScalar(scaleFactor);return true;}
 function applyInitial(){const hidden=!drawn&&profile.stow==='hidden',spec=hidden?profile.grip:(drawn?profile.grip:profile.holster||profile.grip);place(root,spec,hidden?.02:1);root.visible=!hidden||drawn;if(profile.holster&&supportRoot.children.length)place(supportRoot,profile.holster,1);}
 applyInitial();

 let assetScene=null,assetSource='fallback',disposed=false;
 const path=weaponAssetPath(w.id);
 if(path&&library){library.load(path).then(asset=>{if(disposed)return;assetScene=asset.scene.clone(true);assetScene.name='3B-asset-'+w.id;root.add(assetScene);fallbackRoot.visible=false;assetSource='gltf';}).catch(()=>{});}

 const destination=new T.Vector3(),secondaryTarget=new T.Vector3(),jointPos=new T.Vector3(),effectorPos=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3(),jointWorldQ=new T.Quaternion(),parentWorldQ=new T.Quaternion(),desiredWorldQ=new T.Quaternion(),desiredLocalQ=new T.Quaternion(),deltaQ=new T.Quaternion(),limitedDelta=new T.Quaternion();let separation=0,lastTime=0;
 function rotateJointToward(joint,effector,target,weight){
  if(!joint||!effector||!joint.parent)return;model.updateWorldMatrix(true,true);joint.getWorldPosition(jointPos);effector.getWorldPosition(effectorPos);from.copy(effectorPos).sub(jointPos);to.copy(target).sub(jointPos);if(from.lengthSq()<1e-8||to.lengthSq()<1e-8)return;from.normalize();to.normalize();deltaQ.setFromUnitVectors(from,to);const angle=2*Math.acos(Math.min(1,Math.abs(deltaQ.w)));limitedDelta.identity().slerp(deltaQ,angle>.38?.38/angle:1);joint.getWorldQuaternion(jointWorldQ);desiredWorldQ.copy(jointWorldQ).premultiply(limitedDelta);joint.parent.getWorldQuaternion(parentWorldQ);desiredLocalQ.copy(parentWorldQ).invert().multiply(desiredWorldQ);joint.quaternion.slerp(desiredLocalQ,Math.max(0,Math.min(.8,weight)));joint.updateMatrixWorld(true);
 }
 function applySecondaryIK(){
  const secondary=profile.secondary;if(!drawn||!secondary)return false;const effector=model.getObjectByName(secondary.hand),chain=secondary.chain?.map(name=>model.getObjectByName(name)).filter(Boolean);if(!effector||!chain||chain.length<2)return false;
  secondaryTarget.set(...secondary.position);root.localToWorld(secondaryTarget);for(let iteration=0;iteration<2;iteration++)for(let i=chain.length-2;i>=0;i--)rotateJointToward(chain[i],effector,secondaryTarget,(secondary.weight||.5)*(i===chain.length-2?1:.72));model.updateWorldMatrix(true,true);return true;
 }
 return {
  setDrawn(value){drawn=!!value;},
  get drawn(){return drawn;},
  get assetSource(){return assetSource;},
  getSecondaryTarget(out=new T.Vector3()){if(!profile.secondary)return null;out.set(...profile.secondary.position);return root.localToWorld(out);},
  applySecondaryIK,
  update(time,combat={}){
   const dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;separation+=(Number(combat.detached>0)-separation)*(1-Math.exp(-dt*14));
   const hidden=!drawn&&profile.stow==='hidden',spec=hidden?profile.grip:(drawn?profile.grip:profile.holster||profile.grip);
   if(sampleMount(spec)){const duration=Math.max(.08,drawn?profile.drawTime:profile.sheatheTime),blend=1-Math.exp(-dt*4/duration);root.position.lerp(targetPos,blend);root.quaternion.slerp(targetQuat,blend);const target=targetScale.clone().multiplyScalar(hidden?.02:1);root.scale.lerp(target,blend);root.visible=drawn||profile.stow!=='hidden'||root.scale.length()>.08;}
   if(profile.holster&&supportRoot.children.length&&sampleMount(profile.holster)){supportRoot.position.lerp(targetPos,1-Math.exp(-dt*18));supportRoot.quaternion.slerp(targetQuat,1-Math.exp(-dt*18));supportRoot.scale.lerp(targetScale,1-Math.exp(-dt*18));}
   model.updateWorldMatrix(true,true);
   for(const b of splitBlades){destination.set(b.side*.55,1.15,1.6+Math.sin(time*7+b.side)*.3);model.localToWorld(destination);root.worldToLocal(destination);b.object.position.copy(b.base).lerp(destination,separation);b.object.rotation.copy(b.rotation);b.object.rotation.y+=separation*time*9;}
   for(const o of orbiters){if(o.ring){o.object.rotation.y=time*.5;continue;}o.object.position.x=o.base.x+Math.cos(time+o.phase)*.045;o.object.position.z=o.base.z+Math.sin(time+o.phase)*.08;}
  },
  dispose(){disposed=true;assetScene?.removeFromParent();root.removeFromParent();supportRoot.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 };
}
