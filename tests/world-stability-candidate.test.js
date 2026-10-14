import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshStandardMaterial,PlaneGeometry} from 'three';
import {createFrameHealth} from '../src/world/frame-health.js';
import {createQualityController} from '../src/world/motion.js';
import {createTerrainField} from '../src/world/terrain.js';
import {createRealmStreamer} from '../src/world/realm-streaming.js';
import {blankSave} from '../src/world/rules.js';

test('automatic quality can shed work while moving but only restores detail after an idle recovery',()=>{
 const quality=createQualityController();
 for(let i=0;i<8;i++)quality.sampleFrames(28,1,{allowRecovery:false});
 assert.equal(quality.renderMode(),'fluid');const reduced=quality.ratio(390,844,3);
 for(let i=0;i<120;i++)quality.sampleFrames(60,1,{allowRecovery:false});
 assert.equal(quality.ratio(390,844,3),reduced);
 for(let i=0;i<100;i++)quality.sampleFrames(60,1,{allowRecovery:true});
 assert.equal(quality.renderMode(),'auto');assert.ok(quality.ratio(390,844,3)>reduced);
});

test('session diagnostics count actual movement stalls and retain a bounded recent frame window',()=>{
 const health=createFrameHealth();
 health.sample({gapMs:NaN,moving:true});
 health.sample({gapMs:3000,moving:false});
 for(let i=0;i<1000;i++)health.sample({gapMs:33,moving:true,updateMs:4,renderMs:10});
 health.sample({gapMs:2200,moving:true,updateMs:80,renderMs:900});
 const snapshot=health.snapshot();
 assert.equal(snapshot.windowFrames,240);assert.equal(snapshot.movingFrames,1001);
 assert.equal(snapshot.stalls,1);assert.equal(snapshot.maxGapMs,2200);
 assert.equal(snapshot.p95Ms,33);assert.equal(snapshot.updatePeakMs,80);assert.equal(snapshot.renderPeakMs,900);
});

test('terrain quality changes replace same-LOD geometry incrementally and identical settings retain in-flight work',()=>{
 const field=createTerrainField('france',blankSave()),root=new Group(),material=new MeshStandardMaterial(),geometry=new PlaneGeometry(1024,1024),core=new Mesh(geometry,material);
 const stream=createRealmStreamer({region:'france',field,root,material,coreGround:core}),position={x:1535,z:1791};
 try{
  stream.ensureLanding(position);
  for(let i=0;i<2000&&stream.diagnostics.pendingSectors;i++)stream.update(position);
  const groundBefore=new Map(stream.walkSurfaces.filter(m=>m!==core).map(m=>[m.name,m.geometry]));
  const before=stream.diagnostics;
  stream.setQuality('auto',{desktopClass:false});
  assert.deepEqual(stream.diagnostics,before,'Identical profiles must perform no streaming work');
  stream.setQuality('fluid',{desktopClass:false});
  assert.ok(stream.diagnostics.generatedSectors-before.generatedSectors<=1,'Quality change does not drain a landing neighbourhood');
  for(let i=0;i<2000&&stream.diagnostics.pendingSectors;i++)stream.update(position);
  assert.equal(stream.diagnostics.pendingSectors,0);
  const near=stream.walkSurfaces.filter(m=>m.name?.endsWith('LOD 0'));
  assert.ok(near.length>0);assert.ok(near.every(m=>m.geometry.userData.realmSegments===24));
  assert.ok(near.some(m=>groundBefore.get(m.name)!==m.geometry),'Existing same-LOD tiles receive the lighter geometry');
 }finally{stream.dispose();material.dispose();geometry.dispose();}
});
