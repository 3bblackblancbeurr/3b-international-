import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('director identity migration is display-only and unique',()=>{
 const sql=read('supabase/migrations/20260921194045_public_director_identity_v1.sql');
 assert.match(sql,/public_badge_key='director_founder'/);
 assert.match(sql,/public_title='DIRECTEUR · FONDATEUR 3B'/);
 assert.match(sql,/public_verified=true/);
 assert.match(sql,/Display-only official identity marker\. Never use for authorization\./);
 assert.match(sql,/member_profiles_director_founder_unique/);
 assert.match(sql,/community_profiles_director_founder_unique/);
 assert.doesNotMatch(sql,/insert into public\.community_staff/i);
 assert.doesNotMatch(sql,/update public\.community_staff/i);
 assert.doesNotMatch(sql,/control_center/i);
});

test('migration manifest tracks the public director identity migration',()=>{
 const manifest=JSON.parse(read('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json'));
 assert.equal(manifest.count,manifest.migrations.length);
 const row=manifest.migrations.find(item=>item.version==='20260921194045');
 assert.deepEqual(row,{
  version:'20260921194045',
  name:'public_director_identity_v1',
  sha256:'28b8d262a7567a055a96954ee9c2b78f53aae111d718ff205d66954cbd3c58ec'
 });
});

test('member APIs expose only display identity fields needed by the app',()=>{
 for(const path of ['supabase/functions/member-api/index.ts','supabase/functions/member-hub/index.ts']){
  const source=read(path);
  assert.match(source,/public_badge_key,public_title,public_verified/);
 }
});

test('community payloads carry official identity into posts and chat',()=>{
 const source=read('supabase/functions/ecosystem-private/index.ts');
 assert.match(source,/user_id,name,handle,kind,public_badge_key,public_title,public_verified/);
 assert.match(source,/user_id,name,handle,public_badge_key,public_title,public_verified/);
});

test('official badge component is visual-only and reusable',()=>{
 const component=read('src/components/OfficialIdentityBadge.jsx');
 assert.match(component,/profile\?\.public_verified/);
 assert.match(component,/profile\.public_title/);
 assert.match(component,/Identité officielle 3B/);
 assert.doesNotMatch(component,/control|permission|moderator|admin/i);
});

test('director badge is rendered on member, passport and community surfaces',()=>{
 const account=read('src/loyalty/AccountPage.jsx');
 const passport=read('src/components/PassportVisual.jsx');
 const community=read('src/community/CommunityPage.jsx');
 assert.match(account,/OfficialIdentityBadge profile=\{profile\}/);
 assert.match(account,/IDENTITÉ OFFICIELLE 3B/);
 assert.match(passport,/OfficialIdentityBadge profile=\{identity\}/);
 assert.match(community,/OfficialIdentityBadge profile=\{a\} compact/);
 assert.match(community,/OfficialIdentityBadge profile=\{p\}/);
 assert.match(community,/OfficialIdentityBadge profile=\{profile\} compact/);
 assert.match(community,/OfficialIdentityBadge profile=\{data\?\.mine\|\|account\.profile\}/);
});

test('passport identity carries display-only official fields',()=>{
 const identity=read('src/passport/identity.js');
 assert.match(identity,/public_badge_key: cleanText\(profile\.public_badge_key, 40\)/);
 assert.match(identity,/public_title: cleanText\(profile\.public_title, 80\)/);
 assert.match(identity,/public_verified: profile\.public_verified === true/);
});
