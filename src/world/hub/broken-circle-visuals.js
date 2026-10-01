import * as THREE from 'three';

// Eight separated heritage arcs crown the existing tower. Progress only changes
// their material and closes their gaps; it never manufactures a seal.
export function brokenCircleCrownLayout({fragmentCount=0,height=100,compact=false}={}){
 const count=Math.max(0,Math.min(8,Math.floor(Number(fragmentCount)||0))),segments=compact?4:6;
 const radius=Math.max(19,Math.min(34,height*.23)),centerY=height*.70,pieces=[];
 for(let sector=0;sector<8;sector++){
  const span=count===8?Math.PI/4:Math.PI/4*.74;
  for(let segment=0;segment<segments;segment++){
   const angle=-Math.PI/2+sector*Math.PI/4+(segment+.5)/segments*span;
   pieces.push({sector,active:sector<count,x:Math.cos(angle)*radius,y:centerY+Math.sin(angle)*radius,z:-3.8,
    rotation:angle+Math.PI/2,width:radius*span/segments*1.04,thickness:2.5,depth:2.8});
  }
 }
 return {radius,centerY,fragmentCount:count,pieces};
}

export function createBrokenCircleCrown(item,{geometry,material}){
 const layout=brokenCircleCrownLayout({fragmentCount:item.fragmentCount,height:item.height,compact:item.renderProfile==='mobileMedium'});
 const root=new THREE.Group();root.name='3B-Monumental-Broken-Circle';root.userData.fragmentCount=layout.fragmentCount;
 const dark=material('#303b43',{roughness:.47,metalness:.65,emissive:'#12334a',emissiveIntensity:.2}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const gold=material('#d6b46a',{roughness:.25,metalness:.84,emissive:'#916726',emissiveIntensity:.23}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const blue=material('#268eb9',{roughness:.3,metalness:.45,emissive:'#00a8ff',emissiveIntensity:.5}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const transform=new THREE.Object3D();
 for(const active of [false,true]){
  const pieces=layout.pieces.filter(piece=>piece.active===active);if(!pieces.length)continue;
  const mesh=new THREE.InstancedMesh(geometry.box,active?gold:dark,pieces.length);mesh.name=active?'Restored-Heritage-Arcs':'Fractured-Heritage-Arcs';
  pieces.forEach((piece,index)=>{transform.position.set(piece.x,piece.y,piece.z);transform.rotation.set(0,0,piece.rotation);transform.scale.set(piece.width,piece.thickness,piece.depth);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);
 }
 const seams=layout.pieces.filter((_,index)=>index%(item.renderProfile==='mobileMedium'?4:6)===0);
 const light=new THREE.InstancedMesh(geometry.box,blue,seams.length);light.name='Matrix-Heritage-Seams';
 seams.forEach((piece,index)=>{transform.position.set(piece.x,piece.y,piece.z+1.45);transform.rotation.set(0,0,piece.rotation);transform.scale.set(piece.width*.74,.12,.06);transform.updateMatrix();light.setMatrixAt(index,transform.matrix);});
 light.instanceMatrix.needsUpdate=true;light.computeBoundingSphere();root.add(light);
 root.dispose=()=>root.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
 return root;
}
