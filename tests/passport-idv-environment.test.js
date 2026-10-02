import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {productionIdentityApproved} from '../shared/passport-idv-policy.js';

const approved={physical:'production',logical:'live',flowApproved:true,legalApproved:true,retentionApproved:true,minorsApproved:true,sandboxApproved:true,captchaRequired:true,passwordProtectionConfirmed:true};
test('sandbox and staging cannot confer production civil identity even with every approval flag',()=>{
 assert.equal(productionIdentityApproved(approved),true);
 for(const config of [{physical:'sandbox'},{logical:'staging'},{physical:'sandbox',logical:'staging'}])assert.equal(productionIdentityApproved({...approved,...config}),false);
 for(const field of ['flowApproved','legalApproved','retentionApproved','minorsApproved','sandboxApproved','captchaRequired','passwordProtectionConfirmed']){
  for(const value of [false,undefined,'true'])assert.equal(productionIdentityApproved({...approved,[field]:value}),false);
 }
 const edge=readFileSync(new URL('../supabase/functions/passport-idv/index.ts',import.meta.url),'utf8');
 assert.match(edge,/outcome==='accepted'&&IDNOW_APPROVED&&PRODUCTION_APPROVED/);
 assert.match(edge,/productionFlowApproved:PRODUCTION_APPROVED/);
 assert.match(edge,/PHYSICAL==='sandbox'\|\|PRODUCTION_APPROVED/);
 assert.match(edge,/body\?\.consent!==true/);
});
