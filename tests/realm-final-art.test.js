import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,Group,PlaneGeometry,MeshStandardMaterial,Raycaster,Vector3,ShaderLib} from 'three';
import {REALM_PROVINCES,realmLayout,realmStaticObstacles} from '../src/world/realm-layout.js';
import {villageDoorPath} from '../src/world/realm-village-layout.js';
import {obstacleDistance} from '../src/world/collision.js';
import {createRealmArchitecture} from '../src/world/realm-architecture.js';
import {createRealmStreamer,createRealmTileTask,createRealmTileGeometry,lowPlant} from '../src/world/realm-streaming.js';
import {createRealmRoadTask,createRealmRoadGeometry} from '../src/world/realm-road-surface.js';
import {createTerrainField} from '../src/world/terrain.js';
import {blankSave} from '../src/world/rules.js';
import {FLORA_PALETTES} from '../src/world/flora.js';
import {createVillageGardenLayout,createVillageGardenGeometry} from '../src/world/realm-village-props.js';
import {realmStreamingProfile} from '../src/world/streaming.js';

test('every village has staggered frontages and an unobstructed walk to every door',()=>{
 for(const region of Object.keys(REALM_PROVINCES)){
  const layout=realmLayout(region),obstacles=realmStaticObstacles(region);
  for(const site of layout.sites.filter(s=>s.monument)){
   const homes=layout.buildings.filter(h=>h.site===site.id);
   assert.ok(new Set(homes.map(h=>Math.round(h.rotation*100))).size>=5,'Varied orientations, not parallel rows');
   for(const side of [-1,1])assert.ok(new Set(homes.filter(h=>Math.sign(h.x-site.x)===side).map(h=>h.x)).size>=3,'Staggered frontage');
   for(const home of homes){
    const [street,door]=villageDoorPath(site,home);
    for(let step=0;step<=30;step++){
     const p={x:street.x+(door.x-street.x)*step/30,z:street.z+(door.z-street.z)*step/30};
     assert.ok(obstacles.every(o=>obstacleDistance(p,o)>.9),region+' reachable entrance '+home.id);
    }
    // The physical roof footprint must not cross the neighbouring building.
    for(const other of homes.filter(h=>h!==home))for(const [x,z] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
     const dx=x*home.width*.56,dz=z*home.depth*.58,c=Math.cos(home.rotation),s=Math.sin(home.rotation);
     assert.ok(obstacleDistance({x:home.x+dx*c+dz*s,z:home.z-dx*s+dz*c},other)>1,'Separated roof envelopes');
    }
   }
  }
 }
});

test('pitched roofs face the sky and intercept overhead rays above the wall top',()=>{
 for(const region of ['france','estonie','italie','espagne','turquie']){
  const architecture=createRealmArchitecture(region);
  try{for(const floors of [1,2])for(const variant of [0,1,2]){
   const mesh=new Mesh(architecture.house(floors,variant),architecture.material);mesh.updateMatrixWorld(true);
   for(const x of [-5,-2,2,5]){
    const hit=new Raycaster(new Vector3(x,40,3),new Vector3(0,-1,0)).intersectObject(mesh,false)[0];
    assert.ok(hit&&hit.point.y>floors*5.6+.5,region+' opaque roof above living space');
    assert.ok(hit.face.normal.y>.6,'The exterior slope is the front face');
   }
  }}finally{architecture.dispose();}
 }
});

test('unlit windows remain glass and doors retain wood in the shared material',()=>{
 const a=createRealmArchitecture('france');
 try{
  const g=a.house(2,1),glazing=g.attributes.realmGlazing,night=g.attributes.realmWindow;
  assert.ok([...glazing.array].some((v,i)=>v===1&&night.getX(i)===0),'Unlit glass is not masonry');
  assert.ok([...glazing.array].some(v=>v===0));
  const count=g.index.count;
  for(let i=0;i<count;i+=3){const value=glazing.getX(g.index.getX(i));assert.equal(glazing.getX(g.index.getX(i+1)),value);assert.equal(glazing.getX(g.index.getX(i+2)),value);}
  const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};a.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/villageBaseColor=diffuse;/,'Glass colour comes from its own material, not the masonry texture');
  assert.ok(shader.fragmentShader.indexOf('normal=normalize(mix(normal,villagePlainNormal')<shader.fragmentShader.indexOf('#include <lights_physical_fragment>'));
 }finally{a.dispose();}
});

test('incremental terrain never publishes partial land and preserves the canonical surface exactly',()=>{
 const field=createTerrainField('maroc',blankSave()),task=createRealmTileTask(field,12,6,32),sync=createRealmTileGeometry(field,12,6,32);
 let steps=0;while(!task.step({maxSteps:1,budgetMs:Infinity})){assert.equal(task.geometry,null);assert.ok(++steps<100);}
 assert.ok(steps>=32,'Dense terrain is divided into rows');
 try{for(const name of ['position','normal','color','uv'])assert.deepEqual(task.geometry.attributes[name].array,sync.attributes[name].array);assert.deepEqual(task.geometry.index.array,sync.index.array);}
 finally{task.geometry.dispose();sync.dispose();}
 const cancelled=createRealmTileTask(field,12,6,32);cancelled.step({maxSteps:1});cancelled.cancel();assert.equal(cancelled.step(),true);assert.equal(cancelled.geometry,null);
});

test('incremental paving keeps all complete streets and upward village foundations',()=>{
 const field=createTerrainField('france',blankSave()),site=field.realm.sites.find(s=>s.id.endsWith('village-2-3')),segments=field.realm.roadSegments.slice(0,3);
 const task=createRealmRoadTask(field,segments,[site]),sync=createRealmRoadGeometry(field,segments,[site]);
 let steps=0;while(!task.step({maxSteps:1,budgetMs:Infinity})){assert.equal(task.geometry,null);assert.ok(++steps<2000);}
 assert.ok(steps>50,'Streets can yield before completing a whole village');
 try{for(const name of ['position','normal','color','uv','roadProfile'])assert.deepEqual(task.geometry.attributes[name].array,sync.attributes[name].array);assert.deepEqual(task.geometry.index.array,sync.index.array);
  const p=sync.attributes.position,n=sync.attributes.normal;
  for(let i=0;i<p.count;i++)assert.ok(n.getY(i)>.3,'Opaque paving faces the sky');
 }finally{task.geometry.dispose();sync.dispose();}
 const cancelled=createRealmRoadTask(field,segments,[site]);cancelled.step({maxSteps:1});cancelled.cancel();assert.equal(cancelled.step(),true);assert.equal(cancelled.geometry,null);
});

test('distant plants retain valid lighting normals and a bounded silhouette budget',()=>{
 for(const type of ['Pine','Cypress','Palm','Olive','Oak']){
  const g=lowPlant(type,FLORA_PALETTES.france);
  try{assert.ok(g.attributes.position.count/3<=300);for(const a of Object.values(g.attributes))assert.ok([...a.array].every(Number.isFinite));
   const normals=g.attributes.normal;for(let i=0;i<normals.count;i++)assert.ok(Math.abs(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))-1)<.0001,type+' unit lighting normal');
   if(['Pine','Cypress'].includes(type)){
    const mesh=new Mesh(g);mesh.updateMatrixWorld(true);const hit=new Raycaster(new Vector3(.5,30,.2),new Vector3(0,-1,0)).intersectObject(mesh,false)[0];assert.ok(hit&&hit.point.y>5&&hit.face.normal.y>0,'Crown front faces are visible from above');mesh.material.dispose();
   }
  }finally{g.dispose();}
 }
});

test('village gardens add low greenery without covering entrances or inflating the shared mesh',()=>{
 for(const region of Object.keys(REALM_PROVINCES)){
  const layout=realmLayout(region),gardens=createVillageGardenLayout(layout),geometry=createVillageGardenGeometry(region);
  try{assert.ok(gardens.length>=170&&gardens.length<=192);assert.ok(geometry.attributes.position.count/3<=300);assert.ok(geometry.boundingBox.max.y<1,'Herb beds cannot become tall opaque barriers');assert.equal(geometry.groups.length,0);
   for(const bed of gardens){
    assert.ok(geometry.boundingBox.max.x-geometry.boundingBox.min.x<=bed.width+.001);assert.ok(geometry.boundingBox.max.z-geometry.boundingBox.min.z<=bed.depth+.001);
    for(const home of layout.buildings.filter(h=>h.site===bed.site)){
     const site=layout.sites.find(s=>s.id===home.site),[a,b]=villageDoorPath(site,home);
     for(let i=0;i<=60;i++)assert.ok(obstacleDistance({x:a.x+(b.x-a.x)*i/60,z:a.z+(b.z-a.z)*i/60},bed)>1,'Garden leaves the door approach free');
    }
   }
  }finally{geometry.dispose();}
 }
});

test('packing small terrain jobs preserves the existing maximum vertex uploads per walking frame',()=>{
 const region='france',field=createTerrainField(region,blankSave()),root=new Group(),material=new MeshStandardMaterial(),geometry=new PlaneGeometry(1024,1024),core=new Mesh(geometry,material),stream=createRealmStreamer({region,field,root,material,coreGround:core});
 const site=field.realm.sites.find(s=>s.id.endsWith('village-2-3')),profile=realmStreamingProfile('auto',{desktopClass:false}),segments=profile.segments[0],limit=profile.workPerFrame*((segments+1)**2+4*(segments+1));
 try{stream.setQuality('auto',{desktopClass:false});stream.ensureLanding(site);let previous=new Set(stream.walkSurfaces.map(m=>m.geometry));
  for(let frame=0;frame<100;frame++){
   stream.update(site);const meshes=stream.walkSurfaces;const vertices=meshes.filter(m=>!previous.has(m.geometry)).reduce((sum,m)=>sum+m.geometry.attributes.position.count,0);
   assert.ok(vertices<=limit,'Small jobs cannot create a bulk GPU upload');previous=new Set(meshes.map(m=>m.geometry));
  }
  assert.equal(stream.diagnostics.pendingSectors,0);assert.equal(stream.diagnostics.pendingRoadSurface,false);assert.ok(stream.diagnostics.drawCalls<=72);
 }finally{stream.dispose();material.dispose();geometry.dispose();}
});
