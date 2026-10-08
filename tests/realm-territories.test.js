import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshStandardMaterial,PlaneGeometry,Raycaster,Vector3} from 'three';
import {REALM_MASTER_SPEC} from '../src/world/realm-master-spec.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';
import {realmDimensions,realmLayout,realmTravelItems,realmCampaignPosition,realmPositionValid,realmStaticObstacles,realmSectorAt,realmTraversal,realmCivilianRoadItems,REALM_COURT_COLUMNS} from '../src/world/realm-layout.js';
import {createRealmArchitecture} from '../src/world/realm-architecture.js';
import {createTerrainField,worldRadiusFor,landscapeItems} from '../src/world/terrain.js';
import {createRealmStreamer,createRealmTileGeometry,realmSectorPlan} from '../src/world/realm-streaming.js';
import {realmStreamingProfile} from '../src/world/streaming.js';
import {obstacleDistance} from '../src/world/collision.js';
import {findPath} from '../src/world/navigation.js';
import {advanceMotion} from '../src/world/motion.js';
import {createCivilianRoutes,civilianRoutine} from '../src/world/ambient-civilian-routes.js';
import {createAmbientCrowd} from '../src/world/ambient-crowd.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';
import {blankSave} from '../src/world/rules.js';

const IDS=Object.keys(REALM_MASTER_SPEC);
test('eight playable discs deliver the stated area multiples of the physical Hub',()=>{
 for(const region of IDS){const size=realmDimensions(region);assert.equal(size.areaHubRatio,REALM_MASTER_SPEC[region].areaTargetMultiplier);assert.ok(Math.abs(size.radius/HUB_PLATFORM.walkRadius-Math.sqrt(size.areaHubRatio))<1e-10);assert.equal(worldRadiusFor(region),size.radius);assert.ok(size.radius>3400);assert.equal(size.coreRadius,260);}
 assert.deepEqual(realmTraversal('hub',{x:430,z:0}),{speedMultiplier:1,mode:'walk'});assert.equal(realmTraversal('france',{x:2000,z:0},{combat:true}).speedMultiplier,1);
});
test('all provinces, campaign positions and relays have safe entrances and connected roads',()=>{
 for(const region of IDS){const layout=realmLayout(region),obstacles=realmStaticObstacles(region),travel=realmTravelItems(region);assert.equal(layout.buildings.length,96);assert.equal(travel.length,17);assert.equal(layout.sites.filter(s=>s.major&&s.province<3).length,3);assert.ok(travel.every(item=>realmPositionValid(region,item)),region+' relay clearance');
  for(let phase=0;phase<4;phase++)assert.ok(realmPositionValid(region,realmCampaignPosition(region,phase)),region+' campaign '+phase);
  for(const road of layout.roads)for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/8);for(let t=0;t<=n;t++){const point={x:a.x+(b.x-a.x)*t/n,z:a.z+(b.z-a.z)*t/n};assert.ok(!obstacles.some(o=>obstacleDistance(point,o)<road.width/2+.85),region+' clear road '+road.id);assert.ok(Math.hypot(point.x,point.z)<layout.radius,region+' road inside realm');}}
 }
});
test('outer terrain preserves every central interaction and deterministic sector populations',()=>{
 for(const region of IDS){const field=createTerrainField(region,blankSave());for(const item of landscapeItems(region,blankSave()).filter(i=>Math.hypot(i.x,i.z)<350))assert.ok(Math.abs(field.height(item.x,item.z))<.05,region+' legacy anchor '+item.id);
  const remote=realmCampaignPosition(region,2),cell=realmSectorAt(remote);assert.deepEqual(field.realm.sector(cell.x,cell.z),field.realm.sector(cell.x,cell.z));assert.ok(Number.isFinite(field.height(remote.x,remote.z)));assert.ok(Math.hypot(remote.x,remote.z)>field.radius*.70);
 }
});
test('permanent guardian courts sit on level ground and leave entrances and combat space clear',()=>{
 for(const region of IDS){
  const field=createTerrainField(region,blankSave()),court=realmLayout(region).sites.find(s=>s.kind==='guardianCourt'),obstacles=realmStaticObstacles(region),y=field.height(court.x,court.z),architecture=createRealmArchitecture(region),geometry=architecture.guardianCourt();
  assert.equal(geometry.userData.clearRadius,40);assert.ok(geometry.attributes.position.count<8000,'Court stays one modest shared draw');assert.ok(geometry.boundingBox.min.y<0&&geometry.boundingBox.max.y<9);
  for(let i=0;i<32;i++){const a=i*Math.PI/16;for(const radius of [0,20,40,51]){const p={x:court.x+Math.sin(a)*radius,z:court.z+Math.cos(a)*radius};assert.ok(Math.abs(field.height(p.x,p.z)-y)<.000001,region+' level court floor');if(radius<=40)assert.ok(!obstacles.some(o=>obstacleDistance(p,o)<.9),region+' open combat floor');}}
  assert.ok(REALM_COURT_COLUMNS.every(p=>obstacles.some(o=>o.id.startsWith(court.id+':column:')&&Math.hypot(o.x-court.x-p.x,o.z-court.z-p.z)<.000001)),'Rendered columns have collision footprints');
  const path=findPath({x:court.x,z:court.z+72},{x:court.x,z:court.z+8},obstacles,field.radius);assert.ok(path.length,region+' usable southern entry');
  architecture.dispose();
 }
});
test('adjacent terrain LODs share world-space borders, colours, normals and UVs',()=>{
 const field=createTerrainField('maroc',blankSave()),fine=createRealmTileGeometry(field,12,6,32),coarse=createRealmTileGeometry(field,13,6,8);
 for(let i=0;i<=8;i++){const f=i*4*33+32,c=i*9;for(const key of ['position','normal','color','uv']){const a=fine.attributes[key],b=coarse.attributes[key];for(let component=0;component<a.itemSize;component++)assert.ok(Math.abs(a.array[f*a.itemSize+component]-b.array[c*b.itemSize+component])<.00001,key+' border '+i);}}
 fine.dispose();coarse.dispose();
});
test('every remote relay has actual rendered, raycastable land within bounded mobile allocation',()=>{
 for(const region of IDS){const field=createTerrainField(region,blankSave()),root=new Group(),material=new MeshStandardMaterial({vertexColors:true}),geometry=new PlaneGeometry(1024,1024);geometry.rotateX(-Math.PI/2);const core=new Mesh(geometry,material);root.add(core);const stream=createRealmStreamer({region,field,root,material,coreGround:core});
  stream.setQuality('auto',{desktopClass:false});for(const relay of realmTravelItems(region).slice(1)){
   stream.ensureLanding(relay);for(let frame=0;frame<30;frame++)stream.update(relay);root.updateMatrixWorld(true);const hit=new Raycaster(new Vector3(relay.x,field.height(relay.x,relay.z)+600,relay.z),new Vector3(0,-1,0)).intersectObjects(stream.walkSurfaces,false)[0];assert.ok(hit,region+' visible landing '+relay.id);assert.ok(Math.abs(hit.point.y-field.height(relay.x,relay.z))<1.5,region+' physics/render height '+relay.id);
   const d=stream.diagnostics;assert.ok(d.activeSectors<=49);assert.ok(d.natureInstances<=320);assert.ok(d.buildingInstances<=48);assert.ok(d.drawCalls<=72,region+' draw calls '+d.drawCalls);assert.ok(d.terrainTriangles<60000,region+' tile triangles '+d.terrainTriangles);
  }
  assert.ok(stream.diagnostics.generatedSectors>49,region+' actually streamed multiple parts of realm');stream.dispose();geometry.dispose();material.dispose();
 }
});
test('territory guidance remains sparse and civilian routines stay on the village aisles',()=>{
 for(const region of IDS){const obstacles=realmStaticObstacles(region),radius=worldRadiusFor(region),start=realmTravelItems(region)[0],end=realmTravelItems(region).at(-1),began=performance.now(),path=findPath(start,end,obstacles,radius);assert.ok(path.length,region+' remote route');assert.ok(performance.now()-began<1000,region+' bounded journey search');
  const routes=createCivilianRoutes(realmCivilianRoadItems(region),{obstacles});assert.equal(routes.length,45);for(const route of routes)for(const time of [0,20,90,210]){const p=civilianRoutine({route,phase:.13,speed:.8,offset:.5,pause:5,activity:'looking'},time,true);assert.ok(!obstacles.some(o=>obstacleDistance(p,o)<.6),region+' civilian wall clearance');}
  for(const mode of ['fluid','auto','detail']){const profile=realmStreamingProfile(mode,{desktopClass:false});assert.ok(realmSectorPlan(end,radius,profile).length<=profile.maxTiles);}
 }
});
test('one human pool inhabits every remote village, including reduced-motion travel',async()=>{
 const region='maroc',field=createTerrainField(region,blankSave()),root=new Group(),asset=await loadShippedCrowdFixture(),crowd=createAmbientCrowd(root,realmCivilianRoadItems(region),{modelAsset:asset,viewport:844,coarsePointer:true,deviceMemory:4,groundY:field.height,obstacles:realmStaticObstacles(region),reducedMotion:true});
 await crowd.ready;try{for(const [index,relay] of realmTravelItems(region).slice(1,-1).entries()){crowd.tick(index+1,relay,(index+1)*1000);assert.equal(crowd.diagnostics.count,32);assert.equal(crowd.diagnostics.visible,32,relay.id+' local civilians');assert.equal(crowd.diagnostics.localPool,true);assert.ok(crowd.diagnostics.drawCalls<=4);}}
 finally{crowd.dispose();}assert.equal(root.children.length,0);
});
test('open riad, patio and bazaar arches really admit the avatar into their courtyards',()=>{
 for(const region of ['maroc','espagne','turquie','algerie']){
  const site=realmLayout(region).sites.find(s=>s.major&&['riad','patio','bazaar','oasis'].includes(s.kind)),obstacles=realmStaticObstacles(region),start={x:site.monument.x,z:site.monument.z+19},end={x:site.monument.x+6,z:site.monument.z+1},path=findPath(start,end,obstacles,worldRadiusFor(region));assert.ok(path.length,region+' open courtyard route');
  let state={position:start,target:path.shift(),route:path};for(let i=0;i<600&&state.target;i++)state=advanceMotion(state,{x:0,z:0},1/30,10.5,obstacles,worldRadiusFor(region));assert.ok(Math.hypot(state.position.x-end.x,state.position.z-end.z)<.1,region+' actual doorway crossing');
 }
});
