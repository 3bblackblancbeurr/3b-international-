# 3B Key Management — Architecture Draft

This document defines separation rules. It does not create real keys.

## Key classes

| Class | Purpose | Online? | May sign reserve transfers? |
| --- | --- | --- | --- |
| User wallet | user transactions | normally device-local | no |
| Application service | API/service identity | yes | no |
| Node | node/peer identity | yes | no |
| Operator | privileged operations | controlled | no alone |
| Vault | reserve authorization | preferably offline/HSM | threshold only |
| Recovery | emergency reconstruction | offline | only through recovery policy |
| CI/CD | build/deploy | yes, narrowly scoped | never |
| Quant | analytics identity | yes | never |

Keys MUST NOT be reused between classes.

## User-wallet principles
- generate private material on the user device or a dedicated secure signer;
- transmit signed transactions, not raw private keys;
- never write seed/private material to Supabase, logs, analytics or GitHub;
- support explicit backup and recovery without making the application server a universal custodian;
- wallet-public-address may be linked to the Passport identity.

## Vault principles
The reserve must not have a single all-powerful key.

Target design must evaluate:
- multisignature;
- threshold signatures;
- MPC;
- HSM/hardware wallet combinations;
- geographic/organizational separation.

The exact threshold is **TBD after threat modelling**. A number must not be selected merely because it sounds secure.

## Authorization layers
A large reserve operation should require independent layers:
1. request;
2. policy/risk validation;
3. human/operator approval according to role separation;
4. cryptographic threshold approval;
5. delayed broadcast when policy requires it;
6. post-operation reconciliation.

## Recovery
Recovery material:
- stays offline;
- is not colocated with active signing material;
- is sealed/audited;
- has named replacement/rotation procedures;
- is tested with non-production material before any real value.

## Crypto-agility
Every cryptographic object should carry an explicit suite/version identifier.

The future protocol must support:
- introducing a new suite;
- accepting old + new during a controlled migration window;
- migrating accounts/validators;
- retiring an old suite;
- emergency response to a cryptographic break.

Do not invent proprietary cryptographic primitives.
