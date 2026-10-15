import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshStandardMaterial,PlaneGeometry} from 'three';
import {createFrameHealth,createFrameTimeline} from '../src/world/frame-health.js';
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

test('ten minutes at 30 FPS keeps automatic phone detail and resolution intact',()=>{
 const quality=createQualityController('auto',{targetFps:30}),ratio=quality.ratio(390,844,3);
 for(let second=0;second<600;second++)assert.equal(quality.sampleFrames(30,1,{allowRecovery:false}),false);
 assert.equal(quality.renderMode(),'auto');assert.equal(quality.ratio(390,844,3),ratio);
});

test('isolated and periodic phone hitches stay diagnostic instead of degrading image quality',()=>{
 const quality=createQualityController('auto',{targetFps:30}),ratio=quality.ratio(390,844,3);
 assert.equal(quality.sampleFrames(1,3),false);
 for(let second=0;second<600;second++)quality.sampleFrames(second%3===0?12:45,1,{windowStalled:second%3===0,allowRecovery:false});
 assert.equal(quality.renderMode(),'auto');assert.equal(quality.ratio(390,844,3),ratio);
});

test('a phone persistently below five FPS can still shed work after three severe windows',()=>{
 const quality=createQualityController('auto',{targetFps:30});quality.ratio(390,844,3);
 const options={windowStalled:true,severeOverload:true,allowRecovery:false};
 for(let i=0;i<3;i++)assert.equal(quality.sampleFrames(1,6,options),false,'one completed image cannot establish sustained collapse');
 assert.equal(quality.sampleFrames(2,1,options),false);assert.equal(quality.sampleFrames(2,1,options),false);
 assert.equal(quality.sampleFrames(2,1,options),true);assert.equal(quality.renderMode(),'fluid');assert.equal(quality.ratio(390,844,3),1.75,'First shed effects without blurring the image');
});

test('phone requires three consecutive overloaded windows and does not hide levels below the effective floor',()=>{
 const quality=createQualityController('auto',{targetFps:30}),start=quality.ratio(390,844,3);
 assert.equal(quality.sampleFrames(24,1),false);assert.equal(quality.sampleFrames(24,1),false);
 quality.sampleFrames(30,1);assert.equal(quality.sampleFrames(24,1),false);assert.equal(quality.sampleFrames(24,1),false);
 assert.equal(quality.sampleFrames(24,1),true);assert.equal(quality.renderMode(),'fluid');assert.equal(quality.ratio(390,844,3),start);
 for(let i=0;i<3;i++)quality.sampleFrames(24,1);assert.equal(quality.ratio(390,844,3),1.6);
 for(let i=0;i<100;i++)quality.sampleFrames(24,1);
 assert.equal(quality.renderMode(),'fluid');assert.equal(quality.ratio(390,844,3),1);
 for(let i=0;i<100;i++)assert.equal(quality.sampleFrames(24,1),false,'no invisible extra degradation at the floor');
 for(let i=0;i<12;i++)quality.sampleFrames(45,1);
 assert.equal(quality.renderMode(),'fluid');assert.equal(quality.ratio(390,844,3),1.1,'Resolution recovers before expensive effects');
});

test('phone recovery waits for a cooldown and movement cannot restore the expensive scene',()=>{
 const quality=createQualityController('auto',{targetFps:30});quality.ratio(390,844,3);
 for(let i=0;i<21;i++)quality.sampleFrames(24,1);
 assert.equal(quality.renderMode(),'fluid');
 for(let i=0;i<60;i++)quality.sampleFrames(60,1,{allowRecovery:false});
 assert.equal(quality.renderMode(),'fluid');
 for(let i=0;i<11;i++)quality.sampleFrames(45,1);
 assert.equal(quality.renderMode(),'fluid');quality.sampleFrames(45,1);assert.equal(quality.renderMode(),'fluid');
 for(let i=0;i<72;i++)quality.sampleFrames(45,1);assert.equal(quality.renderMode(),'auto');
 for(let i=0;i<20;i++)quality.sampleFrames(24,1,{allowRecovery:false});
 assert.equal(quality.renderMode(),'auto','terrain profiles cannot rebuild again within the 60-second cooldown');
});

test('phone absolute resolution levels respect pixel budgets and preserve explicit modes',()=>{
 for(const [width,height,dpr] of [[360,780,3],[412,915,2.6],[800,1280,2],[1600,2560,2],[390,844,1]]){
  const quality=createQualityController('auto',{targetFps:30}),start=quality.ratio(width,height,dpr);
  assert.ok(start<=Math.min(dpr,1.75,Math.sqrt(3000000/(width*height))));
  for(let i=0;i<30;i++)quality.sampleFrames(24,1,{allowRecovery:false});
  const floor=quality.ratio(width,height,dpr);
  assert.equal(floor,Math.min(dpr,1,Math.sqrt(850000/(width*height))));
  for(const mode of ['fluid','detail']){
   quality.setMode(mode);const legacy=createQualityController(mode).ratio(width,height,dpr);
   assert.equal(quality.ratio(width,height,dpr),legacy);
   for(let i=0;i<100;i++)quality.sampleFrames(12,1);
   assert.equal(quality.ratio(width,height,dpr),legacy);
  }
 }
});

test('stall evidence retains only twenty contexts and snapshots cannot mutate retained events',()=>{
 const health=createFrameHealth();
 for(let i=0;i<40;i++)health.sample({gapMs:300+i,moving:true,context:{timeMs:i,region:'france',quality:'auto',programs:12}});
 const first=health.snapshot();assert.equal(first.stalls,40);assert.equal(first.events.length,20);
 assert.equal(first.events[0].timeMs,20);assert.equal(first.events.at(-1).timeMs,39);
 first.events[0].region='changed';assert.equal(health.snapshot().events[0].region,'france');
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


test('a slow phone removes effects before resolution and returns them only after clarity has recovered',()=>{
 const quality=createQualityController('auto',{targetFps:30}),ratio=quality.ratio(412,915,2.625);
 for(let i=0;i<3;i++)quality.sampleFrames(25,1,{allowRecovery:false});
 assert.equal(quality.renderMode(),'fluid');assert.equal(quality.ratio(412,915,2.625),ratio);
 for(let i=0;i<600;i++)quality.sampleFrames(30,1,{allowRecovery:false});
 assert.equal(quality.ratio(412,915,2.625),ratio,'A lighter stable scene retains full clarity');
 assert.equal(quality.renderMode(),'fluid');
 for(let i=0;i<12;i++)quality.sampleFrames(45,1,{allowRecovery:true});
 assert.equal(quality.renderMode(),'auto');
});

test('frame timeline associates a freeze with the previous submitted frame, not its recovery',()=>{
 const health=createFrameHealth(),timeline=createFrameTimeline(health);
 timeline.begin(100);
 timeline.end({started:100,finished:2100,updateMs:1850,worldMs:1800,renderMs:100,snapshotMs:50,moving:true,context:{region:'france',programs:12}});
 timeline.begin(2200);
 let event=health.snapshot().events[0];
 assert.equal(event.gapMs,2100);assert.equal(event.updateMs,1850);assert.equal(event.worldMs,1800);
 assert.equal(event.renderMs,100);assert.equal(event.snapshotMs,50);assert.equal(event.betweenFramesMs,100);
 timeline.end({started:2200,finished:2210,updateMs:5,renderMs:5,moving:true,context:{region:'hub',programs:15}});
 timeline.begin(2233);
 event=health.snapshot().events[0];assert.equal(event.region,'france');assert.equal(event.programs,12);
 assert.equal(health.snapshot().stalls,1);
});

test('frame timeline identifies time outside scene submission without calling it GPU time',()=>{
 const health=createFrameHealth(),timeline=createFrameTimeline(health);
 timeline.begin(100);timeline.end({started:100,finished:115,updateMs:10,renderMs:5,moving:true});timeline.begin(2600);
 const event=health.snapshot().events[0];assert.equal(event.frameCpuMs,15);assert.equal(event.betweenFramesMs,2485);
 assert.equal(event.updateMs,10);assert.equal(event.renderMs,5);
});

test('pause, loading and visibility resets discard the pending interval without erasing previous evidence',()=>{
 const health=createFrameHealth(),timeline=createFrameTimeline(health);
 timeline.begin(0);timeline.end({started:0,finished:300,moving:true});timeline.begin(330);
 timeline.end({started:330,finished:340,moving:true});timeline.reset();timeline.begin(60000);
 timeline.end({started:60000,finished:60010,moving:true});timeline.begin(60033);
 assert.equal(health.snapshot().stalls,1);assert.equal(health.snapshot().frames,2);
 timeline.end({started:NaN,finished:60040,moving:true});timeline.begin(90000);
 assert.equal(health.snapshot().stalls,1);
});
