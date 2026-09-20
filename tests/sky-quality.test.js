import test from 'node:test';import assert from 'node:assert/strict';
import {skyCloudOctaves} from '../src/world/sky.js';

test('cinematic sky reduces cloud shader cost on weaker phones',()=>{
 assert.equal(skyCloudOctaves(2,4),2);
 assert.equal(skyCloudOctaves(4,4),2);
 assert.equal(skyCloudOctaves(6,6),4);
 assert.equal(skyCloudOctaves(8,8),4);
});
