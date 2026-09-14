# 3B Underground — Visual Production Bible V1
## France Gold Master — environment only

Final vehicle models are intentionally out of scope. France is the visual reference for the other seven territories.

## North star
Luxury night racing + cinematic speed + monumental 3B symbolism + physically credible materials + restrained Matrix blue/champagne-gold accents. The environment must look good in motion at racing speed, not only in screenshots.

## Hard rules
- 60 fps reference target: 16.67 ms/frame.
- Road readability beats decoration.
- No uniform mirror-wet asphalt.
- No neon-everywhere cyberpunk look.
- One main focal point per major composition.
- Gold and Matrix blue remain accents.
- Vehicle meshes stay as proxies until environment systems are approved.

## Runtime budget
Working 60 fps allocation: game CPU 3.0 ms; render submission 2.0 ms; GPU geometry 3.5 ms; GPU lighting/shadows 4.5 ms; GPU post/VFX 1.8 ms; reserve 1.87 ms.

4K output is 8.29 Mpx. A 67% internal scale is about 3.72 Mpx, roughly 55% fewer shaded pixels. Saved GPU time is spent on lighting, shadows, material response and VFX.

## France visual chapters
1. Quartier Héritage — 0–14%: noble stone, warm windows, restrained wetness.
2. Quais de Justice — 14–29%: river, bridges, skyline depth, broken-circle glimpses.
3. Anneau Métropolitain — 29–43%: stacked roads and high-speed structural rhythm.
4. Tunnel des Lumières — 43–56%: warm-to-cold lighting transition and strong exit reveal.
5. District Matrix — 56–69%: black glass/steel, sparse blue accents, no generic cyberpunk.
6. Route des Alpes — 69–86%: mountain silhouettes, fog pockets, viaduct opportunities.
7. Sanctuaire de Céliane — 86–100%: symmetry, plaza and monumental Broken Circle.

The journey must read without UI as: Héritage → water → speed → light → technology → altitude → Justice.

## High-speed math
At 200 km/h the player covers 55.56 m/s. Major visual beats every 500–800 m produce a new composition about every 9–14 seconds. Tunnel light spacing near 8 m produces roughly 6.94 light beats/s at 200 km/h.

Suggested curve radii for the alpine zone: fast 150–300 m; medium 70–150 m; hairpin 20–50 m.

## Asset registry
Road kit: 2-lane and 3-lane straights; fast/medium curves; hairpins; ramps; bridge/tunnel decks; shoulders; curbs; lane/edge markings.

Tunnel kit: straight/curved shells; heritage and modern portals; frame modules; service ceiling; warm/cold luminaires; emergency niches; drainage.

Bridge/interchange kit: concrete and steel pillars; deck edges; barriers; hero arch/suspension parts; maintenance walkways; sign gantries.

Building kit: modular Socle × Corps × Corniche × Toit. A 5 × 8 × 4 × 5 set yields 800 combinations from 22 major modules. Families: heritage stone, mixed urban, glass business district, industrial/service, alpine roadside, sanctuary monumental.

Hero assets: Broken Circle France; Céliane sanctuary plaza; Tunnel des Lumières portals; Quais hero bridge; Matrix tower cluster; alpine viaduct.

## Texel and texture targets
Near/hero readability target: hero 512 px/m, near 256 px/m, mid 128 px/m, far 64 px/m. In final UE production, 4K is reserved for hero close surfaces; 2K standard environment; 1K small props. High source polygon counts belong to Nanite hero assets, not to every background prop.

## Master materials
M_Asphalt_Master, M_Concrete_Master, M_Stone_Heritage, M_Metal_Black, M_Glass_Night, M_Water_River, M_RoadPaint, M_Emissive_3B, M_WetnessOverlay, M_SnowIce_Alps.

Asphalt channels: base color, macro variation, roughness, normal, cracks, repaired patches, tire wear, wetness, puddles, oil/contamination and road paint.

Wetness rule: roughness = R0 × (1 − 0.55W), with a physical minimum. Puddles are a separate local mask.

## Lighting bible
Dark but readable. Separate foreground, midground and skyline. Heritage/tunnel warm sources: roughly 2800–3500 K; neutral infrastructure 4000–5000 K; Matrix modern 5000–6500 K.

Presets: FR-L01 clear night; FR-L02 wet night; FR-L03 heavy rain; FR-L04 alpine fog; FR-L05 Céliane sanctuary. Tunnel exposure transitions are authored; no violent auto-exposure pumping.

## Broken Circle
Target visual balance: 75% dark structure, 20% champagne-gold internal light, 5% Matrix-blue energy. It must work first as a distant silhouette, then as the final monument.

## VFX bible
Rain is layered: distant volume, camera-near streaks, headlight-visible streaks, surface impacts and tire spray. Spray intensity is proportional to normalized speed × wetness × local puddle contribution; a dry road produces no spray. Fog exists for depth separation, never to hide weak art. Nexus particles are rare and localized.

## Camera
Gameplay priorities: road readability, sense of speed, environment showcase, stability. Dynamic FOV target is approximately 64° at low speed to 74° at very high speed, smoothly interpolated. Camera lag remains small and speed-dependent.

## UI/HUD
Black translucent base, white primary data, Matrix blue system data, gold only for high-value states (Guardian, Fragment, mastery, final result). HUD must never cover the apex or route direction.

## Streaming / LOD / HLOD target
Immediate high quality: 0–250 m. High/medium: 250–700 m. Silhouette/hero: 700 m–3 km+. Broken Circle and major skyline landmarks stay visible at long distance.

For final native production use Unreal Engine 5.8 with Nanite, Lumen, Virtual Shadow Maps, TSR/DLSS/FSR, World Partition/HLOD, PCG and Niagara. The current Three.js/WebGL version is the playable visual prototype and art-direction validator; it cannot equal native UE Nanite/Lumen fidelity by itself.

## PCG policy
Procedural generation may distribute secondary repetition: trees, lamps, background facade variants, rocks and roadside dressing. It must not decide hero composition, boss framing, landmark placement or racing-line readability.

## Quality gates
Reject a scene if: road direction is unclear at speed; wet road is a uniform mirror; bloom hides material detail; fog hides emptiness; all lights share one color/intensity; there is no focal point; silhouettes collapse; texture density visibly conflicts; high-speed motion shimmers/pops; or the world only reads as 3B when a logo is visible.

## Gold-master review
Every France zone must pass: still-frame beauty; 200 km/h readability; 300 km/h stress; dry/wet comparison; tunnel exposure transition; material close-up; long-distance silhouette; low/medium/high/ultra scaling; mobile/web fallback; and the 60 fps reference budget.

## Production order
1. Road master and markings.
2. Lighting/exposure baseline.
3. Tunnel des Lumières gold-master segment.
4. Quais, water and bridge.
5. Heritage modular kit.
6. Matrix modular kit.
7. Alpine silhouettes/fog.
8. Céliane sanctuary and Broken Circle.
9. Rain/spray/weather pass.
10. Decals and secondary dressing.
11. Performance/HLOD pass.
12. Cinematic camera pass.
13. Only then: final vehicle art.

## Definition of done
France V1 is accepted only when all seven zones are recognizable without labels; transitions feel continuous; route stays readable at speed; wetness is spatially varied; the Broken Circle works at long and close range; quality profiles remain scalable; vehicle proxies can be replaced without touching environment systems; and gameplay naturally produces at least five screenshot-worthy compositions.
