import test from 'node:test';import assert from 'node:assert/strict';
import {AnimationClip,QuaternionKeyframeTrack} from 'three';
import {weaponAnimations} from '../src/world/weapon-animation.js';
test('weapon upper-body clips differ without moving the root or legs',()=>{
 const idle=new AnimationClip('Idle',1,['upperarm_r','lowerarm_r','spine_02','root','thigh_l'].map(n=>new QuaternionKeyframeTrack(n+'.quaternion',[0,1],[0,0,0,1,0,0,0,1])));
 const clips=weaponAnimations(idle);assert.deepEqual(clips.map(c=>c.name),['Thrust','Split','Bash','Guard']);
 for(const c of clips){assert.equal(c.duration,1);assert.ok(c.tracks.every(t=>! /root|thigh/.test(t.name)));assert.ok(c.tracks.every(t=>Array.from(t.values).every(Number.isFinite)));}
 const right=c=>Array.from(c.tracks.find(t=>t.name==='upperarm_r.quaternion').values);
 assert.notDeepEqual(right(clips[0]),right(clips[1]));assert.notDeepEqual(right(clips[0]),right(clips[2]));
 assert.deepEqual(Array.from(idle.tracks[0].values),[0,0,0,1,0,0,0,1]);
});
