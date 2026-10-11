import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createQualityController} from '../src/world/motion.js';
import {STREAMING_PROFILES,lodForDistance,lodForDistanceHysteresis,streamingProfile,realmStreamingProfile} from '../src/world/streaming.js';
import {worldVisualCapabilities} from '../src/world/device-capabilities.js';
import {cinematicPostBudget,worldAmbientOcclusion} from '../src/world/postprocessing.js';

test('sustained automatic overload reduces scene budgets as well as resolution',()=>{
 const q=createQualityController();
 const device={width:1440,height:900,deviceMemory:8,coarsePointer:false};
 const budgets=()=>{
  const mode=q.renderMode(),capabilities=worldVisualCapabilities({...device,mode});
  return {capabilities,post:cinematicPostBudget(mode,8,8),
   ao:worldAmbientOcclusion(mode,device.width,1,capabilities),
   stream:streamingProfile(mode,8),realm:realmStreamingProfile(mode,capabilities)};
 };
 const initial=budgets();
 assert.equal(q.renderMode(),'auto');
 for(let i=0;i<4;i++)q.sample(28,1);
 assert.equal(q.renderMode(),'auto','two resolution reductions should retain the normal scene');
 q.sample(28,1);q.sample(28,1);
 assert.equal(q.renderMode(),'fluid');
 const reduced=budgets();
 assert.equal(initial.capabilities.shadowMapSize,2048);
 assert.equal(reduced.capabilities.shadowMapSize,1024);
 assert.equal(initial.ao,true);assert.equal(reduced.ao,false);
 assert.ok(reduced.post.scale<initial.post.scale);
 assert.ok(reduced.post.flare<initial.post.flare);
 assert.ok(reduced.stream.far<initial.stream.far);
 assert.ok(reduced.stream.npcUpdateHz<initial.stream.npcUpdateHz);
 assert.ok(reduced.realm.maxTiles<initial.realm.maxTiles);
 assert.ok(reduced.realm.naturalInstances<initial.realm.naturalInstances);
 assert.ok(reduced.realm.workPerFrame<initial.realm.workPerFrame);
 const fluid=createQualityController('fluid');
 assert.ok(Math.abs(q.ratio(390,844,3)-fluid.ratio(390,844,3)*.64)<1e-12);
 assert.ok(Math.abs(q.ratio(1920,1080,3)-Math.max(.5,fluid.ratio(1920,1080,3)*.64))<1e-12);
});

test('automatic scene fallback persists through partial recovery and short frame fluctuations',()=>{
 const q=createQualityController();
 for(let i=0;i<8;i++)q.sample(28,1);
 assert.equal(q.renderMode(),'fluid');
 for(let i=0;i<24;i++)q.sample(60,1);
 assert.equal(q.profile(),'high','the historical profile follows the resolution threshold');
 assert.equal(q.renderMode(),'fluid','scene detail waits for stronger recovery');
 for(let i=0;i<30;i++){q.sample(35,1);q.sample(60,1);}
 assert.equal(q.renderMode(),'fluid','alternating frame rates must not oscillate the scene');
 q.sample(50,1);
 for(let i=0;i<36;i++)q.sample(60,1);
 assert.equal(q.renderMode(),'fluid','resolution at 0.90 is still below the recovery threshold');
 for(let i=0;i<11;i++)q.sample(60,1);
 assert.equal(q.renderMode(),'fluid');
 q.sample(60,1);
 assert.equal(q.renderMode(),'auto','six gradual recovery steps reach 0.96');
 q.sample(28,1);q.sample(28,1);
 assert.equal(q.renderMode(),'auto','a single overload step after recovery does not reenter fallback');
});

test('explicit render modes stay stable and invalid modes normalize to automatic',()=>{
 for(const mode of ['detail','fluid']){
  const q=createQualityController(mode),initial=q.ratio(1280,720,2);
  for(let i=0;i<100;i++){q.sample(20,1);q.sample(60,1);}
  assert.equal(q.renderMode(),mode);
  assert.equal(q.ratio(1280,720,2),initial);
 }
 const q=createQualityController('unknown');
 assert.equal(q.renderMode(),'auto');
 for(let i=0;i<8;i++)q.sample(28,1);
 assert.equal(q.renderMode(),'fluid');
 q.setMode('detail');assert.equal(q.renderMode(),'detail');
 q.setMode(null);assert.equal(q.renderMode(),'auto');
 assert.equal(q.ratio(390,844,3),createQualityController().ratio(390,844,3));
});

test('automatic quality starts detailed and recovers slowly after sustained overload',()=>{
 const q=createQualityController();
 assert.equal(q.profile(),'high');
 const initial=q.ratio(390,844,3);
 for(let i=0;i<8;i++)q.sample(28,1);
 assert.equal(q.profile(),'light');
 assert.ok(q.ratio(390,844,3)<initial);
 for(let i=0;i<11;i++)assert.equal(q.sample(60,1),false);
 assert.equal(q.profile(),'light');
 for(let i=0;i<100;i++)q.sample(60,1);
 assert.equal(q.profile(),'high');
 assert.equal(q.ratio(390,844,3),initial);
});

test('invalid samples and short fluctuations do not reduce quality; manual modes remain stable',()=>{
 const q=createQualityController();
 const start=q.ratio(1280,720,2);
 for(const fps of [NaN,Infinity,0,-10])assert.equal(q.sample(fps,1),false);
 for(let i=0;i<30;i++){q.sample(35,1);q.sample(55,1);}
 assert.equal(q.ratio(1280,720,2),start);
 q.setMode('fluid');assert.equal(q.profile(),'light');
 const low=q.ratio(1280,720,2);
 for(let i=0;i<100;i++)q.sample(60,1);
 assert.equal(q.ratio(1280,720,2),low);
 q.setMode('detail');
 for(let i=0;i<100;i++)q.sample(20,1);
 assert.equal(q.profile(),'high');
 assert.equal(q.ratio(1280,720,2),start);
});


test('LOD hysteresis prevents boundary flicker while still advancing when distance changes meaningfully',()=>{
 const profile=STREAMING_PROFILES.auto;
 assert.equal(lodForDistance(profile.near-1,profile),0);
 assert.equal(lodForDistance(profile.near+1,profile),1);
 let lod=0;
 lod=lodForDistanceHysteresis(profile.near*1.03,profile,lod,.08);
 assert.equal(lod,0,'small motion beyond near boundary should not immediately drop detail');
 lod=lodForDistanceHysteresis(profile.near*1.10,profile,lod,.08);
 assert.equal(lod,1,'meaningful movement away should drop detail');
 lod=lodForDistanceHysteresis(profile.near*.96,profile,lod,.08);
 assert.equal(lod,1,'small motion back across boundary should not immediately restore detail');
 lod=lodForDistanceHysteresis(profile.near*.90,profile,lod,.08);
 assert.equal(lod,0,'meaningful approach should restore detail');
});

test('scene stores LOD state for Hub structures and NPCs instead of using stateless thresholds',()=>{
 const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(scene,/hubLodState=new Map/);
 assert.match(scene,/lodForDistanceHysteresis\(d,stream,actor\.lod,\.09\)/);
 assert.match(scene,/previousLod=hubLodState\.get\(id\)/);
 assert.match(scene,/hubLodState\.set\(id,lod\)/);
});


test('mobile HIGH preserves detail but blocks desktop-only reflection and 2048 shadows',()=>{
 const phone=worldVisualCapabilities({mode:'detail',width:844,height:390,deviceMemory:8,coarsePointer:true});
 assert.equal(phone.desktopClass,false);
 assert.equal(phone.allowPlanarReflection,false);
 assert.equal(phone.shadowMapSize,1024);
 const tablet=worldVisualCapabilities({mode:'detail',width:1366,height:1024,deviceMemory:8,coarsePointer:true});
 assert.equal(tablet.allowPlanarReflection,false);
 assert.equal(tablet.shadowMapSize,1024);
 const desktop=worldVisualCapabilities({mode:'detail',width:1440,height:900,deviceMemory:8,coarsePointer:false});
 assert.equal(desktop.desktopClass,true);
 assert.equal(desktop.allowPlanarReflection,true);
 assert.equal(desktop.shadowMapSize,2048);
 const lowMemory=worldVisualCapabilities({mode:'detail',width:1440,height:900,deviceMemory:4,coarsePointer:false});
 assert.equal(lowMemory.allowPlanarReflection,false);
 assert.equal(lowMemory.shadowMapSize,1024);
});

test('scene forwards device capability gates into landscape quality and water',()=>{
 const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 const landscape=fs.readFileSync(new URL('../src/world/landscape.js',import.meta.url),'utf8');
 const water=fs.readFileSync(new URL('../src/world/premium-water.js',import.meta.url),'utf8');
 assert.match(scene,/visualCapabilities\(mode\)/);
 assert.match(scene,/const size=capabilities\.shadowMapSize/);
 assert.match(landscape,/premiumWater\.setQuality\(mode,capabilities\)/);
 assert.match(water,/allowPlanarReflection=true/);
 assert.match(water,/sceneReflection=allowPlanarReflection\?q\.sceneReflection:0/);
 assert.match(water,/reflectionTarget\.dispose\(\);reflectionTarget=null/);
 assert.match(water,/reflectionTexture\.value=normalA/);
 assert.match(water,/reflectionFrustum\.intersectsSphere\(waterSphere\)/);
});
