import * as THREE from 'three';
import {citeIslandRadius} from './platform-topology.js';

export function cliffRadiusAtLevel(island,a,level){
 const strata=Math.round(level*6),seed=island.x*.07+island.z*.11;
 const ledge=level>.99?0:Math.sin(strata*2.3+seed)*.025;
 const fracture=level>.99?0:(Math.sin(a*13+seed)*.035+Math.sin(a*23-seed)*.018)*(1-level*.4);
 return citeIslandRadius(island,a)*(.66+.34*level+ledge+fracture);
}

/** A continuous coast with broken rock ledges. The exact upper edge is shared
 * with the deck and collision surface; all relief stays below the walking plane. */
export function islandCliffGeometry(island){
 const g=new THREE.CylinderGeometry(1,1,1,64,6,true),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const a=Math.atan2(p.getZ(i),p.getX(i)),level=p.getY(i)+.5;
  p.setXYZ(i,Math.cos(a)*cliffRadiusAtLevel(island,a,level),-28*(1-level),Math.sin(a)*cliffRadiusAtLevel(island,a,level));
 }
 g.computeVertexNormals();return g;
}
export function islandDeckGeometry(island){
 const g=new THREE.CircleGeometry(1,64);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z)>.5?citeIslandRadius(island,a):0,xx=island.x+Math.cos(a)*r,zz=island.z+Math.sin(a)*r;p.setXYZ(i,xx,0,zz);uv.setXY(i,xx/4,zz/4);}
 g.computeVertexNormals();return g;
}
