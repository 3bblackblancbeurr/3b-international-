# 3B Fortress Incident Runbook — v0

Order for every incident:
**DETECT -> CONTAIN -> REVOKE -> RECOVER -> VALIDATE -> RETURN TO SERVICE**

## Severity
- SEV-0: suspected reserve/private-key compromise or arbitrary mint capability.
- SEV-1: service-role/admin compromise, auth bypass, cross-account data access.
- SEV-2: contained abuse, DoS, telemetry spam, dependency issue without confirmed privileged access.
- SEV-3: low-impact misconfiguration or hardening gap.

## GitHub/CI compromise
Contain:
- freeze releases;
- revoke/rotate deployment credentials reachable from CI;
- compare deployed artifact against last trusted source;
- disable write-capable workflow paths if needed.

Recover:
- restore from trusted commit;
- re-issue credentials;
- require clean rebuild;
- verify provenance before deployment.

## Supabase/service secret compromise
Contain:
- disable affected service route if necessary;
- rotate the secret;
- review audit/auth logs;
- verify RLS/grants did not change.

Validate:
- test account A cannot read/write account B;
- retest privileged RPC ACLs;
- reconcile ledgers/rewards.

## User wallet key compromise
Future protocol requirement:
- server cannot magically recover or seize a wallet;
- recovery mechanism must be explicit in wallet design;
- compromised key must not imply Vault compromise.

## Vault signer compromise
Future protocol requirement:
- one signer is insufficient;
- quarantine the signer;
- rotate/reconstitute the threshold set according to ceremony;
- review all pending operations;
- do not resume until the remaining authorization set is proven safe.

## Quant compromise
Contain:
- revoke Quant service credentials;
- isolate analytics inputs/outputs.

Invariant:
Quant compromise must never require rotating reserve signing keys because Quant must not possess them.

## Consensus/cryptographic failure
Contain:
- stop optional bridges/exchanges/services;
- preserve ledger evidence;
- do not invent an emergency private backdoor.

Recover:
- execute the pre-agreed version/algorithm migration process;
- independent review before restart.

## Cloud outage
- application outage must not make private keys or reserves unrecoverable;
- restore services from tested backups;
- rebuild nodes from deterministic configuration/genesis where possible.

## Evidence
Never log:
- seed phrases;
- private keys;
- bearer tokens;
- full service secrets.

Preserve:
- timestamps;
- deployment SHAs;
- migration versions;
- transaction/ledger identifiers;
- relevant security events.
