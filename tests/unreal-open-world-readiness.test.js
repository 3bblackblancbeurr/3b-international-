import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../unreal/ThreeBWorld/', import.meta.url));
const content = join(project, 'Content');
const maps = [
  ['3binternational/Maps/Hub3B_Main_V05', 2, 500],
  ['3B/World/France/Maps/L_France_OpenWorld', 1, 80],
];

function packagesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? packagesUnder(path) : entry.name.endsWith('.uasset') ? [path] : [];
  });
}

function unrealPackage(path) {
  const data = readFileSync(path);
  assert.ok(data.length > 256, `${path}: must contain a serialized Unreal package`);
  assert.equal(data.readUInt32LE(0), 0x9e2a83c1, `${path}: invalid Unreal package signature`);
  return data;
}

test('native default map resolves to a shipped binary world, not an absent package', () => {
  const engine = readFileSync(join(project, 'Config/DefaultEngine.ini'), 'utf8');
  const defaultMap = engine.match(/^GameDefaultMap=\/Game\/(.+)$/m)?.[1].trim();
  assert.ok(defaultMap, 'GameDefaultMap must be configured');
  assert.equal(defaultMap, maps[0][0]);
  unrealPackage(join(content, `${defaultMap}.umap`));
});

for (const [map, portalCount, minimumActors] of maps) {
  test(`${map} ships its World Partition actor packages and native travel endpoints`, () => {
    unrealPackage(join(content, `${map}.umap`));
    const files = packagesUnder(join(content, '__ExternalActors__', map));
    assert.ok(files.length >= minimumActors, 'A map without external actor packages is an empty world');
    const actorPackages = files.map(unrealPackage);
    const withName = name => actorPackages.filter(data => data.includes(Buffer.from(name)));
    assert.equal(withName('Native_PlayerStart').length, 1, 'Exactly one actual PlayerStart is required');
    const portals = withName('ThreeBExplorationPortal');
    assert.equal(portals.length, portalCount, 'Serialized native interaction actors must be present');
    const destination = map === maps[0][0] ? maps[1][0] : maps[0][0];
    for (const portal of portals) {
      assert.ok(portal.includes(Buffer.from(`/Game/${destination}`)), 'Portal must target the other shipped map');
    }
  });
}

// These checks validate checkout completeness only. The opt-in Unreal standalone
// test, documented in NATIVE_EXPLORATION_2026-10-02.md, is the runtime proof.
