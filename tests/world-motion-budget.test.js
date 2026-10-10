import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMotion,createIndexedMotion} from '../src/world/motion.js';
import {spatialObstacles} from '../src/world/hub/spatial-obstacles.js';
import {roadDistance,segmentDistance} from '../src/world/terrain.js';
import {Group,Mesh,MeshStandardMaterial,PlaneGeometry,Raycaster,Vector3} from 'three';
import {createTerrainField} from '../src/world/terrain.js';
import {createRealmStreamer} from '../src/world/realm-streaming.js';
import {blankSave} from '../src/world/rules.js';

test('indexed walking preserves exact collision and route outcomes, including water and toggled obstacles',()=>{
 const walk=createIndexedMotion(),gate={x:4,z:0,width:1,depth:12,rotation:.23,enabled:false};
 const obstacles=[gate,{surfaceDistance:p=>20-Math.hypot(p.x,p.z)},...Array.from({length:400},(_,i)=>({x:(i%20-10)*7,z:(Math.floor(i/20)-10)*7,width:1.7,depth:3.5,rotation:i*.137}))];
 for(const input of [{x:1,z:.3},{x:-.5,z:1},{x:0,z:0}]){
  let expected={position:{x:2,z:2},target:{x:15,z:16},route:[{x:-15,z:16}]},actual=structuredClone(expected);
  for(let frame=0;frame<90;frame++){
   if(frame===20)gate.enabled=true;if(frame===60)gate.enabled=false;
   const dt=frame%11===0?.25:1/60;
   expected=advanceMotion(expected,input,dt,24,obstacles,200);actual=walk(actual,input,dt,24,obstacles,200);
   assert.deepEqual(actual,expected,'Exact movement parity at frame '+frame);
  }
 }
 const state={position:{x:2,z:2},target:null,route:[]};
 const newFloor=[{x:2.9,z:2,r:1}];
 assert.deepEqual(walk(state,{x:1,z:0},.1,12,newFloor,200),advanceMotion(state,{x:1,z:0},.1,12,newFloor,200),'Floor replacement does not reuse stale walls');
});

test('spatial lookup excludes distant scenery without allocating a bucket on every footstep',()=>{
 const nearby={x:0,z:0,r:2},water={surfaceDistance:p=>100-Math.hypot(p.x,p.z)};
 const obstacles=[nearby,water,...Array.from({length:2500},(_,i)=>({x:500+i%50*8,z:500+Math.floor(i/50)*8,r:2}))];
 const query=spatialObstacles(obstacles),bucket=query({x:0,z:0});
 assert.equal(bucket.length,2);assert.ok(bucket.includes(water));
 assert.equal(query({x:.1,z:.1}),bucket,'Walking within one cell reuses the candidate array');
});

test('allocation-free road sampling keeps exact authored distances',()=>{
 const roads=[{width:6,points:[{x:1,z:3},{x:20,z:4},{x:45,z:-7}]},{width:4,points:[{x:-20,z:9},{x:4,z:25}]}];
 for(let x=-40;x<=50;x+=3)for(let z=-40;z<=50;z+=3){
  const legacy=Math.min(Infinity,...roads.flatMap(r=>r.points.slice(1).map((b,i)=>segmentDistance(x,z,r.points[i],b)-r.width/2)));
  assert.equal(roadDistance(x,z,roads),legacy);
 }
 assert.equal(roadDistance(0,0,[]),Infinity);
});

test('running across sector boundaries respects the mobile tile budget and preserves landing ground',()=>{
 const region='france',field=createTerrainField(region,blankSave()),root=new Group(),material=new MeshStandardMaterial(),geometry=new PlaneGeometry(1024,1024),core=new Mesh(geometry,material);
 const stream=createRealmStreamer({region,field,root,material,coreGround:core});
 try{
  stream.setQuality('fluid',{desktopClass:false});stream.ensureLanding({x:1535,z:1791});
  for(let i=0;i<50;i++)stream.update({x:1535,z:1791});
  const before=stream.diagnostics.generatedSectors;
  stream.update({x:1537,z:1793});
  assert.ok(stream.diagnostics.generatedSectors-before<=1,'Walking must not synchronously rebuild the nine-tile landing neighbourhood');
  const arrival={x:-2450,z:2200};stream.ensureLanding(arrival);root.updateMatrixWorld(true);
  const hit=new Raycaster(new Vector3(arrival.x,field.height(arrival.x,arrival.z)+600,arrival.z),new Vector3(0,-1,0)).intersectObjects(stream.walkSurfaces,false)[0];
  assert.ok(hit,'Discontinuous travel still creates safe visible ground before control resumes');
 }finally{stream.dispose();geometry.dispose();material.dispose();}
});
