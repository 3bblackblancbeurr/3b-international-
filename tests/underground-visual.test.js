import test from 'node:test';
import assert from 'node:assert/strict';
import {FRANCE_ZONES,QUALITY_PROFILES,TARGET_FRAME_MS,VISUAL_BUDGETS,cameraFov,chooseQuality,lampCadencePerSecond,sprayIntensity,wetRoughness,zoneAt} from '../src/games/underground/visualConfig.js';

test('France visual slice covers the full lap with seven ordered zones',()=>{
  assert.equal(FRANCE_ZONES.length,7);assert.equal(FRANCE_ZONES[0].start,0);assert.equal(FRANCE_ZONES.at(-1).end,1);
  for(let i=0;i<FRANCE_ZONES.length;i++){const z=FRANCE_ZONES[i];assert.ok(z.end>z.start);if(i)assert.equal(z.start,FRANCE_ZONES[i-1].end);}
  assert.equal(zoneAt(.5,'france').id,'tunnel');assert.equal(zoneAt(.9,'france').id,'celiane');
});

test('visual math stays inside physical and presentation limits',()=>{
  for(const wet of [0,.25,.5,.75,1])assert.ok(wetRoughness(.62,wet)>=.08&&wetRoughness(.62,wet)<=1);
  for(const speed of [0,80,180,320])assert.ok(cameraFov(speed)>=64&&cameraFov(speed)<=74);
  assert.equal(sprayIntensity(0,1,1),0);assert.ok(sprayIntensity(260,1,1)>.9);assert.ok(lampCadencePerSecond(200,8)>6);
});

test('quality profiles scale visual cost monotonically',()=>{
  const q=['low','medium','high','ultra'].map(k=>QUALITY_PROFILES[k]);for(let i=1;i<q.length;i++){assert.ok(q[i].buildings>=q[i-1].buildings);assert.ok(q[i].rainStreaks>=q[i-1].rainStreaks);assert.ok(q[i].shadowMap>=q[i-1].shadowMap);}
  assert.equal(chooseQuality({width:1920,height:1080,dpr:1,memoryGb:16,cores:12}),'ultra');assert.equal(chooseQuality({width:3840,height:2160,dpr:2,memoryGb:4,cores:4}),'low');
});

test('60 fps master budget is internally consistent',()=>{
  assert.ok(Math.abs(TARGET_FRAME_MS-16.6666666667)<.001);const subtotal=VISUAL_BUDGETS.cpuGameMs+VISUAL_BUDGETS.cpuRenderSubmitMs+VISUAL_BUDGETS.gpuGeometryMs+VISUAL_BUDGETS.gpuLightingMs+VISUAL_BUDGETS.gpuPostFxMs+VISUAL_BUDGETS.reserveMs;assert.ok(Math.abs(subtotal-TARGET_FRAME_MS)<.02);
});
