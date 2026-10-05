# Hub reference art: reviewed Gold Master exceptions

Review date: 2026-10-05.

The user requested the reference city and its distinct buildings, landscape,
water and atmosphere to be completed and published. The release review retains
the existing authored Three.js material colors below. These exceptions are
limited to the 34 added source lines identified by `git diff origin/main
--unified=0` in the six files listed here. Each line has its own
`gold-master-allow` comment and a link to the relevant explanation.

This review changes comments only. All color values, material parameters,
geometry, animation, progression and resource ownership remain unchanged.
The Gold Master guard, its ignored paths, design tokens and interface controls
are unchanged. These exceptions do not authorize other hard-coded colors.

## Atmosphere

`src/world/art-direction.js`: the Hub-specific `CITE_ART` palette grades the
reference city's maritime lighting independently of the other realm palettes.
The retained sky, ground, fog, night and stone values are respectively
`#8bb9d2`, `#233b46`, `#5294ac`, `#071a2c` and `#a7b4b6`. They supply scene
lighting and fog inputs, which are also affected by daylight and weather.

## Botany

`src/world/hub/cite-vegetation.js`: foliage vertex colors distinguish palm,
cypress, pine and broadleaf canopies using `#4b6e42`, `#284c39`, `#2e5142` and
`#355c3e`. The existing vertex-height and seeded shade variations remain intact.

## Neutral multipliers

The retained `#ffffff` bases and fallbacks represent an identity color
multiplier in the Three.js material/instance pipeline. Changing them would tint
the authored vertex or instance colors a second time. This covers precisely:

- The foliage material in `src/world/hub/cite-vegetation.js`.
- Stone, roof and timber material bases in
  `src/world/hub/reference-gate-districts.js`.
- The initial instance-color fallback and the same fallback when visible
  instances are compacted by distance in that gate-district module.
- Rock and pine-needle material bases in
  `src/world/hub/reference-landscape-scene.js`.

## Gate palettes

`src/world/hub/reference-gate-districts.js`: each entry defines material colors
for a physical architectural family around a Hub portal. The review retains
these exact albedo and joinery palettes.

| Pavilion | Wall | Roof | Trim | Accent |
| --- | --- | --- | --- | --- |
| France | `#8d9898` | `#334c61` | `#cbb47c` | `#36516f` |
| Spain | `#a48968` | `#7b5543` | `#cdb786` | `#795449` |
| Morocco | `#947c62` | `#5b716c` | `#bfb087` | `#47717a` |
| Italy | `#aca98d` | `#7a6650` | `#c9bd94` | `#597766` |
| Turkey | `#8b8d91` | `#38576b` | `#d1b681` | `#485b76` |
| Tunisia | `#bebaa0` | `#416f82` | `#c5ae7c` | `#577da2` |
| Algeria | `#aca188` | `#6e7f6a` | `#c6b48a` | `#496b62` |
| Estonia | `#526b71` | `#243f52` | `#aab4a0` | `#41616f` |

## Gate materials

The same module retains four additional authored material colors: the local
metal fallback `#c5a56a`, blue glazing `#254a5b`, planted foliage `#355a42` and
the Estonian pavilion's timber inlays `#445c5c`. A supplied parent metal material
still takes precedence over the fallback. Existing physical material
roughness, metalness, clearcoat and daylight emission behavior are unchanged.

## Landscape materials

`src/world/hub/reference-landscape-scene.js`: the mineral, vegetation and
high-altitude vertex palette uses `#334955`, `#2b4c39` and `#8b9d9c`. The other
reviewed colors have these specific physical roles:

| Material role | Retained color |
| --- | --- |
| Wet coastal rocks | `#263f49` |
| Pine bark | `#4e4433` |
| Harbour hull/metal fallback | `#142b3a` |
| Harbour stone fallback | `#657d7b` |
| Harbour metal trim fallback | `#c6a66b` |
| Vessel glazing | `#224657` |
| Warm cabin emission | `#8b6741` |
| Harbour timber | `#5b5345` |
| Maritime beacon surface | `#80dcec` |
| Maritime beacon emission | `#44a3c4` |

Supplied parent materials continue to override the three fallback materials.

## Lake

The same landscape module retains `#12516b` for deep water and `#4b9199` for
shallow water in the Lac des Reflets shader. The shader uses these values with
its existing depth, normal, reflection, daylight and wave parameters.

## Network glass

`src/world/hub/platform-scene.js`: the existing restored-network emission
`#174963` and inactive emission `#000000` belong to physical Hub glazing.
The surrounding update line changed during the reference-city release, so the
guard sees it as added. This exception preserves those existing emission values
and their existing progression condition exactly.

## Transport paths

`src/world/scene.js`: `#567889` and `#d6b46a` are the metal albedos of physical
cable and rail paths. They retain the existing roughness and metalness and are
lit by the 3D scene. Interface buttons and route-selection styling use their
own existing design-system rules.
