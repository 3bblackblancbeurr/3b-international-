import test from 'node:test';import assert from 'node:assert/strict';
import {surfaceAnisotropy} from '../src/world/surfaces.js';

test('procedural surfaces reduce anisotropy on weak phones',()=>{
 assert.equal(surfaceAnisotropy(2,4),2);
 assert.equal(surfaceAnisotropy(4,4),2);
 assert.equal(surfaceAnisotropy(6,6),4);
 assert.equal(surfaceAnisotropy(8,8),4);
});
