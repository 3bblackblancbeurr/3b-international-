import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {avatarDraftKey,clearAvatarDraft,readAvatarDraft,writeAvatarDraft} from '../src/world/avatar-draft-store.js';

const baseAvatar=(name,created=true)=>({name,created});
function fixture(){
 const values=new Map();
 return {
  values,
  storage:{
   getItem:key=>values.get(key)??null,
   setItem:(key,value)=>values.set(key,value),
   removeItem:key=>values.delete(key),
  },
 };
}

test('avatar drafts use distinct account-scoped keys and restore only their owner',()=>{
 const {storage}=fixture();
 assert.notEqual(avatarDraftKey('alice'),avatarDraftKey('bob'));
 assert.equal(writeAvatarDraft('alice',{name:'Alice Brouillon',created:true},storage),true);
 assert.equal(writeAvatarDraft('bob',{name:'Bob Brouillon',created:true},storage),true);

 const alice=readAvatarDraft('alice',baseAvatar('Alice Enregistré'),storage);
 const bob=readAvatarDraft('bob',baseAvatar('Bob Enregistré'),storage);
 assert.equal(alice.recovered,true);
 assert.equal(alice.avatar.name,'Alice Brouillon');
 assert.equal(alice.avatar.created,true);
 assert.equal(bob.recovered,true);
 assert.equal(bob.avatar.name,'Bob Brouillon');
 assert.equal(bob.avatar.created,true);
});

test('guest, corrupt and wrong-owner drafts cannot cross an account boundary',()=>{
 const {values,storage}=fixture();
 assert.equal(avatarDraftKey(null),null);
 assert.equal(writeAvatarDraft(null,{name:'Invité'},storage),false);
 assert.equal(values.size,0);

 values.set(avatarDraftKey('alice'),'{');
 assert.equal(readAvatarDraft('alice',baseAvatar('Alice'),storage).recovered,false);

 values.set(avatarDraftKey('alice'),JSON.stringify({owner:'bob',avatar:{name:'Bob injecté'}}));
 const alice=readAvatarDraft('alice',baseAvatar('Alice'),storage);
 assert.equal(alice.recovered,false);
 assert.equal(alice.avatar.name,'Alice');
});

test('clearing one account draft never removes another account draft',()=>{
 const {values,storage}=fixture();
 writeAvatarDraft('alice',{name:'Alice'},storage);
 writeAvatarDraft('bob',{name:'Bob'},storage);
 assert.equal(clearAvatarDraft('alice',storage),true);
 assert.equal(values.has(avatarDraftKey('alice')),false);
 assert.equal(values.has(avatarDraftKey('bob')),true);
 assert.equal(readAvatarDraft('bob',baseAvatar('Bob Enregistré'),storage).recovered,true);
});

test('World 3B passes the account uid to the avatar editor and clears drafts only after a successful save',()=>{
 const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
 const panel=readFileSync(new URL('../src/world/AvatarPanel.jsx',import.meta.url),'utf8');
 assert.match(world,/<AvatarPanel key=\{uid\|\|'guest'\} uid=\{uid\|\|null\}/);
 assert.match(panel,/readAvatarDraft\(uid,savedAvatar\)/);
 assert.match(panel,/writeAvatarDraft\(uid,draft\)/);
 assert.match(panel,/if\(result\)\{committed\.current=true;clearAvatarDraft\(uid\)/);
 assert.doesNotMatch(panel,/3b-avatar-draft-v[0-9]+(?!.*uid)/);
});
