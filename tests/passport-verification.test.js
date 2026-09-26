import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasPassportAccess} from '../src/passport/access.js';

const issuer=readFileSync(new URL('../supabase/functions/passport-identity/index.ts',import.meta.url),'utf8');
const verifier=readFileSync(new URL('../supabase/functions/passport-verify/index.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../public/passport-verify.js',import.meta.url),'utf8');
const visual=readFileSync(new URL('../src/passport/PassportVerification.jsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/loyalty/client.js',import.meta.url),'utf8');

test('only an active Passport unlocks the ecosystem',()=>{
 assert.equal(hasPassportAccess({userId:'member-1'}),true);
 assert.equal(hasPassportAccess({userId:'member-1',passportState:'active'}),true);
 assert.equal(hasPassportAccess({userId:'member-1',passportState:'suspended'}),false);
 assert.equal(hasPassportAccess({userId:'member-1',passportState:'revoked'}),false);
 assert.equal(hasPassportAccess(null),false);
});

test('Passport QR issuer uses a random short-lived server ticket and stores only its hash',()=>{
 assert.match(issuer,/crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
 assert.match(issuer,/token_hash:await hash\(token\)/);
 assert.match(issuer,/Date\.now\(\)\+5\*60\*1000/);
 assert.match(issuer,/scopes:\['identity\.basic'\]/);
 assert.match(issuer,/passport-verify\.html#ticket=/);
 assert.match(issuer,/revoked_at:issuedAt/);
 assert.doesNotMatch(issuer,/verifyUrl=.*user_id/);
 assert.doesNotMatch(issuer,/qrDataUrl.*wallet/i);
});

test('public verifier consumes a ticket once and returns only minimal public Passport data',()=>{
 assert.match(verifier,/consumed_at=is\.null/);
 assert.match(verifier,/revoked_at=is\.null/);
 assert.match(verifier,/expires_at=gt\./);
 assert.match(verifier,/\{consumed_at:now\},'PATCH'/);
 assert.match(verifier,/p_limit:30,p_window:60/);
 assert.match(verifier,/ticket\.purpose!==['"]verify['"]/);
 assert.match(verifier,/ticket\.scopes\.includes\(['"]identity\.basic['"]\)/);
 assert.match(verifier,/displayName:/);
 assert.match(verifier,/country:/);
 assert.doesNotMatch(verifier,/wallet|coins|inventory|recovery_hash/i);
 assert.doesNotMatch(verifier,/user_id\s*:/);
});

test('verification page removes the ticket from the browser address and never persists it',()=>{
 assert.match(page,/location\.hash\.slice\(1\)/);
 assert.match(page,/history\.replaceState\(null,'',location\.pathname\)/);
 assert.match(page,/cache:'no-store'/);
 assert.match(page,/referrerPolicy:'no-referrer'/);
 assert.doesNotMatch(page,/localStorage|sessionStorage|document\.cookie/);
});

test('member proof request always uses the signed-in access token',()=>{
 assert.match(client,/passportVerificationRequest/);
 assert.match(client,/Authorization:'Bearer '\+session\.access_token/);
 assert.match(client,/PASSPORT_IDENTITY_URL/);
});

test('Passport proof UI explicitly explains the private-data boundary',()=>{
 assert.match(visual,/ni ton mot de passe, ni ton UUID de compte, ni ton Wallet/);
 assert.match(visual,/usage unique/);
});
