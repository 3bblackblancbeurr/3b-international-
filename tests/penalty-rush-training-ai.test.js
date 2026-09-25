import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdaptiveAiShot,createTrainingMemory,predictTrainingKeeper,
  rememberKeeperMove,rememberTrainingShot,
} from '../src/games/penaltyRush/training-ai.js';

test('training keeper learns repeated shot side without reading perfectly',()=>{
  let memory=createTrainingMemory();
  memory=rememberTrainingShot(memory,{targetX:.8,targetY:.6,power:.8,curve:0},'goal');
  memory=rememberTrainingShot(memory,{targetX:.7,targetY:.5,power:.75,curve:0},'goal');
  const learned=predictTrainingKeeper(memory,{targetX:.75,curve:0},8);
  const fresh=predictTrainingKeeper(createTrainingMemory(),{targetX:.75,curve:0},8);
  assert.ok(learned>fresh);
  assert.ok(learned<=.94);
});

test('training shooter counters repeated keeper bias and stays in frame',()=>{
  let memory=createTrainingMemory();
  for(let i=0;i<5;i++)memory=rememberKeeperMove(memory,.8);
  const shot=createAdaptiveAiShot(memory,3);
  assert.ok(shot.targetX<.86);
  assert.ok(Math.abs(shot.targetX)<=.94);
  assert.ok(shot.targetY>=.2&&shot.targetY<=.88);
  assert.ok(shot.power>=.48&&shot.power<=.94);
});
