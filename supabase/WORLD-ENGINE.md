# World chapters: deployment and data

The web client and Edge Function use the same pure command reducer. The server authenticates the JWT against Auth and verifies that its session is still active. Production `world-engine` keeps gateway `verify_jwt: true`, in addition to the session check inside the function; anonymous requests receive 401. Preserve that setting when replacing the function.

1. On a new installation, apply the reviewed world-engine/economy migrations before promoting the matching frontend. Existing production already has `member_world_state`, `member_world_devices`, and `world_commit_v2`; do not reapply migrations for a reducer-only update. Existing account saves and the legacy table are retained, and browser write privileges stay restricted.
2. Run `node scripts/prepare-world-engine.mjs /absolute/path/outside/repo/deployment.json`. Upload **every file in the generated dependency graph** as `world-engine`, entrypoint `index.ts`, import map `deno.json`, with `verify_jwt: true`. The graph grows with shared gameplay dependencies; it is not a fixed list of eight files.
3. Publish the frontend only after the function and SQL are ready. Old clients retain local copies but must reload to resume account synchronization.

Account state is calculated from commands, never from client XP totals or inventory. Receipts are scoped to user and device, with atomic revision checks. Persistent per-tab journals replay unfinished actions safely after interruptions. A guest game remains separate on that device; importing arbitrary guest JSON into server-owned account inventory is intentionally unsupported. Prior server saves are preserved as legacy data.

Before an update, retrieve the current deployed function's complete source and settings into a private local rollback artifact. Compare the new canonical package, test existing-save normalization and command replay, and deploy the backend before its matching client. See [the October 18 release procedure](../docs/world-release-readiness-20261018.md) for the observed production versions, quota constraint, and rollback order.

The walking budget rejects impossible speeds, but does not prove physical location. This private adventure does not provide anti-bot attestation, trading or competitive multiplayer. World XP and shards never convert directly into financial loyalty points. Existing loyalty session limits and verified purchase webhooks remain authoritative.

Validation: `node --test tests/*.test.js` and `node node_modules/vite/bin/vite.js build --configLoader native`. Tests cover the complete eight-country campaign, every puzzle, repeated reward rejection, offline and concurrent journal recovery, frame-rate-independent movement, and routes using the exported Blender collisions. Use disposable accounts for remote authentication, isolation and idempotency checks; never commit their credentials.
