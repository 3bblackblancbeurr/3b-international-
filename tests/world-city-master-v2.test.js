import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cityBuildingKind, cityMapBlueprint, cityMapCustomRoads, cityMapPlacementPolicy, cityMapRoads, cityMapSnap, cityMapUrbanScore } from '../src/city/city3b-map.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('City 3B master map exposes eight planning districts and no automatic roads', () => {
  const blueprint = cityMapBlueprint({
    city: { land_tier: 3 },
    districts: [
      { country: 'France', unlocked: true, level: 2 },
      { country: 'Algérie', unlocked: true, level: 1 },
    ],
  });
  assert.equal(blueprint.districts.length, 8);
  assert.equal(blueprint.districts.filter(row => row.unlocked).length, 2);
  assert.equal(blueprint.landTier, 3);
  const roads = cityMapRoads(blueprint);
  assert.equal(roads.rings.length, 0);
  assert.equal(roads.radials.length, 0);
  assert.equal(roads.boulevards.length, 0);
  assert.equal(roads.custom.length, 0);
});

test('City 3B map snaps construction and classifies urban building roles', () => {
  assert.deepEqual(cityMapSnap({ x: 3.2, z: -4.9 }, 2), { x: 4, z: -4 });
  assert.equal(cityBuildingKind({ name: 'Gare Matrix' }), 'mobility');
  assert.equal(cityBuildingKind({ name: 'Parc des Héritages' }), 'green');
  assert.equal(cityBuildingKind({ name: 'Boutique 3B' }), 'commerce');
  assert.equal(cityBuildingKind({ name: 'Tour du Cercle' }), 'landmark');
});

test('City 3B stores custom roads and protects locked districts, water and roads', () => {
  const snapshot = {
    city: { land_tier: 2, city: { roads: [{ id: 'r1', x1: -20, z1: -30, x2: 20, z2: -30, width: 4 }] } },
    districts: [
      { country: 'France', unlocked: true, level: 1 },
      { country: 'Algérie', unlocked: false, level: 0 },
    ],
    buildings: [],
    placements: [],
  };
  assert.equal(cityMapCustomRoads(snapshot).length, 1);
  assert.equal(cityMapPlacementPolicy(snapshot, { x: 0, z: -30 }, { width: 2, height: 2 }).valid, false);
  assert.equal(cityMapPlacementPolicy(snapshot, { x: 0, z: 130 }, { width: 2, height: 2 }).valid, true);
  snapshot.city.city.terrain=[{id:'lake',kind:'lake',x1:0,z1:130,x2:0,z2:130,width:12}];
  assert.equal(cityMapPlacementPolicy(snapshot, { x: 0, z: 130 }, { width: 2, height: 2 }).valid, false);
});

test('City 3B computes an urban balance from real placements instead of fake dashboard numbers', () => {
  const snapshot = {
    city: { city_level: 4, land_tier: 2, city: { roads: [{ id: 'r1', x1: -10, z1: 15, x2: 25, z2: 15, width: 4 }] } },
    districts: [{ country: 'France', unlocked: true, level: 2 }],
    buildings: [
      { code: 'HOUSE', name: 'Maison 3B' },
      { code: 'SHOP', name: 'Boutique 3B' },
      { code: 'PARK', name: 'Parc des Héritages' },
      { code: 'STATION', name: 'Gare Matrix' },
    ],
    placements: [
      { building_code: 'HOUSE', placement_state: 'placed' },
      { building_code: 'SHOP', placement_state: 'placed' },
      { building_code: 'PARK', placement_state: 'placed' },
      { building_code: 'STATION', placement_state: 'placed' },
    ],
  };
  const urban = cityMapUrbanScore(snapshot);
  assert.ok(urban.score > 0);
  assert.ok(urban.residents > 0);
  assert.ok(urban.jobs > 0);
  assert.equal(urban.customRoads, 1);
  assert.ok(urban.mobility > 0);
});

test('City 3B public UI is map-first and no longer a bare technical grid', () => {
  const builder = read('src/city/City3BBuilder.jsx');
  const portal = read('src/components/City3BPortal.jsx');
  const panel = read('src/city/City3BPanel.jsx');
  const css = read('src/city/city3b-game.css');
  const scene = read('src/city/city3b-scene.js');
  assert.match(builder, /aria-label="Jeu de construction 3D"/);
  assert.match(builder, /<City3DMap data=\{data\}/);
  assert.match(builder, /city-game-hud/);
  assert.match(builder, /aria-label="Outils de la ville"/);
  assert.match(portal, /<City3BBuilder data=\{data\}/);
  assert.match(portal, /<City3BPrivatePreview data=\{visit\} publicVisit\/>/);
  assert.match(panel, /<City3BPrivatePreview data=\{data\}\/>/);
  assert.match(css, /orientation:portrait/);
  assert.match(builder, /plan_roads/);
  assert.match(builder, /construction_claim/);
  assert.match(scene, /WebGLRenderer/);
  assert.doesNotMatch(builder, /<svg|Vue 2D|Mode 2D|position X|position Z/);
  assert.doesNotMatch(portal, /unlock_district/);
});

test('Monde 3B is one official runtime and stays independent from City 3B', () => {
  const entry = read('src/world/WorldEntry.jsx');
  const page = read('src/world/WorldPage.jsx');
  assert.match(entry, /CurrentWorld/);
  assert.doesNotMatch(entry, /OriginsPage|world-origins|useState\(/);
  assert.match(entry, /one official public runtime/);
  assert.doesNotMatch(page, /Retrouver ma partie Origins|goTo\('world-origins'\)|City3BPanel|cityUnlockGuide|hubCitySync|hubCityProof|Débloquer ma Ville 3B/);
});
