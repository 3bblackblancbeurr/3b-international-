import test from 'node:test';
import assert from 'node:assert/strict';
import {readOptionalRows} from '../supabase/functions/member-api/optional-resource.js';
test('optional member reads distinguish a real empty inventory from network and malformed responses',async()=>{
 assert.deepEqual(await readOptionalRows(async()=>[]),[]);
 assert.deepEqual(await readOptionalRows(async()=>[{item_code:'coat',quantity:1}]),[{item_code:'coat',quantity:1}]);
 assert.equal(await readOptionalRows(async()=>{throw Error('offline');}),null);
 assert.equal(await readOptionalRows(async()=>({error:'unavailable'})),null);
});
