import { WORLDS, SPAWNS } from './data.js';
import { NEXUS_WORLDS } from '../../components/nexus-worlds.js';

// Pure and repeatable: React may read the initial state twice in development.
// Only travel is requested. Story flags, experience and rewards remain untouched.
export function prepareNexusArrival(current, intent, transition) {
  if (!intent || intent.type !== 'visit' || !NEXUS_WORLDS.some(world => world.id === intent.region)) return current;
  if (!current.flags.awakened) {
    return { ...current, zone: 'sanctuary', position: { ...SPAWNS.sanctuary } };
  }
  const gate = WORLDS.find(world => world.id === intent.region);
  if (!gate) return current;
  const atGate = { ...current, zone: 'sanctuary', position: { x: gate.x, z: gate.z } };
  const result = transition(atGate, intent.region, { position: atGate.position });
  return result.changed && result.save.zone === intent.region ? result.save : current;
}
