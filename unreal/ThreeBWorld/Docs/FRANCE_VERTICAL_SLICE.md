# France / Céliane / Justice — Gold vertical slice

## Purpose

France is the quality bar for the future Unreal client. The objective is not to build all eight countries quickly. The objective is to prove one complete, replayable and technically scalable territory.

The executable/data contract is now versioned as `Data/France/france-justice-v1.json`. The shared framework is `UThreeBStorySliceDefinition`: reuse that framework for later territories, never the France content solution.

## Canonical story phases

1. `arrival` — Porte France and environmental read;
2. `human_problem` — conflicting human accounts;
3. `rescue` — movement + rescue under pressure;
4. `investigation` — physical, witness and institutional evidence;
5. `pressure` — hostile escalation;
6. `celiane_contact` — Céliane reacts to validated facts;
7. `justice_trial` — non-combat Justice resolution;
8. `liberation` — server-verified Céliane liberation;
9. `aftermath` — persistent district transformation;
10. `return_nexus` — return only after state is persisted.

The client can present local feedback, but phases marked server-verified cannot become durable because the client says so.

## Player promise

The player crosses the France Gate from the Nexus and enters a district where public trust has collapsed. Justice is not represented by a simple boss fight: the player must investigate, protect people, compare testimony, survive hostile pressure and make a decision that changes the district before Céliane can be liberated.

## Evidence model

Evidence is not a generic collectible count. France distinguishes:

- physical trace;
- witness statement;
- institutional record;
- validated contradiction.

Evidence ids used for persistent progression are server facts. A local client snapshot is not proof.

## Justice gameplay

Justice must have multiple functions:

- reveal a validated contradiction;
- link evidence;
- stabilize a dispute;
- protect a witness/civil.

At least one critical resolution must prove that weapons cannot bypass the Justice mechanic.

## Persistent world states / Data Layers

Prepare these canonical states:

- `Story_PreJustice`;
- `Story_JusticeCrisis`;
- `Story_CelianeLiberated`;
- `Story_Reconstruction`;
- `Story_PostLiberation`.

The persistent server state selects the durable story state. Data Layers visualize that state; Data Layers are not the authority.

## Level-design zones

The slice should contain a small number of memorable, interconnected spaces rather than a huge empty map:

- Gate arrival / transit edge;
- residential street;
- market or community square;
- civic archive;
- vertical rooftop route;
- emergency/rescue site;
- tribunal/civic landmark;
- Céliane confrontation space;
- post-liberation social hub.

## Quality gates

France is not considered reusable as the template for the other countries until all of these are true:

- no blocking traversal bug in a full playthrough;
- all critical interactions work with keyboard/mouse and controller;
- save/rejoin restores the correct story state;
- a disconnected/reconnected player does not duplicate rewards;
- no client-side action can mint global XP or inventory;
- World Partition streaming does not expose empty cells during the critical route;
- HLOD/pop-in is acceptable from the principal vistas;
- rain/wetness does not destroy gameplay readability;
- Céliane reacts to at least the major investigation/rescue outcomes;
- liberated state visibly changes the district;
- 60 FPS is a target on the chosen reference profile after profiling, not an assumption.

See `Data/France/france-justice-acceptance-tests.json` for the versioned acceptance matrix and `Docs/FRANCE_SERVER_AUTHORITY.md` for the write-authority boundary.

## Complementary preproduction contracts

The following files deepen France without claiming final Unreal assets exist:

- `Data/France/france-npc-dialogue-v1.json` — non-Guardian NPC roles, dialogue intents, persistent-memory authority and localization boundary;
- `Data/France/france-checkpoint-reconnect-v1.json` — last-known-good checkpoints, reconnect/CAS rules and anti-replay behavior;
- `Data/France/france-presentation-v1.json` — cosmetic-only audio, lighting, VFX and cinematic beats driven by authoritative story state.

These contracts are validated by `tests/france-preproduction-depth.test.js`. They prepare Data Assets/StateTrees/Sequencer work; they do not count as created .uasset content.


Additional runtime contracts prepare the real handoff and co-op validation before Editor work:

- `Data/France/france-nexus-handoff-v1.json` — one-time App→Unreal ticket, Nexus→France entry and persisted France→Nexus return;
- `Data/France/france-coop-session-v1.json` — authoritative party runtime, revive, proximity, shared objectives and reconnect invariants.

The Editor validator now checks that all France contracts exist and share the canonical slice before checking future Unreal assets. This remains preproduction evidence, not proof that the assets exist.

## Editor execution order\n\n`Data/France/france-editor-execution-plan-v1.json` defines the ordered UE5.8 stages and required proof for compile, worlds, player/input, Céliane, story layers, network/reconnect, profiling and packaging. It is a preparation contract only and cannot mark a stage validated by itself.\n\n## ACTION UNREAL EDITOR RESTANTE

Git can prepare the contract, C++ types, tags, tests and source data. Unreal Editor is still required to create/validate:

- the Open World France map;
- World Partition/HLOD cells;
- the five Data Layer assets and state wiring;
- Blueprints/Data Assets derived from the versioned contract;
- Céliane mesh/animation/StateTree;
- Enhanced Input assets;
- Motion Warping/traversal assets;
- real environment/material/audio/Niagara/Sequencer assets;
- PIE network tests and packaged build.

## What must not be copied to the seven other territories

Do not duplicate:

- the same evidence structure;
- the same rescue timing;
- the same boss geometry;
- the same traversal route;
- the same Guardian behavior;
- the same city transformation.

Reuse engine systems and tools, not the content solution.
