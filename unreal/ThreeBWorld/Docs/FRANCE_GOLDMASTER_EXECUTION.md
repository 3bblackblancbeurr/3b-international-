# France Gold Master — execution gate (UE 5.8)

This document defines the real validation path for the France vertical slice.

Source contracts, C++ code, JSON, Python preparation scripts and blockout actors are **PREPARED** work. They are not proof that France is a Gold Master.

## One Windows entry point

From the repository root, after Unreal Engine 5.8 is installed:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\unreal\ThreeBWorld\Scripts\run_france_goldmaster.ps1 -Mode Prepare
~~~

Optional engine override:

~~~powershell
$env:UE58_ROOT="D:\Epic Games\UE_5.8"
powershell -ExecutionPolicy Bypass -File .\unreal\ThreeBWorld\Scripts\run_france_goldmaster.ps1 -Mode Prepare
~~~

The runner:

1. locates UE 5.8;
2. compiles ThreeBWorldEditor;
3. compiles ThreeBWorldClient;
4. compiles ThreeBWorldServer only when a server-capable/source Engine build is available;
5. opens the canonical France map through UnrealEditor-Cmd.exe;
6. runs prepare_france_goldmaster.py;
7. runs the strict france_goldmaster_gate.py;
8. writes logs and evidence below Saved/3B/FranceGoldMaster.

A missing server-capable Engine build does not become a fake success. The runner writes compile_partial.json and leaves the full compile gate blocked.

## Evidence model

Canonical gate definitions:

Data/France/france-goldmaster-gates-v1.json

Generated evidence:

Saved/3B/FranceGoldMaster/Evidence/

Generated report:

Saved/3B/FranceGoldMaster/france_goldmaster_report.json

Allowed gate states:

- PASS — real evidence exists and passed;
- PREPARED — source/blockout preparation exists but is not final proof;
- BLOCKED — required proof has not been produced yet;
- FAIL — a real validation was run and failed.

FRANCE GOLD MASTER is valid only if **every required gate is PASS**.

## World Partition, HLOD and navigation

The runner prepares the UE 5.8 World Partition builder flow. It refuses the final HLOD/navigation build until final-art evidence exists for geometry, underside/caverns, architecture, vegetation and water.

When those prerequisites are proven:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\unreal\ThreeBWorld\Scripts\run_france_goldmaster.ps1 -Mode WorldPartition
~~~

That path invokes:

- WorldPartitionHLODsBuilder;
- WorldPartitionNavigationDataBuilder.

Successful commandlet output writes hlod.json, navigation.json and world_partition.json.

## Final AAA evidence that still requires Unreal

The strict gate intentionally remains blocked until real Editor/PIE captures prove:

- final Nanite geometry and cliffs;
- final underside and caverns;
- final architecture, façades and furniture;
- final vegetation;
- native Water System and waterfall materials;
- Niagara mist/rain/waterfall VFX;
- real NPC models, animations and StateTrees;
- final Céliane;
- navigation on all intended levels/routes;
- final Lumen lighting;
- spatial audio;
- cinematics;
- generated World Partition/HLOD;
- single-player PIE;
- multiplayer/reconnect PIE;
- CPU/GPU profiling;
- packaged Client;
- packaged Server;
- clean client/server smoke test.

## Dedicated Server requirement

The repository already contains:

- ThreeBWorldClient.Target.cs;
- ThreeBWorldServer.Target.cs.

The UE 5.8 dedicated-server workflow is not treated as validated merely because those files exist. The server compile/package gate must be produced on an Unreal Engine build that supports the dedicated-server workflow. If an installed Engine build cannot do that, the evidence stays blocked.

## Safety rule

Do not add hand-written PASS evidence just to clear the report.

Evidence JSON is an execution record, not a checklist. A gate should only become PASS after the corresponding Unreal command, PIE test, profiling session or packaged-build smoke test actually succeeds.
