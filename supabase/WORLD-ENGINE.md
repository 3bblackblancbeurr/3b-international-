# World chapters: deployment and data

The web client and Edge Function use the same pure command reducer. The server authenticates the JWT against Auth and verifies that its session is still active. Gateway `verify_jwt` is false because this validation is performed inside the function; anonymous requests receive 401.

1. Apply `world-engine.sql` before promoting the matching frontend. It copies existing account saves once, retains the legacy table, and removes old browser write privileges. Both new tables and `world_commit` are service-role only.
2. Run `node scripts/prepare-world-engine.mjs /absolute/path/outside/repo/deployment.json`. Upload these eight files as `world-engine`, entrypoint `index.ts`, import map `deno.json`.
3. Publish the frontend only after the function and SQL are ready. Old clients retain local copies but must reload to resume account synchronization.

Account state is calculated from commands, never from client XP totals or inventory. Receipts are scoped to user and device, with atomic revision checks. Persistent per-tab journals replay unfinished actions safely after interruptions. A guest game remains separate on that device; importing arbitrary guest JSON into server-owned account inventory is intentionally unsupported. Prior server saves are preserved as legacy data.

The walking budget rejects impossible speeds, but does not prove physical location. This private adventure does not provide anti-bot attestation, trading or competitive multiplayer. World XP and shards never convert directly into financial loyalty points. Existing loyalty session limits and verified purchase webhooks remain authoritative.

Validation: `node --test tests/*.test.js` and `node node_modules/vite/bin/vite.js build --configLoader native`. Tests cover the complete eight-country campaign, every puzzle, repeated reward rejection, offline and concurrent journal recovery, frame-rate-independent movement, and routes using the exported Blender collisions. Use disposable accounts for remote authentication, isolation and idempotency checks; never commit their credentials.
