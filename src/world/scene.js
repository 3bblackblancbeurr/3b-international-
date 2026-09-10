import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadWorldModels,createKais,createCreature} from './models.js';
import {advanceMotion,pointerStick,createQualityController} from './motion.js';
import {COUNTRIES,countryById} from './catalog.js';
import {portraitArt} from './portraits.js';
import {createLandscape,countryPalette} from './landscape.js';
import {COSMETICS} from './chapters.js';
import {findPath} from './navigation.js';
import {clamp,distance,moveWithCollision,nearestInteraction,worldItems,teamStats} from './rules.js';

const UP=new THREE.Vector3(0,1,0);
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
export function createWorldScene(canvas,{save,onSnapshot,onInteract,onActivity,onError,onLoadState,onStep}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 const quality=createQualityController();renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 let shadowAt=0;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.3,340);
 const hemi=new THREE.HemisphereLight(0xd1edff,0x718781,1.6);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffe5bd,2.3);sun.position.set(-24,60,24);scene.add(sun);scene.add(sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;sun.shadow.camera.updateProjectionMatrix();
 const cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(UP,0),intersection=new THREE.Vector3();
 let root=new THREE.Group(),resources=[],animations=[],obstacles=[],items=[],region=save.region,position={x:0,z:region==='hub'?8:5},target=null,waypoint=null,route=[];
 let paused=false,disposed=false,held=null,stick={x:0,z:0},keys=new Set(),moving=false,elapsed=0,last=performance.now(),report=0,raf,frames=0,frameTime=0,fps=60;
 let avatar,companion,atlasTexture,portalMeshes=[],cooldowns=new Map(),itemVisuals=new Map();
 let anchors=new Map();
 let stats=teamStats(save),models=null,hero=null,landscape=null,creatures=[],stepDistance=0,needsRender=true,materialCache=new Map();
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
  const art=portraitArt(id);if(!art||sprite.userData.cardArt===id)return;
  if(sprite.userData.sheet!==art.src){sprite.material.map?.dispose();sprite.material.map=register(new THREE.TextureLoader().load(art.src));sprite.material.map.colorSpace=THREE.SRGBColorSpace;sprite.material.needsUpdate=true;sprite.userData.sheet=art.src;}
  const [x,y,w,h]=art.portrait;sprite.scale.set(3.5*w/h,3.5,1);sprite.material.map.repeat.set(w/art.width,h/art.height);sprite.material.map.offset.set(x/art.width,1-(y+h)/art.height);sprite.userData.cardArt=id;
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
  hero?.dispose();landscape?.dispose();creatures.forEach(c=>c.dispose());creatures=[];scene.remove(root);resources.forEach(r=>r.dispose());resources=[];materialCache=new Map();root=new THREE.Group();scene.add(root);animations=[];portalMeshes=[];obstacles=[];itemVisuals=new Map();
  region=nextRegion;items=worldItems(region,save);anchors=new Map(items.map(i=>[i.id,{x:i.x,z:i.z}]));position={x:0,z:region==='hub'?9:5};target=null;route=[];waypoint=null;keys.clear();stick={x:0,z:0};held=null;
  const c=countryById[region],hub=!c,rng=seeded(hub?832:COUNTRIES.indexOf(c)*371+17);
  atlasTexture=models.atlas;
  const sky=countryPalette(region)[0],stone=c?.stone||'#cfc7ae',accent=c?.color||'#e4cd94';
  const gold=material(accent,{emissive:accent,emissiveIntensity:.25,metalness:.5}),stoneMat=material(stone);
  const spriteTex=glowTexture(),spriteMat=register(new THREE.SpriteMaterial({map:spriteTex,color:accent,opacity:.16,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.background=new THREE.Color(sky);scene.fog=new THREE.FogExp2(sky,hub?.004:.0045);
  hemi.intensity=hub?1.6:1.15;sun.intensity=hub?2.3:1.8;
  if(hub){root.add(models.nexus.scene.clone(true));obstacles=models.collisions.map(o=>({...o}));}
  landscape=createLandscape(models,region,save);root.add(landscape.root);obstacles.push(...landscape.collisions);
  for(const item of items){
   const firstChild=root.children.length;
   if(item.type==='portal'){portal(item);continue;}
   if(item.type==='final')continue;
   if(item.type==='story'){const tag=label(item.name,item.x,6.7,item.z,item.color,11);tag.userData.itemId=item.id;itemVisuals.set(item.id,[tag]);continue;}
   const mat=material(item.color,{emissive:item.color,emissiveIntensity:item.done?.05:.35,metalness:.5});
   mesh('cylinder',stoneMat,item.x,.25,item.z,item.type==='guardian'?3:1.8,.5,item.type==='guardian'?3:1.8);
   if(item.type==='guardian'){
    const creature=createCreature(models.kit,region,item.color,2.1);creature.object.position.set(item.x,.2,item.z);root.add(creature.object);creatures.push(creature);
   }else if(item.type==='beacon'){
    const ob=mesh('sphere',mat,item.x,2.5,item.z,.6,1.4,.6);animations.push({mesh:ob,type:'float',y:2.5,item});
    const ring=mesh('ring',mat,item.x,2.5,item.z,1.7,1.7,1);ring.rotation.x=.5;
   }else if(item.type==='echo'&&portraitArt(item.card)){
    const body=new THREE.Sprite(register(new THREE.SpriteMaterial({transparent:true,depthWrite:false})));body.position.set(item.x,2.9,item.z);body.scale.set(2.8,4.8,1);portrait(body,item.card);root.add(body);
    const ring=mesh('ring',mat,item.x,.65,item.z,1.8,1.8,1);ring.rotation.x=Math.PI/2;
   }else{
    const body=mesh('sphere',material(item.type==='guardian'?'#252b41':'#526c80',{emissive:item.color,emissiveIntensity:.12}),item.x,2,item.z,item.type==='guardian'?2:1.05,item.type==='guardian'?2.6:1.3,item.type==='guardian'?2:1.05);
    animations.push({mesh:body,type:'float',y:2,item});
    for(const side of [-1,1])mesh('sphere',mat,item.x+side*(item.type==='guardian'?.65:.35),2.35,item.z+(item.type==='guardian'?1.75:.9),.14);
    const crown=mesh('ring',mat,item.x,4.7,item.z,item.type==='guardian'?2:1.1,item.type==='guardian'?2:1.1,1);crown.rotation.x=Math.PI/2;
   }
   const glow=new THREE.Sprite(spriteMat);glow.position.set(item.x,1.5,item.z);glow.scale.set(3,3,1);root.add(glow);
   const tag=label(item.type==='beacon'?(item.done?'◆ Souvenir':'◇ Souvenir'):item.type==='guardian'?'GARDIEN':item.name,item.x,item.type==='guardian'?7:5.8,item.z,item.color,item.type==='guardian'?10:8);tag.userData.itemId=item.id;itemVisuals.set(item.id,root.children.slice(firstChild));
   for(const m of itemVisuals.get(item.id))m.userData.anchor=m.position.clone();
  }
  hero=createKais(models.hero);hero.setColor(COSMETICS.find(c=>c.id===save.adventure.cosmetic)?.color||'#e4c778');avatar=hero.object;root.add(avatar);
  const shadow=mesh(register(new THREE.CircleGeometry(1,24)),register(new THREE.MeshBasicMaterial({color:'#0c1722',transparent:true,opacity:.4,depthWrite:false})),0,.08,0,1.2,1.2,1);shadow.rotation.x=-Math.PI/2;
  companion=mesh('sphere',gold,0,1,0,.5);animations.push({mesh:shadow,type:'shadow'});
  const particleGeo=register(new THREE.BufferGeometry()),coords=new Float32Array(180*3);for(let i=0;i<180;i++){coords[i*3]=(rng()-.5)*155;coords[i*3+1]=2+rng()*19;coords[i*3+2]=(rng()-.5)*155;}particleGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));
  const points=new THREE.Points(particleGeo,register(new THREE.PointsMaterial({size:.25,color:accent,map:spriteTex,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending})));root.add(points);
  animations.push({mesh:points,type:'particles'});
  camera.position.set(position.x,24,position.z+28);camera.lookAt(position.x,0,position.z-5);report=0;needsRender=true;batchStatic();
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
   if(moving){onActivity();stepDistance+=travelled;if(stepDistance>2.1){stepDistance=0;onStep?.(region);}}
   for(const [index,item] of items.entries())if(item.type==='echo'){const base=anchors.get(item.id),nearby=distance(position,item)<7;const ox=nearby?item.x-base.x:Math.sin(elapsed*.22+index)*1.25,oz=nearby?item.z-base.z:Math.cos(elapsed*.18+index)*1.25;item.x=base.x+ox;item.z=base.z+oz;for(const m of itemVisuals.get(item.id)||[])if(m.userData.anchor){m.position.x=m.userData.anchor.x+ox;m.position.z=m.userData.anchor.z+oz;}}
  }else moving=false;
  avatar.position.set(position.x,0,position.z);hero.update(paused?0:dt,dx,dz,travelled);
  companion.visible=save.team.length>0;companion.position.set(position.x-2.1,1.2+Math.sin(elapsed*2)*.2,position.z+1.4);
  desiredCamera.set(position.x,24,position.z+28);camera.position.lerp(desiredCamera,1-Math.exp(-dt*8));cameraTarget.set(camera.position.x,0,camera.position.z-33);camera.lookAt(cameraTarget);
  sun.position.set(position.x-24,60,position.z+24);sun.target.position.set(position.x,0,position.z);
  portalMeshes.forEach(mat=>mat.uniforms.time.value=elapsed);
  for(const a of animations){if(a.type==='float'){a.mesh.position.y=a.y+Math.sin(elapsed*1.5+a.mesh.position.x)*.22;a.mesh.rotation.y+=paused?0:dt*.35;}if(a.type==='shadow')a.mesh.position.set(position.x,.08,position.z);if(a.type==='wind')a.mesh.rotation.z+=paused?0:dt*.35;if(a.type==='particles')a.mesh.rotation.y=Math.sin(elapsed*.04)*.03;}
  landscape?.tick(elapsed,paused?0:dt,position);for(const creature of creatures)creature.update(paused?0:dt,camera);
  // Shadows are the most expensive second pass. Their subtle movement can run
  // at 20 Hz while input, camera and character animation retain the full rate.
  if(renderer.shadowMap.enabled&&(needsRender||now-shadowAt>=50)){renderer.shadowMap.needsUpdate=true;shadowAt=now;}
  renderer.render(scene,camera);report-=dt;
  if(report<=0||needsRender){
   report=(moving||held?.drag)?0.1:0.4;
   for(const [id,visuals] of itemVisuals)for(const m of visuals)m.visible=!(cooldowns.get(id)>Date.now())&&(!m.userData.itemId||distance(position,items.find(i=>i.id===id))<32);
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
  setSave(value){save=value;stats=teamStats(save);landscape?.update(save);hero?.setColor(COSMETICS.find(c=>c.id===save.adventure.cosmetic)?.color||'#e4c778');items=worldItems(region,save);for(const item of items){const character=itemVisuals.get(item.id)?.find(m=>m.userData.cardArt);if(character)portrait(character,item.card);const sprite=itemVisuals.get(item.id)?.find(m=>m.userData.itemId===item.id);if(!sprite)continue;const text=item.type==='beacon'?(item.done?'◆ Souvenir':'◇ Souvenir'):item.type==='guardian'?'GARDIEN':item.name;if(sprite.userData.label===text)continue;sprite.userData.label=text;const cv=sprite.material.map.image,ctx=cv.getContext('2d');ctx.clearRect(0,0,512,96);ctx.fillStyle='rgba(8,18,30,.72)';ctx.beginPath();ctx.roundRect(8,8,496,80,24);ctx.fill();ctx.font='500 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=item.color;ctx.fillText(text,256,48,464);sprite.material.map.needsUpdate=true;}},
  travel(id){if(models)rebuild(countryById[id]?id:'hub');},
  interact,
  waypoint(item,walk=false){waypoint=item;if(walk){const d=distance(position,item),gap=item.type==='guardian'?3:0;startRoute(gap&&d>gap?{x:item.x+(position.x-item.x)*gap/d,z:item.z+(position.z-item.z)*gap/d}:item);}},
  cooldown(id){cooldowns.set(id,Date.now()+90000);},
  destroy(){disposed=true;hero?.dispose();landscape?.dispose();creatures.forEach(c=>c.dispose());models?.dispose();cancelAnimationFrame(raf);observer.disconnect();resources.forEach(r=>r.dispose());Object.values(geometry).forEach(g=>g.dispose());renderer.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('webglcontextlost',lost);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',hidden);},
 };
}
