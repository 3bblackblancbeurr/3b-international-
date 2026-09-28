const DISTRICTS = Object.freeze([
  { country: 'France', code: 'FR', value: 'Justice', ux: 0, uz: -0.66, accent: '#79a7ff' },
  { country: 'Algérie', code: 'DZ', value: 'Loyauté', ux: 0.48, uz: -0.47, accent: '#7ed9ae' },
  { country: 'Espagne', code: 'ES', value: 'Passion', ux: 0.68, uz: 0, accent: '#ffb06f' },
  { country: 'Maroc', code: 'MA', value: 'Noblesse', ux: 0.48, uz: 0.47, accent: '#e4c879' },
  { country: 'Italie', code: 'IT', value: 'Espoir', ux: 0, uz: 0.66, accent: '#a4d69b' },
  { country: 'Tunisie', code: 'TN', value: 'Courage', ux: -0.48, uz: 0.47, accent: '#76d9ef' },
  { country: 'Turquie', code: 'TR', value: 'Foi', ux: -0.68, uz: 0, accent: '#b7a0ff' },
  { country: 'Estonie', code: 'EE', value: 'Sagesse', ux: -0.48, uz: -0.47, accent: '#9fd2ff' },
]);

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');

export function cityMapSnap(point, step = 2) {
  const unit = Math.max(1, Number(step) || 1);
  return {
    x: Math.round((Number(point?.x) || 0) / unit) * unit,
    z: Math.round((Number(point?.z) || 0) / unit) * unit,
  };
}

export function cityBuildingKind(definition = {}) {
  const source = normalize(`${definition.name || ''} ${definition.code || ''} ${definition.category || ''} ${definition.kind || ''}`);
  if (/parc|jardin|square|plaza|nature|green|garden/.test(source)) return 'green';
  if (/gare|station|metro|train|garage|mobil|transport/.test(source)) return 'mobility';
  if (/tour|tower|monument|nexus|heritage|cercle|landmark/.test(source)) return 'landmark';
  if (/boutique|shop|mall|commerce|market|galerie/.test(source)) return 'commerce';
  if (/maison|house|residence|logement|habitat|apartment/.test(source)) return 'housing';
  if (/atelier|studio|lab|ecole|school|clinique|clinic|community|communaute|civic/.test(source)) return 'civic';
  return 'mixed';
}

export function cityMapBlueprint(snapshot = {}) {
  const city = snapshot.city || {};
  const half = 50 + Math.max(1, Number(city.land_tier || 1)) * 45;
  const districtRows = Array.isArray(snapshot.districts) ? snapshot.districts : [];
  const status = new Map(districtRows.map(row => [normalize(row.country), row]));
  const scale = half * 0.72;
  const radiusX = Math.max(18, half * 0.18);
  const radiusZ = Math.max(15, half * 0.15);

  const districts = DISTRICTS.map((entry, index) => {
    const row = status.get(normalize(entry.country));
    return {
      ...entry,
      index,
      x: entry.ux * scale,
      z: entry.uz * scale,
      rx: radiusX,
      rz: radiusZ,
      unlocked: row ? row.unlocked !== false : index === 0,
      level: Math.max(1, Number(row?.level || 1)),
    };
  });

  return {
    half,
    landTier: Math.max(1, Number(city.land_tier || 1)),
    ringRoads: [half * 0.24, half * 0.47, half * 0.72],
    districts,
    center: { x: 0, z: 0 },
    coastZ: half * 0.91,
  };
}

export function cityMapRoads(blueprint) {
  const rings = blueprint.ringRoads.map((radius, index) => ({
    id: `ring-${index}`,
    radius,
    width: index === 1 ? 5.2 : 3.6,
    className: index === 1 ? 'primary' : 'secondary',
  }));

  const radials = blueprint.districts.map(district => ({
    id: `radial-${district.code}`,
    x1: 0,
    z1: 0,
    x2: district.x,
    z2: district.z,
    width: district.unlocked ? 4.6 : 3.2,
    unlocked: district.unlocked,
  }));

  const boulevards = [
    { id: 'boulevard-east-west', x1: -blueprint.half * 0.82, z1: 0, x2: blueprint.half * 0.82, z2: 0 },
    { id: 'boulevard-north-south', x1: 0, z1: -blueprint.half * 0.82, x2: 0, z2: blueprint.half * 0.82 },
  ];

  return { rings, radials, boulevards };
}

export function cityMapStats(snapshot = {}) {
  const blueprint = cityMapBlueprint(snapshot);
  const placements = Array.isArray(snapshot.placements)
    ? snapshot.placements.filter(row => row?.placement_state !== 'stored').length
    : 0;
  return {
    landTier: blueprint.landTier,
    unlockedDistricts: blueprint.districts.filter(row => row.unlocked).length,
    placements,
  };
}
