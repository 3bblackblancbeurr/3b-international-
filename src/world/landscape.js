import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {COUNTRIES,countryById} from './catalog.js';
import {chapterState,nexusLevel,COSMETICS} from './chapters.js';
import {createResident} from './models.js';

const PALETTES={france:['#88b8c8','#789785','#b2b6a0'],italie:['#94bec3','#86a084','#d0bc99'],estonie:['#455f7d','#b5c8c2','#91adbb'],turquie:['#726b9a','#81869b','#bcada0'],algerie:['#a5bdba','#b8a477','#dec69b'],tunisie:['#80b7c6','#a7b6a4','#e1cfad'],maroc:['#a4abae','#b49b7f','#ccae87'],espagne:['#c49b98','#a48e83','#cfad96']};
export const countryPalette=id=>PALETTES[id]||['#87b6bf','#688b80','#e0d6b6'];
export function bakeGeometry(source,matrix){
 const geometry=source.index?source.toNonIndexed():source.clone();
 // Meshopt positions are normalized integer attributes. World-space baking must
 // use floats, otherwise values outside [-1, 1] wrap in the integer buffer.
 for(const [name,a] of Object.entries(geometry.attributes))if(!(a.array instanceof Float32Array)){
  const values=new Float32Array(a.count*a.itemSize),read=['getX','getY','getZ','getW'];
  for(let i=0;i<a.count;i++)for(let j=0;j<a.itemSize;j++)values[i*a.itemSize+j]=a[read[j]](i);
  geometry.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize));
 }
 return geometry.applyMatrix4(matrix);
}
export function createLandscape(models,region,save){
 const root=new THREE.Group(),owned=[],materials=new Map(),collisions=[],residents=[],stages=[],decorations=[];
 const country=countryById[region],hub=!country,colors=countryPalette(region),restored=()=>chapterState(save,region).restored;
 const mat=(hex,extra={})=>{const key=JSON.stringify([hex,extra]);if(!materials.has(key)){const m=new THREE.MeshStandardMaterial({color:hex,roughness:.88,...extra});materials.set(key,m);owned.push(m);}return materials.get(key);};
 const geometry=(g)=>{owned.push(g);return g;};
 const box=geometry(new THREE.BoxGeometry(1,1,1)),cyl=geometry(new THREE.CylinderGeometry(1,1,1,64)),ball=geometry(new THREE.IcosahedronGeometry(1,1));
 function shape(g,m,x,y,z,sx,sy,sz,parent=root){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function asset(name,x,z,scale=1,rotation=0,parent=root){const source=models.kit.scene.getObjectByName(name);if(!source)throw Error('Élément 3D manquant : '+name);const object=source.clone(true);object.position.set(x,0,z);object.rotation.y=rotation;object.scale.setScalar(scale);parent.add(object);return object;}
 function batch(group){
  group.updateMatrixWorld(true);const byMaterial=new Map(),inverse=new THREE.Matrix4().copy(group.matrixWorld).invert();
  group.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material)||o.material.transparent)return;const key=o.material.uuid;if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(o);});
  for(const meshes of byMaterial.values())if(meshes.length>1){const geometries=meshes.map(o=>bakeGeometry(o.geometry,new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;owned.push(merged);const m=new THREE.Mesh(merged,meshes[0].material);m.receiveShadow=true;m.castShadow=true;meshes.forEach(o=>o.removeFromParent());group.add(m);}
 }
 function resident(x,z,color,parent=root,kind){const hero=createResident(models.kit,kind||['woman','artisan','elder','traveler'][residents.length%4],color);hero.object.position.set(x,0,z);parent.add(hero.object);residents.push({hero,x,z,phase:residents.length*1.7,parent});return hero;}
 if(!hub){
  shape(cyl,mat('#536b70'),0,-3.7,0,78,7,78);shape(cyl,mat(colors[1]),0,-.2,0,77,.4,77);
  const paving=mat(colors[2]);shape(cyl,paving,0,.015,0,13,.07,13);
  const sea=shape(geometry(new THREE.PlaneGeometry(900,900)),mat('#629ba8',{roughness:.32,metalness:.25}),0,-7.7,0,1,1,1);sea.rotation.x=-Math.PI/2;
  const destinations=[[0,20],[11,-4],[-20,0],[18,-16],[-8,-39],[-9,5],[27,7],[-32,-20],[9,-31],[0,-57]];
  for(const [x,z] of destinations){const n=Math.ceil(Math.hypot(x,z)/2.7);for(let i=1;i<=n;i++){const t=i/n,px=x*t,pz=z*t;const tile=shape(box,paving,px,.07,pz,3.9,.14,2.55);tile.rotation.y=Math.atan2(x,z);}}
  // Shared ground landmarks leave every route clear. All country-specific detail is an authored Blender asset.
  collisions.push({x:35,z:-35,r:8.5});
  const tree=['algerie','tunisie','maroc'].includes(region)?'Palm':region==='estonie'?'Pine':'Tree';
  for(let i=0;i<25;i++){const a=i/25*Math.PI*2,r=58+(i%3)*5,x=Math.sin(a)*r,z=Math.cos(a)*r;asset(tree,x,z,.85+(i%4)*.13,a);collisions.push({x,z,r:.5});}
  for(const [x,z,a] of [[-25,-12,.3],[-28,17,.3],[-39,18,.3],[-48,-10,.6],[-40,-46,.15],[30,21,-.4],[53,-4,-.7]]){asset('House',x,z,.9,a);collisions.push({x,z,r:3.5});}
  for(const [x,z] of [[-15,16],[-30,-7],[24,-27]]){asset(tree,x,z,1.05);collisions.push({x,z,r:.6});asset('Planter',x+2,z,1.2);}
  for(const [x,z] of [[-23,10],[21,14],[-18,-20],[17,-31]]){asset('GardenArch',x,z,.65,.2);collisions.push({x:x-1.65,z,r:.5},{x:x+1.65,z,r:.5});}
  shape(cyl,paving,0,.1,-57,11,.2,11);
  const monument=shape(cyl,mat(country.color,{metalness:.3}),11,.16,-4,2.8,.3,2.8);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;shape(cyl,mat('#d9c18f'),11+Math.sin(a)*2,.55,-4+Math.cos(a)*2,.28,1.1,.28);}
  for(let i=0;i<11;i++){const x=i%2?-6:6,z=12-i*5.8;asset('Lantern',x,z,.7);}
  // Small color variation on the meadow reads as crafted ground without a large repeating texture.
  for(let i=0;i<85;i++){const a=i*2.39996,r=22+(i%17)*2.7,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<9||destinations.some(([px,pz])=>Math.hypot(px-x,pz-z)<7))continue;shape(ball,mat(region==='estonie'?'#dae4d7':'#6a9777'),x,.24,z,.5+(i%3)*.16,.45,.55);if(i%3===0)shape(ball,mat('#dcba91'),x,.65,z,.16,.18,.16);}
  const foundation=shape(box,mat('#8d9483'),42,.6,8,5.4,1.2,4.2);collisions.push({x:42,z:8,r:3.5});
  batch(root);
  const landmark=new THREE.Group(),ruin=new THREE.Group();root.add(landmark,ruin);asset('Landmark_'+region,35,-35,1.6,-.18,landmark);const old=asset('Landmark_'+region,35,-35,1.6,-.18,ruin),remove=[];old.traverse(o=>{if(o.isMesh&&!/limestone|porcelain|walnut/.test(o.material.name))remove.push(o);});remove.forEach(o=>o.removeFromParent());batch(landmark);batch(ruin);decorations.push({landmark,ruin});
  const guide=resident(14,-1,country.color,root,['france','estonie','algerie','espagne'].includes(region)?'woman':region==='italie'||region==='maroc'?'artisan':'traveler');guide.object.rotation.y=-.5;
  for(let stage=1;stage<=3;stage++){
   const group=new THREE.Group();root.add(group);stages.push({group,stage});
   const positions=stage===1?[[-22,4],[-18,4]]:stage===2?[[28,13],[33,13]]:[[-27,-36],[-32,-38]];
   for(const [x,z] of positions){asset('Planter',x,z,1.3,0,group);asset('Bench',x,z+3,1,0,group);}
   if(stage===3){asset('Market',-30,-42,1.1,.2,group);asset('Lantern',-24,-40,1,0,group);}
   if(stage===2)asset('House',42,8,.9,-.2,group);
   batch(group);for(const [x,z] of positions)resident(x+2,z+2,country.color,group);
  }
  const garden=new THREE.Group(),workshop=new THREE.Group();root.add(garden,workshop);asset('Tree',31,15,.8,0,garden);asset('Planter',26,17,1,0,garden);asset('Market',31,15,1,0,workshop);asset('Lantern',26,17,1,0,workshop);batch(garden);batch(workshop);decorations.push({garden,workshop});
  // The card-made crossing and the aurora reveal become visible after the three powers.
  const passage=new THREE.Group();root.add(passage);for(let i=0;i<7;i++)shape(box,mat('#c6ddd0',{emissive:country.color,emissiveIntensity:.12}),11+i*.6,.13,-7-i,2.2,.22,1,passage);batch(passage);decorations.push({passage});
  if(region==='estonie'||region==='turquie'){
   const geom=geometry(new THREE.PlaneGeometry(95,12,30,4));const m=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{time:{value:0},tint:{value:new THREE.Color(region==='estonie'?'#62e9d5':'#cc9ee5')}},vertexShader:'varying vec2 uv0;uniform float time;void main(){uv0=uv;vec3 p=position;p.z+=sin(p.x*.09+time*.3)*7.;p.y+=sin(p.x*.13+time*.2)*2.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'varying vec2 uv0;uniform vec3 tint;uniform float time;void main(){float a=sin(uv0.y*3.14159)*(.22+.1*sin(uv0.x*45.+time*.4));gl_FragColor=vec4(tint,a);}'});owned.push(m);const aurora=new THREE.Mesh(geom,m);aurora.position.set(0,21,-51);root.add(aurora);decorations.push({aurora});
  }
 }else{
  for(const [index,c] of COUNTRIES.entries()){
   const group=new THREE.Group();root.add(group);stages.push({group,country:c.id});
   const a=index/8*Math.PI*2,x=Math.sin(a)*29,z=Math.cos(a)*29;
   asset('Planter',x,z,1.05,a,group);asset('Lantern',x+2,z,1,0,group);asset('Landmark_'+c.id,x+3,z-2,.35,a,group);batch(group);resident(x,z+2,c.color,group);
  }
  const garden=new THREE.Group(),workshop=new THREE.Group();root.add(garden,workshop);for(const x of [-14,14]){asset('Planter',x,15,1.3,0,garden);asset('Market',x,15,.85,0,workshop);}batch(garden);batch(workshop);decorations.push({garden,workshop});
 }
 function update(next){save=next;for(const s of stages)s.group.visible=s.country?chapterState(save,s.country).restored===3:restored()>=s.stage;for(const d of decorations){if(d.landmark){d.landmark.visible=restored()===3;d.ruin.visible=restored()<3;}if(d.passage)d.passage.visible=chapterState(save,region).powers.length===3;if(d.garden){const active=hub?nexusLevel(save)>0:restored()>=2,choice=hub?save.adventure.nexusStyle:chapterState(save,region).choice;d.garden.visible=active&&choice==='garden';d.workshop.visible=active&&choice==='workshop';}}}
 update(save);
 return {root,collisions,update,tick(time,dt,position){
  for(const r of residents){const active=r.parent.visible&&Math.hypot(position.x-r.x,position.z-r.z)<37;r.hero.object.visible=active;if(active){r.hero.update(dt,0,0,0);r.hero.object.rotation.y=Math.sin(time*.2+r.phase)*.3+r.phase;}}
  for(const d of decorations)if(d.aurora){d.aurora.visible=region==='turquie'||chapterState(save,region).powers.length>=2;d.aurora.material.uniforms.time.value=time;}
 },dispose(){residents.forEach(r=>r.hero.dispose());owned.forEach(r=>r.dispose());}};
}
