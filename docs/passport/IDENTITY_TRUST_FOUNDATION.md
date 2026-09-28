# Passport 3B — Identity Trust Foundation

## Goal

Passport 3B is a private digital identity for the 3B ecosystem. It must not be described as a French national identity document or government-issued passport.

The trust chain is deliberately separated into:

1. account authentication;
2. Passport lifecycle;
3. civil-identity proofing;
4. cryptographic authentication;
5. consented disclosure to services.

A successful account registration is **not** civil-identity verification.

## Current foundation

### Account authentication

- Supabase Auth remains the authentication authority.
- v2 registration requires a real e-mail address and e-mail confirmation unless Supabase returns a confirmed session.
- strong password validation, server-side rate limits, optional CAPTCHA, honeypot and security event logging already exist.
- legacy registration is controlled by a server-side rollout gate.

### Passport lifecycle

Each member has an opaque `passport_public_id` distinct from `auth.users.id`.

Passport states:

- `active`
- `suspended`
- `revoked`
- `expired`

Only an active Passport may unlock Passport-gated application areas.

### Civil identity proofing

Civil-identity proofing is represented independently:

- `unverified`
- `pending`
- `verified`
- `rejected`
- `suspended`
- `revoked`
- `expired`

Assurance is represented by level 0..3. Level 0 means that no civil-identity proof has been accepted.

The service-only `passport_apply_identity_verification` RPC is the only foundation supplied here for applying future provider outcomes atomically. A real provider integration must verify the provider webhook signature before calling it.

Do **not** mark a user verified from frontend input, a display name, an e-mail, a phone number, a public 3B badge or a client-controlled API call.

## Data minimisation rules

Never store in these tables:

- fingerprint templates;
- Face ID / device biometric data;
- passkey private keys;
- raw recovery codes;
- raw identity-document images;
- raw selfie/video captures;
- raw provider case identifiers.

Provider case references and evidence references must be one-way hashed before persistence. Raw identity documents should remain with the contracted identity provider unless a separate legal requirement and retention policy explicitly justify storage.

If 3B later needs verified civil claims (legal name, birth date, nationality), store them in a dedicated private data boundary with encryption/key management and a documented retention/legal basis. Do not put them in the public member profile.

## Passkeys / WebAuthn

The database foundation contains:

- public authenticator credentials only;
- hashed one-time challenges;
- sign counters;
- revocation timestamps.

This does **not** mean Passkeys are operational yet. A complete implementation still needs server-side WebAuthn registration/authentication ceremonies, RP ID/origin validation, challenge consumption and platform testing. Device biometrics must remain on the user's device.

## Recovery

The database foundation supports hashed one-time recovery codes. Before production activation:

- generate codes with a CSPRNG;
- show raw codes once;
- store hashes only;
- require recent/step-up authentication for regeneration;
- revoke prior codes during regeneration;
- notify existing trusted channels after sensitive recovery changes.

The pre-existing long recovery key remains a separate legacy/account recovery mechanism until a migration is completed.

## QR verification

Passport QR tickets must remain:

- short-lived;
- one-time;
- stored as hashes;
- revocable;
- free of private account UUIDs and PII;
- scope-limited.

A public 3B badge is not a civil-identity verification. Public verification output now keeps those concepts separate.

## External identity provider — production gate

Production identity proofing must remain disabled until all of the following are complete:

- provider selected and contracted;
- legal/privacy/DPIA review completed where required;
- provider assurance/certification evaluated for the target use;
- production API credentials stored server-side;
- webhook signature verification implemented and tested;
- retry/idempotency behavior tested;
- retention/deletion process documented;
- manual review and appeal path defined;
- age/minor policy defined;
- test identities exercised end-to-end;
- incident and revocation procedure documented.

Environment variables intentionally default to disabled:

- `PASSPORT_IDENTITY_VERIFICATION_ENABLED=false`
- `PASSPORT_IDENTITY_PROVIDER`
- `PASSPORT_IDENTITY_PROVIDER_API_KEY`
- `PASSPORT_IDENTITY_PROVIDER_WEBHOOK_SECRET`
- `PASSPORT_IDENTITY_REFERENCE_SECRET`

## Future “Continue with Passport 3B”

The `passport_partner_consents` table is only a consent/scopes foundation. It is not an OAuth/OIDC server.

Before external services may authenticate through Passport 3B, implement and independently review:

- OAuth 2.0 / OpenID Connect authorization server behavior;
- client registration and redirect URI validation;
- PKCE;
- nonce/state validation;
- pairwise subject identifiers;
- explicit scopes/claims;
- consent and revocation;
- signed tokens and key rotation;
- discovery/JWKS;
- security event monitoring;
- conformance/interoperability tests.

## Release principle

Never upgrade a label in the UI before the underlying proof exists.

- account created != identity verified
- e-mail verified != identity verified
- phone verified != identity verified
- public badge verified != civil identity verified
- Passport active != civil identity verified
- database schema for Passkeys != Passkeys operational
- partner-consent schema != OIDC operational
