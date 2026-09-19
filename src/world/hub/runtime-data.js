import plan from './data/hub-master-plan-v2.json' with { type: 'json' };
import npcs from './data/npcs-v1.json' with { type: 'json' };
import missions from './data/missions-v1.json' with { type: 'json' };
import events from './data/events-v1.json' with { type: 'json' };
import secrets from './data/secrets-v1.json' with { type: 'json' };
import { buildHubRuntimeItems } from './runtime.js';

export const HUB_PLAN = plan;
export const HUB_NPCS = npcs;
export const HUB_MISSIONS = missions;
export const HUB_EVENTS = events;
export const HUB_SECRETS = secrets;

export function hubRuntime(profile = 'mobileMedium') {
  return buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile });
}
