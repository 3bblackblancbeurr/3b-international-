/**
 * Pure selectors for the next integration stage. This module is deliberately NOT
 * mounted in WorldPage yet: callers must install the pause/queue/resume lifecycle
 * before showing a scene over a real-time fight. Events never grant rewards.
 */
export function worldCinematicEvents(previous, next, action) {
  if (!previous || !next || !action?.type) return [];
  const before = previous.adventure || {}, after = next.adventure || {};
  const oldFight = before.encounter, fight = after.encounter;
  const region = next.region || 'hub', events = [];
  const add = (kind, key, context, priority = 20) => events.push({kind, key, region, context, priority});
  const important = encounter => !!encounter && (encounter.final || (encounter.boss && !encounter.patrol));
  if (action.type === 'visit' && region !== 'hub' && previous.region !== region && !(previous.visited || []).includes(region) && (next.visited || []).includes(region)) {
    add('country-first-entry', `country:${region}`, {region});
  }
  const oldChapter = before.chapters?.[region] || {}, chapter = after.chapters?.[region] || {};
  if (action.type === 'help' && !oldChapter.helped && chapter.helped) {
    add('story-alliance', `alliance:${region}`, {region}, 30);
  }
  if (action.type === 'power' && (chapter.powers?.length || 0) > (oldChapter.powers?.length || 0)) {
    const power = chapter.powers.at(-1);
    add('story-power', `power:${region}:${power}`, {region, power}, 25);
  }
  if (['solve', 'restore'].includes(action.type) && (chapter.restored || 0) > (oldChapter.restored || 0)) {
    add('story-restoration', `restore:${region}:${chapter.restored}`, {region, stage: chapter.restored, choice: chapter.choice || null}, 40);
  }
  if (['encounter', 'final'].includes(action.type) && important(fight) && (!oldFight || oldFight.result) && !fight.result) {
    add(fight.final ? 'final-combat-intro' : 'guardian-intro', `intro:${fight.region || region}:${fight.card}:${fight.expert ? 'expert' : 'adventure'}`, {card: fight.card, final: !!fight.final, expert: !!fight.expert}, 100);
  }
  if (['field', 'battle'].includes(action.type) && important(oldFight) && !oldFight.result && ['victory', 'defeat'].includes(fight?.result)) {
    add('important-combat-result', `result:${fight.region || region}:${fight.card}:${fight.result}`, {card: fight.card, result: fight.result, final: !!fight.final}, 100);
    if (!before.finished && after.finished) add('story-finale', 'story:circle-restored', {region}, 90);
  }
  if (action.type === 'pactChoice' && fight?.result === 'recruited' && oldFight?.result !== 'recruited' && !previous.collection?.[fight.card] && next.collection?.[fight.card]) {
    add('companion-first-bond', `bond:${fight.card}`, {card: fight.card}, 40);
  }
  if (action.type === 'survey') {
    const id = `${region}:${action.id}`;
    if (!(before.discoveries || []).includes(id) && (after.discoveries || []).includes(id)) add('discovery', `discovery:${id}`, {region, place: action.id}, 10);
  }
  return events;
}
