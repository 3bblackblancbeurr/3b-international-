import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WetWeatherMicroFX} from '../src/games/underground/WetWeatherMicroFX.js';

test('wet weather micro FX reacts to speed and wetness',()=>{
  const scene=new THREE.Scene(),fx=new WetWeatherMicroFX(scene,{id:'wet-test'},{quality:'high'});const before=fx.rings.instanceMatrix.version;
  fx.update({playerPosition:new THREE.Vector3(0,0,0),playerTangent:new THREE.Vector3(0,0,1),wetness:.9,speedKph:210,dt:.016});
  assert.ok(fx.rings.material.opacity>0);assert.ok(fx.splashes.material.opacity>0);assert.ok(fx.rings.instanceMatrix.version>before);
  fx.rings.geometry.dispose();fx.rings.material.dispose();fx.splashes.geometry.dispose();fx.splashes.material.dispose();
});
