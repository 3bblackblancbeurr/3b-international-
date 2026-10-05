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
  const spans=Math.max(1,Math.ceil(bridge.length/38)),span=bridge.length/spans,slope=((bridge.endHeight||0)-(bridge.startHeight||0))/bridge.length;
  const deckAt=along=>(bridge.startHeight||0)+(along/bridge.length+.5)*((bridge.endHeight||0)-(bridge.startHeight||0));
  const arch=geo(civicArchGeometry({length:span-.9,crown:-1.5,spring:-12.7,depth:.9,thickness:.85,spandrelTop:-.78}));
  for(let v=0;v<arch.attributes.position.count;v++)arch.attributes.position.setY(v,arch.attributes.position.getY(v)+arch.attributes.position.getX(v)*slope);arch.computeVertexNormals();
  for(let j=0;j<spans;j++)for(const side of [-1,1]){
   const along=(j+.5)*span-bridge.length/2;
   place(bridge,along,side*(bridge.width/2-.95),deckAt(along),arch,stone);arches.push({x:bridge.x,z:bridge.z,angle:bridge.angle,along});
   // Bronze string course follows the load-bearing stone crown.
   const trim=geo(civicArchGeometry({length:span-.9,crown:-1.47,spring:-12.67,depth:.035,thickness:.09}));
   for(let v=0;v<trim.attributes.position.count;v++)trim.attributes.position.setY(v,trim.attributes.position.getY(v)+trim.attributes.position.getX(v)*slope);trim.computeVertexNormals();
   place(bridge,along,side*(bridge.width/2-.45),deckAt(along),trim,gold);
  }
  for(let j=0;j<=spans;j++){
   const along=j*span-bridge.length/2;
   const deckY=deckAt(along),columnHeight=deckY+23;
   for(const side of [-1,1]){
    const pier=geo(new THREE.CylinderGeometry(.83,1.4,columnHeight,6));
    place(bridge,along,side*(bridge.width/2-.95),(deckY-23)/2,pier,stone);
    place(bridge,along,side*(bridge.width/2-.95),-22.5,box,stone,2.8,1.8,3.2);
    place(bridge,along,side*(bridge.width/2-.95),deckY-1.55,box,gold,2,.18,2.5);
   }
   place(bridge,along,0,deckY-1.4,box,dark,1.3,1.4,bridge.width);piers.push({x:bridge.x,z:bridge.z,angle:bridge.angle,along});
  }
  // Longitudinal fascia follows the same edge as its real pedestrian deck.
  for(const side of [-1,1]){const fascia=place(bridge,0,side*(bridge.width/2-.2),deckAt(0)-.5,box,stone,Math.hypot(bridge.length,(bridge.endHeight||0)-(bridge.startHeight||0)),.72,.4);fascia.rotateZ(Math.atan(slope));}
 }
 for(const promenade of promenades){
  const bays=promenade.outer>150?40:28,r=(promenade.inner+promenade.outer)/2,span=Math.PI*2*r/bays;
  const arch=geo(civicArchGeometry({length:span-1,crown:-1.1,spring:-11.2,depth:.85,thickness:.8,segments:12}));
  for(let i=0;i<bays;i++){
   const a=i*Math.PI*2/bays,b=(i+.5)*Math.PI*2/bays;
   for(const radius of [promenade.inner+.65,promenade.outer-.65]){
    const support=mesh(box,stone,Math.cos(a)*radius,-11.9,Math.sin(a)*radius,1.15,23.4,1.4);support.rotation.y=-a;
    const foot=mesh(box,stone,Math.cos(a)*radius,-23,Math.sin(a)*radius,2.2,1.6,2.6);foot.rotation.y=-a;
    const vault=mesh(arch,stone,Math.cos(b)*radius,0,Math.sin(b)*radius);vault.rotation.y=-b-Math.PI/2;
   }
   const tie=mesh(box,dark,Math.cos(b)*r,-.6,Math.sin(b)*r,promenade.outer-promenade.inner,.8,1.4);tie.rotation.y=-b;
  }
  for(const radius of [promenade.inner+.12,promenade.outer-.12]){
   const rim=mesh(geo(new THREE.TorusGeometry(radius,.24,4,bays*3)),stone,0,-.35,0);rim.rotation.x=-Math.PI/2;
  }
 }
 return{arches:arches.length,bridgePiers:piers.length,promenadeBays:promenades.reduce((n,p)=>n+(p.outer>150?40:28),0)};
}
