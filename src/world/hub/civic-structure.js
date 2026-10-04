import * as THREE from 'three';

/** Solid segmental vault. The crown is below the deck; its feet meet the piers.
 * Unlike a hanging decorative cable, every arch has a visible load path. */
export function civicArchGeometry({length=28,crown=-1.2,spring=-12,depth=.8,thickness=.7,segments=16,spandrelTop=null}={}){
 const vertices=[],indices=[];
 for(let i=0;i<=segments;i++){
  const t=i/segments,x=(t-.5)*length,y=crown+(spring-crown)*(t*2-1)**2;
  const top=spandrelTop??y;vertices.push(x,top,-depth/2,x,top,depth/2,x,y-thickness,-depth/2,x,y-thickness,depth/2);
 }
 for(let i=0;i<segments;i++){
  const a=i*4,b=a+4;
  for(const [u,v] of [[0,1],[1,3],[3,2],[2,0]])indices.push(a+u,a+v,b+u,a+v,b+v,b+u);
 }
 indices.push(0,2,1,1,2,3);const end=segments*4;indices.push(end,end+1,end+2,end+1,end+3,end+2);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[vertices[i]/2.4,vertices[i+1]/2.4]:[]),2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Civic foundations are all below y=0 and never add pedestrian obstacles. */
export function addCivicStructure({mesh,geo,box,materials,bridges,promenades,connectors=[]}){
 const {dark,gold,stone}=materials,piers=[],arches=[];
 const place=(bridge,along,across,y,g,m,sx=1,sy=1,sz=1)=>{
  const c=Math.cos(bridge.angle),s=Math.sin(bridge.angle),o=mesh(g,m,bridge.x+c*along-s*across,y,bridge.z+s*along+c*across,sx,sy,sz);o.rotation.y=-bridge.angle;return o;
 };
 for(const bridge of [...bridges,...connectors]){
  const spans=bridge.length>60?3:1,span=bridge.length/spans;
  const arch=geo(civicArchGeometry({length:span-.9,crown:-1.5,spring:-12.7,depth:.9,thickness:.85,spandrelTop:-.78}));
  for(let j=0;j<spans;j++)for(const side of [-1,1]){
   const along=(j+.5)*span-bridge.length/2;
   place(bridge,along,side*(bridge.width/2-.95),0,arch,stone);arches.push({x:bridge.x,z:bridge.z,angle:bridge.angle,along});
   // Bronze string course follows the load-bearing stone crown.
   const trim=geo(civicArchGeometry({length:span-.9,crown:-1.47,spring:-12.67,depth:.035,thickness:.09}));
   place(bridge,along,side*(bridge.width/2-.45),0,trim,gold);
  }
  for(let j=0;j<=spans;j++){
   const along=j*span-bridge.length/2;
   for(const side of [-1,1]){
    place(bridge,along,side*(bridge.width/2-.95),-8.45,box,dark,1.25,15.1,1.9);
    place(bridge,along,side*(bridge.width/2-.95),-13.55,box,stone,2.3,1.5,2.9);
    place(bridge,along,side*(bridge.width/2-.95),-1.55,box,gold,2,.18,2.5);
   }
   place(bridge,along,0,-1.4,box,dark,1.3,1.4,bridge.width);piers.push({x:bridge.x,z:bridge.z,angle:bridge.angle,along});
  }
  // Longitudinal fascia follows the same edge as its real pedestrian deck.
  for(const side of [-1,1])place(bridge,0,side*(bridge.width/2-.2),-.5,box,stone,bridge.length,.72,.4);
 }
 for(const promenade of promenades){
  const bays=promenade.outer>150?40:28,r=(promenade.inner+promenade.outer)/2,span=Math.PI*2*r/bays;
  const arch=geo(civicArchGeometry({length:span-1,crown:-1.1,spring:-11.2,depth:.85,thickness:.8,segments:12,spandrelTop:-.12}));
  for(let i=0;i<bays;i++){
   const a=i*Math.PI*2/bays,b=(i+.5)*Math.PI*2/bays;
   for(const radius of [promenade.inner+.65,promenade.outer-.65]){
    const support=mesh(box,dark,Math.cos(a)*radius,-7.8,Math.sin(a)*radius,1.35,14.9,1.7);support.rotation.y=-a;
    const foot=mesh(box,stone,Math.cos(a)*radius,-14.4,Math.sin(a)*radius,2.2,1.2,2.6);foot.rotation.y=-a;
    const vault=mesh(arch,stone,Math.cos(b)*radius,0,Math.sin(b)*radius);vault.rotation.y=-b-Math.PI/2;
   }
  }
  for(const radius of [promenade.inner+.12,promenade.outer-.12]){
   const rim=mesh(geo(new THREE.TorusGeometry(radius,.24,4,bays*3)),stone,0,-.35,0);rim.rotation.x=-Math.PI/2;
  }
 }
 return{arches:arches.length,bridgePiers:piers.length,promenadeBays:promenades.reduce((n,p)=>n+(p.outer>150?40:28),0)};
}
