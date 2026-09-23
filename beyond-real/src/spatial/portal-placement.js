const DEFAULTS = Object.freeze({ width: 1.0, height: 2.0, sideMargin: 0.22, frontClearance: 1.25, sampleStep: 0.25 });
const WALLS = ['north', 'south', 'east', 'west'];
const overlap1d = (a1, a2, b1, b2) => Math.max(a1, b1) < Math.min(a2, b2);
const rectsIntersect = (a, b) => overlap1d(a.x1, a.x2, b.x1, b.x2) && overlap1d(a.z1, a.z2, b.z1, b.z2);

function wallSpan(room, wall) { return ['north', 'south'].includes(wall) ? room.width : room.depth; }
function wallCoordinate(room, wall) {
  if (wall === 'north') return { axis: 'z', value: room.depth / 2, inward: -1, yaw: 180 };
  if (wall === 'south') return { axis: 'z', value: -room.depth / 2, inward: 1, yaw: 0 };
  if (wall === 'east') return { axis: 'x', value: room.width / 2, inward: -1, yaw: -90 };
  return { axis: 'x', value: -room.width / 2, inward: 1, yaw: 90 };
}

export function clearanceRect(room, candidate, requirements = DEFAULTS) {
  const cfg = { ...DEFAULTS, ...requirements };
  const coordinate = wallCoordinate(room, candidate.wall);
  if (coordinate.axis === 'z') {
    const z2 = coordinate.value;
    const z1 = coordinate.value + coordinate.inward * cfg.frontClearance;
    return { x1: candidate.center - cfg.width / 2, x2: candidate.center + cfg.width / 2, z1: Math.min(z1, z2), z2: Math.max(z1, z2) };
  }
  const x2 = coordinate.value;
  const x1 = coordinate.value + coordinate.inward * cfg.frontClearance;
  return { x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: candidate.center - cfg.width / 2, z2: candidate.center + cfg.width / 2 };
}

function obstacleRect(obstacle) {
  return { x1: obstacle.x - obstacle.width / 2, x2: obstacle.x + obstacle.width / 2, z1: obstacle.z - obstacle.depth / 2, z2: obstacle.z + obstacle.depth / 2 };
}

function openingBlocks(candidate, opening, cfg) {
  if (candidate.wall !== opening.wall) return false;
  const a1 = candidate.center - cfg.width / 2 - cfg.sideMargin;
  const a2 = candidate.center + cfg.width / 2 + cfg.sideMargin;
  const b1 = opening.center - opening.width / 2;
  const b2 = opening.center + opening.width / 2;
  return overlap1d(a1, a2, b1, b2);
}

export function isPlacementSafe(room, candidate, requirements = DEFAULTS) {
  const cfg = { ...DEFAULTS, ...requirements };
  if (!room || room.width <= 0 || room.depth <= 0 || room.height < cfg.height + 0.05) return false;
  if ((room.restrictedWalls || []).includes(candidate.wall)) return false;
  const span = wallSpan(room, candidate.wall);
  if (Math.abs(candidate.center) + cfg.width / 2 + cfg.sideMargin > span / 2) return false;
  const rect = clearanceRect(room, candidate, cfg);
  if ((room.obstacles || []).some(obstacle => obstacle.height > 0.15 && rectsIntersect(rect, obstacleRect(obstacle)))) return false;
  if (candidate.kind === 'wall' && (room.openings || []).some(opening => openingBlocks(candidate, opening, cfg))) return false;
  return true;
}

function poseFor(room, candidate) {
  const wall = wallCoordinate(room, candidate.wall);
  return wall.axis === 'z'
    ? { x: candidate.center, y: 0, z: wall.value, yaw: wall.yaw }
    : { x: wall.value, y: 0, z: candidate.center, yaw: wall.yaw };
}

export function findPortalPlacement(room, requirements = {}) {
  const cfg = { ...DEFAULTS, ...requirements };
  const candidates = [];
  for (const opening of room.openings || []) {
    if (opening.type !== 'door' || opening.width < cfg.width || opening.height < cfg.height) continue;
    const candidate = { id: opening.id, kind: 'real-door', wall: opening.wall, center: opening.center };
    if (isPlacementSafe(room, candidate, cfg)) candidates.push({ ...candidate, score: 1000 + opening.width * 10 });
  }
  for (const wall of WALLS) {
    const span = wallSpan(room, wall);
    const min = -span / 2 + cfg.width / 2 + cfg.sideMargin;
    const max = span / 2 - cfg.width / 2 - cfg.sideMargin;
    for (let center = min; center <= max + 1e-9; center += cfg.sampleStep) {
      const candidate = { id: `${wall}:${center.toFixed(2)}`, kind: 'wall', wall, center: Number(center.toFixed(3)) };
      if (!isPlacementSafe(room, candidate, cfg)) continue;
      const centerBias = 1 - Math.min(1, Math.abs(center) / Math.max(0.001, span / 2));
      candidates.push({ ...candidate, score: 100 + centerBias * 10 });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const winner = candidates[0];
  return winner ? Object.freeze({ ...winner, pose: Object.freeze(poseFor(room, winner)), requirements: Object.freeze(cfg) }) : null;
}
