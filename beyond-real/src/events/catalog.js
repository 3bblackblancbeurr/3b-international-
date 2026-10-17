const EVENT_DEFINITIONS = Object.freeze({
  SESSION_STARTED: { authority: 'client', category: 'session' },
  PORTAL_PLACED: { authority: 'client', category: 'spatial' },
  PORTAL_OPENED: { authority: 'client', category: 'spatial' },
  WORLD_SPACE_ENTERED: { authority: 'client', category: 'spatial' },
  NPC_MET: { authority: 'client', category: 'character' },
  NPC_HELPED: { authority: 'server', category: 'character' },
  NPC_BETRAYED: { authority: 'server', category: 'character' },
  NPC_PROMISE_MADE: { authority: 'server', category: 'character' },
  NPC_PROMISE_KEPT: { authority: 'server', category: 'character' },
  ITEM_DISCOVERED: { authority: 'server', category: 'inventory' },
  ITEM_PLACED: { authority: 'client', category: 'spatial' },
  ITEM_RELOCATED: { authority: 'client', category: 'spatial' },
  SPATIAL_ANCHOR_LOST: { authority: 'client', category: 'spatial' },
  FRAGMENT_FOUND: { authority: 'server', category: 'progression' },
  QUEST_COMPLETED: { authority: 'server', category: 'progression' },
  GUARDIAN_DEFEATED: { authority: 'server', category: 'progression' },
  MEMORY_CREATED: { authority: 'server', category: 'memory' },
  ACHIEVEMENT_UNLOCKED: { authority: 'server', category: 'progression' },
});

export const EVENT_TYPES = Object.freeze(Object.keys(EVENT_DEFINITIONS));
export const EVENT_CATALOG = EVENT_DEFINITIONS;

const clean = (value, max = 160) => String(value ?? '').trim().slice(0, max);

export function validateEvent(event) {
  if (!event || typeof event !== 'object') throw new Error('3B event must be an object.');
  if (!EVENT_DEFINITIONS[event.type]) throw new Error(`Unknown 3B event type: ${event.type}`);
  if (!clean(event.id, 100)) throw new Error('3B event id is required.');
  if (!clean(event.userId, 100)) throw new Error('3B event userId is required.');
  if (event.source !== 'beyond-real') throw new Error('Beyond Real events must use source=beyond-real.');
  if (!['client', 'server'].includes(event.authority)) throw new Error('3B event authority must be client or server.');
  const required = EVENT_DEFINITIONS[event.type].authority;
  if (required === 'server' && event.authority !== 'server') throw new Error(`${event.type} requires server authority.`);
  if (!Number.isFinite(event.occurredAt) || event.occurredAt <= 0) throw new Error('3B event occurredAt must be a positive timestamp.');
  if (event.payload != null && (typeof event.payload !== 'object' || Array.isArray(event.payload))) throw new Error('3B event payload must be an object.');
  return event;
}

export function createEvent({ id, userId, type, authority, payload = {}, occurredAt = Date.now() }) {
  const rule = EVENT_DEFINITIONS[type];
  if (!rule) throw new Error(`Unknown 3B event type: ${type}`);
  return validateEvent(Object.freeze({
    version: 1,
    id,
    userId,
    type,
    source: 'beyond-real',
    authority: authority || rule.authority,
    occurredAt,
    payload: Object.freeze({ ...payload }),
  }));
}
