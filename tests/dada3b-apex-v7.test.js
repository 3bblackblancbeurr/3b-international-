import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell=readFileSync(new URL('../src/games/Dada3B.jsx',import.meta.url),'utf8');
const three=readFileSync(new URL('../src/games/Dada3BThree.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/games/dada3b.css',import.meta.url),'utf8');

test('V7 brightens the board and reduces dark fog',()=>{
  assert.match(three,/toneMappingExposure=1\.5[0-9]/);
  assert.match(three,/FogExp2\(0x0d2730,\.010\)/);
  assert.match(three,/HemisphereLight\(0xd7faff,0x49351b,2\.72\)/);
  assert.match(three,/DirectionalLight\(0xffecc2,5\.9\)/);
  assert.match(three,/PointLight\(0x72e6f5,18/);
});

test('V7 path is no longer a uniform ring of identical cylinders',()=>{
  assert.match(three,/function trackElevation/);
  assert.match(three,/function cellGeometryFor/);
  assert.match(three,/BoxGeometry\(\.96,\.21,\.38\)/);
  assert.match(three,/CylinderGeometry\(\.43,\.36,\.24,6\)/);
  assert.match(three,/tangentAngle/);
  assert.match(three,/trackElevation\(cell\)\+\.39/);
});

test('V7 exposes strong defense, sanctuary and capture feedback',()=>{
  assert.match(three,/function createBarrierFx/);
  assert.match(three,/SphereGeometry\(\.68/);
  assert.match(three,/function addSanctuaryFx/);
  assert.match(three,/cameraShakeUntil/);
  assert.match(three,/IcosahedronGeometry\(\.34,1\)/);
  assert.match(three,/for\(let i=0;i<10;i\+\+\)/);
});

test('V7 keeps the main menu and tactical UI compact',()=>{
  assert.match(shell,/dada3b-home-menu-v8/);
  assert.match(shell,/dada3b-menu-primary/);
  assert.match(shell,/Plus d’options/);
  assert.match(shell,/dada3b-settings-collapsed/);
  assert.match(shell,/dada3b-tactical-panel/);
  assert.match(css,/dada3b-menu-primary-v8/);
  assert.match(css,/dada3b-tactical-content/);
});

test('V7 keeps mobile and reduced-motion polish',()=>{
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(max-width:420px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/dadaVictoryRays/);
});
