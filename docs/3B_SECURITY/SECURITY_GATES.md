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
Fortress branch status: all 74 third-party action references across the 19 audited workflows are pinned to immutable commit SHAs. Merge to `main` is still pending. Some branch-specific release workflows intentionally require `contents: write` and were retained after review.

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


## Gate 0 follow-up
Fortress branch verification now shows 19 workflows / 74 external action references with zero mutable action refs. This remains branch-only until PR review and merge.

## Gate 1 follow-up
The disabled SQL token staging ledger is quarantined and fail-closed. This does NOT satisfy Wallet/Testnet gates and does not authorize a cryptocurrency launch.

## Platform prerequisite still open
Legacy PostgreSQL default privileges currently expose future newly-created objects too broadly unless each migration revokes them explicitly. Changing those owner-level defaults is blocked by the available connector permissions. Treat explicit REVOKE/GRANT review as a mandatory migration gate until the platform default is corrected.
