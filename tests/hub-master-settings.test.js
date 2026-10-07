import test from 'node:test';
import assert from 'node:assert/strict';
import {assignControlKey,controlProfile,controlBindingConflicts,loadControlBindings,defaultControlBindings} from '../src/world/control-bindings.js';
import {savePresentation} from '../src/world/hub/save-presentation.js';

test('keyboard reassignment rejects aliases held by another action without changing controls',()=>{
 const original=defaultControlBindings();const result=assignControlKey(original,'interact','w');assert.equal(result.conflict,'moveForward');assert.deepEqual(result.bindings,original);
 const valid=assignControlKey(original,'interact','f');assert.equal(valid.conflict,undefined);assert.deepEqual(valid.bindings.interact,['f']);assert.deepEqual(original.interact,['e']);
 for(const profile of ['default','azerty','qwerty'])assert.deepEqual(controlBindingConflicts(controlProfile(profile)),[]);
});

test('old ambiguous bindings recover playable defaults and valid custom bindings survive',()=>{
 const bad={...defaultControlBindings(),interact:['z']};assert.deepEqual(loadControlBindings({getItem:()=>JSON.stringify(bad)}),defaultControlBindings());
 const good=assignControlKey(defaultControlBindings(),'interact','f').bindings;assert.deepEqual(loadControlBindings({getItem:()=>JSON.stringify(good)}),good);
});

test('save guidance never promises an absent local backup and distinguishes account from guest',()=>{
 const offline=savePresentation({scope:'account',outcome:'offline',hasLocalCopy:false,pendingCount:0});assert.match(offline.detail,/Aucune copie/);assert.equal(offline.needsAttention,true);
 const backed=savePresentation({scope:'account',outcome:'offline',hasLocalCopy:true,pendingCount:2});assert.match(backed.detail,/copie locale reste/);assert.equal(backed.pendingCount,2);
 const guest=savePresentation({scope:'device',outcome:'local'});assert.match(guest.detail,/navigateur/);assert.equal(guest.tone,'success');
 const quota=savePresentation({outcome:'storage'});assert.match(quota.detail,/avant de fermer/);assert.equal(quota.tone,'error');
});
