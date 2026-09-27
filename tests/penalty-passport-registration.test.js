import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const source=fs.readFileSync(new URL('../supabase/functions/penalty-rush/index.ts',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('async function memberProfile'),source.indexOf('function sanitizeColor'))
  +source.slice(source.indexOf('async function ensureProfile'),source.indexOf('async function saveProfile'));
const passport='12345678-1234-4234-8234-123456789abc';
function fixture(member) {
 const writes=[];
 const context=vm.createContext({UUID:/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
  Failure:class extends Error {constructor(status,message){super(message);this.status=status;}},
  COUNTRY_FROM_NAME:{France:'fr'},sanitizeKit:()=>({}),sanitizeBoots:()=>({}),
  admin:async(path,options)=>{
   if(path.startsWith('/rest/v1/member_profiles?'))return [member];
   if(!options)return [];
   // Mirror the production NOT NULL/FK requirement, using only the trusted member.
   assert.equal(options.body.passport_public_id,passport);
   writes.push(options.body);
   return [options.body];
  }});
 vm.runInContext(stripTypeScriptTypes(functions),context);
 return {create:()=>context.ensureProfile('account-id'),writes};
}
test('first player registration links the trusted Passport without publishing civil identity',async()=>{
 const f=fixture({handle:'JoueurTest',name:'Private Civil Name',country:'France',passport_state:'active',passport_public_id:passport});
 const row=await f.create();
 assert.equal(row.passport_public_id,passport);
 assert.equal(row.display_name,'JoueurTest');
 assert.equal(row.identity_status,'passport');
 assert.equal(f.writes.length,1);
 const publicFunction=source.slice(source.indexOf('function publicProfile'),source.indexOf('async function ensureProfile'));
 assert.doesNotMatch(publicFunction,/passport_public_id/);
});
test('missing or inactive Passport blocks creation before any write',async()=>{
 for(const member of [{passport_state:'active'},{passport_state:'revoked',passport_public_id:passport}]) {
  const f=fixture(member);
  await assert.rejects(f.create(),error=>error.status===403);
  assert.equal(f.writes.length,0);
 }
});
