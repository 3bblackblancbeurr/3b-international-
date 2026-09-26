const TYPES = new Set(["world", "game", "story", "fashion", "music", "shop"]);
const STAGES = new Set(["checkpoint", "review"]);
const DECISIONS = new Set(["approved", "rejected"]);
const clampText = (value, max) => String(value || "").trim().slice(0, max);
const integer = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));

export function normalizeMemberHandle(value) {
  const handle = clampText(value, 24).toLocaleLowerCase("fr");
  if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(handle)) throw new Error("Identifiant 3B invalide.");
  return handle;
}

export function normalizeUuid(value, label = "Identifiant") {
  const id = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new Error(`${label} invalide.`);
  return id;
}

export function normalizeProjectPayload(source = {}) {
  const splits = (Array.isArray(source.splits) ? source.splits : []).slice(0, 20).map((row, index) => ({
    memberKey: clampText(row?.memberKey || row?.id || `member-${index + 1}`, 80),
    name: clampText(row?.name || "Membre", 50),
    role: clampText(row?.role || "Création", 50),
    shareBps: integer(row?.shareBps, 0, 10000),
    localStatus: ["owner", "draft", "invited", "accepted"].includes(row?.localStatus || row?.status) ? (row.localStatus || row.status) : "draft",
  })).filter(row => row.memberKey && row.name);
  const type = TYPES.has(source.type) ? source.type : "world";
  return {
    clientProjectId: clampText(source.id || source.clientProjectId, 100),
    title: clampText(source.title, 80),
    type,
    template: clampText(source.template, 100),
    description: clampText(source.description, 2000),
    audience: clampText(source.audience || "Tout public", 60),
    platforms: {
      mobile: source.platforms?.mobile !== false,
      web: source.platforms?.web !== false,
      pc: source.platforms?.pc === true,
    },
    safety: {
      moderation: source.safety?.moderation === true,
      cosmeticFirst: source.safety?.cosmeticFirst !== false,
      ageGate: clampText(source.safety?.ageGate || "Tout public", 40),
    },
    rights: {
      contentOwned: source.rights?.contentOwned === true,
      thirdPartyLicensed: source.rights?.thirdPartyLicensed === true,
      audienceReviewed: source.rights?.audienceReviewed === true,
    },
    splits,
    plan: (Array.isArray(source.plan) ? source.plan : []).slice(0, 60).map(item => ({
      id: clampText(item?.id, 80), title: clampText(item?.title, 140), done: item?.done === true,
    })),
    licensedAssets: [...new Set((Array.isArray(source.licensedAssets) ? source.licensedAssets : []).map(value => clampText(value, 100)).filter(Boolean))].slice(0, 100),
  };
}

export function validateProjectPayload(project) {
  const payload = normalizeProjectPayload(project);
  const totalBps = payload.splits.reduce((sum, row) => sum + row.shareBps, 0);
  const errors = [];
  if (payload.clientProjectId.length < 3) errors.push("client_project_id");
  if (payload.title.length < 3) errors.push("title");
  if (payload.description.length < 40) errors.push("description");
  if (!payload.template) errors.push("template");
  if (!payload.safety.moderation) errors.push("moderation");
  if (payload.splits.length < 1 || totalBps !== 10000) errors.push("splits");
  return { valid: errors.length === 0, errors, totalBps, payload };
}

export function reviewPreview(project) {
  const validation = validateProjectPayload(project);
  const p = validation.payload;
  const agreementsAccepted = p.splits.every(row => row.localStatus === "owner" || row.localStatus === "accepted");
  const rightsReady = p.rights.contentOwned && p.rights.thirdPartyLicensed && p.rights.audienceReviewed;
  return { ...validation, agreementsAccepted, rightsReady, ready: validation.valid && agreementsAccepted && rightsReady };
}

export function normalizeVersionStage(value) {
  const stage = String(value || "");
  if (!STAGES.has(stage)) throw new Error("Étape de version invalide.");
  return stage;
}

export function normalizeModerationDecision(value) {
  const decision = String(value || "");
  if (!DECISIONS.has(decision)) throw new Error("Décision invalide.");
  return decision;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((out, key) => ({ ...out, [key]: stable(value[key]) }), {});
  return value === undefined ? null : value;
}
export const stableStringify = value => JSON.stringify(stable(value));
