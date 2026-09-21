# Unreal story-state backend — service-only boundary

## Status

The database foundation is live. It is **not a client write API**.

Tables:
- `world_unreal_story_state`: current trusted snapshot per user/slice;
- `world_unreal_story_receipts`: append-only idempotency/audit receipts.

RPC:
- `world_unreal_story_commit_server`.

## Access

`anon` and `authenticated` have no table access and cannot execute the RPC.

`service_role` can:
- SELECT/INSERT/UPDATE story state;
- SELECT/INSERT receipts;
- execute the commit RPC.

It cannot update/delete receipts and cannot delete story-state rows through ordinary grants.

## Guarantees implemented

- bounded JSON object payload;
- slice/event allowlist-shaped identifiers;
- optimistic revision check;
- advisory lock per player+slice;
- unique event id;
- request-state SHA-256;
- exact idempotent replay;
- conflict if an event id is reused with different payload/context;
- immutable migration history.

## Important limit

This RPC assumes its caller is trusted. Therefore it must not be exposed directly through an Unreal client session.

A future dedicated-server/authority gateway must validate gameplay facts before calling it. That gateway is also responsible for the reward/outbox path. The persistence RPC deliberately grants no XP, inventory or Guardian Fragment.

## France integration

For `france_justice_v1`, the trusted state should minimally carry:
- phase;
- validated evidence ids;
- rescue outcome;
- Justice-trial outcome;
- Céliane liberation state;
- France world-state/Data-Layer state;
- reward receipt references after rewards are processed elsewhere.

The Unreal `GameState` is only the replicated runtime presentation of this authority; it does not replace the database revision.
