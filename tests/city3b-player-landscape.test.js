import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,A,B} from './helpers/city-playable-db.js';
import {cityMapBlueprint,cityMapRoads,cityMapPlacementPolicy} from '../src/city/city3b-map.js';
import {cityLandscape,roadDraft,snapRoadPoint,landscapeCheck,segmentsDistance} from '../src/city/city3b-landscape.js';
import {citySceneSignature} from '../src/city/city3b-building-progress.js';
import {buildingDetails,matrixTree} from '../src/city/city3b-architecture.js';
import * as THREE from 'three';
const terrain=(x=220,z=220,kind='lake',width=24)=>({id:randomUUID(),kind,x1:x,z1:z,x2:x,z2:z,width});
const plan=async(f,list,expected=[],user=A)=>f.db.query('select nexus_city_plan_terrain($1,$2::jsonb,$3::jsonb)',[user,JSON.stringify(list),JSON.stringify(expected)]);
test('blank city has no automatic road network and the former centre is a usable parcel',()=>{
 assert.deepEqual(cityMapRoads(cityMapBlueprint({})),{rings:[],radials:[],boulevards:[],custom:[]});
 assert.equal(cityMapPlacementPolicy({}, {x:0,z:0},{width:3,height:3}).valid,true);
 const saved={city:{city:{roads:[{id:'old',x1:0,z1:0,x2:20,z2:0,width:4}]}}};assert.equal(cityMapRoads(cityMapBlueprint(saved)).custom.length,1);
});
test('road tool snaps to existing intersections and previews straight or right-angle paths without saving',()=>{
 const roads=[{x1:0,z1:0,x2:40,z2:0,width:4}];assert.deepEqual(snapRoadPoint({x:15,z:3},roads),{x:15,z:0});
 const corner=roadDraft({x:0,z:0},{x:20,z:20},roads,8,'corner');assert.equal(corner.length,2);assert.equal(corner[0].x2,corner[1].x1);assert.equal(corner[0].z2,corner[1].z1);
 assert.equal(roadDraft({x:0,z:0},{x:2,z:0}).length,0);assert.deepEqual(roads,[{x1:0,z1:0,x2:40,z2:0,width:4}]);
});
test('crossing segments, lakes and saved footprints share the same preview constraints',()=>{
 assert.equal(segmentsDistance({x1:-10,z1:0,x2:10,z2:0},{x1:0,z1:-10,x2:0,z2:10}),0);
 const f=terrain(),data={city:{city:{map_extent:500,terrain:[f]}},placements:[]};
 assert.equal(landscapeCheck(data,[{x1:200,z1:220,x2:240,z2:220,width:4}],{road:true}).valid,false);
 assert.equal(cityMapPlacementPolicy(data,{x:220,z:220},{width:3,height:3}).valid,false);
 assert.notEqual(citySceneSignature(data),citySceneSignature({city:{city:{map_extent:500,terrain:[]}}}));assert.equal(cityLandscape(data).length,1);
});
test('landscape persists, repeats safely, preserves economy and cannot overwrite a concurrent landscape',async()=>{
 const f=await fixture({landscape:true});try{
  const cityBefore=await f.city(),coins=await f.coins(),lake=terrain();assert.deepEqual(cityBefore.city.roads,[]);
  assert.equal((await f.snapshot()).missions.find(m=>m.status==='available').code,'foundation_road');
  await plan(f,[lake]);assert.deepEqual((await f.city()).city.terrain,[lake]);assert.equal(await f.coins(),coins);
  await assert.rejects(plan(f,[terrain(260,260)],[]),/paysage a changé/);
  await plan(f,[lake],[lake]);assert.deepEqual((await f.city()).city.terrain,[lake]);
  assert.equal((await f.city(B)).city.terrain,undefined);await plan(f,[],[lake]);assert.deepEqual((await f.city()).city.terrain,[]);
 }finally{await f.db.close();}
});
test('server rejects landscape/building/road conflicts, malformed payloads and suspended passports atomically',async()=>{
 const f=await fixture({landscape:true});try{
  await f.query('select nexus_city_place_v2($1,$2,0,0,0::smallint,$3)',[A,'HOME_ORIGIN',randomUUID()]);
  await assert.rejects(plan(f,[terrain(1,1)]),/bâtiment/);assert.equal((await f.city()).city.terrain,undefined);
  const lake=terrain();await plan(f,[lake]);
  await assert.rejects(f.query('select nexus_city_place_v2($1,$2,220,220,0::smallint,$3)',[A,'HOME_ORIGIN',randomUUID()]),/décor/);
  await assert.rejects(f.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify([{x1:200,z1:220,x2:240,z2:220,width:4}])]),/eau|étendue/);
  for(const bad of [{...terrain(),kind:'fake'},{...terrain(),x1:999},{...terrain(),width:999},{...terrain(),x2:222},{...terrain(),x1:null}])await assert.rejects(plan(f,[lake,bad],[lake]));
  await f.db.query("update member_profiles set passport_state='suspended' where user_id=$1",[A]);await assert.rejects(plan(f,[],[lake]),/actif/);
  await f.db.exec('set role authenticated');await assert.rejects(plan(f,[],[lake]),/permission denied/);
 }finally{await f.db.close();}
});
test('a river cannot cut a saved road and failed edits preserve both plans',async()=>{
 const f=await fixture({landscape:true});try{
  const road={id:'saved',x1:210,z1:240,x2:290,z2:240,width:4};await f.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify([road])]);
  const river={...terrain(250,200,'river',8),x2:250,z2:290};await assert.rejects(plan(f,[river]),/route/);
  assert.deepEqual((await f.city()).city.roads,[road]);assert.equal((await f.city()).city.terrain,undefined);
 }finally{await f.db.close();}
});
test('road edits reject an outdated plan without removing roads saved by another session',async()=>{
 const f=await fixture({landscape:true});try{
  const road={id:'first',x1:220,z1:260,x2:280,z2:260,width:4};
  await f.query('select nexus_city_plan_roads_v2($1,$2::jsonb,$3::jsonb)',[A,JSON.stringify([road]),'[]']);
  await assert.rejects(f.query('select nexus_city_plan_roads_v2($1,$2::jsonb,$3::jsonb)',[A,'[]','[]']),/routes ont changé/);
  assert.deepEqual((await f.city()).city.roads,[road]);
 }finally{await f.db.close();}
});
test('Matrix trees and facade details share simple geometry and fit a bounded mesh budget',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(),sphere=new THREE.IcosahedronGeometry(1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),m=new THREE.MeshStandardMaterial();
 const shape=(parent,geo,color,x,y,z,w,h,d)=>{const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;},box=(parent,color,x,y,z,w,h,d)=>shape(parent,g,color,x,y,z,w,h,d);
 buildingDetails({box,shape,sphereGeo:sphere},root,{w:4,d:4,height:5,kind:'commerce'});matrixTree({box,shape,sphereGeo:sphere,cylinderGeo:cylinder},root,0,0,1);
 assert.ok(root.children.length>20&&root.children.length<60);assert.ok(root.children.every(x=>[g,sphere,cylinder].includes(x.geometry)));g.dispose();sphere.dispose();cylinder.dispose();m.dispose();
});
