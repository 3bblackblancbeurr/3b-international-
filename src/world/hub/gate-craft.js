import * as THREE from 'three';

// Civic crown silhouettes belong to the hub gates; no kingdom geometry is created.
const CROWNS=Object.freeze({
 france:[[0,0],[1.35,0],[1.35,.3],[.95,.45],[.95,1.2],[.55,1.5],[.48,2.8],[0,6]],
 italie:[[0,0],[1.4,0],[1.4,.4],[.85,.5],[.85,1.2],[1.2,1.25],[1.2,1.6],[.6,1.8],[0,2.5]],
 estonie:[[0,0],[1.1,0],[1.1,.3],[.7,.3],[.7,1.4],[.35,1.4],[.35,3.3],[.12,3.3],[0,6.5]],
 turquie:[[0,0],[1.4,0],[1.4,.4],[1.5,.8],[1.3,1.4],[.85,2],[.3,2.5],[.15,3.6],[0,4]],
 algerie:[[0,0],[1.1,0],[1.1,.3],[.65,.5],[.65,2],[.9,2.2],[.75,2.8],[.3,3.4],[.15,5],[0,5.5]],
 tunisie:[[0,0],[1.45,0],[1.45,.5],[1.1,.65],[1.15,1.25],[.9,1.8],[.35,2.3],[0,3.3]],
 maroc:[[0,0],[1.25,0],[1.25,.4],[.85,.8],[1.45,1.4],[1.3,2.1],[.7,2.8],[.2,3.1],[0,4.5]],
 espagne:[[0,0],[1.4,0],[1.4,.35],[.65,.6],[.65,1.1],[1.2,1.5],[.85,2.1],[.4,2.7],[0,3.6]],
});
export function gateCrownGeometry(id){
 const profile=CROWNS[id]||CROWNS.france;
 return new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),16);
}

// Eight civic inlay patterns, cut into the face of existing gate pillars.
// They are decoration within the solid footprint and create no new barriers.
const INLAYS={
 france:[[-.65,-1],[0,.9],[.65,-1],[0,-.35],[-.65,-1]],
 italie:[[-.65,-.8],[-.65,.35],[0,1],[.65,.35],[.65,-.8],[-.65,-.8]],
 estonie:[[-.65,-1],[-.65,.15],[-.3,.15],[-.3,1],[.3,1],[.3,.15],[.65,.15],[.65,-1]],
 turquie:[[.5,-1],[-.15,-.75],[-.6,0],[-.15,.75],[.5,1],[.15,.35],[0,0],[.15,-.35],[.5,-1]],
 algerie:[[0,-1],[-.65,0],[0,1],[.65,0],[0,-1],[0,.45]],
 tunisie:[[-.65,-1],[-.65,.1],[-.45,.75],[0,1],[.45,.75],[.65,.1],[.65,-1]],
 maroc:[[0,1],[.25,.25],[1,0],[.25,-.25],[0,-1],[-.25,-.25],[-1,0],[-.25,.25],[0,1]],
 espagne:[[-.65,-1],[0,1],[.65,-1],[-.65,.25],[.65,.25],[-.65,-1]],
};
export function gateInlayGeometry(id){
 const path=INLAYS[id]||INLAYS.france,positions=[],indices=[];
 // Two stacked panels separated by fine horizontal mouldings.
 for(const y of [6,15])for(let i=1;i<path.length;i++){
  const [x0,y0]=path[i-1],[x1,y1]=path[i],length=Math.hypot(x1-x0,y1-y0),dx=-(y1-y0)/length*.035,dy=(x1-x0)/length*.035,n=positions.length/3;
  positions.push(x0+dx,y+y0*1.65+dy,0,x1+dx,y+y1*1.65+dy,0,x1-dx,y+y1*1.65-dy,0,x0-dx,y+y0*1.65-dy,0);
  indices.push(n,n+2,n+1,n,n+3,n+2);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i]/2+.5,positions[i+1]/20]:[]),2));g.computeVertexNormals();return g;
}
