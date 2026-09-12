import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NEXUS_WORLDS } from '../src/components/nexus-worlds.js';
import { NEXUS_CINEMA_GATES, nexusDoorImage, nexusHotspotStyle } from '../src/components/nexus-cinema.js';

test('cinema hotspots preserve all eight established country destinations', () => {
  assert.deepEqual(Object.keys(NEXUS_CINEMA_GATES), NEXUS_WORLDS.map(w => w.code));
  for (const code of Object.keys(NEXUS_CINEMA_GATES)) {
    const [x,y,w,h]=NEXUS_CINEMA_GATES[code];
    assert.ok(x>=0 && y>=0 && x+w<=941 && y+h<=1116);
    assert.ok(w/941*288>=40 && h/1116*341>=44);
    assert.match(nexusDoorImage(code), /^\/nexus\/cinema-v1\/[A-Z]{2}\.webp$/);
    assert.match(nexusHotspotStyle(code).left, /%$/);
  }
});
test('unknown visual selectors cannot resolve to a real unlocked country', () => {
  for(const code of ['ORIGINE','ORIGIN','__proto__','constructor','../../x',null,undefined]) {
    assert.equal(nexusDoorImage(code),null);assert.equal(nexusHotspotStyle(code),null);
  }
});
test('all reference assets are local WebP files, hash-verified and within budget', () => {
  const root=new URL('../public/nexus/cinema-v1/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  assert.equal(manifest.sourceSha256,'bee77ce31f829943bf157cf55e3397eaa8dd21375298a96f2bc88390066edb97');
  assert.equal(Object.keys(manifest.assets).length,10);
  let total=0;
  for(const [name,asset] of Object.entries(manifest.assets)) {
    const data=readFileSync(new URL(name,root));total+=data.length;
    assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);
  }
  assert.ok(total<750000);assert.ok(manifest.assets['hall-mobile.webp'].bytes<250000);
});
test('cinematic rendering still uses the canonical journey and offers a real 3D view', () => {
  const source=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
  assert.match(source,/useNexusJourney\(\{ open, onClose, goTo \}\)/);
  assert.match(source,/journey\.travel\(isOrigin \? 'ORIGINE'/);
  assert.match(source,/originEnabled=\{journey\.originEnabled\}/);
  assert.match(source,/Voir le sanctuaire en 3D/);
  assert.match(source,/paused=\{paused \|\| \(phase === 'nexus' && visualMode === 'cinema'\)\}/);
  assert.doesNotMatch(source,/localStorage\.clear|sessionStorage\.clear/);
});
