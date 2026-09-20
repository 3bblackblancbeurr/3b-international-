import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync(new URL('../src/components/NexusCityGateway.jsx', import.meta.url), 'utf8');
const premium = readFileSync(new URL('../src/styles/nexus-city-premium.css', import.meta.url), 'utf8');
const asset = readFileSync(new URL('../src/assets/nexus-premium-bg.js', import.meta.url), 'utf8');

test('Nexus uses one animated broken circle and no secondary orbit', () => {
  assert.equal((gateway.match(/className="nexus-broken-ring"/g) || []).length, 1);
  assert.doesNotMatch(gateway, /nexus-orbit-shell/);
  assert.match(premium, /nexus-broken-ring::after\{display:none\}/);
  assert.match(premium, /animation:nexusClockSpin 8s linear infinite/);
});

test('premium scene uses the optimized realistic background asset', () => {
  assert.match(gateway, /NEXUS_CITY_BG/);
  assert.match(gateway, /nexus-premium-photo/);
  assert.match(asset, /data:image\/webp;base64/);
  assert.ok(asset.length < 1000, 'aggregator stays tiny; image payload is split into chunks');
});

test('boats, water, mist, building lights and distant vehicles are animated', () => {
  assert.match(gateway, /nexus-boat-a/);
  assert.match(gateway, /nexus-boat-b/);
  assert.match(gateway, /nexus-water-shimmer/);
  assert.match(gateway, /nexus-mist-a/);
  assert.match(gateway, /nexus-sky-vehicle-a/);
  assert.match(premium, /@keyframes nexusBoatEast/);
  assert.match(premium, /@keyframes nexusBoatWest/);
  assert.match(premium, /@keyframes nexusMistDrift/);
  assert.match(premium, /@keyframes nexusWaterPulse/);
  assert.match(premium, /@keyframes nexusSkyCruise/);
});

test('mobile mode reduces expensive effects while keeping the scene usable', () => {
  assert.match(premium, /@media\(max-width:720px\)/);
  assert.match(premium, /nexus-premium-photo[^}]*animation:none/);
  assert.match(premium, /nexus-sky-vehicle-b\{display:none\}/);
  assert.match(premium, /@media\(max-width:480px\)/);
  assert.match(premium, /nexus-boat-b\{display:none\}/);
});

test('existing cities stay accessible and locked members receive the real guided World mission', () => {
  assert.match(gateway, /city3bRequest\('access'/);
  assert.match(gateway, /cityResult\.value\?\.hasCity === true/);
  assert.match(gateway, /VILLE EXISTANTE DÉTECTÉE/);
  assert.match(gateway, /MISSION VILLE · ÉTAPE/);
  assert.match(gateway, /cityUnlockGuideStorage\(true\)/);
  assert.match(gateway, /leaveTo\('#monde-3b', \{ cityGuide: true \}\)/);
  assert.match(gateway, /setCityOpen\(true\)/);
  assert.match(gateway, /<City3BPortal open/);
});

test('Ville 3B exposes the three canonical player states and actions', () => {
  assert.match(gateway, /VILLE 3B — VERROUILLÉE/);
  assert.match(gateway, /VILLE 3B DÉBLOQUÉE/);
  assert.match(gateway, /MA VILLE 3B/);
  assert.match(gateway, /CONTINUER LA MISSION/);
  assert.match(gateway, /CRÉER MA VILLE/);
  assert.match(gateway, /ENTRER DANS MA VILLE/);
  assert.match(gateway, /Obtiens ton premier Souvenir pour débloquer ta ville/);
  assert.match(gateway, /aucune mission ou mise à jour ne peut la reverrouiller/);
});
