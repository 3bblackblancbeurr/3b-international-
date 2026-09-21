# 3B World architecture

## Product split

The current 3B application is not replaced. It is the ecosystem and identity layer.

Application 3B
-> authenticated Passeport 3B
-> one-time launch ticket
-> ThreeBWorld Unreal client
-> server-authoritative world services
-> progression returned to the same user_id

The web Monde du 3B remains available during migration. Unreal is introduced as a second client, not as a destructive rewrite.

## Engine pillars

### Large world

Use World Partition from the first playable map. France must be authored as one coherent persistent world with streaming cells, Data Layers and HLOD rather than manually maintained sublevels.

Recommended Data Layers for the France slice:

- Base_France
- Story_PreJustice
- Story_JusticeCrisis
- Story_CelianeLiberated
- Combat_Encounters
- Population_Day
- Population_Night
- Weather_Dry
- Weather_Rain
- Cinematic
- Debug

This makes visible consequences possible without cloning the entire map.

### Gameplay

Gameplay Ability System owns combat, traversal abilities, Resonances, costs, cooldowns and replicated gameplay states.

Core attributes already exist:

- Health
- Stamina
- Focus
- Resonance

Gameplay Tags define the common vocabulary between C++, Blueprints, UI, animation, AI and networking.

### Input

Enhanced Input is the only input layer for the Unreal client. Contexts should be swapped at runtime for exploration, combat, vehicle, cinematic and accessibility/remap states.

### AI

Use StateTree for high-level NPC and Guardian state logic. Behavior Trees/EQS can remain useful for tactical combat where spatial queries dominate. Mass should be introduced only for distant/background crowds after profiling proves the need.

### Traversal

Traversal is an ability family, not hard-coded level scripting:

- sprint
- vault
- climb
- zipline
- swim
- dive

Motion Warping can align authored animations to world geometry. Every traversal action must expose gameplay tags so combat, camera, animation and replication agree on state.

### Visual language

The world should feel physical before it feels spectacular.

Priority order:

1. correct scale and silhouettes;
2. material roughness/normal variation;
3. contact shadows and believable lighting;
4. decals, wear, water, dirt and edge breakup;
5. vegetation and small prop density;
6. weather response;
7. disciplined Niagara accents;
8. cinematic effects only where story requires them.

Black, Matrix blue and champagne gold remain identity accents, not a filter painted over every surface.

### Rendering tiers

High-end PC/console can use Lumen, Virtual Shadow Maps and Nanite where the assets benefit from them.

Do not make those features the gameplay contract. Scalability profiles must preserve navigation, combat readability, collision and quest logic even when expensive effects are reduced.

### Multiplayer authority

The client may predict movement and abilities, but it must not award global XP, inventory, currency, Guardian completion or challenge rewards by itself.

The existing Supabase world/economy authority remains the source of truth until a dedicated Unreal server authority is proven and audited.

## Identity bridge

The app requests world-unreal-launch with the user's Supabase JWT.

The server:

1. validates the user and original auth session;
2. rate-limits the request;
3. generates a cryptographically random one-time ticket;
4. stores only its SHA-256 hash;
5. returns a threebworld:// launch URL.

Unreal receives the ticket and calls world-unreal-redeem.

The redeem endpoint:

1. rate-limits anonymous redemption;
2. hashes the ticket;
3. atomically consumes it;
4. verifies the originating Supabase auth session still exists;
5. returns the same user_id, derived Passeport id, country and world revision.

No reusable Supabase secret is passed through the URL.

## Territory data contract

UThreeBWorldDefinition keeps country content data-driven. Every territory specifies its Guardian, value, gameplay tags, entry world and one creative rule.

Canonical pairs:

- France — Céliane — Justice
- Algérie — Yliane — Loyauté
- Espagne — Diego — Passion
- Maroc — Naël — Noblesse
- Italie — Alessio — Espoir
- Tunisie — Soraya — Courage
- Turquie — Émir — Foi
- Estonie — Eira — Sagesse

The creative rule is mandatory: each country must have a distinct systemic hook, not the France mission with different art.
