import * as THREE from 'three';

/** Small exhibits mounted on the existing solid counters; no floor obstacles,
 * gameplay rewards or new interiors are introduced. All rooms share three draws. */
export function addInteriorDisplays({root,owned,box,buildings,materials}){
 const layers=new Map(),dummy=new THREE.Object3D();
 function piece(material,x,y,z,sx,sy,sz,yaw=0){
  if(!layers.has(material))layers.set(material,[]);layers.get(material).push({x,y,z,sx,sy,sz,yaw});
 }
 for(const b of buildings){
  const x=b.buildingX,z=b.buildingZ-b.depth/2+1,table=2.2,space=b.width*.19;
  if(['memory_archives','living_cards_gallery','mission_hotel'].includes(b.buildingId)){
   // Bound volumes, gold spines and a low reading stand.
   for(let i=0;i<5;i++){
    const xx=x-space+i*.33,h=.45+(i%3)*.12;
    piece(i%2?materials.dark:materials.glass,xx,table+h/2,z,.22,h,.44);
    piece(materials.gold,xx,table+h*.5,z+.23,.15,.045,.035);
   }
   piece(materials.gold,x+space*.55,table+.12,z,1,.12,.52);
   piece(materials.glass,x+space*.55,table+.23,z,.85,.08,.46);
  }else if(['central_marina','shipyard_3b','mobility_center','train_station'].includes(b.buildingId)){
   // Scale vessel with cabin, paired decks and a slender mast.
   piece(materials.dark,x,table+.12,z,2.1,.24,.5);
   piece(materials.gold,x,table+.28,z,1.8,.08,.48);
   piece(materials.glass,x-.1,table+.5,z,.75,.35,.36);
   piece(materials.gold,x+.5,table+.65,z,.035,.85,.035);
  }else if(['house_3b','ai_textile_lab','mode3_studio','community_house'].includes(b.buildingId)){
   // Textile sample stacks and a framed blue display.
   for(let i=0;i<3;i++)for(let j=0;j<3;j++)piece(j%2?materials.gold:materials.dark,x-space+i*.8,table+.06+j*.09,z,.6,.09,.46);
   piece(materials.gold,x+space*.65,table+.48,z,1,.8,.06);
   piece(materials.glass,x+space*.65,table+.48,z+.04,.86,.64,.04);
  }else if(['city_planning_office','city_gallery','tower_circle','heritage_welcome'].includes(b.buildingId)){
   // A city model on a bounded presentation plinth.
   piece(materials.dark,x,table+.08,z,2,.16,.65);
   for(let i=0;i<5;i++){const h=.2+(i%3)*.2;piece(i===2?materials.gold:materials.glass,x-.75+i*.36,table+.16+h/2,z,.22,h,.25);}
  }else{
   // A civic object with a champagne frame and two keepsake boxes.
   piece(materials.gold,x,table+.18,z,1,.14,.55);
   piece(materials.glass,x,table+.46,z,.5,.5,.35);
   for(const side of [-1,1])piece(materials.dark,x+side*.9,table+.15,z,.4,.3,.4);
  }
 }
 const group=new THREE.Group();group.name='3B · objets des comptoirs';root.add(group);
 for(const [material,poses] of layers){
  const batch=new THREE.InstancedMesh(box,material,poses.length);batch.castShadow=batch.receiveShadow=true;
  for(const [i,p] of poses.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);}
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);owned.push(batch);
 }
 return{count:buildings.length,setQuality(mode){group.children.forEach(o=>o.castShadow=mode!=='fluid');}};
}
