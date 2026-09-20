# Independent Cryptographic Audit Scope — 3B / 3BC

This document defines the scope expected from an independent cryptography/security reviewer before any real-value 3BC launch.

## Independence

The reviewer must be independent from the implementation team and must disclose material conflicts of interest.

## Required review areas

1. **Wallet key lifecycle**
   - generation entropy;
   - secure storage;
   - backup/recovery;
   - device migration;
   - account switching;
   - key rotation;
   - compromise response.

2. **Cryptographic suite**
   - selected signature algorithm;
   - hashing;
   - KDF;
   - AEAD;
   - nonce handling;
   - randomness;
   - domain separation;
   - canonical serialization;
   - suite/version identifiers.

3. **Transaction envelope**
   - network/chain ID binding;
   - nonce/sequence rules;
   - amount encoding;
   - expiration;
   - malleability;
   - replay resistance;
   - duplicate detection.

4. **Vault**
   - HSM/MPC/multisig design;
   - signer independence;
   - recovery quorum;
   - policy bypass risks;
   - key rotation;
   - compromised signer containment;
   - CI/application/Quant isolation.

5. **Ledger/network choice**
   - if established L1/L2: integration assumptions, bridge/custody dependencies, contract risks;
   - if dedicated chain is ever reconsidered: consensus safety/liveness, validator economics, partition behavior, upgrade governance.

6. **Smart contracts**, if any
   - mint/burn authorization;
   - supply cap;
   - access control;
   - pause/emergency mechanisms;
   - upgradeability;
   - reentrancy/callback risk;
   - integer/precision handling;
   - event/accounting correctness.

7. **Recovery**
   - wallet recovery;
   - Vault recovery;
   - cryptographic migration;
   - algorithm deprecation.

## Required deliverables

- architecture review;
- threat-model review;
- algorithm/parameter review;
- test-vector review;
- implementation/library review;
- severity-ranked findings;
- explicit statement of assumptions;
- retest report after fixes;
- residual-risk summary.

## Release gate

No critical/high cryptographic finding may remain unresolved before mainnet.
Any accepted residual risk requires a documented human decision and rationale.

This audit does not replace legal review, penetration testing or operational recovery drills.
