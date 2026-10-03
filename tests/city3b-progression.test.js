import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_MAX_LEVEL,cityLevelFloor,municipalLevelProgress} from '../src/city/city3b-progression.js';
test('100 levels preserve existing thresholds and gradually lengthen the second half',()=>{
 assert.equal(CITY_MAX_LEVEL,100);
 for(let n=1;n<=100;n++){
  const floor=cityLevelFloor(n);
  assert.equal(municipalLevelProgress(floor).level,n);
  if(n>1)assert.equal(municipalLevelProgress(floor-1).level,n-1);
  if(n<=50)assert.equal(floor,(n-1)*1000);
  if(n>51)assert.ok(floor-cityLevelFloor(n-1)>cityLevelFloor(n-1)-cityLevelFloor(n-2));
 }
 assert.equal(cityLevelFloor(100),201000);
 assert.equal(municipalLevelProgress(Infinity).level,1);
 assert.equal(municipalLevelProgress(300000).percent,100);
});
