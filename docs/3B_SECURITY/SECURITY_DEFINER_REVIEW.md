# SECURITY DEFINER Review — 2026-09-20

Supabase advisors intentionally flag any exposed SECURITY DEFINER function. A warning is not automatically a vulnerability; each exposed function needs a documented trust boundary.

## app_install_ping

Audience: anon + authenticated.

Reason SECURITY DEFINER is retained:
- telemetry table is server-only / RLS-closed;
- function accepts only install_id + bounded platform text;
- no sensitive rows are returned;
- caller IP is pseudonymized with SHA-256 before rate limiting;
- rate limit: 120 / 60 s per derived key;
- empty search_path.

Accepted warning: public telemetry endpoint.

## app_presence_ping

Audience: anon + authenticated.

Controls:
- session_id required;
- page/platform bounded;
- auth.uid() is read from request context when authenticated;
- no sensitive rows returned;
- pseudonymous IP-derived rate limiting;
- empty search_path.

Accepted warning: public presence telemetry.

## nexus_remove_building

Audience: authenticated only.

Controls:
- user identity = auth.uid(), never caller-supplied;
- city is selected by user_id = auth.uid();
- placement must belong to that city;
- expected revision check;
- request_id idempotence;
- row locking;
- economy transaction + wallet ledger + city journal;
- empty search_path.

SECURITY DEFINER is currently justified because the client must not receive direct write grants to the underlying economic/city tables.

## nexus_upgrade_building

Audience: authenticated only.

Controls:
- auth.uid ownership;
- city + placement ownership;
- revision check;
- idempotency request ID;
- global level verified server-side;
- wallet checked/debited server-side;
- audit ledgers;
- empty search_path.

SECURITY DEFINER retained intentionally.

## threeb_rarity_supply_status

Audience: authenticated only.

Read-only global aggregate:
- no user-controlled ownership input;
- returns rarity, cap, minted, remaining;
- underlying supply tables remain non-public;
- empty search_path.

SECURITY DEFINER retained to avoid exposing underlying inventory/supply tables.

## world_party_command

Audience: authenticated only.

Controls:
- auth.uid required;
- session_id from JWT and loyalty_session_valid;
- action allowlist;
- payload size limit;
- rate limiting;
- advisory lock for user membership;
- party row locks;
- max party size;
- contribution ownership from member_world_state;
- idempotent receipt request_id;
- empty search_path.

SECURITY DEFINER retained because direct table writes would be a larger attack surface.

## Review rule

Any future SECURITY DEFINER function in public must have:
1. caller classification;
2. auth/ownership check;
3. bounded inputs;
4. safe search_path;
5. explicit EXECUTE grants;
6. idempotence for value-changing operations;
7. rate limit where abuse is meaningful;
8. test coverage;
9. entry in this review or replacement by a safer architecture.
