import test from 'node:test';
import assert from 'node:assert/strict';
import {musicMasterResumeState,shouldLoopVisual} from '../src/destin/musicMasterState.js';

const manifest={nodes:[
  {id:'intro',cinema:{language:'fr'}},
  {id:'memoire',cinema:{path:'memoire'}},
  {id:'avenir',cinema:{path:'avenir'}}
]};

test('music master starts from intro before a path is chosen',()=>{
  assert.equal(musicMasterResumeState({manifest,run:{node_id:'intro',state:'playing'}}).mode,'intro');
});

test('music master resumes the already chosen path instead of replaying intro',()=>{
  assert.equal(musicMasterResumeState({manifest,run:{node_id:'memoire',state:'playing'}}).mode,'branch');
  assert.equal(musicMasterResumeState({manifest,run:{node_id:'avenir',state:'playing'}}).mode,'branch');
});

test('music master keeps completed runs on the completed screen',()=>{
  assert.equal(musicMasterResumeState({manifest,run:{node_id:'memoire',state:'complete'}}).mode,'complete');
});

test('short visual beds loop when the audio master runs longer',()=>{
  assert.equal(shouldLoopVisual(8,12,0),true);
  assert.equal(shouldLoopVisual(12,8,0),false);
  assert.equal(shouldLoopVisual(10,9,1500),true);
  assert.equal(shouldLoopVisual(NaN,9,0),false);
});
