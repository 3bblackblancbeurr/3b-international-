const door = (id, wall, center, width = 1, height = 2.1) => ({ id, type: 'door', wall, center, width, height });
const obstacle = (id, x, z, width, depth, height = 0.8) => ({ id, x, z, width, depth, height });

export const TEST_ROOMS = Object.freeze([
  { id: 'ROOM_001_SMALL_BEDROOM', width: 2.2, depth: 2.2, height: 2.45, openings: [door('door-a', 'south', 0, .9)], obstacles: [] },
  { id: 'ROOM_002_NORMAL_LIVING', width: 4, depth: 3, height: 2.55, openings: [door('door-a', 'west', -.5, 1.05)], obstacles: [obstacle('table', -.9, -.5, 1.2, .8)] },
  { id: 'ROOM_003_LARGE', width: 6, depth: 5, height: 2.8, openings: [door('door-a', 'north', 1, 1.1)], obstacles: [obstacle('sofa', 1.8, 1.3, 2.1, .9)] },
  { id: 'ROOM_004_CLUTTERED', width: 3.5, depth: 3.1, height: 2.5, openings: [door('door-a', 'east', 0, 1)], obstacles: [obstacle('sofa', 1.0, 0, .8, 2.1), obstacle('table', -.5, -.8, 1.1, .7), obstacle('shelf', -1.3, .8, .5, 1.2, 1.8)] },
  { id: 'ROOM_005_NO_DOOR', width: 3.2, depth: 3.2, height: 2.5, openings: [], obstacles: [] },
  { id: 'ROOM_006_SEATED', width: 2.5, depth: 2.8, height: 2.4, seated: true, openings: [door('door-a', 'north', 0, 1)], obstacles: [obstacle('desk', 0, .8, 1.4, .7)] },
  { id: 'ROOM_007_LOW_CEILING', width: 3, depth: 3, height: 1.92, openings: [door('door-a', 'south', 0, 1, 1.9)], obstacles: [] },
  { id: 'ROOM_008_GLASS_WALL', width: 4.5, depth: 3.2, height: 2.6, openings: [door('door-a', 'west', 0, 1)], obstacles: [], restrictedWalls: ['north'] },
  { id: 'ROOM_009_NARROW', width: 1.55, depth: 4.5, height: 2.5, openings: [door('door-a', 'south', 0, .9)], obstacles: [] },
  { id: 'ROOM_010_DOOR_BLOCKED', width: 4, depth: 4, height: 2.6, openings: [door('door-a', 'north', 0, 1.1)], obstacles: [obstacle('cabinet', 0, 1.45, 1.3, .9, 1.5)] },
  { id: 'ROOM_011_DOUBLE_DOOR', width: 5, depth: 4, height: 2.7, openings: [door('door-a', 'south', -1, .9), door('door-b', 'east', 0, 1.25)], obstacles: [] },
  { id: 'ROOM_012_CORNER_SOFA', width: 4.2, depth: 4.2, height: 2.55, openings: [door('door-a', 'north', -.9, 1)], obstacles: [obstacle('sofa-a', 1.3, 1.3, 1.4, .8), obstacle('sofa-b', 1.65, .4, .7, 1.2)] },
  { id: 'ROOM_013_CENTER_TABLE', width: 3.8, depth: 3.8, height: 2.5, openings: [door('door-a', 'west', .6, 1)], obstacles: [obstacle('table', 0, 0, 1.6, 1.1)] },
  { id: 'ROOM_014_WIDE_SHALLOW', width: 6, depth: 2.1, height: 2.5, openings: [door('door-a', 'south', 2, 1)], obstacles: [] },
  { id: 'ROOM_015_TALL_FURNITURE', width: 4.2, depth: 3.6, height: 2.5, openings: [door('door-a', 'east', -1, 1)], obstacles: [obstacle('wardrobe', 1.55, .7, .8, 1.5, 2.3)] },
  { id: 'ROOM_016_EMPTY_STUDIO', width: 5.2, depth: 5.2, height: 2.9, openings: [], obstacles: [] },
  { id: 'ROOM_017_TWO_TABLES', width: 4.2, depth: 4.8, height: 2.6, openings: [door('door-a', 'north', 0, 1)], obstacles: [obstacle('table-a', -1, 1.2, .8, .8), obstacle('table-b', 1, -1.1, 1, 1)] },
  { id: 'ROOM_018_MICRO', width: 1.25, depth: 1.3, height: 2.4, openings: [], obstacles: [] },
  { id: 'ROOM_019_LONG_ROOM', width: 2.5, depth: 7, height: 2.6, openings: [door('door-a', 'north', 0, 1)], obstacles: [obstacle('bench', .7, 0, .8, 2)] },
  { id: 'ROOM_020_MULTI_OPENING', width: 5, depth: 5, height: 2.7, openings: [door('door-a', 'north', -1.5, 1), door('door-b', 'south', 1.5, 1.2), door('door-c', 'east', 0, .9)], obstacles: [obstacle('island', 0, 0, 1.2, 1.2)] },
]);

export function generateRooms(count = 100, seed = 1618) {
  let state = seed >>> 0;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
  const rooms = [];
  for (let index = 0; index < count; index++) {
    const width = 1.2 + random() * 5.2;
    const depth = 1.2 + random() * 5.2;
    const height = 1.85 + random() * 1.2;
    const openings = random() > .25 ? [door(`door-${index}`, ['north','south','east','west'][Math.floor(random() * 4)], (random() - .5) * Math.max(.2, Math.min(width, depth) - 1), .8 + random() * .5, 1.9 + random() * .4)] : [];
    const obstacles = Array.from({ length: Math.floor(random() * 5) }, (_, obstacleIndex) => obstacle(`o-${index}-${obstacleIndex}`, (random() - .5) * width * .7, (random() - .5) * depth * .7, .3 + random() * 1.5, .3 + random() * 1.5, .4 + random() * 1.8));
    rooms.push({ id: `FUZZ_${index}`, width, depth, height, openings, obstacles });
  }
  return rooms;
}
