import { ACHIEVEMENTS, assertCanonicalId } from '../canon/registry.js';
import { validateEvent } from '../events/catalog.js';

const rewardEventTypes = new Set(['FRAGMENT_FOUND', 'GUARDIAN_DEFEATED', 'QUEST_COMPLETED', 'ACHIEVEMENT_UNLOCKED']);

export class MockPassportBridge {
  constructor() {
    this.processed = new Set();
    this.discoveries = new Set();
    this.achievements = new Set();
    this.events = [];
  }

  submit(event) {
    validateEvent(event);
    if (this.processed.has(event.id)) return { accepted: true, duplicate: true, snapshot: this.snapshot() };
    if (rewardEventTypes.has(event.type) && event.authority !== 'server') throw new Error(`${event.type} cannot reward the Passport from a client-only event.`);
    if (event.type === 'FRAGMENT_FOUND') {
      const fragmentId = assertCanonicalId(event.payload.fragmentId);
      this.discoveries.add(fragmentId);
      this.achievements.add(ACHIEVEMENTS.firstFragment);
    }
    if (event.type === 'PORTAL_OPENED') this.achievements.add(ACHIEVEMENTS.firstPortal);
    if (event.type === 'NPC_MET' && event.payload.characterId === 'character.kais') this.achievements.add(ACHIEVEMENTS.firstMeetingKais);
    if (event.type === 'ACHIEVEMENT_UNLOCKED') this.achievements.add(assertCanonicalId(event.payload.achievementId));
    this.processed.add(event.id);
    this.events.push({ id: event.id, type: event.type, occurredAt: event.occurredAt });
    return { accepted: true, duplicate: false, snapshot: this.snapshot() };
  }

  snapshot() {
    return Object.freeze({
      discoveries: [...this.discoveries].sort(),
      achievements: [...this.achievements].sort(),
      processedCount: this.processed.size,
    });
  }
}
