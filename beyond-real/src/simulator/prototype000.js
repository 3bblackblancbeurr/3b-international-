import { HERO, WORLDS, ACHIEVEMENTS } from '../canon/registry.js';
import { createEvent } from '../events/catalog.js';
import { createMemoryState, recordMemory } from '../memory/engine.js';
import { MockPassportBridge } from '../passport/mock-bridge.js';
import { MemoryPersistenceStore } from '../persistence/store.js';
import { findPortalPlacement } from '../spatial/portal-placement.js';

export function runPrototype000({
  room,
  userId = 'sim-user',
  now = 1_800_000_000_000,
  persistence = new MemoryPersistenceStore(),
  passport = new MockPassportBridge(),
} = {}) {
  if (!room) throw new Error('Prototype 000 requires a simulated room.');
  const portal = findPortalPlacement(room);
  if (!portal) return { status: 'NO_SAFE_PORTAL', roomId: room.id, passport: passport.snapshot(), memory: createMemoryState(), persistence };

  passport.submit(createEvent({ id: `${room.id}:portal-opened`, userId, type: 'PORTAL_OPENED', authority: 'client', occurredAt: now, payload: { portalId: WORLDS.france.portalId, roomId: room.id } }));
  passport.submit(createEvent({ id: `${room.id}:kais-met`, userId, type: 'NPC_MET', authority: 'client', occurredAt: now + 1, payload: { characterId: HERO.id } }));

  let memory = createMemoryState();
  memory = recordMemory(memory, {
    id: `${room.id}:memory:first-meeting`,
    characterId: HERO.id,
    type: 'FIRST_MEETING',
    importance: 5,
    permanent: true,
    occurredAt: now + 1,
    summary: 'Première rencontre avec Kaïs après le passage de la Porte France.',
    effects: { trust: 3, respect: 4 },
    facts: { portalId: WORLDS.france.portalId },
  });

  const fragmentRecord = persistence.saveSpatialObject({
    id: 'fragment-justice-instance-001',
    logicalId: WORLDS.france.fragmentId,
    ownerId: userId,
    roomRef: room.id,
    anchorRef: `sim-anchor:${room.id}:fragment-justice`,
    pose: { x: 0.35, y: 1.05, z: -0.4, yaw: 0 },
    state: 'placed',
    updatedAt: now + 2,
  });

  passport.submit(createEvent({ id: `${room.id}:fragment-found`, userId, type: 'FRAGMENT_FOUND', authority: 'server', occurredAt: now + 2, payload: { fragmentId: WORLDS.france.fragmentId } }));
  passport.submit(createEvent({ id: `${room.id}:prototype-complete`, userId, type: 'ACHIEVEMENT_UNLOCKED', authority: 'server', occurredAt: now + 3, payload: { achievementId: ACHIEVEMENTS.prototype000 } }));

  persistence.set('prototype000:last-session', { roomId: room.id, portal, completedAt: now + 3 });
  return {
    status: 'COMPLETE',
    roomId: room.id,
    portal,
    memory,
    fragment: fragmentRecord,
    passport: passport.snapshot(),
    persistence,
  };
}

export function reloadPrototype000(persistence, objectId = 'fragment-justice-instance-001') {
  const fragment = persistence.loadSpatialObject(objectId);
  const session = persistence.get('prototype000:last-session');
  return { session, fragment, localized: Boolean(fragment?.anchorRef) };
}
