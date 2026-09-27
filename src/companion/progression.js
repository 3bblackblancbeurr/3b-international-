import { tierFor } from "../../shared/loyalty.js";

// Observe only snapshots already accepted by the account ownership gate. The first
// snapshot of each login is a baseline, not an achievement earned on this device.
export function createCompanionProgressionTracker() {
  let account = null;
  let generation = null;
  let highestXp = null;
  return {
    observe(profile, owner) {
      if (!owner?.userId || profile?.user_id !== owner.userId) return null;
      const xp = typeof profile.xp === "number" ? profile.xp
        : typeof profile.xp === "string" && /^\d+$/.test(profile.xp) ? Number(profile.xp) : NaN;
      if (!Number.isSafeInteger(xp) || xp < 0) return null;
      if (account !== owner.userId || generation !== owner.generation || highestXp === null) {
        account = owner.userId;
        generation = owner.generation;
        highestXp = xp;
        return null;
      }
      if (xp <= highestXp) return null;
      const previousTier = tierFor(highestXp);
      const nextTier = tierFor(xp);
      highestXp = xp;
      return nextTier.xp > previousTier.xp
        ? { source: "xp-level", id: `xp-level:${nextTier.id}`, tier: nextTier.id }
        : null;
    },
  };
}

// New server rows can notify only after one successful baseline read. Keep a
// bounded history so reordered rows and repeated polling do not animate again.
export function createCompanionArrivalTracker() {
  let initialized = false;
  const seen = new Set();
  return {
    observe(ids) {
      if (!Array.isArray(ids)) return [];
      const unique = [...new Set(ids.filter(id => typeof id === "string" && id.length > 0))];
      const arrivals = initialized ? unique.filter(id => !seen.has(id)) : [];
      unique.forEach(id => { seen.delete(id); seen.add(id); });
      while (seen.size > 500) seen.delete(seen.values().next().value);
      initialized = true;
      return arrivals;
    },
  };
}
