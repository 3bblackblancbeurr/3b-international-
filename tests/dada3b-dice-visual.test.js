import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {DICE_FACE_LAYOUT,diceFaceLayout,normalizeDiceValue} from '../src/games/dada3b/dice.js';

const shell=readFileSync(new URL('../src/games/Dada3B.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/games/dada3b.css',import.meta.url),'utf8');
const webgl=readFileSync(new URL('../src/games/DadaDice3D.jsx',import.meta.url),'utf8');

test('DADA uses the premium 3D die instead of the flat unicode die button',()=>{
  assert.match(shell,/function PremiumDice/);
  assert.match(shell,/dada3b-die-cube/);
  assert.match(shell,/DiceFace value=\{6\}/);
  assert.match(shell,/rolling=\{\(busy\|\|onlineBusy\)/);
});

test('premium die exposes all six face orientations and animated rolling',()=>{
  for(let value=1;value<=6;value++)assert.match(css,new RegExp('data-value="'+value+'"'));
  assert.match(css,/@keyframes dadaDiceApexRoll/);
  assert.match(css,/transform-style:preserve-3d/);
  assert.match(css,/perspective:560px/);
  assert.match(css,/DADA_DICE_CHAMPAGNE/);
});

test('all six WebGL results physically rotate the requested face toward the camera',()=>{
  const cameraNormal=new THREE.Vector3(0,0,1);
  assert.equal(DICE_FACE_LAYOUT.length,6);
  for(const spec of DICE_FACE_LAYOUT){
    const planeQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(...spec.planeRotation,'XYZ'));
    const physicalNormal=new THREE.Vector3(0,0,1).applyQuaternion(planeQuaternion);
    assert.ok(physicalNormal.distanceTo(new THREE.Vector3(...spec.normal))<1e-9,'physical face '+spec.value+' normal is correct');

    const targetQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(...spec.targetRotation,'XYZ'));
    const finalNormal=new THREE.Vector3(...spec.normal).applyQuaternion(targetQuaternion);
    assert.ok(finalNormal.distanceTo(cameraNormal)<1e-9,'result '+spec.value+' faces the camera');
    assert.equal(diceFaceLayout(spec.value).value,spec.value);
  }
});

test('top and bottom results cannot be swapped again',()=>{
  assert.deepEqual(diceFaceLayout(5).targetRotation,[Math.PI/2,0,0]);
  assert.deepEqual(diceFaceLayout(6).targetRotation,[-Math.PI/2,0,0]);
  assert.equal(normalizeDiceValue(5),5);
  assert.equal(normalizeDiceValue(6),6);
  assert.equal(normalizeDiceValue(0),1);
  assert.equal(normalizeDiceValue(7),1);
});

test('premium die remains responsive and honors reduced motion',()=>{
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/animation:none!important/);
});

test('premium die keeps fallback visible until WebGL has actually rendered',()=>{
  assert.match(shell,/webglReady/);
  assert.match(shell,/data-webgl=\{webglReady&&!webglFailed\}/);
  assert.match(shell,/onReady=\{\(\)=>setWebglReady\(true\)\}/);
  assert.match(shell,/setWebglReady\(false\);setWebglFailed\(true\)/);
});

test('WebGL die uses shared face geometry and exact final locking',()=>{
  assert.match(webgl,/DICE_FACE_LAYOUT/);
  assert.match(webgl,/diceFaceLayout\(value\)\.targetRotation/);
  assert.match(webgl,/normalizeDiceValue/);
  assert.match(webgl,/slerpQuaternions/);
  assert.match(webgl,/root\.quaternion\.copy\(runtime\.target\)/);
  assert.match(webgl,/settleStartedAt/);
  assert.match(webgl,/onReady\?\.\(\)/);
});

test('temporary WebGL loss waits for restoration before falling back',()=>{
  assert.match(webgl,/webglcontextlost/);
  assert.match(webgl,/webglcontextrestored/);
  assert.match(webgl,/runtime\.contextLost=true/);
  assert.match(webgl,/setTimeout\(\(\)=>\{if\(runtime\.contextLost&&!runtime\.disposed\)onUnsupported/);
  assert.match(webgl,/if\(!runtime\.contextLost\)\{renderer\.render/);
});

test('WebGL die keeps premium lighting, six reaction, mobile limits and GPU cleanup',()=>{
  assert.match(webgl,/new THREE\.WebGLRenderer/);
  assert.match(webgl,/RoundedBoxGeometry/);
  assert.match(webgl,/MeshPhysicalMaterial/);
  assert.match(webgl,/CanvasTexture/);
  assert.match(webgl,/HemisphereLight/);
  assert.match(webgl,/DirectionalLight/);
  assert.match(webgl,/PointLight/);
  assert.match(webgl,/currentValue===6/);
  assert.match(webgl,/sparkCount=28/);
  assert.match(webgl,/DADA_DICE_CHAMPAGNE/);
  assert.match(webgl,/max-width:700px/);
  assert.match(webgl,/setPixelRatio\(Math\.min/);
  assert.match(webgl,/renderer\.dispose/);
  assert.match(webgl,/renderer\.forceContextLoss/);
  assert.match(css,/dada3b-die-webgl/);
});
