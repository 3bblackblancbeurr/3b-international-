import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {
  COUNTRIES_3B,FINISH_STEP,HOME_LENGTH,SANCTUARY_CELLS,STABLE,TRACK_LENGTH,
  blockadeOwnerAt,countryFor,globalCellFor,homeIndexFor,
} from './dada3b/engine.js';

const TRACK_ANCHORS=Object.freeze([[50,8],[81,17],[92,47],[82,80],[49,92],[18,82],[8,53],[17,19]]);
const TRACK_SECTOR=TRACK_LENGTH/8;
const SCALE=.21;
const COUNTRY_SEGMENTS={shield:8,diamond:4,sun:10,hex:6,arch:12,round:18,star:5,rune:4};
const POWER_LABELS={
 capture:'FRACTURE MATRIX',barricade:'BOUCLIER 3B',sanctuary:'SANCTUAIRE',door:'PORTE DU NEXUS',
 finish:'FRAGMENT NEXUS',exit:'LIBÉRATION TOTEM','triple-six':'SURCHARGE MATRIX',victory:'NEXUS COMPLET',
};
const smoothStep=t=>t*t*(3-2*t);
function trackPosition(index){
 const normalized=((index%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH,sector=Math.floor(normalized/TRACK_SECTOR),t=(normalized%TRACK_SECTOR)/TRACK_SECTOR;
 const a=TRACK_ANCHORS[sector],b=TRACK_ANCHORS[(sector+1)%TRACK_ANCHORS.length],s=smoothStep(t),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
 const bend=Math.sin(Math.PI*t)*(sector%2===0?1.65:-1.25);
 return{left:a[0]+dx*s+(-dy/length)*bend,top:a[1]+dy*s+(dx/length)*bend};
}
function homePosition(country,index){
 const gate=trackPosition(country.start),factor=.72-index*.102;
 return{left:50+(gate.left-50)*factor,top:50+(gate.top-50)*factor};
}
function stableCenter(country){
 const gate=trackPosition(country.start),factor=1.085;
 return{left:50+(gate.left-50)*factor,top:50+(gate.top-50)*factor};
}
function finishedPosition(country,pieceIndex){
 const a=(-90+country.start*360/TRACK_LENGTH+pieceIndex*5-7.5)*Math.PI/180,r=6.1+(pieceIndex%2)*1.15;
 return{left:50+Math.cos(a)*r,top:50+Math.sin(a)*r};
}
function worldFromPercent(p,y=.58){return new THREE.Vector3((p.left-50)*SCALE,y,(p.top-50)*SCALE);}
function pieceWorldPosition(country,steps,pieceIndex){
 let p;
 if(steps===STABLE){
  const base=stableCenter(country),a=pieceIndex*Math.PI/2+Math.PI/4;
  p={left:base.left+Math.cos(a)*2.7,top:base.top+Math.sin(a)*2.7};
 }else if(steps===FINISH_STEP)p=finishedPosition(country,pieceIndex);
 else if(steps>=TRACK_LENGTH)p=homePosition(country,homeIndexFor(steps));
 else{
  const base=trackPosition(globalCellFor(country.id,steps)),a=pieceIndex*Math.PI/2;
  p={left:base.left+Math.cos(a)*.72,top:base.top+Math.sin(a)*.72};
 }
 return worldFromPercent(p,steps===FINISH_STEP?.82:.78);
}
function makeMaterial(color,{metal=.72,rough=.28,emissive=0,emissiveIntensity=.08,transparent=false,opacity=1}={}){
 return new THREE.MeshStandardMaterial({
  color:new THREE.Color(color),metalness:metal,roughness:rough,
  emissive:new THREE.Color(emissive||color),emissiveIntensity,transparent,opacity,
 });
}
function mesh(geometry,material,cast=true,receive=true){
 const m=new THREE.Mesh(geometry,material);m.castShadow=cast;m.receiveShadow=receive;return m;
}
function canvasLabel(text,color='#f1d28b',sub=''){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,160);
 ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=16;
 ctx.fillStyle='rgba(3,7,8,.78)';ctx.beginPath();ctx.roundRect(8,8,496,144,28);ctx.fill();
 ctx.strokeStyle=color;ctx.globalAlpha=.75;ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1;
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 68px system-ui, sans-serif';ctx.fillStyle='#f8ecd2';ctx.fillText(text,256,66);
 if(sub){ctx.font='700 28px system-ui, sans-serif';ctx.fillStyle=color;ctx.fillText(sub,256,124);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}
function spriteLabel(text,color,sub='',scaleX=1.6,scaleY=.5){
 const map=canvasLabel(text,color,sub),material=new THREE.SpriteMaterial({map,transparent:true,depthWrite:false});
 const sprite=new THREE.Sprite(material);sprite.scale.set(scaleX,scaleY,1);sprite.userData.ownedTexture=map;return sprite;
}
function disposeTree(root){
 root.traverse(object=>{
  if(object.geometry)object.geometry.dispose?.();
  const materials=Array.isArray(object.material)?object.material:[object.material];
  materials.filter(Boolean).forEach(material=>{
   Object.values(material).forEach(value=>{if(value?.isTexture)value.dispose?.();});
   material.dispose?.();
  });
  if(object.userData?.ownedTexture)object.userData.ownedTexture.dispose?.();
 });
}
function addBoardFoundation(scene,runtime){
 const floorMat=makeMaterial('#050809',{metal:.12,rough:.86,emissive:'#071215',emissiveIntensity:.12});
 const floor=mesh(new THREE.CylinderGeometry(12.15,12.55,1.25,8,2,false),floorMat,false,true);
 floor.position.y=-.72;floor.rotation.y=Math.PI/8;scene.add(floor);
 const rimMat=makeMaterial('#c2a361',{metal:.92,rough:.2,emissive:'#7a5c28',emissiveIntensity:.12});
 const rim=mesh(new THREE.TorusGeometry(10.76,.16,10,96),rimMat,true,true);rim.rotation.x=Math.PI/2;rim.position.y=.02;scene.add(rim);
 const topMat=makeMaterial('#0a1213',{metal:.64,rough:.34,emissive:'#10292d',emissiveIntensity:.2});
 const top=mesh(new THREE.CylinderGeometry(10.62,10.78,.42,8,1,false),topMat,false,true);
 top.position.y=-.1;top.rotation.y=Math.PI/8;scene.add(top);
 const insetMat=makeMaterial('#071012',{metal:.55,rough:.4,emissive:'#0a2930',emissiveIntensity:.18});
 const inset=mesh(new THREE.CylinderGeometry(8.65,8.85,.18,32),insetMat,false,true);inset.position.y=.14;scene.add(inset);
 const grid=new THREE.GridHelper(19.2,32,0x2f8fa0,0x173137);
 grid.position.y=.245;grid.material.transparent=true;grid.material.opacity=.11;grid.material.depthWrite=false;scene.add(grid);
 COUNTRIES_3B.forEach((country,index)=>{
  const wedgeMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide});
  const wedge=mesh(new THREE.RingGeometry(2.4,9.48,40,1,index*Math.PI/4-Math.PI/8,Math.PI/4),wedgeMat,false,false);
  wedge.rotation.x=-Math.PI/2;wedge.position.y=.255;scene.add(wedge);
 });
 const trackPoints=Array.from({length:TRACK_LENGTH},(_,i)=>worldFromPercent(trackPosition(i),.42));
 const curve=new THREE.CatmullRomCurve3(trackPoints,true,'centripetal',.35);
 const railMat=makeMaterial('#7e704f',{metal:.94,rough:.22,emissive:'#493918',emissiveIntensity:.1});
 const rail=mesh(new THREE.TubeGeometry(curve,256,.105,7,true),railMat,true,true);scene.add(rail);
 const energyMat=new THREE.MeshBasicMaterial({color:0x69dff2,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false});
 const energy=mesh(new THREE.TubeGeometry(curve,256,.034,5,true),energyMat,false,false);scene.add(energy);
 runtime.energyRail=energy;
}
function addTrackCells(scene,match,runtime){
 const startMap=new Map(COUNTRIES_3B.map(c=>[c.start,c]));
 for(let i=0;i<TRACK_LENGTH;i++){
  const country=startMap.get(i),sanctuary=SANCTUARY_CELLS.includes(i)&&match.rules?.safeCells,barrier=blockadeOwnerAt(match,i)!==null;
  const color=country?.accent||(sanctuary?'#e2c470':barrier?'#65dff0':'#263334');
  const mat=makeMaterial(color,{metal:.76,rough:.27,emissive:color,emissiveIntensity:country ? .35 : sanctuary ? .52 : barrier ? .6 : .06});
  const cell=mesh(new THREE.CylinderGeometry(country?.46:.37,country?.42:.34,country?.24:.18,country?8:6),mat,true,true);
  const p=worldFromPercent(trackPosition(i),.49);cell.position.copy(p);cell.rotation.y=(i/TRACK_LENGTH)*Math.PI*2;
  cell.userData={kind:'cell',index:i,material:mat,sanctuary,barrier,baseColor:new THREE.Color(color),baseEmissive:country ? .35 : sanctuary ? .52 : .06};scene.add(cell);runtime.trackCells.push(cell);
  if(country){
   const beaconMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false});
   const beacon=mesh(new THREE.CylinderGeometry(.06,.3,1.7,12,1,true),beaconMat,false,false);beacon.position.copy(p);beacon.position.y=.92;scene.add(beacon);
   runtime.beacons.push(beacon);
  }
 }
 COUNTRIES_3B.forEach(country=>{
  for(let i=0;i<HOME_LENGTH;i++){
   const p=worldFromPercent(homePosition(country,i),.5);
   const mat=makeMaterial(country.accent,{metal:.75,rough:.26,emissive:country.accent,emissiveIntensity:.22+i*.035});
   const cell=mesh(new THREE.CylinderGeometry(.36+i*.014,.33+i*.01,.19,8),mat,true,true);cell.position.copy(p);scene.add(cell);
  }
 });
}
function addGate(scene,country,active,runtime){
 const p=worldFromPercent(stableCenter(country),.18),group=new THREE.Group();group.position.copy(p);group.lookAt(0,p.y,0);
 const dark=makeMaterial('#090d0e',{metal:.72,rough:.35,emissive:country.accent,emissiveIntensity:active ? .17 : .035});
 const accent=makeMaterial(country.accent,{metal:.78,rough:.24,emissive:country.accent,emissiveIntensity:active ? .55 : .08});
 const pedestal=mesh(new THREE.CylinderGeometry(1.05,1.18,.34,8),dark,true,true);pedestal.position.y=.04;group.add(pedestal);
 [-.69,.69].forEach(x=>{
  const tower=mesh(new THREE.CylinderGeometry(.15,.22,1.55,8),accent,true,true);tower.position.set(x,.82,0);group.add(tower);
  const cap=mesh(new THREE.ConeGeometry(.23,.34,8),accent,true,true);cap.position.set(x,1.75,0);group.add(cap);
 });
 const arch=mesh(new THREE.TorusGeometry(.7,.11,8,28,Math.PI),accent,true,true);arch.position.y=1.43;group.add(arch);
 const core=mesh(new THREE.OctahedronGeometry(.23,0),makeMaterial('#d9f8ff',{metal:.35,rough:.15,emissive:country.accent,emissiveIntensity:1.5}),false,false);
 core.position.y=.98;group.add(core);
 const label=spriteLabel(country.code,country.accent,country.value,1.75,.54);label.position.set(0,2.16,.02);group.add(label);
 if(active){
  const halo=mesh(new THREE.TorusGeometry(1.0,.025,6,48),new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.5,depthWrite:false}),false,false);
  halo.rotation.x=Math.PI/2;halo.position.y=.26;group.add(halo);runtime.gateHalos.push(halo);
 }
 scene.add(group);
}
function addNexus(scene,runtime){
 const group=new THREE.Group();group.position.y=.32;
 const base=mesh(new THREE.CylinderGeometry(2.05,2.25,.58,8),makeMaterial('#101818',{metal:.88,rough:.22,emissive:'#6f5629',emissiveIntensity:.18}),true,true);
 group.add(base);
 const plate=mesh(new THREE.CylinderGeometry(1.68,1.9,.22,8),makeMaterial('#c3a25d',{metal:.94,rough:.17,emissive:'#604613',emissiveIntensity:.15}),true,true);plate.position.y=.38;group.add(plate);
 const coreMat=makeMaterial('#d8faff',{metal:.2,rough:.08,emissive:'#52dff3',emissiveIntensity:2.3});
 const core=mesh(new THREE.IcosahedronGeometry(.62,1),coreMat,false,false);core.position.y=1.18;group.add(core);runtime.nexusCore=core;
 const inner=mesh(new THREE.IcosahedronGeometry(.31,1),makeMaterial('#f8dfa0',{metal:.2,rough:.08,emissive:'#d9aa51',emissiveIntensity:2}),false,false);inner.position.copy(core.position);group.add(inner);
 [0,1,2].forEach(i=>{
  const ring=mesh(new THREE.TorusGeometry(1.0+i*.32,.045,8,64),new THREE.MeshBasicMaterial({color:i===1?0xd8b66f:0x61dff1,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false}),false,false);
  ring.position.y=1.16;ring.rotation.set(i===0?Math.PI/2:Math.PI/2+.45*i,.35*i,.2*i);group.add(ring);runtime.nexusRings.push(ring);
 });
 const light=new THREE.PointLight(0x67dff2,12,8,2);light.position.set(0,2.1,0);group.add(light);runtime.nexusLight=light;
 const label=spriteLabel('3B','#e7c77e','NEXUS',1.5,.5);label.position.set(0,2.35,0);group.add(label);
 scene.add(group);
}
function addAtmosphere(scene,runtime){
 const count=320,positions=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const radius=12+Math.random()*18,angle=Math.random()*Math.PI*2;
  positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=.5+Math.random()*9;positions[i*3+2]=Math.sin(angle)*radius;
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const mat=new THREE.PointsMaterial({color:0x68dff2,size:.045,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending});
 const stars=new THREE.Points(geo,mat);scene.add(stars);runtime.stars=stars;
}
function createPiece(country,pieceIndex,shadows){
 const group=new THREE.Group();group.userData={kind:'piece',countryId:country.id,pieceIndex,legal:false,target:new THREE.Vector3()};
 const segments=COUNTRY_SEGMENTS[country.shape]||10;
 const baseMat=makeMaterial('#c3a25d',{metal:.92,rough:.19,emissive:'#6b511e',emissiveIntensity:.13});
 const bodyMat=makeMaterial(country.accent,{metal:.7,rough:.22,emissive:country.accent,emissiveIntensity:.16});
 const base=mesh(new THREE.CylinderGeometry(.48,.56,.18,14),baseMat,shadows,shadows);base.position.y=.1;group.add(base);
 const body=mesh(new THREE.CylinderGeometry(.27,.42,.72,segments,2,false),bodyMat,shadows,shadows);body.position.y=.53;
 if(country.shape==='diamond'||country.shape==='rune')body.rotation.y=Math.PI/4;
 group.add(body);
 const shoulder=mesh(new THREE.TorusGeometry(.31,.065,6,segments*2),baseMat,shadows,shadows);shoulder.rotation.x=Math.PI/2;shoulder.position.y=.82;group.add(shoulder);
 const crown=mesh(country.shape==='star'?new THREE.ConeGeometry(.36,.42,5):new THREE.ConeGeometry(.32,.36,segments),baseMat,shadows,shadows);crown.position.y=1.03;group.add(crown);
 const coreMat=makeMaterial('#e6fbff',{metal:.1,rough:.05,emissive:country.accent,emissiveIntensity:2.1});
 const core=mesh(new THREE.SphereGeometry(.11,12,8),coreMat,false,false);core.position.set(0,.56,.31);group.add(core);
 const haloMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false});
 const halo=mesh(new THREE.TorusGeometry(.63,.035,6,36),haloMat,false,false);halo.rotation.x=Math.PI/2;halo.position.y=.08;group.add(halo);
 const badge=spriteLabel(country.crest,'#f4d895','',.42,.42);badge.position.set(0,.6,.44);group.add(badge);
 group.userData.bodyMat=bodyMat;group.userData.coreMat=coreMat;group.userData.haloMat=haloMat;group.userData.model=body;group.userData.crown=crown;
 group.traverse(o=>{o.userData.pieceRoot=group;});
 return group;
}
function updateBoardState(runtime,match){
 runtime.trackCells.forEach(cell=>{
  const barrier=blockadeOwnerAt(match,cell.userData.index)!==null;
  cell.userData.barrier=barrier;
  if(barrier){cell.material.color.set('#163f46');cell.material.emissive.set('#65dff0');cell.material.emissiveIntensity=.68;}
  else{cell.material.color.copy(cell.userData.baseColor);cell.material.emissive.copy(cell.userData.baseColor);cell.material.emissiveIntensity=cell.userData.baseEmissive;}
 });
}
function updatePieces(runtime,match,legal,motion,cosmeticsByCountry=null,loadout=null){
 const live=new Set();
 match.players.forEach((player,playerIndex)=>{
  const country=countryFor(player.countryId);
  player.pieces.forEach((piece,pieceIndex)=>{
   const key=country.id+':'+pieceIndex;live.add(key);
   let group=runtime.pieceMap.get(key);
   if(!group){group=createPiece(country,pieceIndex,runtime.shadows);runtime.pieces.add(group);runtime.pieceMap.set(key,group);}
   const shown=motion?.countryId===country.id&&motion.pieceIndex===pieceIndex?motion.step:piece.steps;
   group.userData.target.copy(pieceWorldPosition(country,shown,pieceIndex));
   group.userData.legal=playerIndex===match.turn&&legal.includes(pieceIndex)&&!motion;
   group.userData.isMoving=motion?.countryId===country.id&&motion.pieceIndex===pieceIndex;
   const playerLoadout=cosmeticsByCountry?.[country.id]||loadout||{},trail=playerLoadout.trail||'';
   group.userData.trail=trail;
   group.userData.haloMat.color.set(trail==='DADA_TRAIL_GOLD'?'#e6bd68':trail==='DADA_TRAIL_MATRIX'?'#5cd9ff':country.accent);
   group.userData.bodyMat.metalness=playerLoadout.totem_skin&&playerLoadout.totem_skin!=='DADA_TOTEM_CORE'?.82:.7;
   group.userData.bodyMat.emissiveIntensity=group.userData.legal ? .72 : playerLoadout.totem_skin&&playerLoadout.totem_skin!=='DADA_TOTEM_CORE' ? .27 : .16;
   group.userData.coreMat.emissiveIntensity=group.userData.legal?3.2:2.1;
  });
 });
 for(const [key,group] of runtime.pieceMap)if(!live.has(key)){runtime.pieces.remove(group);disposeTree(group);runtime.pieceMap.delete(key);}
}
function findPieceRoot(object){
 let node=object;
 while(node){if(node.userData?.kind==='piece')return node;node=node.parent;}
 return null;
}

export default function Dada3BThree({match,legal=[],motion,blast,onPiece,focusEvent,onUnsupported,loadout=null,cosmeticsByCountry=null}){
 const hostRef=useRef(null),runtimeRef=useRef(null),onPieceRef=useRef(onPiece);
 useEffect(()=>{onPieceRef.current=onPiece;},[onPiece]);
 useEffect(()=>{
  const host=hostRef.current;if(!host)return;
  let renderer;
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',stencil:false});
  }catch(error){onUnsupported?.(error);return;}
  const mobile=window.matchMedia('(max-width: 700px)').matches;
  const shadows=!mobile&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.35:1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
  renderer.shadowMap.enabled=shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.className='dada3b-three-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x020506);scene.fog=new THREE.FogExp2(0x020607,.026);
  const camera=new THREE.PerspectiveCamera(38,1,.1,90);camera.position.set(0,18.3,19.4);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.target.set(0,.35,0);
  controls.minDistance=14;controls.maxDistance=31;controls.minPolarAngle=.45;controls.maxPolarAngle=1.34;controls.rotateSpeed=.62;controls.zoomSpeed=.72;controls.panSpeed=.45;
  controls.enablePan=!mobile;controls.update();
  scene.add(new THREE.HemisphereLight(0x9deaff,0x171008,1.55));
  const key=new THREE.DirectionalLight(0xffe3a6,4.1);key.position.set(-8,18,10);key.castShadow=shadows;
  if(shadows){key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=15;key.shadow.camera.bottom=-15;key.shadow.bias=-.00025;}
  scene.add(key);
  const blue=new THREE.PointLight(0x45dff6,18,31,2);blue.position.set(9,7,-9);scene.add(blue);
  const gold=new THREE.PointLight(0xd7ad57,12,25,2);gold.position.set(-10,5,9);scene.add(gold);
  const ground=mesh(new THREE.CircleGeometry(38,64),makeMaterial('#030506',{metal:.1,rough:.95,emissive:'#061013',emissiveIntensity:.08}),false,true);ground.rotation.x=-Math.PI/2;ground.position.y=-1.38;scene.add(ground);
  const pieces=new THREE.Group();scene.add(pieces);
  const runtime={renderer,scene,camera,controls,pieces,pieceMap:new Map(),trackCells:[],shadows,energyRail:null,nexusRings:[],nexusCore:null,nexusLight:null,stars:null,gateHalos:[],beacons:[],effects:[],focusUntil:0,focusType:'',disposed:false};
  runtimeRef.current=runtime;
  addBoardFoundation(scene,runtime);addTrackCells(scene,match,runtime);
  COUNTRIES_3B.forEach(c=>addGate(scene,c,match.players.some(p=>p.countryId===c.id),runtime));
  addNexus(scene,runtime);addAtmosphere(scene,runtime);updateBoardState(runtime,match);updatePieces(runtime,match,legal,motion,cosmeticsByCountry,loadout);
  const resize=()=>{
   const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;
   renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
  };
  resize();const ro=new ResizeObserver(resize);ro.observe(host);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
  const eventPoint=e=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;};
  const pointerDown=e=>{down={x:e.clientX,y:e.clientY};};
  const pointerMove=e=>{
   eventPoint(e);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects([...runtime.pieceMap.values()],true).map(i=>findPieceRoot(i.object)).find(Boolean);
   renderer.domElement.style.cursor=hit?.userData.legal?'pointer':'grab';
  };
  const pointerUp=e=>{
   if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>8)return;
   eventPoint(e);raycaster.setFromCamera(pointer,camera);
   const hit=raycaster.intersectObjects([...runtime.pieceMap.values()],true).map(i=>findPieceRoot(i.object)).find(root=>root?.userData.legal);
   if(hit)onPieceRef.current?.(hit.userData.pieceIndex);
  };
  renderer.domElement.addEventListener('pointerdown',pointerDown,{passive:true});renderer.domElement.addEventListener('pointermove',pointerMove,{passive:true});renderer.domElement.addEventListener('pointerup',pointerUp,{passive:true});
  let frame=0;const clock=new THREE.Clock();
  const animate=()=>{
   if(runtime.disposed)return;frame=requestAnimationFrame(animate);const t=clock.getElapsedTime(),now=performance.now();
   controls.update();
   const focus=now<runtime.focusUntil;camera.fov=THREE.MathUtils.lerp(camera.fov,focus ? (runtime.focusType==='victory' ? 32 : 35) : 38,.055);camera.updateProjectionMatrix();
   runtime.energyRail.material.opacity=.32+Math.sin(t*2.2)*.12;runtime.energyRail.rotation.y=t*.018;
   runtime.nexusRings.forEach((ring,i)=>{ring.rotation.y+=.003*(i+1);ring.rotation.z+=.0015*(i%2?1:-1);});
   if(runtime.nexusCore){runtime.nexusCore.rotation.x=t*.55;runtime.nexusCore.rotation.y=t*.82;runtime.nexusCore.scale.setScalar(1+Math.sin(t*3)*.035);}
   if(runtime.nexusLight)runtime.nexusLight.intensity=11+Math.sin(t*2.7)*3;
   if(runtime.stars)runtime.stars.rotation.y=t*.006;
   runtime.gateHalos.forEach((halo,i)=>{halo.rotation.z=t*(.18+i*.006);halo.material.opacity=.34+Math.sin(t*1.7+i)*.16;});
   runtime.beacons.forEach((beacon,i)=>{beacon.material.opacity=.18+Math.sin(t*2+i*.4)*.08;});
   for(const group of runtime.pieceMap.values()){
    const target=group.userData.target,bob=group.userData.legal ? Math.sin(t*5+group.userData.pieceIndex)*.13:group.userData.isMoving ? Math.abs(Math.sin(t*10))*.18:0;
    group.position.x=THREE.MathUtils.lerp(group.position.x,target.x,.23);group.position.z=THREE.MathUtils.lerp(group.position.z,target.z,.23);group.position.y=THREE.MathUtils.lerp(group.position.y,target.y+bob,.25);
    group.rotation.y+=group.userData.legal ? .016 : .003;
    group.userData.haloMat.opacity=THREE.MathUtils.lerp(group.userData.haloMat.opacity,group.userData.legal ? .72 : .08,.12);
    const pulse=group.userData.legal ? 1+Math.sin(t*6)*.045:1;group.scale.setScalar(pulse);
   }
   runtime.effects=runtime.effects.filter(fx=>{
    const age=(now-fx.birth)/1000;if(age>.82){scene.remove(fx.group);disposeTree(fx.group);return false;}
    const k=age/.82;fx.group.scale.setScalar(.3+k*5.4);fx.material.opacity=(1-k)*.85;return true;
   });
   renderer.render(scene,camera);
  };animate();
  return()=>{
   runtime.disposed=true;cancelAnimationFrame(frame);ro.disconnect();controls.dispose();
   renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);
   disposeTree(scene);renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();runtimeRef.current=null;
  };
 },[]);
 useEffect(()=>{const runtime=runtimeRef.current;if(runtime){updateBoardState(runtime,match);updatePieces(runtime,match,legal,motion,cosmeticsByCountry,loadout);}},[match,motion,legal,cosmeticsByCountry,loadout]);
 useEffect(()=>{
  const runtime=runtimeRef.current;if(!runtime||!focusEvent)return;
  runtime.focusType=focusEvent;runtime.focusUntil=performance.now()+(focusEvent==='victory'?1500:780);
  if(runtime.nexusLight)runtime.nexusLight.intensity=focusEvent==='capture'?22:focusEvent==='victory'?26:17;
 },[focusEvent,match.lastEvent?.id]);
 useEffect(()=>{
  const runtime=runtimeRef.current;if(!runtime||!blast)return;
  const p=worldFromPercent(blast,.72),group=new THREE.Group();group.position.copy(p);
  const material=new THREE.MeshBasicMaterial({color:blast.fx?.includes('GOLD')?0xf2c66f:0x74e6f8,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const ring=mesh(new THREE.TorusGeometry(.55,.055,8,48),material,false,false);ring.rotation.x=Math.PI/2;group.add(ring);
  const spikes=mesh(new THREE.OctahedronGeometry(.42,0),material,false,false);group.add(spikes);
  runtime.scene.add(group);runtime.effects.push({group,material,birth:performance.now()});
 },[blast?.key]);
 const power=POWER_LABELS[focusEvent]||'';
 return <div ref={hostRef} className="dada3b-three" role="application" aria-label="Plateau DADA 3B en trois dimensions">
  <div className="dada3b-three-hud" aria-hidden="true"><span>3D APEX</span><small>GLISSE · TOURNE · PINCE POUR ZOOMER</small></div>
  {power&&<div key={'three-power-'+(match.lastEvent?.id||0)} className="dada3b-three-power" data-power={focusEvent}><small>POUVOIR DU CERCLE</small><strong>{power}</strong></div>}
  <div className="dada3b-three-sr-actions">{match.players.flatMap((player,playerIndex)=>player.pieces.map((_,pieceIndex)=>{
   const country=countryFor(player.countryId),can=playerIndex===match.turn&&legal.includes(pieceIndex)&&!motion;
   return <button key={country.id+pieceIndex} type="button" disabled={!can} onClick={()=>can&&onPiece(pieceIndex)}>{country.name} Totem {pieceIndex+1}</button>;
  }))}</div>
 </div>;
}
