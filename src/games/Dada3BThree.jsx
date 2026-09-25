import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {TapControl} from './touchControls.js';
import {
  COUNTRIES_3B,FINISH_STEP,HOME_LENGTH,SANCTUARY_CELLS,STABLE,TRACK_LENGTH,
  blockadeOwnerAt,countryFor,globalCellFor,homeIndexFor,previewMove,
} from './dada3b/engine.js';

const TRACK_ANCHORS=Object.freeze([[50,8],[81,17],[92,47],[82,80],[49,92],[18,82],[8,53],[17,19]]);
const TRACK_SECTOR=TRACK_LENGTH/8;
const SCALE=.21;
const STABLE_RING_FACTOR=1.255;
const WARRIOR_ARCHETYPES=Object.freeze(['axe','sword','shield','bow']);
const COUNTRY_SEGMENTS={shield:8,diamond:4,sun:10,hex:6,arch:12,round:18,star:5,rune:4};
const POWER_LABELS={
 capture:'FRACTURE MATRIX',barricade:'BOUCLIER 3B',sanctuary:'SANCTUAIRE',door:'PORTE DU NEXUS',
 finish:'FRAGMENT NEXUS',exit:'LIBÉRATION GUERRIER','triple-six':'SURCHARGE MATRIX',victory:'NEXUS COMPLET',
};
const CINEMATIC_CAPTURE_MS=1850;
const smoothStep=t=>t*t*(3-2*t);
function trackPosition(index){
 const normalized=((index%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH,sector=Math.floor(normalized/TRACK_SECTOR),t=(normalized%TRACK_SECTOR)/TRACK_SECTOR;
 const a=TRACK_ANCHORS[sector],b=TRACK_ANCHORS[(sector+1)%TRACK_ANCHORS.length],s=smoothStep(t),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
 const bend=Math.sin(Math.PI*t)*(sector%2===0?1.65:-1.25);
 return{left:a[0]+dx*s+(-dy/length)*bend,top:a[1]+dy*s+(dx/length)*bend};
}
function trackElevation(index){
 const normalized=((index%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH,local=normalized%TRACK_SECTOR,sector=Math.floor(normalized/TRACK_SECTOR);
 const profile=[.53,.47,.51,.61,.69,.60,.49,.54];
 return profile[local]+(sector%2 ? .015 : 0);
}
function tangentAngle(index){
 const a=trackPosition(index-1),b=trackPosition(index+1);
 return Math.atan2(b.left-a.left,b.top-a.top);
}
function homePosition(country,index){
 const gate=trackPosition(country.start),factor=.72-index*.102;
 return{left:50+(gate.left-50)*factor,top:50+(gate.top-50)*factor};
}
function stableCenter(country){
 const gate=trackPosition(country.start),factor=STABLE_RING_FACTOR;
 return{left:50+(gate.left-50)*factor,top:50+(gate.top-50)*factor};
}
function finishedPosition(country,pieceIndex){
 const a=(-90+country.start*360/TRACK_LENGTH+pieceIndex*5-7.5)*Math.PI/180,r=6.1+(pieceIndex%2)*1.15;
 return{left:50+Math.cos(a)*r,top:50+Math.sin(a)*r};
}
function worldFromPercent(p,y=.58){return new THREE.Vector3((p.left-50)*SCALE,y,(p.top-50)*SCALE);}
function pieceWorldPosition(country,steps,pieceIndex){
 if(steps===STABLE){
  const base=stableCenter(country),a=pieceIndex*Math.PI/2+Math.PI/4;
  return worldFromPercent({left:base.left+Math.cos(a)*2.7,top:base.top+Math.sin(a)*2.7},.82);
 }
 if(steps===FINISH_STEP)return worldFromPercent(finishedPosition(country,pieceIndex),.92);
 if(steps>=TRACK_LENGTH){const home=homeIndexFor(steps);return worldFromPercent(homePosition(country,home),.72+home*.025);}
 const cell=globalCellFor(country.id,steps),base=trackPosition(cell),a=pieceIndex*Math.PI/2;
 return worldFromPercent({left:base.left+Math.cos(a)*.72,top:base.top+Math.sin(a)*.72},trackElevation(cell)+.39);
}
function makeMaterial(color,{metal=.72,rough=.28,emissive=0,emissiveIntensity=.08,transparent=false,opacity=1,clearcoat=.58}={}){
 return new THREE.MeshPhysicalMaterial({
  color:new THREE.Color(color),metalness:metal,roughness:rough,clearcoat,clearcoatRoughness:.14,
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
 ctx.fillStyle='rgba(10,24,29,.84)';ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(8,8,496,144,28);else ctx.rect(8,8,496,144);ctx.fill();
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
 const floorMat=makeMaterial('#10242a',{metal:.16,rough:.68,emissive:'#174450',emissiveIntensity:.24});
 const floor=mesh(new THREE.CylinderGeometry(12.15,12.55,1.25,8,2,false),floorMat,false,true);
 floor.position.y=-.72;floor.rotation.y=Math.PI/8;scene.add(floor);
 const rimMat=makeMaterial('#c2a361',{metal:.92,rough:.2,emissive:'#7a5c28',emissiveIntensity:.12});
 const rim=mesh(new THREE.TorusGeometry(10.76,.16,10,96),rimMat,true,true);rim.rotation.x=Math.PI/2;rim.position.y=.02;scene.add(rim);
 const topMat=makeMaterial('#1a3439',{metal:.62,rough:.3,emissive:'#21606b',emissiveIntensity:.30});
 const top=mesh(new THREE.CylinderGeometry(10.62,10.78,.42,8,1,false),topMat,false,true);
 top.position.y=-.1;top.rotation.y=Math.PI/8;scene.add(top);
 const insetMat=makeMaterial('#142b30',{metal:.52,rough:.36,emissive:'#1a5561',emissiveIntensity:.28});
 const inset=mesh(new THREE.CylinderGeometry(8.65,8.85,.18,32),insetMat,false,true);inset.position.y=.14;scene.add(inset);
 const grid=new THREE.GridHelper(19.2,32,0x2f8fa0,0x173137);
 grid.position.y=.245;grid.material.transparent=true;grid.material.opacity=.11;grid.material.depthWrite=false;scene.add(grid);
 COUNTRIES_3B.forEach((country,index)=>{
  const wedgeMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide});
  const wedge=mesh(new THREE.RingGeometry(2.4,9.48,40,1,index*Math.PI/4-Math.PI/8,Math.PI/4),wedgeMat,false,false);
  wedge.rotation.x=-Math.PI/2;wedge.position.y=.255;scene.add(wedge);
 });
 const trackPoints=Array.from({length:TRACK_LENGTH},(_,i)=>worldFromPercent(trackPosition(i),trackElevation(i)-.04));
 const curve=new THREE.CatmullRomCurve3(trackPoints,true,'centripetal',.35);
 const railMat=makeMaterial('#aa9566',{metal:.96,rough:.17,emissive:'#7d5e27',emissiveIntensity:.22});
 const rail=mesh(new THREE.TubeGeometry(curve,256,.105,7,true),railMat,true,true);scene.add(rail);
 const energyMat=new THREE.MeshBasicMaterial({color:0x69dff2,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false});
 const energy=mesh(new THREE.TubeGeometry(curve,256,.034,5,true),energyMat,false,false);scene.add(energy);
 runtime.energyRail=energy;
}
function cellGeometryFor(index,country){
 const local=index%TRACK_SECTOR;
 if(country)return new RoundedBoxGeometry(1.10,.30,.86,4,.12);
 if(local===3)return new RoundedBoxGeometry(1.08,.25,.58,4,.10);
 if(local===4)return new RoundedBoxGeometry(.96,.27,.72,4,.12);
 if(local===1||local===6)return new RoundedBoxGeometry(.92,.24,.68,4,.10);
 return new RoundedBoxGeometry(.86,.23,.68,4,.10);
}
function cellTypeFor(index,country,sanctuary,barrier){
 if(country)return'start';
 if(sanctuary)return'sanctuary';
 if(barrier)return'barrier';
 const local=index%TRACK_SECTOR;
 return local===3?'power':local===4?'turn':'normal';
}
function addSanctuaryFx(scene,cell,color,runtime){
 const group=new THREE.Group();group.position.copy(cell.position);group.position.y+=.05;
 const ringMat=new THREE.MeshBasicMaterial({color:new THREE.Color(color),transparent:true,opacity:.58,blending:THREE.AdditiveBlending,depthWrite:false});
 const ring=mesh(new THREE.TorusGeometry(.58,.035,8,48),ringMat,false,false);ring.rotation.x=Math.PI/2;group.add(ring);
 const beamMat=new THREE.MeshBasicMaterial({color:new THREE.Color('#f6dc94'),transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const beam=mesh(new THREE.CylinderGeometry(.08,.48,1.9,20,1,true),beamMat,false,false);beam.position.y=.88;group.add(beam);
 scene.add(group);runtime.sanctuaryFx.push({group,ring,ringMat,beamMat});
}
function addTrackCells(scene,match,runtime){
 const startMap=new Map(COUNTRIES_3B.map(c=>[c.start,c]));
 for(let i=0;i<TRACK_LENGTH;i++){
  const country=startMap.get(i),sanctuary=SANCTUARY_CELLS.includes(i)&&match.rules?.safeCells,barrier=blockadeOwnerAt(match,i)!==null,local=i%TRACK_SECTOR;
  const color=country?.accent||(sanctuary?'#f0cf78':barrier?'#78eafa':local===3?'#c1a366':local===4?'#3c7f89':'#587176');
  const mat=makeMaterial(color,{metal:.78,rough:.20,emissive:color,emissiveIntensity:country ? .72 : sanctuary ? 1.0 : barrier ? .9 : local===3 ? .34 : .26});
  const cell=mesh(cellGeometryFor(i,country),mat,true,true),elevation=trackElevation(i),cellType=cellTypeFor(i,country,sanctuary,barrier);
  const p=worldFromPercent(trackPosition(i),elevation);cell.position.copy(p);cell.rotation.y=tangentAngle(i);
  cell.userData={kind:'cell',index:i,cellType,material:mat,sanctuary,barrier,baseColor:new THREE.Color(color),baseEmissive:country ? .72 : sanctuary ? 1.0 : barrier ? .9 : local===3 ? .34 : .26};scene.add(cell);runtime.trackCells.push(cell);
  const underMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country?.accent||color),transparent:true,opacity:country ? .12 : sanctuary ? .11 : .045,depthWrite:false,blending:THREE.AdditiveBlending});
  const under=mesh(new RoundedBoxGeometry(country ? 1.23 : .98,.055,country ? .98 : .80,3,.08),underMat,false,false);under.position.copy(p);under.position.y-=.19;under.rotation.y=cell.rotation.y;scene.add(under);
  const edgeMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country?.accent||(sanctuary ? '#f4d88b' : '#7bddea')),transparent:true,opacity:country ? .55 : sanctuary ? .42 : .15,depthWrite:false});
  const edge=mesh(new THREE.RingGeometry(country ? .48 : .36,country ? .54 : .405,8),edgeMat,false,false);edge.position.copy(p);edge.position.y+=.17;edge.rotation.x=-Math.PI/2;edge.rotation.z=-cell.rotation.y;scene.add(edge);
  if((local===3||local===4)&&!runtime.mobile){
   const supportMat=makeMaterial('#111718',{metal:.86,rough:.3,emissive:'#16343a',emissiveIntensity:.12});
   const support=mesh(new THREE.CylinderGeometry(.11,.18,Math.max(.32,elevation+1.18),8),supportMat,true,true);support.position.set(p.x,(elevation-1.28)/2,p.z);scene.add(support);
  }
  if(local===3){
   const railGlow=new THREE.MeshBasicMaterial({color:0x72e5f5,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false});
   [-.28,.28].forEach(side=>{const bar=mesh(new THREE.BoxGeometry(.06,.08,.72),railGlow,false,false);bar.position.copy(p);bar.position.y+=.18;bar.rotation.y=tangentAngle(i);bar.translateX(side);scene.add(bar);});
  }
  if(sanctuary)addSanctuaryFx(scene,cell,'#f0ca72',runtime);
  if(country){
   const beaconMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.38,blending:THREE.AdditiveBlending,depthWrite:false});
   const beacon=mesh(new THREE.CylinderGeometry(.07,.34,2.1,12,1,true),beaconMat,false,false);beacon.position.copy(p);beacon.position.y+=.95;scene.add(beacon);
   runtime.beacons.push(beacon);
  }
 }
 COUNTRIES_3B.forEach(country=>{
  for(let i=0;i<HOME_LENGTH;i++){
   const p=worldFromPercent(homePosition(country,i),.60+i*.025);
   const mat=makeMaterial(country.accent,{metal:.82,rough:.2,emissive:country.accent,emissiveIntensity:.38+i*.05});
   const geometry=i%2===0?new THREE.CylinderGeometry(.39+i*.014,.34+i*.01,.21,8):new THREE.BoxGeometry(.62,.19,.52);
   const cell=mesh(geometry,mat,true,true);cell.position.copy(p);cell.rotation.y=tangentAngle(country.start);scene.add(cell);
  }
 });
}
function addGate(scene,country,active,runtime){
 const p=worldFromPercent(stableCenter(country),.12),start=worldFromPercent(trackPosition(country.start),trackElevation(country.start)+.08);
 const bridgeVector=start.clone().sub(p),bridgeLength=Math.max(.8,Math.hypot(bridgeVector.x,bridgeVector.z)),bridgeMid=p.clone().add(start).multiplyScalar(.5);
 const bridgeMat=makeMaterial('#2b383a',{metal:.72,rough:.30,emissive:country.accent,emissiveIntensity:active ? .18 : .07});
 const bridge=mesh(new THREE.BoxGeometry(.72,.12,bridgeLength),bridgeMat,true,true);bridge.position.set(bridgeMid.x,.30,bridgeMid.z);bridge.rotation.y=Math.atan2(bridgeVector.x,bridgeVector.z);scene.add(bridge);
 const bridgeGlow=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:active ? .34 : .13,depthWrite:false,blending:THREE.AdditiveBlending});
 const guide=mesh(new THREE.BoxGeometry(.08,.035,bridgeLength*.92),bridgeGlow,false,false);guide.position.set(bridgeMid.x,.38,bridgeMid.z);guide.rotation.y=bridge.rotation.y;scene.add(guide);
 const group=new THREE.Group();group.position.copy(p);group.lookAt(0,p.y,0);
 const dark=makeMaterial('#0b1214',{metal:.72,rough:.34,emissive:country.accent,emissiveIntensity:active ? .20 : .05});
 const accent=makeMaterial(country.accent,{metal:.78,rough:.22,emissive:country.accent,emissiveIntensity:active ? .68 : .12});
 const dock=mesh(new THREE.CylinderGeometry(1.42,1.55,.24,16),dark,true,true);dock.position.y=-.02;group.add(dock);
 const dockRing=mesh(new THREE.TorusGeometry(1.22,.055,8,48),new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:active ? .38 : .16,depthWrite:false}),false,false);dockRing.rotation.x=Math.PI/2;dockRing.position.y=.13;group.add(dockRing);
 const pedestal=mesh(new THREE.CylinderGeometry(.80,.94,.30,10),dark,true,true);pedestal.position.y=.10;group.add(pedestal);
 [-.53,.53].forEach(x=>{
  const tower=mesh(new THREE.CylinderGeometry(.13,.19,1.30,8),accent,true,true);tower.position.set(x,.76,0);group.add(tower);
  const cap=mesh(new THREE.ConeGeometry(.20,.30,8),accent,true,true);cap.position.set(x,1.55,0);group.add(cap);
 });
 const arch=mesh(new THREE.TorusGeometry(.55,.09,8,28,Math.PI),accent,true,true);arch.position.y=1.30;group.add(arch);
 const core=mesh(new THREE.OctahedronGeometry(.20,0),makeMaterial('#d9f8ff',{metal:.35,rough:.15,emissive:country.accent,emissiveIntensity:1.7}),false,false);
 core.position.y=.91;group.add(core);
 const label=spriteLabel(country.code,country.accent,country.value,1.48,.46);label.position.set(0,1.91,.02);group.add(label);
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
 const light=new THREE.PointLight(0x67dff2,20,10,2);light.position.set(0,2.3,0);group.add(light);runtime.nexusLight=light;
 const beamMat=new THREE.MeshBasicMaterial({color:0x76e7f5,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const beam=mesh(new THREE.CylinderGeometry(.22,.72,5.2,24,1,true),beamMat,false,false);beam.position.y=3.35;group.add(beam);runtime.nexusBeam=beam;runtime.nexusBeamMat=beamMat;
 const label=spriteLabel('3B','#e7c77e','NEXUS',1.5,.5);label.position.set(0,2.35,0);group.add(label);
 scene.add(group);
}
function addAtmosphere(scene,runtime){
 const count=180,positions=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const radius=12+Math.random()*18,angle=Math.random()*Math.PI*2;
  positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=.5+Math.random()*9;positions[i*3+2]=Math.sin(angle)*radius;
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const mat=new THREE.PointsMaterial({color:0x86e7f1,size:.035,transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending});
 const stars=new THREE.Points(geo,mat);scene.add(stars);runtime.stars=stars;
}
function cameraPoseForCountry(country,mobile=false){
 const stable=worldFromPercent(stableCenter(country),.55),radial=stable.clone();radial.y=0;
 if(radial.lengthSq()<.001)radial.set(0,0,1);radial.normalize();
 const side=new THREE.Vector3(-radial.z,0,radial.x);
 return{
  target:stable.clone().multiplyScalar(.56).setY(.48),
  position:stable.clone().add(radial.multiplyScalar(mobile?13.4:14.8)).add(side.multiplyScalar(2.1)).setY(mobile?17.2:18.6),
 };
}
function createTurnAnchor(scene,runtime){
 const group=new THREE.Group(),ringMat=new THREE.MeshBasicMaterial({color:0x6ee7f7,transparent:true,opacity:.36,blending:THREE.AdditiveBlending,depthWrite:false});
 const ring=mesh(new THREE.TorusGeometry(1.52,.045,8,64),ringMat,false,false);ring.rotation.x=Math.PI/2;group.add(ring);
 const ring2=mesh(new THREE.TorusGeometry(1.18,.025,6,48),ringMat,false,false);ring2.rotation.x=Math.PI/2;ring2.rotation.z=Math.PI/8;group.add(ring2);
 const beamMat=new THREE.MeshBasicMaterial({color:0x7eeaff,transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const beam=mesh(new THREE.CylinderGeometry(.28,.82,3.8,18,1,true),beamMat,false,false);beam.position.y=1.8;group.add(beam);
 const light=new THREE.PointLight(0x74e7f7,9,7,2);light.position.y=1.2;group.add(light);
 scene.add(group);runtime.turnAnchor={group,ring,ring2,ringMat,beamMat,light,countryId:null};
}
function updateTurnAnchor(runtime,match){
 const player=match?.players?.[match.turn],country=countryFor(player?.countryId);if(!country||!runtime.turnAnchor)return;
 const p=worldFromPercent(stableCenter(country),.30);runtime.turnAnchor.group.position.copy(p);runtime.turnAnchor.ringMat.color.set(country.accent);runtime.turnAnchor.beamMat.color.set(country.accent);runtime.turnAnchor.light.color.set(country.accent);
 if(runtime.turnAnchor.countryId!==country.id){
  runtime.turnAnchor.countryId=country.id;
  const pose=cameraPoseForCountry(country,runtime.mobile);runtime.baseTarget.copy(pose.target);runtime.desiredCameraPosition.copy(pose.position);runtime.cameraFollowUntil=performance.now()+980;
 }
}
function createCaptureCinematic(runtime,victim,country,target,startedAt){
 const group=new THREE.Group();group.position.copy(victim.position);
 const glow=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.88,blending:THREE.AdditiveBlending,depthWrite:false});
 const upper=mesh(new RoundedBoxGeometry(.58,.58,.40,4,.08),glow,false,false);upper.position.y=.88;group.add(upper);
 const lower=mesh(new RoundedBoxGeometry(.52,.52,.36,4,.08),glow,false,false);lower.position.y=.30;group.add(lower);
 const cut=mesh(new THREE.TorusGeometry(.35,.04,6,48),glow,false,false);cut.rotation.x=Math.PI/2;cut.position.y=.59;group.add(cut);
 const whole=new THREE.Group();whole.visible=false;
 const wholeBody=mesh(new RoundedBoxGeometry(.54,.92,.38,5,.09),glow,false,false);wholeBody.position.y=.52;whole.add(wholeBody);
 const wholeHead=mesh(new THREE.SphereGeometry(.18,12,9),glow,false,false);wholeHead.position.y=1.08;whole.add(wholeHead);
 const wholeBase=mesh(new THREE.CylinderGeometry(.35,.43,.10,12),glow,false,false);wholeBase.position.y=.03;whole.add(wholeBase);
 const wholeCore=mesh(new THREE.SphereGeometry(.09,10,7),glow,false,false);wholeCore.position.set(0,.58,.21);whole.add(wholeCore);
 group.add(whole);
 const shards=[];for(let i=0;i<10;i++){const shard=mesh(new THREE.OctahedronGeometry(.052,0),glow,false,false),a=i/10*Math.PI*2;shard.position.set(Math.cos(a)*.32,.60,Math.sin(a)*.32);group.add(shard);shards.push(shard);}
 runtime.scene.add(group);
 runtime.captureCinematics.push({group,upper,lower,cut,whole,wholeCore,shards,material:glow,victim,target:target.clone(),origin:victim.position.clone(),startedAt,duration:CINEMATIC_CAPTURE_MS,activated:false});
}
function createPiece(country,pieceIndex,shadows){
 const archetype=WARRIOR_ARCHETYPES[pieceIndex%WARRIOR_ARCHETYPES.length],group=new THREE.Group();
 group.userData={kind:'piece',countryId:country.id,pieceIndex,archetype,legal:false,target:new THREE.Vector3(),isMoving:false,landingUntil:0,captureReturn:null,attackUntil:0,attackStartedAt:0,hitUntil:0};
 const segments=COUNTRY_SEGMENTS[country.shape]||10;
 const goldMat=makeMaterial('#d2b06a',{metal:.94,rough:.18,emissive:'#71541e',emissiveIntensity:.16});
 const darkMat=makeMaterial('#11191b',{metal:.72,rough:.34,emissive:country.accent,emissiveIntensity:.08});
 const bodyMat=makeMaterial(country.accent,{metal:.72,rough:.22,emissive:country.accent,emissiveIntensity:.25,clearcoat:.82});
 const skinMat=makeMaterial('#b98f72',{metal:.10,rough:.62,emissive:'#3b2318',emissiveIntensity:.03});
 const coreMat=makeMaterial('#e8fbff',{metal:.12,rough:.06,emissive:country.accent,emissiveIntensity:2.2});
 const base=mesh(new THREE.CylinderGeometry(.46,.54,.15,14),goldMat,shadows,shadows);base.position.y=.075;group.add(base);
 const hitboxMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
 const hitbox=mesh(new THREE.CylinderGeometry(.72,.82,1.78,12),hitboxMat,false,false);hitbox.position.y=.74;group.add(hitbox);
 const rig=new THREE.Group();rig.position.y=.12;group.add(rig);
 const leg=(x)=>{
  const pivot=new THREE.Group();pivot.position.set(x,.40,0);
  const boot=mesh(new THREE.CylinderGeometry(.08,.10,.40,8),darkMat,shadows,shadows);boot.position.y=-.16;pivot.add(boot);
  const foot=mesh(new THREE.BoxGeometry(.18,.09,.28),darkMat,shadows,shadows);foot.position.set(0,-.37,.055);pivot.add(foot);rig.add(pivot);return pivot;
 };
 const leftLeg=leg(-.13),rightLeg=leg(.13);
 const torso=mesh(new THREE.BoxGeometry(.46,.48,.30),bodyMat,shadows,shadows);torso.position.y=.70;rig.add(torso);
 const chest=mesh(new THREE.BoxGeometry(.50,.19,.34),goldMat,shadows,shadows);chest.position.set(0,.80,.015);rig.add(chest);
 const belt=mesh(new THREE.BoxGeometry(.44,.08,.31),darkMat,shadows,shadows);belt.position.y=.48;rig.add(belt);
 const head=mesh(new THREE.SphereGeometry(.17,12,9),skinMat,shadows,shadows);head.position.y=1.07;rig.add(head);
 const helmet=mesh(country.shape==='star'?new THREE.ConeGeometry(.23,.25,5):new THREE.ConeGeometry(.22,.24,Math.max(6,segments)),goldMat,shadows,shadows);helmet.position.y=1.24;rig.add(helmet);
 const eye=mesh(new THREE.BoxGeometry(.18,.035,.025),coreMat,false,false);eye.position.set(0,1.08,.17);rig.add(eye);
 const makeArm=(x)=>{
  const pivot=new THREE.Group();pivot.position.set(x,.86,0);
  const arm=mesh(new THREE.CylinderGeometry(.055,.07,.40,8),bodyMat,shadows,shadows);arm.position.y=-.16;pivot.add(arm);rig.add(pivot);return pivot;
 };
 const leftArm=makeArm(-.31),rightArm=makeArm(.31),weaponPivot=new THREE.Group();weaponPivot.position.set(.38,.73,.06);rig.add(weaponPivot);
 let shieldPivot=null;
 if(archetype==='axe'){
  const handle=mesh(new THREE.CylinderGeometry(.026,.026,.72,7),darkMat,shadows,shadows);handle.position.y=.08;weaponPivot.add(handle);
  const blade=mesh(new THREE.BoxGeometry(.31,.15,.075),goldMat,shadows,shadows);blade.position.set(.08,.41,0);weaponPivot.add(blade);
 }else if(archetype==='sword'){
  const blade=mesh(new THREE.BoxGeometry(.075,.64,.035),coreMat,shadows,shadows);blade.position.y=.18;weaponPivot.add(blade);
  const guard=mesh(new THREE.BoxGeometry(.30,.055,.08),goldMat,shadows,shadows);guard.position.y=-.11;weaponPivot.add(guard);
  const grip=mesh(new THREE.CylinderGeometry(.035,.035,.21,7),darkMat,shadows,shadows);grip.position.y=-.22;weaponPivot.add(grip);
 }else if(archetype==='shield'){
  const shortBlade=mesh(new THREE.BoxGeometry(.07,.43,.035),coreMat,shadows,shadows);shortBlade.position.y=.05;weaponPivot.add(shortBlade);
  shieldPivot=new THREE.Group();shieldPivot.position.set(-.39,.74,.18);rig.add(shieldPivot);
  const shield=mesh(new THREE.CylinderGeometry(.29,.31,.075,8),goldMat,shadows,shadows);shield.rotation.x=Math.PI/2;shieldPivot.add(shield);
  const boss=mesh(new THREE.SphereGeometry(.09,10,7),coreMat,false,false);boss.position.z=.06;shieldPivot.add(boss);
 }else{
  const bow=mesh(new THREE.TorusGeometry(.29,.025,6,26,Math.PI*1.55),goldMat,shadows,shadows);bow.rotation.set(0,0,Math.PI/2);weaponPivot.add(bow);
  const arrow=mesh(new THREE.CylinderGeometry(.018,.018,.64,6),coreMat,shadows,shadows);arrow.position.set(0,.03,.02);weaponPivot.add(arrow);
 }
 const haloMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
 const halo=mesh(new THREE.TorusGeometry(.58,.035,6,36),haloMat,false,false);halo.rotation.x=Math.PI/2;halo.position.y=.08;group.add(halo);
 const rimMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide});
 const rim=mesh(new THREE.CylinderGeometry(.34,.46,1.14,segments),rimMat,false,false);rim.position.y=.68;rim.scale.setScalar(1.05);group.add(rim);
 const badge=spriteLabel(country.crest,'#f4d895','',.30,.30);badge.position.set(0,.78,.19);rig.add(badge);
 group.userData.bodyMat=bodyMat;group.userData.coreMat=coreMat;group.userData.haloMat=haloMat;group.userData.rimMat=rimMat;group.userData.model=rig;group.userData.crown=helmet;
 group.userData.rig=rig;group.userData.leftLeg=leftLeg;group.userData.rightLeg=rightLeg;group.userData.leftArm=leftArm;group.userData.rightArm=rightArm;group.userData.weaponPivot=weaponPivot;group.userData.shieldPivot=shieldPivot;
 group.traverse(o=>{o.userData.pieceRoot=group;});
 return group;
}
function createBarrierFx(runtime,cell){
 const group=new THREE.Group();group.position.copy(cell.position);group.position.y+=.12;
 const shieldMat=new THREE.MeshBasicMaterial({color:0x6de7f5,transparent:true,opacity:.19,wireframe:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const dome=mesh(new THREE.SphereGeometry(.68,18,10,0,Math.PI*2,0,Math.PI/2),shieldMat,false,false);group.add(dome);
 const pylonMat=makeMaterial('#5bddea',{metal:.82,rough:.18,emissive:'#65e7f7',emissiveIntensity:1.2});
 [-.42,.42].forEach(x=>{const p=mesh(new THREE.CylinderGeometry(.07,.11,.64,8),pylonMat,true,true);p.position.set(x,.22,0);group.add(p);});
 const ringMat=new THREE.MeshBasicMaterial({color:0xa2f5ff,transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending});
 const ring=mesh(new THREE.TorusGeometry(.61,.025,6,40),ringMat,false,false);ring.rotation.x=Math.PI/2;ring.position.y=.04;group.add(ring);
 runtime.scene.add(group);runtime.barrierFx.set(cell.userData.index,{group,dome,shieldMat,ring,ringMat});
}
function syncBarrierFx(runtime,match){
 runtime.trackCells.forEach(cell=>{
  const barrier=blockadeOwnerAt(match,cell.userData.index)!==null,existing=runtime.barrierFx.get(cell.userData.index);
  if(barrier&&!existing)createBarrierFx(runtime,cell);
  if(!barrier&&existing){runtime.scene.remove(existing.group);disposeTree(existing.group);runtime.barrierFx.delete(cell.userData.index);}
 });
}
function clearLegalFx(runtime){
 for(const fx of runtime.legalFx){runtime.scene.remove(fx.group);disposeTree(fx.group);}
 runtime.legalFx.length=0;
}
function syncLegalFx(runtime,match,legal=[]){
 clearLegalFx(runtime);
 if(!match?.pendingRoll||!legal?.length)return;
 const player=match.players?.[match.turn],country=countryFor(player?.countryId);if(!country)return;
 legal.forEach(pieceIndex=>{
  const move=previewMove(match,pieceIndex,match.pendingRoll,match.turn);if(!move)return;
  const p=pieceWorldPosition(country,move.to,pieceIndex),color=move.captures?.length?'#f5c56d':move.sanctuary?'#ffe29b':'#82ecf7';
  const group=new THREE.Group();group.position.copy(p);group.position.y-=.32;
  const ringMat=new THREE.MeshBasicMaterial({color:new THREE.Color(color),transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false});
  const ring=mesh(new THREE.TorusGeometry(.52,.045,8,48),ringMat,false,false);ring.rotation.x=Math.PI/2;group.add(ring);
  const markerMat=new THREE.MeshBasicMaterial({color:new THREE.Color(color),transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false});
  const marker=mesh(new THREE.ConeGeometry(.16,.42,6),markerMat,false,false);marker.position.y=.55;marker.rotation.x=Math.PI;group.add(marker);
  runtime.scene.add(group);runtime.legalFx.push({group,ring,ringMat,marker,markerMat,pieceIndex});
 });
}
function updateBoardState(runtime,match,loadout=null,legal=[]){
 const theme=countryFor(match.rules?.boardTheme),themeColor=theme?.accent||'#45dff6';
 if(runtime.themeLight){runtime.themeLight.color.set(themeColor);runtime.themeLight.intensity=loadout?.board_skin==='DADA_BOARD_EIGHT_VALUES'?22:18;}
 runtime.trackCells.forEach(cell=>{
  const barrier=blockadeOwnerAt(match,cell.userData.index)!==null;
  cell.userData.barrier=barrier;
  if(barrier){cell.material.color.set('#163f46');cell.material.emissive.set('#65dff0');cell.material.emissiveIntensity=.68;}
  else{cell.material.color.copy(cell.userData.baseColor);cell.material.emissive.copy(cell.userData.baseColor);cell.material.emissiveIntensity=cell.userData.baseEmissive;}
 });
 syncBarrierFx(runtime,match);
 syncLegalFx(runtime,match,legal);
}
function updatePieces(runtime,match,legal,motion,cosmeticsByCountry=null,loadout=null){
 const live=new Set(),captureEvent=match?.lastEvent?.captured?.length?match.lastEvent:null;
 const captureKey=captureEvent?(captureEvent.id??[match.sequence,captureEvent.countryId,captureEvent.pieceIndex,captureEvent.landing].join(':')):null;
 const isNewCapture=Boolean(captureEvent&&captureKey!==runtime.lastCaptureEventKey);
 if(isNewCapture){
  const actionAt=performance.now(),attacker=runtime.pieceMap.get(captureEvent.countryId+':'+captureEvent.pieceIndex);
  if(attacker){attacker.userData.attackStartedAt=actionAt;attacker.userData.attackUntil=actionAt+780;}
  for(const captured of captureEvent.captured||[]){
   const group=runtime.pieceMap.get(captured.countryId+':'+captured.pieceIndex),country=countryFor(captured.countryId);
   if(!group||!country)continue;
   const target=pieceWorldPosition(country,STABLE,captured.pieceIndex);
   group.userData.hitUntil=actionAt+620;
   group.userData.captureReturn={from:group.position.clone(),to:target.clone(),startedAt:actionAt+260,duration:CINEMATIC_CAPTURE_MS};
   createCaptureCinematic(runtime,group,country,target,actionAt+260);
  }
  runtime.lastCaptureEventKey=captureKey;
 }
 match.players.forEach((player,playerIndex)=>{
  const country=countryFor(player.countryId);
  player.pieces.forEach((piece,pieceIndex)=>{
   const key=country.id+':'+pieceIndex;live.add(key);
   let group=runtime.pieceMap.get(key),created=false;
   if(!group){group=createPiece(country,pieceIndex,runtime.shadows);runtime.pieces.add(group);runtime.pieceMap.set(key,group);created=true;}
   const shown=motion?.countryId===country.id&&motion.pieceIndex===pieceIndex?motion.step:piece.steps;
   group.userData.target.copy(pieceWorldPosition(country,shown,pieceIndex));if(created)group.position.copy(group.userData.target);
   group.userData.legal=playerIndex===match.turn&&legal.includes(pieceIndex)&&!motion;
   const movingNow=motion?.countryId===country.id&&motion.pieceIndex===pieceIndex,wasMoving=group.userData.isMoving;
   group.userData.isMoving=movingNow;if(wasMoving&&!movingNow)group.userData.landingUntil=performance.now()+320;
   const playerLoadout=cosmeticsByCountry?.[country.id]||loadout||{},trail=playerLoadout.trail||'';
   group.userData.trail=trail;
   group.userData.haloMat.color.set(trail==='DADA_TRAIL_GOLD'?'#e6bd68':trail==='DADA_TRAIL_MATRIX'?'#5cd9ff':country.accent);
   group.userData.bodyMat.metalness=playerLoadout.totem_skin&&playerLoadout.totem_skin!=='DADA_TOTEM_CORE' ? .82 : .7;
   group.userData.bodyMat.emissiveIntensity=group.userData.legal ? .72 : playerLoadout.totem_skin&&playerLoadout.totem_skin!=='DADA_TOTEM_CORE' ? .27 : .16;
   group.userData.coreMat.emissiveIntensity=group.userData.legal?4.1:2.65;
   group.userData.rimMat.opacity=group.userData.legal ? .34 : .13;
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
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.52;
  renderer.shadowMap.enabled=shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.className='dada3b-three-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d2730);scene.fog=new THREE.FogExp2(0x0d2730,.010);
  const camera=new THREE.PerspectiveCamera(38,1,.1,90);camera.position.set(0,18.9,16.5);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.target.set(0,.28,0);
  controls.minDistance=14;controls.maxDistance=31;controls.minPolarAngle=.40;controls.maxPolarAngle=1.22;controls.rotateSpeed=.62;controls.zoomSpeed=.72;controls.panSpeed=.45;
  controls.enablePan=!mobile;controls.update();
  scene.add(new THREE.HemisphereLight(0xd7faff,0x49351b,2.72));
  const key=new THREE.DirectionalLight(0xffecc2,5.9);key.position.set(-8,18,10);key.castShadow=shadows;
  if(shadows){key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=15;key.shadow.camera.bottom=-15;key.shadow.bias=-.00025;}
  scene.add(key);
  const blue=new THREE.PointLight(0x72e6f5,18,34,2);blue.position.set(9,8,-9);scene.add(blue);
  const gold=new THREE.PointLight(0xe4c173,13,28,2);gold.position.set(-10,6,9);scene.add(gold);
  const fill=new THREE.PointLight(0xe7fbff,15,28,2);fill.position.set(0,10,12);scene.add(fill);
  const rim=new THREE.PointLight(0x8cebf5,9,28,2);rim.position.set(0,6,-15);scene.add(rim);
  const ground=mesh(new THREE.CircleGeometry(38,64),makeMaterial('#0d1c21',{metal:.08,rough:.9,emissive:'#123842',emissiveIntensity:.16}),false,true);ground.rotation.x=-Math.PI/2;ground.position.y=-1.38;scene.add(ground);
  const pieces=new THREE.Group();scene.add(pieces);
  const runtime={renderer,scene,camera,controls,pieces,pieceMap:new Map(),trackCells:[],barrierFx:new Map(),sanctuaryFx:[],legalFx:[],shadows,mobile,themeLight:blue,energyRail:null,nexusRings:[],nexusCore:null,nexusLight:null,nexusBeam:null,nexusBeamMat:null,stars:null,gateHalos:[],beacons:[],effects:[],captureCinematics:[],focusUntil:0,focusType:'',focusTarget:new THREE.Vector3(0,.35,0),baseTarget:new THREE.Vector3(0,.35,0),desiredCameraPosition:new THREE.Vector3(0,18.9,16.5),cameraFollowUntil:0,cameraShakeUntil:0,lastCaptureEventKey:null,pointerPick:null,contextLost:false,contextLossTimer:null,disposed:false};
  runtimeRef.current=runtime;
  addBoardFoundation(scene,runtime);addTrackCells(scene,match,runtime);
  COUNTRIES_3B.forEach(c=>addGate(scene,c,match.players.some(p=>p.countryId===c.id),runtime));
  addNexus(scene,runtime);addAtmosphere(scene,runtime);createTurnAnchor(scene,runtime);updateTurnAnchor(runtime,match);updateBoardState(runtime,match,loadout,legal);updatePieces(runtime,match,legal,motion,cosmeticsByCountry,loadout);
  const resize=()=>{
   const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;
   renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
  };
  resize();const ro=new ResizeObserver(resize);ro.observe(host);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),tap=new TapControl(14);
  const eventPoint=e=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;};
  const legalPieceAt=e=>{eventPoint(e);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects([...runtime.pieceMap.values()],true).map(i=>findPieceRoot(i.object)).find(root=>root?.userData.legal)||null;};
  const restoreControls=()=>{controls.enabled=true;runtime.pointerPick=null;};
  const pointerDown=e=>{
   if(e.button!==0)return;tap.begin(e.pointerId,e.clientX,e.clientY);
   const hit=legalPieceAt(e);if(hit){runtime.pointerPick={pointerId:e.pointerId,root:hit};runtime.cameraFollowUntil=0;controls.enabled=false;renderer.domElement.style.cursor='pointer';}
  };
  const pointerMove=e=>{
   tap.move(e.pointerId,e.clientX,e.clientY);
   if(runtime.pointerPick?.pointerId===e.pointerId)return;
   if(e.pointerType==='touch')return;
   const hit=legalPieceAt(e);renderer.domElement.style.cursor=hit?'pointer':'grab';
  };
  const pointerUp=e=>{
   const stored=runtime.pointerPick?.pointerId===e.pointerId?runtime.pointerPick.root:null,tapped=tap.end(e.pointerId,e.clientX,e.clientY);
   const hit=stored?.userData.legal?stored:(tapped?legalPieceAt(e):null);restoreControls();
   if(tapped&&hit)onPieceRef.current?.(hit.userData.pieceIndex);
  };
  const pointerCancel=e=>{tap.cancel(e.pointerId);if(runtime.pointerPick?.pointerId===e.pointerId)restoreControls();};
  const cancelTaps=()=>{tap.reset();restoreControls();};
  const contextLost=e=>{
   e.preventDefault();runtime.contextLost=true;cancelTaps();
   if(runtime.contextLossTimer)clearTimeout(runtime.contextLossTimer);
   runtime.contextLossTimer=setTimeout(()=>{if(runtime.contextLost&&!runtime.disposed)onUnsupported?.(new Error('Contexte WebGL indisponible.'));},1800);
  };
  const contextRestored=()=>{
   runtime.contextLost=false;
   if(runtime.contextLossTimer){clearTimeout(runtime.contextLossTimer);runtime.contextLossTimer=null;}
  };
  renderer.domElement.addEventListener('webglcontextlost',contextLost,false);
  renderer.domElement.addEventListener('webglcontextrestored',contextRestored,false);
  renderer.domElement.addEventListener('pointerdown',pointerDown,{passive:true});renderer.domElement.addEventListener('pointermove',pointerMove,{passive:true});renderer.domElement.addEventListener('pointerup',pointerUp,{passive:true});
  renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('lostpointercapture',pointerCancel);window.addEventListener('blur',cancelTaps);
  let frame=0;const clock=new THREE.Clock();
  const animate=()=>{
   if(runtime.disposed)return;frame=requestAnimationFrame(animate);const t=clock.getElapsedTime(),now=performance.now(),focus=now<runtime.focusUntil;
   controls.autoRotate=focus&&runtime.focusType==='victory';controls.autoRotateSpeed=.8;
   const desiredTarget=focus?runtime.focusTarget:runtime.baseTarget;controls.target.lerp(desiredTarget,.075);
   if(now<runtime.cameraFollowUntil)camera.position.lerp(runtime.desiredCameraPosition,.065);
   controls.update();
   renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,focus?1.62:1.52,.06);
   camera.fov=THREE.MathUtils.lerp(camera.fov,focus ? (runtime.focusType==='victory' ? 31 : 34) : 38,.055);camera.updateProjectionMatrix();
   runtime.energyRail.material.opacity=.32+Math.sin(t*2.2)*.12;
   runtime.nexusRings.forEach((ring,i)=>{ring.rotation.y+=.003*(i+1);ring.rotation.z+=.0015*(i%2?1:-1);});
   if(runtime.nexusCore){runtime.nexusCore.rotation.x=t*.55;runtime.nexusCore.rotation.y=t*.82;runtime.nexusCore.scale.setScalar(1+Math.sin(t*3)*.035);}
   if(runtime.nexusLight)runtime.nexusLight.intensity=18+Math.sin(t*2.7)*4;
   if(runtime.nexusBeamMat)runtime.nexusBeamMat.opacity=.13+Math.sin(t*2.1)*.055;
   if(runtime.stars)runtime.stars.rotation.y=t*.006;
   runtime.gateHalos.forEach((halo,i)=>{halo.rotation.z=t*(.14+i*.005);halo.material.opacity=.24+Math.sin(t*1.5+i)*.09;});
   runtime.beacons.forEach((beacon,i)=>{beacon.material.opacity=.18+Math.sin(t*1.7+i*.4)*.06;});
   if(runtime.turnAnchor){runtime.turnAnchor.ring.rotation.z=t*.32;runtime.turnAnchor.ring2.rotation.z=-t*.24;runtime.turnAnchor.ringMat.opacity=.28+Math.sin(t*3.1)*.13;runtime.turnAnchor.beamMat.opacity=.055+Math.sin(t*2.3)*.025;runtime.turnAnchor.light.intensity=8+Math.sin(t*2.8)*2;}
   runtime.legalFx.forEach((fx,i)=>{fx.ring.rotation.z+=.018;fx.ringMat.opacity=.62+Math.sin(t*5+i)*.22;fx.marker.position.y=.52+Math.sin(t*5.5+i)*.08;});
   runtime.sanctuaryFx.forEach((fx,i)=>{fx.ring.rotation.z+=.004+i*.0002;fx.ringMat.opacity=.48+Math.sin(t*2.4+i)*.18;fx.beamMat.opacity=.09+Math.sin(t*1.8+i)*.045;});
   for(const fx of runtime.barrierFx.values()){fx.ring.rotation.z-=.012;fx.shieldMat.opacity=.14+Math.sin(t*3)*.07;fx.ringMat.opacity=.48+Math.sin(t*4)*.16;}
   for(const group of runtime.pieceMap.values()){
    const data=group.userData,captureReturn=data.captureReturn,target=data.target;
    if(captureReturn){
     const raw=Math.max(0,Math.min(1,(now-captureReturn.startedAt)/captureReturn.duration)),k=raw*raw*(3-2*raw);
     group.position.lerpVectors(captureReturn.from,captureReturn.to,k);group.scale.setScalar(.92+Math.sin(Math.PI*k)*.04);
     if(raw>=1){group.position.copy(captureReturn.to);group.scale.setScalar(1);data.captureReturn=null;data.rig.visible=true;}
    }else{
     const landingLeft=Math.max(0,data.landingUntil-now),landing=landingLeft>0?Math.sin((1-landingLeft/320)*Math.PI)*.17:0;
     const bob=data.legal?Math.sin(t*4.6+data.pieceIndex)*.085:data.isMoving?Math.abs(Math.sin(t*11))*0.15:landing;
     const dx=target.x-group.position.x,dz=target.z-group.position.z;
     if(data.isMoving&&Math.hypot(dx,dz)>.025)group.rotation.y=THREE.MathUtils.lerp(group.rotation.y,Math.atan2(dx,dz),.24);
     group.position.x=THREE.MathUtils.lerp(group.position.x,target.x,.23);group.position.z=THREE.MathUtils.lerp(group.position.z,target.z,.23);group.position.y=THREE.MathUtils.lerp(group.position.y,target.y+bob,.25);
     const pulse=data.legal?1+Math.sin(t*5.5)*.035:landingLeft>0?1.04:1;group.scale.setScalar(pulse);
    }
    const walk=data.isMoving?Math.sin(t*13+data.pieceIndex)*.52:Math.sin(t*1.8+data.pieceIndex)*.035;
    const attacking=now<data.attackUntil,attackDuration=Math.max(1,data.attackUntil-data.attackStartedAt),attackT=attacking?Math.max(0,Math.min(1,(now-data.attackStartedAt)/attackDuration)):0,strike=Math.sin(Math.PI*attackT);
    const hit=now<data.hitUntil,hitJolt=hit?Math.sin((data.hitUntil-now)*.045)*.18:0;
    if(data.leftLeg)data.leftLeg.rotation.x=THREE.MathUtils.lerp(data.leftLeg.rotation.x,walk,.28);
    if(data.rightLeg)data.rightLeg.rotation.x=THREE.MathUtils.lerp(data.rightLeg.rotation.x,-walk,.28);
    if(data.leftArm)data.leftArm.rotation.x=THREE.MathUtils.lerp(data.leftArm.rotation.x,-walk*.55,.24);
    if(data.rightArm)data.rightArm.rotation.x=THREE.MathUtils.lerp(data.rightArm.rotation.x,walk*.55-strike*.75,.24);
    if(data.weaponPivot){
     const idle=Math.sin(t*2.2+data.pieceIndex)*.06;
     const weaponZ=data.archetype==='axe'?-0.34-strike*1.55:data.archetype==='sword'?-0.12-strike*1.18:data.archetype==='shield'?-0.05-strike*.82:-0.18-strike*.44;
     data.weaponPivot.rotation.z=THREE.MathUtils.lerp(data.weaponPivot.rotation.z,weaponZ+idle,.28);
     data.weaponPivot.rotation.x=THREE.MathUtils.lerp(data.weaponPivot.rotation.x,data.archetype==='bow'?-.18-strike*.42:.06+strike*.22,.25);
    }
    if(data.shieldPivot){
     data.shieldPivot.rotation.y=THREE.MathUtils.lerp(data.shieldPivot.rotation.y,attacking?-.58:-.18,.25);
     data.shieldPivot.position.z=THREE.MathUtils.lerp(data.shieldPivot.position.z,attacking ? .30 : .18,.24);
    }
    if(data.rig){
     data.rig.position.y=.12+(data.isMoving?Math.abs(Math.sin(t*13))* .035:Math.sin(t*2+data.pieceIndex)*.015)+strike*.055;
     data.rig.position.z=THREE.MathUtils.lerp(data.rig.position.z,attacking?-.14:0,.22);
     data.rig.rotation.z=THREE.MathUtils.lerp(data.rig.rotation.z,hitJolt,.30);
    }
    data.haloMat.opacity=THREE.MathUtils.lerp(data.haloMat.opacity,data.legal ? .92 : .08,.14);
    data.rimMat.opacity=THREE.MathUtils.lerp(data.rimMat.opacity,data.legal ? .46 : .10,.14);
   }
   runtime.captureCinematics=runtime.captureCinematics.filter(fx=>{
    if(now<fx.startedAt)return true;
    if(!fx.activated){fx.activated=true;fx.victim.userData.rig.visible=false;fx.victim.userData.rimMat.opacity=0;fx.victim.userData.haloMat.opacity=0;}
    const raw=Math.max(0,Math.min(1,(now-fx.startedAt)/fx.duration));
    const split=Math.min(1,raw/.24),merge=Math.max(0,Math.min(1,(raw-.24)/.28)),travel=Math.max(0,Math.min(1,(raw-.52)/.36)),arrival=Math.max(0,Math.min(1,(raw-.88)/.12));
    const spread=.40*Math.sin(Math.PI*Math.min(1,split))*(1-merge);
    fx.upper.visible=merge<.98;fx.lower.visible=merge<.98;fx.cut.visible=merge<.96;fx.whole.visible=merge>=.96;
    fx.upper.position.x=spread;fx.upper.rotation.z=-spread*1.05;fx.lower.position.x=-spread;fx.lower.rotation.z=spread*.82;
    fx.cut.scale.setScalar(1+split*2.0-merge*.8);fx.material.opacity=.88-arrival*.38;
    fx.shards.forEach((shard,i)=>{const a=i/fx.shards.length*Math.PI*2;shard.visible=merge<.96;shard.position.x=Math.cos(a)*(.31+split*.50)*(1-merge);shard.position.z=Math.sin(a)*(.31+split*.50)*(1-merge);shard.position.y=.60+Math.sin(raw*Math.PI*3+i)*.12;});
    if(merge>0){fx.upper.position.x=THREE.MathUtils.lerp(fx.upper.position.x,0,merge);fx.lower.position.x=THREE.MathUtils.lerp(fx.lower.position.x,0,merge);}
    if(travel>0){const k=travel*travel*(3-2*travel);fx.group.position.lerpVectors(fx.origin,fx.target,k);fx.group.position.y+=Math.sin(Math.PI*k)*1.02;fx.whole.rotation.y+=.055;fx.wholeCore.scale.setScalar(1+Math.sin(raw*22)*.24);}
    if(arrival>0){fx.group.scale.setScalar(.92+Math.sin(Math.PI*arrival)*.15);fx.wholeCore.scale.setScalar(1+arrival*.8);}
    if(raw>=1){fx.victim.position.copy(fx.target);fx.victim.userData.rig.visible=true;fx.victim.userData.rimMat.opacity=.10;fx.victim.userData.haloMat.opacity=.08;runtime.scene.remove(fx.group);disposeTree(fx.group);return false;}
    return true;
   });
   runtime.effects=runtime.effects.filter(fx=>{
    const age=(now-fx.birth)/1000;if(age>.68){scene.remove(fx.group);disposeTree(fx.group);return false;}
    const k=age/.68;fx.group.scale.setScalar(.35+k*4.5);fx.material.opacity=(1-k)*.92;return true;
   });
   const shake=now<runtime.cameraShakeUntil?new THREE.Vector3(Math.sin(t*73)*.055,Math.sin(t*91)*.025,Math.cos(t*67)*.055):null;
   if(shake)camera.position.add(shake);if(!runtime.contextLost)renderer.render(scene,camera);if(shake)camera.position.sub(shake);
  };animate();
  return()=>{
   runtime.disposed=true;cancelAnimationFrame(frame);ro.disconnect();controls.dispose();
   if(runtime.contextLossTimer)clearTimeout(runtime.contextLossTimer);
   renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);
   renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('lostpointercapture',pointerCancel);window.removeEventListener('blur',cancelTaps);cancelTaps();
   disposeTree(scene);renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();runtimeRef.current=null;
  };
 },[]);
 useEffect(()=>{const runtime=runtimeRef.current;if(runtime){updateTurnAnchor(runtime,match);updateBoardState(runtime,match,loadout,legal);}},[match,legal,loadout]);
 useEffect(()=>{const runtime=runtimeRef.current;if(runtime)updatePieces(runtime,match,legal,motion,cosmeticsByCountry,loadout);},[match,motion,legal,cosmeticsByCountry,loadout]);
 useEffect(()=>{
  const runtime=runtimeRef.current;if(!runtime||!focusEvent)return;
  runtime.focusType=focusEvent;runtime.focusUntil=performance.now()+(focusEvent==='victory'?1700:focusEvent==='capture'?2050:820);
  runtime.focusTarget.copy(runtime.baseTarget);
  if(focusEvent==='victory')runtime.focusTarget.set(0,1.1,0);
  if(focusEvent==='capture'&&match.lastEvent?.landing!==null){const cp=worldFromPercent(trackPosition(match.lastEvent.landing),1.0);runtime.focusTarget.copy(cp);runtime.desiredCameraPosition.set(cp.x+4.8,9.4,cp.z+7.2);runtime.cameraFollowUntil=performance.now()+1950;}
  if(runtime.nexusLight)runtime.nexusLight.intensity=focusEvent==='capture'?27:focusEvent==='victory'?34:22;
 },[focusEvent,match.lastEvent?.id]);
 useEffect(()=>{
  const runtime=runtimeRef.current;if(!runtime||!blast)return;
  try{
   const p=worldFromPercent(blast,.82),group=new THREE.Group();group.position.copy(p),goldFx=blast.fx?.includes('GOLD');
   const material=new THREE.MeshBasicMaterial({color:goldFx?0xf2c66f:0x74e6f8,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false});
   const ring=mesh(new THREE.TorusGeometry(.58,.06,8,48),material,false,false);ring.rotation.x=Math.PI/2;group.add(ring);
   const ring2=mesh(new THREE.TorusGeometry(.42,.035,7,40),material,false,false);ring2.rotation.set(Math.PI/2,.65,.25);group.add(ring2);
   const core=mesh(new THREE.IcosahedronGeometry(.34,1),material,false,false);group.add(core);
   for(let i=0;i<10;i++){const shard=mesh(new THREE.ConeGeometry(.06,.48,5),material,false,false),a=i/10*Math.PI*2;shard.position.set(Math.cos(a)*.32,.12,Math.sin(a)*.32);shard.rotation.z=a;group.add(shard);}
   runtime.scene.add(group);runtime.effects.push({group,material,birth:performance.now()});runtime.cameraShakeUntil=performance.now()+360;runtime.focusTarget.copy(p);
  }catch{
   runtime.cameraShakeUntil=0;
  }
 },[blast?.key]);
 const power=POWER_LABELS[focusEvent]||'';
 return <div ref={hostRef} className="dada3b-three" role="application" aria-label="Plateau DADA 3B en trois dimensions">
  <div className="dada3b-three-hud" aria-hidden="true"><span>3D APEX</span><small>GLISSE · TOURNE · PINCE POUR ZOOMER</small></div>
  {power&&<div key={'three-power-'+(match.lastEvent?.id||0)} className="dada3b-three-power" data-power={focusEvent}><small>POUVOIR DU CERCLE</small><strong>{power}</strong></div>}
  <div className="dada3b-three-sr-actions">{match.players.flatMap((player,playerIndex)=>player.pieces.map((_,pieceIndex)=>{
   const country=countryFor(player.countryId),can=playerIndex===match.turn&&legal.includes(pieceIndex)&&!motion;
   return <button key={country.id+pieceIndex} type="button" disabled={!can} onClick={()=>can&&onPiece(pieceIndex)}>{country.name} guerrier {WARRIOR_ARCHETYPES[pieceIndex%WARRIOR_ARCHETYPES.length]} {pieceIndex+1}</button>;
  }))}</div>
 </div>;
}
