# 3BC Release Gates — Database-Enforced

Current production state: all 3BC flags are disabled and fail-closed.

## Gate table

`public.threeb_crypto_release_gate` is owned by the database owner and is not directly accessible to anon, authenticated or service_role.

Runtime services cannot mark security/legal gates as approved.

Approvals therefore require an explicit reviewed database migration.

## Testnet activation gate

Before `token_enabled=true`, the database requires:

- wallet_model_approved = true
- vault_strategy_approved = true
- crypto_suite_reviewed = true
- testnet_authorized = true

If any condition is false, the update fails with:

`3bc_testnet_gate_not_satisfied`

## Blockchain execution gate

Before `token_blockchain_enabled=true`, the database additionally requires:

- token_enabled = true
- vault_recovery_tested = true
- protocol_security_reviewed = true

Otherwise the update is rejected.

## Trading / real-value gate

Before `token_trading_enabled=true`, the database requires:

- token_blockchain_enabled = true
- external_audit_approved = true
- red_team_approved = true
- legal_mica_approved = true
- mainnet_authorized = true

This means a runtime service cannot accidentally turn on trading merely by updating a feature flag.

## Current state

All approval gates are false unless explicitly changed by a later reviewed migration.

Production flags remain:

- token_enabled = false
- token_blockchain_enabled = false
- token_trading_enabled = false

A live fail-closed test on 2026-09-20 attempted to set `token_enabled=true`; the database rejected it with the expected testnet-gate error and the flags remained false.

## Important distinction

A gate boolean is not evidence by itself.

Before a migration may set a gate to true, the PR must link the underlying evidence:
- wallet architecture review;
- Vault/recovery drill report;
- independent cryptographic review;
- protocol security review;
- independent audit;
- red-team report;
- legal MiCA/AMF memorandum.

No evidence -> no gate approval.
