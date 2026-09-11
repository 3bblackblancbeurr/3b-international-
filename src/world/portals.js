import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Eight crafted thresholds. Shared silhouettes stay inexpensive after batching.
export function createPortalFrame(region,accent){
 const group=new THREE.Group(),geometries=[],materials=new Map(),g=x=>(geometries.push(x),x),box=g(new THREE.BoxGeometry(1,1,1)),cylinder=g(new THREE.CylinderGeometry(1,1,1,16)),sphere=g(new THREE.IcosahedronGeometry(1,1));
 const palette={france:['#c9c5b5','#536d70'],italie:['#d7c8a7','#8e705a'],estonie:['#bac4b6','#566e68'],turquie:['#cfb78d','#508c8b'],algerie:['#e0d9bd','#678f83'],tunisie:['#f0e8cd','#407999'],maroc:['#c08e70','#6b9687'],espagne:['#d4b490','#648993']};
 const [stone,inlay]=palette[region]||['#c8bd9a','#8d9f99'];const mat=(color,metal=0)=>{const key=color+metal;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metal?.4:.84,metalness:metal}));return materials.get(key);};
 const mesh=(geometry,color,x,y,z,sx=1,sy=sx,sz=sx,metal=0)=>{const m=new THREE.Mesh(geometry,mat(color,metal));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 const b=(color,x,y,z,sx,sy,sz,metal=0)=>mesh(box,color,x,y,z,sx,sy,sz,metal);
 const shape=new THREE.Shape();shape.moveTo(-4.05,0);shape.lineTo(-4.05,4.7);shape.absarc(0,4.7,4.05,Math.PI,0,true);shape.lineTo(4.05,0);shape.closePath();
 const hole=new THREE.Path();hole.moveTo(-2.9,.1);hole.lineTo(2.9,.1);hole.lineTo(2.9,4.7);hole.absarc(0,4.7,2.9,0,Math.PI,false);hole.lineTo(-2.9,.1);shape.holes.push(hole);
 const arch=g(new THREE.ExtrudeGeometry(shape,{depth:1.05,bevelEnabled:true,bevelThickness:.1,bevelSize:.09,bevelSegments:2,curveSegments:28}));mesh(arch,stone,0,0,-.55);
 for(const s of [-1,1]){b(stone,s*3.7,.25,0,2.25,.5,2.1);b(stone,s*3.7,4.55,0,1.7,.32,1.6);for(const dx of [-.32,0,.32])mesh(cylinder,stone,s*3.7+dx,2.3,.72,.12,4.05,.12);b(inlay,s*3.7,2.45,.88,.22,3.5,.12);b('#d6bc80',s*3.7,4.88,.7,1.25,.13,.25,1);
  mesh(sphere,accent,s*4.6,4.6,0,.2,.37,.2,.4);b(inlay,s*4.6,2.3,0,.1,4.6,.1,.5);
 }
 for(let i=0;i<=16;i++){const a=i/16*Math.PI,m=mesh(box,i%2?stone:inlay,Math.cos(a)*3.54,4.7+Math.sin(a)*3.54,.65,.42,.35,.25);m.rotation.z=a-Math.PI/2;}
 const crest=mesh(box,'#d9c18a',0,8.25,.78,.72,.95,.23,1);crest.rotation.z=Math.PI/4;mesh(sphere,accent,0,8.25,1.02,.19,.27,.08,.6);
 if(region==='france'){for(const side of [-1,1]){b('#596b72',side*4.5,5.3,-.4,1.2,.2,1.8);for(let i=0;i<3;i++){const spiral=g(new THREE.TorusGeometry(.3+i*.1,.032,5,18));mesh(spiral,'#586d6c',side*(4.2+i*.38),5.9+i*.3,0);}}}
 if(region==='italie'||region==='espagne'){for(const side of [-1,1]){mesh(cylinder,stone,side*4.7,2.7,-.1,.32,5.3,.32);b(stone,side*4.7,5.45,-.1,1,.3,1.1);}const pediment=g(new THREE.ConeGeometry(1,1,4));const cap=mesh(pediment,inlay,0,9.3,-.1,2.2,1.2,1);cap.rotation.y=Math.PI/4;}
 if(region==='estonie'){for(const s of [-1,1]){mesh(cylinder,stone,s*4.4,3,-.5,.84,6,.84);mesh(g(new THREE.ConeGeometry(1,1,8)),'#667777',s*4.4,7,-.5,1.12,2,1.12);for(let j=0;j<3;j++)b(inlay,s*4.4,1.7+j*1.3,.4,.22,.5,.1);}}
 if(['turquie','algerie','tunisie','maroc','espagne'].includes(region))for(const s of [-1,1])for(let row=0;row<7;row++)for(let col=0;col<3;col++){const tile=b((row+col)%2?inlay:'#e5d8b0',s*3.7+(col-1)*.3,.9+row*.42,.98,.2,.2,.07);tile.rotation.z=Math.PI/4;}
 if(region==='maroc'||region==='algerie')for(const s of [-1,1])for(let i=0;i<3;i++)b(stone,s*3.7+(i-1)*.48,5.35,0,.31,.65,1.2);
 if(region==='turquie'||region==='tunisie'){const rib=g(new THREE.TorusGeometry(3.2,.09,6,48,Math.PI));mesh(rib,inlay,0,4.6,-.78);for(const s of [-1,1])b(inlay,s*3.2,2.3,-.78,.18,4.6,.18);}
 // A shallow mosaic threshold remains traversable at ground level.
 for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++){const tile=b((x+z)%2?inlay:'#d4c6a0',x,.055,z,.94,.09,.94);}
 group.updateMatrixWorld(true);const groups=new Map();for(const o of [...group.children]){if(!groups.has(o.material.uuid))groups.set(o.material.uuid,[]);groups.get(o.material.uuid).push(o);}
 for(const meshes of groups.values()){const list=meshes.map(m=>{m.updateMatrix();const v=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return v.applyMatrix4(m.matrix);});const merged=mergeGeometries(list);list.forEach(g=>g.dispose());if(merged){geometries.push(merged);const m=new THREE.Mesh(merged,meshes[0].material);m.castShadow=m.receiveShadow=true;group.add(m);meshes.forEach(m=>m.removeFromParent());}}
 return{group,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
