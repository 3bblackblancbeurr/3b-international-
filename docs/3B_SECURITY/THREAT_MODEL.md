# 3B Fortress Threat Model — v0

## Assets
1. User identities and sessions.
2. Game XP / Coins / inventory.
3. Future user wallet keys.
4. Future 3BC ledger state.
5. Future reserve/Vault keys.
6. Build and deployment credentials.
7. Security logs and recovery material.

## Trust boundaries
- Browser/mobile client -> Edge/API.
- Edge/API -> Supabase.
- Application identity -> future wallet.
- Quant -> Security Core.
- Security Core -> future transaction layer.
- Online services -> Vault/cold storage.
- GitHub/CI -> deployment environment.

## Primary threats and required controls

| Threat | Impact | Required prevention | Detection / recovery |
| --- | --- | --- | --- |
| Client compromise | forged requests | server authority, signed actions, no private server secrets client-side | anomaly detection, revoke sessions |
| Account takeover | user-data/fund loss | passkeys/MFA, short sessions, step-up auth | login alerts, session revocation |
| Supabase secret leak | RLS bypass | server-only secrets, rotation, least privilege | secret scanning, key rotation |
| RLS/IDOR flaw | cross-account access | ownership policies + tests account A/B | audit logs, automated RLS tests |
| Edge Function auth bypass | privileged API access | JWT/custom auth mandatory per route | rate limit, auth failure alerts |
| SECURITY DEFINER abuse | privilege escalation | empty search_path, minimal EXECUTE grants, input validation | advisors + function ACL audit |
| Replay/double credit | duplicated rewards | idempotency keys, unique constraints, atomic transactions | ledger reconciliation |
| CI/CD compromise | malicious release | least permissions, pinned actions, protected branch/reviews | provenance, rollback |
| Dependency compromise | code execution | lockfile, pinning, SBOM, audits | dependency alerts |
| Quant compromise | financial manipulation | Quant is read/analysis-only and non-signing | isolate service, revoke credentials |
| Single-key theft | reserve loss | threshold/multisig/HSM/cold storage | key revocation/recovery |
| Node compromise | incorrect state | independent validation, peer diversity | node comparison, quarantine |
| Majority/Sybil attack | consensus takeover | consensus-specific economic/network defenses | halt auxiliary services, recovery governance |
| Cryptographic break | signature/key failure | crypto-agility, versioned suites | migration procedure |
| Cloud outage | service loss | redundant nodes/backups/providers where justified | tested restore/failover |

## Rule

Every future design change must answer:
PREVENT -> DETECT -> CONTAIN -> RECOVER.

No component is considered trusted merely because it is internal.
