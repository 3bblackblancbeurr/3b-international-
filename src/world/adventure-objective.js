import {COUNTRIES, cardById, countryById} from './catalog.js';
import {CHAPTERS, chapterState} from './chapters.js';
import {GUARDIAN_VALUES} from './guardian-values.js';
import {STORY_CANON} from './story-canon.js';
import {blankSave, worldItems} from './rules.js';
import {TOURNAMENT_ID, TOURNAMENT_ROUNDS, normalizeTournament} from './tournament.js';

// A read-only view of the existing campaign. Only the game engine awards progress.
const count = (value, maximum) => Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : 0;
const array = value => Array.isArray(value) ? value : [];
function readableSave(input) {
 const base = blankSave(), source = input || {};
 const adventure = {...base.adventure, ...source.adventure};
 adventure.chapters = Object.fromEntries(COUNTRIES.map(({id}) => {
  const state = chapterState({adventure}, id);
  return [id, {...state, powers: array(state.powers), restored: count(state.restored, 3)}];
 }));
 adventure.values = adventure.values || {};
 adventure.cinematicSeen = array(adventure.cinematicSeen);
 return {...base, ...source, adventure, beacons: array(source.beacons), seals: array(source.seals), team: array(source.team), collection: source.collection || base.collection};
}
const restored = (save, id) => chapterState(save, id).restored === 3 && save.seals.includes(id);
const restoredCount = save => COUNTRIES.filter(({id}) => restored(save, id)).length;
const progress = (current, total, label) => ({current, total, label});
const campaignProgress = save => progress(restoredCount(save), COUNTRIES.length, 'héritages restaurés');
const objective = (region, id, title, description, targetId, cta, advancement) => ({id, title, description, targetId, region, progress: advancement, cta});

function encounterObjective(save, region) {
 const encounter = save.adventure.encounter;
 if (!encounter || (!encounter.final && encounter.region !== region) || (encounter.final && region !== 'hub')) return null;
 if (encounter.tournament && region === 'france') {
  const state = normalizeTournament(save.adventure.tournament), roundIndex = count(encounter.tournamentRound, 2), round = TOURNAMENT_ROUNDS[roundIndex];
  if (encounter.result) return objective(region, 'tournament-result',
   state.status === 'completed' ? 'Le Tournoi des Liens est accompli' : encounter.result === 'defeat' ? 'Préparer la revanche' : 'Manche remportée · Tournoi des Liens',
   state.status === 'completed' ? 'Les trois épreuves et la récompense du tournoi sont enregistrées. Ferme le bilan pour reprendre ton aventure.'
    : encounter.result === 'defeat' ? 'Tes manches déjà remportées sont conservées. Tu peux reprendre cette manche ou revenir à l’exploration.'
     : 'Le geste et la victoire sont validés. Depuis le bilan, choisis la manche suivante ou reviens à ton aventure ; ce tournoi reste facultatif.',
   TOURNAMENT_ID, 'Voir le bilan du tournoi', progress(state.round, TOURNAMENT_ROUNDS.length, 'manches remportées'));
  return objective(region, 'tournament-round', `Tournoi · manche ${roundIndex + 1} : ${round.title}`,
   round.rule + ' Cette épreuve solo reste facultative dans la campagne.', TOURNAMENT_ID, 'Poursuivre le duel',
   progress(count(encounter.tournamentProgress, round.goal), round.goal, 'gestes validés'));
 }
 const targetId = encounter.final ? 'final' : encounter.patrol ? region + ':patrol' : encounter.boss ? region + ':guardian'
  : worldItems(region, save).find(item => item.type === 'echo' && item.card === encounter.card)?.id || region + ':echo:0';
 const name = cardById[encounter.card]?.name || 'cet écho';
 if (['victory', 'recruited', 'missed', 'defeat'].includes(encounter.result)) {
  return objective(region, 'encounter-result', encounter.result === 'defeat' ? 'Reprendre après la défaite' : 'Revenir à l’aventure',
   encounter.result === 'defeat' ? 'Ferme le bilan de la rencontre pour préparer ton groupe et réessayer. Ta progression précédente est conservée.' : 'Ferme le bilan de la rencontre. Ton prochain objectif tient compte du résultat enregistré.',
   targetId, 'Revenir au monde', campaignProgress(save));
 }
 if (encounter.pact || encounter.result === 'calm') return objective(region, 'pact', 'Tisser un lien avec ' + name,
  encounter.pact ? 'Observe la réaction de l’écho et choisis entre abriter, écouter et éclairer. Trois gestes adaptés créent un nouveau lien.' : 'L’écho est apaisé. Commence le pacte depuis la rencontre pour gagner sa confiance.',
  targetId, encounter.pact ? 'Poursuivre le pacte' : 'Commencer le pacte', progress(count(encounter.pactStep, 3), 3, 'gestes de confiance'));
 return objective(region, encounter.final ? 'final-combat' : 'combat', encounter.final ? 'Affronter le Monstre de l’Oubli' : encounter.boss ? 'Libérer ' + GUARDIAN_VALUES[region].name : 'Apaiser ' + name,
  encounter.final ? 'Les huit Gardiens t’accompagnent. Applique leurs huit mécaniques dans le combat en temps réel pour rétablir le Lien.' : 'Observe les attaques, protège ton groupe et profite des ouvertures. Le résultat de cette rencontre décidera de la suite.',
  targetId, 'Poursuivre la rencontre', campaignProgress(save));
}

/** targetId is always an interaction in `region`, never a narrative-only location. */
export function adventureObjective(input, requestedRegion = input?.region || 'hub') {
 const save = readableSave(input), region = countryById[requestedRegion] ? requestedRegion : 'hub';
 const active = encounterObjective(save, region);
 if (active) return active;
 const complete = restoredCount(save) === COUNTRIES.length;
 if (save.adventure.finished && complete) return objective(region, 'postgame', 'Un héritage vivant',
  'Le Cercle a retrouvé ses liens. Continue les missions locales, explore les secrets, développe tes refuges et retrouve tes compagnons.',
  region === 'hub' ? 'france' : region + ':camp', region === 'hub' ? 'Repartir explorer' : 'Rejoindre mon refuge', campaignProgress(save));
 if (region === 'hub') {
  if (complete) return objective(region, 'final', 'Réunir les huit héritages',
   'Les huit pays sont restaurés et leurs huit sceaux réunis. Rejoins le Cercle Brisé pour affronter le Monstre de l’Oubli et rendre aux héritages leur Lien.',
   'final', 'Rejoindre le Cercle Brisé', campaignProgress(save));
  // Resume an unfinished visit before suggesting a new country. France is the first destination.
  const next = COUNTRIES.find(({id}) => !restored(save, id) && chapterState(save, id).helped)
   || COUNTRIES.find(({id}) => !restored(save, id));
  const started = chapterState(save, next.id).helped, guardian = GUARDIAN_VALUES[next.id];
  return objective(region, 'journey:' + next.id, started ? 'Reprendre ' + CHAPTERS[next.id].title : 'Traverser la porte de ' + next.name,
   started ? `L’histoire de ${next.name} attend ta prochaine action. Retrouve les souvenirs, libère ${guardian.name}, puis rapporte cet héritage au Nexus.`
    : `Accompagne Kaïs, Porteur du Lien. En ${next.name}, aide les habitants à retrouver leur mémoire et découvre la valeur ${guardian.value}.`,
   next.id, 'Rejoindre ' + next.name, campaignProgress(save));
 }
 const state = chapterState(save, region), chapter = CHAPTERS[region], guardian = GUARDIAN_VALUES[region];
 const story = region + ':story', regionalProgress = progress(state.restored, 3, 'lieux reconstruits');
 if (!state.helped) return objective(region, region + ':help', 'Rencontrer ' + chapter.resident.split(',')[0], chapter.need,
  story, 'Rejoindre l’habitant', regionalProgress);
 if (state.powers.length < 3) return objective(region, region + ':power', ['Suivre ton compagnon', 'Lire les souvenirs', 'Raviver le lieu'][state.powers.length],
  'Retourne au monument avec ton allié. Révèle la trace, comprends son histoire, puis matérialise le passage dans cet ordre.',
  story, 'Rejoindre le monument', progress(state.powers.length, 3, 'pouvoirs éveillés'));
 if (!state.solved) return objective(region, region + ':puzzle', chapter.puzzle, chapter.instruction,
  story, 'Résoudre l’énigme', regionalProgress);
 const memories = [0, 1, 2].filter(index => save.beacons.includes(region + ':' + index));
 const missing = [0, 1, 2].find(index => !memories.includes(index));
 if (missing !== undefined) return objective(region, region + ':memories', 'Retrouver les trois souvenirs',
  'Le monument s’est réveillé. Explore les environs et rassemble les souvenirs dispersés pour rendre leurs histoires aux habitants.',
  region + ':' + missing, 'Suivre le prochain souvenir', progress(memories.length, 3, 'souvenirs retrouvés'));
 if (state.restored < 2) return objective(region, region + ':rebuild', 'Reconstruire ' + chapter.restores[1],
  'Les trois souvenirs sont réunis. Retrouve l’habitant et choisis un jardin ou un atelier : cette réparation prépare ton groupe et transforme le quartier.',
  story, 'Choisir la reconstruction', regionalProgress);
 if (!save.adventure.values[region]?.completed && !save.seals.includes(region)) {
  const value = save.adventure.values[region] || {};
  return objective(region, region + ':value', value.reflectionNeeded ? 'Assumer les conséquences' : 'Comprendre la valeur ' + guardian.value,
   value.reflectionNeeded ? 'Tes décisions ont créé des tensions. Choisis comment en assumer les conséquences pour poursuivre l’épreuve.' : `Avant de libérer ${guardian.name}, prends position dans trois situations liées à ${guardian.value}. Tes choix ont des conséquences.`,
   region + ':value', 'Rejoindre l’épreuve', progress(count(value.step ?? array(value.decisions).length, 3), 3, 'situations traversées'));
 }
 if (!save.seals.includes(region)) return objective(region, region + ':guardian', 'Libérer ' + guardian.name,
  save.team.length ? `La valeur ${guardian.value} est maîtrisée. ${chapter.guardian} Remporte le combat pour obtenir le sceau de ce Gardien.` : 'Équipe au moins un allié dans ton groupe avant de lancer le combat du Gardien. Les trois souvenirs et l’épreuve de valeur sont prêts.',
  region + ':guardian', 'Rejoindre le Gardien', regionalProgress);
 if (state.restored < 3) return objective(region, region + ':inaugurate', 'Inaugurer ' + chapter.restores[2],
  `${guardian.name} est libéré. Retrouve l’habitant pour achever la restauration avant de ramener cet héritage au Nexus.`,
  story, 'Achever la restauration', regionalProgress);
 return objective(region, region + ':homecoming', 'Ramener ' + guardian.name + ' au Nexus',
  save.adventure.cinematicSeen.includes('homecoming:' + region) ? 'Cet héritage a retrouvé sa place. Reviens au Nexus pour choisir la suite de ton aventure ; les activités locales restent accessibles.' : 'Traverse la porte du Nexus. Le retour du Gardien et de cet héritage réveille la Cité des Huit Héritages.',
  'hub', 'Rejoindre le Nexus', campaignProgress(save));
}

export function campaignOverview(input) {
 const save = readableSave(input), complete = restoredCount(save) === COUNTRIES.length;
 const countries = COUNTRIES.map(country => {
  const state = chapterState(save, country.id), guardian = GUARDIAN_VALUES[country.id];
  const completed = restored(save, country.id), returned = completed && save.adventure.cinematicSeen.includes('homecoming:' + country.id);
  return {id: country.id, name: country.name, guardian: guardian.name, value: guardian.value, title: CHAPTERS[country.id].title,
   restored: state.restored, memories: [0, 1, 2].filter(index => save.beacons.includes(country.id + ':' + index)).length,
   seal: save.seals.includes(country.id), returned, completed,
   status: returned ? 'Héritage revenu au Nexus' : completed ? 'Retour au Nexus' : state.helped ? 'Histoire en cours' : 'À découvrir',
   objective: adventureObjective(save, country.id)};
 });
 return {title: 'Le Cercle Brisé', hero: STORY_CANON.hero.name, threat: 'Le Monstre de l’Oubli',
  description: 'Kaïs, Porteur du Lien, aide huit héritages à retrouver leurs mémoires. L’Oubli grandit lorsque leurs histoires cessent de se transmettre.',
  goal: 'Restaurer les huit pays, réunir leurs Gardiens, puis affronter l’Oubli au Cercle Brisé.',
  loop: 'Mission → souvenirs → Gardien → restauration → retour au Nexus',
  progress: campaignProgress(save), finished: !!save.adventure.finished && complete, countries,
  objective: adventureObjective(save, save.region)};
}
