import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {realmStreamingProfile} from './streaming.js';
import {REALM_SECTOR_SIZE,realmSectorAt,realmSectorKey,realmStaticObstacles,realmNavigationItems,realmTravelItems,realmStreetFurniture} from './realm-layout.js';
import {createRealmArchitecture} from './realm-architecture.js';
import {createPlantGeometry,FLORA_PALETTES,windShader} from './flora.js';
import {foliageAtlas} from './foliage-atlas.js';
import {createRealmRoadMaterial,createRealmRoadTask} from './realm-road-surface.js';
import {createVillageFurnitureGeometry,createVillageGardenGeometry,createVillageGardenLayout} from './realm-village-props.js';

const SIZE=REALM_SECTOR_SIZE;
const coreCell=(x,z)=>x>=-2&&x<=1&&z>=-2&&z<=1;
export function realmSectorPlan(position,radius,profile){
 const centre=realmSectorAt(position),cells=[];
 for(let x=centre.x-profile.tileRadius;x<=centre.x+profile.tileRadius;x++)for(let z=centre.z-profile.tileRadius;z<=centre.z+profile.tileRadius;z++){
  if(coreCell(x,z))continue;
  const cx=(x+.5)*SIZE,cz=(z+.5)*SIZE,d=Math.hypot(cx-position.x,cz-position.z);
  if(Math.hypot(cx,cz)>radius+SIZE*.72)continue;
  cells.push({x,z,key:realmSectorKey(x,z),distance:d,lod:d<profile.near?0:d<profile.mid?1:2});
 }
 return cells.sort((a,b)=>a.distance-b.distance).slice(0,profile.maxTiles);
}

/** A real raycastable ground tile with world-continuous colour/UV/normal
 * sampling and seam skirts. No transparent terrain, overlay deck or z fighting. */
function* realmTileSteps(field,x,z,segments=16){
 const originX=x*SIZE,originZ=z*SIZE,vertices=[],normal=[],color=[],uv=[],indices=[];
 const low=new THREE.Color(field.biome.low),high=new THREE.Color(field.biome.high),rock=new THREE.Color(field.biome.rock),tint=new THREE.Color();
 function vertex(px,pz,drop=0){
  const y=field.height(px,pz),dx=field.height(px+.75,pz)-field.height(px-.75,pz),dz=field.height(px,pz+.75)-field.height(px,pz-.75),length=Math.hypot(dx,1.5,dz);
  vertices.push(px,y-drop,pz);normal.push(-dx/length,1.5/length,-dz/length);uv.push(px/1000+.5,pz/1000+.5);
  const mottling=.48+.12*Math.sin(px*.017)*Math.cos(pz*.019)+.06*Math.sin(px*.13-pz*.08),slope=Math.hypot(dx,dz);
  tint.copy(low).lerp(high,Math.max(0,Math.min(1,mottling))).lerp(rock,Math.min(.8,slope*.4));color.push(tint.r,tint.g,tint.b);return vertices.length/3-1;
 }
 for(let z1=0;z1<=segments;z1++){for(let x1=0;x1<=segments;x1++)vertex(originX+x1*SIZE/segments,originZ+z1*SIZE/segments);yield;}
 for(let row=0;row<segments;row++)for(let col=0;col<segments;col++){const a=row*(segments+1)+col,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const borders=[Array.from({length:segments+1},(_,i)=>i),Array.from({length:segments+1},(_,i)=>i*(segments+1)+segments),Array.from({length:segments+1},(_,i)=>segments*(segments+1)+segments-i),Array.from({length:segments+1},(_,i)=>(segments-i)*(segments+1))];
 for(const border of borders){let previous=null;for(const top of border){const lower=vertex(vertices[top*3],vertices[top*3+2],4);if(previous)indices.push(previous.top,previous.lower,top,top,previous.lower,lower);previous={top,lower};}yield;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.realmSegments=segments;g.userData.realmSurfaceIndexCount=segments*segments*6;g.userData.realmSkirtIndices=g.index.array.slice(g.userData.realmSurfaceIndexCount);g.userData.realmSkirtMask=15;g.setDrawRange(0,g.index.count);return g;
}

/** Advance terrain by rows, never a whole dense tile in one walking frame.
 * The previous LOD remains visible until an identical complete replacement is
 * ready. Arrivals can still drain this same builder before releasing control. */
export function createRealmTileTask(field,x,z,segments=16){
 const iterator=realmTileSteps(field,x,z,segments);let geometry=null,cancelled=false;
 return{step({budgetMs=3,now=()=>performance.now(),maxSteps=Infinity}={}){
  if(geometry||cancelled)return true;const start=now();let steps=0;
  do{const part=iterator.next();if(part.done){geometry=part.value;return true;}steps++;}while(steps<maxSteps&&now()-start<budgetMs);
  return false;
 },get geometry(){return geometry;},cancel(){if(cancelled)return;cancelled=true;iterator.return();geometry?.dispose();geometry=null;}};
}
export function createRealmTileGeometry(field,x,z,segments=16){const task=createRealmTileTask(field,x,z,segments);task.step({budgetMs:Infinity});return task.geometry;}

const TILE_EDGES=[[0,-1],[1,0],[0,1],[-1,0]];
function setTileSkirts(geometry,mask){
 if(geometry.userData.realmSkirtMask===mask)return;
 const {realmSurfaceIndexCount:surface,realmSkirtIndices:skirts}=geometry.userData,edgeLength=skirts.length/4;let count=surface;
 for(let edge=0;edge<4;edge++)if(mask&(1<<edge)){geometry.index.array.set(skirts.subarray(edge*edgeLength,(edge+1)*edgeLength),count);count+=edgeLength;}
 geometry.userData.realmSkirtMask=mask;geometry.index.needsUpdate=true;geometry.setDrawRange(0,count);
}

export function lowPlant(type,palette){
 const parts=[],tint=new THREE.Color(palette[1]),bark=new THREE.Color('#7b6955');
 function piece(g,x,y,z,sx,sy,sz,color){const p=g.index?g.toNonIndexed():g.clone();p.applyMatrix4(new THREE.Matrix4().makeScale(sx,sy,sz));p.translate(x,y,z);const colors=new Float32Array(p.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)colors.set([color.r,color.g,color.b],i);p.setAttribute('color',new THREE.BufferAttribute(colors,3));for(const name of Object.keys(p.attributes))if(!['position','normal','color'].includes(name))p.deleteAttribute(name);parts.push(p);g.dispose();}
 piece(new THREE.CylinderGeometry(.2,.3,type==='Palm'?7.2:5,6),0,type==='Palm'?3.6:2.5,0,1,1,1,bark);
 if(type==='Pine'||type==='Cypress')for(let layer=0;layer<5;layer++){
  const points=[.06,.5,-.04],indices=[];
  // Scalloped boughs break the old perfect-cone silhouette at the same
  // triangle count, with a darker underside and a restrained canopy gradient.
  for(let i=0;i<12;i++){const a=i*Math.PI/6+layer*.47,r=i%2?.73:1;points.push(Math.cos(a)*r,-.36-(i%3)*.065,Math.sin(a)*r);}
  points.push(0,-.43,0);for(let i=0;i<12;i++){const next=(i+1)%12;indices.push(0,1+next,1+i,13,1+i,1+next);}
  const crown=new THREE.BufferGeometry();crown.setAttribute('position',new THREE.Float32BufferAttribute(points,3));crown.setIndex(indices);crown.computeVertexNormals();
  const radius=(type==='Pine'?2.65:1.04)*(1-layer*.15);tint.set(palette[1]).multiplyScalar(.88+layer*.045);
  piece(crown,Math.sin(layer*2.4)*.12,3.7+layer*1.13,Math.cos(layer*2.4)*.12,radius,3.4,radius,tint);
 }
 else if(type==='Palm')for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9,dx=Math.cos(a),dz=Math.sin(a),side={x:-dz*.40,z:dx*.40};
  const points=[0,7.15,0,dx*1.65+side.x,7.35,dz*1.65+side.z,dx*1.65-side.x,7.35,dz*1.65-side.z,dx*3.45,5.8,dz*3.45],frond=new THREE.BufferGeometry();
  frond.setAttribute('position',new THREE.Float32BufferAttribute(points,3));frond.setIndex([0,1,2,1,3,2,0,2,1,1,2,3]);const flat=frond.toNonIndexed();flat.computeVertexNormals();frond.dispose();tint.set(palette[i%palette.length]);piece(flat,0,0,0,1,1,1,tint);
 }
 else for(let i=0;i<11;i++){const a=i*2.399,olive=type==='Olive',reach=1.35+Math.sin(i*1.7)*.35;tint.set(palette[i%palette.length]);piece(new THREE.IcosahedronGeometry(1,0),Math.sin(a)*reach,(olive?3.7:5.3)+(i%3)*.75,Math.cos(a)*reach,1.35+(i%2)*.2,olive?.78:1.25,1.28+(i%3)*.12,tint);}
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;
}

export function createRealmStreamer({region,field,root,material,coreGround}){
 const realm=field.realm;if(!realm)return null;
 const group=new THREE.Group();group.name='3B · secteurs explorables · '+region;root.add(group);
 const tiles=new Map(),owned=[],natural=new Map(),architecture=createRealmArchitecture(region),buildingBatches=[],monumentBatches=[],dummy=new THREE.Object3D();
 const leafAtlas=foliageAtlas(),leafMaterial=new THREE.MeshStandardMaterial({map:leafAtlas,alphaTest:.24,alphaToCoverage:true,vertexColors:true,roughness:.93,side:THREE.DoubleSide}),naturalMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98});owned.push(leafMaterial,naturalMaterial);if(leafAtlas)owned.push(leafAtlas);
 const windTime={value:0};windShader(leafMaterial,windTime);
 let profile=realmStreamingProfile(),plan=[],pending=[],activeTile=null,lastKey='',lastPosition={x:0,z:5},lastSampleX=NaN,lastSampleZ=NaN,lastPoolPosition={x:Infinity,z:Infinity},dirty=true,disposed=false,revision=0,generated=0,visiblePlants=0,visibleBuildings=0,visibleSites=0;
 const work={tileSlices:0,instanceUpdates:0,peakTravelUpdateMs:0,peakTileSliceMs:0,peakRoadMs:0,peakInstanceMs:0,peakCommitMs:0};
 const collisionList=realmStaticObstacles(region),navigationItems=realmNavigationItems(region),travelDestinations=realmTravelItems(region);
 function instance(geometry,mat,max,name){const mesh=new THREE.InstancedMesh(geometry,mat,max);mesh.name=name;mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);return mesh;}
 for(const floors of [1,2])for(let variant=0;variant<3;variant++){const mesh=instance(architecture.house(floors,variant),architecture.material,96,'Province houses · '+floors+' storeys · '+variant);mesh.castShadow=true;buildingBatches.push({floors,variant,mesh});}
 function plantBatches(type){
  if(natural.has(type))return natural.get(type);
  const palette=FLORA_PALETTES[region]||FLORA_PALETTES.france,plant=createPlantGeometry(type,realm.layout.seed,palette),low=lowPlant(type,palette);owned.push(plant.wood,plant.leaves,low);
  const batches={wood:instance(plant.wood,naturalMaterial,160,type+' · near trunks'),leaves:instance(plant.leaves,leafMaterial,160,type+' · near foliage'),low:instance(low,naturalMaterial,720,type+' · distant silhouette')};natural.set(type,batches);return batches;
 }
 // Build the few shared botanical templates while the region is loading,
 // never when running across a boundary introduces a new tree species.
 const provincePlant=kind=>['alpine','forest'].includes(kind)?'Pine':['vineyard','palazzo'].includes(kind)?'Cypress':['mountain','kasbah'].includes(kind)?'Olive':realm.style.tree;
 for(const type of new Set([realm.style.tree,...realm.layout.provinces.map(p=>provincePlant(p[1]))]))plantBatches(type);
 const rockGeometry=new THREE.IcosahedronGeometry(1,1),rockTint=new THREE.Color(field.biome.rock),rockColors=new Float32Array(rockGeometry.attributes.position.count*3);for(let i=0;i<rockColors.length;i+=3)rockColors.set([rockTint.r,rockTint.g,rockTint.b],i);rockGeometry.setAttribute('color',new THREE.BufferAttribute(rockColors,3));owned.push(rockGeometry);const rocks=instance(rockGeometry,naturalMaterial,160,'Sector rocks');
 const furnitureGeometry=createVillageFurnitureGeometry(region,field.biome);owned.push(furnitureGeometry);const furniture=instance(furnitureGeometry,naturalMaterial,24,'Village benches, planters and lanterns'),furniturePlacements=realmStreetFurniture(region);furniture.castShadow=true;
 const gardenGeometry=createVillageGardenGeometry(region);owned.push(gardenGeometry);const gardens=instance(gardenGeometry,naturalMaterial,64,'Low village herb gardens'),gardenPlacements=createVillageGardenLayout(realm.layout);
 for(const site of realm.sites.filter(s=>s.major&&(s.monument||s.kind==='guardianCourt'))){const mesh=instance(site.kind==='guardianCourt'?architecture.guardianCourt():architecture.monument(site.kind),architecture.material,1,site.name+' · structural landmark');mesh.castShadow=true;monumentBatches.push({site,mesh});}
 // Only roads inside loaded sectors are submitted. An opaque strip sits a
 // fixed centimetres above the same sampled ground, with no overlapping copies.
 const roadMaterial=createRealmRoadMaterial(region);owned.push(roadMaterial);
 let roadMesh=null,roadTask=null,roadSitesKey='',roadGeometryKey='';
 function buildRoads(immediate=false){
  const segments=[],segmentIds=[];
  const desired=new Set(plan.map(c=>c.key));
  for(const [index,segment] of realm.roadSegments.entries()){
   const mid={x:(segment.a.x+segment.b.x)/2,z:(segment.a.z+segment.b.z)/2},cell=realmSectorAt(mid);if(!desired.has(realmSectorKey(cell.x,cell.z))&&!(coreCell(cell.x,cell.z)&&Math.hypot(lastPosition.x,lastPosition.z)<1500))continue;
   segments.push(segment);segmentIds.push(index);
  }
  const sites=realm.sites.filter(s=>s.kind!=='terminal'&&s.kind!=='guardianCourt'&&Math.hypot(s.x-lastPosition.x,s.z-lastPosition.z)<profile.siteDistance+100).sort((a,b)=>Math.hypot(a.x-lastPosition.x,a.z-lastPosition.z)-Math.hypot(b.x-lastPosition.x,b.z-lastPosition.z)).slice(0,profile.maxSites);
  roadSitesKey=sites.map(s=>s.id).sort().join('|');
  const key=segmentIds.join(',')+'/'+roadSitesKey;
  if(key!==roadGeometryKey){roadGeometryKey=key;roadTask?.cancel();roadTask=createRealmRoadTask(field,segments,sites);}
  if(immediate)advanceRoads(Infinity);
 }
 function advanceRoads(budgetMs){
  if(!roadTask)return;const began=performance.now();
  if(roadTask.step({budgetMs})){
   const geometry=roadTask.geometry;roadTask=null;roadMesh?.removeFromParent();roadMesh?.geometry.dispose();roadMesh=null;
   if(geometry){roadMesh=new THREE.Mesh(geometry,roadMaterial);roadMesh.name='Local country roads and village streets';roadMesh.receiveShadow=true;group.add(roadMesh);}
  }
  work.peakRoadMs=Math.max(work.peakRoadMs,performance.now()-began);
 }
 function updateInstances(position){
  const began=performance.now();
  work.instanceUpdates++;
  const plants=[],stones=[];for(const tile of tiles.values()){plants.push(...tile.data.plants);stones.push(...tile.data.stones);}
  const distanceSquared=p=>(p.x-position.x)**2+(p.z-position.z)**2;
  for(const p of plants)p.distanceSquared=distanceSquared(p);for(const p of stones)p.distanceSquared=distanceSquared(p);
  plants.sort((a,b)=>a.distanceSquared-b.distanceSquared);stones.sort((a,b)=>a.distanceSquared-b.distanceSquared);
  const distance=p=>Math.sqrt(distanceSquared(p));
  for(const b of natural.values())b.wood.count=b.leaves.count=b.low.count=0;visiblePlants=0;
  const nearMax=Math.floor(profile.naturalInstances/5);let nearCount=0;
  for(const plant of plants.slice(0,profile.naturalInstances)){
   const b=plantBatches(plant.type),near=plant.distanceSquared<(plant.near?180:145)**2&&nearCount<nearMax;plant.near=near;dummy.position.set(plant.x,plant.y,plant.z);dummy.rotation.set(0,plant.rotation,0);dummy.scale.setScalar(plant.scale);dummy.updateMatrix();
   if(near){const slot=b.wood.count++;b.leaves.count=b.wood.count;b.wood.setMatrixAt(slot,dummy.matrix);b.leaves.setMatrixAt(slot,dummy.matrix);nearCount++;}else b.low.setMatrixAt(b.low.count++,dummy.matrix);visiblePlants++;
  }
  rocks.count=0;for(const stone of stones.slice(0,profile.rockInstances)){dummy.position.set(stone.x,stone.y+stone.scale*.25,stone.z);dummy.rotation.set(.1,stone.rotation,.2);dummy.scale.set(stone.scale,stone.scale*.6,stone.scale*.85);dummy.updateMatrix();rocks.setMatrixAt(rocks.count++,dummy.matrix);}
  const closeSites=realm.sites.filter(s=>s.kind!=='terminal'&&s.kind!=='guardianCourt'&&distance(s)<profile.siteDistance+100).sort((a,b)=>distance(a)-distance(b)).slice(0,profile.maxSites),ids=new Set(closeSites.map(s=>s.id));
  if(closeSites.map(s=>s.id).sort().join('|')!==roadSitesKey)buildRoads();
  visibleSites=closeSites.length;visibleBuildings=0;for(const b of buildingBatches)b.mesh.count=0;
  furniture.count=0;for(const p of furniturePlacements.filter(p=>ids.has(p.site)).slice(0,24)){dummy.position.set(p.x,field.height(p.x,p.z),p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.setScalar(1);dummy.updateMatrix();furniture.setMatrixAt(furniture.count++,dummy.matrix);}
  gardens.count=0;for(const p of gardenPlacements.filter(p=>ids.has(p.site)).slice(0,64)){dummy.position.set(p.x,field.height(p.x,p.z),p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.setScalar(1);dummy.updateMatrix();gardens.setMatrixAt(gardens.count++,dummy.matrix);}
  for(const home of realm.layout.buildings.filter(b=>ids.has(b.site)).slice(0,profile.buildingInstances)){
   const batch=buildingBatches.find(b=>b.floors===home.floors&&b.variant===home.variant%3);dummy.position.set(home.x,field.height(home.x,home.z),home.z);dummy.rotation.set(0,home.rotation,0);dummy.scale.set(home.width/12,1,home.depth/10);dummy.updateMatrix();batch.mesh.setMatrixAt(batch.mesh.count++,dummy.matrix);visibleBuildings++;
  }
  for(const b of monumentBatches){b.mesh.count=distance(b.site)<profile.siteDistance+100?1:0;if(b.mesh.count){const p=b.site.monument||b.site;dummy.position.set(p.x,field.height(p.x,p.z),p.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();b.mesh.setMatrixAt(0,dummy.matrix);}}
  for(const mesh of [...natural.values()].flatMap(b=>[b.wood,b.leaves,b.low]).concat(rocks,furniture,gardens,buildingBatches.map(b=>b.mesh),monumentBatches.map(b=>b.mesh))){mesh.instanceMatrix.needsUpdate=true;if(mesh.count)mesh.computeBoundingSphere();}
  lastPoolPosition={x:position.x,z:position.z};
  work.peakInstanceMs=Math.max(work.peakInstanceMs,performance.now()-began);
 }
 function refreshBorders(cell){
  // Equal-resolution neighbours share exact vertices: their internal vertical
  // faces only introduce grazing depth/AO seams. Keep full-height skirts at
  // real LOD transitions and unloaded edges, including incremental replacement.
  for(const [dx,dz] of [[0,0],...TILE_EDGES]){const tile=tiles.get(realmSectorKey(cell.x+dx,cell.z+dz));if(!tile)continue;let mask=0;
   TILE_EDGES.forEach(([ex,ez],edge)=>{const neighbour=tiles.get(realmSectorKey(tile.x+ex,tile.z+ez));if(!neighbour||neighbour.mesh.geometry.userData.realmSegments!==tile.mesh.geometry.userData.realmSegments)mask|=1<<edge;});setTileSkirts(tile.mesh.geometry,mask);
  }
 }
 function makeTile(cell,geometry=createRealmTileGeometry(field,cell.x,cell.z,profile.segments[cell.lod])){
  const began=performance.now();
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Realm terrain '+cell.key+' · LOD '+cell.lod;mesh.receiveShadow=true;group.add(mesh);
  const old=tiles.get(cell.key);old?.mesh.removeFromParent();old?.mesh.geometry.dispose();tiles.set(cell.key,{...cell,mesh,data:old?.data||realm.sector(cell.x,cell.z)});refreshBorders(cell);generated++;revision++;if(!old)dirty=true;work.peakCommitMs=Math.max(work.peakCommitMs,performance.now()-began);
 }
 function reconcile(position,landing=false){
  plan=realmSectorPlan(position,field.radius,profile);const desired=new Set(plan.map(c=>c.key));
  for(const [key,tile] of tiles)if(!desired.has(key)){tile.mesh.removeFromParent();tile.mesh.geometry.dispose();tiles.delete(key);refreshBorders(tile);dirty=true;revision++;}
  pending=plan.filter(c=>!tiles.has(c.key)||tiles.get(c.key).lod!==c.lod);
  if(activeTile&&!pending.some(c=>c.key===activeTile.cell.key&&c.lod===activeTile.cell.lod)){activeTile.task.cancel();activeTile=null;}
  // A discontinuous arrival gets a complete local landing neighbourhood before
  // control resumes. Walking normally only refreshes one/two tiles per frame.
  const centre=realmSectorAt(position);if(landing)for(const cell of pending.filter(c=>Math.abs(c.x-centre.x)<=1&&Math.abs(c.z-centre.z)<=1))makeTile(cell);
  pending=pending.filter(c=>(!tiles.has(c.key)||tiles.get(c.key).lod!==c.lod)&&c.key!==activeTile?.cell.key);buildRoads(landing);dirty=true;
 }
 let landingPending=true;
 function update(position={x:0,z:5}){
  if(disposed)return;const updateStarted=performance.now(),arrival=landingPending;lastPosition=position;const centre=realmSectorAt(position),key=realmSectorKey(centre.x,centre.z);
  const moving=!Number.isFinite(lastSampleX)||Math.hypot(position.x-lastSampleX,position.z-lastSampleZ)>.01;lastSampleX=position.x;lastSampleZ=position.z;
  if(key!==lastKey){lastKey=key;reconcile(position,landingPending);landingPending=false;}
  const workStarted=performance.now(),tileBudget=roadTask?2:3,nearSegments=profile.segments[0],vertexBudget=profile.workPerFrame*((nearSegments+1)**2+4*(nearSegments+1));
  // At rest, small distant tiles may share a slice within the old vertex-upload
  // budget. Walking also retains its strict one/two-tile limit, including when
  // callers mutate the same position object instead of returning a new one.
  for(let vertices=0,completed=0;activeTile||pending.length;){
   if(performance.now()-workStarted>=tileBudget||moving&&completed>=profile.workPerFrame)break;
   const next=activeTile?.cell||pending[0],segments=profile.segments[next.lod],vertexCount=(segments+1)**2+4*(segments+1);
   if(vertices&&vertices+vertexCount>vertexBudget)break;
   if(!activeTile){const cell=pending.shift();activeTile={cell,task:createRealmTileTask(field,cell.x,cell.z,profile.segments[cell.lod])};}
   const sliceStarted=performance.now(),done=activeTile.task.step({budgetMs:Math.max(.15,tileBudget-(sliceStarted-workStarted))});
   work.tileSlices++;work.peakTileSliceMs=Math.max(work.peakTileSliceMs,performance.now()-sliceStarted);
   if(!done)break;vertices+=activeTile.task.geometry.attributes.position.count;makeTile(activeTile.cell,activeTile.task.geometry);activeTile=null;completed++;
  }
  coreGround.visible=Math.abs(position.x)<1300&&Math.abs(position.z)<1300;
  if(dirty||Math.hypot(position.x-lastPoolPosition.x,position.z-lastPoolPosition.z)>36){updateInstances(position);dirty=false;}
  advanceRoads(Math.max(.1,3-(performance.now()-workStarted)));
  if(!arrival)work.peakTravelUpdateMs=Math.max(work.peakTravelUpdateMs,performance.now()-updateStarted);
 }
 update(lastPosition);
 return{group,collisions:collisionList,navigationItems,travelDestinations,get walkSurfaces(){return[coreGround,...tiles.values()].map(t=>t.mesh||t);},
  get cameraSolids(){return collisionList.map(b=>({...b,bottom:field.height(b.x,b.z),top:field.height(b.x,b.z)+(b.height||20)}));},
  get collisionRevision(){return revision;},update,tick(time){windTime.value=Number.isFinite(time)?time:0;},ensureLanding(position){activeTile?.task.cancel();activeTile=null;lastKey='';landingPending=true;update(position);},
  setDaylight(value){architecture.setDaylight(value);},
  setQuality(mode,capabilities){activeTile?.task.cancel();activeTile=null;profile=realmStreamingProfile(mode,capabilities);lastKey='';update(lastPosition);},
  get diagnostics(){const meshes=[];group.traverse(o=>{if(o.isMesh&&(!o.isInstancedMesh||o.count))meshes.push(o);});return{region,radius:field.radius,areaHubRatio:realm.layout.areaHubRatio,sectorSize:SIZE,activeSectors:tiles.size,pendingSectors:pending.length+(activeTile?1:0),pendingRoadSurface:!!roadTask,work:{...work},maxSectors:profile.maxTiles,generatedSectors:generated,terrainTriangles:[...tiles.values()].reduce((n,t)=>n+t.mesh.geometry.drawRange.count/3,0),natureInstances:visiblePlants,maxNatureInstances:profile.naturalInstances,buildingInstances:visibleBuildings,activeSettlements:visibleSites,settlements:realm.sites.length-2,travelRelays:travelDestinations.length,drawCalls:meshes.length,position:{...lastPosition},realTerrain:true};},
  dispose(){if(disposed)return;disposed=true;activeTile?.task.cancel();activeTile=null;roadTask?.cancel();roadTask=null;group.removeFromParent();for(const tile of tiles.values())tile.mesh.geometry.dispose();tiles.clear();roadMesh?.geometry.dispose();for(const b of natural.values())for(const mesh of [b.wood,b.leaves,b.low])mesh.dispose();for(const b of buildingBatches)b.mesh.dispose();for(const b of monumentBatches)b.mesh.dispose();rocks.dispose();furniture.dispose();gardens.dispose();owned.forEach(o=>o.dispose());architecture.dispose();}
 };
}
