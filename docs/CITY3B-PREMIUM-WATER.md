# Créer ma ville — premium water, 4 October 2026

The city renderer now uses dedicated horizontal water geometry, rather than shaded box and cylinder tops. Lakes and rounded river segments share depth, shore distance and directional current sampled from their union. An interior segment junction therefore does not become an artificial shallow shoreline. Saved features, collision rules, roads, buildings, costs and progression are unchanged.

The shared shader combines two seamless mipmapped normal maps, broad wave slopes, angle-dependent Fresnel reflections, a procedural sand/pebble bed refracted by the surface normal, Beer–Lambert colour absorption, animated shallow caustics, soft sunlight and restrained shoreline foam. Bridge supports receive bounded foam contacts. The bed is a visual approximation inside an opaque shader: it is not simulated fluid, excavated terrain, or refraction of arbitrary underwater scene objects. There is no expensive full-scene refraction pass.

Static water is batched into one inland mesh and one ocean mesh, with a third mesh for damp mineral bank rims. At most two extra instanced draws add shoreline stones (96 on phone, 192 on desktop) and small reed clusters inside saved water footprints. Interior junctions omit these shore details. A spatial feature index bounds CPU union sampling. Generated textures require no external download. All geometry, materials, textures and reflection targets are disposed on map rebuild or scene disposal. The scenery atmosphere remains the fallback at every quality level.

Scene reflections use the Three.js Reflector oblique near-plane clipping path and a single shared reflection plane at the water level. The world-coordinate shader removes the Reflector-local transform from its texture matrix. Reflection captures hide the water, construction grid, placement ghost, utility overlay and completion effects, reuse existing shadow maps, and restore render target, viewport, scissor, XR, visibility and shadow settings in a finally block. An exception disables further reflection captures without interrupting construction. Half-float reflections fall back to unsigned-byte colour when the extension is unavailable.

| Profile | Desktop target / cadence | Phone target / cadence |
| --- | --- | --- |
| Detailed | 512 × 512 / at most 12 Hz | 256 × 256 / at most 5 Hz |
| Reduced | 256 × 256 / at most 6 Hz | 128 × 128 / at most 3 Hz |
| Fluid fallback | atmosphere only | atmosphere only |

The existing city render budget selects these profiles when it detects sustained overload. Hidden/background scenes do not capture; reduced motion freezes animation and refreshes reflections only after a camera or map change. These are configured limits, not measured guarantees of frame rate on a physical phone.

Validation: complete repository test suite and production build; targeted tests of all four starting maps, directional/reversed river flow, union depth at intersections, immutable input data, finite geometry, resource release on map switch, reflection matrix, capture cadence, reduced motion, renderer-state restoration and failure fallback. Sky and water shader compilation/linking and animated offscreen pixel changes were checked with an EGL Mesa llvmpipe context. This checks the shader on a software GL implementation; it does not replace WebGL browser review or a sustained test on Zakaria's physical Samsung.

Rollback: revert the isolated premium-water commit. No database migration or data recovery is needed.

Rendering references: https://threejs.org/docs/pages/Water.html and https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Reflector.js.
