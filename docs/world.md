# Le Monde du 3B

The former character overview at `#monde-3b` now opens a playable, lazy-loaded Three.js world. The other app routes and five existing games remain available. No ChatGPT session, model call, paid subscription or external game account is required.

## Content and play

- A central island connects France, Italy, Estonia, Turkey, Algeria, Tunisia, Morocco and Spain through eight spatially separated portals. Each country has its own palette, architecture, three memories, four encounters, a guardian and a return portal.
- Drag anywhere on the canvas for immediate movement; release to stop. A short tap sets a destination. Atlas routes and tap destinations use bounded A* navigation with collision-aware segment smoothing. Arrows/ZQSD/WASD, Shift and E are supported. Pause, pointer cancellation, second fingers and backgrounding do not leave movement held down.
- Encounters combine visible enemy intentions, strike/guard/concentration, equipment and a three-hit rhythm pact. Rare characters unlock after two memories. Guardians require three memories and at least one Ally. They become stronger as seals are earned.
- One Leader and up to three Allies combine five roles; at most one neutral 3B character can join the team. Terrain, Ambiance, Fragment, Stone, Energy, Support and up to three Traps have explicit exploration effects. This is an exploration adaptation, not a complete implementation of the 50-card tabletop duel.
- Five seals open the final portal. Eight complete the main journey. All 368 cards have an acquisition route through pacts, guardians, milestones, visits, memories, four missions per country or crafting.

## Source integrity

The 368 fiches, IDs, names, countries, source status, original statistics and rules come from the owner's shared **Dossier complet 368 cartes** workbook, the **V4 reconstructed** edition:
https://chatgpt.com/share/6aa29cdc-7494-83eb-b6e2-08dfe43badac

`scripts/import-world-catalog.mjs` imports its read-only extracted data into `src/world/cards-source.json`. The imported source does not claim to be the missing original master catalog. Original effects and rules remain visible beside the adapted game effects.

Twenty French character illustrations (C001–C020) were visually matched to sheets from:
https://chatgpt.com/share/6aa2a593-ed28-83ed-a23a-ba5e2e06c8d2

The four source sheets are converted to WebP without altering the characters. `art.js` supplies presentation crop regions; SVG viewBoxes frame portraits and show original cards on request. Printed prototype statistics are not the game model. The C013 prototype spells its name differently; the catalog's name, Gardien de Paris, is authoritative. Other cards use newly generated regional guardian emblems. No missing foreign character illustration is represented as recovered artwork.

## Progression and account

World XP and crafting shards are separate from account loyalty XP/points. A first pact gives 100 world XP/25 shards, a duplicate 35/12, a memory 45/15, a first guardian 250/100 and a mission 50/20. First final-portal opening gives 500/250. Level thresholds are `90 × (level − 1)²`, capped at level 50. Duplicate affinity increases every three copies, capped at +3 per equipped character.

The existing `useGameRewards` flow registers `world` with `member-hub`. Active play earns loyalty at the existing shared rate and daily cap (20 XP and one point per minute, capped at 600 XP/20 points across games per day). World saves and world XP cannot mint purchase or loyalty rewards. Purchase rewards still come only from the existing authoritative paid-order flow.

Guest progress is local. A new signed-in account can inherit the guest save. Each account has its own local cache and owner-only cloud row in `member_world_saves`; existing remote progress is read before any write. Revision-based compare-and-swap avoids blind overwrites. Failed writes retain a dirty local copy and retry; export/import is available in Pause.

Conflicting offline saves union collection/visited/memories/seals, retain maximum XP and conservative minimum shard balance, and use the latest loadout. Concurrent offline gains are not a transactional event ledger: avoid playing the same account simultaneously on several disconnected devices. Adventure progress is client-owned and is not suitable as authority for ranked play, trading or financial rewards.

The additive `supabase/world.sql` migration enables RLS tied to the existing active member session, enforces JSON/version/size limits and extends allowed games with `world`. The deployed `member-hub` shared game allowlist also includes `world`. No service-role key is shipped to the browser.

## Outdoor GPS

The explicit Activate GPS button requests foreground geolocation. Raw coordinates exist only in the in-memory distance tracker; they are not stored or sent to the account. Only aggregate accepted metres are saved. Accuracy over 35 m, jumps, long gaps and implausible speed are rejected. Each accepted 100 m reveals a country encounter; the player confirms being stopped before entering it. No real-world destination or street map is generated. Backgrounding and leaving the game stop the watch.

## Validation

- `node --test tests/*.test.js`: 76 tests, including existing games, touch input, member/shop/loyalty flows, all card acquisition categories, encounter completion, navigation around obstacles, save validation and GPS filtering.
- Production Vite build succeeds. Three.js and the game are loaded only on the world route. WebP originals total about 1.28 MB; the eight-region atlas is about 836 kB. Existing main-app and world chunks exceed the build's advisory 500 kB raw-size threshold; they are approximately 172 kB gzip each.
- Browser: all eight portal journeys and returns; a full France run (pact, three memories, equipment, guardian/seal); all-country passport rewards; collection filters/crafting; native modal focus/close; account login, guest transfer and saving a newly equipped card.
- Responsive browser frames: 390 × 844 portrait and 844 × 390 landscape. A drag moved Kaïs and the minimap position stayed unchanged after release. No mobile test harness is shipped.
- Disposable backend accounts: owner-only read/write, second-account and anonymous rejection, stale revision protection, oversized data rejection, world reward session, five real 15-second heartbeats awarding at least 20 loyalty XP and one point, then session closure.
- Physical outdoor walking and actual phone GPU performance have not been field-tested. WebGL-capable browser required; unsupported rendering shows a recovery message. This version has no multiplayer or augmented-reality camera.

## Release and rollback

### September 2026: 3D character and Nexus refresh

- Original Blender assets replace the Kaïs billboard throughout the eight worlds. The articulated, stylized black-and-gold character has 16 bones and separate `Idle`, `Walk`, and `Run` clips, heading interpolation and 180 ms animation crossfades. This is a modeled interpretation of the original outfit, not a photorealistic reconstruction. The external Meshy/Fal conversion attempt was refused because the connected account had exhausted its balance; no generated model from that service is used.
- `scripts/build-world-assets.py` reproduces the character and designed garden Nexus in Blender 4.5.9. Editable `.blend` sources are included in the task's deliverables. The script takes the model output directory and Blender source output directory after `--`. Exported GLBs are compressed using `@gltf-transform/cli@4.5.0 meshopt`; the bundled Three.js Meshopt decoder is lazy-loaded with the world. Character ~196 kB, garden ~2.03 MB, collision map ~1.8 kB; no external model CDN or runtime generation dependency.
- The Nexus has a compass plaza, fountain/orrery, eight stone arches, colored portal details, olive gardens, flower beds, benches, promenade joints and brass inlays. Blender exports the colliders used by navigation. Model meshes are combined by material. The individual country scenery retains its existing layouts; Kaïs, controls and performance changes apply in every country.
- Movement consumes distance in collision steps of at most 0.12 world units; route arrivals consume the remaining distance exactly. Frame times up to 250 ms retain real-time speed; longer stalls are capped to avoid jumps. Hidden-tab input and elapsed time are reset. Camera position and look target follow together. Pointer travel under 7 px is a dead zone.
- Graphical quality modes are local device preferences: automatic, fluidity, detail. Automatic resolution uses an on-screen pixel budget and sustained FPS windows rather than changing every frame. Fluidity disables dynamic shadows. Menus freeze the 3D render loop; resizing/settings still redraw once. Repeated terrain geometry is batched, UI calculations are memoized, and portal textures/GPU models are reused across countries. Character skeleton textures are disposed when changing region.
- Validation: 83 automated tests pass, including distance consistency at 15/30/60/120 FPS, arrival without oscillation, collision tunneling, pointer release/dead zone, quality limits, all eight exported gate paths and required skeletal animation clips. Browser verification covers the actual model load, animated travel, portals, quality controls, and 390×844 / 844×390 layouts. Desktop Nexus observed 60 FPS; this is not a physical-phone performance measurement or a guarantee across devices.

Publish through the existing GitHub → Vercel integration after checks. Keep production on the verified commit. Rolling back the frontend commit restores the old world page; the additive table/allowlist can remain without changing the old games or touching account balances. Do not roll back unrelated previous loyalty or shop work.
