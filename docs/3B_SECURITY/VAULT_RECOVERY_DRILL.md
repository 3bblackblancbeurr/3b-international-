# 3B Vault Recovery Drill — Non-production Plan

No real Vault or reserve exists yet. This plan defines the acceptance test that must pass before any real-value reserve can exist.

## Preconditions
- dedicated non-production signer material;
- isolated test environment;
- documented signer roster and independent failure domains;
- no production keys reused;
- observers record evidence without seeing raw shares/private keys.

## Scenarios to rehearse

1. One signer/device lost.
2. One signer suspected compromised.
3. One signer unavailable for an extended period.
4. HSM/MPC provider unavailable.
5. Two independent operator failures.
6. Recovery-factor compromise.
7. Geographic/site outage.
8. Policy database unavailable.
9. Algorithm-suite migration.
10. Operator replacement.

## Required evidence

For each scenario:
- start timestamp;
- incident classification;
- quorum/signer roles used;
- policy version;
- recovery steps;
- time to restore;
- whether unauthorized signing was possible;
- whether audit history remained intact;
- post-recovery signer inventory;
- independent reconciliation result.

Never record raw private keys, seed phrases or recovery shares.

## Pass criteria

The drill fails if:
- one person can reconstruct/control the reserve;
- CI/CD or an application server can sign;
- Quant/AI can sign;
- recovery requires copying raw private material through chat/email/tickets;
- the old compromised signer remains valid after rotation;
- recovery cannot be independently reconciled;
- testnet and future production material are not cleanly separated.

## Gate

A real Vault remains BLOCKED until at least one full dry-run and one surprise/fault-injection recovery drill succeed with non-production material and are independently reviewed.
