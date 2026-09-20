import * as THREE from 'three';

// Soft contact + controlled damp skirt. One shared texture and instanced draws.
export function addBuildingContact(field,root,owned){
 const sites=[...field.buildings,...field.civic];if(!sites.length)return{setWeather(){},setQuality(){}};
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=Math.max(0,Math.abs((x+.5)/size*2-1)-.7),dy=Math.max(0,Math.abs((y+.5)/size*2-1)-.7),t=Math.max(0,1-Math.hypot(dx,dy)/.3),i=(y*size+x)*4;
  data[i]=12;data[i+1]=20;data[i+2]=24;data[i+3]=Math.round(t*t*(3-2*t)*96);
 }
 const texture=new THREE.DataTexture(data,size,size);texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
 const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
 const shadowMat=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.92,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
 const dampMat=new THREE.MeshPhysicalMaterial({color:'#0b1519',roughness:.34,metalness:.02,clearcoat:.45,clearcoatRoughness:.22,transparent:true,opacity:.05,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const shadow=new THREE.InstancedMesh(geometry,shadowMat,sites.length),damp=new THREE.InstancedMesh(geometry,dampMat,sites.length),dummy=new THREE.Object3D();shadow.name='Town ground contact';damp.name='Town damp building feet';
 sites.forEach((s,i)=>{dummy.position.set(s.x,field.height(s.x,s.z)+.03,s.z);dummy.rotation.y=s.rotation||0;dummy.scale.set(s.width+4,1,s.depth+4);dummy.updateMatrix();shadow.setMatrixAt(i,dummy.matrix);dummy.position.y+=.012;dummy.scale.set(s.width+1.3,1,s.depth+1.3);dummy.updateMatrix();damp.setMatrixAt(i,dummy.matrix);});
 for(const mesh of [shadow,damp]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);owned.push(mesh);}
 owned.push(texture,geometry,shadowMat,dampMat);
 const full=sites.length;
 return{
  setWeather(weather){dampMat.opacity=weather==='storm'?.24:weather==='heavy_rain'?.20:weather==='rain'?.14:weather==='fog'?.09:.035;dampMat.needsUpdate=true;},
  setQuality(mode){damp.count=mode==='fluid'?Math.round(full*.68):full;shadow.count=full;},
 };
}
