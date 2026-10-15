// Editorial sequences for general adult wellbeing, not rehabilitation plans.
// Durations describe a timer window, never a measured health benefit.
export const WELLNESS_SOURCES = {
  seated: { label: 'NHS · mouvements assis', url: 'https://www.nhs.uk/live-well/exercise/sitting-exercises/' },
  flexibility: { label: 'NHS · mobilité douce', url: 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/' },
  walking: { label: 'NHS · commencer à marcher', url: 'https://www.nhs.uk/live-well/exercise/walking-for-health/' },
  breaks: { label: 'Manger Bouger · interrompre le temps assis', url: 'https://www.mangerbouger.fr/bouger-plus/a-tout-age-et-a-chaque-etape-de-la-vie/les-recommandations-pour-les-adultes/reduire-le-temps-passe-assis' },
  sleep: { label: 'NHS · préparer son repos', url: 'https://www.nhs.uk/every-mind-matters/mental-health-issues/sleep/' },
  teeth: { label: 'NHS · hygiène des dents', url: 'https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/' },
};

export const MOBILITY_SESSIONS = [
  {
    id: 'seated-3', name: 'Tout doux, assis', subtitle: 'Une chaise. Un peu de mobilité.', photo: 'rest', minutes: 3, tag: 'ASSIS', sourceIds: ['seated'],
    steps: [
      { title: 'Installe-toi', seconds: 20, kind: 'prepare', text: 'Choisis une chaise stable, sans roulettes. Pose les pieds au sol. Dégage de la place pour tes jambes.' },
      { title: 'Lève un genou, puis l’autre', seconds: 50, kind: 'move', text: 'Tiens les côtés de la chaise. Lève doucement un genou, puis repose le pied. Alterne, jusqu’à 5 fois de chaque côté, sans forcer.', tip: 'Répétitions finies ? Utilise « Fait, continuer ». Aucun besoin de remplir le temps.' },
      { title: 'Relâche', seconds: 15, kind: 'rest', text: 'Repose les deux pieds. Fais une pause plus longue si tu en as besoin.' },
      { title: 'Mobilise les chevilles', seconds: 60, kind: 'move', text: 'Tiens la chaise. Allonge une jambe à hauteur confortable. Pointe le pied puis ramène les orteils vers toi, 5 fois. Change de côté.', tip: 'Garde une petite amplitude confortable. Termine l’étape dès tes répétitions finies.' },
      { title: 'Reviens au calme', seconds: 35, kind: 'rest', text: 'Repose les pieds et relâche les jambes. Observe simplement comment tu te sens.' },
    ],
  },
  {
    id: 'desk-5', name: 'Pause hors du bureau', subtitle: 'Se délier. Changer de position.', photo: 'walking', minutes: 5, tag: 'PAUSE ACTIVE', sourceIds: ['breaks', 'flexibility'],
    steps: [
      { title: 'Libère le passage', seconds: 20, kind: 'prepare', text: 'Vérifie que tu peux te lever et marcher sans obstacle. Si cela ne te convient pas, choisis la séance assise.' },
      { title: 'Quelques pas', seconds: 90, kind: 'move', text: 'Lève-toi progressivement, puis marche tranquillement dans un espace dégagé. Ton allure reste confortable.' },
      { title: 'Une pause', seconds: 20, kind: 'rest', text: 'Installe-toi confortablement, debout avec un appui ou assis. Reprends quand tu es prêt.' },
      { title: 'Regarde doucement de chaque côté', seconds: 50, kind: 'move', text: 'Assis, épaules relâchées, tourne la tête à gauche sans forcer. Garde la position jusqu’à 5 secondes, puis reviens. Alterne, au plus 3 fois de chaque côté.', tip: 'Pas de cercle de tête. Si le mouvement gêne, passe cette étape.' },
      { title: 'Marche encore un peu', seconds: 90, kind: 'move', text: 'Reprends quelques pas à ton rythme. Le minuteur est un repère, tu peux terminer plus tôt.' },
      { title: 'Reprends ta place', seconds: 30, kind: 'rest', text: 'Réinstalle-toi sans précipitation. Tu peux ajuster ton poste pour retrouver une position confortable.' },
    ],
  },
  {
    id: 'walk-5', name: 'Une petite marche', subtitle: 'Un départ facile, à ton allure.', photo: 'walking', minutes: 5, tag: 'À TON RYTHME', sourceIds: ['walking'],
    steps: [
      { title: 'Choisis ton parcours', seconds: 30, kind: 'prepare', text: 'Chaussures confortables, passage dégagé : prépare un trajet simple. Lis les consignes à l’arrêt, en sécurité.' },
      { title: 'Pars doucement', seconds: 60, kind: 'move', text: 'Commence à marcher tranquillement. Reste attentif à ton environnement, sans regarder l’écran en marchant.' },
      { title: 'Trouve ton allure', seconds: 150, kind: 'move', text: 'Poursuis à une allure qui te convient. L’objectif est de bouger un peu, sans chercher une vitesse ni un nombre de pas.' },
      { title: 'Ralentis', seconds: 30, kind: 'move', text: 'Réduis tranquillement ton allure et rejoins un endroit où tu peux t’arrêter en sécurité.' },
      { title: 'Un instant pour toi', seconds: 30, kind: 'rest', text: 'Arrête-toi confortablement. Tu peux noter uniquement le temps de mouvement que tu as réellement fait.' },
    ],
  },
];

export const DAILY_ROUTINES = {
  wake: [
    { id: 'wake-water', title: 'Préparer de l’eau', detail: 'Garde de l’eau accessible pour la journée.', route: 'food' },
    { id: 'wake-move', title: 'Choisir un petit mouvement', detail: 'Une séance douce ou une courte marche, selon ton envie.', route: 'move' },
    { id: 'wake-meal', title: 'Prévoir un repas', detail: 'Une idée simple pour éviter de chercher au dernier moment.', route: 'food' },
  ],
  rest: [
    { id: 'rest-slow', title: 'Ralentir avant le repos', detail: 'Pose le téléphone et choisis un moment calme.', route: 'rest' },
    { id: 'rest-care', title: 'Prendre soin de ses dents', detail: 'Brossage avec un dentifrice fluoré, environ 2 minutes.', route: 'body' },
    { id: 'rest-journal', title: 'Préparer son temps de repos', detail: 'Prévois tes horaires, même si tu dors en journée.', route: 'rest' },
  ],
};
export const ROUTINE_IDS = Object.values(DAILY_ROUTINES).flat().map(item => item.id);
export function normalizeRoutineIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => ROUTINE_IDS.includes(id)))] : [];
}
export function toggleRoutine(value, id) {
  const current = normalizeRoutineIds(value);
  return !ROUTINE_IDS.includes(id) ? current : current.includes(id) ? current.filter(item => item !== id) : [...current, id];
}

export function freshMobilityTimer() {
  return { status: 'ready', index: 0, elapsedMs: 0, activeMs: 0, deadlineMs: null, lastTickMs: null, skipped: 0, recorded: false, interrupted: false };
}

// A monotonic deadline avoids interval drift. A stalled page pauses instead of
// crediting an unobserved gap; at most the currently displayed step can finish.
function updateElapsed(state, session, now) {
  if (state.status !== 'running' || !Number.isFinite(now)) return state;
  if (now < state.lastTickMs) return state;
  if (now - state.lastTickMs > 2500) return { ...state, status: 'paused', deadlineMs: null, lastTickMs: null, interrupted: true };
  const duration = session.steps[state.index].seconds * 1000;
  return { ...state, elapsedMs: Math.max(state.elapsedMs, Math.min(duration, duration - (state.deadlineMs - now))), lastTickMs: now };
}
function nextStep(state, session, now, skip = false) {
  const activeMs = state.activeMs + (!skip && session.steps[state.index].kind === 'move' ? state.elapsedMs : 0);
  const index = state.index + 1;
  const running = state.status === 'running';
  return { ...state, index, activeMs, elapsedMs: 0, skipped: state.skipped + (skip ? 1 : 0),
    status: index === session.steps.length ? 'complete' : running ? 'running' : 'ready',
    deadlineMs: index < session.steps.length && running ? now + session.steps[index].seconds * 1000 : null,
    lastTickMs: index < session.steps.length && running ? now : null,
  };
}
export function mobilityTimerAction(state, session, action, now) {
  if (action === 'reset') return freshMobilityTimer();
  if (!session?.steps?.length || !Number.isFinite(now)) return state;
  if (action === 'record') return state.status === 'complete' && !state.recorded && state.activeMs > 0 ? { ...state, recorded: true } : state;
  if (state.status === 'complete') return state;
  if (action === 'start') {
    if (!['ready', 'paused'].includes(state.status)) return state;
    return { ...state, status: 'running', deadlineMs: now + session.steps[state.index].seconds * 1000 - state.elapsedMs, lastTickMs: now, interrupted: false };
  }
  const updated = updateElapsed(state, session, now);
  if (action === 'pause') return updated.status === 'running' ? { ...updated, status: 'paused', deadlineMs: null, lastTickMs: null } : updated;
  if (action === 'skip') return nextStep(updated, session, now, true);
  if (action === 'finish') return nextStep(updated, session, now);
  if (action === 'tick' && updated.status === 'running' && updated.elapsedMs >= session.steps[updated.index].seconds * 1000) return nextStep(updated, session, now);
  return updated;
}
export function mobilityActiveMinutes(state) { return Math.floor(Math.max(0, state.activeMs) / 6000) / 10; }
export function mobilityTimeLabel(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
