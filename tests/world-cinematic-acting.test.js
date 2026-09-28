import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cinematicActingBeat,cinematicActingPlan} from '../src/world/cinematic-acting.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('major cinematic kinds have phased acting plans instead of a static pose',()=>{
  for(const kind of ['world-opening','story-alliance','story-restoration','guardian-intro','final-combat-intro','story-finale']){
    const plan=cinematicActingPlan(kind);
    assert.ok(plan.length>=3,kind);
    assert.equal(plan[0].at,0);
    for(let i=1;i<plan.length;i++)assert.ok(plan[i].at>plan[i-1].at,kind+' order');
  }
});

test('cinematic acting switches hero and focus actions as progress advances',()=>{
  const start=cinematicActingBeat('story-alliance',0);
  const middle=cinematicActingBeat('story-alliance',.5);
  const end=cinematicActingBeat('story-alliance',.95);
  assert.equal(start.focus,'Talk');
  assert.equal(middle.hero,'Talk');
  assert.equal(end.hero,'Idle');
  assert.notEqual(start.index,middle.index);
  assert.notEqual(middle.index,end.index);
});

test('3D scene applies acting beats once per phase and keeps premium arrival cosmetic',()=>{
  const scene=read('src/world/scene.js');
  assert.match(scene,/cinematicActingBeat/);
  assert.match(scene,/shot\.actingBeat!==acting\.index/);
  assert.match(scene,/focusActor\?\.controller\?\.action/);
  assert.match(scene,/premiumArrival/);
  assert.match(scene,/duration=Math\.max\(duration,9200\)/);
  assert.doesNotMatch(scene,/premiumArrival[^\n]{0,120}(damage|xp|reward|power)/i);
});
