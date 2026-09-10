import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadWorldModels,createKais} from './models.js';
import {advanceMotion,pointerStick,createQualityController} from './motion.js';
import {COUNTRIES,countryById} from './catalog.js';
import {ORIGINAL_ART} from './art.js';
import {findPath} from './navigation.js';
import {clamp,distance,moveWithCollision,nearestInteraction,worldItems,teamStats} from './rules.js';

const UP=new THREE.Vector3(0,1,0);
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
export function createWorldScene(canvas,{save,onSnapshot,onInteract,onActivity,onError,onLoadState}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 const quality=createQualityController();renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.3,340);
 const hemi=new THREE.HemisphereLight(0xd1edff,0x718781,1.6);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffe5bd,2.3);sun.position.set(-24,60,24);scene.add(sun);scene.add(sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;sun.shadow.camera.updateProjectionMatrix();
 const cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(UP,0),intersection=new THREE.Vector3();
 let root=new THREE.Group(),resources=[],animations=[],obstacles=[],items=[],region=save.region,position={x:0,z:region==='hub'?8:5},target=null,waypoint=null,route=[];
 let paused=false,disposed=false,held=null,stick={x:0,z:0},keys=new Set(),moving=false,elapsed=0,last=performance.now(),report=0,raf,frames=0,frameTime=0,fps=60;
 let avatar,companion,atlasTexture,portalMeshes=[],cooldowns=new Map(),itemVisuals=new Map();
 let stats=teamStats(save),models=null,hero=null,needsRender=true,materialCache=new Map();
 const register=asset=>{resources.push(asset);return asset;};
 const material=(color,extra={})=>{const key=JSON.stringify([color,extra]);if(!materialCache.has(key))materialCache.set(key,register(new THREE.MeshStandardMaterial({color,roughness:.84,metalness:.08,...extra})));return materialCache.get(key);};
 const geometry={box:new THREE.BoxGeometry(1,1,1),plane:new THREE.PlaneGeometry(1,1),cylinder:new THREE.CylinderGeometry(1,1,1,20),cone:new THREE.ConeGeometry(1,1,8),sphere:new THREE.IcosahedronGeometry(1,1),ring:new THREE.TorusGeometry(1,.075,8,48)};
 const geo=(g)=>geometry[g];
 function mesh(g,mat,x,y,z,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(typeof g==='string'?geo(g):g,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);return m;}
 function instances(g,mat,transforms){
  if(!transforms.length)return;
  const m=new THREE.InstancedMesh(geo(g),mat,transforms.length),d=new THREE.Object3D();
  transforms.forEach((t,i)=>{d.position.set(t[0],t[1],t[2]);d.scale.set(t[3],t[4],t[5]);d.rotation.set(t[6]||0,t[7]||0,t[8]||0);d.updateMatrix();m.setMatrixAt(i,d.matrix);});m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();root.add(m);return m;
 }
 function label(text,x,y,z,color='#ffffff',size=8){
  const cv=document.createElement('canvas');cv.width=512;cv.height=96;const ctx=cv.getContext('2d');
  ctx.fillStyle='rgba(8,18,30,.72)';ctx.beginPath();ctx.roundRect(8,8,496,80,24);ctx.fill();
  ctx.font='500 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,48,464);
  const tex=register(new THREE.CanvasTexture(cv));tex.colorSpace=THREE.SRGBColorSpace;
  const mat=register(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true})),sprite=new THREE.Sprite(mat);sprite.position.set(x,y,z);sprite.scale.set(size,size*96/512,1);root.add(sprite);return sprite;
 }
 function glowTexture(){const cv=document.createElement('canvas');cv.width=cv.height=64;const ctx=cv.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.22,'rgba(255,255,255,.7)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return register(new THREE.CanvasTexture(cv));}
 function portrait(sprite,id){
  const art=ORIGINAL_ART[id];if(!art||sprite.userData.cardArt===id)return;
  if(sprite.userData.sheet!==art.src){sprite.material.map?.dispose();sprite.material.map=register(new THREE.TextureLoader().load(art.src));sprite.material.map.colorSpace=THREE.SRGBColorSpace;sprite.material.needsUpdate=true;sprite.userData.sheet=art.src;}
  const [x,y,w,h]=art.portrait;sprite.material.map.repeat.set(w/art.width,h/art.height);sprite.material.map.offset.set(x/art.width,1-(y+h)/art.height);sprite.userData.cardArt=id;
 }
 function portal(item){
  const index=Math.max(0,COUNTRIES.findIndex(c=>c.id===item.id));
  if(region!=='hub'){
   const stone=material('#c7c5ae'),trim=material(item.color,{emissive:item.color,emissiveIntensity:.25});
   for(const side of [-1,1]){mesh('box',stone,item.x+side*4.1,2.5,item.z,1.2,5,1.4);mesh('box',trim,item.x+side*4.1,2.6,item.z+.72,.4,3.9,.08);}
   const rim=mesh('ring',stone,item.x,4.1,item.z,3.7,4.3,1);rim.rotation.y=.13;
  }
  const filmGeo=register(new THREE.CircleGeometry(1,40));
  const filmMat=register(new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{time:{value:0},tint:{value:new THREE.Color(item.color)},art:{value:atlasTexture},tile:{value:new THREE.Vector2(index%4*.25,index<4?.5:0)}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float time; uniform vec3 tint; uniform sampler2D art; uniform vec2 tile; void main(){vec2 p=vUv-.5;float r=length(p)*2.;float ripple=sin(r*30.-time*2.5)*.5+.5;vec2 uv=vUv+sin(vUv.yx*10.+time*.4)*.006;vec3 c=texture2D(art,uv*vec2(.25,.5)+tile).rgb;float edge=pow(r,5.);gl_FragColor=vec4(mix(c,tint,edge*.6+ripple*.04),.96); }'}));
  mesh(filmGeo,filmMat,item.x,4.1,item.z+.1,3.3,3.8,1);portalMeshes.push(filmMat);
  label(item.name.toUpperCase(),item.x,11,item.z,item.color,10);
 }
 function batchStatic(){
  const dynamic=new Set([avatar,companion,...animations.map(a=>a.mesh),...[...itemVisuals.values()].flat()]),groups=new Map();
  for(const m of root.children){if(!m.isMesh||m.isInstancedMesh||dynamic.has(m)||m.material.transparent)continue;const key=m.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
  for(const meshes of groups.values())if(meshes.length>2){
   const geometries=meshes.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return g.applyMatrix4(m.matrix);});
   const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;
   const batch=new THREE.Mesh(register(merged),meshes[0].material);root.add(batch);meshes.forEach(m=>root.remove(m));
  }
 }
 function rebuild(nextRegion){
  hero?.dispose();scene.remove(root);resources.forEach(r=>r.dispose());resources=[];materialCache=new Map();root=new THREE.Group();scene.add(root);animations=[];portalMeshes=[];obstacles=[];itemVisuals=new Map();
  region=nextRegion;items=worldItems(region,save);position={x:0,z:region==='hub'?9:5};target=null;route=[];waypoint=null;keys.clear();stick={x:0,z:0};held=null;
  const c=countryById[region],hub=!c,rng=seeded(hub?832:COUNTRIES.indexOf(c)*371+17);
  atlasTexture=models.atlas;
  const sky=c?.sky||'#87b6bf',ground=c?.ground||'#688b80',stone=c?.stone||'#cfc7ae',accent=c?.color||'#e4cd94';
  const gold=material(accent,{emissive:accent,emissiveIntensity:.25,metalness:.5}),stoneMat=material(stone);
  const spriteTex=glowTexture(),spriteMat=register(new THREE.SpriteMaterial({map:spriteTex,color:accent,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.background=new THREE.Color(sky);scene.fog=new THREE.FogExp2(sky,hub?.004:.0045);
  if(hub){root.add(models.nexus.scene.clone(true));obstacles=models.collisions.map(o=>({...o}));}
  if(!hub){
  const tileCanvas=document.createElement('canvas');tileCanvas.width=tileCanvas.height=512;const tc=tileCanvas.getContext('2d');tc.fillStyle='#2c363d';tc.fillRect(0,0,512,512);for(let row=0;row<16;row++)for(let col=-1;col<16;col++){const v=180+Math.floor(rng()*38);tc.fillStyle=`rgb(${v},${v+6},${v+7})`;tc.fillRect(col*34+(row%2)*17+1,row*32+1,32,30);tc.strokeStyle='#ffffff0c';tc.strokeRect(col*34+(row%2)*17+2,row*32+2,30,28);}const tileTex=register(new THREE.CanvasTexture(tileCanvas));tileTex.wrapS=tileTex.wrapT=THREE.RepeatWrapping;tileTex.repeat.set(12,12);tileTex.colorSpace=THREE.SRGBColorSpace;
  const groundMat=material(ground,{map:tileTex}),edgeMat=material('#172630'),pathMat=material(hub?'#687572':'#a0947e',{map:tileTex});
  mesh('cylinder',edgeMat,0,-4.5,0,79,8,79);mesh('cylinder',groundMat,0,-.35,0,78,.7,78);
  const seaGeo=register(new THREE.PlaneGeometry(600,600));
  const seaMat=register(new THREE.ShaderMaterial({uniforms:{time:{value:0},tint:{value:new THREE.Color(sky)}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float time; uniform vec3 tint; void main(){float w=sin(vUv.y*330.+sin(vUv.x*70.+time*.2)*3.+time*.6)*.013;gl_FragColor=vec4(tint+vec3(.025,.07,.09)+w,1.);}'}));
  const sea=mesh(seaGeo,seaMat,0,-8,0);sea.rotation.x=-Math.PI/2;portalMeshes.push(seaMat);
  const pathTiles=[];
  function path(x,z){const length=Math.hypot(x,z),steps=Math.floor(length/2.4);for(let i=0;i<steps;i++){const t=i/steps;pathTiles.push([x*t,.045,z*t,3.7,.085,2.25,0,Math.atan2(x,z),0]);}}
  if(hub){
   COUNTRIES.forEach(c=>path(...c.portal));mesh('cylinder',pathMat,0,.04,0,12,.12,12);
   const circle=mesh('ring',gold,0,.2,0,11,11,1);circle.rotation.x=-Math.PI/2;
   mesh('cylinder',stoneMat,0,.6,-2,3,1.2,3);
   const crystal=mesh('sphere',gold,0,6,-2,1.6,3,1.6);animations.push({mesh:crystal,type:'float',y:6});
   label('LE NEXUS · 3B',0,10,-2,'#ecdcae',12);
  } else {
   path(0,-60);path(-34,-20);path(28,8);path(-20,0);path(18,-16);path(-8,-39);path(0,20);
   // The guardian's open arena stays free of obstacles.
   mesh('cylinder',pathMat,0,.12,-57,10,.22,10);
   const arena=mesh('ring',gold,0,.28,-57,9.4,9.4,1);arena.rotation.x=-Math.PI/2;
   label(c.title,0,10,-62,accent,17);
  }
  instances('box',pathMat,pathTiles);
  const rockT=[],trunkT=[],leafT=[],pillarT=[],roofT=[],buildingT=[],lampT=[],lampGlowT=[];
  function free(x,z,r=4){return Math.hypot(x,z)>15&&Math.abs(x)>7&&!items.some(i=>Math.hypot(x-i.x,z-i.z)<r+7)&&!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+r+1);}
  const biome=c?.biome||'nexus';
  for(let i=0;i<90;i++){
   const angle=rng()*Math.PI*2,rad=19+rng()*54,x=Math.sin(angle)*rad,z=Math.cos(angle)*rad,s=1+rng()*2;
   if(!free(x,z,s+1))continue;
   if(i%4===0 || ['desert','atlas','cliff'].includes(biome)&&i%2===0){rockT.push([x,s*.6,z,s*1.5,s*1.2,s,0,rng()*6,0]);obstacles.push({x,z,r:s});}
   else if(['ice','terrace','city','nexus','atlas'].includes(biome)){
    const height=3+rng()*4;trunkT.push([x,height/2,z,.28,height,.28]);
    for(let j=0;j<3;j++)leafT.push([x,height*.55+j*1.5,z,2.4-j*.45,3.5,2.4-j*.45]);obstacles.push({x,z,r:.7});
   } else {pillarT.push([x,2.5,z,.7,5,.7]);roofT.push([x,5.2,z,1.4,.4,1.4]);obstacles.push({x,z,r:1});}
  }
  // Silhouettes around the island distinguish all eight regions without loading assets.
  for(let i=0;i<18;i++){
   const angle=i/18*Math.PI*2,radius=67+(i%2)*3,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
   if(!free(x,z,4))continue;
   const h=4+rng()*7;
   if(['city','terrace','nexus'].includes(biome)){
    buildingT.push([x,h/2,z,5,h,4,0,-angle,0]);roofT.push([x,h+.4,z,5.7,.8,4.7,0,-angle,0]);obstacles.push({x,z,r:3.2});
    for(let k=0;k<3;k++)lampGlowT.push([x-1.5+k*1.5,h*.7,z+2.04,.4,.8,.08]);
   } else if(biome==='dome'){
    mesh('cylinder',stoneMat,x,h/2,z,3,h,3);mesh('sphere',gold,x,h,z,3.2,2.3,3.2);obstacles.push({x,z,r:3.4});
   } else if(['desert','atlas','coast'].includes(biome)){
    pillarT.push([x-3,3,z,1.3,6,1.3],[x+3,3,z,1.3,6,1.3]);roofT.push([x,6,z,8,1.2,2]);obstacles.push({x:x-3,z,r:1.1},{x:x+3,z,r:1.1});
   } else if(biome==='cliff'){
    mesh('cylinder',stoneMat,x,3,z,2,6,2);const blades=new THREE.Group();blades.position.set(x,6,z+2);
    const bm=material('#ecd5ae');for(let k=0;k<2;k++){const bar=new THREE.Mesh(geo('box'),bm);bar.scale.set(.45,8,.12);bar.rotation.z=k*Math.PI/2;blades.add(bar);}root.add(blades);animations.push({mesh:blades,type:'wind'});obstacles.push({x,z,r:2.2});
   } else rockT.push([x,3,z,3,6,3,0,angle,0]);
  }
  function arch(x,z){mesh('box',stoneMat,x-4,3,z,1.5,6,2);mesh('box',stoneMat,x+4,3,z,1.5,6,2);mesh('box',stoneMat,x,6.3,z,10,1,2.3);mesh('box',gold,x,6.9,z,10.2,.12,2.5);obstacles.push({x:x-4,z,r:1.2},{x:x+4,z,r:1.2});}
  function palm(x,z){const trunk=mesh('cylinder',material('#8b7551'),x,3,z,.3,6,.3);trunk.rotation.z=.12;for(let k=0;k<6;k++){const angle=k/6*Math.PI*2,leaf=mesh('cone',material('#58896a'),x+Math.sin(angle)*1.6,5.8,z+Math.cos(angle)*1.6,.8,4,.2);leaf.rotation.set(Math.PI/2,0,angle);}}
  if(c){
   if(['city','terrace'].includes(biome))for(const side of [-1,1]){
    const x=side*36,z=-28;mesh('box',stoneMat,x,5,z,12,10,8);mesh('box',stoneMat,x,10.4,z,13,1,9);mesh('box',gold,x,11,z,13.3,.14,9.3);
    for(let j=0;j<4;j++){mesh('cylinder',stoneMat,x-4.5+j*3,4.5,z+5,.45,9,.45);for(let h=0;h<2;h++)mesh('box',gold,x-4.5+j*3,3+h*4,z+4.05,.65,1.4,.1);}obstacles.push({x,z,r:7.2});arch(x,-12);
   }
   if(['desert','atlas','coast'].includes(biome))for(const side of [-1,1]){const x=side*39,z=-26;mesh('cylinder',stoneMat,x,.15,z,8,.3,8);mesh('cylinder',material('#36909b',{metalness:.6,roughness:.2,emissive:'#104558',emissiveIntensity:.3}),x,.32,z,7,.15,7);obstacles.push({x,z,r:7.5});for(let j=0;j<3;j++)palm(x+Math.cos(j*2)*10,z+Math.sin(j*2)*10);arch(x,-42);}
   if(biome==='dome'){const x=36,z=-34;mesh('cylinder',stoneMat,x,3,z,8,6,8);mesh('sphere',material('#8575a1',{metalness:.8,roughness:.24}),x,6,z,8,5.7,8);mesh('sphere',gold,x,12.5,z,.5);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;mesh('cylinder',stoneMat,x+Math.sin(a)*9,3,z+Math.cos(a)*9,.45,6,.45);}obstacles.push({x,z,r:10});arch(-32,-26);}
   if(biome==='ice')for(const side of [-1,1])for(let i=0;i<5;i++){const x=side*(31+i*4),z=-25-i*7,ice=mesh('cone',material('#a1d6e3',{metalness:.55,roughness:.18,emissive:'#183c54',emissiveIntensity:.5}),x,5+i,z,3,10+i*2,3);ice.rotation.z=side*.13;obstacles.push({x,z,r:3});}
   if(biome==='cliff'){const x=34,z=-31;mesh('cylinder',stoneMat,x,5,z,3,10,3);mesh('cone',material('#643c3a'),x,11.6,z,3.8,4,3.8);const blades=new THREE.Group();blades.position.set(x,9,z+3.1);for(let i=0;i<4;i++){const b=new THREE.Mesh(geo('box'),gold);b.position.set(Math.sin(i*Math.PI/2)*2.2,Math.cos(i*Math.PI/2)*2.2,0);b.scale.set(.6,5,.1);b.rotation.z=-i*Math.PI/2;blades.add(b);}root.add(blades);animations.push({mesh:blades,type:'wind'});obstacles.push({x,z,r:4});arch(-35,-28);}
  }
  instances('sphere',stoneMat,rockT);instances('cylinder',material('#463d38'),trunkT);
  instances('cone',material(biome==='ice'?'#94c5c9':biome==='atlas'?'#73978a':'#557f75'),leafT);
  instances('cylinder',stoneMat,pillarT);instances('box',stoneMat,roofT);instances('box',stoneMat,buildingT);
  for(let i=0;i<24;i++){const angle=i/24*Math.PI*2,r=hub?55:42,x=Math.sin(angle)*r,z=Math.cos(angle)*r;lampT.push([x,1,z,.14,2,.14]);lampGlowT.push([x,2.15,z,.4,.5,.4]);}
  instances('cylinder',material('#303d45'),lampT);instances('box',gold,lampGlowT);

  instances('plane',register(new THREE.MeshBasicMaterial({map:spriteTex,color:'#000911',transparent:true,opacity:.72,depthWrite:false})),obstacles.map(o=>[o.x,.025,o.z,o.r*5+3,o.r*5+3,1,-Math.PI/2,0,0]));
  const grass=[];for(let i=0;i<650;i++){const x=(rng()-.5)*143,z=(rng()-.5)*143;if(free(x,z,1)&&Math.hypot(x,z)<73)grass.push([x,.2,z,.15,.3+rng()*.45,.15,0,rng()*6,0]);}instances('cone',material(biome==='ice'?'#b8d2d6':'#709c8c'),grass);
  }
  for(const item of items){
   const firstChild=root.children.length;
   if(item.type==='portal'){portal(item);continue;}
   if(item.type==='final')continue;
   const mat=material(item.color,{emissive:item.color,emissiveIntensity:item.done?.05:.35,metalness:.5});
   mesh('cylinder',stoneMat,item.x,.25,item.z,item.type==='guardian'?3:1.8,.5,item.type==='guardian'?3:1.8);
   if(item.type==='beacon'){
    const ob=mesh('sphere',mat,item.x,2.5,item.z,.6,1.4,.6);animations.push({mesh:ob,type:'float',y:2.5,item});
    const ring=mesh('ring',mat,item.x,2.5,item.z,1.7,1.7,1);ring.rotation.x=.5;
   }else if(item.type==='echo'&&ORIGINAL_ART[item.card]){
    const body=new THREE.Sprite(register(new THREE.SpriteMaterial({transparent:true,depthWrite:false})));body.position.set(item.x,2.9,item.z);body.scale.set(2.8,4.8,1);portrait(body,item.card);root.add(body);
    const ring=mesh('ring',mat,item.x,.65,item.z,1.8,1.8,1);ring.rotation.x=Math.PI/2;
   }else{
    const body=mesh('sphere',material(item.type==='guardian'?'#252b41':'#526c80',{emissive:item.color,emissiveIntensity:.12}),item.x,2,item.z,item.type==='guardian'?2:1.05,item.type==='guardian'?2.6:1.3,item.type==='guardian'?2:1.05);
    animations.push({mesh:body,type:'float',y:2,item});
    for(const side of [-1,1])mesh('sphere',mat,item.x+side*(item.type==='guardian'?.65:.35),2.35,item.z+(item.type==='guardian'?1.75:.9),.14);
    const crown=mesh('ring',mat,item.x,4.7,item.z,item.type==='guardian'?2:1.1,item.type==='guardian'?2:1.1,1);crown.rotation.x=Math.PI/2;
   }
   const glow=new THREE.Sprite(spriteMat);glow.position.set(item.x,2,item.z);glow.scale.set(5,5,1);root.add(glow);
   const tag=label(item.type==='beacon'?(item.done?'◆ Souvenir':'◇ Souvenir'):item.type==='guardian'?'GARDIEN':item.name,item.x,item.type==='guardian'?7:5.8,item.z,item.color,item.type==='guardian'?10:8);tag.userData.itemId=item.id;itemVisuals.set(item.id,root.children.slice(firstChild));
  }
  hero=createKais(models.hero);avatar=hero.object;root.add(avatar);
  const shadow=mesh(register(new THREE.CircleGeometry(1,24)),register(new THREE.MeshBasicMaterial({color:'#0c1722',transparent:true,opacity:.4,depthWrite:false})),0,.08,0,1.2,1.2,1);shadow.rotation.x=-Math.PI/2;
  companion=mesh('sphere',gold,0,1,0,.5);animations.push({mesh:shadow,type:'shadow'});
  const particleGeo=register(new THREE.BufferGeometry()),coords=new Float32Array(180*3);for(let i=0;i<180;i++){coords[i*3]=(rng()-.5)*155;coords[i*3+1]=2+rng()*19;coords[i*3+2]=(rng()-.5)*155;}particleGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));
  const points=new THREE.Points(particleGeo,register(new THREE.PointsMaterial({size:.25,color:accent,map:spriteTex,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending})));root.add(points);
  animations.push({mesh:points,type:'particles'});
  camera.position.set(position.x,29,position.z+32);camera.lookAt(position.x,0,position.z-6);report=0;needsRender=true;batchStatic();
 }
 function resize(){const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setPixelRatio(quality.ratio(width,height,devicePixelRatio||1));renderer.setSize(width,height,false);needsRender=true;camera.aspect=width/height;camera.updateProjectionMatrix();}}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 function startRoute(destination){route=findPath(position,destination,obstacles);target=route.shift()||null;}
 function clearInput(){keys.clear();stick={x:0,z:0};held=null;target=null;route=[];}
 function down(e){if(held||paused||e.button>0)return;e.preventDefault();onActivity();held={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),drag:false};target=null;route=[];canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}
 function move(e){if(!held||held.id!==e.pointerId)return;const dx=e.clientX-held.x,dy=e.clientY-held.y;if(Math.hypot(dx,dy)>7)held.drag=true;const scale=Math.max(50,Math.hypot(dx,dy));stick=pointerStick(dx,dy);onActivity();}
 function up(e){if(!held||held.id!==e.pointerId)return;
  if(!held.drag&&!paused&&e.type==='pointerup'){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(plane,intersection))startRoute({x:clamp(intersection.x,-74,74),z:clamp(intersection.z,-74,74)});}
  held=null;stick={x:0,z:0};
 }
 function keydown(e){if(paused||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','z','q','e','shift'].includes(key)){e.preventDefault();keys.add(key);target=null;route=[];onActivity();if(key==='e'&&!e.repeat)interact();}}
 function keyup(e){keys.delete(e.key.toLowerCase());}
 function interact(){if(paused)return;const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())));if(closest){clearInput();onActivity();onInteract(closest);}}
 const hidden=()=>{clearInput();last=performance.now();frameTime=frames=0;needsRender=true;};
 const lost=e=>{e.preventDefault();paused=true;onError('Le rendu 3D a été interrompu. Recharge le monde pour reprendre ta sauvegarde.');};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('webglcontextlost',lost);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',hidden);
 function tick(now){
  if(disposed)return;raf=requestAnimationFrame(tick);
  const rawDt=Math.max(0,(now-last)/1000);last=now;
  if(document.hidden||!models||!avatar||paused&&!needsRender)return;
  const dt=Math.min(rawDt,.25);let travelled=0,dx=0,dz=0;
  if(!paused){
   elapsed+=dt;frames++;frameTime+=rawDt;
   if(frameTime>=1){fps=Math.round(frames/frameTime);if(quality.sample(fps,frameTime))resize();frames=0;frameTime=0;}
   dx=stick.x+((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('q')||keys.has('arrowleft'))?1:0);
   dz=stick.z+((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('z')||keys.has('arrowup'))?1:0);
   const previous=position,next=advanceMotion({position,target,route},{x:dx,z:dz},dt,10.5*stats.speed*(keys.has('shift')?1.4:1),obstacles);
   ({position,target,route,travelled,moving}=next);dx=position.x-previous.x;dz=position.z-previous.z;
   if(moving)onActivity();
  }else moving=false;
  avatar.position.set(position.x,0,position.z);hero.update(paused?0:dt,dx,dz,travelled);
  companion.visible=save.team.length>0;companion.position.set(position.x-2.1,1.2+Math.sin(elapsed*2)*.2,position.z+1.4);
  desiredCamera.set(position.x,29,position.z+32);camera.position.lerp(desiredCamera,1-Math.exp(-dt*8));cameraTarget.set(camera.position.x,0,camera.position.z-38);camera.lookAt(cameraTarget);
  sun.position.set(position.x-24,60,position.z+24);sun.target.position.set(position.x,0,position.z);
  portalMeshes.forEach(mat=>mat.uniforms.time.value=elapsed);
  for(const a of animations){if(a.type==='float'){a.mesh.position.y=a.y+Math.sin(elapsed*1.5+a.mesh.position.x)*.22;a.mesh.rotation.y+=paused?0:dt*.35;}if(a.type==='shadow')a.mesh.position.set(position.x,.08,position.z);if(a.type==='wind')a.mesh.rotation.z+=paused?0:dt*.35;if(a.type==='particles')a.mesh.rotation.y=Math.sin(elapsed*.04)*.03;}
  renderer.render(scene,camera);report-=dt;
  if(report<=0||needsRender){
   report=(moving||held?.drag)?0.1:0.4;
   for(const [id,visuals] of itemVisuals)for(const m of visuals)m.visible=!(cooldowns.get(id)>Date.now());
   const closest=nearestInteraction(position,items.filter(i=>!(cooldowns.get(i.id)>Date.now())));
   onSnapshot({region,position:{...position},near:closest,moving,fps,drawCalls:renderer.info.render.calls,resolution:Math.round(renderer.getPixelRatio()*100),waypoint,remaining:waypoint?Math.round(distance(position,waypoint)):null,joystick:held?.drag?{x:held.x,y:held.y,dx:stick.x*26,dy:stick.z*26}:null});
  }
  needsRender=false;
 }
 onLoadState?.(true);
 loadWorldModels().then(value=>{if(disposed){value.dispose();return;}models=value;rebuild(region);resize();last=performance.now();onLoadState?.(false);}).catch(error=>{if(!disposed){console.error('[3B world models]',error);paused=true;onError('Les modèles 3D n’ont pas pu être chargés. Recharge le monde pour réessayer.');}});
 resize();raf=requestAnimationFrame(tick);
 return{
  setPaused(value){paused=value;needsRender=true;last=performance.now();frames=frameTime=0;if(value)clearInput();},
  setQuality(mode){quality.setMode(mode);renderer.shadowMap.enabled=mode!=='fluid';resize();},
  setSave(value){save=value;stats=teamStats(save);items=worldItems(region,save);for(const item of items){const character=itemVisuals.get(item.id)?.find(m=>m.userData.cardArt);if(character)portrait(character,item.card);const sprite=itemVisuals.get(item.id)?.find(m=>m.userData.itemId===item.id);if(!sprite)continue;const text=item.type==='beacon'?(item.done?'◆ Souvenir':'◇ Souvenir'):item.type==='guardian'?'GARDIEN':item.name;if(sprite.userData.label===text)continue;sprite.userData.label=text;const cv=sprite.material.map.image,ctx=cv.getContext('2d');ctx.clearRect(0,0,512,96);ctx.fillStyle='rgba(8,18,30,.72)';ctx.beginPath();ctx.roundRect(8,8,496,80,24);ctx.fill();ctx.font='500 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=item.color;ctx.fillText(text,256,48,464);sprite.material.map.needsUpdate=true;}},
  travel(id){if(models)rebuild(countryById[id]?id:'hub');},
  interact,
  waypoint(item,walk=false){waypoint=item;if(walk)startRoute(item);},
  cooldown(id){cooldowns.set(id,Date.now()+90000);},
  destroy(){disposed=true;hero?.dispose();models?.dispose();cancelAnimationFrame(raf);observer.disconnect();resources.forEach(r=>r.dispose());Object.values(geometry).forEach(g=>g.dispose());renderer.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('webglcontextlost',lost);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',hidden);},
 };
}
