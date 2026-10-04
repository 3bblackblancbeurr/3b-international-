import * as THREE from 'three';

/** A real extruded entrance arch: open centre, bevelled stone edges and deep jambs. */
export function facadeArchGeometry(){
 const shape=new THREE.Shape(),r=1.13,leg=1.66,inner=.88;
 shape.moveTo(-r,0);shape.lineTo(-r,leg);
 shape.absarc(0,leg,r,Math.PI,0,true);shape.lineTo(r,0);shape.lineTo(inner,0);shape.lineTo(inner,leg);
 shape.absarc(0,leg,inner,0,Math.PI,false);shape.lineTo(-inner,0);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1,curveSegments:14});
 g.translate(0,0,-.10);return g;
}

/** Rectangular mansard shell with four sloping faces and a flat upper crown. */
export function mansardRoofGeometry(){
 const p=[],idx=[];
 const bottom=[[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]],top=[[-.3,1,-.3],[.3,1,-.3],[.3,1,.3],[-.3,1,.3]];
 for(let i=0;i<4;i++){
  const next=(i+1)%4,base=p.length/3;p.push(...bottom[i],...bottom[next],...top[next],...top[i]);idx.push(base,base+2,base+1,base,base+3,base+2);
 }
 const base=p.length/3;p.push(...top[0],...top[1],...top[2],...top[3]);idx.push(base,base+2,base+1,base,base+3,base+2);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

/** A pitched industrial roof bay with a short upright north-light clerestory. */
export function northlightRoofGeometry(){
 const pts=[[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5],[-.5,.12,-.5],[.5,1,-.5],[.5,1,.5],[-.5,.12,.5]],p=[],idx=[];
 for(const face of [[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5],[4,5,6,7]]){
  const base=p.length/3;face.forEach(i=>p.push(...pts[i]));idx.push(base,base+2,base+1,base,base+3,base+2);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
