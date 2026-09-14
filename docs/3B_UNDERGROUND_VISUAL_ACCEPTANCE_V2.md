# 3B Underground — Visual Acceptance Gate V2

## Target
The current web/Three.js build must reach a **credible 7.5/10 playable visual tier** before final vehicle art starts. This is an internal production target, not a claim of AAA parity.

## Weighted scorecard
- Environment composition & landmarks — 20%
- Lighting / exposure / color — 15%
- Materials / wet road / water — 15%
- Weather / atmosphere / VFX — 12%
- Road readability at 200–300 km/h — 12%
- Vehicle presentation / stance / lighting — 8%
- Camera / sense of speed — 8%
- HUD / cinematic presentation — 5%
- Runtime stability / adaptive quality — 5%

## Required features now implemented
### Environment
- seven France visual chapters
- hero architecture pass with heritage facades, quay walls, gantries, Matrix overpasses and alpine portal
- monumental Broken Circle / Céliane sanctuary
- close-range guardrails, reflectors and wet-road detail
- hero bridges, tunnel skin, Matrix tower detail, alpine trees/rocks and sanctuary columns

### Lighting & post
- ACES tone mapping
- dynamic exposure by zone
- warm/cool lighting language
- selective bloom on High/Ultra
- adaptive bloom/shaft/shadow pressure control when frame-time rises

### Wet weather
- non-uniform wet-road response
- puddle decals and repaired asphalt patches
- rain streaks, tire spray and road ripples
- wet light pools and quay reflection streaks
- high-speed atmospheric streaks

### Speed presentation
- dynamic FOV
- chase-camera lag, roll and micro-bob
- speed-aware vehicle light trails and wet road reflection glow
- animated wheels and stance-aware modular vehicle proxy

### Fluidity
- Low / Medium / High / Ultra presets
- dynamic internal resolution
- frame-time EMA feedback
- staged cinematic FX pressure governor
- expensive effects reduced before core readability is sacrificed

## Rejection conditions
The build is rejected if any of these occur persistently on the target device:
- road direction unreadable at speed
- large frame-time spikes caused by bloom or shadows
- uniform mirror asphalt
- tunnel exposure pumping
- skyline popping or strong shimmer
- excessive fog hiding geometry
- over-bloomed lamps destroying material detail
- camera shake obscuring apexes

## Current target rating after V5 pass
Internal production estimate: **7.5–8.0/10 for the playable web prototype on High/Ultra**, assuming a capable desktop GPU and the new adaptive governor. Mobile/low profiles deliberately trade effects for stability.

This is still below the generated cinematic concept target (about 8.5/10) and below a native Unreal Engine final build with authored 3D assets. Final validation requires real-device play and screenshots/video from the deployed build.
