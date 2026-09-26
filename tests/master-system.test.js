import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const master=JSON.parse(readFileSync(new URL('../docs/3B_MASTER_SYSTEM.json',import.meta.url),'utf8'));

test('master system contains one ordered P0-P5 delivery chain with unique issue ownership',()=>{
 assert.deepEqual(master.phases.map(p=>p.id),['P0','P1','P2','P3','P4','P5']);
 assert.equal(new Set(master.phases.map(p=>p.issue)).size,6);
});

test('every phase depends only on earlier declared phases',()=>{
 const seen=new Set();
 for(const phase of master.phases){
  for(const dependency of phase.dependsOn)assert.ok(seen.has(dependency),phase.id+' depends on undeclared/later '+dependency);
  seen.add(phase.id);
 }
});

test('Passport has one canonical identity authority and no global external scope',()=>{
 assert.equal(master.identity.canonicalTable,'public.member_profiles');
 assert.equal(master.identity.publicId,'passport_public_id');
 assert.equal(master.identity.authIdPrivate,true);
 assert.equal(master.identity.noGlobalScope,true);
 assert.ok(!master.identity.externalDefaultScopes.includes('all'));
});
