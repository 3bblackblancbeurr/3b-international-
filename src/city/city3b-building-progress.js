const clamp = value => Math.min(1, Math.max(0, value));

// This clock is only for presentation. Completion and rewards are checked in PostgreSQL.
export function cityConstructionState(placement, now = Date.now()) {
  const start = Date.parse(placement?.construction_started_at);
  const end = Date.parse(placement?.construction_ready_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { progress: 1, stage: 'complete', label: 'En service', remaining: 0, ready: false };
  }
  const progress = clamp((now - start) / (end - start));
  const complete = progress >= 1;
  const ready = complete && !placement.construction_claimed_at && placement.placement_state !== 'stored';
  return {
    progress, ready, remaining: Math.max(0, Math.ceil((end - now) / 1000)),
    stage: complete ? 'complete' : progress < .25 ? 'foundation' : progress < .72 ? 'structure' : 'finishing',
    label: complete ? (ready ? 'Prêt à inaugurer' : 'En service') : progress < .25 ? 'Fondations' : progress < .72 ? 'Structure' : 'Finitions',
  };
}

export function cityConstructionDuration(definition) {
  return Math.min(60, 18 + Math.floor(Math.sqrt(Math.max(0, Number(definition?.cost_coins) || 0)) * 2));
}

export function cityBuildingBenefit(definition) {
  const service = definition?.metadata?.service;
  if (service === 'water') return 'Eau · 60 habitants';
  if (service === 'energy') return 'Énergie · 60 habitants';
  if (service === 'health') return 'Soins · 40 habitants';
  if (service === 'education') return 'École · 30 élèves';
  const role = definition?.metadata?.city_role;
  if (role === 'mobility') return 'Transport · 6 emplois';
  if (role === 'housing' || definition?.category === 'home') return 'Logement · 18 places';
  if (role === 'commerce' || definition?.category === 'shop') return 'Commerce · 12 emplois';
  if (role === 'green' || definition?.category === 'nature') return 'Nature · 24 habitants';
  if (definition?.category === 'culture') return 'Culture · 30 habitants';
  if (definition?.category === 'community') return 'Service public · 6 emplois';
  if (definition?.category === 'sport') return 'Loisirs & rendez-vous';
  return 'Identité du quartier';
}

export function citySceneSignature(data = {}, codes = new Set()) {
  // Passive census refreshes must not rebuild all meshes or reset the camera.
  return JSON.stringify([data.city?.city_id, data.city?.land_tier, data.city?.day_mode,
    data.city?.city?.map_extent, data.city?.city?.core_half, data.city?.city?.roads, data.city?.city?.terrain, data.districts, data.placements, data.displays,
    data.buildings, [...codes].sort(), data.life?.inhabitants, data.life?.population, data.life?.employed]);
}
