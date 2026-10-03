import {cityLandscape,segmentDistance,isWater} from './city3b-landscape.js';
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
const finite = value => Number.isFinite(Number(value));

export function cityMapSnap(point, step = 2) {
  const unit = Math.max(1, Number(step) || 1);
  return {
    x: Math.round((Number(point?.x) || 0) / unit) * unit,
    z: Math.round((Number(point?.z) || 0) / unit) * unit,
  };
}

export function cityMapInitialView(snapshot={}){
 const placed=(snapshot.placements||[]).filter(p=>p.placement_state!=='stored'&&finite(p.x)&&finite(p.z));
 if(!placed.length)return {zoom:cityMapBlueprint(snapshot).half/(snapshot.city?.city?.map_preset?160:64),center:{x:0,z:0}};
 const xs=placed.map(p=>Number(p.x)+Number(p.footprint_w||1)/2),zs=placed.map(p=>Number(p.z)+Number(p.footprint_h||1)/2);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),half=cityMapBlueprint(snapshot).half;
 const radius=Math.max(32,(Math.max(maxX-minX,maxZ-minZ)+56)/2);
 return {zoom:Math.max(1,Math.min(32,half/radius)),center:{x:(minX+maxX)/2,z:(minZ+maxZ)/2}};
}

export function cityBuildingKind(definition = {}) {
  const role = definition.metadata?.city_role;
  if (['green','mobility','landmark','commerce','housing','civic','mixed'].includes(role)) return role;
  const categoryKind={home:'housing',shop:'commerce',nature:'green',community:'civic',culture:'mixed',sport:'civic',monument:'landmark',road:'mobility'}[definition.category];
  if(categoryKind)return categoryKind;
  const source = normalize(`${definition.name || ''} ${definition.code || ''} ${definition.category || ''} ${definition.kind || ''}`);
  if (/parc|jardin|square|plaza|nature|green|garden/.test(source)) return 'green';
  if (/gare|station|metro|train|garage|mobil|transport/.test(source)) return 'mobility';
  if (/tour|tower|monument|nexus|heritage|cercle|landmark/.test(source)) return 'landmark';
  if (/boutique|shop|mall|commerce|market|galerie/.test(source)) return 'commerce';
  if (/maison|house|residence|logement|habitat|apartment/.test(source)) return 'housing';
  if (/atelier|studio|lab|ecole|school|clinique|clinic|community|communaute|civic/.test(source)) return 'civic';
  return 'mixed';
}

export function cityMapCustomRoads(snapshot = {}) {
  const raw = snapshot?.city?.city?.roads;
  if (!Array.isArray(raw)) return [];
  return raw.filter(road =>
    road && finite(road.x1) && finite(road.z1) && finite(road.x2) && finite(road.z2)
  ).slice(0, 256).map((road, index) => ({
    id: String(road.id || `custom-${index + 1}`).slice(0, 80),
    x1: Number(road.x1),
    z1: Number(road.z1),
    x2: Number(road.x2),
    z2: Number(road.z2),
    width: Math.max(2, Math.min(10, Number(road.width) || 4)),
    ...(road.roadType?{roadType:String(road.roadType)}:{}),
  }));
}

export function cityMapBlueprint(snapshot = {}) {
  const city = snapshot.city || {};
  const extent = Number(city.city?.map_extent);
  const expanded = extent === 500 || extent === 1000;
  const half = expanded ? extent : 50 + Math.max(1, Number(city.land_tier || 1)) * 45;
  const coreHalf = expanded ? Math.max(95,Math.min(500,Number(city.city?.core_half)||95)) : half;
  const districtRows = Array.isArray(snapshot.districts) ? snapshot.districts : [];
  const status = new Map(districtRows.map(row => [normalize(row.country), row]));
  const scale = coreHalf * 0.72;
  const radiusX = Math.max(18, coreHalf * 0.18);
  const radiusZ = Math.max(15, coreHalf * 0.15);

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
    coreHalf,
    landTier: Math.max(1, Number(city.land_tier || 1)),
    ringRoads: [coreHalf * 0.24, coreHalf * 0.47, coreHalf * 0.72],
    districts,
    center: { x: 0, z: 0 },
    coastZ: half + 2,
    customRoads: cityMapCustomRoads(snapshot),
  };
}

export function cityMapRoads(blueprint) {
  return { rings: [], radials: [], boulevards: [], custom: blueprint.customRoads || [] };
}

function pointSegmentDistance(point, road) {
  const px = Number(point.x), pz = Number(point.z);
  const x1 = Number(road.x1), z1 = Number(road.z1), x2 = Number(road.x2), z2 = Number(road.z2);
  const dx = x2 - x1, dz = z2 - z1;
  const length2 = dx * dx + dz * dz;
  if (!length2) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / length2));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

export function cityMapDistrictAtPoint(snapshot, point) {
  const blueprint = cityMapBlueprint(snapshot);
  return blueprint.districts.find(district => {
    const nx = (Number(point.x) - district.x) / district.rx;
    const nz = (Number(point.z) - district.z) / district.rz;
    return nx * nx + nz * nz <= 1;
  }) || null;
}

export function cityMapPlacementPolicy(snapshot = {}, point = {}, footprint = { width: 1, height: 1 }) {
  const blueprint = cityMapBlueprint(snapshot);
  const width = Math.max(1, Number(footprint.width) || 1);
  const height = Math.max(1, Number(footprint.height) || 1);
  const x = Number(point.x) || 0, z = Number(point.z) || 0;
  const maxX = x + width - 1, maxZ = z + height - 1;
  if (x < -blueprint.half || z < -blueprint.half || maxX > blueprint.half || maxZ > blueprint.half) {
    return { valid: false, reason: 'Hors du terrain' };
  }


  const center = { x: x + width / 2, z: z + height / 2 };
  const district = cityMapDistrictAtPoint(snapshot, center);
  if (district && !district.unlocked) {
    return { valid: false, reason: `Quartier ${district.country} verrouillé` };
  }

  const footprintRadius = Math.max(1.2, Math.min(8, Math.hypot(width, height) * 0.26));
  if(cityLandscape(snapshot).some(f=>segmentDistance(center,f)<f.width/2+footprintRadius))return {valid:false,reason:isWater(cityLandscape(snapshot).find(f=>segmentDistance(center,f)<f.width/2+footprintRadius))?'Étendue d’eau occupée':'Décor à déplacer'};
  const roads = cityMapRoads(blueprint);
  const lineRoads = [...roads.radials.filter(road => road.unlocked), ...roads.boulevards, ...roads.custom];
  if (lineRoads.some(road => pointSegmentDistance(center, road) < (Number(road.width) || 4) / 2 + footprintRadius)) {
    return { valid: false, reason: 'Axe routier réservé' };
  }
  const ringConflict = roads.rings.some(road =>
    Math.abs(Math.hypot(center.x, center.z) - road.radius) < road.width / 2 + footprintRadius
  );
  if (ringConflict) return { valid: false, reason: 'Anneau routier réservé' };

  return { valid: true, reason: district ? `Parcelle · ${district.country}` : 'Emplacement disponible' };
}

export function cityMapUrbanScore(snapshot = {}) {
  const definitions = new Map((snapshot.buildings || []).map(row => [row.code, row]));
  const placed = (snapshot.placements || []).filter(row => row?.placement_state !== 'stored');
  const counts = { housing: 0, commerce: 0, civic: 0, mobility: 0, green: 0, landmark: 0, mixed: 0 };
  for (const row of placed) counts[cityBuildingKind(definitions.get(row.building_code) || row)] += 1;

  const blueprint = cityMapBlueprint(snapshot);
  const roads = cityMapRoads(blueprint);
  const unlocked = blueprint.districts.filter(row => row.unlocked).length;
  const residents = counts.housing * 180 + counts.mixed * 80 + Math.max(1, Number(snapshot.city?.city_level || 1)) * 50;
  const jobs = counts.commerce * 75 + counts.civic * 45 + counts.mobility * 25 + counts.mixed * 35;
  const mobility = Math.min(100, Math.round(roads.custom.length * 8 + counts.mobility * 16));
  const services = Math.min(100, Math.round(counts.civic * 18 + counts.green * 14 + counts.commerce * 7 + unlocked * 4));
  const green = Math.min(100, Math.round(counts.green * 22 + unlocked * 3));
  const balanceBase = Math.max(100, residents, jobs);
  const balance = Math.max(0, Math.round(100 - Math.abs(residents - jobs) / balanceBase * 75));
  const diversity = Object.values(counts).filter(value => value > 0).length;
  const score = Math.min(100, Math.round(
    placed.length * 2.2 + unlocked * 5 + diversity * 4 + mobility * .16 + services * .14 + balance * .12
  ));

  return { score, residents, jobs, mobility, services, green, balance, counts, customRoads: roads.custom.length };
}

export function cityMapStats(snapshot = {}) {
  const blueprint = cityMapBlueprint(snapshot);
  const placements = Array.isArray(snapshot.placements)
    ? snapshot.placements.filter(row => row?.placement_state !== 'stored').length
    : 0;
  const urban = cityMapUrbanScore(snapshot);
  return {
    landTier: blueprint.landTier,
    unlockedDistricts: blueprint.districts.filter(row => row.unlocked).length,
    placements,
    urban,
  };
}
