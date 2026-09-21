# France / Céliane / Justice — Gold vertical slice

## Purpose

France is the quality bar for the future Unreal client. The objective is not to build all eight countries quickly. The objective is to prove one complete, replayable and technically scalable territory.

## Player promise

The player crosses the France Gate from the Nexus and enters a district where public trust has collapsed. Justice is not represented by a simple boss fight: the player must investigate, protect people, compare testimony, survive hostile pressure and make a decision that changes the district before Céliane can be liberated.

## Playable loop

### 1. Arrival

- short seamless transition from Nexus;
- camera reveals a dense rain-marked civic district;
- first objective is environmental, not a waypoint wall;
- player can inspect the environment before combat starts.

### 2. Human problem

Three witnesses disagree about the same event. The game stores what the player actually discovered instead of merely marking three collectibles.

Evidence categories:

- physical trace;
- witness statement;
- institutional record;
- contradiction.

### 3. Rescue

A civilian incident forces movement under pressure. This validates sprint, vault, climb, contextual interaction and a first non-combat use of a Resonance.

### 4. Investigation space

The player reconstructs a sequence from evidence. Wrong conclusions must change dialogue or route pressure rather than produce an arbitrary “wrong answer” screen.

### 5. Combat escalation

Combat validates:

- light/heavy actions;
- dodge;
- stamina;
- focus;
- animation reaction;
- cover/readability;
- server-owned completion state.

### 6. Céliane contact

Céliane is a character before she is a reward. Her StateTree must react to the player's evidence state, rescue result and prior choices.

### 7. Justice Resonance

Justice is a gameplay mechanic: reveal contradiction, stabilize a dispute, or expose a hidden causal link. It should solve problems that weapons cannot.

### 8. Guardian liberation

The climax combines investigation state, movement, combat and Resonance. No single damage bar can bypass the validated mechanics.

### 9. Visible aftermath

Use Data Layers and persistent state to transform the district:

- lighting and public spaces reopen;
- hostile checkpoints disappear or change ownership;
- NPC schedules/dialogue change;
- repaired infrastructure remains repaired;
- optional activities unlock;
- Céliane remains present in the world.

### 10. Return to Nexus

The same player identity receives the Justice fragment and the web application can display the progression after sync.

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

## What must not be copied to the seven other territories

Do not duplicate:

- the same evidence structure;
- the same rescue timing;
- the same boss geometry;
- the same traversal route;
- the same Guardian behavior;
- the same city transformation.

Reuse engine systems and tools, not the content solution.
