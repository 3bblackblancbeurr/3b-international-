import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS_PREFERENCES_KEY,createAtlasPreferencesSession,normalizeAtlasPreferences,readAtlasPreferences,writeAtlasPreferences} from '../src/components/atlas-preferences.js';

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

function storageFixture(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
function lockFixture(){let queue=Promise.resolve();const names=[];return {names,request(name,callback){names.push(name);const next=queue.catch(()=>{}).then(callback);queue=next;return next;}};}

test('two atlas sessions keep independent favorites under the same Web Lock',async()=>{
 const storage=storageFixture(),locks=lockFixture(),a=createAtlasPreferencesSession({storage,locks}),b=createAtlasPreferencesSession({storage,locks});
 const [first,second]=await Promise.all([a.commit({type:'favorite',id:'health',selected:true}),b.commit({type:'favorite',id:'manga',selected:true})]);
 assert.equal(first.saved,true);assert.equal(second.saved,true);assert.deepEqual(new Set(readAtlasPreferences(storage).favorites),new Set(['health','manga']));assert.deepEqual(locks.names,[ATLAS_PREFERENCES_KEY,ATLAS_PREFERENCES_KEY]);
});

test('a stale realm action changes only the realm and preserves new remote favorites',async()=>{
 const storage=storageFixture(),locks=lockFixture(),a=createAtlasPreferencesSession({storage,locks}),b=createAtlasPreferencesSession({storage,locks});
 await a.commit({type:'favorite',id:'health',selected:true});await b.commit({type:'realm',id:'algerie'});
 assert.deepEqual(readAtlasPreferences(storage),{favorites:['health'],realm:'algerie'});
 await a.commit({type:'favorite',id:'manga',selected:true});assert.equal(readAtlasPreferences(storage).realm,'algerie');
});

test('explicit favorite selection is idempotent across sessions and removals are explicit',async()=>{
 const storage=storageFixture(),locks=lockFixture(),a=createAtlasPreferencesSession({storage,locks}),b=createAtlasPreferencesSession({storage,locks});
 await Promise.all([a.commit({type:'favorite',id:'health',selected:true}),b.commit({type:'favorite',id:'health',selected:true})]);
 assert.deepEqual(readAtlasPreferences(storage).favorites,['health']);
 await b.commit({type:'favorite',id:'health',selected:false});await b.commit({type:'favorite',id:'health',selected:false});assert.deepEqual(readAtlasPreferences(storage).favorites,[]);
});

test('one atlas session queues rapid actions and captures actions rather than mutable caller objects',async()=>{
 const storage=storageFixture(),locks=lockFixture(),session=createAtlasPreferencesSession({storage,locks}),action={type:'favorite',id:'health',selected:true};
 const first=session.commit(action);action.id='manga';const second=session.commit({type:'realm',id:'italie'}),third=session.commit({type:'favorite',id:'games',selected:true});
 await Promise.all([first,second,third]);assert.deepEqual(readAtlasPreferences(storage),{favorites:['health','games'],realm:'italie'});
});

test('failed writes preserve choices in memory and retry pending deltas against newer remote data',async()=>{
 const storage=storageFixture(),original=storage.setItem;let fail=true;storage.setItem=(...args)=>{if(fail)throw Error('QuotaExceededError');original(...args);};
 const session=createAtlasPreferencesSession({storage,locks:null}),first=await session.commit({type:'favorite',id:'health',selected:true});
 assert.deepEqual(first,{preferences:{favorites:['health'],realm:'france'},saved:false});assert.equal(storage.getItem(ATLAS_PREFERENCES_KEY),null);
 fail=false;writeAtlasPreferences(storage,{favorites:['manga'],realm:'maroc'});
 const retried=await session.commit({type:'realm',id:'italie'});assert.equal(retried.saved,true);assert.deepEqual(new Set(retried.preferences.favorites),new Set(['manga','health']));assert.equal(retried.preferences.realm,'italie');
});

test('inaccessible storage and rejected Web Locks do not discard queued memory choices',async()=>{
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}},session=createAtlasPreferencesSession({storage:denied,locks:null});
 assert.equal(session.loaded.saved,false);await session.commit({type:'favorite',id:'health',selected:true});const result=await session.commit({type:'realm',id:'tunisie'});assert.deepEqual(result,{preferences:{favorites:['health'],realm:'tunisie'},saved:false});
 const storage=storageFixture(),locks={request(){throw Error('lock denied');}},locked=createAtlasPreferencesSession({storage,locks});
 assert.equal((await locked.commit({type:'favorite',id:'manga',selected:true})).saved,false);locks.request=async(name,callback)=>callback();const retried=await locked.commit({type:'realm',id:'estonie'});assert.deepEqual(retried,{preferences:{favorites:['manga'],realm:'estonie'},saved:true});
});

test('corrupt JSON remains intact while the visit preserves its choices',async()=>{
 const storage=storageFixture();storage.setItem(ATLAS_PREFERENCES_KEY,'{broken');const session=createAtlasPreferencesSession({storage,locks:null});assert.equal(session.loaded.saved,false);
 const result=await session.commit({type:'favorite',id:'health',selected:true});assert.equal(result.saved,false);assert.deepEqual(result.preferences.favorites,['health']);assert.equal(storage.getItem(ATLAS_PREFERENCES_KEY),'{broken');
});

test('malformed atlas actions reject without writing or poisoning the session queue',async()=>{
 const storage=storageFixture(),session=createAtlasPreferencesSession({storage,locks:null});
 for(const action of [null,[],{}, {type:'toggle',id:'health'}, {type:'favorite',id:'unknown',selected:true}, {type:'favorite',id:'health',selected:1}, {type:'favorite',id:'health'}, {type:'realm',id:'unknown'}, {type:'realm',id:'france',selected:true}, {type:'favorite',id:'health',selected:true,snapshot:{}}])await assert.rejects(session.commit(action));
 assert.equal(storage.getItem(ATLAS_PREFERENCES_KEY),null);assert.equal((await session.commit({type:'favorite',id:'health',selected:true})).saved,true);
});

test('returned preference objects cannot mutate the session internal state',async()=>{
 const session=createAtlasPreferencesSession({storage:{getItem(){throw Error('denied');}},locks:null});session.loaded.preferences.favorites.push('manga');
 const first=await session.commit({type:'favorite',id:'health',selected:true});first.preferences.favorites.push('games');const second=await session.commit({type:'realm',id:'maroc'});assert.deepEqual(second.preferences,{favorites:['health'],realm:'maroc'});
});
