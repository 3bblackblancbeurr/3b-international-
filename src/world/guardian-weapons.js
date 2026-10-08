import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {craftedBladeGeometry} from './weapon-blade.js';
import {mountWeapon} from './weapon-model.js';

/** Eight hand-crafted silhouettes. Grip origins are anatomical on both hands;
 * blades and effects follow the imported skeleton after every animation frame. */
export function fitGuardianWeapons(model,identity){
 const equipment=new T.Group();equipment.name=identity.name+' · équipement';
 const geometry=new Set(),materials=[],mounts=[];
 const material=(name,color,metalness,roughness)=>{const m=new T.MeshStandardMaterial({name,color,metalness,roughness});materials.push(m);return m;};
 const steel=material('guardian-forged-steel','#c3d4de',.85,.29),gold=material('guardian-engraving',identity.trim,.74,.33),leather=material('guardian-leather','#29232b',0,.86);
 const enamel=material('guardian-weapon-enamel',identity.cloth,.4,.38);enamel.emissive.set(identity.plate);enamel.emissiveIntensity=.07;
 function assembly(side,kind,grip=[0,0,0]){
  const root=new T.Group();root.name=identity.name+' · '+kind+' '+side;const pieces=new Map();
  const add=(g,mat,x=0,y=0,z=0,scale=[1,1,1],rotation=[0,0,0])=>{
   geometry.add(g);if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
   g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale)));
   if(!pieces.has(mat))pieces.set(mat,[]);pieces.get(mat).push(g);return g;
  };
  const rod=(from,to,r,mat)=>{const a=new T.Vector3(...from),b=new T.Vector3(...to),d=b.clone().sub(a),g=new T.CylinderGeometry(r,r,d.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));return add(g,mat,...a.add(b).multiplyScalar(.5).toArray());};
  const ring=(r,tube,x,y,z,mat=gold,gripPlane=false)=>add(new T.TorusGeometry(r,tube,4,24),mat,x,y,z,[1,1,1],gripPlane?[Math.PI/2,0,0]:[0,0,0]);
  const handle=(length=.25,r=.028)=>{rod([0,-length/2,0],[0,length/2,0],r,leather);for(let i=0;i<5;i++)ring(r+.003,.003,0,-length*.4+i*length*.2,0,gold,true);add(new T.SphereGeometry(r*1.4,8,6),gold,0,-length/2-.03);};
  const blade=(length,width=1,curve=0,start=.18)=>{
   const g=craftedBladeGeometry(length),p=g.attributes.position;
   for(let i=0;i<p.count;i++){const t=p.getY(i)/length+.5;p.setX(i,p.getX(i)*width+curve*t*t);p.setY(i,p.getY(i)+start+length/2);}
   g.computeVertexNormals();add(g,steel);
   // Raised central fuller is a real thin metal inlay, not a glowing blade.
   rod([curve*.01,start+.06,.017],[curve*.75,start+length*.82,.006],.0025,gold);
  };
  const cross=(width=.15)=>{rod([-width,.15,0],[width,.15,0],.014,gold);add(new T.SphereGeometry(.034,8,6),enamel,0,.15,.022);};
  if(kind==='shield'){
   add(new T.CylinderGeometry(.3,.27,.055,24),gold,0,.02,0,[1,1,1],[Math.PI/2,0,0]);
   add(new T.CylinderGeometry(.265,.265,.059,24),enamel,0,.02,.008,[1,1,1],[Math.PI/2,0,0]);
   add(new T.SphereGeometry(.065,12,6),gold,0,.02,.063,[1,1,.5]);ring(.28,.009,0,.02,.04);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;rod([Math.cos(a)*.09,.02+Math.sin(a)*.09,.055],[Math.cos(a)*.235,.02+Math.sin(a)*.235,.055],.005,gold);}
   rod([-.065,0,-.1],[.065,0,-.1],.019,leather);
  }else if(kind==='gauntlet'){
   add(new T.CylinderGeometry(.065,.055,.19,12,1,true),gold,0,.06);
   for(const y of [-.035,.06,.155])ring(.063,.006,0,y,0,gold,true);
   for(let i=0;i<3;i++)add(new T.BoxGeometry(.036,.05,.02),enamel,(i-1)*.043,.13,.054);
  }else if(kind==='lance'){
   rod([0,-.79,0],[0,1.11,0],.019,leather);for(const y of [-.77,-.27,.17,.69,1.08])ring(.022,.005,0,y,0,gold,true);
   blade(.37,.62,0,1.08);rod([-.07,1.12,0],[.07,1.12,0],.009,gold);
  }else{
   handle(kind==='dagues'?.21:.25);cross(kind==='rapiere'||kind==='escrime'?.1:.14);
   if(kind==='rapiere'||kind==='escrime'){
    blade(.99,.25);ring(.08,.012,0,.12,.018);ring(.11,.009,.05,.06,0,gold);rod([.125,.08,0],[.035,-.1,0],.009,gold);
   }else if(kind==='flyssa'){
    blade(.9,.76,.1);rod([-.075,.15,0],[.1,.22,0],.012,gold);
   }else if(kind==='kilij'){
    blade(.87,1.03,.26);ring(.031,.006,0,-.12,0,gold,true);
   }else if(kind==='dagues'){
    blade(.42,.74,.1);rod([-.09,.14,0],[.09,.14,0],.012,gold);
   }else if(kind==='baltiques'){
    blade(.55,.73,.04);ring(.045,.007,0,-.14,0,gold,true);
   }else blade(.88,.8);
  }
  for(const [mat,list] of pieces){const normalized=list.map(g=>g.index?g.toNonIndexed():g);const merged=mergeGeometries(normalized,false);for(const g of normalized)if(!list.includes(g))g.dispose();if(merged){geometry.add(merged);const mesh=new T.Mesh(merged,mat);mesh.name='guardian-weapon-'+mat.name;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}}
  mountWeapon(root,model,{kind:kind==='gauntlet'?'Gantelet':kind==='shield'?'Bouclier':'Épée',id:kind},0,{side,grip});
  root.userData.guardianWeapon={kind,side,grip};mounts.push(root);return root;
 }
 assembly('r',identity.weapon);
 if(['dagues','baltiques'].includes(identity.weapon))assembly('l',identity.weapon);
 if(identity.shield)assembly('l','shield',[0,0,-.1]);
 if(identity.gauntlet)assembly('l','gauntlet',[0,.06,0]);
 // The equipment group is a visibility handle. Mounted geometry must stay a
 // child of the bones, so it is never reparented into this organisational group.
 let disposed=false,hidden=false;
 return {object:equipment,mounts,materials,
  setVisible(visible){hidden=!visible;for(const root of mounts)root.visible=!!visible;},
  update(){for(const root of mounts)root.visible=!hidden;},
  diagnostics(){return mounts.map(root=>({kind:root.userData.guardianWeapon.kind,side:root.userData.guardianWeapon.side,hand:root.parent.name,mount:root.userData.weaponMount,grip:[...root.userData.weaponGrip],draws:root.children.length}));},
  dispose(){if(disposed)return;disposed=true;mounts.forEach(root=>root.removeFromParent());geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());},
 };
}
