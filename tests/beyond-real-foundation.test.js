import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CANON_WORLDS } from '../src/world/story-canon.js';
import { ACHIEVEMENTS, CANONICAL_IDS, WORLDS } from '../beyond-real/src/canon/registry.js';
import { createEvent, validateEvent } from '../beyond-real/src/events/catalog.js';
import { createMemoryState, recallMemories, recordMemory, relationshipSnapshot } from '../beyond-real/src/memory/engine.js';
import { MockPassportBridge } from '../beyond-real/src/passport/mock-bridge.js';
import { MemoryPersistenceStore } from '../beyond-real/src/persistence/store.js';
import { OfflineEventQueue } from '../beyond-real/src/sync/offline-queue.js';
import { clearanceRect, findPortalPlacement, isPlacementSafe } from '../beyond-real/src/spatial/portal-placement.js';
import { composePlayerPose, worldOriginForEntry } from '../beyond-real/src/spatial/space-transform.js';
import { generateRooms, TEST_ROOMS } from '../beyond-real/src/simulator/rooms.js';
import { reloadPrototype000, runPrototype000 } from '../beyond-real/src/simulator/prototype000.js';
import { validateAssetManifest } from '../beyond-real/src/assets/validator.js';
import { capabilityProfile, XR_CAPABILITIES } from '../beyond-real/src/xr/capabilities.js';

const USER = 'user-test-3b';

test('canonical Beyond Real registry stays aligned with the existing 3B story canon', () => {
  assert.equal(new Set(CANONICAL_IDS).size, CANONICAL_IDS.length);
  for (const [region, current] of Object.entries(CANON_WORLDS)) {
    assert.equal(WORLDS[region].guardianName, current.guardian, region);
    assert.equal(WORLDS[region].value, current.value, region);
  }
});

test('event envelope rejects unknown or under-authorized progression events', () => {
  assert.throws(() => validateEvent({ type: 'INVENTED' }), /Unknown/);
  assert.throws(() => createEvent({ id: 'e1', userId: USER, type: 'FRAGMENT_FOUND', authority: 'client', occurredAt: 1, payload: {} }), /server authority/);
  assert.equal(createEvent({ id: 'e2', userId: USER, type: 'PORTAL_OPENED', occurredAt: 1 }).authority, 'client');
});

test('Passport Bridge is idempotent and never grants a fragment twice', () => {
  const bridge = new MockPassportBridge();
  const event = createEvent({ id: 'fragment-once', userId: USER, type: 'FRAGMENT_FOUND', authority: 'server', occurredAt: 1, payload: { fragmentId: WORLDS.france.fragmentId } });
  assert.equal(bridge.submit(event).duplicate, false);
  assert.equal(bridge.submit(event).duplicate, true);
  assert.deepEqual(bridge.snapshot().discoveries, [WORLDS.france.fragmentId]);
  assert.ok(bridge.snapshot().achievements.includes(ACHIEVEMENTS.firstFragment));
});

test('long-term NPC memory preserves important events and relationship consequences', () => {
  let state = createMemoryState();
  state = recordMemory(state, { id: 'betrayal', characterId: 'character.kais', type: 'BETRAYAL', importance: 5, occurredAt: 1, summary: 'Trahison majeure.', effects: { trust: -40, fear: 12 }, permanent: true });
  state = recordMemory(state, { id: 'help', characterId: 'character.kais', type: 'HELP', importance: 3, occurredAt: 2, summary: 'Aide mineure.', effects: { trust: 10 } });
  assert.equal(recallMemories(state, { characterId: 'character.kais', now: 365 * 86400000 })[0].id, 'betrayal');
  assert.equal(relationshipSnapshot(state, 'character.kais').trust, -30);
  assert.equal(recordMemory(state, { id: 'betrayal', characterId: 'character.kais', type: 'BETRAYAL' }), state);
});

test('relationship dimensions are clamped against runaway memory effects', () => {
  let state = createMemoryState();
  for (let i = 0; i < 10; i++) state = recordMemory(state, { id: `m${i}`, characterId: 'character.kais', type: 'HELP', effects: { trust: 50, debt: -50 }, occurredAt: i + 1 });
  const relation = relationshipSnapshot(state, 'character.kais');
  assert.equal(relation.trust, 100); assert.equal(relation.debt, -100);
});

test('portal placement prefers a safe real door before a wall', () => {
  const room = { id: 'safe-door', width: 4, depth: 4, height: 2.6, openings: [{ id: 'door', type: 'door', wall: 'south', center: 0, width: 1.1, height: 2.2 }], obstacles: [] };
  const placement = findPortalPlacement(room);
  assert.equal(placement.kind, 'real-door'); assert.equal(placement.id, 'door'); assert.equal(isPlacementSafe(room, placement), true);
});

test('blocked real door falls back to another safe wall', () => {
  const room = TEST_ROOMS.find(room => room.id === 'ROOM_010_DOOR_BLOCKED');
  const placement = findPortalPlacement(room);
  assert.ok(placement); assert.equal(placement.kind, 'wall'); assert.notEqual(placement.wall, 'north');
});

test('low or microscopic rooms never force an unsafe portal', () => {
  for (const id of ['ROOM_007_LOW_CEILING', 'ROOM_018_MICRO']) {
    const room = TEST_ROOMS.find(candidate => candidate.id === id);
    assert.equal(findPortalPlacement(room), null, id);
  }
});

test('fuzzed rooms never return a portal that violates the same safety predicate', () => {
  for (const room of generateRooms(1000, 1618)) {
    const placement = findPortalPlacement(room);
    if (placement) {
      assert.equal(isPlacementSafe(room, placement), true, room.id);
      const rect = clearanceRect(room, placement);
      assert.ok(rect.x2 >= rect.x1 && rect.z2 >= rect.z1, room.id);
    }
  }
});

test('REAL SPACE offset composes into WORLD SPACE without losing physical movement', () => {
  const final = composePlayerPose({ worldOrigin: { x: 10, y: 0, z: 20 }, physicalOffset: { x: 1, y: .2, z: 0 }, worldYaw: 90 });
  assert.ok(Math.abs(final.x - 10) < 1e-9); assert.ok(Math.abs(final.z - 21) < 1e-9); assert.equal(final.y, .2);
  const origin = worldOriginForEntry({ desiredWorldPose: { x: 100, y: 0, z: 50 }, physicalPose: { x: 1, y: 0, z: 2 }, worldYaw: 0 });
  assert.deepEqual(origin, { x: 99, y: 0, z: 48 });
});

test('logical spatial objects survive anchor loss and can be relocated later', () => {
  const store = new MemoryPersistenceStore();
  store.saveSpatialObject({ id: 'f1', logicalId: WORLDS.france.fragmentId, ownerId: USER, anchorRef: 'anchor-old', roomRef: 'room-a', pose: { x: 1, y: 1, z: 1 } });
  const detached = store.detachAnchor('f1', 10);
  assert.equal(detached.logicalId, WORLDS.france.fragmentId); assert.equal(detached.anchorRef, null); assert.equal(detached.state, 'needs-relocation');
});

test('offline event queue keeps per-device order and acknowledges batches', async () => {
  const queue = new OfflineEventQueue({ deviceId: 'device-a' });
  queue.enqueue({ id: 'a' }); queue.enqueue({ id: 'b' }); queue.enqueue({ id: 'c' });
  const seen = [];
  const result = await queue.flush(async batch => { seen.push(...batch.map(x => x.sequence)); return { acknowledgedSequence: batch.at(-1).sequence }; }, 2);
  assert.deepEqual(seen, [1,2,3]); assert.equal(result.pending, 0); assert.equal(queue.snapshot().next, 4);
});

test('Prototype 000 completes and the fragment is still present after reload', () => {
  const room = TEST_ROOMS.find(room => room.id === 'ROOM_003_LARGE');
  const result = runPrototype000({ room, userId: USER, now: 1000 });
  assert.equal(result.status, 'COMPLETE');
  const reload = reloadPrototype000(result.persistence);
  assert.equal(reload.localized, true); assert.equal(reload.fragment.logicalId, WORLDS.france.fragmentId);
  assert.ok(result.passport.achievements.includes(ACHIEVEMENTS.prototype000));
});

test('asset registry validates reusable XR-ready metadata without claiming final assets exist', async () => {
  const registry = JSON.parse(await readFile(new URL('../beyond-real/assets/registry.json', import.meta.url), 'utf8'));
  assert.equal(registry.assets.length, 3);
  for (const asset of registry.assets) assert.equal(validateAssetManifest(asset).valid, true, asset.canonicalId);
  assert.equal(registry.assets.every(asset => asset.status === 'planned'), true);
});

test('capability-driven runtime gates Prototype 001 instead of assuming one headset', () => {
  assert.equal(capabilityProfile([XR_CAPABILITIES.anchors, XR_CAPABILITIES.passthrough, XR_CAPABILITIES.planes]).canRunPrototype001, true);
  assert.equal(capabilityProfile([XR_CAPABILITIES.controllers]).canRunPrototype001, false);
});
