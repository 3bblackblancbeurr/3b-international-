import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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

test('premium die remains responsive and honors reduced motion',()=>{
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/animation:none!important/);
});


test('premium die upgrades to a real Three.js WebGL renderer with CSS fallback',()=>{
  assert.match(shell,/React\.lazy\(\(\)=>import\('\.\/DadaDice3D\.jsx'\)\)/);
  assert.match(shell,/Dice3DErrorBoundary/);
  assert.match(shell,/data-webgl=\{!webglFailed\}/);
  assert.match(webgl,/new THREE\.WebGLRenderer/);
  assert.match(webgl,/RoundedBoxGeometry/);
  assert.match(webgl,/MeshPhysicalMaterial/);
  assert.match(webgl,/CanvasTexture/);
  assert.match(webgl,/webglcontextlost/);
});

test('WebGL die has six physical orientations, light rig and premium six reaction',()=>{
  assert.match(webgl,/ORIENTATIONS=Object\.freeze/);
  for(let value=1;value<=6;value++)assert.match(webgl,new RegExp('\\n  '+value+':\\['));
  assert.match(webgl,/HemisphereLight/);
  assert.match(webgl,/DirectionalLight/);
  assert.match(webgl,/PointLight/);
  assert.match(webgl,/currentValue===6/);
  assert.match(webgl,/sparkCount=28/);
  assert.match(webgl,/DADA_DICE_CHAMPAGNE/);
});

test('WebGL die is mobile bounded and disposable',()=>{
  assert.match(webgl,/max-width:700px/);
  assert.match(webgl,/setPixelRatio\(Math\.min/);
  assert.match(webgl,/renderer\.dispose/);
  assert.match(webgl,/renderer\.forceContextLoss/);
  assert.match(css,/dada3b-die-webgl/);
});
