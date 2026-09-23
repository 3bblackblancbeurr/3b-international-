// Auth notifications take precedence over any older asynchronous storage read,
// including retries after a temporary failure while opening the application.
export function watchSession(auth, onSession, onError) {
  let live = true, version = 0;
  const refresh = async () => {
    if (!live) return;
    const ticket = ++version;
    try {
      const { data, error } = await auth.getSession();
      if (!live || ticket !== version) return;
      if (error) onError(error);
      else { const session = data?.session ?? null; onSession(session); return session; }
    } catch (error) { if (live && ticket === version) onError(error); }
  };
  const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
    version += 1;
    if (live) onSession(session);
  });
  refresh();
  return { refresh, stop: () => { live = false; subscription.unsubscribe(); } };
}

// Account generations reject requests from a previous login, even A -> B -> A.
// Revisions prevent a delayed snapshot from replacing a newer reward or refresh.
export function createSnapshotGate() {
  let userId = null, generation = 0, revision = 0;
  const accountTicket = () => ({ userId, generation });
  const owns = ticket => Boolean(userId && ticket?.userId === userId && ticket.generation === generation);
  return {
    setUser(next) {
      if (next !== userId) { userId = next; generation += 1; revision += 1; }
    },
    accountTicket,
    begin() { revision += 1; return { ...accountTicket(), revision }; },
    isCurrent: ticket => owns(ticket) && ticket.revision === revision,
    accept(result, ticket) {
      if (!owns(ticket) || result?.profile?.user_id !== userId) return false;
      revision += 1;
      return true;
    },
    invalidate() { generation += 1; revision += 1; },
  };
}
