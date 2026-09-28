# Passport 3B — Identity Trust Foundation

## Goal

Passport 3B is a private digital identity for the 3B ecosystem. It must not be described as a French national identity document or government-issued passport.

The trust chain is deliberately separated into:

1. account authentication;
2. Passport lifecycle;
3. self-declared private civil claims;
4. external civil-identity proofing;
5. cryptographic authentication;
6. consented disclosure to services.

A successful account registration is **not** civil-identity verification.

## Production source of truth

The production schema uses:

- `identity_verification_state`
- `identity_assurance_level`
- `identity_verified_at`
- `identity_verification_provider`
- `identity_verification_ref_hash`

Identity states:

- `unverified`
- `pending`
- `verified`
- `rejected`
- `expired`
- `revoked`

Assurance levels:

- `self_asserted`
- `account_verified`
- `identity_verified`
- `high_assurance`

`account_verified` means the 3B account has a confirmed authentication channel. It is **not** a verified civil identity.

The database constraint only allows a profile to be `verified` when a verification timestamp, provider, hashed external reference and an assurance of `identity_verified` or `high_assurance` are present.

## Registration

New registration collects two separate identities:

### Public 3B identity

- public handle;
- public display name;
- 3B origin country.

### Private civil claim

Stored only in the service-only `member_identity_claims` table:

- legal given name(s);
- legal family name;
- birth date;
- claim version and timestamps.

These fields are self-declared and must never cause the Passport to display “identity verified”.

An explicit `identity` consent entry is recorded in `member_consents`. The civil-identity table is denied to `anon` and `authenticated`; only trusted service code has direct database access.

## Account authentication

- Supabase Auth is the authentication authority.
- New accounts use a real e-mail address and confirmation.
- strong password validation is enforced;
- server-side rate limits exist;
- CAPTCHA can be required;
- a honeypot is present;
- authentication security events are logged;
- legacy register/recover flows are disabled in production.

After an authentication channel is confirmed, a profile may move from `self_asserted` to `account_verified`. This never upgrades civil identity.

## Passport lifecycle

Each member has an opaque `passport_public_id` distinct from `auth.users.id`.

Only a Passport whose server state is `active` may unlock Passport-gated application areas.

Suspended, revoked or expired values must fail closed wherever supported by the Passport state constraint.

## Identity verification provider

`passport_identity_verification_attempts` stores only lifecycle metadata:

- provider identifier;
- hashed provider session reference;
- attempt state;
- requested assurance;
- idempotency key;
- timestamps;
- bounded error code.

Do not store raw document scans, selfies, biometric templates or complete provider payloads in 3B.

A future provider integration must:

1. verify its webhook signature;
2. enforce idempotency;
3. bind a provider case to one 3B account;
4. validate the final provider result server-side;
5. update the profile to `verified` only when the required evidence was accepted;
6. store only a hashed external reference;
7. write an auditable security event;
8. support rejection, expiry and revocation.

## Passkeys / WebAuthn

Supabase Auth supports Passkeys/WebAuthn, but the current API is experimental.

3B should use Supabase Auth passkeys rather than inventing a second private-key store.

Before enabling enrollment:

- choose the final stable relying-party domain;
- configure the RP ID and allowed origins in Supabase Auth;
- test web, Android and iOS;
- confirm recovery behavior;
- add account security UI;
- verify existing password/recovery flows;
- document how users revoke lost devices.

The private passkey key and device biometrics must remain with the authenticator/device. 3B should never receive fingerprint or Face ID templates.

Do not enroll production passkeys on a temporary domain that is expected to change. Changing the WebAuthn RP ID invalidates existing passkeys.

## Recovery

The existing long recovery key is an account recovery mechanism and must remain independent from civil identity.

Sensitive recovery should eventually use:

- reauthentication / step-up;
- a second trusted authenticator where available;
- revocation of other sessions after a successful reset;
- security notifications;
- stronger identity re-proofing when the user has lost every trusted factor.

## QR verification

Passport QR tickets must remain:

- short-lived;
- one-time;
- stored as hashes;
- revocable;
- free of private account UUIDs and sensitive PII;
- scope-limited.

Public 3B badges and civil-identity verification are separate signals.

## Partner consent and “Continue with Passport 3B”

`passport_partner_consents` is the private 3B consent ledger.

Supabase Auth now provides OAuth 2.1 / OpenID Connect server capabilities, so the preferred future direction is to build “Continue with Passport 3B” on top of that standards-based authorization server rather than implementing token issuance from scratch.

Before external partners are enabled:

- register each client and exact redirect URI;
- require Authorization Code + PKCE;
- use `state` and OIDC `nonce`;
- show a clear 3B consent screen;
- minimize scopes and claims;
- use pairwise/pseudonymous identifiers where appropriate;
- prevent OAuth scopes from being confused with database authorization;
- use RLS for data access;
- expose only claims that the user authorized;
- provide grant revocation;
- run interoperability and security tests.

## Production provider gate

Identity proofing remains disabled until all of the following are complete:

- provider selected and contracted;
- legal/privacy review completed;
- assurance/certification evaluated for the intended use;
- production API credentials stored server-side;
- webhook signature verification implemented;
- retry/idempotency behavior tested;
- retention/deletion process documented;
- manual review and appeal path defined;
- minor/age policy defined;
- test identities exercised end to end;
- incident and revocation procedure documented.

Environment variables remain fail-closed:

- `PASSPORT_IDENTITY_VERIFICATION_ENABLED=false`
- `PASSPORT_IDENTITY_PROVIDER`
- `PASSPORT_IDENTITY_PROVIDER_API_KEY`
- `PASSPORT_IDENTITY_PROVIDER_WEBHOOK_SECRET`
- `PASSPORT_IDENTITY_REFERENCE_SECRET`

## Release principle

Never upgrade a label in the UI before the underlying proof exists.

- account created != identity verified
- e-mail verified != identity verified
- phone verified != identity verified
- public badge verified != civil identity verified
- Passport active != civil identity verified
- self-declared civil name != verified civil identity
- OAuth schema/consent table != partner login enabled
- Passkey-capable client != production Passkeys enabled
