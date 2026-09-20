# 3B Red Team / Penetration Test Scope

This scope is for an authorized independent assessment. It does not authorize testing against third parties or uncontrolled production systems.

## Target surfaces

### Identity/Auth
- registration/recovery flows;
- session fixation/hijacking;
- account switching;
- JWT/session replay;
- recovery-key abuse;
- authorization confusion.

### Supabase / API
- RLS/IDOR/BOLA;
- Edge Function gateway/custom auth;
- SECURITY DEFINER functions;
- Data API grants;
- rate-limit bypass;
- payload size/validation;
- replay/idempotency;
- privilege escalation.

### Economy
- double credit;
- duplicate purchase/refund;
- concurrent upgrade/build;
- negative balances;
- reward-cap bypass;
- outbox replay;
- risk-engine bypass;
- unauthorized feature-flag change.

### Ville / Monde
- forged progression;
- forged Souvenir/Gardien;
- cross-account City access;
- revision bypass;
- stale request replay;
- party/contribution abuse.

### Mobile/web
- local-storage/cache account bleed;
- token leakage;
- deep-link/session handoff;
- insecure logs;
- WebView/native origin abuse;
- tampered client requests.

### CI/CD and repository
- malicious workflow path;
- unpinned actions;
- dependency confusion;
- secret exposure;
- release provenance;
- branch/ruleset bypass.

### Future Wallet/Vault
Only after a non-production wallet/Vault exists:
- signer isolation;
- recovery abuse;
- unauthorized approval;
- threshold bypass;
- transaction substitution;
- replay/domain separation.

## Rules of engagement

- written authorization required;
- production destructive tests require explicit separate approval;
- no denial-of-service beyond agreed low-risk limits;
- no social engineering unless explicitly scoped;
- no access to unrelated third-party accounts;
- stop immediately on evidence of real private-key/seed exposure;
- preserve evidence without copying secrets unnecessarily.

## Deliverables

- reproducible findings;
- severity and exploitability;
- affected asset/version;
- proof of concept with minimal impact;
- recommended remediation;
- retest results;
- executive summary;
- unresolved residual risks.

## Release gate

Critical/high findings affecting auth, economic integrity, wallet signing, Vault control or arbitrary minting block mainnet.
