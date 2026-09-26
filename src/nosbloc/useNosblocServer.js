import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { projectReadiness } from "./model.js";
import {
  archiveNosblocProject,
  createNosblocProduct,
  createNosblocVersion,
  decideNosblocInvitation,
  fetchNosblocDiscover,
  fetchNosblocFinance,
  fetchNosblocSnapshot,
  fetchNosblocVersions,
  financeMoneyState,
  inviteNosblocMember,
  mergeNosblocServerSnapshot,
  moderateNosblocCase,
  publishNosblocProject,
  requestNosblocPayout,
  requestNosblocRefund,
  restoreNosblocVersion,
  revokeNosblocInvitation,
  submitNosblocProduct,
  syncNosblocProject,
  updateNosblocProduct,
} from "./server.js";

function persist(storageKey, value) {
  try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch {}
}

function serverMeta(result = {}) {
  return {
    projectId: result.projectId,
    revision: Number(result.revision || 0),
    publicationLocked: result.locks?.publication !== false,
    discoverLocked: result.locks?.discover !== false,
    monetizationLocked: result.locks?.monetization !== false,
    syncedAt: new Date().toISOString(),
  };
}

export function useNosblocServer({ userId, loaded, online, state, setState, storageKey }) {
  const stateRef = useRef(state);
  const dirtyRef = useRef(new Set());
  const timerRef = useRef(0);
  const [syncTick, setSyncTick] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [finance, setFinance] = useState(null);
  const [discover, setDiscover] = useState({ enabled:false, projects:[], products:[] });
  const [serverStatus, setServerStatus] = useState({ state:"idle", error:"" });

  useEffect(() => { stateRef.current = state; }, [state]);

  const patchProjectServer = useCallback((projectId, result) => {
    setState(previous => {
      const next = {
        ...previous,
        projects: previous.projects.map(project => project.id === projectId
          ? { ...project, server: { ...(project.server || {}), ...serverMeta(result) } }
          : project),
      };
      stateRef.current = next;
      persist(storageKey, next);
      return next;
    });
  }, [setState, storageKey]);

  const syncProjectNow = useCallback(async project => {
    if (!userId || !online || !project) return null;
    const result = await syncNosblocProject(project, projectReadiness(project).score);
    patchProjectServer(project.id, result);
    return result;
  }, [online, patchProjectServer, userId]);

  const markDirty = useCallback(id => {
    if (!id) return;
    dirtyRef.current.add(id);
    setSyncTick(value => value + 1);
  }, []);

  const markAllDirty = useCallback(() => {
    for (const project of stateRef.current.projects || []) dirtyRef.current.add(project.id);
    setSyncTick(value => value + 1);
  }, []);

  useEffect(() => {
    if (!userId || !loaded || !online || !dirtyRef.current.size) return undefined;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      const ids = [...dirtyRef.current];
      dirtyRef.current.clear();
      for (const id of ids) {
        const project = stateRef.current.projects.find(row => row.id === id);
        if (!project) continue;
        try {
          await syncProjectNow(project);
          setServerStatus({ state:"online", error:"" });
        } catch (error) {
          dirtyRef.current.add(id);
          setServerStatus({ state:"offline", error:error?.message || "Synchronisation impossible." });
        }
      }
    }, 900);
    return () => window.clearTimeout(timerRef.current);
  }, [loaded, online, syncProjectNow, syncTick, userId]);

  const refresh = useCallback(async () => {
    if (!userId || !loaded || !online) return null;
    setServerStatus(current => ({ ...current, state:"connecting" }));
    const [snapResult, financeResult, discoverResult] = await Promise.allSettled([
      fetchNosblocSnapshot(),
      fetchNosblocFinance(),
      fetchNosblocDiscover("", "all"),
    ]);

    if (snapResult.status === "fulfilled") {
      const remote = snapResult.value;
      setSnapshot(remote);
      const before = stateRef.current;
      const merged = mergeNosblocServerSnapshot(before, remote);
      const remoteIds = new Set((remote.projects || []).map(row => String(row.clientProjectId || row.client_project_id || "")));
      for (const project of before.projects || []) {
        if (!remoteIds.has(project.id)) dirtyRef.current.add(project.id);
      }
      stateRef.current = merged;
      setState(merged);
      persist(storageKey, merged);
      setServerStatus({ state:"online", error:"" });
      if (dirtyRef.current.size) setSyncTick(value => value + 1);
    } else {
      setServerStatus({ state:"offline", error:snapResult.reason?.message || "Serveur Nosbloc indisponible." });
    }

    if (financeResult.status === "fulfilled") setFinance(financeResult.value);
    if (discoverResult.status === "fulfilled") {
      setDiscover({
        enabled: !!discoverResult.value?.enabled,
        projects: Array.isArray(discoverResult.value?.projects) ? discoverResult.value.projects : [],
        products: Array.isArray(discoverResult.value?.products) ? discoverResult.value.products : [],
      });
    }
    return snapResult.status === "fulfilled" ? snapResult.value : null;
  }, [loaded, online, setState, storageKey, userId]);

  useEffect(() => {
    if (!userId || !loaded || !online) return;
    refresh().catch(() => {});
  }, [loaded, online, refresh, userId]);

  const ensureProject = useCallback(async project => {
    if (project?.server?.projectId) return { projectId:project.server.projectId, ...project.server };
    return syncProjectNow(project);
  }, [syncProjectNow]);

  const createVersion = useCallback(async (project, stage, note) => {
    const synced = await ensureProject(project);
    const result = await createNosblocVersion(project, synced?.projectId, stage, note);
    return { ...result, projectId:synced?.projectId };
  }, [ensureProject]);

  const loadVersions = useCallback(async project => {
    const synced = await ensureProject(project);
    if (!synced?.projectId) return [];
    return fetchNosblocVersions(synced.projectId);
  }, [ensureProject]);

  const restoreVersion = useCallback(async (project, versionId) => {
    const synced = await ensureProject(project);
    return restoreNosblocVersion(synced?.projectId, versionId);
  }, [ensureProject]);

  const inviteMember = useCallback(async (project, row) => {
    const synced = await ensureProject(project);
    return inviteNosblocMember(synced?.projectId, row);
  }, [ensureProject]);

  const revokeInvitation = useCallback(async invitationId => {
    const result = await revokeNosblocInvitation(invitationId);
    await refresh();
    return result;
  }, [refresh]);

  const decideInvitation = useCallback(async (invitationId, accept) => {
    const result = await decideNosblocInvitation(invitationId, accept);
    await refresh();
    return result;
  }, [refresh]);

  const moderateCase = useCallback(async (caseId, decision, reason = "") => {
    const result = await moderateNosblocCase(caseId, decision, reason);
    await refresh();
    return result;
  }, [refresh]);

  const publishProject = useCallback(async project => {
    const synced = await ensureProject(project);
    const result = await publishNosblocProject(synced?.projectId);
    await refresh();
    return result;
  }, [ensureProject, refresh]);

  const archiveProject = useCallback(async project => {
    const synced = await ensureProject(project);
    const result = await archiveNosblocProject(synced?.projectId);
    await refresh();
    return result;
  }, [ensureProject, refresh]);

  const refreshFinance = useCallback(async () => {
    if (!userId || !online) return null;
    const result = await fetchNosblocFinance();
    setFinance(result);
    return result;
  }, [online, userId]);

  const money = useMemo(() => {
    const coins = Number(state?.profile?.coins || 0);
    return financeMoneyState(finance, coins);
  }, [finance, state?.profile?.coins]);

  return {
    snapshot,
    finance,
    discover,
    money,
    serverStatus,
    markDirty,
    markAllDirty,
    refresh,
    refreshFinance,
    syncProjectNow,
    createVersion,
    loadVersions,
    restoreVersion,
    inviteMember,
    revokeInvitation,
    decideInvitation,
    moderateCase,
    publishProject,
    archiveProject,
    createProduct:createNosblocProduct,
    updateProduct:updateNosblocProduct,
    submitProduct:submitNosblocProduct,
    requestRefund:requestNosblocRefund,
    requestPayout:requestNosblocPayout,
  };
}
