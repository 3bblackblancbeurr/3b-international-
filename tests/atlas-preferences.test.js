import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS_PREFERENCES_KEY,normalizeAtlasPreferences,readAtlasPreferences,writeAtlasPreferences} from '../src/components/atlas-preferences.js';

test('atlas restores only known module ids and narrative realms',()=>{
 assert.deepEqual(normalizeAtlasPreferences({favorites:['health','health','finance','unknown',null],realm:'maroc'}),{favorites:['health','finance'],realm:'maroc'});
 assert.deepEqual(normalizeAtlasPreferences({favorites:'health',realm:'unknown'}),{favorites:[],realm:'france'});
});
test('atlas survives corrupt or inaccessible storage',()=>{
 assert.deepEqual(readAtlasPreferences({getItem:()=>'{broken'}),{favorites:[],realm:'france'});
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('full');}};
 assert.deepEqual(readAtlasPreferences(denied),{favorites:[],realm:'france'});
 assert.equal(writeAtlasPreferences(denied,{favorites:['health']}),false);
});
test('atlas favorites and selected realm persist with a constrained schema',()=>{
 const data=new Map();const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 assert.equal(writeAtlasPreferences(storage,{favorites:['games'],realm:'italie',untrusted:'discard'}),true);
 assert.deepEqual(JSON.parse(data.get(ATLAS_PREFERENCES_KEY)),{favorites:['games'],realm:'italie'});
 assert.deepEqual(readAtlasPreferences(storage),{favorites:['games'],realm:'italie'});
});
