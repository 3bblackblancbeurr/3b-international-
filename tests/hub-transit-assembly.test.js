import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPremiumTransitVehicle} from '../src/world/premium-hub-visuals.js';
import {referenceTransportRoutes} from '../src/world/hub/transport-motion.js';

function fixture(transport){
 const root=new THREE.Group(),materials=[],geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,20)};
 const vehicle=createPremiumTransitVehicle({transport,color:'#e8b84d',height:0},{x:0,z:0},{root,geometry,groundY:()=>0,material:(color,properties)=>{const value=new THREE.MeshStandardMaterial({color,...properties});materials.push(value);return value;}});
 root.updateMatrixWorld(true);
 return {vehicle,materials,boxes:vehicle.children.map(mesh=>new THREE.Box3().setFromObject(mesh)),dispose(){Object.values(geometry).forEach(value=>value.dispose());materials.forEach(value=>value.dispose());}};
}

const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-6,label+': '+actual+' vs '+expected);
const envelopes={train:[.92,-.445,.71,2.45],boat:[.825,-.225,.73,1.65],telepheric:[.99,-.41,1.38,.81]};

for(const transport of ['train','boat','telepheric'])test(transport+' is an attached assembly with visible glazing inside its existing envelope',()=>{
 const f=fixture(transport);
 try{
  const bounds=new THREE.Box3().setFromObject(f.vehicle),[halfWidth,bottom,top,halfLength]=envelopes[transport];
  assert.ok(bounds.min.x>=-halfWidth-1e-6&&bounds.max.x<=halfWidth+1e-6);
  assert.ok(bounds.min.z>=-halfLength-1e-6&&bounds.max.z<=halfLength+1e-6);
  assert.ok(bounds.min.y>=bottom-1e-6&&bounds.max.y<=top+1e-6);
  // Every part must physically meet the assembly, directly or through a support.
  // The actual rotated cylinder and box bounds use the production unit primitives.
  const connected=new Set([0]);let changed=true;
  while(changed){changed=false;for(let i=0;i<f.boxes.length;i++)if(!connected.has(i)&&[...connected].some(j=>f.boxes[i].intersectsBox(f.boxes[j]))){connected.add(i);changed=true;}}
  assert.equal(connected.size,f.vehicle.children.length,transport+' has no detached component');
  const cabin=f.vehicle.children.find(mesh=>mesh.material===f.materials[2]),centre=cabin.getWorldPosition(new THREE.Vector3());
  const ray=new THREE.Raycaster(new THREE.Vector3(centre.x,centre.y,bounds.max.z+2),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(f.vehicle,true)[0]?.object,cabin,'the glass is visible rather than buried in opaque hull geometry');
  if(transport==='train'){
   const hull=f.boxes[0].getSize(new THREE.Vector3());near(hull.x,1.65,'body width');near(hull.y,.72,'body height');near(hull.z,4.9,'body length');
   const trackHeight=referenceTransportRoutes().find(route=>route.transport==='train').points[0].y;
   for(const wheel of f.vehicle.children.filter(mesh=>mesh.geometry.type==='CylinderGeometry')){
    const box=new THREE.Box3().setFromObject(wheel);near(Math.abs(wheel.position.x),.82,'wheel matches track gauge');near(box.min.y+trackHeight,.12+.055,'wheel meets the existing rail top');
   }
  }else if(transport==='boat'){
   const hull=f.boxes[0].getSize(new THREE.Vector3());near(hull.x,1.65,'hull width');near(hull.y,.35,'hull height');near(hull.z,3.3,'hull length');
   assert.ok(f.boxes[0].intersectsBox(f.boxes[1]),'cabin rests on hull');assert.ok(f.boxes[0].intersectsBox(f.boxes[2]),'bow plate meets hull');
  }else{
   const cableRay=new THREE.Raycaster(new THREE.Vector3(0,1.22,2),new THREE.Vector3(0,0,-1));
   for(const pulley of f.vehicle.children.filter(mesh=>mesh.geometry.type==='CylinderGeometry'))assert.ok(cableRay.intersectObject(pulley).length>0,'pulley meets the existing central cable');
  }
 }finally{f.dispose();}
});
