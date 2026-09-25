## 3B PR Checklist

### Scope
- [ ] Change is isolated and rollback path is known.
- [ ] No real secret, private key, seed phrase or bearer token is committed.
- [ ] No 3BC/mainnet activation is included unless all Fortress gates explicitly permit it.

### Database / Supabase
- [ ] New public-schema tables have RLS enabled.
- [ ] GRANTs are explicit; do not rely on legacy default ACLs.
- [ ] New privileged functions revoke PUBLIC/anon/authenticated EXECUTE unless intentionally exposed.
- [ ] SECURITY DEFINER functions have explicit schema-qualified objects and safe search_path.
- [ ] Migration is idempotent where practical.
- [ ] Supabase advisors reviewed after schema changes.

### Economy
- [ ] Idempotency key/event ID exists for value-changing operations.
- [ ] Concurrent requests cannot double-credit/double-spend.
- [ ] XP/Coins/3BC remain separate.
- [ ] 3BC flags remain disabled unless an explicitly approved security release.

### Client
- [ ] Client cannot choose user_id for privileged operations.
- [ ] Account switch clears account-scoped cached state.
- [ ] No server secret in React/Unreal/mobile assets.

### Verification
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Relevant mobile build passes.
- [ ] Fortress/security checks pass.
