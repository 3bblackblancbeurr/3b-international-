export function createHubMissionState(missions, persisted = {}) {
  return Object.fromEntries(missions.map((mission) => {
    const saved = persisted[mission.id] || {};
    const completedObjectives = Math.max(0, Math.min(mission.objectives.length, Number(saved.completedObjectives) || 0));
    return [mission.id, {
      status: saved.status === 'completed' ? 'completed' : saved.status === 'active' ? 'active' : 'available',
      completedObjectives,
      totalObjectives: mission.objectives.length,
      claimed: Boolean(saved.claimed),
    }];
  }));
}

export function startHubMission(state, missionId) {
  if (!state[missionId] || state[missionId].status === 'completed') return state;
  return { ...state, [missionId]: { ...state[missionId], status: 'active' } };
}

export function advanceHubMission(state, missionId, amount = 1) {
  const current = state[missionId];
  if (!current || current.status !== 'active') return state;
  const completedObjectives = Math.min(current.totalObjectives, current.completedObjectives + Math.max(0, amount));
  return {
    ...state,
    [missionId]: {
      ...current,
      completedObjectives,
      status: completedObjectives >= current.totalObjectives ? 'completed' : 'active',
    },
  };
}

export function claimHubMission(state, missionId) {
  const current = state[missionId];
  if (!current || current.status !== 'completed' || current.claimed) return state;
  return { ...state, [missionId]: { ...current, claimed: true } };
}

export function hubMissionProgress(state) {
  const rows = Object.values(state);
  const completed = rows.filter((row) => row.status === 'completed').length;
  const claimed = rows.filter((row) => row.claimed).length;
  return { total: rows.length, completed, claimed, ratio: rows.length ? completed / rows.length : 0 };
}
