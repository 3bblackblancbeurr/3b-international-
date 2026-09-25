import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const match=readFileSync(new URL('../src/games/PenaltyRush.jsx',import.meta.url),'utf8');
const training=readFileSync(new URL('../src/games/penaltyRush/PenaltyTraining.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/games/penaltyRush3d.css',import.meta.url),'utf8');

test('3B premium face controls expose black white beur-gold and 3B actions',()=>{
  for(const source of [match,training]){
    assert.match(source,/penalty-face-cluster/);
    assert.match(source,/data-tone="black"/);
    assert.match(source,/data-tone="white"/);
    assert.match(source,/data-tone="beur"/);
    assert.match(source,/data-tone="3b"/);
  }
  assert.match(match,/sendAttackerFace\('accelerate'/);
  assert.match(match,/sendAttackerFace\('feint'/);
  assert.match(match,/sendAttackerFace\('cut'/);
  assert.match(match,/keeperFaceEnd/);
  assert.match(css,/min-width|width:78px/);
});
