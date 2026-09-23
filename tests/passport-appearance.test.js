import test from 'node:test';
import assert from 'node:assert/strict';
import {appearanceFromSnapshot,cleanInitials,createAppearanceStore,isDirectorPortraitIdentity,normalizeAppearance} from '../src/passport/appearance-store.js';

const alice={userId:'alice',name:'Alice Martin'},bob={userId:'bob',name:'Benoît Petit'};
const director={userId:'director',name:'3B',public_verified:true,public_badge_key:'director_founder'};
const photo='data:image/jpeg;base64,YWJj';
function fixture(){
 const values=new Map(),events=new EventTarget();
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const store=createAppearanceStore({getStorage:()=>storage,getEvents:()=>events});
 return {store,values,events,storage,appearance:identity=>appearanceFromSnapshot(store.readSnapshot(identity),identity)};
}

test('account switching and logout read only the current holder portrait',()=>{
 const {store,appearance}=fixture();
 assert.equal(store.update(alice,{mode:'photo',photo,initials:'AL'}),true);
 assert.deepEqual(appearance(alice),{mode:'photo',photo,initials:'AL'});
 assert.deepEqual(appearance(bob),{mode:'initials',photo:'',initials:'BP'});
 assert.deepEqual(appearance(null),{mode:'initials',photo:'',initials:'3B'});
 assert.equal(store.update(null,{photo}),false);
 assert.equal(appearance(alice).photo,photo);
});

test('all portraits of the same account are notified once after successful persistence',()=>{
 const {store,appearance}=fixture();
 const seen=[];
 const stop=store.subscribe(alice,()=>seen.push(appearance(alice).mode));
 const stopOther=store.subscribe(bob,()=>assert.fail('Another account was notified'));
 store.update(alice,{mode:'digital'});
 assert.deepEqual(seen,['digital']);
 stop();stopOther();
 store.update(alice,{mode:'initials'});
 assert.deepEqual(seen,['digital']);
});

test('updates from separate editors merge with the latest persisted appearance',()=>{
 const {store,appearance}=fixture();
 store.update(alice,{initials:'ABC'});
 store.update(alice,current=>({...current,mode:'digital'}));
 assert.deepEqual(appearance(alice),{mode:'digital',initials:'ABC',photo:''});
});

test('quota failures report failure and preserve the saved portrait without a false notification',()=>{
 const {store,appearance,storage}=fixture();
 store.update(alice,{mode:'digital'});
 store.subscribe(alice,()=>assert.fail('A failed write must not announce success'));
 storage.setItem=()=>{throw new Error('QuotaExceededError');};
 assert.equal(store.update(alice,{mode:'photo',photo}),false);
 assert.equal(appearance(alice).mode,'digital');
});

test('disabled or missing browser storage is safe for read, subscribe and save',()=>{
 for(const getStorage of [()=>undefined,()=>{throw new Error('SecurityError');}]){
  const store=createAppearanceStore({getStorage,getEvents:()=>undefined});
  assert.equal(store.readSnapshot(alice),null);
  assert.equal(store.update(alice,{mode:'digital'}),false);
  store.subscribe(alice,()=>{})();
 }
});

test('clearing storage in another tab refreshes portraits and unrelated changes do not',()=>{
 const {store,values,events,storage,appearance}=fixture();
 store.update(alice,{mode:'photo',photo});
 const seen=[];
 const stop=store.subscribe(alice,()=>seen.push(appearance(alice).mode));
 const dispatch=(key,storageArea=storage)=>events.dispatchEvent(Object.assign(new Event('storage'),{key,storageArea}));
 dispatch('another-key');
 dispatch(null,{});
 assert.deepEqual(seen,[]);
 values.clear();dispatch(null);
 assert.deepEqual(seen,['initials']);
 stop();dispatch(null);
 assert.deepEqual(seen,['initials']);
});

test('corrupt stored data and external image URLs cannot replace the default portrait',()=>{
 for(const snapshot of ['{','null','false','42','[]'])assert.deepEqual(appearanceFromSnapshot(snapshot,alice),{mode:'initials',initials:'AM',photo:''});
 for(const source of ['https://example.com/photo.jpg','data:image/svg+xml;base64,YWJj','data:image/jpeg;base64,<bad>','data:image/jpeg;base64,'+'A'.repeat(2*1024*1024)]){
  assert.equal(normalizeAppearance({mode:'photo',photo:source},alice).photo,'');
 }
 assert.equal(normalizeAppearance({photo},alice).photo,photo);
});

test('initials keep complete Unicode characters and remain at most four after uppercase expansion',()=>{
 assert.equal(cleanInitials(' a-b 12! '),'AB12');
 assert.equal(cleanInitials('ßßßß'),'SSSS');
 assert.equal([...cleanInitials('𐐀𐐁𐐂𐐃𐐄')].length,4);
 assert.equal(appearanceFromSnapshot(null,{...alice,name:'Alice Dupont'}).initials,'AD');
});

test('Matrix portrait requires an identified and strictly verified official director badge',()=>{
 assert.equal(isDirectorPortraitIdentity(director),true);
 for(const identity of [null,alice,{...director,userId:''},{...director,public_verified:false},{...director,public_verified:'true'},
  {...director,public_verified:1},{...director,public_badge_key:'director'},{...director,public_badge_key:'DIRECTOR_FOUNDER'},
  {...alice,name:'3B',public_title:'DIRECTEUR · FONDATEUR 3B'},{...alice,public_verified:true},
  {...alice,public_badge_key:'director_founder'}]){
  assert.equal(isDirectorPortraitIdentity(identity),false);
  assert.equal(normalizeAppearance({mode:'matrix'},identity).mode,'initials');
 }
});

test('verified director defaults to Matrix and upgrades the digital mode while preserving explicit alternatives',()=>{
 for(const snapshot of [null,'null','{','{}','{"mode":"unknown"}','{"mode":"digital"}','{"mode":"matrix"}']){
  assert.equal(appearanceFromSnapshot(snapshot,director).mode,'matrix');
 }
 for(const mode of ['initials','name','photo']){
  assert.deepEqual(normalizeAppearance({mode,photo,initials:'3B'},director),{mode,photo,initials:'3B'});
 }
 for(const mode of ['initials','name','photo','digital'])assert.equal(normalizeAppearance({mode},alice).mode,mode);
 assert.equal(normalizeAppearance(null,alice).mode,'initials');
});

test('local appearance metadata cannot grant Matrix to another member',()=>{
 const {store,appearance,values}=fixture();
 const forged={mode:'matrix',photo,public_verified:true,public_badge_key:'director_founder',userId:'director'};
 values.set('3b-passport-appearance-v1:alice',JSON.stringify(forged));
 assert.equal(appearance(alice).mode,'initials');
 assert.equal(store.update(alice,forged),true);
 assert.deepEqual(appearance(alice),{mode:'initials',initials:'AM',photo});
 assert.equal(JSON.parse(store.readSnapshot(alice)).mode,'initials');
});

test('Matrix respects badge revocation on the same account without losing its private photo',()=>{
 const {store,appearance}=fixture();
 store.update(director,{mode:'photo',photo});
 store.update(director,{mode:'matrix'});
 assert.deepEqual(appearance(director),{mode:'matrix',initials:'3B',photo});
 for(const revoked of [{...director,public_verified:false},{...director,public_badge_key:''}]){
  assert.deepEqual(appearance(revoked),{mode:'initials',initials:'3B',photo});
 }
 store.update({...director,public_verified:false},{mode:'matrix'});
 assert.deepEqual(JSON.parse(store.readSnapshot(director)),{mode:'initials',initials:'3B',photo});
});

test('Matrix keeps existing photos when changing modes and applies the same local image validation',()=>{
 const {store,appearance}=fixture();
 store.update(director,{mode:'photo',photo});
 for(const mode of ['matrix','initials','digital','photo']){
  store.update(director,{mode});
  assert.equal(appearance(director).photo,photo);
 }
 for(const invalid of ['https://example.com/photo.jpg','data:image/svg+xml;base64,YWJj','data:image/jpeg;base64,<bad>']){
  assert.deepEqual(normalizeAppearance({mode:'matrix',photo:invalid},director),{mode:'matrix',initials:'3B',photo:''});
 }
});
