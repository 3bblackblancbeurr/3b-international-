import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('../supabase/functions/DEPLOYED_FUNCTIONS_SNAPSHOT.json',import.meta.url),'utf8'));

test('every ACTIVE Edge Function snapshot has source tracked in the repository',()=>{
  assert.ok(manifest.functions.length>=10);
  for(const fn of manifest.functions){
    const url=new URL('../supabase/functions/'+fn.slug+'/index.ts',import.meta.url);
    assert.equal(existsSync(url),true,fn.slug);
  }
});

test('Edge Function JWT classifications keep private and custom-auth boundaries explicit',()=>{
  const bySlug=Object.fromEntries(manifest.functions.map(fn=>[fn.slug,fn]));
  for(const slug of [
    'ai-council-orchestrate','world-engine','world-bootstrap','city-3b','card-arena',
    'marketplace-3b','delete-account','member-api','ecosystem-private','world-unreal-launch'
  ]){
    assert.equal(bySlug[slug]?.verify_jwt,true,slug);
  }
  for(const slug of ['member-auth','ecosystem-public','member-hub','secret3b-claim','secret3b-phone','ecosystem']){
    assert.equal(bySlug[slug]?.verify_jwt,false,slug);
  }

  // Redemption intentionally has platform JWT verification disabled because a
  // native Unreal client arrives with a one-time ticket rather than a Supabase JWT.
  assert.equal(bySlug['world-unreal-redeem']?.verify_jwt,false,'world-unreal-redeem');
  const redeem=readFileSync(new URL('../supabase/functions/world-unreal-redeem/index.ts',import.meta.url),'utf8');
  assert.match(redeem,/x-3b-client/);
  assert.match(redeem,/\^\[A-Za-z0-9_-\]\{40,80\}\$/);
  assert.match(redeem,/loyalty_rate/);
  assert.match(redeem,/world_unreal_redeem_ticket/);
  assert.match(redeem,/p_session_ttl_seconds:1800/);

  // The long-lived API is source-only until the dedicated-server authority contract is approved.
  assert.equal(bySlug['world-unreal-api'],undefined);
});

test('tracked Edge Function sources contain no obvious embedded private credential patterns',()=>{
  const patterns=[
    /sb_secret_[A-Za-z0-9_-]{20,}/,
    /sk_live_[A-Za-z0-9]{16,}/,
    /gh[pousr]_[A-Za-z0-9]{30,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  ];
  for(const fn of manifest.functions){
    const source=readFileSync(new URL('../supabase/functions/'+fn.slug+'/index.ts',import.meta.url),'utf8');
    for(const pattern of patterns)assert.doesNotMatch(source,pattern,fn.slug);
  }
});
