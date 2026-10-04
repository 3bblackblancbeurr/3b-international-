import {Group,Mesh,BoxGeometry,CylinderGeometry,BufferGeometry,Float32BufferAttribute,MeshStandardMaterial,Vector3,Matrix4} from 'three';

// The reading clip supplies the anatomical pose. This small, shared-size book
// follows the measured palms after the mixer, including avatar build and height.
export function createInteractionReadingProp(model){
 const hands=['l','r'].map(side=>model.getObjectByName('hand_'+side)),knuckles=['l','r'].map(side=>model.getObjectByName('middle_01_'+side));
 if(hands.some(b=>!b)||knuckles.some(b=>!b))return null;
 const object=new Group();object.name='3B-reading-book';object.visible=false;object.matrixAutoUpdate=false;model.add(object);
 const geometries=new Set(),materials=new Set(),opening=.09,widthRatio=1.32;
 const material=(color,roughness=.85,metalness=0)=>{const m=new MeshStandardMaterial({color,roughness,metalness});materials.add(m);return m;};
 const cover=material('#24443c',.7),paper=material('#eee4cb'),ink=material('#706553'),gilt=material('#b9944d',.4,.55),ribbon=material('#924d43');
 const mesh=(parent,geometry,mat,x=0,y=0,z=0)=>{geometries.add(geometry);const m=new Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 for(const side of [-1,1]){
  const leaf=new Group();leaf.rotation.z=side*opening;object.add(leaf);
  const board=mesh(leaf,new BoxGeometry(.5,.013,.64),cover,side*.25);board.name='3B-reading-cover';
  mesh(leaf,new BoxGeometry(.482,.022,.61),paper,side*.25,.0175);
  // Quiet paragraph lines and a chapter rule remain readable as page structure
  // without DOM fonts, downloaded textures or dozens of separate draw calls.
  const vertices=[];
  const rectangle=(x0,x1,z0,z1)=>vertices.push(x0,.0291,z0,x1,.0291,z1,x1,.0291,z0,x0,.0291,z0,x0,.0291,z1,x1,.0291,z1);
  const centre=side*.25;
  for(let row=0;row<15;row++){
   const z=.23-row*.03,length=row%5===4?.22:.34;
   rectangle(centre-.17,centre-.17+length,z-.002,z+.002);
  }
  const lines=new BufferGeometry();lines.setAttribute('position',new Float32BufferAttribute(vertices,3));lines.computeVertexNormals();mesh(leaf,lines,ink);
  mesh(leaf,new BoxGeometry(.20,.0015,.006),gilt,centre,.0295,.268);
  mesh(leaf,new BoxGeometry(.46,.002,.008),gilt,centre,-.0067,-.3);
 }
 const spine=mesh(object,new CylinderGeometry(.014,.014,.63,8),cover,0,.003);spine.rotation.x=Math.PI/2;
 mesh(object,new BoxGeometry(.018,.002,.22),ribbon,0,.030,-.30);
 const wrists=[new Vector3(),new Vector3()],fingers=[new Vector3(),new Vector3()],palms=[new Vector3(),new Vector3()],across=new Vector3(),forward=new Vector3(),up=new Vector3(),centre=new Vector3(),matrix=new Matrix4(),basis=new Matrix4(),inverse=new Matrix4(),scale=new Vector3();let disposed=false;
 return {
  object,
  hide(){object.visible=false;},
  update(active){
   if(disposed)return;object.visible=!!active;if(!active)return;
   model.updateWorldMatrix(true,true);
   for(let i=0;i<2;i++){hands[i].getWorldPosition(wrists[i]);knuckles[i].getWorldPosition(fingers[i]);palms[i].copy(wrists[i]).lerp(fingers[i],.65);fingers[i].sub(wrists[i]);}
   across.subVectors(palms[0],palms[1]);const span=across.length();
   if(!Number.isFinite(span)||span<1e-5){object.visible=false;return;}
   across.divideScalar(span);forward.copy(fingers[0]).add(fingers[1]);forward.addScaledVector(across,-forward.dot(across)).normalize();up.crossVectors(forward,across).normalize();
   // Source rigs may name their left/right bones with either X convention.
   if(up.y<0){across.negate();up.negate();}
   if(up.lengthSq()<.5){object.visible=false;return;}
   const width=span*widthRatio;
   centre.copy(palms[0]).add(palms[1]).multiplyScalar(.5);
   // At both measured palm centres the underside of the cover meets the hand,
   // rather than the centre hinge floating high above it or intersecting it.
   const supportRise=Math.tan(opening)*span/2-.0065*width/Math.cos(opening);
   centre.addScaledVector(up,-supportRise+.002*width);
   basis.makeBasis(across,up,forward);matrix.copy(basis).scale(scale.setScalar(width)).setPosition(centre);
   inverse.copy(model.matrixWorld).invert();object.matrix.multiplyMatrices(inverse,matrix);object.matrixWorldNeedsUpdate=true;object.updateWorldMatrix(false,true);
  },
  dispose(){if(disposed)return;disposed=true;object.visible=false;object.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 };
}
