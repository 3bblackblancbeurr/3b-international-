# France / Justice — server-authority contract

## Principle

The Unreal client is a presentation and input client. Persistent story facts are authoritative only after a trusted server path validates them.

The client may show immediate local feedback, but it must not mint global XP, inventory, a Guardian liberation, the Justice Fragment, or a persistent France world-state.

## Event envelope for the future authoritative runtime

A trusted dedicated server should eventually submit a compact event envelope containing:

- event_id — globally unique idempotency key;
- player_id — canonical Supabase user id resolved from the Unreal session;
- party_id — optional authoritative party;
- slice_id — `france_justice_v1`;
- phase_id — current server-known phase;
- event_type — allowlisted event such as `france.rescue_resolved`;
- expected_revision — optimistic concurrency revision;
- evidence_refs — identifiers already validated by gameplay/server state;
- server_session_id — trusted game-server session;
- occurred_at — server timestamp.

The public client must never be allowed to supply a trusted `user_id`, global reward delta, inventory item, Guardian-liberated flag, or arbitrary next phase.

## Validation order

1. authenticate the trusted runtime;
2. resolve the canonical player identity server-side;
3. load current France revision and phase;
4. verify the event is legal from that phase;
5. verify required evidence/party/gameplay conditions;
6. apply one atomic transition;
7. enqueue rewards through the existing server reward/outbox pipeline;
8. persist world-state consequences;
9. write an immutable/auditable receipt;
10. return the new revision and state.

## Idempotence and races

Every persistent event needs a unique event id and one server receipt. Retrying the same event must return the same result or a safe duplicate response. Two competing revisions must not both advance the story.

## Current implementation boundary

The tracked `world-unreal-api` remains **candidate/read-only**. It supports only bootstrap and heartbeat and is intentionally not deployed as the write authority.

Do not add story-completion, reward, inventory or Guardian mutation actions to that endpoint until a trusted dedicated-server identity/proof contract exists.

## France persistent facts

At minimum the server snapshot must be able to reconstruct:

- current phase;
- validated evidence ids;
- rescue outcome;
- Justice trial outcome;
- Céliane liberation state;
- current France world state;
- reward/Fragment receipt ids;
- story revision.

## Client-safe facts

The client may own ephemeral presentation facts such as:

- current camera;
- UI panel;
- temporary VFX;
- unconfirmed interaction animation;
- local input buffering.

Those facts must never unlock global progression by themselves.
