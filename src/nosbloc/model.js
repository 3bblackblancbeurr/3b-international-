export const NOSBLOC_STORAGE_VERSION = 3;
export const NOSBLOC_STORAGE_KEY = "threeb:nosbloc:v1";

export const PROJECT_TYPES = Object.freeze([
  { id: "world", label: "Monde / ville", description: "Ville vivante, quartier, monde ouvert ou espace social." },
  { id: "game", label: "Jeu", description: "Course, sport, combat, aventure, réflexion ou mini-jeu." },
  { id: "story", label: "Manga / récit", description: "Manga interactif, épisode animé, quête narrative ou série." },
  { id: "fashion", label: "Mode / objet", description: "Vêtement, accessoire, décoration, véhicule ou asset 3D." },
  { id: "music", label: "Musique / scène", description: "Concert, clip interactif, radio, scène ou expérience audio." },
  { id: "shop", label: "Boutique / service", description: "Espace de vente, réservation, exposition ou service communautaire." },
]);

export const PROJECT_TEMPLATES = Object.freeze({
  world: ["Ville méditerranéenne", "Quartier 3B", "Monde ouvert", "Espace communautaire"],
  game: ["Course urbaine", "Arène", "Football de rue", "Aventure coopérative"],
  story: ["Manga interactif", "Épisode animé", "Quête narrative", "Cinématique"],
  fashion: ["Collection textile", "Pack d'assets", "Décoration", "Véhicules"],
  music: ["Concert live", "Clip interactif", "Radio 3B", "Scène virtuelle"],
  shop: ["Boutique de créateur", "Galerie", "Billetterie", "Service"],
});

export const PROJECT_STATUSES = Object.freeze(["draft", "private_test", "review", "approved", "published", "restricted", "suspended", "archived"]);

export const ECONOMY_RULES = Object.freeze({
  creatorShareBps: 7000,
  platformOperationsBps: 2000,
  creatorPoolBps: 500,
  protectionGrowthBps: 500,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const round = value => Math.round(Number(value) || 0);
const nowIso = () => new Date().toISOString();

export function toCents(value) {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}

export function formatEuros(cents) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format((Number(cents) || 0) / 100);
}

export function simulateRevenue({ grossEuros = 100, taxRate = 20, storeRate = 0, refundRate = 2, engagementRewardEuros = 0 } = {}) {
  const gross = toCents(grossEuros);
  const taxes = round(gross * clamp(taxRate, 0, 80) / 100);
  const afterTaxes = Math.max(0, gross - taxes);
  const storeFees = round(afterTaxes * clamp(storeRate, 0, 50) / 100);
  const refunds = round(afterTaxes * clamp(refundRate, 0, 40) / 100);
  const eligible = Math.max(0, afterTaxes - storeFees - refunds);
  const creatorDirect = round(eligible * ECONOMY_RULES.creatorShareBps / 10000);
  const operations = round(eligible * ECONOMY_RULES.platformOperationsBps / 10000);
  const creatorPool = round(eligible * ECONOMY_RULES.creatorPoolBps / 10000);
  const protectionGrowth = Math.max(0, eligible - creatorDirect - operations - creatorPool);
  const engagementReward = toCents(engagementRewardEuros);
  return { gross, taxes, storeFees, refunds, eligible, creatorDirect, engagementReward, creatorTotal: creatorDirect + engagementReward, operations, creatorPool, protectionGrowth };
}

export function normalizeSplits(rows = []) {
  const clean = Array.isArray(rows) ? rows : [];
  const allowedStatuses = new Set(["owner", "draft", "invited", "accepted", "declined", "revoked"]);
  return clean.map((row, index) => {
    const status = allowedStatuses.has(row?.status) ? row.status : "draft";
    return {
      id: String(row?.id || `member-${index + 1}`),
      name: String(row?.name || "").trim().slice(0, 50),
      role: String(row?.role || "Création").trim().slice(0, 50),
      contact: String(row?.contact || "").trim().slice(0, 120),
      shareBps: Math.max(0, Math.min(10000, round(row?.shareBps))),
      status,
      inviteCode: status === "invited" ? String(row?.inviteCode || "").trim().slice(0, 32) : "",
      invitedAt: status === "invited" ? String(row?.invitedAt || "") : "",
      acceptedAt: status === "accepted" ? String(row?.acceptedAt || "") : "",
    };
  }).filter(row => row.name);
}

export function teamAgreementReady(rows = []) {
  const splits = normalizeSplits(rows);
  return splits.length > 0 && splits.every(row => row.status === "owner" || row.status === "accepted");
}

export function validateSplits(rows = []) {
  const splits = normalizeSplits(rows);
  const totalBps = splits.reduce((sum, row) => sum + row.shareBps, 0);
  const duplicateNames = new Set();
  const seen = new Set();
  for (const row of splits) {
    const key = row.name.toLocaleLowerCase("fr");
    if (seen.has(key)) duplicateNames.add(row.name);
    seen.add(key);
  }
  return { valid: splits.length > 0 && totalBps === 10000 && duplicateNames.size === 0, totalBps, totalPercent: totalBps / 100, duplicateNames: [...duplicateNames], splits };
}

export function allocateTeamRevenue(amountCents, rows = []) {
  const validation = validateSplits(rows);
  if (!validation.valid) return { valid: false, allocations: [], unallocated: Math.max(0, round(amountCents)), ...validation };
  const amount = Math.max(0, round(amountCents));
  let assigned = 0;
  const allocations = validation.splits.map((row, index) => {
    const value = index === validation.splits.length - 1 ? amount - assigned : Math.floor(amount * row.shareBps / 10000);
    assigned += value;
    return { ...row, amountCents: value };
  });
  return { valid: true, allocations, unallocated: 0, ...validation };
}

export function createProject(input = {}, ownerName = "Fondateur 3B", id) {
  const type = PROJECT_TYPES.some(entry => entry.id === input.type) ? input.type : "world";
  const templates = PROJECT_TEMPLATES[type] || PROJECT_TEMPLATES.world;
  const createdAt = nowIso();
  return {
    id: id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: String(input.title || "Nouveau projet").trim().slice(0, 80),
    type,
    template: templates.includes(input.template) ? input.template : templates[0],
    description: String(input.description || "").trim().slice(0, 600),
    audience: String(input.audience || "Tout public").slice(0, 60),
    status: "draft",
    visibility: "private",
    creationMode: ["ai", "template", "blank", "import"].includes(input.creationMode) ? input.creationMode : "template",
    createdAt,
    updatedAt: createdAt,
    platforms: { mobile: true, web: true, pc: false },
    safety: { moderation: true, cosmeticFirst: true, ageGate: "Tout public" },
    rights: { coreOwned: false, thirdPartyLicensed: false, ageRatingReviewed: false },
    splits: [{ id: "owner", name: ownerName, role: "Direction", contact: "", shareBps: 10000, status: "owner" }],
    plan: [],
    licensedAssets: [],
    versions: [],
    reviewVersionId: null,
    productionVersionId: null,
    restoredFromVersionId: null,
    lastTestedAt: null,
    lastPublishedAt: null,
    stats: { players: 0, retention7: 0, sessionMinutes: 0, trustScore: 100, revenueCents: 0 },
  };
}

export function projectReadiness(project = {}) {
  const split = validateSplits(project.splits);
  const teamReady = teamAgreementReady(project.splits);
  const rightsReady = project.rights?.coreOwned === true && project.rights?.thirdPartyLicensed === true && project.rights?.ageRatingReviewed === true;
  const checks = [
    { id: "identity", label: "Nom du projet", weight: 10, ok: String(project.title || "").trim().length >= 3 },
    { id: "brief", label: "Description claire", weight: 15, ok: String(project.description || "").trim().length >= 40 },
    { id: "template", label: "Format choisi", weight: 5, ok: Boolean(project.template) },
    { id: "audience", label: "Public défini", weight: 5, ok: Boolean(project.audience) },
    { id: "mobile", label: "Mobile ou web activé", weight: 10, ok: Boolean(project.platforms?.mobile || project.platforms?.web) },
    { id: "safety", label: "Modération activée", weight: 10, ok: project.safety?.moderation === true },
    { id: "rights", label: "Droits et classification attestés", weight: 15, ok: rightsReady },
    { id: "splits", label: "Partage à 100 %", weight: 10, ok: split.valid },
    { id: "team", label: "Accords d’équipe acceptés", weight: 5, ok: teamReady },
    { id: "plan", label: "Plan de production", weight: 10, ok: Array.isArray(project.plan) && project.plan.length >= 4 },
    { id: "test", label: "Test privé effectué", weight: 5, ok: Boolean(project.lastTestedAt) },
  ];
  const score = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return { score, checks, rightsReady, teamReady, readyForReview: score >= 85 && split.valid && rightsReady && teamReady && Boolean(project.lastTestedAt) };
}

export function discoveryScore(project = {}) {
  const readiness = projectReadiness(project).score;
  const retention = clamp(project.stats?.retention7, 0, 100);
  const session = clamp(project.stats?.sessionMinutes, 0, 60) / 60 * 100;
  const trust = clamp(project.stats?.trustScore ?? 100, 0, 100);
  return Math.round(readiness * 0.35 + retention * 0.25 + session * 0.15 + trust * 0.25);
}

export function generateBuildPlan(prompt = "", type = "world") {
  const brief = String(prompt || "").trim().slice(0, 600);
  const focus = {
    world: "quartiers, circulation, lieux utiles et boucle sociale",
    game: "règles, contrôles, difficulté, récompenses et rejouabilité",
    story: "personnages, séquences, choix, rythme et continuité",
    fashion: "collection, variantes, droits, aperçu 3D et distribution",
    music: "scène, synchronisation audio, public, droits et diffusion",
    shop: "catalogue, parcours, confiance, paiement et service après-vente",
  }[type] || "expérience, progression et qualité mobile";
  const seed = brief || "Construire une expérience Nosbloc claire, mobile et communautaire.";
  return [
    { id: "vision", category: "Vision", title: "Définir la promesse jouable", detail: `${seed} Priorité : ${focus}.`, priority: "P0", done: false },
    { id: "prototype", category: "Prototype", title: "Livrer une boucle de 5 minutes", detail: "Un joueur comprend, agit, reçoit un retour et peut recommencer sans tutoriel interminable.", priority: "P0", done: false },
    { id: "mobile", category: "Mobile", title: "Valider tactile et performances", detail: "Contrôles au pouce, texte lisible, chargement progressif et budget graphique mesuré.", priority: "P0", done: false },
    { id: "safety", category: "Confiance", title: "Activer 3B Trust", detail: "Permissions minimales, signalement, anti-bot, modération et journal des changements.", priority: "P0", done: false },
    { id: "economy", category: "Économie", title: "Monétiser sans pay-to-win", detail: "Prix visibles, droits clairs et trace comptable de chaque revenu.", priority: "P1", done: false },
    { id: "measure", category: "Qualité", title: "Mesurer la vraie valeur", detail: "Temps actif, retour J+1/J+7, stabilité, invitations qualifiées et satisfaction.", priority: "P1", done: false },
  ];
}

export function createActivity(type, title, detail = "", metadata = {}) {
  return { id: globalThis.crypto?.randomUUID?.() || `activity-${Date.now()}-${Math.random()}`, type, title: String(title).slice(0, 120), detail: String(detail).slice(0, 240), metadata, createdAt: nowIso(), read: false };
}

export function createEmptyState(profile = {}) {
  return {
    version: NOSBLOC_STORAGE_VERSION,
    profile: {
      studioName: String(profile.studioName || "Mon studio 3B").slice(0, 60),
      level: "STARTER",
      verification: "non_demandee",
      payoutStatus: "verrouille",
      trustScore: 100,
      studioMode: "simple",
    },
    projects: [],
    marketplace: [],
    activity: [],
    wallet: { real: { availableCents: 0, pendingCents: 0, payoutCents: 0, currency: "EUR" }, coins: { balance: 0 } },
    updatedAt: nowIso(),
  };
}

export function normalizeState(input, profile = {}) {
  const fallback = createEmptyState(profile);
  if (!input || typeof input !== "object") return fallback;
  const projects = Array.isArray(input.projects) ? input.projects.filter(project => project && typeof project === "object").slice(0, 80).map(project => ({
    ...project,
    status: PROJECT_STATUSES.includes(project.status) ? project.status : "draft",
    visibility: project.visibility === "public" ? "public" : "private",
    creationMode: ["ai", "template", "blank", "import"].includes(project.creationMode) ? project.creationMode : "template",
    rights: { coreOwned: false, thirdPartyLicensed: false, ageRatingReviewed: false, ...(project.rights || {}) },
    safety: { moderation: true, cosmeticFirst: true, ageGate: "Tout public", ...(project.safety || {}) },
    platforms: { mobile: true, web: true, pc: false, ...(project.platforms || {}) },
    splits: normalizeSplits(project.splits),
    versions: Array.isArray(project.versions) ? project.versions.slice(-40) : [],
    reviewVersionId: project.reviewVersionId || null,
    productionVersionId: project.productionVersionId || null,
    restoredFromVersionId: project.restoredFromVersionId || null,
    lastTestedAt: project.lastTestedAt || null,
    lastPublishedAt: project.lastPublishedAt || null,
    stats: { players: 0, retention7: 0, sessionMinutes: 0, trustScore: 100, revenueCents: 0, ...(project.stats || {}) },
  })) : [];
  return {
    ...fallback,
    ...input,
    version: NOSBLOC_STORAGE_VERSION,
    profile: { ...fallback.profile, ...(input.profile || {}) },
    projects,
    marketplace: Array.isArray(input.marketplace) ? input.marketplace.slice(0, 500) : [],
    activity: Array.isArray(input.activity) ? input.activity.slice(-250) : [],
    wallet: {
      real: { ...fallback.wallet.real, ...(input.wallet?.real || {}) },
      coins: { ...fallback.wallet.coins, ...(input.wallet?.coins || {}) },
    },
    updatedAt: String(input.updatedAt || nowIso()),
  };
}
