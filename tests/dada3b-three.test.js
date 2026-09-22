import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell=readFileSync(new URL('../src/games/Dada3B.jsx',import.meta.url),'utf8');
const three=readFileSync(new URL('../src/games/Dada3BThree.jsx',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('DADA 3D is lazy loaded and preserves the 2.5D fallback',()=>{
  assert.match(shell,/React\.lazy\(\(\)=>import\('\.\/Dada3BThree\.jsx'\)\)/);
  assert.match(shell,/React\.Suspense fallback=\{fallbackBoard\}/);
  assert.match(shell,/threeFailed/);
  assert.match(shell,/3D APEX/);
  assert.match(shell,/fallbackBoard=<Board/);
});

test('DADA 3D uses real Three.js WebGL, orbit controls and raycasting',()=>{
  assert.equal(typeof pkg.dependencies?.three,'string');
  assert.match(three,/new THREE\.WebGLRenderer/);
  assert.match(three,/ACESFilmicToneMapping/);
  assert.match(three,/new OrbitControls/);
  assert.match(three,/new THREE\.Raycaster/);
  assert.match(three,/new THREE\.TubeGeometry/);
  assert.match(three,/new THREE\.PointLight/);
  assert.match(three,/shadowMap\.enabled/);
});

test('DADA 3D keeps mobile safety and WebGL recovery paths',()=>{
  assert.match(three,/max-width: 700px/);
  assert.match(three,/prefers-reduced-motion/);
  assert.match(three,/webglcontextlost/);
  assert.match(three,/onUnsupported/);
  assert.match(three,/renderer\.forceContextLoss/);
});

test('DADA 3D remains synchronized with live board state and cosmetics',()=>{
  assert.match(three,/updateBoardState\(runtime,match,loadout\)/);
  assert.match(three,/blockadeOwnerAt\(match/);
  assert.match(three,/cosmeticsByCountry/);
  assert.match(three,/DADA_TRAIL_GOLD/);
  assert.match(three,/DADA_TRAIL_MATRIX/);
});
