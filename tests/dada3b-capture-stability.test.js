import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STABLE,createMatch,rollTurn,movePiece} from '../src/games/dada3b/engine.js';

const three=readFileSync(new URL('../src/games/Dada3BThree.jsx',import.meta.url),'utf8');

test('capture sends the eaten piece back to the stable in the rules engine',()=>{
  const match=createMatch([
    {countryId:'fr',type:'human',name:'France'},
    {countryId:'dz',type:'human',name:'Algérie'},
  ],{safeCells:true,barricades:true,captureRequired:false,piecesPerPlayer:4,timerSeconds:0});
  match.players[0].pieces[0].steps=4;  // France global cell 4
  match.players[1].pieces[0].steps=61; // Algérie global cell 5
  const rolled=rollTurn(match,1);
  assert.deepEqual(rolled.match.pendingMoves,[0]);
  const result=movePiece(rolled.match,0);
  assert.equal(result.match.players[1].pieces[0].steps,STABLE);
  assert.equal(result.event.captured.length,1);
  assert.equal(result.event.captured[0].countryId,'dz');
  assert.equal(result.event.captured[0].pieceIndex,0);
  assert.equal(result.event.landing,5);
});

test('capture rendering uses a bounded return-to-stable animation',()=>{
  assert.match(three,/group\.userData\.captureReturn=\{from:group\.position\.clone\(\),to:target\.clone\(\),startedAt:actionAt\+120,duration:520\}/);
  assert.match(three,/group\.position\.lerpVectors\(captureReturn\.from,captureReturn\.to,k\)/);
  assert.match(three,/data\.captureReturn=null/);
  assert.match(three,/pieceWorldPosition\(country,STABLE,captured\.pieceIndex\)/);
});

test('board effects are no longer rebuilt on every motion frame',()=>{
  assert.match(three,/updateBoardState\(runtime,match,loadout,legal\);\},\[match,legal,loadout\]\)/);
  assert.match(three,/updatePieces\(runtime,match,legal,motion,cosmeticsByCountry,loadout\);\},\[match,motion,legal,cosmeticsByCountry,loadout\]\)/);
});

test('temporary WebGL loss does not immediately downgrade to 2.5D',()=>{
  assert.match(three,/webglcontextrestored/);
  assert.match(three,/runtime\.contextLost=true/);
  assert.match(three,/setTimeout\(\(\)=>\{if\(runtime\.contextLost&&!runtime\.disposed\)onUnsupported/);
  assert.match(three,/if\(!runtime\.contextLost\)renderer\.render/);
});

test('capture FX failure is isolated from the game renderer',()=>{
  assert.match(three,/if\(!runtime\|\|!blast\)return;\n  try\{/);
  assert.match(three,/catch\{\n   runtime\.cameraShakeUntil=0;/);
});
