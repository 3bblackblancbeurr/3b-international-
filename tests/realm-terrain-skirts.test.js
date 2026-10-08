import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshStandardMaterial,PlaneGeometry,Raycaster,Vector3} from 'three';
import {createTerrainField} from '../src/world/terrain.js';
import {createRealmStreamer,createRealmTileGeometry} from '../src/world/realm-streaming.js';
import {blankSave} from '../src/world/rules.js';

test('useful transition skirts retain coverage from the surface to four metres below every LOD',()=>{
 const field=createTerrainField('maroc',blankSave());
 for(const segments of [6,8,12,16,24,32]){
  const geometry=createRealmTileGeometry(field,12,6,segments),positions=geometry.attributes.position,surfaceCount=(segments+1)**2;
  assert.equal(geometry.index.count/3,segments*segments*2+segments*8,'Geometry stays within the original triangle budget');
  for(let i=surfaceCount;i<positions.count;i++){
   const ground=field.height(positions.getX(i),positions.getZ(i));
   assert.ok(Math.abs(positions.getY(i)-ground+4)<.00001,'Four metres of transition coverage are retained');
  }
  assert.equal(geometry.userData.realmSkirtMask,15);
  for(let i=segments*segments*6;i<geometry.index.count;i+=3){
   assert.ok([0,1,2].some(n=>geometry.index.getX(i+n)<surfaceCount),'Every useful skirt reaches the walk plane');
  }
  geometry.dispose();
 }
});

test('only loaded equal-resolution neighbours suppress skirts through arrival, LOD replacement and eviction',()=>{
 const field=createTerrainField('estonie',blankSave()),root=new Group(),material=new MeshStandardMaterial(),coreGeometry=new PlaneGeometry(1024,1024),core=new Mesh(coreGeometry,material),stream=createRealmStreamer({region:'estonie',field,root,material,coreGround:core}),edges=[[0,-1],[1,0],[0,1],[-1,0]];
 const check=()=>{
  const tiles=new Map(stream.walkSurfaces.filter(m=>m!==core).map(mesh=>[mesh.name.match(/terrain ([-\d]+:[-\d]+)/)[1],mesh]));
  for(const [key,mesh] of tiles){const [x,z]=key.split(':').map(Number),g=mesh.geometry,segments=g.userData.realmSegments;let mask=0;
   edges.forEach(([dx,dz],edge)=>{const neighbour=tiles.get((x+dx)+':'+(z+dz));if(!neighbour||neighbour.geometry.userData.realmSegments!==segments)mask|=1<<edge;});
   assert.equal(g.userData.realmSkirtMask,mask,'Exactly the useful borders remain at '+key);
   const skirts=edges.reduce((count,_edge,i)=>count+Number(!!(mask&(1<<i))),0);
   assert.equal(g.drawRange.count,segments*segments*6+skirts*segments*6,'No hidden vertical faces are submitted');
  }
 };
 try{
  for(const point of [{x:-1732.8041975884594,z:-3069.6248291364063},{x:-1210,z:-2630},{x:3200,z:1800}]){
   stream.ensureLanding(point);check();for(let frame=0;frame<30;frame++){stream.update(point);check();}
  }
  assert.ok(stream.diagnostics.terrainTriangles<60000);
 }finally{stream.dispose();coreGeometry.dispose();material.dispose();}
});

test('the Estonian seam remains continuous and raycastable without its internal vertical faces',()=>{
 const field=createTerrainField('estonie',blankSave()),material=new MeshStandardMaterial(),root=new Group(),coreGeometry=new PlaneGeometry(1024,1024),core=new Mesh(coreGeometry,material),stream=createRealmStreamer({region:'estonie',field,root,material,coreGround:core});
 try{
  stream.ensureLanding({x:-1732.8041975884594,z:-3069.6248291364063});
  const a=stream.walkSurfaces.find(m=>m.name.startsWith('Realm terrain -7:-12 ')),b=stream.walkSurfaces.find(m=>m.name.startsWith('Realm terrain -7:-13 '));
  assert.equal(a.geometry.userData.realmSkirtMask&1,0,'Southern internal skirt is omitted');
  assert.equal(b.geometry.userData.realmSkirtMask&4,0,'Northern internal skirt is omitted');
  for(let i=0;i<=32;i++)assert.equal(a.geometry.attributes.position.getY(i),b.geometry.attributes.position.getY(32*33+i),'Shared surface heights remain identical');
  for(const x of [-1740,-1732,-1724])for(const z of [-3072.01,-3072,-3071.99]){
   const height=field.height(x,z),hit=new Raycaster(new Vector3(x,height+10,z),new Vector3(0,-1,0)).intersectObjects(stream.walkSurfaces,false)[0];
   assert.ok(hit,'Rendered terrain covers both sides and the exact seam');
   assert.ok(Math.abs(hit.point.y-height)<.00001,'Skirt removal does not change the walk surface');
  }
 }finally{stream.dispose();coreGeometry.dispose();material.dispose();}
});
