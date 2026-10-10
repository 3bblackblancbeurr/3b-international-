const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const dimensions = ['trust', 'respect', 'fear', 'debt'];

export function createMemoryState(seed = {}) {
  return {
    version: 1,
    memories: Array.isArray(seed.memories) ? seed.memories.map(memory => ({ ...memory })) : [],
    relationships: structuredClone(seed.relationships || {}),
  };
}

function relationshipFor(state, characterId) {
  return state.relationships[characterId] || { trust: 0, respect: 0, fear: 0, debt: 0, lastEncounterAt: null };
}

export function recordMemory(state, input) {
  if (!state || state.version !== 1) throw new Error('Unsupported 3B memory state.');
  if (!input?.id || !input.characterId || !input.type) throw new Error('Memory id, characterId and type are required.');
  if (state.memories.some(memory => memory.id === input.id)) return state;
  const importance = clamp(input.importance ?? 3, 1, 5);
  const occurredAt = Number(input.occurredAt) || Date.now();
  const permanent = Boolean(input.permanent || importance >= 5);
  const effects = Object.fromEntries(dimensions.map(key => [key, clamp(input.effects?.[key] || 0, -100, 100)]));
  const memory = Object.freeze({
    version: 1,
    id: String(input.id),
    characterId: String(input.characterId),
    type: String(input.type),
    importance,
    permanent,
    occurredAt,
    summary: String(input.summary || '').trim().slice(0, 500),
    facts: Object.freeze({ ...(input.facts || {}) }),
    effects: Object.freeze(effects),
  });
  const current = relationshipFor(state, memory.characterId);
  const nextRelationship = { ...current, lastEncounterAt: Math.max(current.lastEncounterAt || 0, occurredAt) };
  for (const key of dimensions) nextRelationship[key] = clamp((current[key] || 0) + effects[key], -100, 100);
  return {
    version: 1,
    memories: [...state.memories, memory],
    relationships: { ...state.relationships, [memory.characterId]: Object.freeze(nextRelationship) },
  };
}

export function recallMemories(state, { characterId, limit = 8, now = Date.now() } = {}) {
  const cap = Math.max(1, Math.min(50, Math.floor(limit)));
  return state.memories
    .filter(memory => !characterId || memory.characterId === characterId)
    .map(memory => {
      const ageDays = Math.max(0, (now - memory.occurredAt) / 86400000);
      const recency = Math.max(0, 30 - Math.min(30, ageDays));
      const score = (memory.permanent ? 10000 : 0) + memory.importance * 100 + recency;
      return { memory, score };
    })
    .sort((a, b) => b.score - a.score || b.memory.occurredAt - a.memory.occurredAt)
    .slice(0, cap)
    .map(entry => entry.memory);
}

export function relationshipSnapshot(state, characterId) {
  return Object.freeze({ ...relationshipFor(state, characterId) });
}
