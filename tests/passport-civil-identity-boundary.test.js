import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Passport visual distinguishes active membership from verified civil identity',()=>{
 const visual=readFileSync('src/components/PassportVisual.jsx','utf8');
 assert.match(visual,/civilIdentityVerified/);
 assert.match(visual,/PASSEPORT ACTIF/);
 assert.doesNotMatch(visual,/active \? "IDENTITÉ VÉRIFIÉE"/);
});

test('public QR verification does not present a founder/public badge as civil KYC',()=>{
 const verifier=readFileSync('supabase/functions/passport-verify/index.ts','utf8');
 const page=readFileSync('public/passport-verify.js','utf8');
 assert.match(verifier,/publicBadgeVerified/);
 assert.match(verifier,/identityVerified:false/);
 assert.doesNotMatch(page,/passport\.verified/);
 assert.match(page,/badge public 3B/);
});

test('pending identity schema minimizes raw high-risk evidence',()=>{
 const sql=readFileSync('supabase/pending/passport_identity_assurance_v1.sql','utf8');
 assert.match(sql,/member_identity_assurance/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.member_identity_assurance from public,anon,authenticated/);
 assert.doesNotMatch(sql,/document_image|selfie|biometric_template|document_number/i);
});

test('Passkeys remain disabled by default until the permanent RP is chosen',()=>{
 const env=readFileSync('.env.example','utf8');
 assert.match(env,/VITE_3B_PASSKEYS_ENABLED=false/);
});
