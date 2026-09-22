import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {
  COUNTRIES_3B,FINISH_STEP,HOME_LENGTH,SANCTUARY_CELLS,STABLE,TRACK_LENGTH,
  blockadeOwnerAt,countryFor,globalCellFor,homeIndexFor,previewMove,
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
 const gate=trackPosition(country.start),factor=1.085;
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
 if(country)return new THREE.CylinderGeometry(.49,.44,.27,8);
 if(local===1||local===6)return new THREE.BoxGeometry(.76,.19,.48);
 if(local===3)return new THREE.BoxGeometry(.96,.21,.38);
 if(local===4)return new THREE.CylinderGeometry(.43,.36,.24,6);
 if(local===5)return new THREE.CylinderGeometry(.40,.34,.21,4);
 return new THREE.CylinderGeometry(.40,.35,.20,8);
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
  const color=country?.accent||(sanctuary?'#e9c96d':barrier?'#65dff0':local===3?'#9d8454':local===4?'#2c5f68':'#354647');
  const mat=makeMaterial(color,{metal:.82,rough:.22,emissive:color,emissiveIntensity:country ? .56 : sanctuary ? .8 : barrier ? .75 : local===3 ? .18 : .12});
  const cell=mesh(cellGeometryFor(i,country),mat,true,true),elevation=trackElevation(i);
  const p=worldFromPercent(trackPosition(i),elevation);cell.position.copy(p);cell.rotation.y=tangentAngle(i);
  cell.userData={kind:'cell',index:i,material:mat,sanctuary,barrier,baseColor:new THREE.Color(color),baseEmissive:country ? .56 : sanctuary ? .8 : local===3 ? .18 : .12};scene.add(cell);runtime.trackCells.push(cell);
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
function createPiece(country,pieceIndex,shadows){
 const group=new THREE.Group();group.userData={kind:'piece',countryId:country.id,pieceIndex,legal:false,target:new THREE.Vector3(),isMoving:false,landingUntil:0,captureReturn:null};
 const segments=COUNTRY_SEGMENTS[country.shape]||10;
 const baseMat=makeMaterial('#c3a25d',{metal:.92,rough:.19,emissive:'#6b511e',emissiveIntensity:.13});
 const bodyMat=makeMaterial(country.accent,{metal:.78,rough:.16,emissive:country.accent,emissiveIntensity:.28,clearcoat:.92});
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
 const rimMat=new THREE.MeshBasicMaterial({color:new THREE.Color(country.accent),transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide});
 const rim=mesh(new THREE.CylinderGeometry(.31,.46,.80,segments),rimMat,false,false);rim.position.y=.54;rim.scale.setScalar(1.06);group.add(rim);
 const badge=spriteLabel(country.crest,'#f4d895','',.42,.42);badge.position.set(0,.6,.44);group.add(badge);
 group.userData.bodyMat=bodyMat;group.userData.coreMat=coreMat;group.userData.haloMat=haloMat;group.userData.rimMat=rimMat;group.userData.model=body;group.userData.crown=crown;
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
  for(const captured of captureEvent.captured||[]){
   const group=runtime.pieceMap.get(captured.countryId+':'+captured.pieceIndex),country=countryFor(captured.countryId);
   if(!group||!country)continue;
   const target=pieceWorldPosition(country,STABLE,captured.pieceIndex);
   group.userData.captureReturn={from:group.position.clone(),to:target.clone(),startedAt:performance.now(),duration:460};
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
  const camera=new THREE.PerspectiveCamera(37,1,.1,90);camera.position.set(0,16.8,18.2);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.target.set(0,.35,0);
  controls.minDistance=14;controls.maxDistance=31;controls.minPolarAngle=.45;controls.maxPolarAngle=1.34;controls.rotateSpeed=.62;controls.zoomSpeed=.72;controls.panSpeed=.45;
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
  const runtime={renderer,scene,camera,controls,pieces,pieceMap:new Map(),trackCells:[],barrierFx:new Map(),sanctuaryFx:[],legalFx:[],shadows,mobile,themeLight:blue,energyRail:null,nexusRings:[],nexusCore:null,nexusLight:null,nexusBeam:null,nexusBeamMat:null,stars:null,gateHalos:[],beacons:[],effects:[],focusUntil:0,focusType:'',focusTarget:new THREE.Vector3(0,.35,0),baseTarget:new THREE.Vector3(0,.35,0),cameraShakeUntil:0,lastCaptureEventKey:null,contextLost:false,contextLossTimer:null,disposed:false};
  runtimeRef.current=runtime;
  addBoardFoundation(scene,runtime);addTrackCells(scene,match,runtime);
  COUNTRIES_3B.forEach(c=>addGate(scene,c,match.players.some(p=>p.countryId===c.id),runtime));
  addNexus(scene,runtime);addAtmosphere(scene,runtime);updateBoardState(runtime,match,loadout,legal);updatePieces(runtime,match,legal,motion,cosmeticsByCountry,loadout);
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
  const contextLost=e=>{
   e.preventDefault();runtime.contextLost=true;
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
  let frame=0;const clock=new THREE.Clock();
  const animate=()=>{
   if(runtime.disposed)return;frame=requestAnimationFrame(animate);const t=clock.getElapsedTime(),now=performance.now(),focus=now<runtime.focusUntil;
   controls.autoRotate=focus&&runtime.focusType==='victory';controls.autoRotateSpeed=.8;
   const desiredTarget=focus?runtime.focusTarget:runtime.baseTarget;controls.target.lerp(desiredTarget,.065);controls.update();
   renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,focus?1.62:1.52,.06);
   camera.fov=THREE.MathUtils.lerp(camera.fov,focus ? (runtime.focusType==='victory' ? 31 : 34) : 37,.055);camera.updateProjectionMatrix();
   runtime.energyRail.material.opacity=.32+Math.sin(t*2.2)*.12;
   runtime.nexusRings.forEach((ring,i)=>{ring.rotation.y+=.003*(i+1);ring.rotation.z+=.0015*(i%2?1:-1);});
   if(runtime.nexusCore){runtime.nexusCore.rotation.x=t*.55;runtime.nexusCore.rotation.y=t*.82;runtime.nexusCore.scale.setScalar(1+Math.sin(t*3)*.035);}
   if(runtime.nexusLight)runtime.nexusLight.intensity=18+Math.sin(t*2.7)*4;
   if(runtime.nexusBeamMat)runtime.nexusBeamMat.opacity=.13+Math.sin(t*2.1)*.055;
   if(runtime.stars)runtime.stars.rotation.y=t*.006;
   runtime.gateHalos.forEach((halo,i)=>{halo.rotation.z=t*(.14+i*.005);halo.material.opacity=.24+Math.sin(t*1.5+i)*.09;});
   runtime.beacons.forEach((beacon,i)=>{beacon.material.opacity=.18+Math.sin(t*1.7+i*.4)*.06;});
   runtime.legalFx.forEach((fx,i)=>{fx.ring.rotation.z+=.018;fx.ringMat.opacity=.62+Math.sin(t*5+i)*.22;fx.marker.position.y=.52+Math.sin(t*5.5+i)*.08;});
   runtime.sanctuaryFx.forEach((fx,i)=>{fx.ring.rotation.z+=.004+i*.0002;fx.ringMat.opacity=.48+Math.sin(t*2.4+i)*.18;fx.beamMat.opacity=.09+Math.sin(t*1.8+i)*.045;});
   for(const fx of runtime.barrierFx.values()){fx.ring.rotation.z-=.012;fx.shieldMat.opacity=.14+Math.sin(t*3)*.07;fx.ringMat.opacity=.48+Math.sin(t*4)*.16;}
   for(const group of runtime.pieceMap.values()){
    const captureReturn=group.userData.captureReturn;
    if(captureReturn){
     const raw=Math.min(1,(now-captureReturn.startedAt)/captureReturn.duration),k=raw*raw*(3-2*raw),arc=Math.sin(Math.PI*k)*.55;
     group.position.lerpVectors(captureReturn.from,captureReturn.to,k);group.position.y+=arc;
     group.scale.setScalar(1-Math.sin(Math.PI*k)*.10);
     if(raw>=1){group.position.copy(captureReturn.to);group.scale.setScalar(1);group.userData.captureReturn=null;}
    }else{
     const target=group.userData.target,landingLeft=Math.max(0,group.userData.landingUntil-now),landing=landingLeft>0?Math.sin((1-landingLeft/320)*Math.PI)*.17:0;
     const bob=group.userData.legal ? Math.sin(t*5+group.userData.pieceIndex)*.13:group.userData.isMoving ? Math.abs(Math.sin(t*10))*.18:landing;
     group.position.x=THREE.MathUtils.lerp(group.position.x,target.x,.23);group.position.z=THREE.MathUtils.lerp(group.position.z,target.z,.23);group.position.y=THREE.MathUtils.lerp(group.position.y,target.y+bob,.25);
     const pulse=group.userData.legal ? 1+Math.sin(t*6)*.055:landingLeft>0?1.05:1;group.scale.setScalar(pulse);
    }
    group.rotation.y+=group.userData.legal ? .016 : .002;
    group.userData.haloMat.opacity=THREE.MathUtils.lerp(group.userData.haloMat.opacity,group.userData.legal ? .92 : .08,.14);
    group.userData.rimMat.opacity=THREE.MathUtils.lerp(group.userData.rimMat.opacity,group.userData.legal ? .46 : .10,.14);
   }
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
   disposeTree(scene);renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();runtimeRef.current=null;
  };
 },[]);
 useEffect(()=>{const runtime=runtimeRef.current;if(runtime)updateBoardState(runtime,match,loadout,legal);},[match,legal,loadout]);
 useEffect(()=>{const runtime=runtimeRef.current;if(runtime)updatePieces(runtime,match,legal,motion,cosmeticsByCountry,loadout);},[match,motion,legal,cosmeticsByCountry,loadout]);
 useEffect(()=>{
  const runtime=runtimeRef.current;if(!runtime||!focusEvent)return;
  runtime.focusType=focusEvent;runtime.focusUntil=performance.now()+(focusEvent==='victory'?1700:focusEvent==='capture'?950:820);
  runtime.focusTarget.copy(runtime.baseTarget);
  if(focusEvent==='victory')runtime.focusTarget.set(0,1.1,0);
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
   return <button key={country.id+pieceIndex} type="button" disabled={!can} onClick={()=>can&&onPiece(pieceIndex)}>{country.name} Totem {pieceIndex+1}</button>;
  }))}</div>
 </div>;
}
