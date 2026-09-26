import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const issuer=readFileSync(new URL('../supabase/functions/passport-identity/index.ts',import.meta.url),'utf8');
const verifier=readFileSync(new URL('../supabase/functions/passport-verify/index.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../public/passport-verify.js',import.meta.url),'utf8');
const identityMigration=readFileSync(new URL('../supabase/migrations/20260926145825_passport_identity_v2_public_id.sql',import.meta.url),'utf8');
const ticketMigration=readFileSync(new URL('../supabase/migrations/20260926150431_passport_verification_ticket_foundation.sql',import.meta.url),'utf8');
const hardeningMigration=readFileSync(new URL('../supabase/migrations/20260926155300_passport_identity_security_hardening_v2.sql',import.meta.url),'utf8');
const indexMigration=readFileSync(new URL('../supabase/migrations/20260926170607_passport_verification_ticket_public_id_fk_index.sql',import.meta.url),'utf8');

test('deployed Passport runtime keeps account identity private and public identity opaque',()=>{
  assert.match(identityMigration,/passport_public_id uuid/);
  assert.match(identityMigration,/unique index if not exists member_profiles_passport_public_id_uidx/);
  assert.match(issuer,/token_hash:await hash\(token\)/);
  assert.match(issuer,/Date\.now\(\)\+5\*60\*1000/);
  assert.doesNotMatch(issuer,/verifyUrl=.*user_id/);
});

test('verification tickets are service-only, short-lived and indexed on their public identity FK',()=>{
  assert.match(ticketMigration,/revoke all on public\.passport_verification_tickets from public, anon, authenticated/);
  assert.match(ticketMigration,/expires_at <= issued_at \+ interval '10 minutes'/);
  assert.match(hardeningMigration,/passport_verification_tickets_deny_anon/);
  assert.match(hardeningMigration,/passport_verification_tickets_deny_authenticated/);
  assert.match(indexMigration,/passport_verification_tickets_passport_public_id_idx/);
});

test('public verifier is rate-limited, single-use and enforces verification purpose and consent scope',()=>{
  assert.match(verifier,/p_limit:30,p_window:60/);
  assert.match(verifier,/consumed_at=is\.null/);
  assert.match(verifier,/revoked_at=is\.null/);
  assert.match(verifier,/expires_at=gt\./);
  assert.match(verifier,/ticket\.purpose!=='verify'/);
  assert.match(verifier,/ticket\.scopes\.includes\('identity\.basic'\)/);
  assert.doesNotMatch(verifier,/wallet|coins|inventory|recovery_hash/i);
});

test('verification page removes the secret from the address and never persists it',()=>{
  assert.match(page,/location\.hash\.slice\(1\)/);
  assert.match(page,/history\.replaceState\(null,'',location\.pathname\)/);
  assert.match(page,/cache:'no-store'/);
  assert.match(page,/referrerPolicy:'no-referrer'/);
  assert.doesNotMatch(page,/localStorage|sessionStorage|document\.cookie/);
});
