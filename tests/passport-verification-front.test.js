import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PassportVerificationError, presentationForOwner, proofState, randomChallenge, remainingSeconds, safeHttpsUrl, validateProof, validateProofRequest, validateRegistry, validateTicket } from '../src/passport/verification-contract.js';
import { passportRequest } from '../src/passport/verification-client.js';
import { base64url, generateSigningJWK, loadSigningKey, signProof } from '../shared/passport-recognition.js';

const NOW = Date.parse('2026-10-02T12:00:00Z');
const expiry = new Date(NOW + 300000).toISOString();
const partner = { id: 'partner-contract-fixture', scopes: ['passport.basic', 'profile.public'] };

test('a browser without an authenticated session cannot request or fabricate a server proof', async () => {
  // Uses the actual Supabase auth client, with no fabricated login or bearer token.
  await assert.rejects(passportRequest('passport-recognition', { action: 'issue' }, 'no-signed-in-user'), error => error instanceof PassportVerificationError && error.status === 401);
});

test('partner proof request requires consent, allowed scopes and an intact partner challenge', () => {
  const request = { partnerId: partner.id, scopes: ['passport.basic'], nonce: 'PartnerChallenge_CASE_sensitive_12345678', consent: true };
  assert.deepEqual(validateProofRequest(request, partner), request);
  for (const change of [{ consent: false }, { scopes: [] }, { scopes: ['identity.verified'] }, { scopes: ['passport.basic', 'passport.basic'] }, { nonce: 'short' }, { nonce: 'x'.repeat(129) }, { partnerId: 'another-partner' }]) {
    assert.throws(() => validateProofRequest({ ...request, ...change }, partner), PassportVerificationError);
  }
});

test('random challenge contains 32 cryptographic bytes and unavailable entropy fails closed', () => {
  const a = randomChallenge(), b = randomChallenge();
  assert.match(a, /^[0-9a-f]{64}$/); assert.notEqual(a, b);
  assert.throws(() => randomChallenge({}), PassportVerificationError);
});

test('ticket rendering accepts only complete short-lived server presentations', () => {
  const ticket = { verifyUrl: 'https://3b-international.vercel.app/passport-verify.html#ticket=' + 'a'.repeat(64), qrDataUrl: 'data:image/svg+xml;base64,PHN2Zy8+', expiresAt: expiry };
  assert.equal(validateTicket(ticket, NOW), ticket);
  for (const change of [{ verifyUrl: 'javascript:alert(1)' }, { qrDataUrl: 'https://remote-qr.example/collect' }, { expiresAt: new Date(NOW).toISOString() }, { expiresAt: new Date(NOW + 600000).toISOString() }, { verifyUrl: ticket.verifyUrl.replace('a'.repeat(64), 'invalid') }]) {
    assert.throws(() => validateTicket({ ...ticket, ...change }, NOW), PassportVerificationError);
  }
});

test('typed 3B proof is coherent with the response, with no unsigned or expired local fallback', async () => {
  // A real P-256 signature over a local test fixture, without a fabricated login.
  const material = await loadSigningKey(await generateSigningJWK());
  const id = '24b9b18c-65c8-4f81-8d40-854d1a53427c';
  const payload = { v: 1, iss: 'https://3b.example/issuer', aud: 'https://partner.example', sub: '3b_' + 'a'.repeat(43), jti: id, iat: NOW / 1000, exp: (NOW + 300000) / 1000, nonce_hash: 'a'.repeat(64), scopes: ['passport.basic'], claims: { passport_active: true, passport_version: 2 } };
  const proof = { proofId: id, proofJWT: await signProof(payload, material, { now: NOW / 1000 }), expiresAt: expiry, partnerName: 'Local contract fixture' };
  assert.equal(validateProof(proof, NOW), proof);
  assert.throws(() => validateProof({ ...proof, proofJWT: '' }, NOW), PassportVerificationError);
  assert.throws(() => validateProof({ ...proof, proofJWT: 'unsigned' }, NOW), PassportVerificationError);
  assert.throws(() => validateProof({ ...proof, expiresAt: new Date(NOW).toISOString() }, NOW), PassportVerificationError);
  assert.throws(() => validateProof({ ...proof, proofId: '24b9b18c-65c8-4f81-8d40-854d1a53427d' }, NOW), PassportVerificationError);
  assert.throws(() => validateProof({ ...proof, expiresAt: new Date(NOW + 299000).toISOString() }, NOW), PassportVerificationError);
  const [header, body, signature] = proof.proofJWT.split('.');
  const encode = value => base64url(new TextEncoder().encode(JSON.stringify(value)));
  assert.throws(() => validateProof({ ...proof, proofJWT: [encode({ alg: 'none', typ: '3B-Recognition+jwt', kid: material.kid }), body, signature].join('.') }, NOW), PassportVerificationError);
  assert.throws(() => validateProof({ ...proof, proofJWT: [encode({ alg: 'ES256', typ: 'JWT', kid: material.kid }), body, signature].join('.') }, NOW), PassportVerificationError);
  assert.throws(() => validateProof({ ...proof, proofJWT: [header, encode({ ...payload, claims: { ...payload.claims, country: 'not-disclosed' } }), signature].join('.') }, NOW), PassportVerificationError);
});

test('empty server partner registry remains empty and incomplete registry cannot imply availability', () => {
  const registry = { readiness: { ready: false, configured: true, hasPartners: false }, partners: [], proofs: [] };
  assert.equal(validateRegistry(registry), registry);
  assert.equal(registry.partners.length, 0);
  assert.throws(() => validateRegistry({ partners: [], proofs: [] }), PassportVerificationError);
  assert.throws(() => validateRegistry({ ...registry, partners: [{ id: 'incomplete' }] }), PassportVerificationError);
});

test('proof state respects revocation and use, and expiry never reports issued', () => {
  assert.equal(proofState({ expiresAt: expiry }, NOW), 'issued');
  assert.equal(proofState({ expiresAt: expiry, revokedAt: new Date(NOW).toISOString() }, NOW), 'revoked');
  assert.equal(proofState({ expiresAt: expiry, consumedAt: new Date(NOW).toISOString() }, NOW), 'consumed');
  assert.equal(proofState({ expiresAt: expiry, status: 'expired' }, NOW), 'expired');
  assert.equal(proofState({ expiresAt: expiry }, NOW + 300000), 'expired');
  assert.equal(remainingSeconds('invalid', NOW), 0);
});

test('provider and partner links require HTTPS without embedded credentials', () => {
  assert.equal(safeHttpsUrl('https://partner.example/verify'), 'https://partner.example/verify');
  for (const value of ['javascript:alert(1)', 'http://partner.example', 'https://user:password@partner.example', 'invalid']) assert.equal(safeHttpsUrl(value), null);
});

test('the render rejects an old owner presentation immediately, before cleanup effects', () => {
  const value = { ownerUserId: 'account-A', proofJWT: 'never-cross-accounts' };
  assert.equal(presentationForOwner(value, 'account-A', true), value);
  assert.equal(presentationForOwner(value, 'account-B', true), null);
  assert.equal(presentationForOwner(value, null, true), null);
  assert.equal(presentationForOwner(value, 'account-A', false), null);
});

test('verification is an isolated sibling below the original card and keeps secrets out of browser storage', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/passport/PassportVerification.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/passport/passport-verification.css', import.meta.url), 'utf8');
  assert.match(app, /<PassportVisual[^\n]+\/>\s*<PassportVerification/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|Math\.random|createTestMember|signInWithPassword|PassportVisual/);
  assert.doesNotMatch(css, /\.passport-identity-layer|\.passport-stage|\.passport-visual|\.passport-card/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /border-radius\s*:\s*(?!var\()[^;}]+/i);
  assert.match(component, /idv\.physicalEnvironment === 'production'/);
  assert.match(component, /idv\.logicalEnvironment === 'live'/);
});
