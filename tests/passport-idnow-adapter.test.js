import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/passport-idv/index.ts',import.meta.url),'utf8');
const claim=readFileSync(new URL('../supabase/migrations/20260929164050_passport_identity_provider_event_retry_claim_v2.sql',import.meta.url),'utf8');
const foundation=readFileSync(new URL('../supabase/migrations/20260928160636_passport_identity_provider_events_v1.sql',import.meta.url),'utf8');
const docs=readFileSync(new URL('../docs/passport/IDNOW_INTEGRATION.md',import.meta.url),'utf8');

test('IDnow adapter stays fail-closed until every server-side gate is configured',()=>{
  assert.match(edge,/PASSPORT_IDENTITY_VERIFICATION_ENABLED/);
  assert.match(edge,/PASSPORT_IDENTITY_PROVIDER/);
  assert.match(edge,/IDNOW_PVID_FLOW_APPROVED/);
  assert.match(edge,/WEBHOOK_AUDIENCE\.startsWith\('https:\/\/'\)/);
  assert.match(edge,/REF_SECRET\.length>=32/);
  assert.match(edge,/outcome==='accepted'&&IDNOW_APPROVED/);
});

test('signed webhook is verified against issuer, audience and remote JWKS',()=>{
  assert.match(edge,/createRemoteJWKSet/);
  assert.match(edge,/jwtVerify\(token,jwks,\{issuer,audience:WEBHOOK_AUDIENCE\}\)/);
  assert.match(edge,/application\/jwt/);
  assert.match(edge,/Signature webhook invalide/);
});

test('provider event retries use an atomic claim instead of dropping unprocessed duplicates',()=>{
  assert.match(edge,/passport_identity_provider_event_claim/);
  assert.match(edge,/already_processed/);
  assert.match(edge,/in_progress/);
  assert.match(edge,/Événement webhook déjà en cours de traitement/);
  assert.doesNotMatch(edge,/if\(!inserted\)return\{ok:true,duplicate:true\}/);
  assert.match(edge,/processing_started_at:null/);
});

test('claim migration serializes duplicate deliveries and permits interrupted retries',()=>{
  assert.match(claim,/for update/i);
  assert.match(claim,/on conflict\(provider,event_id\) do nothing/i);
  assert.match(claim,/processing_started_at > now\(\)-interval '2 minutes'/i);
  assert.match(claim,/attempt_count=attempt_count\+1/i);
  assert.match(claim,/v_event\.processed_at is not null/i);
  assert.match(claim,/provider event metadata mismatch/i);
});

test('claim RPC is service-role only and provider ledger remains private',()=>{
  assert.match(claim,/revoke all on function public\.passport_identity_provider_event_claim\(text,text,text,text\)[\s\S]*from public,anon,authenticated/i);
  assert.match(claim,/grant execute on function public\.passport_identity_provider_event_claim\(text,text,text,text\)[\s\S]*to service_role/i);
  assert.match(foundation,/revoke all on public\.passport_identity_provider_events from public,anon,authenticated/i);
  assert.match(foundation,/Never store raw provider payloads or PII/i);
});

test('IDnow documentation records the retry lease and external activation gates',()=>{
  assert.match(docs,/lease atomique/i);
  assert.match(docs,/client ID/);
  assert.match(docs,/DPA/);
  assert.match(docs,/rétention/i);
});
