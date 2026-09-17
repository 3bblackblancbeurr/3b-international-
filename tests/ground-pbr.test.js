import test from 'node:test';import assert from 'node:assert/strict';
import {groundPbrForDryness} from '../src/world/natural-ground.js';

test('wetter terrain keeps a richer reflection while dry terrain stays rough',()=>{
 const wet=groundPbrForDryness(.05),dry=groundPbrForDryness(.8);
 assert.ok(wet.roughness<dry.roughness);
 assert.ok(wet.envMapIntensity>dry.envMapIntensity);
 assert.ok(wet.roughness>=.92&&dry.roughness<=.99);
});
