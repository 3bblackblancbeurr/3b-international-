import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTELLATION_KEY, readConstellation, sanitizeConstellation, selectConstellationStar } from '../src/companion/constellation.js';

test('constellation input rejects malformed points and preserves the chosen order',()=>{
  assert.deepEqual(sanitizeConstellation([3,0,3,7,99,-1,'2',null,NaN,2]),[3,0,7,2]);
  for(const input of [null,'eight',{},8])assert.deepEqual(sanitizeConstellation(input),[]);
});
test('eight distinct touches form a bounded personal signature and duplicate touches are harmless',()=>{
  const order=[0,4,1,5,2,6,3,7];let bond=[];
  for(const id of order)bond=selectConstellationStar(bond,id);
  assert.deepEqual(bond,order);
  assert.deepEqual(selectConstellationStar(bond,7),order);
  assert.deepEqual(selectConstellationStar(bond,999),order);
});
test('the constellation survives a reload, while corrupt or unavailable storage restores a usable empty state',()=>{
  const storage={getItem:key=>key===CONSTELLATION_KEY?'[7,2,0]':null};
  assert.deepEqual(readConstellation(storage),[7,2,0]);
  assert.deepEqual(readConstellation({getItem:()=>'{broken'}),[]);
  assert.deepEqual(readConstellation({getItem(){throw Error('denied');}}),[]);
});
