import test from 'node:test';
import assert from 'node:assert/strict';
import {adventureObjective, campaignOverview} from '../src/world/adventure-objective.js';
import {blankSave, normalizeSave} from '../src/world/rules.js';
import {applyWorldAction, pactCue, pactCues} from '../src/world/engine.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {TOURNAMENT_ID} from '../src/world/tournament.js';

const act = (save, type, extra = {}) => applyWorldAction(save, {type, ...extra});
function checkTarget(save, expected, region = save.region) {
 const result = adventureObjective(save, region);
 if (expected) assert.equal(result.id, expected);
 assert.ok(worldRuntimeItems(result.region, save).some(item => item.id === result.targetId), `${result.id}: missing ${result.region}/${result.targetId}`);
 assert.ok(result.title && result.description && result.cta);
 assert.ok(result.progress.current >= 0 && result.progress.current <= result.progress.total);
 return result;
}
function restoredSave() {
 const save = blankSave();
 save.seals = COUNTRIES.map(country => country.id);
 for (const {id} of COUNTRIES) {
  save.adventure.chapters[id] = {helped: true, powers: ['ally', 'ambiance', 'terrain'], solved: true, restored: 3, challenge: false, choice: 'garden'};
  save.adventure.values[id] = {completed: true, decisions: GUARDIAN_VALUES[id].choices.map(([choice]) => choice)};
  save.beacons.push(...[0, 1, 2].map(index => id + ':' + index));
 }
 return normalizeSave(save);
}

test('a new player is guided from the actual Nexus portal to the first French resident', () => {
 let save = blankSave();
 assert.equal(checkTarget(save, 'journey:france').targetId, 'france');
 assert.match(adventureObjective(save).description, /Kaïs/);
 save = act(save, 'visit', {region: 'france'});
 assert.equal(checkTarget(save, 'france:help').targetId, 'france:story');
 assert.equal(campaignOverview(save).progress.current, 0);
});

test('the objective follows real France actions through memories, value, guardian, restoration and homecoming', () => {
 let save = act(blankSave(), 'visit', {region: 'france'});
 save = act(save, 'help');
 for (const [index, power] of ['ally', 'ambiance', 'terrain'].entries()) {
  assert.equal(checkTarget(save, 'france:power').progress.current, index);
  save = act(save, 'power', {power});
 }
 assert.equal(checkTarget(save, 'france:puzzle').targetId, 'france:story');
 for (const index of [0, 1, 2, 3]) save = act(save, 'puzzleStep', {index});
 save = act(save, 'solve');
 for (const index of [0, 1, 2]) {
  const objective = checkTarget(save, 'france:memories');
  assert.equal(objective.targetId, 'france:' + index);
  assert.equal(objective.progress.current, index);
  save = act(save, 'beacon', {id: objective.targetId});
 }
 checkTarget(save, 'france:rebuild');
 save = act(save, 'restore', {choice: 'garden'});
 for (const [index, [choiceId]] of GUARDIAN_VALUES.france.choices.entries()) {
  assert.equal(checkTarget(save, 'france:value').progress.current, index);
  save = act(save, 'guardianValueChoice', {choiceId});
 }
 assert.equal(checkTarget(save, 'france:guardian').targetId, 'france:guardian');
 save = act(save, 'encounter', {id: 'france:guardian'});
 checkTarget(save, 'combat');
 for (let turn = 0; turn < 180 && !save.adventure.encounter.result; turn++) {
  const encounter = save.adventure.encounter;
  const action = encounter.intent === 'rituel' && encounter.focus >= 2 ? 'power'
   : encounter.hp < encounter.maxHP - 10 || ['rempart', 'double', 'vague', 'gel', 'éclipse', 'sable', 'percée'].includes(encounter.intent) ? 'guard'
    : encounter.focus >= 2 ? 'power' : 'strike';
  save = act(save, 'battle', {action});
 }
 assert.equal(save.adventure.encounter.result, 'victory');
 checkTarget(save, 'encounter-result');
 save = act(save, 'leave');
 checkTarget(save, 'france:inaugurate');
 assert.equal(campaignOverview(save).progress.current, 0, 'a seal alone is not a restored country');
 save = act(save, 'restore');
 assert.equal(checkTarget(save, 'france:homecoming').targetId, 'hub');
 const beforeReload = campaignOverview(save);
 assert.deepEqual(campaignOverview(normalizeSave(JSON.parse(JSON.stringify(save)))), beforeReload);
 assert.equal(beforeReload.progress.current, 1);
 assert.equal(beforeReload.countries[0].status, 'Retour au Nexus');
 save = act(save, 'visit', {region: 'hub'});
 save = act(save, 'cinematicSeen', {key: 'homecoming:france'});
 assert.equal(campaignOverview(save).countries[0].returned, true);
 assert.equal(checkTarget(save).targetId, 'italie');
});

test('pact progress is taken from the active playable encounter and stops at its result', () => {
 let save = act(act(blankSave(), 'visit', {region: 'france'}), 'help');
 save = act(save, 'encounter', {id: 'france:echo:0'});
 checkTarget(save, 'combat');
 save = act(save, 'approach', {kind: 'help'});
 assert.equal(checkTarget(save, 'pact').progress.current, 0);
 save = act(save, 'pactStart');
 for (let index = 0; index < 3; index++) {
  assert.equal(checkTarget(save, 'pact').progress.current, index);
  save = act(save, 'pactChoice', {index: pactCues.indexOf(pactCue(save.adventure.encounter))});
 }
 assert.equal(save.adventure.encounter.result, 'recruited');
 checkTarget(save, 'encounter-result');
 save = act(save, 'leave');
 checkTarget(save, 'france:power');
});

test('finale requires restored chapters and seals, then targets the real Circle and postgame refuge', () => {
 const sealsOnly = blankSave();
 sealsOnly.seals = COUNTRIES.map(country => country.id);
 assert.notEqual(adventureObjective(sealsOnly).id, 'final');
 const save = restoredSave();
 assert.equal(checkTarget(save, 'final').targetId, 'final');
 for (const {id} of COUNTRIES) assert.equal(checkTarget(save, id + ':homecoming', id).targetId, 'hub');
 const final = act(save, 'final');
 assert.equal(checkTarget(final, 'final-combat').targetId, 'final');
 const finished = normalizeSave({...save, adventure: {...save.adventure, finished: true}});
 assert.equal(checkTarget(finished, 'postgame').targetId, 'france');
 assert.equal(checkTarget(finished, 'postgame', 'france').targetId, 'france:camp');
 assert.equal(campaignOverview(finished).finished, true);
});

test('overview uses each real country state, deduplicates memories and resumes started chapters', () => {
 let save = act(blankSave(), 'visit', {region: 'maroc'});
 save = act(save, 'help');
 save = act(save, 'visit', {region: 'hub'});
 assert.equal(checkTarget(save, 'journey:maroc').targetId, 'maroc');
 save.beacons = ['france:0', 'france:0', 'invented:0'];
 save.seals = ['france', 'france', 'invented'];
 const overview = campaignOverview(save);
 assert.equal(overview.countries.length, 8);
 assert.equal(overview.countries.find(country => country.id === 'france').memories, 1);
 assert.equal(overview.countries.find(country => country.id === 'maroc').status, 'Histoire en cours');
 assert.equal(overview.progress.current, 0);
 assert.equal(overview.hero, 'Kaïs');
 assert.match(overview.goal, /huit/);
 for (const country of overview.countries) checkTarget(save, undefined, country.id);
});

test('read-only helpers tolerate missing saves and never change the authoritative state', () => {
 const save = restoredSave(), before = JSON.stringify(save);
 function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } }
 freeze(save);
 adventureObjective(save);
 campaignOverview(save);
 assert.equal(JSON.stringify(save), before);
 assert.equal(adventureObjective().targetId, 'france');
 assert.equal(adventureObjective({}, 'missing').region, 'hub');
 assert.equal(campaignOverview({}).countries.length, 8);
});

test('a resumed defeat and value reflection cannot be mistaken for a completed objective', () => {
 let save = act(blankSave(), 'visit', {region: 'france'});
 save = act(save, 'encounter', {id: 'france:echo:0'});
 // A recorded outcome is projected as a result to close, never as a fresh reward.
 save = normalizeSave({...save, adventure: {...save.adventure, encounter: {...save.adventure.encounter, result: 'defeat', hp: 0}}});
 assert.match(checkTarget(save, 'encounter-result').title, /défaite/);
 save = act(save, 'leave');
 checkTarget(save, 'france:help');
 const reflection = restoredSave();
 reflection.region = 'france';
 reflection.seals = reflection.seals.filter(id => id !== 'france');
 reflection.adventure.chapters.france.restored = 2;
 reflection.adventure.values.france = {decisions: ['trancher', 'rumeur', 'punir']};
 const normalized = normalizeSave(reflection);
 const objective = checkTarget(normalized, 'france:value');
 assert.equal(objective.title, 'Assumer les conséquences');
 assert.equal(objective.progress.current, 3);
 assert.equal(campaignOverview(normalized).progress.current, 7);
});

test('the optional tournament is tracked during its duel and pending result, then releases the campaign objective', () => {
 let save = act(act(blankSave(), 'visit', {region: 'france'}), 'tournamentStart');
 let objective = checkTarget(save, 'tournament-round');
 assert.equal(objective.targetId, TOURNAMENT_ID);
 assert.equal(objective.progress.current, 0);
 assert.match(objective.description, /Bloque une attaque/);
 assert.doesNotMatch(objective.title, /Libérer Céliane/);
 for (let tick = 0; tick < 1400 && !save.adventure.encounter.result; tick++) {
  const encounter = save.adventure.encounter, field = encounter.field;
  const dx = field.enemy.x - field.p.x, dz = field.enemy.z - field.p.z, distance = Math.hypot(dx, dz) || 1;
  const kind = field.phase === 'windup' && field.windup <= 500 ? 'guard'
   : !encounter.tournamentProgress ? undefined
    : field.phase === 'recovery' && encounter.focus >= 2 ? 'power'
     : field.phase !== 'windup' && distance < 7 ? 'strike' : undefined;
  save = act(save, 'field', {x: distance > 5 ? dx / distance : 0, z: distance > 5 ? dz / distance : 0, ...(kind ? {kind} : {})});
 }
 assert.equal(save.adventure.encounter.result, 'victory');
 objective = checkTarget(save, 'tournament-result');
 assert.equal(objective.targetId, TOURNAMENT_ID);
 assert.equal(objective.progress.current, 1);
 assert.equal(objective.progress.total, 3);
 assert.equal(campaignOverview(save).progress.current, 0, 'an exhibition is not a restored heritage');
 assert.deepEqual(adventureObjective(normalizeSave(JSON.parse(JSON.stringify(save)))), objective);
 save = act(save, 'leave');
 checkTarget(save, 'france:help');
 save = act(save, 'tournamentNext');
 objective = checkTarget(save, 'tournament-round');
 assert.match(objective.title, /manche 2/);
 assert.equal(objective.progress.total, 2);
 save = act(save, 'tournamentAbandon');
 checkTarget(save, 'france:help');
});
