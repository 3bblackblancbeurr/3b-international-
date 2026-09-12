import * as T from 'three';
import {getWeapon} from './arsenal.js';
// Lightweight authored silhouettes, attached to the animated right hand.
export function fitWeapon(model,avatar){
 const w=getWeapon(avatar.weapon),root=new T.Group(),geometries=[],materials=[],metal=new T.MeshStandardMaterial({color:'#bfaa79',metalness:.72,roughness:.32}),light=new T.MeshStandardMaterial({color:w.color,emissive:w.color,emissiveIntensity:.35,metalness:.35,roughness:.28});materials.push(metal,light);
 function mesh(g,m,x=0,y=0,z=0){geometries.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;root.add(o);return o;}
 function rod(x,y,z,xx,yy,zz,r=.012,m=metal){const a=new T.Vector3(x,y,z),b=new T.Vector3(xx,yy,zz),d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,d.length(),6),m);o.position.copy(a.add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 function blade(x=0,y=.25,length=.7){const o=mesh(new T.ConeGeometry(.075,length,4),light,x,y+length/2);o.scale.z=.3;return o;}
 const tier=Math.max(0,Math.min(3,avatar.weaponForm||0)),evolved=tier>0,orbiters=[];
 if(w.kind==='Bouclier'||w.kind==='Éventail'){
  const count=w.kind==='Bouclier'?8:7;for(let i=0;i<count;i++){const a=w.kind==='Bouclier'?i*Math.PI/4:i*Math.PI/6;const o=mesh(new T.BoxGeometry(.15,.34,.035),i%2?light:metal,Math.sin(a)*(evolved?.32:.2),.3+Math.cos(a)*(evolved?.32:.2));o.rotation.z=-a;}
 }else if(w.kind==='Arc'||w.id==='romano'&&evolved){
  const o=mesh(new T.TorusGeometry(.47,.025,5,24,Math.PI),metal,0,.3);o.rotation.z=-Math.PI/2;rod(0,-.17,0,0,.77,0,.004,light);rod(-.25,.3,0,.4,.3,0,.012,light);
 }else if(w.kind==='Griffes'||w.kind==='Gantelet'){for(let i=0;i<(w.kind==='Griffes'?3:1);i++)blade((i-1)*.06,.05,.48);}
 else if(w.kind==='Ailes'){for(let i=0;i<6;i++){const o=blade(i*.05,.03+i*.04,.5-i*.045);o.rotation.z=-i*.15;}}
 else if(w.kind==='Fil'){mesh(new T.TorusGeometry(.35,.009,4,32),light,0,.3);}
 else if(w.kind==='Doubles lames'){for(let i=0;i<2;i++){const o=mesh(new T.TorusGeometry(.27,.035,5,20,Math.PI*1.3),light,(evolved?0:(i-.5)*.35),.3);o.rotation.z=i*Math.PI;}}
 else if(w.kind==='Ciseaux'){for(let i=0;i<2;i++){const o=blade((i-.5)*(evolved?.28:.08),.15,.65);o.rotation.z=(i-.5)*.45;mesh(new T.TorusGeometry(.075,.016,5,12),metal,(i-.5)*.12,.04);}}
 else if(w.kind==='Hache'){rod(0,-.25,0,0,.8,0,.025);const o=mesh(new T.CylinderGeometry(.28,.2,.055,6),light,.1,.65);o.rotation.x=Math.PI/2;}
 else if(w.id==='paris'&&evolved){
  for(let i=0;i<4;i++){const x=(i%2?1:-1)*.13,y=-.45+i*.37;rod(x,y,0,x,y+.23,0,.012);const tip=blade(x,y+.16,.17);if(tier>1)orbiters.push({object:tip,base:tip.position.clone(),phase:i*Math.PI/2});}
 }else if(w.kind==='Lance'){
  rod(0,-.6,0,0,1,0,.018);blade(0,.85,.32);
  if(w.id==='paris')for(let i=0;i<7;i++){rod(-.045,-.45+i*.2,0,.045,-.25+i*.2,0,.006,light);rod(.045,-.45+i*.2,0,-.045,-.25+i*.2,0,.006);}
  if(w.id==='carthage'&&evolved){blade(-.13,.65,.35);blade(.13,.65,.35);rod(-.13,.65,0,.13,.65,0);}
 }else{rod(0,-.15,0,0,.25,0,.025);rod(-.14,.2,0,.14,.2,0);blade();}
 if(tier>=2){const halo=mesh(new T.TorusGeometry(tier===3?.32:.22,.009,5,32),light,0,.35);halo.rotation.x=Math.PI/2;orbiters.push({object:halo,base:halo.position.clone(),phase:0,ring:true});}
 model.updateMatrixWorld(true);const hand=model.getObjectByName('hand_r');
 if(hand){const p=hand.getWorldPosition(new T.Vector3());model.worldToLocal(p);root.position.copy(p);model.add(root);hand.attach(root);}else{root.position.set(.4,.85,0);model.add(root);}
 root.rotateZ(-Math.PI/2);
 root.name='3B-equipped-'+w.id;
 return {update(time){for(const o of orbiters){if(o.ring){o.object.rotation.y=time*.5;continue;}o.object.position.x=o.base.x+Math.cos(time+o.phase)*.045;o.object.position.z=o.base.z+Math.sin(time+o.phase)*.08;}},dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
