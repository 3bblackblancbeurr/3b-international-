import * as THREE from 'three';

// Reuse scene geometry and cached materials, with no new lights or animations.
// The complete twenty-mission set stays below 250 meshes on mobile.
export function createHubMissionEffectVisual(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Restoration-'+item.missionId;root.add(group);
 group.position.set(item.x,groundY(item.x,item.z),item.z);group.rotation.y=item.heading||0;
 const stone=material('#414947',{roughness:.86}),wood=material('#71513a',{roughness:.92}),green=material('#477450',{roughness:.94}),gold=material('#d2b06c',{roughness:.36,metalness:.45}),blue=material('#76c8d3',{roughness:.34,emissive:'#76c8d3',emissiveIntensity:.15}); // gold-master-allow: 3D material color; reviewed in docs/MONDE_3B_GOLD_MASTER_EXCEPTIONS_20260930.md
 const add=(shape,mat,x,y,z,sx,sy,sz)=>{const mesh=new THREE.Mesh(geometry[shape],mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 add('cylinder',stone,0,.08,0,5,.16,5);
 if(item.kind==='garden'){
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*3,z=Math.sin(a)*3;add('box',wood,x,.3,z,1.4,.6,1.4);add('sphere',green,x,1.1,z,.7,.85,.7);}
 }else if(item.kind==='meeting'){
  add('cylinder',wood,0,1.1,0,1.5,.2,1.5);add('box',stone,0,.5,0,.4,1,.4);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;add('box',wood,Math.cos(a)*3,.6,Math.sin(a)*3,1.5,.3,1.5);add('box',stone,Math.cos(a)*3,.3,Math.sin(a)*3,.5,.6,.5);}
 }else if(item.kind==='refuge'){
  for(const x of [-2.5,2.5])add('box',wood,x,1.6,1.8,.22,3.2,.22);
  add('box',wood,0,3.2,1,5.6,.25,3.5);add('cylinder',blue,0,.28,-2,1.3,.24,1.3);
  add('box',green,0,.4,1.3,3.5,.5,1.5);
 }else if(item.kind==='signal'){
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*3,z=Math.sin(a)*3;add('box',stone,x,.8,z,.55,1.6,.55);add('sphere',gold,x,1.65,z,.35,.35,.35);}
 }else if(item.kind==='relay'){
  for(let i=0;i<3;i++){add('box',stone,(i-1)*2.3,1,0,1.2,2,1.2);add('box',blue,(i-1)*2.3,1.5,.64,.65,.45,.08);}
 }else if(item.kind==='route'){
  for(let i=0;i<4;i++){add('box',stone,(i-1.5)*2,1,0,.45,2,.45);add('box',gold,(i-1.5)*2,2,0,.7,.15,.7);}
 }else{
  add('box',wood,0,.9,0,4.5,.2,2);for(const x of [-1.8,1.8])add('box',stone,x,.45,0,.3,.9,.3);
  for(let i=0;i<3;i++)add('box',item.kind==='workshop'?gold:blue,(i-1)*1.2,1.1,0,.8,.15,1.1);
 }
 return group;
}
