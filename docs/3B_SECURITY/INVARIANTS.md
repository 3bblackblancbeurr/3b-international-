# 3B Security Invariants — v0

These invariants are release gates, not product aspirations.

## Monetary
- total_supply <= MAX_SUPPLY.
- No hidden or administrator-only arbitrary mint path.
- Mint/burn rules are deterministic and consensus-verifiable.
- Supply cannot become negative or overflow.
- SQL game balances are never authoritative 3BC balances.

## Transactions
- A transaction cannot be executed twice.
- A signed transaction cannot be modified without invalidating its signature.
- Every state-changing request has replay protection.
- Amounts and fees are bounded and deterministic.
- Invalid transactions are rejected consistently by honest nodes.

## Keys
- No private key or seed phrase in frontend, GitHub, Supabase, logs or analytics.
- No single key is sufficient to control the reserve.
- Key categories are separated: user, service, node, operator, Vault, recovery, CI/CD.
- 3B Quant never possesses a reserve signing key.

## Administration
A single compromised administrator must not be able to:
- drain the Vault;
- mint 3BC;
- change MAX_SUPPLY;
- replace consensus rules;
- erase critical audit history.

## Availability and recovery
- Loss of website, Supabase, Quant or one node must not make funds unrecoverable.
- Critical backups and recovery procedures must be tested.
- Cryptographic algorithms must be versioned and migratable.

## Current implementation gate
Until a dedicated testnet, key architecture, independent audits and legal review exist:
- token_enabled = false
- token_blockchain_enabled = false
- token_trading_enabled = false
