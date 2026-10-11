# Gameplay freezes on Samsung

The app stays responsive while the 3D game stalls. This patch addresses three
verified implementation problems; it does not establish which one dominates on
the player's physical Samsung.

- Automatic quality previously reduced only the pixel ratio. Sustained overload
  now selects the Fluid budget for shadows, postprocessing, sky, crowds and
  streamed scenery too. Resolution recovers gradually; the scene stays Fluid
  until the controller reaches 0.94, avoiding a quick return to expensive work.
  Explicit quality choices remain available.
- Paris and regional buildings previously requested their large models on
  phones even in Fluid mode. High models now require the desktop capability
  gate. Mobile keeps the existing low models, buildings and collisions. A
  district that has been disposed stops starting queued requests; unavoidable
  responses already in flight release their resources on arrival.
- Premium aura, ring and refuge effects previously allocated new resources on
  ordinary save updates. Unchanged effects now persist, and their own resources
  are disposed immediately when replaced. Shared scene resources remain owned
  by the scene.

## Validation

Controller tests exercise actual exported shadow, AO, sky and streaming budgets.
District tests use the real district code with injected asset loaders to verify
request selection, LOD redistribution and disposal. Premium tests include 6,000
unchanged updates and resource disposal checks.

`scripts/verify-world-adaptive-quality-browser.mjs` exercises the real WorldPage
and Three.js scene in Chromium, in 844 × 390 landscape and 390 × 844 portrait.
Controlled slow-frame samples verify that the effective scene becomes Fluid,
shadows and AO turn off, resolution and population decrease, player position
is preserved, recovery has hysteresis, and manual modes remain stable.
The fixture blocks external player account traffic.

Browser rendering uses software WebGL. These checks verify behavior and
integration, not phone FPS, thermal stability or a complete absence of stalls.

Local result: 2,415 tests passed, zero failures; one unrelated native Swift test
was skipped because Windows has no Swift compiler. The production build passed.
Both phone orientation browser cases passed, and the screenshots were inspected.

## Physical device acceptance

Record the Samsung model, Android/browser or native app version, and displayed
app build. Test the published candidate for at least 30 minutes: run through the
Hub and countries, rotate the phone, fight, change missions, travel repeatedly
and resume after backgrounding. Capture long frames, FPS, resource counts and
any WebGL loss, both initially and after the device warms up. Confirm save/reload
and that resources remain bounded across repeated journeys before declaring the
reported freezes resolved.

Current users can select Pause → Graphismes et audio → Qualité graphique →
Fluide as an immediate workaround. The code changes require a frontend release.
