# Passeport 3B — Identity Trust Foundation V3

Date: 2026-09-28

## Goal

The Passeport 3B is a private 3B digital identity and access credential. It must never be presented as a French national identity card, a government passport or a travel document.

The trust model separates:

1. account ownership;
2. self-declared civil identity;
3. verified civil identity;
4. Passport activity/revocation;
5. cryptographic authentication;
6. consented disclosure to future relying parties.

## Operational foundation

- Real e-mail registration through Supabase Auth v2.
- E-mail confirmation supported; confirmed accounts can reach `account_verified` assurance.
- Strong password rules, server rate limits, optional Turnstile CAPTCHA and honeypot.
- Versioned terms/privacy/identity consent records.
- Legacy registration/recovery endpoints disabled after the v2 cutover.
- Separate service-only `member_identity_claims` table for declared legal given names, legal family name and birth date.
- Civil identity starts as `unverified`; self-declared fields can never set it to `verified`.
- A verified state requires server evidence metadata: verification time, provider and hashed provider reference.
- Service-only verification-attempt lifecycle table.
- Opaque Passport public UUID separate from `auth.users.id`.
- Canonical public Passport/member number derived only from the complete opaque public UUID.
- Passport states: `active`, `suspended`, `revoked`, `expired` where supported by the identity layer.
- App access requires an active server-backed Passport.
- Public QR verification uses a random 32-byte secret, stores only its SHA-256 hash, expires quickly, is single-use and contains no account UUID, wallet or inventory.
- Public role badges such as founder/director are separate from civil identity verification.
- No raw document scan, selfie, face template, fingerprint template or raw provider payload is stored by this foundation.

## Passkeys

The client is wired to Supabase Auth WebAuthn/Passkeys and gated by `VITE_PASSKEY_ENABLED`.

Keep the gate disabled until:

- Supabase Auth Passkeys are enabled for the project;
- a durable WebAuthn RP ID/domain is chosen;
- production HTTPS origins are final;
- sign-up, sign-in, lost-device and recovery scenarios pass staging tests.

Changing the RP ID later invalidates existing passkeys.

3B must not store fingerprint or Face ID templates. A compatible device may use local biometrics/PIN to unlock its private key; 3B/Supabase verifies the public-key proof.

## Phone verification

A phone number must never be labelled verified merely because it was typed into a form.

Before making phone verification mandatory:

- configure a real Supabase-compatible SMS provider or Send SMS Hook;
- enable abuse/rate limits and CAPTCHA;
- complete OTP send/verify flows;
- define phone-change and lost-phone recovery;
- log security events without storing OTP values.

Until then, phone verification remains a release gate rather than a fake check.

## Civil identity provider

No KYC/identity provider is assumed by the code.

Before enabling real civil-identity verification:

- select the appropriate provider and assurance target for France/EU;
- complete legal/privacy/DPA review;
- document exactly what data the provider processes and retains;
- verify provider webhook signatures;
- make webhooks idempotent;
- map provider outcomes to the allowed 3B states;
- never accept a browser/client request that directly sets `verified`;
- keep raw document/selfie/biometric retention outside 3B unless explicitly required and legally justified;
- run end-to-end staging, fraud and account-recovery tests.

## Future relying parties / “Continue with Passeport 3B”

`passport_partner_consents` is only a consent-ledger foundation. OAuth2/OIDC is not claimed as operational yet.

Future partner access must:

- use registered clients and redirect URIs;
- use minimum scopes;
- ask for explicit consent;
- prefer pairwise/per-client subject identifiers;
- support revocation;
- never disclose the private Supabase user UUID;
- never use the public Passport number as a password or authentication secret.

## Release rules

A feature must be labelled operational only when its server configuration, tests and production deployment are all confirmed.

Never use these labels without evidence:

- “identity verified” from self-declared fields;
- “biometrics active” when only device-local biometrics may exist;
- “AES-256” without an actual implemented layer being described;
- “100% integrity”;
- “official identity document” or equivalent government status.
