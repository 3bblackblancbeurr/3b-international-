import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMPANION_POSE_ACTIONS } from '../src/companion/companion-pose.js';
import { COMPANION_ORIGINAL_ART, COMPANION_ART_ATLASES, COUTURE_JOINT_BANDS, companionArtFrame, companionArtSources, companionGaitPhase, computeCoutureMotion, coutureFramePolicy, coutureJointMatrices, coutureTransitionDuration } from '../src/companion/companion-art.js';

const ready = { actions:true, walk:true, dance:true };

test('every pose falls back to the original approved character until its own asset loads', () => {
  for (const action of [...COMPANION_POSE_ACTIONS,'unknown']) {
    assert.equal(companionArtFrame({ action }).source, COMPANION_ORIGINAL_ART, action);
  }
  assert.equal(companionArtFrame({ action:'walk',ready:{actions:true} }).atlas,'original');
  assert.equal(companionArtFrame({ action:'dance',ready:{actions:true} }).atlas,'actions');
  assert.deepEqual(companionArtSources('idle'),[],'idle does not download an unused pose atlas');
});

test('measured alpha rectangles stay inside the delivered PNGs and preserve source aspect ratio', () => {
  for (const atlas of Object.values(COMPANION_ART_ATLASES)) {
    const bytes = readFileSync(new URL(`../public${atlas.src}`,import.meta.url));
    assert.equal(bytes.readUInt32BE(16),atlas.width);
    assert.equal(bytes.readUInt32BE(20),atlas.height);
    assert.equal(bytes[25],6,'the delivered PNG retains RGBA transparency');
    assert.equal(atlas.frames.length,8);
    for (const [x,y,w,h] of atlas.frames) {
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0);
      assert.ok(x+w <= atlas.width && y+h <= atlas.height);
    }
  }
  for (const action of COMPANION_POSE_ACTIONS) {
    const frame = companionArtFrame({action,ready});
    assert.ok(Math.abs(frame.crop[2]/frame.crop[3]-frame.target[2]/frame.target[3])<1e-9);
  }
});

test('walking uses distinct authored left and right cycles; dance and breakdance stay separate', () => {
  const right = new Set(Array.from({length:4},(_,i)=>companionArtFrame({action:'walk',time:i/7+.025,facing:1,ready}).index));
  const left = new Set(Array.from({length:4},(_,i)=>companionArtFrame({action:'walk',time:i/7+.025,facing:-1,ready}).index));
  assert.deepEqual([...right],[0,1,2,3]);
  assert.deepEqual([...left],[4,5,6,7]);
  const dance = new Set(Array.from({length:4},(_,i)=>companionArtFrame({action:'dance',time:i*.2+.025,ready}).index));
  const breaking = new Set(Array.from({length:4},(_,i)=>companionArtFrame({action:'breakdance',time:i*.25+.025,ready}).index));
  assert.deepEqual([...dance],[0,1,2,3]);
  assert.deepEqual([...breaking],[4,5,6,7]);
});

test('seated poses stay anatomically smaller and hanging grips remain aligned with the stage', () => {
  const hello = companionArtFrame({action:'hello',ready});
  const seated = companionArtFrame({action:'rest',ready});
  assert.ok(seated.target[3] < hello.target[3]*.8);
  assert.ok(seated.target[1] > hello.target[1]);
  assert.equal(seated.target[1]+seated.target[3],hello.target[1]+hello.target[3]);
  const hanging = companionArtFrame({action:'hang',ready});
  const grip = (hanging.target[1]+4*2.3)/1536;
  assert.ok(grip > .19 && grip < .22);
  assert.equal(companionArtFrame({action:'land',time:1,ready}).atlas,'original');
});

test('standing reactions and every walking phase retain the original head and sole calibration', () => {
  for (const action of ['hello','highfive','think','walk']) for (const facing of [-1,1]) for (const time of [0,.16,.3,.45]) {
    const frame = companionArtFrame({action,facing,time,ready});
    const scale = frame.target[3]/frame.crop[3];
    const head = frame.target[1]+3*scale;
    const sole = frame.target[1]+frame.target[3]-3*scale;
    assert.ok(Math.abs(head-9)<4,`${action} head moved`);
    assert.ok(Math.abs(sole-1521)<4,`${action} sole moved`);
  }
});

test('motion stays finite for invalid inputs and never mirrors the 3B lettering', () => {
  for (const action of COMPANION_POSE_ACTIONS) for (const time of [NaN,Infinity,-3,0,.25,12,999999]) {
    for (const facing of [-1,1]) {
      const sample = computeCoutureMotion({action,time,facing,gazeX:Infinity,gazeY:NaN,speaking:true});
      assert.ok(Object.values(sample).every(Number.isFinite));
      assert.ok(sample.scaleX > 0 && sample.scaleY > 0);
      assert.ok(Math.abs(sample.rotation) < 5);
      assert.ok(companionArtFrame({action,time,ready}).crop.every(Number.isFinite));
    }
  }
});

test('reduced motion is identical at every time and hidden or inactive avatars never schedule animation', () => {
  for (const action of COMPANION_POSE_ACTIONS) {
    assert.deepEqual(computeCoutureMotion({action,time:1,reduced:true}),computeCoutureMotion({action,time:100,reduced:true}));
    assert.deepEqual(companionArtFrame({action,time:1,reduced:true,ready}),companionArtFrame({action,time:100,reduced:true,ready}));
  }
  for (const options of [{active:false},{visible:false},{reduced:true}]) assert.equal(coutureFramePolicy(options).animate,false);
  assert.equal(coutureFramePolicy({action:'walk',size:112}).fps,60);
  assert.ok(coutureFramePolicy({action:'idle',size:112}).fps <= 24,'quiet presence keeps a smaller frame budget');
});

test('walking follows travelled distance, stays still when held and keeps the head centred in every phase', () => {
  for (const facing of [-1,1]) for (let step = 0; step < 4; step++) {
    const gait = companionGaitPhase({ distance:step*14+.1 },112);
    const frame = companionArtFrame({ action:'walk',time:50,facing,ready,gait });
    assert.equal(frame.index,step+(facing < 0 ? 4 : 0));
    const scale = frame.target[2]/frame.crop[2];
    const head = frame.target[0]+COMPANION_ART_ATLASES.walk.anchors[frame.index]*scale;
    assert.ok(Math.abs(head-(facing < 0 ? 482 : 542)) < 1e-8);
    assert.deepEqual(frame,companionArtFrame({ action:'walk',time:500,facing,ready,gait }),'waiting or dragging cannot advance the feet');
  }
  assert.equal(companionGaitPhase(undefined),undefined,'the panel uses its demonstration clock');
  assert.equal(companionGaitPhase({distance:Infinity}),undefined);
  assert.equal(companionGaitPhase({distance:-12}),0);
});

test('local head and chest motion joins every band without tears while both shoes remain planted', () => {
  const samples = [computeCoutureMotion({ time:2,gazeX:1,gazeY:-1,speaking:true }),
    {headDrift:24,headLift:-12,torsoDrift:-12,torsoLift:12},
    {headDrift:NaN,headLift:Infinity,torsoDrift:-Infinity,torsoLift:NaN}];
  const transform = (matrix,x,y) => [matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]];
  for (const sample of samples) {
    const matrices = coutureJointMatrices(sample);
    assert.ok(matrices.flat().every(Number.isFinite));
    for (let index = 1; index < matrices.length; index++) for (const x of [0,512,1024]) {
      const above = transform(matrices[index-1],x,COUTURE_JOINT_BANDS[index]);
      const below = transform(matrices[index],x,COUTURE_JOINT_BANDS[index]);
      assert.ok(Math.hypot(above[0]-below[0],above[1]-below[1]) < 1e-8,'shared vertices must coincide');
    }
    assert.deepEqual(transform(matrices.at(-1),512,1536),[512,1536]);
    assert.ok(matrices.every(matrix => matrix[0]*matrix[3]-matrix[1]*matrix[2] > 0),'no flipped or collapsed band');
  }
  const moving = coutureJointMatrices(samples[0]);
  assert.notDeepEqual(moving[0],moving.at(-1),'the head moves independently of the shoes');
  assert.ok(coutureJointMatrices(samples[0],0).every(matrix => matrix.every((value,index) => value === [1,0,0,1,0,0][index])));
});

test('pose blending is brief, while reduced motion and inactive presentation change pose immediately', () => {
  const original = companionArtFrame();
  const walkA = companionArtFrame({action:'walk',ready,time:0});
  const walkB = companionArtFrame({action:'walk',ready,time:.2});
  assert.ok(coutureTransitionDuration(walkA,walkB) > 0);
  assert.ok(coutureTransitionDuration(walkA,walkB) < 1/7,'a walking blend completes before the next authored pose');
  assert.ok(coutureTransitionDuration(original,walkA) <= .2);
  assert.equal(coutureTransitionDuration(walkA,walkA),0);
  assert.equal(coutureTransitionDuration(original,walkA,{reduced:true}),0);
  assert.equal(coutureTransitionDuration(original,walkA,{active:false}),0);
});
