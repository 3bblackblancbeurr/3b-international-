import * as THREE from 'three';
import {citeIslandRadius} from './platform-topology.js';

/** Curved falling sheet: its lip follows the same coast as the walkable deck.
 * Local coordinates allow one shared water material and no per-frame mesh rebuild. */
export function cascadeGeometry(island){
 const segments=12,rows=12,halfWidth=island.r>=35?4.8:3.2;
 const a=Math.atan2(island.z,island.x),positions=[],uv=[],indices=[];
 for(let row=0;row<=rows;row++)for(let col=0;col<=segments;col++){
  const u=col/segments,v=row/rows,angle=a+(u-.5)*halfWidth*2/island.r;
  const base=island.baseY||0,drop=(18+base)*v,spread=.15+v*v*1.5,r=citeIslandRadius(island,angle)+spread;
  positions.push(Math.cos(angle)*r,base-drop,Math.sin(angle)*r);uv.push(u,1-v);
 }
 for(let row=0;row<rows;row++)for(let col=0;col<segments;col++){
  const n=row*(segments+1)+col;indices.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** One bounded particle draw for every cascade, animated entirely on the GPU. */
export function cascadeMist(islands,owned){
 const positions=[],seeds=[];
 for(let n=0;n<islands.length;n++){
  const island=islands[n],a=Math.atan2(island.z,island.x),r=citeIslandRadius(island,a)+1.8;
  for(let i=0;i<36;i++){
   positions.push(island.x+Math.cos(a)*r,-17.8,island.z+Math.sin(a)*r);
   seeds.push((i*.61803398875+n*.31)%1,(i*.41421356237+n*.17)%1,(i*.73205080757+n*.23)%1);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('spraySeed',new THREE.Float32BufferAttribute(seeds,3));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},day:{value:1},pixelScale:{value:1}},
 vertexShader:`attribute vec3 spraySeed;uniform float time;uniform float pixelScale;varying float life;void main(){life=fract(spraySeed.x+time*.21);float a=spraySeed.y*6.283185;vec3 p=position;p.xz+=vec2(cos(a),sin(a))*(.3+life*4.)*(.5+spraySeed.z);p.y+=life*3.4;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(520.*pixelScale*(.65+life)/max(1.,-view.z),1.,42.);}`,
 fragmentShader:`uniform float day;varying float life;void main(){float d=length(gl_PointCoord-.5)*2.;float softness=1.-smoothstep(.12,1.,d);float alpha=softness*sin(life*3.141593)*.13;gl_FragColor=vec4(vec3(.69,.86,.91)*(.3+.7*day),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=2;owned.push(geometry,material);
 return{points,tick(t){material.uniforms.time.value=t;},setDaylight(v){material.uniforms.day.value=v;},setQuality(mode){material.uniforms.pixelScale.value=mode==='fluid'?.7:1;}};
}
