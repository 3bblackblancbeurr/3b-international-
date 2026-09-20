import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarStorageKeys,readAvatarPortrait,writeAvatarPortrait} from '../src/world/avatar-storage.js';
const store=()=>{const items=new Map();return{getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)};};
const image='data:image/jpeg;base64,'+'A'.repeat(1600);
test('avatar drafts, presets and portraits are isolated for each account and guest',()=>{
 const a=avatarStorageKeys('account-a'),b=avatarStorageKeys('account-b'),g=avatarStorageKeys(null);
 for(const kind of ['draft','presets','portrait']){
  assert.notEqual(a[kind],b[kind]);assert.notEqual(a[kind],g[kind]);assert.notEqual(b[kind],g[kind]);
 }
});
test('Passport never loads an unscoped legacy portrait or another account artwork',()=>{
 const s=store();s.setItem('3b-passport-avatar-portrait-v1',image);
 assert.equal(readAvatarPortrait('a',s),'');
 assert.equal(writeAvatarPortrait('a',image,s),true);
 assert.equal(readAvatarPortrait('a',s),image);
 assert.equal(readAvatarPortrait('b',s),'');assert.equal(readAvatarPortrait(null,s),'');
 s.setItem(avatarStorageKeys('b').portrait,JSON.stringify({owner:'a',image}));
 assert.equal(readAvatarPortrait('b',s),'');
});
test('Passport portrait only accepts bounded local raster artwork',()=>{
 const s=store();
 for(const bad of ['https://example.invalid/other-user.jpg','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,'+'A'.repeat(2000001)])assert.equal(writeAvatarPortrait('a',bad,s),false);
 assert.equal(readAvatarPortrait('a',s),'');
 s.setItem(avatarStorageKeys('a').portrait,'{bad');assert.equal(readAvatarPortrait('a',s),'');
});
