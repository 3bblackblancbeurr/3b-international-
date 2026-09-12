import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,persist,load,storageKey} from '../src/world/origins/state.js';
test('a damaged primary save recovers the last valid backup for the same account',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const s=blank();s.flags.awakened=true;s.avatar.name='Samia';
 assert.equal(persist(storage,'alice',s),true);
 s.flags.met=true;assert.equal(persist(storage,'alice',s),true);
 data.set(storageKey('alice'),'{broken');
 assert.equal(load(storage,'alice').avatar.name,'Samia');
 assert.equal(load(storage,'alice').flags.awakened,true);
 assert.notEqual(load(storage,'bob').avatar.name,'Samia');
 assert.equal(persist(storage,'alice',load(storage,'alice')),true);
 assert.equal(load(storage,'alice').avatar.name,'Samia');
});
test('storage denial returns failure rather than claiming a successful save',()=>{
 const storage={getItem:()=>null,setItem:()=>{throw Error('Quota');}};
 assert.equal(persist(storage,null,blank()),false);
});
