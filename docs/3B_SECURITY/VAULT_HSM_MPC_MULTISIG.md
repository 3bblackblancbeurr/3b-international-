# 3B Vault — HSM / MPC / Multisig Strategy Draft

No real Vault, signer or reserve key is created here.

## First principle

A single compromised person, server, CI credential or hardware device must not be enough to move a future reserve.

## Candidate architectures

### Hardware multisig
Advantages:
- simple mental model;
- independent devices/vendors possible;
- transparent approval threshold.

Risks:
- operational coordination;
- signer loss;
- malware/social-engineering around transaction review.

### HSM threshold
Advantages:
- strong isolation;
- policy-enforced signing;
- mature enterprise controls.

Risks:
- vendor/cloud concentration;
- cost;
- operational lock-in;
- HSM compromise or misconfiguration remains possible.

### MPC / threshold signatures
Advantages:
- no complete key in one place;
- flexible signer distribution;
- good fit for automated policy plus human approval.

Risks:
- protocol/library complexity;
- implementation/audit burden;
- recovery ceremony complexity.

### Hybrid
Potential pattern:
- MPC/threshold operational signer set;
- independent offline recovery quorum;
- HSM-backed shares where justified;
- human approval for large transfers.

Do not choose a threshold number before modelling the actual organization, operators and failure domains.

## Required signer separation

At least separate:
- operations;
- security;
- executive/governance;
- recovery.

CI/CD, Quant, analytics and ordinary application servers must never be reserve signers.

## Approval policy

Future reserve transaction flow:
1. create request;
2. deterministic policy check;
3. risk engine;
4. independent human approval(s);
5. threshold cryptographic approval;
6. optional delay for large transfers;
7. broadcast;
8. independent reconciliation.

## Recovery ceremony

Must be rehearsed using non-production material.

Document:
- signer replacement;
- lost signer;
- compromised signer;
- HSM/MPC provider outage;
- geographic disaster;
- algorithm migration.

No production reserve exists until a full recovery drill succeeds.

## Forbidden designs

- one hot wallet controls reserve;
- private key in application environment variables;
- seed phrase shared by the team;
- CI pipeline can sign;
- Quant/AI can sign;
- database administrator can directly mint or move reserve funds.
