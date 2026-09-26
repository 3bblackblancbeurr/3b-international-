import { NOSBLOC_STORAGE_VERSION, normalizeSplits, normalizeState } from "./model.js";

export const NOSBLOC_EXPORT_FORMAT = "nosbloc-3b-backup";
export const NOSBLOC_VERSION_LIMIT = 20;
const VERSION_STAGES = new Set(["checkpoint", "review", "approved", "published"]);

const nowIso = () => new Date().toISOString();
const clone = value => JSON.parse(JSON.stringify(value));

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value === undefined ? null : value;
}

export function fingerprint(value) {
  const text = JSON.stringify(stableValue(value)) || "null";
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function privateFreeSplits(rows) {
  return normalizeSplits(rows).map(({ contact, inviteCode, invitedAt, acceptedAt, ...row }) => row);
}

export function projectSnapshot(project = {}) {
  return {
    schemaVersion: NOSBLOC_STORAGE_VERSION,
    title: String(project.title || "").slice(0, 80),
    type: String(project.type || "world"),
    template: String(project.template || ""),
    description: String(project.description || "").slice(0, 600),
    audience: String(project.audience || "Tout public").slice(0, 60),
    platforms: clone(project.platforms || {}),
    safety: clone(project.safety || {}),
    rights: clone(project.rights || {}),
    splits: privateFreeSplits(project.splits),
    plan: clone(Array.isArray(project.plan) ? project.plan : []),
    licensedAssets: [...new Set(Array.isArray(project.licensedAssets) ? project.licensedAssets : [])],
    scripts: clone(Array.isArray(project.scripts) ? project.scripts.slice(0, 40) : []),
    aiBrief: String(project.aiBrief || "").slice(0, 2000),
  };
}

export function createProjectVersion(project = {}, options = {}) {
  const current = Array.isArray(project.versions) ? project.versions : [];
  const versionNo = current.reduce((highest, row) => Math.max(highest, Number(row?.versionNo) || 0), 0) + 1;
  const stage = VERSION_STAGES.has(options.stage) ? options.stage : "checkpoint";
  const createdAt = String(options.createdAt || nowIso());
  const snapshot = projectSnapshot(project);
  const entropy = options.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return {
    id: String(options.id || `version-${fingerprint({ entropy, versionNo, createdAt })}`),
    versionNo,
    stage,
    note: String(options.note || (stage === "review" ? "Version envoyée en révision" : "Point de reprise")).trim().slice(0, 160),
    createdAt,
    sourceUpdatedAt: String(project.updatedAt || createdAt),
    fingerprint: fingerprint(snapshot),
    snapshot,
  };
}

export function appendProjectVersion(project = {}, options = {}) {
  const version = createProjectVersion(project, options);
  const versions = [...(Array.isArray(project.versions) ? project.versions : []), version].slice(-NOSBLOC_VERSION_LIMIT);
  const review = version.stage === "review";
  return {
    version,
    project: {
      ...project,
      versions,
      status: review ? "review" : project.status,
      visibility: "private",
      reviewVersionId: review ? version.id : project.reviewVersionId || null,
      updatedAt: version.createdAt,
    },
  };
}

export function restoreProjectVersion(project = {}, versionId) {
  const versions = Array.isArray(project.versions) ? project.versions : [];
  const version = versions.find(row => row?.id === versionId);
  if (!version?.snapshot) throw new Error("Version Nosbloc introuvable.");
  if (fingerprint(version.snapshot) !== version.fingerprint) throw new Error("Cette version est endommagée.");

  const privateByMember = new Map(normalizeSplits(project.splits).map(row => [row.id, row]));
  const splits = normalizeSplits(version.snapshot.splits).map(row => {
    const privateRow = privateByMember.get(row.id) || {};
    return {
      ...row,
      contact: privateRow.contact || "",
      inviteCode: privateRow.inviteCode || "",
      invitedAt: privateRow.invitedAt || "",
      acceptedAt: privateRow.acceptedAt || "",
    };
  });
  return {
    ...project,
    ...clone(version.snapshot),
    splits,
    versions,
    status: "draft",
    visibility: "private",
    reviewVersionId: null,
    restoredFromVersionId: version.id,
    updatedAt: nowIso(),
  };
}

export function createInvitationCode(projectId, memberId, entropy) {
  const seed = String(entropy || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const left = fingerprint({ projectId, memberId, seed, part: 1 }).toUpperCase();
  const right = fingerprint({ projectId, memberId, seed, part: 2 }).toUpperCase();
  return `NB3B-${left.slice(0, 4)}-${right.slice(0, 4)}`;
}

export function prepareTeamInvitation(project = {}, memberId, contact = "") {
  const rows = normalizeSplits(project.splits);
  if (!rows.some(row => row.id === memberId && row.status !== "owner")) throw new Error("Membre introuvable.");
  const invitedAt = nowIso();
  const inviteCode = createInvitationCode(project.id, memberId);
  return {
    ...project,
    status: "draft",
    visibility: "private",
    reviewVersionId: null,
    splits: rows.map(row => row.id === memberId ? {
      ...row,
      contact: String(contact || row.contact || "").trim().slice(0, 120),
      status: "invited",
      inviteCode,
      invitedAt,
      acceptedAt: "",
    } : row),
    updatedAt: invitedAt,
  };
}

export function revokeTeamInvitation(project = {}, memberId) {
  return {
    ...project,
    status: "draft",
    visibility: "private",
    reviewVersionId: null,
    splits: normalizeSplits(project.splits).map(row => row.id === memberId && row.status !== "owner" ? {
      ...row,
      status: "draft",
      inviteCode: "",
      invitedAt: "",
      acceptedAt: "",
    } : row),
    updatedAt: nowIso(),
  };
}

export function serializeStateExport(state) {
  const normalized = normalizeState(state, state?.profile || {});
  const envelope = {
    format: NOSBLOC_EXPORT_FORMAT,
    version: NOSBLOC_STORAGE_VERSION,
    exportedAt: nowIso(),
    fingerprint: fingerprint(normalized),
    state: normalized,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseStateExport(text, profile = {}) {
  const source = String(text || "");
  if (!source.trim() || source.length > 2_000_000) throw new Error("Archive Nosbloc invalide ou trop volumineuse.");
  let envelope;
  try {
    envelope = JSON.parse(source);
  } catch {
    throw new Error("Le fichier n’est pas un JSON Nosbloc valide.");
  }
  if (envelope?.format !== NOSBLOC_EXPORT_FORMAT) throw new Error("Format d’archive Nosbloc inconnu.");
  if (!Number.isInteger(envelope.version) || envelope.version < 1 || envelope.version > NOSBLOC_STORAGE_VERSION) {
    throw new Error("Version d’archive Nosbloc incompatible.");
  }
  const normalized = normalizeState(envelope.state, profile);
  if (fingerprint(normalized) !== envelope.fingerprint) throw new Error("L’archive a été modifiée ou endommagée.");
  return normalized;
}
