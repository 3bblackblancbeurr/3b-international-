import * as THREE from 'three';

// Sewn hood: oval face opening, roomy crown and a closed, rounded back.
export function hoodGeometry(){
 const vertices=[],uv=[],indices=[],segments=40,rings=14;
 for(let row=0;row<=rings;row++){
  const t=row/rings,angle=t*Math.PI/2,r=Math.cos(angle),z=.12-.33*Math.sin(angle);
  for(let col=0;col<=segments;col++){
   const a=col/segments*Math.PI*2,lower=Math.max(0,-Math.sin(a));
   const ease=1+.12*Math.sin(t*Math.PI),fold=.003*Math.sin(a*6)*Math.sin(t*Math.PI);
   vertices.push(Math.cos(a)*(.18*ease*r+fold),.08+Math.sin(a)*.235*r-.045*lower*r,z-.025*lower*r);
   uv.push(col/segments,t);
   if(row<rings&&col<segments){const i=row*(segments+1)+col;indices.push(i,i+1,i+segments+1,i+1,i+segments+2,i+segments+1);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function hoodHemGeometry(){
 const points=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2,lower=Math.max(0,-Math.sin(a));points.push(new THREE.Vector3(Math.cos(a)*.18,.08+Math.sin(a)*.235-.045*lower,.12-.025*lower));}
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),64,.006,6,true);
}
