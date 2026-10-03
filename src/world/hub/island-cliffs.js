import * as THREE from 'three';
import {citeIslandRadius} from './platform-topology.js';
export function islandCliffGeometry(island){
 const g=new THREE.CylinderGeometry(1,1,1,64,8,true),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),level=p.getY(i)+.5,edge=citeIslandRadius(island,a),taper=.55+.45*level,variation=level>.99?0:(Math.sin(a*13+level*12)*.025+Math.sin(a*7-level*23)*.035)*level;
  p.setXYZ(i,Math.cos(a)*edge*(taper+variation),-28*(1-level),Math.sin(a)*edge*(taper+variation));
 }
 g.computeVertexNormals();return g;
}
export function islandDeckGeometry(island){
 const g=new THREE.CircleGeometry(1,64);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z)>.5?citeIslandRadius(island,a):0,xx=island.x+Math.cos(a)*r,zz=island.z+Math.sin(a)*r;p.setXYZ(i,xx,0,zz);uv.setXY(i,xx/4,zz/4);}
 g.computeVertexNormals();return g;
}
