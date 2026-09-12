import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Local coordinates follow the monument's proportions; all geometry is batched.
export function createEiffelTower({height=60,detail=true}={}) {
 const group=new T.Group();group.name='Tour Eiffel · charpente';
 const batches=[[],[],[]],up=new T.Vector3(0,1,0),v=(a)=>new T.Vector3(...a);
 function box(p,size,kind=0){const g=new T.BoxGeometry(...size);g.translate(...p);batches[kind].push(g);}
 function beam(a,b,width=.65,kind=0){const d=v(b).sub(v(a)),length=d.length(),q=new T.Quaternion().setFromUnitVectors(up,d.normalize()),mid=v(a).add(v(b)).multiplyScalar(.5);const parts=detail&&width>=.6?[new T.BoxGeometry(width,length,width*.24).translate(0,0,-width*.38),new T.BoxGeometry(width*.24,length,width).translate(-width*.38,0,0)]:[new T.BoxGeometry(width,length,width)];for(const g of parts){g.applyQuaternion(q);g.translate(...mid.toArray());batches[kind].push(g);}}
 function lattice(rings,width){for(let i=0;i<rings.length-1;i++){const a=rings[i],b=rings[i+1];for(let j=0;j<4;j++){const k=(j+1)%4;beam(a[j],b[j],width);beam(a[j],a[k],width*.6);beam(a[j],b[k],width*.4);if(detail)beam(a[k],b[j],width*.4);}}}
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 // Four separate curved truss piers, leaving the ground level open.
 const levels=[[2,52,8],[13,46,7.6],[25,40,7],[38,34,6.5],[49,29,6],[57,26,5.5],[72,22,5],[87,18.5,4.5],[101,16,4],[115,13.5,3.5]];
 for(const [sx,sz] of corners){box([sx*52,1,sz*52],[21,2,21],2);const rings=levels.map(([y,c,r])=>corners.map(([dx,dz])=>[sx*c+dx*r,y,sz*c+dz*r]));lattice(rings,1.1);}
 // Broad decorative arches on all four elevations, with spandrel braces.
 for(let side=0;side<4;side++){
  const point=(x,y)=>{const depth=52-26*Math.min(y/57,1);return side===0?[x,y,-depth]:side===1?[depth,y,x]:side===2?[x,y,depth]:[-depth,y,x];};
  for(let i=0;i<32;i++){const x=-40+i*2.5,n=x+2.5,y=12+37*Math.sqrt(Math.max(0,1-(x/40)**2)),ny=12+37*Math.sqrt(Math.max(0,1-(n/40)**2));beam(point(x,y),point(n,ny),1.25);beam(point(x,y+2.3),point(n,ny+2.3),.65);if(i%2===0&&y<48)beam(point(x,y+2.3),point(x,54),.38);}
 }
 function deck(y,w){const h=w/2;if(y<200){const band=w*.16;for(const sign of [-1,1]){box([0,y,sign*(h-band/2)],[w,1.3,band],1);box([sign*(h-band/2),y,0],[band,1.3,w-band*2],1);}}else box([0,y,0],[w,1.3,w],1);for(let s=0;s<4;s++){const p=(t,yy)=>s===0?[t,yy,-h]:s===1?[h,yy,t]:s===2?[t,yy,h]:[-h,yy,t];beam(p(-h,y+3.8),p(h,y+3.8),.38,1);beam(p(-h,y-2),p(h,y-2),.8);for(let x=-h;x<=h;x+=detail?2.7:5.4)beam(p(x,y+1),p(x,y+3.8),.25);}}
 deck(57,72);deck(115,42);deck(119,38);
 // Floor-edge trusses and fine parapets remain separate from the open central well.
 for(const [y,w] of [[57,72],[115,42],[119,38],[276,19]])for(let side=0;side<4;side++){
  const h=w/2,p=(x,yy,z=0)=>side===0?[x,yy,-h+z]:side===1?[h-z,yy,x]:side===2?[x,yy,h-z]:[-h+z,yy,x];
  const bays=detail?24:12;for(let i=0;i<bays;i++){const a=-h+i*w/bays,b=a+w/bays;beam(p(a,y-2),p(b,y),.23);if(detail){beam(p(b,y-2),p(a,y),.23);beam(p(a,y+2),p(b,y+2),.12,1);}}
 }
 if(detail){
  // Riveted joint plates on the four independent legs (not a solid filled pyramid).
  for(const [sx,sz] of corners)for(const [y,c,r] of levels)for(const [dx,dz] of corners){const x=sx*c+dx*r,z=sz*c+dz*r;box([x,y,z],[1.55,1.2,.22]);for(const a of [-.43,.43])for(const b of [-.3,.3]){const g=new T.SphereGeometry(.16,6,4);g.translate(x+a,y+b,z+.16);batches[1].push(g);}}
  // Sloping lift guide rails, small cars and secondary stair stringers.
  for(const [sx,sz] of corners){for(let i=0;i<levels.length-1;i++){const a=levels[i],b=levels[i+1];for(const offset of [-1.2,1.2])beam([sx*a[1]+offset,a[0],sz*a[1]],[sx*b[1]+offset,b[0],sz*b[1]],.22,1);}box([sx*34,38,sz*34],[4.2,5,3.6],1);}
  // Stair flights sit inside a pier, leaving the monumental central opening clear.
  for(let low=60,flight=0;low<111;low+=4,flight++){
   const top=Math.min(111,low+4),direction=flight%2?-1:1;
   const center=y=>26-(y-57)*(12.5/58),start=center(low)-direction*2,end=center(top)+direction*2;
   for(let step=0;step<12;step++){const t=step/11,y=low+(top-low)*t;box([start+(end-start)*t,y,center(y)],[.38,.12,1.4],1);}
   for(const side of [-1,1]){beam([start,low,center(low)+side*.8],[end,top,center(top)+side*.8],.16);beam([start,low+1.3,center(low)+side*.8],[end,top+1.3,center(top)+side*.8],.1);}
  }
 }
 const upper=[[117,16.5],[132,14],[149,11.8],[167,9.8],[186,8],[205,6.8],[225,5.9],[245,5.2],[265,4.8],[276,4.5]];
 lattice(upper.map(([y,r])=>corners.map(([x,z])=>[x*r,y,z*r])),.8);
 deck(276,19);box([0,280,0],[12,5,12],1);
 lattice([283,291,300].map((y,i)=>corners.map(([x,z])=>[x*(5-i*1.6),y,z*(5-i*1.6)])),.6);
 box([0,302,0],[5,2,5],1);beam([0,303,0],[0,330,0],.65,1);
 for(const y of [305,311,317,323]){box([0,y,0],[3.4,.28,3.4],1);for(const side of [-1,1])beam([side*1.2,y-2,0],[side*1.2,y+1.8,0],.18,1);}
 // Thin pavilion walls and cornices leave the central void and trusses visible.
 for(const y of [57,115]){const half=y===57?30:17;for(const sign of [-1,1]){box([0,y+2.1,sign*half],[half*1.35,2.4,.6],1);box([sign*half,y+2.1,0],[.6,2.4,half*1.35],1);}}
 const materials=[new T.MeshStandardMaterial({color:'#88705a',roughness:.78,metalness:.18}),new T.MeshStandardMaterial({color:'#a38a69',roughness:.74,metalness:.18}),new T.MeshStandardMaterial({color:'#b8ac94',roughness:.92})];
 batches.forEach((list,i)=>{const g=mergeGeometries(list);list.forEach(a=>a.dispose());g.scale(height/330,height/330,height/330);g.computeBoundingSphere();const mesh=new T.Mesh(g,materials[i]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);});
 return group;
}
