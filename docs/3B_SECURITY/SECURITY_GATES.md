# 3B Fortress Security Gates

No stage may be skipped because a later stage appears functional.

## Gate 0 — Repository and build boundary
Required:
- no server/private cryptographic secret in GitHub;
- real env files ignored;
- security branch/PR review path;
- read-only CI by default;
- immutable third-party action references for security-critical workflows;
- production dependency audit without unresolved critical findings;
- rollback path documented.

Current status: **PARTIAL**.
Known gap: existing legacy workflows still use mutable `@v4` action tags and some request `contents: write`.

## Gate 1 — Existing application/server boundary
Required:
- sensitive tables RLS + minimal grants;
- server-only tables explicitly classified as server-only;
- privileged RPCs reviewed for caller identity, ownership, idempotence and safe `search_path`;
- sensitive Edge Functions require gateway JWT unless a documented webhook/public flow needs custom authentication;
- compromised-password protection enabled;
- no personal fixture data in public source.

Current status: **PARTIAL**.
Completed in the Fortress branch/runtime hardening:
- 3B economy flags are read-only to authenticated users and unavailable to anon;
- economic privileged functions use an empty `search_path`;
- world-engine requires gateway JWT and still performs its own session validation;
- legacy Passport fixture is anonymized in the security branch.

## Gate 2 — Wallet/key architecture
Required before any 3BC test value:
- user key lifecycle specified;
- Vault key lifecycle specified;
- no single reserve key;
- backup/recovery ceremony documented and tested;
- signer isolation;
- Quant has no signing credential;
- algorithm-suite versioning defined.

Current status: **NOT IMPLEMENTED**.

## Gate 3 — 3BC testnet
Required:
- test-only chain ID/genesis;
- no monetary value;
- deterministic transaction validation;
- replay protection;
- double-spend property tests;
- supply invariant tests;
- node restart/rebuild test;
- malicious-node simulations;
- no mainnet keys reuse.

Current status: **BLOCKED BY GATE 2**.

## Gate 4 — Independent assurance
Required:
- independent code audit;
- cryptographic design review;
- protocol/consensus review;
- penetration test;
- recovery exercise;
- all critical/high findings resolved or explicitly risk-accepted by humans.

Current status: **NOT STARTED**.

## Gate 5 — Legal/mainnet decision
Required:
- applicable legal/regulatory analysis;
- custody/service model fixed;
- user-risk disclosures;
- operational incident process;
- security audit publication strategy;
- explicit human decision to proceed.

Current status: **NOT STARTED**.

## Absolute blockers
Never progress while any of these is true:
- known exposed server/private key;
- critical unresolved vulnerability;
- arbitrary mint path;
- possible replay/double-spend in the target protocol;
- one key controls reserve funds;
- Quant can sign;
- recovery has never been tested;
- token/blockchain/trading flags enabled by accident.
