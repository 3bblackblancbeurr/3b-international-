import { authClient } from "../loyalty/client.js";
import { projectSnapshot } from "./versioning.js";

const encoder = new TextEncoder();

function randomUuid() {
  return globalThis.crypto?.randomUUID?.() || "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12);
}

async function stableUuid(parts = []) {
  const text = parts.map(value => String(value ?? "")).join("|");
  if (!globalThis.crypto?.subtle) return randomUuid();
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(text)));
  const bytes = [...digest.slice(0, 16)];
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map(value => value.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join("-");
}

function messageFor(error) {
  const source = String(error?.message || error?.details || error || "");
  const rules = [
    ["authentication_required", "Reconnecte-toi à ton compte 3B."],
    ["passport_required", "Un Passeport 3B actif est requis pour synchroniser Nosbloc."],
    ["nosbloc_server_disabled", "La synchronisation Nosbloc est momentanément désactivée."],
    ["project_locked", "Ce projet est verrouillé pendant sa vérification ou sa publication."],
    ["owner_required", "Seul le propriétaire peut effectuer cette action."],
    ["team_not_accepted", "Tous les membres doivent avoir accepté et le partage doit totaliser 100 %."],
    ["publication_requirements_missing", "Les droits, la classification et la modération doivent être validés avant révision."],
    ["discover_disabled", "La publication publique Nosbloc n’est pas encore ouverte."],
    ["project_not_publishable", "Ce projet doit être approuvé avant publication."],
    ["moderator_required", "Cette action est réservée à la modération Nosbloc."],
    ["payouts_disabled", "Les versements réels sont encore verrouillés."],
    ["payout_account_not_ready", "Le compte créateur doit terminer KYC et fiscalité avant un versement."],
    ["product_not_ready", "Ce produit doit être complet et ses droits confirmés."],
    ["project_must_be_published", "Le projet doit être publié avant de vendre ce produit."],
    ["refund_invalid", "Cette demande de remboursement n’est pas valide."],
  ];
  const found = rules.find(([needle]) => source.includes(needle));
  return found?.[1] || source || "Nosbloc serveur est momentanément indisponible.";
}

async function rpc(name, args = {}) {
  const { data, error } = await authClient.rpc(name, args);
  if (error) {
    const wrapped = new Error(messageFor(error));
    wrapped.code = error.code || "";
    wrapped.raw = error;
    throw wrapped;
  }
  return data;
}

function cleanProjectPayload(project, readinessScore = 0) {
  const { server, versions, ...payload } = project || {};
  const splits = Array.isArray(payload.splits) ? payload.splits.map(row => {
    const { contact, inviteCode, invitationId, invitedAt, acceptedAt, ...publicRow } = row || {};
    return publicRow;
  }) : [];
  return {
    ...payload,
    splits,
    server: {
      readiness: Math.max(0, Math.min(100, Number(readinessScore) || 0)),
      client: "nosbloc-premium-v2",
    },
  };
}

export async function fetchNosblocSnapshot() {
  return rpc("nosbloc_snapshot_api");
}

export async function fetchNosblocDiscover(query = "", type = "all") {
  return rpc("nosbloc_discover_api", {
    p_query: String(query || "").slice(0, 120),
    p_type: String(type || "all"),
  });
}

export async function fetchNosblocFinance() {
  return rpc("nosbloc_finance_snapshot_api");
}

export async function syncNosblocProject(project, readinessScore = 0) {
  const key = await stableUuid(["sync", project?.id, project?.updatedAt]);
  return rpc("nosbloc_sync_project_api", {
    p_client_project: String(project?.id || ""),
    p_payload: cleanProjectPayload(project, readinessScore),
    p_idempotency: key,
  });
}

export async function createNosblocVersion(project, serverProjectId, stage, note = "") {
  if (!serverProjectId) throw new Error("Le projet doit d’abord être synchronisé.");
  const snapshot = projectSnapshot(project);
  const key = await stableUuid(["version", serverProjectId, stage, project?.updatedAt, JSON.stringify(snapshot)]);
  try {
    return await rpc("nosbloc_create_version_api", {
      p_project: serverProjectId,
      p_stage: stage,
      p_snapshot: snapshot,
      p_note: String(note || "").slice(0, 160),
      p_idempotency: key,
    });
  } catch (error) {
    if (error.code !== "23505") throw error;
    const { data, error: lookupError } = await authClient
      .from("nosbloc_project_versions")
      .select("version_id,version_no,stage,snapshot_hash,created_at")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (lookupError || !data) throw error;
    return {
      ok: true,
      versionId: data.version_id,
      versionNo: data.version_no,
      stage: data.stage,
      snapshotHash: data.snapshot_hash,
      createdAt: data.created_at,
      replayed: true,
    };
  }
}

export async function fetchNosblocVersions(serverProjectId) {
  return rpc("nosbloc_project_versions_api", { p_project: serverProjectId });
}

export async function restoreNosblocVersion(serverProjectId, serverVersionId) {
  return rpc("nosbloc_restore_version_api", {
    p_project: serverProjectId,
    p_version: serverVersionId,
    p_idempotency: await stableUuid(["restore", serverProjectId, serverVersionId]),
  });
}

export async function inviteNosblocMember(serverProjectId, row) {
  const handle = String(row?.contact || "").trim();
  if (!handle) throw new Error("Ajoute l’identifiant 3B du membre.");
  return rpc("nosbloc_invite_api", {
    p_project: serverProjectId,
    p_member_key: String(row?.id || ""),
    p_handle: handle,
    p_role: String(row?.role || "Création").slice(0, 50),
    p_share_bps: Math.max(0, Math.min(10000, Number(row?.shareBps) || 0)),
    p_idempotency: randomUuid(),
  });
}

export async function revokeNosblocInvitation(invitationId) {
  return rpc("nosbloc_revoke_invitation_api", {
    p_invitation: invitationId,
    p_idempotency: randomUuid(),
  });
}

export async function removeNosblocMember(serverProjectId, memberKey) {
  return rpc("nosbloc_remove_member_api", {
    p_project: serverProjectId,
    p_member_key: String(memberKey || ""),
    p_idempotency: randomUuid(),
  });
}

export async function decideNosblocInvitation(invitationId, accept) {
  return rpc("nosbloc_decide_invitation_api", {
    p_invitation: invitationId,
    p_accept: !!accept,
    p_idempotency: await stableUuid(["invite-decision", invitationId, !!accept]),
  });
}

export async function moderateNosblocCase(caseId, decision, reason = "") {
  return rpc("nosbloc_moderate_api", {
    p_case: caseId,
    p_decision: decision,
    p_reason: String(reason || "").slice(0, 300),
    p_idempotency: randomUuid(),
  });
}

export async function moderateNosblocProduct(productId, approve, reason = "") {
  return rpc("nosbloc_moderate_product_api", {
    p_product: productId,
    p_approve: !!approve,
    p_reason: String(reason || "").slice(0, 300),
    p_idempotency: randomUuid(),
  });
}

export async function publishNosblocProject(serverProjectId) {
  return rpc("nosbloc_publish_api", {
    p_project: serverProjectId,
    p_idempotency: randomUuid(),
  });
}

export async function archiveNosblocProject(serverProjectId) {
  return rpc("nosbloc_archive_api", {
    p_project: serverProjectId,
    p_idempotency: randomUuid(),
  });
}

export async function createNosblocProduct(input) {
  return rpc("nosbloc_create_product_api", {
    p_project: input?.projectId || null,
    p_title: String(input?.title || "").slice(0, 120),
    p_type: String(input?.type || "access"),
    p_description: String(input?.description || "").slice(0, 1000),
    p_price_cents: Math.max(0, Math.round(Number(input?.priceCents) || 0)),
    p_currency: "EUR",
    p_idempotency: randomUuid(),
  });
}

export async function updateNosblocProduct(productId, input) {
  return rpc("nosbloc_update_product_api", {
    p_product: productId,
    p_title: String(input?.title || "").slice(0, 120),
    p_description: String(input?.description || "").slice(0, 1000),
    p_price_cents: Math.max(0, Math.round(Number(input?.priceCents) || 0)),
    p_rights_confirmed: !!input?.rightsConfirmed,
    p_idempotency: randomUuid(),
  });
}

export async function submitNosblocProduct(productId) {
  return rpc("nosbloc_submit_product_api", {
    p_product: productId,
    p_idempotency: randomUuid(),
  });
}

export async function requestNosblocRefund(orderId, amountCents, reason) {
  return rpc("nosbloc_request_refund_api", {
    p_order: orderId,
    p_amount_cents: Math.max(1, Math.round(Number(amountCents) || 0)),
    p_reason: String(reason || "").slice(0, 500),
    p_idempotency: randomUuid(),
  });
}

export async function requestNosblocPayout(amountCents) {
  return rpc("nosbloc_request_payout_api", {
    p_amount_cents: Math.max(1000, Math.round(Number(amountCents) || 0)),
    p_idempotency: randomUuid(),
  });
}

export function mergeNosblocServerSnapshot(localState, snapshot) {
  if (!snapshot?.ok || !Array.isArray(snapshot.projects)) return localState;
  const localById = new Map((localState.projects || []).map(project => [project.id, project]));
  const merged = [];
  const seen = new Set();

  for (const row of snapshot.projects) {
    const id = String(row?.clientProjectId || row?.client_project_id || "");
    if (!id || !row?.payload) continue;
    const local = localById.get(id);
    const remote = { ...row.payload, id };
    const serverStatus = String(row.status || remote.status || "draft");
    const serverLocked = ["review","approved","published","suspended"].includes(serverStatus);
    const localTime = Date.parse(local?.updatedAt || "") || 0;
    const remoteTime = Date.parse(remote?.updatedAt || row?.updatedAt || "") || 0;
    const base = local && localTime > remoteTime && !serverLocked ? local : remote;
    const localSplits = new Map((base.splits || []).map(member => [String(member.id), member]));
    for (const member of row.members || []) {
      const key = String(member.memberKey || "");
      if (!key) continue;
      const previous = localSplits.get(key) || {};
      localSplits.set(key, {
        ...previous,
        id:key,
        name:member.name || previous.name || "Membre 3B",
        role:member.role || previous.role || "Création",
        shareBps:Number(member.shareBps || 0),
        status:member.status || previous.status || "draft",
        invitationId:member.invitationId || previous.invitationId || "",
        invitedAt:member.invitedAt || previous.invitedAt || "",
        acceptedAt:member.acceptedAt || previous.acceptedAt || "",
      });
    }
    merged.push({
      ...base,
      id,
      splits:[...localSplits.values()],
      status: serverStatus,
      visibility: row.visibility || base.visibility || "private",
      reviewVersionId: row.reviewVersionId || base.reviewVersionId || null,
      server: {
        ...(base.server || {}),
        projectId: row.projectId,
        revision: Number(row.revision || 0),
        publicationLocked: !!row.publicationLocked,
        discoverLocked: !!row.discoverLocked,
        monetizationLocked: row.monetizationLocked !== false,
        isOwner: row.isOwner !== false,
        syncedAt: new Date().toISOString(),
      },
    });
    seen.add(id);
  }

  for (const project of localState.projects || []) {
    if (!seen.has(project.id)) merged.push(project);
  }

  return {
    ...localState,
    projects: merged,
  };
}

export function financeMoneyState(finance, fallbackCoins = 0) {
  return {
    availableCents: Math.max(0, Number(finance?.wallet?.availableCents) || 0),
    pendingCents: Math.max(0, Number(finance?.wallet?.pendingCents) || 0),
    payoutCents: Math.max(0, (finance?.payoutRequests || [])
      .filter(row => ["requested","review","approved","processing"].includes(row.status))
      .reduce((sum,row) => sum + (Number(row.amountCents) || 0), 0)),
    coins: Math.max(0, Number(fallbackCoins) || 0),
    runtime: finance?.runtime || { paymentsEnabled:false, payoutsEnabled:false, discoverEnabled:false },
    payoutAccount: finance?.payoutAccount || null,
  };
}
