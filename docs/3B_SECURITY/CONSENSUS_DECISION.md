# 3BC Ledger / Consensus Decision Record — Draft

## Gate -1: Do we need a new blockchain?

Before comparing consensus algorithms, compare:

1. No blockchain:
   - keep XP/Coins server-side;
   - no 3BC real-value asset.

2. Token on an established L1/L2:
   - inherit mature consensus/security/tooling;
   - lower protocol risk;
   - smart-contract and bridge/custody risks remain.

3. Dedicated 3B chain:
   - maximum control;
   - maximum consensus, node, cryptographic and operational burden.

A dedicated chain is rejected by default unless a requirement cannot reasonably be met on an established network.

## PoW

Strengths:
- objective resource cost;
- battle-tested examples.

Weaknesses:
- energy/hardware cost;
- mining centralization pressure;
- finality trade-offs;
- heavy operational burden.

3B status: not preferred without a strong requirement.

## PoS

Strengths:
- lower energy than PoW;
- public validator economics possible;
- mature implementations exist.

Weaknesses:
- stake distribution and centralization;
- slashing/governance complexity;
- long-range/history issues require protocol handling.

3B status: candidate only if a dedicated public chain becomes justified.

## BFT / permissioned validator set

Strengths:
- fast deterministic/faster finality;
- suitable for isolated research/test environments;
- understandable fault thresholds.

Weaknesses:
- validator membership/governance centralization;
- liveness under partition depends on quorum.

3B status: reasonable for research/testnet simulations, not a mainnet decision.

## Hybrid

Hybrid designs can combine staking/committee selection/BFT finality, but add protocol complexity.

3B status: do not use complexity without a measured need.

## Current decision

### Product/runtime now
**No blockchain.**
XP, Coins, progression, inventory and Ville 3B remain server-authoritative application systems.

### If a real 3BC is later justified
The preferred architecture is **an established, independently audited L1/L2 ecosystem** rather than a new 3B chain.

Reasons:
- inherit an existing consensus/security model;
- avoid inventing validator economics and network security from zero;
- reduce cryptographic and operational surface;
- improve wallet/tooling/audit interoperability.

The exact network is **not selected yet**. Selection requires documented comparison of security, finality, fees, wallet support, custody options, EU/France compliance implications, upgrade governance, bridge dependency and ecosystem maturity.

### Dedicated 3B chain
**Rejected by default.**
A dedicated chain may only be reconsidered if a concrete requirement cannot reasonably be met on an established network and an independent protocol/security review approves the rationale.

No 3BC consensus implementation is currently authorized.

Before any value-bearing testnet code:
- Wallet Gate complete;
- Vault Gate complete;
- cryptographic suite draft independently reviewed;
- threat model updated for the selected ledger/network model;
- network/chain decision recorded with evidence;
- testnet has zero monetary value and unique chain/network domain;
- testnet and production key material can never be reused.
