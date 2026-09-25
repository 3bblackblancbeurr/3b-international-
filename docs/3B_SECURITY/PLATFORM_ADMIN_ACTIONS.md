# Platform Admin Actions — 3B Fortress

These are platform controls that cannot be fully changed by the current GitHub/Supabase integration.

## Supabase Auth — leaked password protection

Current advisor status: disabled.

Official Supabase documentation says leaked-password protection is configured in Auth settings and uses the Pwned Passwords service. It is available on Pro plans and above.

Required human platform action:
1. Open Supabase project 3b discuter.
2. Auth settings → password security.
3. Enable leaked password protection if the current plan supports it.
4. Keep the application minimum at 12 characters or stronger.
5. Re-run Supabase security advisors.

This is a platform setting, not something to emulate in application code.

## PostgreSQL default privileges

### postgres owner
FIXED on 2026-09-20:
- future public tables: no anon/authenticated default grants;
- future public sequences: no anon/authenticated default grants;
- future public functions: no PUBLIC/anon/authenticated EXECUTE by default;
- service_role remains explicitly privileged.

Migration:
20260920165411_fortress_postgres_default_privileges_private_by_default.

### supabase_admin owner
Still platform-owned and legacy-wide.

Verified limitation:
- current_user = postgres;
- postgres is not a member of supabase_admin;
- it cannot alter supabase_admin's default ACLs.

Therefore every app migration must continue explicit REVOKE/GRANT review. Platform-managed objects may still inherit Supabase defaults.

## GitHub main protections

Verified:
- repository rulesets endpoint currently returns an empty list;
- branch-protection endpoint returns 403 to the installed GitHub integration because it lacks administration permission.

Required repository-admin action:
- create a ruleset targeting main;
- disallow force pushes;
- disallow deletion;
- require pull requests;
- require Fortress / World / Metropolis / Economy checks that are stable and non-flaky;
- require review approval only if a second trusted maintainer exists, otherwise a solo repository can deadlock itself;
- enable dismissal/re-review after new commits where practical;
- enable GitHub secret scanning / push protection when available for the repository plan.

## Evidence

Fortress CI adds an independent full-history high-confidence pattern scan, but this complements rather than replaces GitHub Secret Protection.
