import * as THREE from 'three';
import {roadDistance,randomFor} from './terrain.js';
import {obstacleDistance} from './collision.js';

// Low planting occupies dry verges, never the circulation or interaction areas.
// Shared geometries keep these details to three draw calls per country.
export function addTownGardens(field,root,owned,region){
 const rng=randomFor(field.biome.seed+531),leaf=new THREE.IcosahedronGeometry(1,1),stem=new THREE.ConeGeometry(1,1,5);
 const materials=[new THREE.MeshStandardMaterial({color:'#426b4c',roughness:1}),new THREE.MeshStandardMaterial({color:'#73915b',roughness:1}),new THREE.MeshStandardMaterial({color:['#cda9c4','#e0bc73','#bbb6d7'][field.biome.seed%3],roughness:.95})];
 owned.push(leaf,stem,...materials);const meshes=materials.map((m,i)=>new THREE.InstancedMesh(i===1?stem:leaf,m,1100)),counts=[0,0,0],dummy=new THREE.Object3D();
 const dry=['maroc','algerie','turquie'].includes(region),max=dry?600:950;
 for(let n=0;n<9000&&counts[0]<max;n++){
  const x=(rng()-.5)*175,z=(rng()-.5)*175,d=roadDistance(x,z,field.roads);
  if(d<1.5||d>10||Math.abs(field.height(x,z))>3||Math.hypot(x-field.lake.x,z-field.lake.z)<field.lake.r+5||field.anchors.some(a=>Math.hypot(a.x-x,a.z-z)<(a.type==='camp'?25:6))||field.buildings.some(b=>obstacleDistance({x,z},b)<1.5))continue;
  const cluster=Math.sin(x*.29+field.biome.seed)+Math.cos(z*.31);if(cluster<.3)continue;
  for(let k=0;k<3;k++){if(counts[k]>=1100)continue;const size=k===0?.35+rng()*.6:k===1?.2+rng()*.35:.09+rng()*.08;dummy.position.set(x+(k-1)*.25,field.height(x,z)+(k===0?size*.22:k===1?.2:.48),z);dummy.rotation.set(0,rng()*6,0);dummy.scale.set(size,k===0?size*.65:k===1?size*1.7:size,size);dummy.updateMatrix();meshes[k].setMatrixAt(counts[k]++,dummy.matrix);}
 }
 for(let i=0;i<meshes.length;i++){meshes[i].count=counts[i];meshes[i].instanceMatrix.needsUpdate=true;meshes[i].computeBoundingSphere();meshes[i].receiveShadow=true;root.add(meshes[i]);owned.push(meshes[i]);}
 return counts;
}
