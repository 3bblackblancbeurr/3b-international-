export const NOSBLOC_STORAGE_VERSION = 1;
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

export function simulateRevenue({
  grossEuros = 100,
  taxRate = 20,
  storeRate = 0,
  refundRate = 2,
  engagementRewardEuros = 0,
} = {}) {
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

  return {
    gross,
    taxes,
    storeFees,
    refunds,
    eligible,
    creatorDirect,
    engagementReward,
    creatorTotal: creatorDirect + engagementReward,
    operations,
    creatorPool,
    protectionGrowth,
  };
}

export function normalizeSplits(rows = []) {
  const clean = Array.isArray(rows) ? rows : [];
  return clean
    .map((row, index) => ({
      id: String(row?.id || `member-${index + 1}`),
      name: String(row?.name || "").trim().slice(0, 50),
      role: String(row?.role || "Création").trim().slice(0, 50),
      shareBps: Math.max(0, Math.min(10000, round(row?.shareBps))),
      status: ["owner", "draft", "accepted"].includes(row?.status) ? row.status : "draft",
    }))
    .filter(row => row.name);
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
  return {
    valid: splits.length > 0 && totalBps === 10000 && duplicateNames.size === 0,
    totalBps,
    totalPercent: totalBps / 100,
    duplicateNames: [...duplicateNames],
    splits,
  };
}

export function allocateTeamRevenue(amountCents, rows = []) {
  const validation = validateSplits(rows);
  if (!validation.valid) return { valid: false, allocations: [], unallocated: Math.max(0, round(amountCents)), ...validation };

  const amount = Math.max(0, round(amountCents));
  let assigned = 0;
  const allocations = validation.splits.map((row, index) => {
    const value = index === validation.splits.length - 1
      ? amount - assigned
      : Math.floor(amount * row.shareBps / 10000);
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
    createdAt,
    updatedAt: createdAt,
    platforms: { mobile: true, web: true, pc: false },
    safety: { moderation: true, cosmeticFirst: true, ageGate: "Tout public" },
    splits: [{ id: "owner", name: ownerName, role: "Direction", shareBps: 10000, status: "owner" }],
    plan: [],
    licensedAssets: [],
    stats: { players: 0, retention7: 0, sessionMinutes: 0, trustScore: 100 },
  };
}

export function projectReadiness(project = {}) {
  const split = validateSplits(project.splits);
  const checks = [
    { id: "identity", label: "Nom du projet", weight: 15, ok: String(project.title || "").trim().length >= 3 },
    { id: "brief", label: "Description claire", weight: 15, ok: String(project.description || "").trim().length >= 40 },
    { id: "template", label: "Format choisi", weight: 10, ok: Boolean(project.template) },
    { id: "audience", label: "Public défini", weight: 10, ok: Boolean(project.audience) },
    { id: "mobile", label: "Mobile ou web activé", weight: 10, ok: Boolean(project.platforms?.mobile || project.platforms?.web) },
    { id: "safety", label: "Modération activée", weight: 15, ok: project.safety?.moderation === true },
    { id: "splits", label: "Partage à 100 %", weight: 15, ok: split.valid },
    { id: "plan", label: "Plan de production", weight: 10, ok: Array.isArray(project.plan) && project.plan.length >= 4 },
  ];
  const score = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return { score, checks, readyForReview: score >= 80 && split.valid };
}

export function discoveryScore(project = {}) {
  const readiness = projectReadiness(project).score;
  const retention = clamp(project.stats?.retention7, 0, 100);
  const session = clamp(project.stats?.sessionMinutes, 0, 60) / 60 * 100;
  const trust = clamp(project.stats?.trustScore ?? 100, 0, 100);
  return Math.round(readiness * 0.4 + retention * 0.25 + session * 0.15 + trust * 0.2);
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
    { id: "economy", category: "Économie", title: "Monétiser sans pay-to-win", detail: "Cosmétiques, extensions utiles et prix visibles. Chaque revenu garde sa trace comptable.", priority: "P1", done: false },
    { id: "measure", category: "Qualité", title: "Mesurer la vraie valeur", detail: "Temps actif, retour J+1/J+7, stabilité, invitations qualifiées et satisfaction.", priority: "P1", done: false },
  ];
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
    },
    projects: [],
    marketplace: [],
    updatedAt: nowIso(),
  };
}

export function normalizeState(input, profile = {}) {
  const fallback = createEmptyState(profile);
  if (!input || typeof input !== "object") return fallback;
  const projects = Array.isArray(input.projects)
    ? input.projects.filter(project => project && typeof project === "object").slice(0, 40)
    : [];
  return {
    ...fallback,
    ...input,
    version: NOSBLOC_STORAGE_VERSION,
    profile: { ...fallback.profile, ...(input.profile || {}) },
    projects,
    marketplace: Array.isArray(input.marketplace) ? input.marketplace.slice(0, 200) : [],
    updatedAt: String(input.updatedAt || nowIso()),
  };
}
