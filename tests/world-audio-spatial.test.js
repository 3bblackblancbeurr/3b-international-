import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialAudio} from '../src/world/audio-spatial.js';
import {AUDIO_STATES,audioStateProfile} from '../src/world/audio-director.js';

test('spatial audio pans left/right relative to listener heading and attenuates distance',()=>{
 const listener={x:0,z:0,heading:0};
 const right=spatialAudio(listener,{x:10,z:0},40),left=spatialAudio(listener,{x:-10,z:0},40),far=spatialAudio(listener,{x:0,z:39},40);
 assert.ok(right.pan>0);
 assert.ok(left.pan<0);
 assert.ok(right.gain>far.gain);
 assert.ok(right.gain<=1&&right.gain>=0);
});

test('spatial audio rotates with listener heading',()=>{
 const east=spatialAudio({x:0,z:0,heading:90},{x:10,z:0},40);
 assert.ok(Math.abs(east.pan)<.001);
});

test('audio director raises combat and guardian intensity without invalid profiles',()=>{
 assert.ok(AUDIO_STATES.combat.music>AUDIO_STATES.exploration.music);
 assert.ok(AUDIO_STATES.guardian.music>AUDIO_STATES.combat.music);
 assert.equal(audioStateProfile('invalid'),AUDIO_STATES.exploration);
});
