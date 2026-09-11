import * as THREE from 'three';

// Soft ground contact remains visible beyond the small dynamic shadow map.
// One shared 64px texture and one instanced draw for the whole town.
export function addBuildingContact(field,root,owned){
 const sites=[...field.buildings,...field.civic];if(!sites.length)return;
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=Math.max(0,Math.abs((x+.5)/size*2-1)-.7),dy=Math.max(0,Math.abs((y+.5)/size*2-1)-.7),t=Math.max(0,1-Math.hypot(dx,dy)/.3),i=(y*size+x)*4;
  data[i]=15;data[i+1]=23;data[i+2]=28;data[i+3]=Math.round(t*t*(3-2*t)*90);
 }
 const texture=new THREE.DataTexture(data,size,size);texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
 const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
 const mesh=new THREE.InstancedMesh(geometry,material,sites.length),dummy=new THREE.Object3D();mesh.name='Town ground contact';
 sites.forEach((s,i)=>{dummy.position.set(s.x,field.height(s.x,s.z)+.03,s.z);dummy.rotation.y=s.rotation||0;dummy.scale.set(s.width+4,1,s.depth+4);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);owned.push(texture,geometry,material,mesh);
}
