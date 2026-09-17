import test from 'node:test';import assert from 'node:assert/strict';
import {daylightResolution} from '../src/world/daylight.js';

test('HDR environment precision follows device capability',()=>{
 assert.deepEqual(daylightResolution(2,4),{width:64,height:32});
 assert.deepEqual(daylightResolution(4,4),{width:64,height:32});
 assert.deepEqual(daylightResolution(6,6),{width:128,height:64});
 assert.deepEqual(daylightResolution(8,8),{width:256,height:128});
});
