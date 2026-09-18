# 3B Underground — Garage Showroom V2

This changes the real VehicleLabPreview, not a second game or a static mockup.
Source branch: chatgpt-underground-gold-master-landscape-20260919 (PR #74).
Reference: the two garage images approved in the conversation. They define lighting,
architecture and blue/charcoal graphic language, not a replacement car asset.
The actual Parisienne Montara candidate and existing proxy/production loaders remain.

## Corrected causes
- RectAreaLightUniformsLib initialized before rendering area lights.
- PMREM studio environment generated once. Metals/glass no longer reflect an empty black scene.
- Fixed ACES exposure multiplier 1.35, environment intensity 1.65, hemisphere 1.3.
- Neutral key/fill/top lighting; blue is an accent, not the only light source.
- Stationary showroom wheels no longer call the racing wheel-spin updater.
- Async model loads cannot install into a disposed/remounted scene.

## Applied Three.js lighting values
Coordinates are metres, Y up, car front at negative Z.

| Light | Position | Intensity | Width x height |
|---|---|---:|---|
| Key | -1.4, 2.8, -3.2 | 18 | 2.4 x 1.2 |
| Left fill | -2.8, 2.2, -0.6 | 9.5 | 1.8 x 1 |
| Right fill | 2.8, 2.2, 0.3 | 8.8 | 1.8 x 1 |
| Rim | 0.4, 2.4, 3.4 | 7.2 | 2.4 x 1.2 |
| 3 ceiling lights | Y 4.1 / Z -1.4, 0, 1.4 | 11.5 each | 4.5 x 0.35 |

These are Three.js runtime intensities, NOT the unlabelled 18000/9500 Unreal numbers
in the earlier brief. toneMappingExposure=1.35 is NOT +1.35 EV. No fictitious
Unreal actors or EV100 settings are written to this web game. Area lights do not
cast shadows; one bounded 1024px directional shadow anchors the vehicle.

## Room and controls
Real 3D walls, ceiling, sectional doors, glass partition, ceiling LEDs, floor bay,
workbench, cabinet drawers, tool trolley, hanging tools, wheels, 4 tires, compressor,
diagnostic stand, screens, detailing bottles, brake parts, extinguisher and vents.
Resin floor: roughness 0.26, metalness 0.02, specularIntensity 0.55.
Static objects merged by material, no network textures, no continuous PMREM capture.
Camera: front 3/4, front, rear, profile, existing detailed inspection presets.
Drag/orbit, pinch/scroll and buttons for zoom, recenter, optional 360 rotation.
Brightness slider 90–145%, saved locally; expanded landscape view.
Hidden/offscreen rendering suspended. Idle camera does not issue GPU draw calls.

## Validation
node --test tests/garage-showroom-v2.test.js validates scene objects, geometry
budget, lights, floor, camera/brightness bounds, disposal and integration contracts.
Garage Showroom V2 workflow renders the actual component and candidate with
Chromium software WebGL at desktop and landscape-mobile viewport sizes. Its output
is a browser test, NOT proof of 60 FPS, heat or ergonomics on a physical smartphone.
The full game remains a Gold Master candidate. No new final-car art is claimed.

Primary API references:
- https://threejs.org/docs/pages/RectAreaLightUniformsLib.html
- https://threejs.org/docs/pages/RectAreaLight.html
- https://threejs.org/docs/pages/RoomEnvironment.html
- https://threejs.org/docs/pages/PMREMGenerator.html
