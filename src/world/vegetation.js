import * as THREE from 'three';

export function createMeadowMaterial(color){
 const material=new THREE.MeshStandardMaterial({color,roughness:.94,side:THREE.DoubleSide,vertexColors:true}),time={value:0};
 material.onBeforeCompile=shader=>{shader.uniforms.meadowTime=time;shader.vertexShader='uniform float meadowTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
   float bend=position.y*position.y;
   float gust=sin(meadowTime*1.5+instanceMatrix[3].x*.3+instanceMatrix[3].z*.21);
   transformed.x+=gust*bend*.17;
   transformed.z+=cos(meadowTime+instanceMatrix[3].z*.35)*bend*.08;
  #endif`);};
 material.customProgramCacheKey=()=> '3b-meadow-1';
 return {material,time};
}
export function createMeadowGeometry(){
 const vertices=[],colors=[],indices=[];
 for(let blade=0;blade<3;blade++){
  const a=blade*Math.PI*2/3,dx=Math.cos(a),dz=Math.sin(a),start=vertices.length/3;
  for(let row=0;row<4;row++){
   const t=row/3,w=(1-t)*.075,h=t*(.72+blade*.12),bend=t*t*.18;
   for(const side of [-1,1]){vertices.push(dx*bend-dz*w*side,h,dz*bend+dx*w*side);colors.push(.5+t*.42,.59+t*.4,.43+t*.42);}
   if(row<3){const i=start+row*2;indices.push(i,i+2,i+1,i+1,i+2,i+3);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
