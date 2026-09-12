// Navigation intent only: rewards and progression remain in world/engine.js.
export const NEXUS_DOORS = Object.freeze([
  { code: 'FR', region: 'france', country: 'France', value: 'Justice', number: '01' },
  { code: 'DZ', region: 'algerie', country: 'Algérie', value: 'Loyauté', number: '02' },
  { code: 'ES', region: 'espagne', country: 'Espagne', value: 'Passion', number: '03' },
  { code: 'MA', region: 'maroc', country: 'Maroc', value: 'Noblesse', number: '04' },
  { code: 'IT', region: 'italie', country: 'Italie', value: 'Espoir', number: '05' },
  { code: 'TN', region: 'tunisie', country: 'Tunisie', value: 'Courage', number: '06' },
  { code: 'TR', region: 'turquie', country: 'Turquie', value: 'Foi', number: '07' },
  { code: 'EE', region: 'estonie', country: 'Estonie', value: 'Sagesse', number: '08' },
].map(Object.freeze));

export function nexusProgress(save) {
  const seals = new Set(Array.isArray(save?.seals) ? save.seals : []);
  const doors = NEXUS_DOORS.map(door => ({ ...door, sealed: seals.has(door.region),
    restored: save?.adventure?.chapters?.[door.region]?.restored === 3 }));
  const sealCount = doors.filter(door => door.sealed).length;
  const restoredCount = doors.filter(door => door.restored).length;
  const finished = save?.adventure?.finished === true;
  return { doors, sealCount, restoredCount, finished,
    originReady: sealCount === 8 && restoredCount === 8 && !finished };
}

export function planNexusActions(save, destination) {
  if (destination == null) return []; // Explore/resume never abandons a fight.
  const door = NEXUS_DOORS.find(item => item.code === destination);
  if (!door && destination !== 'ORIGINE') throw Error('Porte inconnue.');
  const encounter = save?.adventure?.encounter;
  const unresolved = encounter && !['victory', 'recruited', 'missed', 'defeat'].includes(encounter.result);
  if (destination === 'ORIGINE' && encounter?.final && unresolved) return [];
  if (unresolved) throw Error('Reprends et termine ta rencontre dans le Monde 3B avant de changer de porte.');
  if (destination === 'ORIGINE' && !nexusProgress(save).originReady) {
    throw Error('ORIGINE exige les huit sceaux et les huit pays entièrement reconstruits.');
  }
  if (door?.region === save?.region) return [];
  const actions = save?.region === 'hub' ? [] : [{ type: 'visit', region: 'hub' }];
  actions.push(door ? { type: 'visit', region: door.region } : { type: 'final' });
  return actions;
}

// Dependency injection allows real navigation sequencing to be tested without
// issuing network requests, importing WebGL, or inventing a second save format.
export async function enterNexusWorld(api, uid, destination, isCurrent = () => true) {
  if (!isCurrent()) return null;
  if (destination == null) return { resumed: true };
  const result = await api.loadWorld(uid);
  if (!isCurrent()) return null;
  const actions = planNexusActions(result.data, destination);
  // Validate the complete route before recording its first command.
  actions.reduce((save, action) => api.applyWorldAction(save, action), result.data);
  if (!isCurrent()) return null;
  let next = result.data;
  for (const action of actions) next = api.recordWorldAction(uid, next, action);
  if (actions.length) {
    const stored = api.readLocal(uid)?.data;
    if (!stored || stored.region !== next.region ||
        (destination === 'ORIGINE' && !stored.adventure?.encounter?.final)) {
      throw Error('Le navigateur n’a pas conservé le passage. Vérifie le stockage puis réessaie.');
    }
  }
  // WorldPage reloads this account's canonical save and synchronizes its journal.
  return { data: next, message: result.message };
}

export function startNexusSequence(onPhase, reducedMotion = false, clock = globalThis) {
  let disposed = false;
  let timers = [];
  const clear = () => { timers.forEach(timer => clock.clearTimeout(timer)); timers = []; };
  const skip = () => { if (disposed) return; clear(); onPhase('nexus'); };
  if (reducedMotion) onPhase('nexus');
  else {
    onPhase('scan');
    timers = [clock.setTimeout(() => { if (!disposed) onPhase('tunnel'); }, 620),
      clock.setTimeout(() => { if (!disposed) onPhase('nexus'); }, 2750)];
  }
  return { skip, dispose() { disposed = true; clear(); } };
}
