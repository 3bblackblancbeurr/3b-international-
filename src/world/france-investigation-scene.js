import * as THREE from 'three';
import {mergeIndexedGeometries} from './geometry-batch.js';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';
import {FRANCE_INVESTIGATION_STATIONS,franceInvestigationState,franceInvestigationObjective} from './france-investigation.js';
import {campaignSnapshot} from './campaign-runtime.js';

/** Permanent investigation furniture. The quest ledger owns progress; this
 * scene only reflects accepted facts. All tall pieces have matching colliders,
 * while the approach and both pressure plates remain at ground level. */
export function createFranceInvestigationScene(save,{groundY=()=>0,material,reducedMotion=false}={}){
 const root=new THREE.Group();root.name='3B · Les passages de la vérité';
 const owned=[],collisions=[],cameraSolids=[],stations=new Map(),responses=[];
 let dead=false,ledger,companionReady=false,lastAccepted='',renderBatches=null;
 const own=value=>(owned.push(value),value);
 const surface=(color,extra={})=>material?material(color,extra):own(new THREE.MeshStandardMaterial({color,roughness:.88,...extra}));
 const materials={stone:surface(worldRealmArt.france.stone),cloth:surface(worldRealmArt.france.cloth),paper:surface(worldArtMaterials.dust),gold:surface(worldArtMaterials.monumentGold,{metalness:.62,roughness:.4})};
 const box=own(new THREE.BoxGeometry(1,1,1)),cylinder=own(new THREE.CylinderGeometry(1,1,1,16));
 const rotation=new THREE.Euler(),quaternion=new THREE.Quaternion(),matrix=new THREE.Matrix4(),translation=new THREE.Vector3(),scale=new THREE.Vector3();
 const titles={witness:'TÉMOIGNAGES',archive:'ARCHIVES',atelier:'ATELIER DE RELIURE',comparison:'LES DEUX TRACES',mediation:'MÉDIATION',plateau:'LES DEUX PLATEAUX'};
 // One local opaque atlas, shared by every plaque. Headless construction keeps
 // the geometry and names, without needing a browser or network assets.
 let plaqueMaterial=null;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;const ctx=canvas.getContext('2d');
  if(ctx){ctx.fillStyle=worldArtMaterials.dust;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=worldRealmArt.france.cloth;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 44px Georgia, serif';Object.values(titles).forEach((title,i)=>ctx.fillText(title,512,i*128+64,960));const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;plaqueMaterial=own(new THREE.MeshStandardMaterial({color:worldArtMaterials.dust,map:texture,roughness:.9}));}
 }
 function batch(parent,name,draw){
  const parts=new Map();
  const piece=(slot,x,y,z,w,h,d,rz=0,shape=box)=>{const geometry=shape.clone();rotation.set(0,0,rz);quaternion.setFromEuler(rotation);translation.set(x,y,z);scale.set(w,h,d);matrix.compose(translation,quaternion,scale);geometry.applyMatrix4(matrix);if(!parts.has(slot))parts.set(slot,[]);parts.get(slot).push(geometry);};
  draw(piece);const group=new THREE.Group();group.name=name;parent.add(group);
  for(const [slot,pieces] of parts){const geometry=own(mergeIndexedGeometries(pieces));pieces.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,materials[slot]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  return group;
 }
 function collider(station,x,z,width,depth,top){
  const p={x:station.position.x+x,z:station.position.z+z,width,depth,rotation:0};collisions.push(p);cameraSolids.push({...p,bottom:groundY(p.x,p.z),top:groundY(p.x,p.z)+top});
 }
 function desk(put,width=4.6,z=-4.8){
  put('cloth',0,1.35,z,width,.19,1.65);put('gold',0,1.46,z+.76,width,.035,.055);
  for(const x of [-width/2+.24,width/2-.24]){put('stone',x,.65,z,.28,1.3,1.1);put('gold',x,.12,z,.34,.07,1.22);}
 }
 function book(put,x,y,z,{open=false,signed=false,width=1.5}={}){
  put('cloth',x,y,z,width,.15,1.08);put('paper',x,y+.1,z,width-.12,.07,.96);
  if(open){for(const side of [-1,1]){put('paper',x+side*width*.22,y+.18,z,width*.43,.06,.98,side*.07);for(let line=0;line<5;line++)put('cloth',x+side*width*.22,y+.224,z-.30+line*.14,width*.30,.012,.018);}}
  if(signed){put('gold',x+width*.25,y+.18,z+.23,.16,.04,.16,0,cylinder);put('cloth',x-width*.12,y+.15,z-.11,width*.48,.018,.025);}
 }
 function plaque(station,parent){
  const label=titles[station.kind]||station.place;parent.userData.label=label;
  if(plaqueMaterial){const geometry=own(new THREE.PlaneGeometry(4.65,.58)),uv=geometry.attributes.uv,index=Object.keys(titles).indexOf(station.kind);for(let i=0;i<uv.count;i++)uv.setY(i,1-(Math.max(0,index)+1-uv.getY(i))/6);const mesh=new THREE.Mesh(geometry,plaqueMaterial);mesh.position.set(0,3.08,-6.116);parent.add(mesh);}
 }
 for(const station of FRANCE_INVESTIGATION_STATIONS){
  const group=new THREE.Group();group.name='3B · '+station.place;group.position.set(station.position.x,groundY(station.position.x,station.position.z),station.position.z);group.userData.stationId=station.id;root.add(group);
  const entry={station,group};stations.set(station.id,entry);
  if(station.kind==='plateau')continue;
  plaque(station,group);
  batch(group,'Mobilier · '+station.kind,put=>{
   put('cloth',0,3.08,-6.2,4.9,.78,.14);put('gold',0,2.65,-6.2,4.9,.045,.19);
   if(station.kind!=='archive')for(const x of [-2.25,2.25])put('stone',x,1.36,-6.25,.21,2.72,.27);
   // A flush sill describes the place without introducing a step or deck.
   put('stone',0,.018,-4.8,6.5,.036,4.6);desk(put,station.kind==='archive'?4.9:4.6);
   if(station.kind==='archive'){
    for(const x of [-2.75,2.75])put('cloth',x,1.87,-6.28,.22,3.74,1.08);
    for(const y of [.2,1.15,2.1,2.55]){put('cloth',0,y,-6.28,5.7,.14,1.08);for(let i=0;i<8;i++){const xx=-2.35+i*.67;put(i%3?'paper':'cloth',xx,y+.39,-6.23,.43,.62,.68);put('gold',xx,y+.42,-5.88,.24,.025,.022);}}
   }else if(station.kind==='atelier'){
    for(const side of [-1,1]){put('cloth',side*1.95,1.96,-5.30,.16,1.28,.24);put('gold',side*1.95,2.51,-5.30,.28,.14,.36);}
    put('cloth',0,2.44,-5.3,4.06,.18,.30);put('paper',-.95,1.73,-5.3,.75,.55,.62);put('gold',.95,1.77,-5.1,.14,.68,.14,0,cylinder);
    for(let thread=0;thread<5;thread++)put('gold',-1.25+thread*.15,1.49,-4.53,.022,.028,.65);
   }else if(station.kind==='comparison'){
    for(const x of [-1.05,1.05])book(put,x,1.49,-4.75,{open:true,width:1.68});
    put('gold',0,1.65,-4.75,.04,.04,.89);put('gold',0,1.67,-4.25,.88,.04,.035);
   }else if(station.kind==='mediation'){
    book(put,0,1.49,-4.7,{open:true,width:2.35});
    for(const x of [-2.7,2.7]){put('stone',x,.47,-3.7,.52,.94,.52);put('cloth',x,.97,-3.7,.82,.12,.82);}
   }else{
    book(put,-.8,1.49,-4.7,{open:true,width:1.75});book(put,1.22,1.49,-4.85,{width:1.10});
    put('cloth',0,1.95,-6.2,4.55,1.3,.18);put('paper',0,1.99,-6.08,3.95,.98,.05);
   }
  });
  collider(station,0,-4.8,station.kind==='archive'?5.05:4.75,1.85,1.5);
  collider(station,0,-6.25,station.kind==='archive'?5.9:4.95,station.kind==='archive'?1.2:.32,3.65);
  if(station.kind==='mediation')for(const x of [-2.7,2.7])collider(station,x,-3.7,.87,.87,1.05);
  entry.unrestored=batch(group,'Trace encore incomplète',put=>{
   if(station.kind==='archive'){put('cloth',0,2.49,-5.67,4.9,.13,.07);put('gold',0,2.49,-5.60,.20,.26,.09);}
   else if(station.kind==='atelier'){put('paper',.65,1.49,-4.45,.65,.04,.55,.08);put('paper',1.42,1.49,-4.68,.67,.04,.56,-.10);}
   else if(station.kind==='witness'){for(const x of [-.9,.9])put('cloth',x,1.99,-6.035,.70,.16,.03);}
  });
  entry.restored=batch(group,'Faits rendus au registre',put=>{
   if(station.kind==='archive')book(put,0,1.49,-4.7,{open:true,signed:true,width:2.7});
   else if(station.kind==='atelier'){book(put,.85,1.49,-4.5,{open:true,signed:true,width:1.8});for(let stitch=0;stitch<6;stitch++)put('gold',.85,1.74,-4.86+stitch*.14,.17,.027,.035);}
   else if(station.kind==='witness'){for(let line=0;line<4;line++)put('cloth',0,1.68+line*.20,-6.035,2.7-line%2*.5,.045,.025);put('gold',1.45,1.99,-6.02,.14,.50,.04);}
  });
  if(station.kind==='archive'||station.kind==='mediation')entry.resolved=batch(group,'Dossier signé · correction conservée',put=>{book(put,1.16,1.65,-4.5,{signed:true,width:1.38});put('cloth',1.04,1.86,-4.69,.70,.018,.16);put('gold',1.04,1.88,-4.69,.51,.012,.025);});
  entry.response=new THREE.Object3D();entry.response.name='Feuillet examiné';entry.response.scale.set(.72,.035,.56);entry.response.position.set(1.53,1.59,-4.20);group.add(entry.response);
 }
 const plateauStation=FRANCE_INVESTIGATION_STATIONS.find(station=>station.kind==='plateau'),plateau=stations.get(plateauStation.id);
 const plateGeometry=own(new THREE.RingGeometry(1.95,2.12,40));
 const plates=[];
 for(let index=0;index<2;index++){
  const group=new THREE.Group(),x=plateauStation.position.x+index*18,z=plateauStation.position.z;group.position.set(x,groundY(x,z),z);group.name=index?'Second plateau · Kaïs':'Premier plateau · compagnon';root.add(group);
  batch(group,'Plateau affleurant',put=>{put('stone',0,.018,0,2.22,.036,2.22,0,cylinder);for(const side of [-1,1]){put('gold',side*.62,.049,0,.10,.018,.83);put('cloth',side*.62,.06,0,.34,.018,.11);}});
  const ring=new THREE.Mesh(plateGeometry,materials.cloth);ring.rotation.x=-Math.PI/2;ring.position.y=.055;group.add(ring);plates.push({group,ring});
 }
 batch(plateau.group,'Lien gravé entre les plateaux',put=>{for(let i=0;i<10;i++)put('gold',3+i*1.35,.026,0,.64,.028,.10);put('stone',9,.52,-5.1,1.55,1.04,1.40);put('cloth',9,1.74,-5.1,.24,2.4,.24);put('gold',9,2.88,-5.1,4.30,.11,.14);for(const x of [7.15,10.85]){put('gold',x,2.3,-5.1,.05,1.16,.05);put('paper',x,1.73,-5.1,.69,.07,.69,0,cylinder);}});
 collider(plateauStation,9,-5.1,4.5,1.5,3.2);
 const progressGeometry=own(new THREE.BoxGeometry(.13,.035,.34)),progress=new THREE.InstancedMesh(progressGeometry,materials.gold,15);progress.name='3B · Lien tenu · progression';progress.count=0;progress.frustumCulled=false;plates[1].group.add(progress);
 for(let i=0;i<15;i++){const angle=(i/15)*Math.PI*2;matrix.makeRotationY(-angle);matrix.setPosition(Math.sin(angle)*2.42,.07,Math.cos(angle)*2.42);progress.setMatrixAt(i,matrix);}progress.instanceMatrix.needsUpdate=true;own(progress);
 // Geometry has one rendered batch per shared material, including alternative
 // accepted-state pieces. Index ranges are compacted only when a station or
 // ledger variant changes visibility. The semantic source hierarchy remains
 // on layer 31, as in the world's existing static-instancing owner.
 function createBatches(){
  const excluded=new Set([progress,...plates.map(plate=>plate.ring)]),byMaterial=new Map(),batches=[];
  root.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse(object=>{if(!object.isMesh||excluded.has(object))return;if(!byMaterial.has(object.material))byMaterial.set(object.material,[]);byMaterial.get(object.material).push(object);});
  const batchRoot=new THREE.Group();batchRoot.name='3B · Enquête · matériaux partagés';root.add(batchRoot);
  const visible=object=>{for(let parent=object;parent&&parent!==root;parent=parent.parent)if(!parent.visible)return false;return true;};
  for(const [material,sources] of byMaterial){
   const geometries=sources.map(source=>source.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,source.matrixWorld))),geometry=own(mergeIndexedGeometries(geometries));geometries.forEach(g=>g.dispose());
   const fullIndex=geometry.index.array.slice(),ranges=[];let start=0;
   for(const source of sources){ranges.push({source,start,count:source.geometry.index.count,visible:null});start+=source.geometry.index.count;source.layers.set(31);}
   const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name='Enquête · '+material.uuid;batchRoot.add(mesh);batches.push({mesh,fullIndex,ranges});
  }
  const sheets=own(new THREE.InstancedMesh(box,materials.paper,stations.size-1));sheets.name='3B · Feuillets examinés';sheets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);sheets.frustumCulled=false;batchRoot.add(sheets);let lastSheetKey='';const sheetMatrix=new THREE.Matrix4();
  function sync(){
   for(const {mesh,fullIndex,ranges} of batches){
    let changed=false;for(const range of ranges){const next=visible(range.source);if(next!==range.visible){range.visible=next;changed=true;}}
    if(!changed)continue;let offset=0;for(const range of ranges)if(range.visible){mesh.geometry.index.array.set(fullIndex.subarray(range.start,range.start+range.count),offset);offset+=range.count;}
    mesh.geometry.setDrawRange(0,offset);mesh.geometry.index.needsUpdate=true;mesh.visible=offset>0;
   }
   const visibleSheets=[...stations.values()].filter(entry=>entry.response&&visible(entry.response)),sheetKey=visibleSheets.map(entry=>entry.station.id+':'+entry.response.rotation.x).join('|');
   if(lastSheetKey!==sheetKey){let count=0;for(const entry of visibleSheets){entry.response.updateMatrix();sheetMatrix.multiplyMatrices(entry.group.matrix,entry.response.matrix);sheets.setMatrixAt(count++,sheetMatrix);}sheets.count=count;sheets.instanceMatrix.needsUpdate=true;lastSheetKey=sheetKey;}
  }
  sync();return{sync,meshes:[...batches.map(batch=>batch.mesh),sheets]};
 }
 renderBatches=createBatches();
 const stationRestored=entry=>entry.station.kind==='archive'?ledger.archivesOpen:entry.station.kind==='atelier'||entry.station.kind==='witness'?ledger.namesRestored:false;
 function update(next){
  if(dead)return;ledger=franceInvestigationState(next);companionReady=!!next.adventure?.companion&&!next.adventure?.companionHidden&&next.adventure?.companionOrder==='guard';
  for(const entry of stations.values()){const restored=stationRestored(entry);if(entry.unrestored)entry.unrestored.visible=!restored;if(entry.restored)entry.restored.visible=restored;if(entry.resolved)entry.resolved.visible=ledger.caseResolved;entry.group.userData.restored=restored;}
  root.userData.investigation={archivesOpen:ledger.archivesOpen,namesRestored:ledger.namesRestored,caseResolved:ledger.caseResolved};
  renderBatches.sync();
 }
 function tick(dt,player,challenge){
  if(dead)return;const visible=player&&Number.isFinite(player.x)&&Number.isFinite(player.z);
  for(const entry of stations.values())entry.group.visible=!visible||Math.hypot(player.x-entry.station.position.x,player.z-entry.station.position.z)<220;
  const relay=challenge?.region==='france'&&challenge.mode==='relay',started=relay&&challenge.started,hold=started?Math.min(15,Math.max(0,challenge.relay?.hold||0)):0;
  plates.forEach(({group,ring},index)=>{group.visible=plateau.group.visible;ring.material=ledger.namesRestored||started&&(index?hold>0:companionReady)?materials.gold:materials.cloth;});progress.count=hold;
  root.userData.relay={started:!!started,companionHeld:!!(started&&companionReady),hold,required:15};
  for(let i=responses.length-1;i>=0;i--){const response=responses[i];response.remaining=Math.max(0,response.remaining-Math.min(.1,Math.max(0,dt||0)));response.sheet.rotation.x=reducedMotion?0:-Math.sin((1-response.remaining/.6)*Math.PI)*.24;if(!response.remaining){response.sheet.rotation.x=0;responses.splice(i,1);}}
  renderBatches.sync();
 }
 function accept(previous,next){
  if(dead)return null;const before=campaignSnapshot(previous,'france'),after=campaignSnapshot(next,'france');
  const signature=value=>JSON.stringify([value?.phaseId,value?.stepIndex,value?.finished,value?.inventory,value?.effects]);
  const key=signature(after);if(signature(before)===key||lastAccepted===key)return null;lastAccepted=key;
  const stepId=before?.objective?.split(':').at(-1),metadata=franceInvestigationObjective(before?.phaseId,stepId),entry=metadata&&stations.get(metadata.stationId);if(!entry)return null;
  update(next);for(const response of responses)response.sheet.rotation.x=0;responses.splice(0);if(!reducedMotion&&entry.response)responses.push({sheet:entry.response,remaining:.6});
  return{animation:['archive','atelier','comparison'].includes(entry.station.kind)?'Work':'Talk',position:{...entry.station.position}};
 }
 update(save);tick(0,null,campaignSnapshot(save,'france'));
 return{root,collisions,cameraSolids,update,tick,accept,get diagnostics(){let meshes=0,vertices=0;root.traverse(object=>{if(object.isMesh&&object.layers.test(root.layers)){meshes++;vertices+=object.geometry.attributes.position.count;}});return{stations:stations.size,meshes,vertices,colliders:collisions.length};},dispose(){if(dead)return;dead=true;root.removeFromParent();responses.length=0;for(const resource of owned)resource.dispose();}};
}
