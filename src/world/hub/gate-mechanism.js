import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A mechanical threshold belongs to the hub only. The passage opens before the
// player reaches the automatic portal crossing; it never changes country saves.
export function gateOpening(previous,distance,dt,{reducedMotion=false}={}){
 const target=distance<19?1:distance>24?0:previous;
 if(reducedMotion)return target;
 const step=Math.max(0,Math.min(.25,dt))*1.9;
 return target>previous?Math.min(target,previous+step):Math.max(target,previous-step);
}

export function addGateMechanism(group,{accent='#5abce5'}={}){
 const owned=[],g=x=>(owned.push(x),x),box=g(new THREE.BoxGeometry(1,1,1));
 const bronze=new THREE.MeshStandardMaterial({color:'#b89b65',metalness:.84,roughness:.3});
 const enamel=new THREE.MeshStandardMaterial({color:'#142936',metalness:.36,roughness:.42});
 const light=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.24,roughness:.38,metalness:.24});
 owned.push(bronze,enamel,light);
 const leaves=[];
 for(const side of [-1,1]){
  const leaf=new THREE.Group();leaf.name='Porte coulissante · '+side;group.add(leaf);leaves.push(leaf);
  const parts=new Map();
  const piece=(geometry,material,x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.updateMatrix();const p=geometry.index?geometry.toNonIndexed():geometry.clone();p.applyMatrix4(m.matrix);if(!parts.has(material))parts.set(material,[]);parts.get(material).push(p);};
  // Shaped upper edge follows the actual arch rather than covering its stone.
  const shape=new THREE.Shape();shape.moveTo(side<0?-2.85:0,.1);shape.lineTo(side<0?0:2.85,.1);
  if(side<0){shape.lineTo(0,7.53);for(let i=1;i<=16;i++){const a=Math.PI/2+i/16*Math.PI/2;shape.lineTo(Math.cos(a)*2.85,4.7+Math.sin(a)*2.85);}}
  else{shape.lineTo(2.85,4.7);for(let i=1;i<=16;i++){const a=i/16*Math.PI/2;shape.lineTo(Math.cos(a)*2.85,4.7+Math.sin(a)*2.85);}}
  shape.closePath();
  const face=g(new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:16}));
  piece(face,enamel,0,0,.29,1,1,1);
  for(const edge of [side*.08,side*2.72])piece(box,bronze,edge,2.6,.5,.07,4.9,.055);
  for(const y of [.3,1.3,2.3,3.3,4.3]){
   piece(box,bronze,side*1.4,y,.5,2.65,.045,.045);
   for(let n=0;n<3;n++){
    const x=side*(.48+n*.85),r=g(new THREE.TorusGeometry(.22,.017,4,12));
    piece(r,bronze,x,y+.47,.49,1,1,1);
   }
  }
  piece(box,light,side*.22,3.35,.53,.05,4.2,.04);
  for(const [material,list] of parts){const merged=g(mergeGeometries(list));list.forEach(p=>p.dispose());const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;leaf.add(mesh);}
 }
 // Rails and the exposed rack share one fixed draw; paired wheels share one instance draw.
 const railGeo=g(new THREE.BoxGeometry(12.2,.12,.22));railGeo.translate(0,4.4,.66);
 const teeth=[];
 for(let i=0;i<58;i++){const p=box.clone();p.scale(.08,.17,.12);p.translate((i-28.5)*.2,4.3,.72);teeth.push(p);}
 const rackGeo=g(mergeGeometries(teeth));teeth.forEach(p=>p.dispose());
 const frameGeo=g(mergeGeometries([railGeo,rackGeo])),rail=new THREE.Mesh(frameGeo,bronze);rail.name='Rails et crémaillère';rail.castShadow=rail.receiveShadow=true;group.add(rail);
 const wheelGeo=g(new THREE.TorusGeometry(.35,.09,6,16)),wheelBatch=new THREE.InstancedMesh(wheelGeo,bronze,2),wheelDummy=new THREE.Object3D();wheelBatch.name='Roues du mécanisme';wheelBatch.castShadow=wheelBatch.receiveShadow=true;group.add(wheelBatch);owned.push(wheelBatch);
 const wheels=[{side:-1,rotation:{z:0}},{side:1,rotation:{z:0}}];
 function poseWheels(eased){for(const [i,wheel] of wheels.entries()){wheel.rotation.z=wheel.side*eased*5;wheelDummy.position.set(wheel.side*3.65,4.3,.81);wheelDummy.rotation.set(0,0,wheel.rotation.z);wheelDummy.updateMatrix();wheelBatch.setMatrixAt(i,wheelDummy.matrix);}wheelBatch.instanceMatrix.needsUpdate=true;}
 poseWheels(0);wheelBatch.computeBoundingSphere();
 let openness=0,disposed=false;
 return {leaves,wheels,get openness(){return openness;},
  tick(distance,dt,options){openness=gateOpening(openness,distance,dt,options);const eased=openness*openness*(3-2*openness);leaves.forEach((leaf,i)=>{leaf.position.x=(i?1:-1)*3.05*eased;});poseWheels(eased);},
  dispose(){if(disposed)return;disposed=true;leaves.forEach(leaf=>leaf.removeFromParent());rail.removeFromParent();wheelBatch.removeFromParent();owned.forEach(asset=>asset.dispose());},
 };
}
