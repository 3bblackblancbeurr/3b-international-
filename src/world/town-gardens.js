import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {roadDistance,randomFor} from './terrain.js';
import {plantingAllowed} from './vegetation.js';

// Low shrubs and wildflowers occupy dry verges, never streets or interactions.
export function addTownGardens(field,root,owned,region,flora){
 const rng=randomFor(field.biome.seed+531),dry=['maroc','algerie','turquie'].includes(region),limit=dry?105:165,points=[];
 for(let n=0;n<7000&&points.length<limit;n++){
  const x=(rng()-.5)*205,z=(rng()-.5)*205,d=roadDistance(x,z,field.roads),plaza=Math.min(...field.squares.map(p=>Math.hypot(x-p.x,z-p.z)-p.r));
  if((d>9&&plaza>11)||!plantingAllowed(field,x,z,1.1)||Math.abs(field.height(x,z))>5||Math.sin(x*.29+field.biome.seed)+Math.cos(z*.31)<.3)continue;
  const scale=.55+rng()*.52;flora.plant('Shrub',x,field.height(x,z),z,scale,rng()*6,root);points.push({x,z});
 }
 const stem=new THREE.CylinderGeometry(.018,.025,.55,5).translate(0,.275,0).toNonIndexed(),petals=new THREE.ConeGeometry(.11,.06,7).translate(0,.57,0).toNonIndexed();
 for(const [g,color] of [[stem,'#527451'],[petals,region==='estonie'?'#bdafd6':dry?'#e1bd78':'#ede2bc']]){const c=new THREE.Color(color),v=[];for(let i=0;i<g.attributes.position.count;i++)v.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(v,3));}
 const geometry=mergeGeometries([stem,petals]),material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});stem.dispose();petals.dispose();owned.push(geometry,material);
 const flowers=new THREE.InstancedMesh(geometry,material,points.length*3),dummy=new THREE.Object3D();let count=0;
 for(const p of points)for(let i=0;i<3;i++){
  const x=p.x+(rng()-.5)*2.4,z=p.z+(rng()-.5)*2.4;if(!plantingAllowed(field,x,z,.2))continue;
  dummy.position.set(x,field.height(x,z),z);dummy.rotation.set((rng()-.5)*.25,rng()*6,(rng()-.5)*.25);dummy.scale.setScalar(.7+rng()*.65);dummy.updateMatrix();flowers.setMatrixAt(count++,dummy.matrix);
 }
 flowers.name='verge-wildflowers';flowers.count=count;flowers.instanceMatrix.needsUpdate=true;flowers.computeBoundingSphere();flowers.receiveShadow=true;root.add(flowers);owned.push(flowers);
 return points.length;
}
