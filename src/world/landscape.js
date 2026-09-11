import {frontierState} from './frontier.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {COUNTRIES,countryById} from './catalog.js';
import {chapterState} from './chapters.js';
import {createResident} from './models.js';
import {createArchitecture} from './architecture.js';
import {createSceneryOcclusion} from './occlusion.js';
import {addLivingPlaces,livingPlaceCollisions} from './places.js';
import {addSettlement} from './settlement-mesh.js';
import {surfaceTexture} from './surfaces.js';
import {createMeadowGeometry,createMeadowMaterial} from './vegetation.js';
import {BIOMES,createTerrainField,randomFor,toLandscape} from './terrain.js';
export const countryPalette=id=>{const b=BIOMES[id]||BIOMES.hub;return[b.sky,b.low,b.high];};
export function bakeGeometry(source,matrix){
 const geometry=source.index?source.toNonIndexed():source.clone();
 for(const [name,a] of Object.entries(geometry.attributes))if(!(a.array instanceof Float32Array)){
  const values=new Float32Array(a.count*a.itemSize),read=['getX','getY','getZ','getW'];
  for(let i=0;i<a.count;i++)for(let j=0;j<a.itemSize;j++)values[i*a.itemSize+j]=a[read[j]](i);
  geometry.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize));
 }
 return geometry.applyMatrix4(matrix);
}
export function createLandscape(models,region,save){
 const root=new THREE.Group(),owned=[],materials=new Map(),collisions=[],residents=[],stages=[],decorations=[],frontierGroups=[],resourceGroups=[];
 const country=countryById[region],hub=!country,field=createTerrainField(region,save),{biome,lake,height}=field;
 const rng=randomFor(biome.seed),occlusion=createSceneryOcclusion(),architecture=createArchitecture(occlusion);
 const mat=(color,extra={})=>{const key=JSON.stringify([color,extra]);if(!materials.has(key)){const m=new THREE.MeshStandardMaterial({color,roughness:.92,...extra});materials.set(key,m);owned.push(m);}return materials.get(key);};
 const geo=g=>(owned.push(g),g),box=geo(new THREE.BoxGeometry(1,1,1)),ball=geo(new THREE.IcosahedronGeometry(1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,24));
 const frond=geo(new THREE.BufferGeometry()),leafPositions=[],leafIndices=[];
 for(let i=0;i<=10;i++){const t=i/10,x=t*4.5,y=Math.sin(t*Math.PI)*1.15-t*.85,w=Math.sin(t*Math.PI)*.67;leafPositions.push(x,y,-w,x,y+.18*Math.sin(t*Math.PI),0,x,y,w);if(i<10){const a=i*3;leafIndices.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}}
 frond.setAttribute('position',new THREE.Float32BufferAttribute(leafPositions,3));frond.setIndex(leafIndices);frond.computeVertexNormals();
 function shape(geometry,material,x,y,z,sx=1,sy=sx,sz=sx,parent=root){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;}
 function asset(name,x,z,scale=1,rotation=0,parent=root){const source=models.kit.scene.getObjectByName(name);if(!source)throw Error('Élément 3D manquant : '+name);const object=source.clone(true);object.position.set(x,height(x,z),z);object.rotation.y=rotation;object.scale.setScalar(scale);parent.add(object);return object;}
 function batch(group){
  group.updateMatrixWorld(true);const byMaterial=new Map(),inverse=new THREE.Matrix4().copy(group.matrixWorld).invert();
  group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(o.material)||o.material.transparent||o.material.vertexColors)return;const key=o.material.uuid;if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(o);});
  for(const meshes of byMaterial.values())if(meshes.length>1){const geometries=meshes.map(o=>bakeGeometry(o.geometry,new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld))),merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;owned.push(merged);const m=new THREE.Mesh(merged,meshes[0].material);m.receiveShadow=true;m.castShadow=true;meshes.forEach(o=>o.removeFromParent());group.add(m);}
 }
 function resident(x,z,color,parent=root,kind='traveler',route=null){if(route?.points){route.lengths=route.points.slice(1).map((p,i)=>Math.hypot(p.x-route.points[i].x,p.z-route.points[i].z));route.total=route.lengths.reduce((a,b)=>a+b,0);}const hero=createResident(models.kit,kind,color);hero.object.position.set(x,height(x,z),z);parent.add(hero.object);residents.push({hero,x,z,parent,route,phase:residents.length*1.7});return hero;}
 function house(id,x,z,rotation=0,variant=0,parent=root,urban=true){const h=architecture.building(id,variant,{urban}),y=height(x,z),{width,depth}=h.userData.dimensions;h.position.set(x,y,z);h.rotation.y=rotation;parent.add(h);const base=shape(box,mat(biome.rock),x,y-.4,z,width+.4,.8,depth+.4,parent);base.rotation.y=rotation;collisions.push({x,z,width:width+.4,depth:depth+.4,rotation});}
 function tree(x,z,size=1,type=biome.tree){
  if(type==='Palm'){
   const y=height(x,z),h=6.2*size;shape(cylinder,mat('#806746'),x,y+h/2,z,.28*size,h,.28*size);
   for(let i=1;i<9;i++)shape(cylinder,mat('#9c8359'),x,y+h*i/10,z,.3*size,.08*size,.3*size);
   for(let i=0;i<9;i++){const leaf=shape(frond,mat(i%2?'#496f4d':'#608158',{side:THREE.DoubleSide}),x,y+h,z,size);leaf.rotation.y=i/9*Math.PI*2;leaf.rotation.z=i%2?.1:-.08;}
   for(let i=0;i<3;i++){const a=i/3*Math.PI*2;shape(ball,mat('#746047'),x+Math.cos(a)*.3,y+h-.3,z+Math.sin(a)*.3,.25*size);}
  }
  else if(type==='Cypress'){shape(cylinder,mat('#665443'),x,height(x,z)+2,z,.22,4,.22);shape(ball,mat('#334f3b'),x,height(x,z)+5,z,1.1*size,4.3*size,1.1*size);}
  else asset(type,x,z,size,rng()*Math.PI*2);
  collisions.push({x,z,r:.65});
 }
 // One continuous surface, with no radial paths or raised navigation decks.
 const ground=geo(new THREE.PlaneGeometry(420,420,168,168));ground.rotateX(-Math.PI/2);
 const positions=ground.getAttribute('position'),colors=new Float32Array(positions.count*3),low=new THREE.Color(biome.low),high=new THREE.Color(biome.high),rock=new THREE.Color(biome.rock),color=new THREE.Color();
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),y=height(x,z);positions.setY(i,y);const mottling=.48+.12*Math.sin(x*.17)*Math.cos(z*.19)+.06*Math.sin(x*1.37-z*.82),slope=Math.abs(height(x+.7,z)-y)+Math.abs(height(x,z+.7)-y);color.copy(low).lerp(high,Math.max(0,Math.min(1,mottling))).lerp(rock,Math.min(.8,slope*.55));colors.set(color.toArray(),i*3);}
 ground.setAttribute('color',new THREE.BufferAttribute(colors,3));ground.computeVertexNormals();const soil=surfaceTexture('earth');if(soil){soil.repeat.set(90,90);owned.push(soil);}const terrain=shape(ground,mat('#ffffff',{vertexColors:true,map:soil,bumpMap:soil,bumpScale:.085}),0,0,0);terrain.castShadow=false;
 collisions.push({x:lake.x,z:lake.z,r:lake.r-1});
 const waterMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0},color:{value:new THREE.Color(region==='estonie'?'#3b7d89':'#4d9697')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform float time;uniform vec3 color;void main(){float waves=sin(p.x*2.4+p.y*.8+time*.8)*sin(p.y*3.1-time*.55);float light=pow(max(0.,waves),12.);gl_FragColor=vec4(color+vec3(.12,.17,.14)*waves*.18+light*.13,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});owned.push(waterMat);
 const water=shape(geo(new THREE.CircleGeometry(lake.r+2,64)),waterMat,lake.x,-1.5,lake.z);water.rotation.x=-Math.PI/2;water.castShadow=false;
 for(let i=0;i<20;i++){const a=rng()*Math.PI*2,r=lake.r+3+rng()*2,x=lake.x+Math.cos(a)*r,z=lake.z+Math.sin(a)*r;shape(ball,mat(biome.rock),x,height(x,z)-.1,z,.7+rng(),.4+rng()*.6,.7+rng());}
 for(let i=0;i<110;i++){const a=rng()*Math.PI*2,r=23+Math.sqrt(rng())*104,x=Math.cos(a)*r,z=Math.sin(a)*r;if(field.protectedPoint(x,z,3)||Math.abs(height(x,z))>13)continue;tree(x,z,.85+rng()*.65);}
 for(let i=0;i<48;i++){const x=(rng()-.5)*250,z=(rng()-.5)*250;if(field.protectedPoint(x,z,4))continue;const size=1.2+rng()*2.3;const stone=shape(ball,mat(biome.rock),x,height(x,z)+size*.2,z,size,size*.6,size*.8);stone.rotation.set(rng(),rng()*6,rng()*.2);collisions.push({x,z,r:size*.7});}
 // Thousands of grass blades share a single draw call.
 const blade=geo(createMeadowGeometry()),meadow=createMeadowMaterial(region==='algerie'||region==='maroc'?'#afb278':'#87a56c');owned.push(meadow.material);const reduceWind=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const count=2400,grass=new THREE.InstancedMesh(blade,meadow.material,count),dummy=new THREE.Object3D();let filled=0;
 for(let i=0;i<count*3&&filled<count;i++){const x=(rng()-.5)*245,z=(rng()-.5)*245;if(field.protectedPoint(x,z,2)||height(x,z)>13)continue;dummy.position.set(x,height(x,z),z);dummy.rotation.set(0,rng()*6,.12);const s=.35+rng()*.6;dummy.scale.set(s,s,s);dummy.updateMatrix();grass.setMatrixAt(filled++,dummy.matrix);}
 grass.count=filled;grass.instanceMatrix.needsUpdate=true;grass.computeBoundingSphere();grass.boundingSphere.radius+=.5;grass.receiveShadow=true;root.add(grass);
 if(hub){
  addSettlement({region,field,root,shape,box,cylinder,ball,geo,mat,asset,resident,owned});
  const core=toLandscape(region,0,-3);shape(cylinder,mat('#d9ceb0'),core.x,.18,core.z,3,.36,3);const orb=shape(ball,mat('#76bac0',{emissive:'#5a979e',emissiveIntensity:.3,metalness:.4}),core.x,3.5,core.z,1.1);decorations.push({orb});
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=core.x+Math.cos(a)*18,z=core.z+Math.sin(a)*18;asset('Bench',x,z,.95,-a+Math.PI/2);asset('Planter',x+Math.sin(a)*3,z-Math.cos(a)*3,1.2);}
  for(const radius of [4.2,7,21]){const ring=geo(new THREE.TorusGeometry(radius,.07,4,96));ring.rotateX(-Math.PI/2);const rim=shape(ring,mat('#dbbb76',{metalness:.45,roughness:.48}),core.x,.1,core.z);rim.castShadow=false;}
  for(let i=0;i<3;i++){const ring=shape(geo(new THREE.TorusGeometry(1.9,.065,8,64)),mat('#d8bd80',{metalness:.5}),core.x,3.5,core.z);ring.rotation.set(Math.PI/3+i*.7,i*Math.PI/3,.4);}
  for(const [index,c] of COUNTRIES.entries()){
   const p=toLandscape(region,...c.portal),site=field.buildings[index];house(site.id,site.x,site.z,site.rotation,site.variant);tree(p.x-10,p.z-7,.95,BIOMES[c.id].tree);
   const group=new THREE.Group();root.add(group);const workshop=new THREE.Group(),garden=new THREE.Group();group.add(workshop,garden);asset('Market',p.x+10,p.z+6,.85,0,workshop);asset('Planter',p.x-9,p.z+4,1.6,0,garden);asset('Tree',p.x+9,p.z+6,.85,0,garden);batch(workshop);batch(garden);stages.push({group,country:c.id,workshop,garden});resident(p.x+7,p.z+5,c.color,group,index%2?'artisan':'woman');
  }
 }else{
  for(const p of field.buildings)house(region,p.x,p.z,p.rotation,p.variant,root,p.urban);
  addSettlement({region,field,root,shape,box,cylinder,ball,geo,mat,asset,resident,owned});
  const p=toLandscape(region,35,-35),landmark=new THREE.Group(),ruin=new THREE.Group();root.add(landmark,ruin);asset('Landmark_'+region,p.x,p.z,1.5,biome.angle,landmark);const old=asset('Landmark_'+region,p.x,p.z,1.5,biome.angle,ruin),remove=[];old.traverse(o=>{if(o.isMesh&&!/limestone|porcelain|walnut/.test(o.material.name))remove.push(o);});remove.forEach(o=>o.removeFromParent());batch(landmark);batch(ruin);decorations.push({landmark,ruin});collisions.push({x:p.x,z:p.z,r:9});
  const guide=field.anchors.find(i=>i.type==='story');resident(guide.x+2.2,guide.z,country.color,root,['france','estonie','algerie','espagne'].includes(region)?'woman':'artisan');
  for(let stage=1;stage<=3;stage++){
   const group=new THREE.Group();root.add(group);stages.push({group,stage});const p=toLandscape(region,...[[-22,8],[29,15],[-30,-39]][stage-1]);asset('Bench',p.x,p.z,1,biome.angle,group);asset('Planter',p.x+3,p.z+2,1.2,0,group);asset('Lantern',p.x-2,p.z+2,.8,0,group);if(stage===3)asset('Market',p.x,p.z-5,1,0,group);batch(group);resident(p.x+1,p.z+2,country.color,group,stage===2?'elder':'traveler');
  }
  const choice=toLandscape(region,33,18),garden=new THREE.Group(),workshop=new THREE.Group();root.add(garden,workshop);asset('Planter',choice.x,choice.z,1.4,0,garden);asset('Tree',choice.x+4,choice.z,.8,0,garden);asset('Market',choice.x,choice.z,1,biome.angle,workshop);batch(garden);batch(workshop);decorations.push({garden,workshop});
  const grove=new THREE.Group();root.add(grove);for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=guide.x+Math.cos(a)*4,z=guide.z+Math.sin(a)*4;const flower=shape(ball,mat(country.color,{emissive:country.color,emissiveIntensity:.5}),x,height(x,z)+.35,z,.18,.65,.18,grove);flower.rotation.z=.2;}batch(grove);decorations.push({grove});
 }
 if(!hub){
  const camp=field.anchors.find(a=>a.type==='camp');
  if(camp){
   const building=new THREE.Group();root.add(building);house(region,camp.x-13,camp.z,biome.angle,3,building,false);batch(building);frontierGroups.push({kind:'camp',group:building,collision:collisions.at(-1)});
   const forge=new THREE.Group();root.add(forge);asset('Market',camp.x,camp.z-12,1.6,0,forge);asset('Bench',camp.x-3,camp.z-10,1.35,0,forge);batch(forge);frontierGroups.push({kind:'forge',group:forge});
   const garden=new THREE.Group();root.add(garden);for(const z of [-3,3])asset('Planter',camp.x+12,camp.z+z,2.1,0,garden);asset('Tree',camp.x+12,camp.z,.8,0,garden);batch(garden);frontierGroups.push({kind:'garden',group:garden});
   const symbol=shape(geo(new THREE.TorusGeometry(1.8,.12,6,40,Math.PI*1.72)),mat('#cfb579',{metalness:.45}),camp.x,height(camp.x,camp.z)+3.6,camp.z);symbol.rotation.z=.3;shape(cylinder,mat('#c7bfa7'),camp.x,height(camp.x,camp.z)+.2,camp.z,2.6,.4,2.6);
  }
  for(const item of field.anchors.filter(a=>a.type==='resource')){
   const group=new THREE.Group(),{x,z}=item,y=height(x,z);root.add(group);
   if(item.resource==='wood')for(let i=0;i<4;i++){const log=shape(cylinder,mat('#886b4a'),x+(i%2)*.7-.35,y+.4+Math.floor(i/2)*.65,z,.36,2.8,.36,group);log.rotation.x=Math.PI/2;}
   if(item.resource==='stone')for(let i=0;i<4;i++)shape(ball,mat(biome.rock),x+(i%2)*1.1-.55,y+.3+Math.floor(i/2)*.5,z,.8,.55,.75,group);
   if(item.resource==='food'){asset('Planter',x,z,1.6,0,group);for(let i=0;i<5;i++)shape(ball,mat('#d0a266'),x-.8+i*.4,y+1.1,z,.19,.25,.19,group);}
   batch(group);resourceGroups.push({group,id:item.resource});
  }
 }
 const authored=addLivingPlaces(models,region,root,height);collisions.push(...livingPlaceCollisions(region));
 for(const group of authored.groups)group.traverse(o=>{if(o.isMesh)for(const m of [o.material].flat())occlusion.apply(m);});
 // Batch only static descendants. Keep visibility stages separate.
 const dynamic=[...frontierGroups.map(p=>p.group),...resourceGroups.map(p=>p.group),...authored.groups,...stages.map(s=>s.group),...decorations.flatMap(d=>[d.landmark,d.ruin,d.garden,d.workshop,d.grove].filter(Boolean)),...residents.filter(r=>r.parent===root).map(r=>r.hero.object)];
 for(const g of dynamic)g.removeFromParent();batch(root);for(const g of dynamic)if(!g.parent)root.add(g);
 function update(next){save=next;const home=frontierState(save,region);for(const p of frontierGroups){p.group.visible=home[p.kind]>0;if(p.collision)p.collision.enabled=p.group.visible;}for(const p of resourceGroups)p.group.visible=!home.harvest.includes(p.id);authored.update(save);const s=chapterState(save,region);for(const stage of stages){stage.group.visible=stage.country?chapterState(save,stage.country).restored===3:s.restored>=stage.stage;if(stage.workshop){stage.workshop.visible=save.adventure.nexusStyle==='workshop';stage.garden.visible=!stage.workshop.visible;}}for(const d of decorations){if(d.landmark){d.landmark.visible=s.restored===3;d.ruin.visible=s.restored<3;}if(d.grove)d.grove.visible=s.powers.length===3;if(d.garden){d.garden.visible=s.restored>=2&&s.choice==='garden';d.workshop.visible=s.restored>=2&&s.choice==='workshop';}}}
 update(save);
 return{root,ground:terrain,collisions,height,field,update,updateCamera:occlusion.update,tick(time,dt,position){meadow.time.value=reduceWind?0:time;waterMat.uniforms.time.value=time;for(const r of residents){r.hero.object.visible=r.parent.visible&&(r.route?Math.min(...r.route.points.map(p=>Math.hypot(position.x-p.x,position.z-p.z)))<38:Math.hypot(position.x-r.x,position.z-r.z)<46);if(r.hero.object.visible){if(r.route){const path=r.route,total=path.total,cycle=((time+path.offset)*path.speed)%(total*2+12);let along=Math.max(0,Math.min(total,cycle<=total+6?cycle:total*2+6-cycle)),index=0;
while(along>path.lengths[index]&&index<path.lengths.length-1)along-=path.lengths[index++];const t=along/path.lengths[index],a=path.points[index],b=path.points[index+1],x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,dx=x-r.hero.object.position.x,dz=z-r.hero.object.position.z;r.hero.object.position.set(x,height(x,z),z);r.hero.update(dt,dx,dz,Math.hypot(dx,dz));}else{r.hero.update(dt);r.hero.object.position.y=height(r.x,r.z)+Math.sin(time*1.4+r.phase)*.012;r.hero.object.rotation.y=Math.sin(time*.14+r.phase)*.17+r.phase;}}}for(const d of decorations)if(d.orb){d.orb.rotation.y=time*.2;d.orb.position.y=3.5+Math.sin(time)*.15;}},dispose(){authored.dispose();residents.forEach(r=>r.hero.dispose());architecture.dispose();owned.forEach(r=>r.dispose());}};
}
