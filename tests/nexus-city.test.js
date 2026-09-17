import test from 'node:test';
import assert from 'node:assert/strict';
import { RARITIES, RARITY_BY_ID, UNIQUE_ODDS, rarityFromRoll, validateRarityTable } from '../src/nexus/rarity.js';
import { BUILDING_LIBRARY, ITEM_FAMILIES, NEXUS_MODE } from '../src/nexus/city-data.js';
import { COUNTRY_PORTAL_SITES, COUNTRY_REALMS, NEXUS_SITE, ULTRA_WORLD, activeSectorKeys } from '../src/world/ultra-map.js';

test('ultra map is thousands of times larger in surface than the old playfield', () => {
  assert.ok(ULTRA_WORLD.areaMultiplier >= 1000);
  assert.ok(ULTRA_WORLD.areaMultiplier <= 10000);
  assert.equal(ULTRA_WORLD.widthMetres, 32000);
  assert.equal(Object.keys(COUNTRY_PORTAL_SITES).length, 8);
  assert.equal(Object.keys(COUNTRY_REALMS).length, 8);
  assert.equal(NEXUS_SITE.destination, 'nexus-city');
  assert.equal(NEXUS_SITE.type, 'portal');
  assert.equal(activeSectorKeys(0, 0).length, 9);
});

test('rarity table totals 100 percent and keeps the unique at one in a billion', () => {
  assert.equal(validateRarityTable(), true);
  const total = RARITIES.reduce((sum, rarity) => sum + rarity.percent, 0);
  assert.ok(Math.abs(total - 100) < 1e-9, `rarity total ${total}`);
  assert.equal(UNIQUE_ODDS, 1_000_000_000);
  assert.equal(RARITY_BY_ID.unique.percent, 0.0000001);
  assert.equal(RARITY_BY_ID.unique.supplyCap, 1);
  assert.equal(RARITY_BY_ID.ultimate.supplyCap, 8);
  assert.equal(rarityFromRoll(0).id, 'common');
  assert.equal(rarityFromRoll(1 - 1e-12).id, 'unique');
});

test('Nexus catalog covers buildings and requested collectible families', () => {
  assert.ok(BUILDING_LIBRARY.length >= 8);
  assert.equal(new Set(BUILDING_LIBRARY.map(item => item.rarity)).has('unique'), true);
  assert.deepEqual(ITEM_FAMILIES.map(item => item.id), ['objects','skins','weapons','companions','vehicles']);
  assert.ok(NEXUS_MODE.maxPlotsSubscriber > NEXUS_MODE.maxPlotsFree);
});
