# France / Céliane / Justice — Gold vertical slice

## Purpose

France is the quality bar for the future Unreal client. The objective is not to build all eight countries quickly. The objective is to prove one complete, replayable and technically scalable territory.

The executable/data contract is versioned as `Data/France/france-justice-v1.json`. The shared framework is `UThreeBStorySliceDefinition`: reuse that framework for later territories, never the France content solution.

France is no longer treated as a flat district. The canonical blockout is `Data/France/france-blockout-layout.json` version 2 and represents a **single vertical world-mass** with surface, cliffs, interior targets, underside, floating islands, hydrology and directed vistas.

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

The player crosses the France Gate from the Nexus on a high cornice. France must be readable immediately as a massive suspended territory: city above and ahead, lower terraces, a monumental waterfall, clouds below some routes, and a distant Céliane destination.

The player must later be able to reach a route under France and look back at the mass above. That underside reveal is a mandatory anti-flat proof, not optional decoration.

## Vertical world contract

Eight altitude bands are prepared in the canonical layout:

- `celestial`;
- `high_city`;
- `main_city`;
- `terraces`;
- `lower`;
- `caves`;
- `underside`;
- `floating_islands`.

The contract contains:

- multiple thick world masses instead of one slab;
- explicit underside masses;
- four cavity/tunnel targets;
- five floating islands;
- 3D roads and vertical links;
- five directed vistas;
- a source-to-waterfall hydrology chain.

`Scripts/build_france_blockout.py` consumes this same canonical layout. It does not invent a second France architecture.

## Eight France districts

The vertical slice now reserves eight distinct districts in the same France region:

1. `france_centre` — civic/social heart;
2. `france_populaire` — dense local life, shops and workshops;
3. `france_ancien` — historic fabric, stairs, basements and secrets;
4. `france_residentiel` — homes, gardens and quieter life;
5. `france_artisanat` — workshops, utility architecture and lower terraces;
6. `france_culture` — archives, galleries and elevated views;
7. `france_monumental` — tribunal, Céliane ascent and major skyline;
8. `france_peripherie` — cliffs, forest, sources and lower-world access.

These districts are not eight separate maps. They are semantic/streaming/population partitions of one France world.

## Building and detail program

The blockout contract contains small, medium, large and iconic building masses. Final architecture still requires Editor/environment-art work.

Detail is planned at three simultaneous scales:

- micro — cracks, wetness, props, signage, tools, cloth and traces of life;
- meso — alleys, stairs, bridges, terraces, workshops, basins and arches;
- macro — cliffs, skyline, world masses, monumental waterfall, Céliane sanctuary, islands and cloud ocean.

Selected interiors are prioritized only when they serve missions, exploration or story.

## Population and routines

`Data/France/france-npc-dialogue-v1.json` now defines:

- population targets for all eight districts;
- near/mid/far simulation tiers;
- an active AI-controller budget;
- morning/day/evening/night routines;
- weather reactions;
- pre/post-liberation reactions;
- canonical story NPC roles tied to district and routine.

The intent is scalable population. Distant citizens must not keep expensive full AI controllers merely to preserve ambience.

## Hydrology

The blockout must preserve a logical chain:

`rain capture -> high source -> upper stream -> Justice basin -> monumental waterfall -> lower basin -> cloud fall`.

A waterfall is invalid if it has no source. The final waterfall requires dedicated Water/mesh/material/Niagara/audio work in Editor; the source contract and generator only establish geometry, path and validation targets.

## Weather, atmosphere and audio

`Data/France/france-presentation-v1.json` contains a cosmetic-only weather state machine:

- `CLEAR`;
- `GOLDEN_CLEAR`;
- `HIGH_CLOUD`;
- `LOW_CLOUD`;
- `LIGHT_RAIN`;
- `HEAVY_RAIN`;
- `STORM`;
- `POST_RAIN`.

Weather presentation can follow authoritative world state but cannot grant progression.

Altitude-specific environment profiles prepare wind, fog, cloud relation and audio for celestial, city, caves, underside and floating-island spaces.

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

Canonical story states remain:

- `Story_PreJustice`;
- `Story_JusticeCrisis`;
- `Story_CelianeLiberated`;
- `Story_Reconstruction`;
- `Story_PostLiberation`.

The persistent server state selects the durable story state. Data Layers visualize that state; Data Layers are not the authority.

The Editor asset contract additionally reserves system layers:

- `DL_BaseGeometry`;
- `DL_Water`;
- `DL_Vegetation`;
- `DL_Architecture`;
- `DL_Population`;
- `DL_WeatherVariants`;
- `DL_Cinematic`.

## Quality gates

France is not considered reusable as the template for the other countries until all of these are true:

- side view proves real thickness rather than a slab;
- underside is accessible/readable;
- at least one directed vista shows upper/current/lower altitude simultaneously;
- the monumental waterfall has a visible logical origin;
- no blocking traversal bug in a full playthrough;
- all critical interactions work with keyboard/mouse and controller;
- save/rejoin restores the correct story state;
- a disconnected/reconnected player does not duplicate rewards;
- no client-side action can mint global XP or inventory;
- World Partition streaming does not expose empty cells during the critical route;
- HLOD/pop-in is acceptable from principal vistas;
- rain/wetness does not destroy gameplay readability;
- Céliane reacts to major investigation/rescue outcomes;
- liberated state visibly changes the district;
- population navigation works across required vertical routes;
- 60 FPS is measured on the chosen reference profile after profiling, not assumed.

See `Data/France/france-justice-acceptance-tests.json`, `tests/france-vertical-world.test.js` and `Docs/FRANCE_SERVER_AUTHORITY.md`.

## Complementary preproduction contracts

The following files deepen France without claiming final Unreal assets exist:

- `Data/France/france-district-content-v1.json` — eight district identities, building catalog, activities, secrets, vertical connections and pre/post-Céliane deltas;
- `Data/France/france-district-missions-v1.json` — France-local district/exploration missions tied to the canonical Justice phases and server reward policy;
- `Data/France/france-npc-dialogue-v1.json` — population roles, routines, dialogue intents and memory authority;
- `Data/France/france-checkpoint-reconnect-v1.json` — last-known-good checkpoints, reconnect/CAS rules and anti-replay behavior;
- `Data/France/france-presentation-v1.json` — cosmetic-only weather, audio, altitude atmosphere, lighting, VFX and cinematic beats;
- `Data/France/france-nexus-handoff-v1.json` — one-time App→Unreal ticket, Nexus→France entry and persisted France→Nexus return;
- `Data/France/france-coop-session-v1.json` — authoritative party runtime, revive, proximity, shared objectives and reconnect invariants.

The Editor validator checks that contracts exist, share the canonical slice, and that the vertical blockout contract contains the required districts/underside/hydrology/vistas before checking future Unreal assets. It remains read-only.

## Editor execution order

`Data/France/france-editor-execution-plan-v1.json` defines thirteen ordered UE5.8 stages:

1. compile Editor/Client/Server;
2. worlds + World Partition;
3. story/region/district/mission data;
4. player/input;
5. Céliane;
6. system Data Layers;
7. story Data Layers;
8. vertical blockout + anti-flat captures;
9. hydrology/weather/audio;
10. population/navigation;
11. network persistence;
12. profiling;
13. packaging/smoke test.

A source contract can be **prepared** without being **validated**. Gold Master requires real external proof.

## ACTION UNREAL EDITOR RESTANTE

Git can prepare contract data, C++ types, tags, tests and Editor Python. Unreal Editor is still required to create or prove:

- `L_France_OpenWorld` as the real Open World map;
- World Partition cells and HLOD/proxy behavior;
- real Data Layer assets and state wiring;
- final cliff/rock/underside Nanite geometry;
- subtractive/interior cave geometry;
- final district architecture and interiors;
- Water assets, waterfall materials and Niagara spray/mist;
- weather actors/material wetness/volumetrics;
- navigation across the vertical routes;
- population Blueprints/StateTrees and real routines;
- Céliane mesh/animation/StateTree;
- Enhanced Input assets;
- traversal/Motion Warping assets where retained;
- real audio/Sequencer/cinematic assets;
- PIE network/reconnect validation;
- measured profiling;
- Client/Server packaging and clean-machine smoke test.

## What must not be copied to the seven other territories

Do not duplicate:

- France's evidence structure;
- France's rescue timing;
- France's district geometry;
- France's hydrology shape;
- France's Guardian behavior;
- France's city transformation.

Reuse engine systems, validation gates and tools — not the content solution.
