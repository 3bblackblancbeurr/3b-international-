import { readFile } from 'node:fs/promises';
import { validateAssetManifest } from '../beyond-real/src/assets/validator.js';
import { TEST_ROOMS, generateRooms } from '../beyond-real/src/simulator/rooms.js';
import { findPortalPlacement, isPlacementSafe } from '../beyond-real/src/spatial/portal-placement.js';
import { runPrototype000, reloadPrototype000 } from '../beyond-real/src/simulator/prototype000.js';

const registry = JSON.parse(await readFile(new URL('../beyond-real/assets/registry.json', import.meta.url), 'utf8'));
const invalid = registry.assets.map(asset => ({ asset, result: validateAssetManifest(asset) })).filter(row => !row.result.valid);
if (invalid.length) throw new Error(`Beyond Real asset registry invalid: ${JSON.stringify(invalid)}`);

for (const room of [...TEST_ROOMS, ...generateRooms(1000)]) {
  const placement = findPortalPlacement(room);
  if (placement && !isPlacementSafe(room, placement)) throw new Error(`Unsafe portal placement in ${room.id}`);
}

const safeRoom = TEST_ROOMS.find(room => findPortalPlacement(room));
const result = runPrototype000({ room: safeRoom });
if (result.status !== 'COMPLETE') throw new Error('Prototype 000 did not complete.');
const reloaded = reloadPrototype000(result.persistence);
if (reloaded.fragment?.logicalId !== 'fragment.justice') throw new Error('Prototype 000 persistence failed.');

console.log(`Beyond Real foundation verified: ${registry.assets.length} assets, ${TEST_ROOMS.length + 1000} rooms, Prototype 000 OK.`);
