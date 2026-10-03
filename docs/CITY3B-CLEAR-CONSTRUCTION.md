# Readable city construction and first-building correction

The first-building reward used one `idempotency_key` for both XP and Coins while production enforces `(user_id,idempotency_key)` uniqueness. The second insert rolled back the reward and its enclosing construction. Keep that index and the reward ledger; suffix each financial entry with its asset. Existing claimed rewards still return idempotently from the unchanged ledger. No balance or history is removed.

The regression fixture captures the production reward function before this correction, with the real unique index. It reproduces the failure, applies the additive migration, verifies both assets, retries once without an extra credit, and verifies rollback when the wallet fails.

The construction renderer treats automatic lighting as daylight. Explicit night is retained with brighter ambient lighting. A procedural sky gradient, sun disc, twelve cloud groups and four surrounding ocean strips require no large image downloads. Flat land needs only four vertices. With relief, land is a bounded heightfield, sampled at approximately four metres over the 1000 m map. Mountain and basin tools produce smooth elevation/depression; preview is translucent and the confirmed deformation persists in the city terrain JSON. Terrain mesh picking selects the visible surface.

Terrain cannot overlap existing roads, placements or other scenery; subsequent roads and buildings cannot be placed inside its footprint. This maintains flat infrastructure rather than pretending to implement slopes, tunnels or bridges. Relief can be removed through the existing landscape undo/redo history and last-item removal. The server validates size, bounds, owner, Passport, and expected previous terrain under the city lock. No rewards are awarded by landscape edits.

Landscape controls use compact dropdowns and a short gesture hint. Building details can be expanded. Road/river camera movement is available through the hand/move toggle, with editing suspended until it is turned off. All important actions retain accessible names; short landscape screens use compact camera and footer controls.

Validation: 50 focused Node/PGlite tests passed, JSX/TypeScript syntax parsing, repository CI and deployment/source inventory checks. Signed-in browser play and actual Samsung rendering remain to be verified; server and geometry checks do not substitute for physical-device QA.
