import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell=readFileSync(new URL('../src/games/Dada3B.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/games/dada3b.css',import.meta.url),'utf8');

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
