import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('member client routes public auth separately from private member API',()=>{
 const client=read('src/loyalty/client.js');
 assert.match(client,/MEMBER_AUTH_URL=.*member-auth/);
 assert.match(client,/MEMBER_API_URL=.*member-api/);
 assert.match(client,/PUBLIC_ACTIONS=new Set\(\['register','register-v2','login','recover','recover-v2','reset-request','resend-confirmation'\]\)/);
 assert.match(client,/const isPublic=PUBLIC_ACTIONS\.has\(action\)/);
 assert.match(client,/if\(!isPublic&&!session\)throw Error/);
});

test('member-api refuses public registration recovery actions behind the JWT gateway',()=>{
 const source=read('supabase/functions/member-api/index.ts');
 assert.match(source,/action==='register'\|\|action==='recover'\)throw new Failure\(404/);
 assert.match(source,/authenticate\(req\)/);
});

test('member-auth exposes only the hardened public authentication actions',()=>{
 const source=read('supabase/functions/member-auth/index.ts');
 assert.match(source,/\['register','register-v2','login','recover','recover-v2','reset-request','resend-confirmation'\]/);
 assert.doesNotMatch(source,/action==='heartbeat'/);
 assert.doesNotMatch(source,/action==='snapshot'/);
});

test('ecosystem client separates public reads from private actions',()=>{
 const source=read('src/lib/ecosystem.js');
 assert.match(source,/ECOSYSTEM_PUBLIC_URL=.*ecosystem-public/);
 assert.match(source,/ECOSYSTEM_PRIVATE_URL=.*ecosystem-private/);
 assert.match(source,/if\(!session\)throw Error/);
 assert.match(source,/Authorization:'Bearer '\+session\.access_token/);
});

test('ecosystem-public is GET-only and exposes only sports/capabilities',()=>{
 const source=read('supabase/functions/ecosystem-public/index.ts');
 assert.match(source,/req\.method!=='GET'/);
 assert.match(source,/section==='capabilities'/);
 assert.match(source,/section==='sports'/);
 assert.doesNotMatch(source,/action==='post'/);
 assert.doesNotMatch(source,/action==='chat-ai'/);
});

test('private ecosystem keeps authenticated application logic',()=>{
 const source=read('supabase/functions/ecosystem-private/index.ts');
 assert.match(source,/async function authenticate\(req:Request\)/);
 assert.match(source,/loyalty_session_valid/);
 assert.match(source,/const \{uid,client\}=await authenticate\(req\)/);
});
