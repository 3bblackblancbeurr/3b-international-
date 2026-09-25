# 3B Fortress / Security Core

This directory is the security source of truth for the future 3BC architecture.

## Boundary

- XP / Coins / inventory: game economy only.
- Passeport 3B: application identity only.
- 3BC: future cryptographic asset, separate from SQL balances.
- 3B Quant: observation and risk analysis only; never a signer.
- 3B Vault: separate reserve/key-management domain.
- Security Core: policy and validation boundary.

No real-value 3BC, production wallet seed, private key, Vault key or HSM secret belongs in this repository or Supabase tables.

## Safety target

A compromise of one component must not be sufficient to:
- mint arbitrary 3BC;
- move reserve funds;
- change MAX_SUPPLY;
- bypass transaction validation;
- compromise user private keys;
- take control of the network.

## Current status

Foundation phase only. Token/blockchain/trading flags remain disabled.
The current SQL economy is not a cryptocurrency and must stay logically separate from future 3BC.
