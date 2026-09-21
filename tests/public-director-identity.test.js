import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('director founder identity is unique, display-only and seeded server-side',()=>{
 const sql=read('supabase/migrations/20260921194045_public_director_identity_v1.sql');
 assert.match(sql,/member_profiles_director_founder_unique/);
 assert.match(sql,/community_profiles_director_founder_unique/);
 assert.match(sql,/public_badge_key='director_founder'/);
 assert.match(sql,/public_title='DIRECTEUR · FONDATEUR 3B'/);
 assert.match(sql,/public_verified=true/);
 assert.match(sql,/Display-only official identity marker\. Never use for authorization/);
});

test('community profile updates mirror official identity from member profile only',()=>{
 const source=read('supabase/functions/ecosystem-private/index.ts');
 assert.match(source,/select\('handle,name,public_badge_key,public_title,public_verified'\)/);
 assert.match(source,/public_badge_key:member\.public_badge_key/);
 assert.match(source,/public_title:member\.public_title/);
 assert.match(source,/public_verified:member\.public_verified===true/);
 assert.doesNotMatch(source,/body\.public_badge_key|body\.public_title|body\.public_verified/);
});

test('community snapshots propagate official identity to post authors and chat',()=>{
 const source=read('supabase/functions/ecosystem-private/index.ts');
 assert.match(source,/user_id,name,handle,kind,public_badge_key,public_title,public_verified/);
 assert.match(source,/user_id,name,handle,public_badge_key,public_title,public_verified/);
});

test('member snapshots expose display-only public identity',()=>{
 for(const path of ['supabase/functions/member-api/index.ts','supabase/functions/member-hub/index.ts']){
  const source=read(path);
  assert.match(source,/public_badge_key,public_title,public_verified/);
 }
});

test('UI renders one reusable official identity badge across account and community',()=>{
 const component=read('src/components/PublicIdentityBadge.jsx');
 const community=read('src/community/CommunityPage.jsx');
 const account=read('src/loyalty/AccountPage.jsx');
 assert.match(component,/DIRECTOR|director_founder/i);
 assert.match(component,/public_verified/);
 assert.match(component,/profile\.public_title/);
 assert.match(community,/PublicIdentityBadge/);
 assert.match(account,/PublicIdentityBadge/);
 assert.ok((community.match(/<PublicIdentityBadge/g)||[]).length>=4);
});
