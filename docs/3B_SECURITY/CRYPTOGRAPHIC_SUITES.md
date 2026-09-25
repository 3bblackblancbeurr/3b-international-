# 3B Cryptographic Suites — Draft / Crypto-Agility Plan

Do not invent proprietary cryptography.

## Suite registry

Every future cryptographic object must carry:
- protocol version;
- suite identifier;
- key type;
- signature/hash algorithm identifiers where needed.

Example draft identifier: 3B-SUITE-001-DRAFT.

## Candidate baseline components

Final selection requires external cryptographic review.

### Hashing
Candidate baseline:
- SHA-256 for deterministic identifiers / transaction hashing where appropriate.

### Key derivation
Candidate:
- HKDF-SHA-256 for deriving independent subkeys from high-entropy key material.

### Password-derived encryption
If a future encrypted export needs a human password:
- Argon2id with versioned parameters;
- authenticated encryption after derivation.

### Authenticated encryption
Candidates:
- AES-256-GCM where strong platform/hardware implementations exist;
- XChaCha20-Poly1305 where audited implementation and interoperability justify it.

Nonce reuse is forbidden.

### Digital signatures
Candidate to evaluate for a new standalone protocol:
- Ed25519.

If using an established blockchain/L2, use the chain's standard audited signature scheme rather than inventing a 3B-specific alternative.

### Key agreement
If required:
- X25519 candidate.

## Post-quantum readiness

Do not bolt an unreviewed PQ algorithm into v1.

Instead:
- version suites now;
- design migration paths;
- track standardized PQ signatures/KEMs;
- evaluate hybrid migration when ecosystem/tooling/audit maturity justifies it.

## Canonical serialization

Before signing:
- deterministic field ordering;
- unambiguous integer encoding;
- explicit network/version domain separation;
- no locale-dependent strings;
- test vectors.

## External review gate

No suite becomes production-approved until an independent cryptography reviewer validates algorithms, parameters, nonce handling, serialization, domain separation, key lifecycle and recovery.
