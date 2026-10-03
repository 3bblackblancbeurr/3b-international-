import test from 'node:test';
import assert from 'node:assert/strict';
import {artLighting,REALM_ART} from '../src/world/art-direction.js';
import {worldTimeSnapshot} from '../src/world/world-time.js';
import {DEFAULT_WORLD_VISUAL,WORLD_VISUAL_KEY,normalizeVisualPreferences,loadVisualPreferences,saveVisualPreferences,accessibleLighting} from '../src/world/visual-preferences.js';

test('shadow assistance lifts night visibility in every realm without changing world conditions',()=>{
 for(const region of Object.keys(REALM_ART)){
  const time=worldTimeSnapshot(new Date(2026,9,3,2)),copy={...time};
  const original=artLighting(region,time,{visibility:.4});
  const lifted=accessibleLighting(original,DEFAULT_WORLD_VISUAL);
  assert.ok(lifted.skyIntensity>original.skyIntensity);assert.ok(lifted.fillIntensity>original.fillIntensity);
  assert.ok(lifted.environmentIntensity>original.environmentIntensity);
  for(const key of ['sunIntensity','fogNear','fogFar','day','palette','exposure'])assert.deepEqual(lifted[key],original[key]);
  assert.deepEqual(time,copy);
  assert.deepEqual(accessibleLighting(original,{brightness:1,shadowAssist:false}),original);
  const midday=artLighting(region,{daylight:1,sun:1});assert.deepEqual(accessibleLighting(midday,DEFAULT_WORLD_VISUAL),midday);
 }
});

test('brightness is bounded and independent from difficulty, quality and night assistance',()=>{
 const base=artLighting('france',{daylight:.18,sun:.15});
 assert.equal(accessibleLighting(base,{brightness:1.3,shadowAssist:false}).exposure,base.exposure*1.3);
 for(const brightness of [-100,100,NaN,Infinity,undefined,'1.3']){
  const preference=normalizeVisualPreferences({brightness,shadowAssist:'false',difficulty:'expert'});
  assert.ok(preference.brightness>=.8&&preference.brightness<=1.5);assert.equal(preference.shadowAssist,true);
  assert.equal('difficulty' in preference,false);
  assert.ok(accessibleLighting(base,preference).exposure<=1.6);
 }
});

test('visual preferences persist across sessions and recover from unavailable or corrupted storage',t=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),entries=new Map();
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)},configurable:true});
 t.after(()=>descriptor?Object.defineProperty(globalThis,'localStorage',descriptor):delete globalThis.localStorage);
 assert.deepEqual(loadVisualPreferences(),DEFAULT_WORLD_VISUAL);
 assert.equal(saveVisualPreferences({brightness:1.25,shadowAssist:false}),true);
 assert.deepEqual(loadVisualPreferences(),{brightness:1.25,shadowAssist:false});
 entries.set(WORLD_VISUAL_KEY,'broken');assert.deepEqual(loadVisualPreferences(),DEFAULT_WORLD_VISUAL);
 t.mock.method(localStorage,'setItem',()=>{throw Error('Quota');});assert.equal(saveVisualPreferences(DEFAULT_WORLD_VISUAL),false);
});
