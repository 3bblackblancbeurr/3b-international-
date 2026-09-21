# Unreal consolidation status — 21 September 2026

## Decision

`unreal/ThreeBWorld` is the single canonical Unreal Engine 5.8 project.

`unreal/3BWorld` is frozen as a historical migration source until the canonical project has been opened and compiled successfully in Unreal Editor 5.8. It must not receive new runtime or gameplay work.

## Migrated into the canonical project

- `Data/Canonical/**`: versioned mirrors of the web-world canon.
- `Data/Contracts/**`: Passport, City, bootstrap and WorldState schemas.
- `Data/Production/**`: acceptance tests, asset/audio/cinematic/VFX manifests, crowd budgets, transport, layout and slice state machine.
- `Scripts/build_metropolis_blockout.py`.
- `ThreeBDataContracts.h`: passive typed data contracts only.
- historical planning documentation under `Docs/Production/` and `Docs/Legacy/`.

## Deliberately NOT migrated

The legacy `ThreeBBackendSubsystem` and `ThreeBBackendContract` are not copied into the canonical runtime.

Reason: that subsystem expects a publishable key plus a reusable Supabase user access token inside the Unreal client. The canonical architecture instead uses:

Application 3B -> authenticated launch request -> 90-second one-time ticket -> Unreal redemption -> dedicated hashed Unreal session.

Maintaining both backend models would create two authorities and weaken the security boundary.

## Security hardening performed during consolidation

- custom protocol no longer includes an `api=` parameter;
- GameInstance ignores API-host overrides in launch URLs;
- native ticket redemption is pinned to the configured production 3B Supabase origin;
- no service-role secret is introduced in client source;
- server authority remains required for progression/economy/rewards.

## Exit criteria before deleting the legacy folder

Do not delete `unreal/3BWorld` until all conditions below are verified:

- UE 5.8 Editor target compiles;
- Client target compiles;
- Server target compiles;
- canonical JSON/contracts are consumed or deliberately superseded;
- blockout script executes in Unreal Editor;
- France Open World map is created with World Partition;
- launch-ticket redemption succeeds end-to-end;
- no required document or contract exists only in the legacy folder;
- CI contract tests are green.

## ACTION UNREAL EDITOR RESTANTE

These cannot be truthfully marked complete from Git/Supabase alone:

1. open `unreal/ThreeBWorld/ThreeBWorld.uproject` in UE 5.8;
2. compile Editor/Client/Server targets with the installed toolchain;
3. create the real France Open World map;
4. enable and inspect World Partition, HLOD and Data Layers;
5. create binary assets/Blueprints/StateTrees/animations/materials;
6. run PIE/network tests;
7. package a signed Windows build and register `threebworld://`.

Until those checks are executed, Unreal status is **implemented/prepared, not Gold Master**.
