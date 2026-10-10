import * as THREE from 'three';
/** Real 3D aperture, metal relief and a stencil-clipped miniature realm. No image billboard. */
export function createPassageArt(){
 const root=new THREE.Group(),resources=new Set(),animated=[];
 const keep=resource=>{resources.add(resource);return resource;};
 const metal=keep(new THREE.MeshStandardMaterial({color:0xc8b58e,metalness:.82,roughness:.25}));
 const dark=keep(new THREE.MeshStandardMaterial({color:0x16212b,metalness:.72,roughness:.36}));
 const silver=keep(new THREE.MeshStandardMaterial({color:0x6c8894,metalness:.8,roughness:.28}));
 const glow=keep(new THREE.MeshBasicMaterial({color:0x77ddff,toneMapped:false}));
 function add(geometry,material,position=[0,0,0],parent=root){const mesh=new THREE.Mesh(keep(geometry),material);mesh.position.fromArray(position);mesh.renderOrder=4;parent.add(mesh);return mesh;}
 // Three machined rings give the portal thickness and real highlights from changing angles.
 add(new THREE.TorusGeometry(.132,.009,12,96).scale(1,1.38,1),dark,[0,0,-.005]);
 add(new THREE.TorusGeometry(.125,.007,12,96).scale(1,1.40,1),metal,[0,0,.008]);
 add(new THREE.TorusGeometry(.116,.0016,6,96).scale(1,1.43,1),glow,[0,0,.011]);
 for(let i=0;i<32;i++){
  const a=i/32*Math.PI*2,x=Math.cos(a)*.125,y=Math.sin(a)*.175;
  const plate=add(new THREE.BoxGeometry(.017,.011,.010),i%4===0?metal:dark,[x,y,.009]);plate.rotation.z=a;
  const notch=add(new THREE.BoxGeometry(.0012,i%4===0?.008:.004,.0015),i%4===0?glow:silver,[x,y,.016]);notch.rotation.z=a;
 }
 for(let i=0;i<8;i++){
  const a=i/8*Math.PI*2,stone=add(new THREE.OctahedronGeometry(.0055),glow,[Math.cos(a)*.125,Math.sin(a)*.175,.021]);stone.rotation.z=a;
 }
 // Clear stencil every renderer frame. Mask never writes color or depth, and clips only the realm.
 const maskMaterial=keep(new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilZPass:THREE.ReplaceStencilOp}));
 const mask=add(new THREE.CircleGeometry(.113,96).scale(1,1.46,1),maskMaterial);mask.renderOrder=0;
 const realm=new THREE.Group();root.add(realm);
 function inside(material){const clone=keep(material.clone());clone.stencilWrite=true;clone.stencilRef=1;clone.stencilFunc=THREE.EqualStencilFunc;clone.stencilFail=clone.stencilZFail=clone.stencilZPass=THREE.KeepStencilOp;clone.side=THREE.DoubleSide;return clone;}
 const stone=inside(new THREE.MeshStandardMaterial({color:0x153549,roughness:.65,metalness:.18}));
 const architecture=inside(new THREE.MeshStandardMaterial({color:0x968468,metalness:.52,roughness:.4}));
 const lit=inside(new THREE.MeshBasicMaterial({color:0x8fdfff,toneMapped:false}));
 const blue=inside(new THREE.MeshBasicMaterial({color:0x132b48}));
 function realmMesh(geometry,material,position){const mesh=add(geometry,material,position,realm);mesh.renderOrder=2;return mesh;}
 realmMesh(new THREE.PlaneGeometry(2,2),blue,[0,0,-.7]);
 realmMesh(new THREE.IcosahedronGeometry(.15,1).scale(1,.45,.75),stone,[0,-.1,-.32]);
 // A traversable-looking bridge recedes toward an eight-sided memory tower.
 for(let i=0;i<12;i++)realmMesh(new THREE.BoxGeometry(.035,.006,.018),architecture,[0,-.095+i*.002,-.018-i*.021]);
 realmMesh(new THREE.CylinderGeometry(.027,.04,.17,8),stone,[0,-.005,-.31]);
 realmMesh(new THREE.CylinderGeometry(.031,.031,.007,8),architecture,[0,.08,-.31]);
 realmMesh(new THREE.ConeGeometry(.035,.045,8),architecture,[0,.103,-.31]);
 for(let i=0;i<8;i++){
  const a=i/8*Math.PI*2;realmMesh(new THREE.BoxGeometry(.005,.085,.005),architecture,[Math.cos(a)*.032,-.02,Math.sin(a)*.032-.31]);
  realmMesh(new THREE.BoxGeometry(.003,.016,.003),lit,[Math.cos(a)*.029,.027,Math.sin(a)*.029-.31]);
 }
 for(let i=0;i<7;i++){
  const a=i*2.399,height=.035+(i%3)*.012;
  const rock=realmMesh(new THREE.IcosahedronGeometry(.015+i*.001,0).scale(1,.65,1),stone,[Math.cos(a)*.095,Math.sin(a)*.09,-.12-(i%3)*.07]);animated.push({mesh:rock,y:rock.position.y,phase:i});
  realmMesh(new THREE.CylinderGeometry(.008,.012,height,6),architecture,[Math.cos(a)*.095,Math.sin(a)*.09+height/2,-.12-(i%3)*.07]);
 }
 const positions=[];
 for(let i=0;i<160;i++){const a=i*2.399,r=Math.sqrt((i+.5)/160)*.22;positions.push(Math.cos(a)*r,Math.sin(a)*r,-.04-(i%19)*.025);}
 const particlesGeometry=keep(new THREE.BufferGeometry());particlesGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const particlesMaterial=keep(new THREE.PointsMaterial({color:0x9bddf5,size:.0017,transparent:true,opacity:.7,depthWrite:false,toneMapped:false,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilZPass:THREE.KeepStencilOp}));
 const particles=new THREE.Points(particlesGeometry,particlesMaterial);particles.renderOrder=3;realm.add(particles);
 // Light sources belong to the same physical portal, rather than a painted lighting effect.
 const rimLight=new THREE.PointLight(0x79cdff,.012,.6,2);rimLight.position.set(0,.015,.09);root.add(rimLight);
 const realmLight=new THREE.PointLight(0x71c5ff,.003,.9,2);realmLight.position.set(0,.11,-.2);root.add(realmLight);
 return {root,update(time,reduced=false){const t=reduced?0:time;particles.rotation.z=t*.018;particlesMaterial.opacity=.6+.1*Math.sin(t*.9);animated.forEach(item=>{item.mesh.position.y=item.y+Math.sin(t*.5+item.phase)*.003;});},dispose(){resources.forEach(resource=>resource.dispose());}};
}
