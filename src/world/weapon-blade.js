import * as THREE from 'three';
/** A forged diamond section: broad shoulder, long parallel cutting edges,
 * bevelled faces and a short tip. Dimensions stay within the original weapon reach. */
export function craftedBladeGeometry(length=.7){
 const vertices=[],indices=[],sections=[[0,.8],[.06,1],[.65,.88],[.87,.7],[1,0]];
 for(const [progress,width] of sections){const y=(progress-.5)*length,w=.075*width,t=.015*Math.max(.15,width);vertices.push(-w,y,0,0,y,t,w,y,0,0,y,-t);}
 for(let section=0;section<sections.length-1;section++)for(let face=0;face<4;face++){
  const a=section*4+face,b=section*4+(face+1)%4,c=(section+1)*4+face,d=(section+1)*4+(face+1)%4;
  indices.push(a,b,c,b,d,c);
 }
 indices.push(0,2,1,0,3,2);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
 const facets=geometry.toNonIndexed();geometry.dispose();facets.computeVertexNormals();facets.computeBoundingBox();facets.computeBoundingSphere();return facets;
}
