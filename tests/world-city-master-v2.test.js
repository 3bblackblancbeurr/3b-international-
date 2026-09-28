import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cityBuildingKind, cityMapBlueprint, cityMapRoads, cityMapSnap } from '../src/city/city3b-map.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('City 3B master map exposes eight real planning districts and road hierarchy', () => {
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
  assert.equal(roads.rings.length, 3);
  assert.equal(roads.radials.length, 8);
  assert.equal(roads.boulevards.length, 2);
});

test('City 3B map snaps construction and classifies urban building roles', () => {
  assert.deepEqual(cityMapSnap({ x: 3.2, z: -4.9 }, 2), { x: 4, z: -4 });
  assert.equal(cityBuildingKind({ name: 'Gare Matrix' }), 'mobility');
  assert.equal(cityBuildingKind({ name: 'Parc des Héritages' }), 'green');
  assert.equal(cityBuildingKind({ name: 'Boutique 3B' }), 'commerce');
  assert.equal(cityBuildingKind({ name: 'Tour du Cercle' }), 'landmark');
});

test('City 3B public UI is map-first and no longer a bare technical grid', () => {
  const builder = read('src/city/City3BBuilder.jsx');
  const portal = read('src/components/City3BPortal.jsx');
  const panel = read('src/city/City3BPanel.jsx');
  const css = read('src/styles/city-3b-builder.css');
  assert.match(builder, /Carte interactive de construction de la Ville 3B/);
  assert.match(builder, /CŒUR 3B/);
  assert.match(builder, /city3b-map-road/);
  assert.match(builder, /city3b-map-district/);
  assert.match(builder, /city3b-map-water/);
  assert.match(portal, /\['city','Carte',MapIcon\]/);
  assert.match(portal, /<City3BPrivatePreview data=\{data\}\/>/);
  assert.match(panel, /<City3BPrivatePreview data=\{data\}\/>/);
  assert.match(css, /City 3B Master Map/);
});

test('Monde 3B exposes only the official runtime while retaining legacy source files separately', () => {
  const entry = read('src/world/WorldEntry.jsx');
  assert.match(entry, /CurrentWorld/);
  assert.doesNotMatch(entry, /OriginsPage|world-origins|useState\(/);
  assert.match(entry, /one official public runtime/);
});
