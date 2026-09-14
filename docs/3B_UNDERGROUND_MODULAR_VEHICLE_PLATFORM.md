# 3B Underground — Modular Vehicle Platform V1

## Goal
Build every future 3B car as a modular platform, not as one welded mesh. The game already knows how to save tuning, parts, paint, stance, lighting, interior, audio, liveries and identity before any final vehicle model exists.

## Golden rule
A final car is an assembly:

`platform + chassis + body modules + wheels + lights + cockpit + audio + engine bay + materials + decals + tuning data`

No final car asset may require rewriting career, economy or save logic.

## Runtime contract already implemented
- Platform id: `u3b-modular-platform-s1`
- Platform contract version: 1
- 50 customization slots bound to named anchors
- 47+ explicit mounting anchors
- 18 material channels
- 7 decal surfaces
- mathematical stance transforms
- part/platform compatibility checks
- assembly resolver
- data-ready vs art-ready readiness report
- modular Three.js proxy that consumes the same customization data as future real meshes

## Coordinate convention
- +X = vehicle right
- +Y = up
- +Z = rear
- origin = chassis centerline near floor plane
- meters are the source unit
- all final assets must apply transforms/freeze scale before export

## Reference envelope S1
- length 4.35 m
- width 1.92 m
- height 1.27 m
- wheelbase 2.68 m
- front track 1.62 m
- rear track 1.64 m
- reference wheel diameter 0.68 m
- reference wheel width 0.255 m
- ground clearance 0.12 m

These values define the initial sports-coupe architecture, not the appearance of the future car.

## Required model hierarchy

```text
U3B_VehicleRoot
├── CHASSIS
│   ├── Floor
│   ├── FrontStructure
│   ├── RearStructure
│   └── CollisionProxy
├── EXTERIOR
│   ├── BodyShell
│   ├── FrontBumper
│   ├── RearBumper
│   ├── SideSkirt_L / SideSkirt_R
│   ├── Hood
│   ├── Roof
│   ├── Fender_FL / FR / RL / RR
│   ├── Spoiler
│   ├── Diffuser
│   ├── Mirror_L / Mirror_R
│   ├── Grille
│   ├── Exhaust_L / Exhaust_R
│   └── Handles
├── WHEELS
│   ├── FL / FR / RL / RR
│   └── Brake assemblies
├── LIGHTING
│   ├── Headlamp_L / R
│   ├── DRL_L / R
│   ├── Tail_L / R
│   ├── Fog_L / R
│   └── Turn_L / R
├── INTERIOR
│   ├── Seat_Driver / Passenger
│   ├── RearSeats
│   ├── SteeringWheel
│   ├── Shifter
│   ├── Dashboard
│   ├── Gauges
│   ├── Headliner
│   ├── FloorMats
│   ├── RollCage
│   └── Pedals
├── AUDIO
│   ├── HeadUnit
│   ├── Speakers
│   ├── Subwoofer
│   ├── Amplifier
│   └── TrunkInstall
├── ENGINE_BAY
│   ├── EngineCover
│   ├── Intake
│   ├── StrutBrace
│   ├── Hoses
│   └── Caps
└── IDENTITY
    ├── Plate
    ├── TowHook
    ├── Antenna
    └── Badges
```

## Anchor policy
Every replaceable object attaches to a named anchor supplied by `vehiclePlatform.js`. Future asset packs may override an anchor only with another registered anchor. Parts must never rely on hand-entered scene coordinates unique to a single save.

## Mesh rules
- body shell must not contain bumpers, mirrors, spoiler, headlights or wheels welded into the same mesh
- interior seats must be separate from the cabin shell
- steering wheel and head unit are separate modules
- engine bay show pieces are independent modules
- wheel/tire/brake assemblies are separate for all four corners
- glass is separate from opaque body panels
- emissive lenses are separated from lamp housings
- all replaceable pieces keep stable pivots

## Materials
Required channels:
- bodyPrimary
- bodySecondary
- accent
- carbon
- glass
- trimBlack
- metal
- rim
- caliper
- interior
- stitch
- headliner
- screen
- lightFront
- lightRear
- neon
- engineBay
- plate

The future material system must change color or finish without duplicating the mesh.

## Paint system
The paint shader must expose:
- base color
- metallic amount
- roughness
- clear-coat amount
- clear-coat roughness
- metallic flake scale/intensity
- pearl shift
- candy depth/tint
- satin/matte mode
- optional iridescence

One body mesh should support gloss, satin, matte, metallic, pearl, candy, chrome and iridescent finishes through parameters.

## Decal / livery surfaces
Supported logical surfaces:
- left
- right
- hood
- roof
- rear
- front
- glass

UV1 is reserved for paint/livery projection. UV2 may be used for glass decals and baked detail. Current save format supports 128 vinyl layers and 64 stickers.

## Wheel/stance contract
Stance is not baked into vehicle art. Runtime computes:
- ride height
- wheel diameter
- wheel width
- front/rear track
- front/rear camber
- front/rear offset

The mesh author therefore builds the car at neutral reference geometry. Extreme fitment is a runtime transform, not a separate car mesh.

## Lighting contract
Lighting must be split into housing + emissive elements so the game can independently customize:
- headlight style
- DRL signature
- rear-light signature
- fog lamps
- sequential indicators
- underbody zones
- cabin ambient zones

Neon is zoned front/rear/left/right and supports steady, soft, beat and chase modes.

## Interior contract
Interior quality must be sufficient to support cockpit inspection even if the main game is third-person. Replaceable components include seats, seat material, steering wheel, shifter/paddles, dashboard trim, gauges, headliner, mats, cage and pedals.

Seat materials must support fabric, Alcantara-like microfiber, leather, Nappa-style leather, carbon/leather and velvet-like finishes without changing seat geometry unless the seat family itself changes.

## Audio / multimedia contract
The game already treats these as real customization slots:
- head unit / radio / screen
- speakers
- subwoofer
- amplifier
- trunk installation

A future trunk view must reveal the selected installation. Audio hardware should therefore be physically modeled, not merely represented by menu text.

## Engine bay contract
Future cars must support opening/inspection of the bay with separate visual modules for engine cover, intake, strut brace, hoses and caps. Performance upgrade level and visual bay parts remain separate systems so a powerful engine can still use a restrained visual style.

## Performance vs visual parts
Performance upgrades affect simulation. Visual parts normally do not change PI unless an explicit future homologated aero/weight rule says otherwise. This prevents cosmetic freedom from breaking competition classes.

## LOD / Nanite intent for final UE production
For the future Unreal build:
- hero body/panel source geometry may be high-detail Nanite-capable geometry
- transparent glass, deforming tires and some moving mechanisms use appropriate conventional meshes where Nanite is unsuitable
- cockpit receives its own LOD strategy
- distant traffic can use baked/merged variants
- expensive interior geometry may be culled outside relevant camera ranges

## Pivot standards
- wheel pivot = wheel center
- steering wheel pivot = steering column axis
- hood pivot = hinge line
- trunk/hatch pivot = hinge line
- doors if later supported = hinge axis
- wipers = motor axis
- spoiler active elements = real rotation axes

## Export naming
Suggested convention:
- `U3B_S1_BODY_Hood_Street_A`
- `U3B_S1_BODY_BumperFront_Track_B`
- `U3B_S1_INT_Seat_Bucket_Carbon_A`
- `U3B_S1_AUDIO_HeadUnit_DoubleScreen_A`
- `U3B_S1_LIGHT_DRL_Pixel_A`

The runtime catalog references assets by logical part manifest, never by UI text.

## Future part manifest example

```js
{
  id: 'seat-bucket-carbon-a',
  slotId: 'seats',
  assetRef: '/vehicles/s1/interior/seat_bucket_carbon_a.glb',
  platformIds: ['u3b-modular-platform-s1'],
  materialChannels: ['interior','stitch','carbon'],
  anchorOverride: 'interior.seats',
  scaleRange: [0.95,1.05]
}
```

## Production gates before final vehicle #1 is accepted
1. all 50 slots resolve to anchors
2. chassis/collision/cockpit core assets present
3. zero floating gaps on stock configuration
4. all four wheels align with neutral stance
5. maximum/minimum stance creates no unacceptable clipping
6. every light channel independently controllable
7. all paint finishes work from one material family
8. decals align across required surfaces
9. seats, steering, radio and trunk audio can be swapped without editing the base mesh
10. engine-bay modules can be swapped independently
11. save/load reproduces an identical build
12. proxy can be replaced by final assets without changing career data

## What is intentionally NOT done yet
No final car silhouette, manufacturer, brand-like copied vehicle, final body design or production-quality car mesh has been created. That remains a later art phase. The platform exists now so the future original 3B vehicle can be designed once and still support extreme customization.
