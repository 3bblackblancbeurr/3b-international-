import test from 'node:test';
import assert from 'node:assert/strict';
import {cityGridPoint,cityDrawingEndpoint} from '../src/city/city3b-grid-snap.js';
import {roadDraft} from '../src/city/city3b-landscape.js';
import {cityStoredBuilding,cityBuildingLimit} from '../src/city/city3b-construction.js';

test('building origins and road nodes use the same grid, including odd and negative coordinates',()=>{
 assert.deepEqual(cityGridPoint({x:3.3,z:-7.8}),{x:3,z:-8});
 assert.deepEqual(roadDraft({x:3.3,z:-7.8},{x:26.1,z:-3.2}),[{x1:3,z1:-8,x2:26,z2:-8,width:4}]);
 assert.deepEqual(roadDraft({x:-7.6,z:3.2},{x:-4.3,z:25.2}),[{x1:-8,z1:3,x2:-8,z2:25,width:4}]);
});
test('right-angle and repeated roads join at the actual preview endpoint',()=>{
 const first=roadDraft({x:1,z:1},{x:23,z:9});
 assert.deepEqual(cityDrawingEndpoint(first),{x:23,z:1});
 const next=roadDraft(cityDrawingEndpoint(first),{x:25,z:24},first);
 assert.equal(next[0].x1,first[0].x2);assert.equal(next[0].z1,first[0].z2);
 const corner=roadDraft({x:1,z:1},{x:23,z:19},[],8,'corner');
 assert.equal(corner.length,2);assert.equal(corner[0].x2,corner[1].x1);assert.equal(corner[0].z2,corner[1].z1);
 for(const r of [...first,...next,...corner])assert.ok(r.x1===r.x2||r.z1===r.z2);
 assert.deepEqual(cityDrawingEndpoint(corner),{x:23,z:19});assert.equal(cityDrawingEndpoint([]),null);
});
test('stored unique buildings become reusable after deletion or undo, without bypassing ownership limits',()=>{
 const definition={code:'CITY_HALL_3B'},placed={id:'hall',building_code:definition.code,placement_state:'placed'};
 const data={placements:[placed]};
 assert.equal(cityStoredBuilding(data,definition),null);
 data.placements=[{...placed,placement_state:'stored'}];
 assert.equal(cityStoredBuilding(data,definition).id,'hall');
 assert.equal(cityBuildingLimit(data,definition).valid,false);
 assert.equal(cityBuildingLimit(data,definition,'hall').valid,true);
 data.placements=[placed];assert.equal(cityStoredBuilding(data,definition),null);
});
