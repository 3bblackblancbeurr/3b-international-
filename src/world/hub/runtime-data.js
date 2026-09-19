import plan from './data/hub-master-plan-v2.json';
import npcs from './data/npcs-v1.json';
import missions from './data/missions-v1.json';
import events from './data/events-v1.json';
import secrets from './data/secrets-v1.json';
import { buildHubRuntimeItems } from './runtime.js';

export const HUB_PLAN = plan;
export const HUB_NPCS = npcs;
export const HUB_MISSIONS = missions;
export const HUB_EVENTS = events;
export const HUB_SECRETS = secrets;

export function hubRuntime(profile = 'mobileMedium') {
  return buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile });
}
